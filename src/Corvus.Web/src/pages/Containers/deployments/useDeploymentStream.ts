import { useState, useEffect, useCallback, useRef } from 'react';
import { deploymentsApi } from '../../../api/deployments';
import type { 
  DeploymentStep, 
  DeploymentStatus, 
  DeploymentStreamEvent, 
  ActiveDeploymentState 
} from '../../../types/deployments';

const LOCAL_STORAGE_KEY = 'corvus_active_deployment';

interface UseDeploymentStreamOptions {
  deploymentId: string | null;
  containerId?: string;
  containerName?: string;
  initialLogs?: string[];
  onCompleted?: (status: DeploymentStatus) => void;
}

export function useDeploymentStream({
  deploymentId,
  containerId,
  containerName,
  initialLogs = [],
  onCompleted
}: UseDeploymentStreamOptions) {
  const [currentStep, setCurrentStep] = useState<DeploymentStep>('queued');
  const [status, setStatus] = useState<DeploymentStatus>('pending');
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync state to localStorage for persistence across F5
  const persistActiveDeployment = useCallback((activeState: Partial<ActiveDeploymentState> | null) => {
    if (typeof window === 'undefined') return;
    if (!activeState) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }

    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing = existingStr ? JSON.parse(existingStr) : {};
      const merged: ActiveDeploymentState = {
        ...existing,
        ...activeState,
        deploymentId: deploymentId || existing.deploymentId || '',
        containerId: containerId || existing.containerId || '',
        containerName: containerName || existing.containerName || ''
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // storage error safe fallback
    }
  }, [deploymentId, containerId, containerName]);

  // Connect to SSE stream
  useEffect(() => {
    if (!deploymentId) {
      setIsConnected(false);
      return;
    }

    setIsConnected(true);
    setIsDone(false);
    startTimeRef.current = Date.now();

    // Elapsed timer while not done
    timerRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current);
    }, 500);

    const handleEvent = (event: DeploymentStreamEvent) => {
      if (event.type === 'step_changed') {
        setCurrentStep(event.step);
        persistActiveDeployment({ currentStep: event.step, status: 'in_progress' });
      } else if (event.type === 'log') {
        if (event.chunk) {
          const lines = event.chunk.split('\n').filter(Boolean);
          setLogs((prev) => [...prev, ...lines]);
        }
      } else if (event.type === 'completed') {
        setStatus(event.status);
        setIsDone(true);
        if (event.durationMs) setDurationMs(event.durationMs);
        if (event.error) setErrorMessage(event.error);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (event.status === 'success') {
          setCurrentStep('live');
        } else if (event.status === 'rolled_back') {
          setCurrentStep('rolled_back');
        } else {
          setCurrentStep('failed');
        }

        // Clean up active deployment persistence after completion
        persistActiveDeployment(null);
        onCompleted?.(event.status);
      }
    };

    const handleError = () => {
      setIsConnected(false);
    };

    const unsubscribe = deploymentsApi.subscribeDeploymentStream(
      deploymentId,
      handleEvent,
      handleError
    );

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [deploymentId, onCompleted, persistActiveDeployment]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    currentStep,
    status,
    logs,
    durationMs,
    errorMessage,
    isConnected,
    isDone,
    clearLogs
  };
}

/**
 * Helper to retrieve stored active deployment after page refresh (F5).
 * Enforces Corvus Self-Preservation Guard and purges stale/corrupted entries.
 */
export function getSavedActiveDeployment(): ActiveDeploymentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveDeploymentState;
    if (!parsed || !parsed.deploymentId) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }

    // Corvus Öz-Koruma Kuralı (Self-Preservation Guard): Corvus konteynerleri asla canlı modal açamaz
    const targetName = (parsed.containerName || '').toLowerCase();
    const imageName = (parsed.imageName || '').toLowerCase();
    const containerId = (parsed.containerId || '').toLowerCase();
    if (targetName.includes('corvus') || imageName.includes('corvus') || containerId.includes('corvus')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }

    // Zaman aşımı koruması: 10 dakikadan eski oturumlar temizlenir
    if (parsed.startedAt && Date.now() - parsed.startedAt > 10 * 60 * 1000) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }

    // Tamamlanmış durumlar localStorage'da tutulmaz
    if (parsed.status === 'success' || parsed.status === 'failed' || parsed.status === 'rolled_back') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}
