import { useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n';
import { useToast } from '../../../components/ui/ToastContext';
import { containersApi } from '../../../api/containers';
import type { DockerContainerInspectInfo } from '../../../types';
import { getInspectHostConfig } from './inspectHelpers';
import { validateResourceLimitsForm, buildResourceUpdateRequest } from './containerResourceLimits.utils';

interface UseContainerResourceLimitsFormArgs {
  isOpen: boolean;
  containerId: string;
  inspect?: DockerContainerInspectInfo | null;
  onClose: () => void;
  onSuccess?: () => void;
}

/** Kaynak limitleri modalının form durumu, senkronizasyonu ve kaydetme akışı. */
export function useContainerResourceLimitsForm({
  isOpen,
  containerId,
  inspect,
  onClose,
  onSuccess,
}: UseContainerResourceLimitsFormArgs) {
  const { t } = useI18n();
  const toast = useToast();

  const hostConfig = inspect ? getInspectHostConfig(inspect) : null;

  // Active Inspect Values
  const activeNanoCpus = hostConfig?.nanoCpus ?? 0;
  const activeCores = activeNanoCpus > 0 ? (activeNanoCpus / 1_000_000_000).toString() : '0';

  const activeMemoryBytes = hostConfig?.memory ?? 0;
  const activeMemoryMb = activeMemoryBytes > 0 ? Math.round(activeMemoryBytes / (1024 * 1024)).toString() : '0';

  const activePolicy = hostConfig?.restartPolicy?.name ?? 'no';
  const activeRetries = hostConfig?.restartPolicy?.maximumRetryCount?.toString() ?? '0';

  // Form State
  const [cpuCores, setCpuCores] = useState<string>(activeCores);
  const [memoryMb, setMemoryMb] = useState<string>(activeMemoryMb);
  const [restartPolicy, setRestartPolicy] = useState<string>(activePolicy);
  const [maxRetries, setMaxRetries] = useState<string>(activeRetries);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state whenever modal opens or inspect changes
  const [prevSync, setPrevSync] = useState({ isOpen, activeCores, activeMemoryMb, activePolicy, activeRetries });
  if (
    prevSync.isOpen !== isOpen ||
    prevSync.activeCores !== activeCores ||
    prevSync.activeMemoryMb !== activeMemoryMb ||
    prevSync.activePolicy !== activePolicy ||
    prevSync.activeRetries !== activeRetries
  ) {
    setPrevSync({ isOpen, activeCores, activeMemoryMb, activePolicy, activeRetries });
    if (isOpen) {
      setCpuCores(activeCores);
      setMemoryMb(activeMemoryMb);
      setRestartPolicy(activePolicy);
      setMaxRetries(activeRetries);
      setErrorMessage(null);
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const values = { cpuCores, memoryMb, restartPolicy, maxRetries };
    const validationError = validateResourceLimitsForm(values, t);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    try {
      const request = buildResourceUpdateRequest(values);

      const res = await containersApi.updateContainerResources(containerId, request);
      if (res.success) {
        toast.success(t('containers.resourceLimitsUpdatedSuccess'));
        onSuccess?.();
        onClose();
      } else {
        const err = res.message ?? t('containers.resourceLimitsUpdatedError');
        setErrorMessage(err);
        toast.error(err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('containers.resourceLimitsUpdatedError');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return {
    activeNanoCpus,
    activeMemoryBytes,
    activePolicy,
    activeRetries,
    cpuCores,
    setCpuCores,
    memoryMb,
    setMemoryMb,
    restartPolicy,
    setRestartPolicy,
    maxRetries,
    setMaxRetries,
    saving,
    errorMessage,
    handleSubmit,
  };
}
