import React, { useCallback } from 'react';
import { useI18n } from '../../../i18n';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { DeploymentStepper } from './DeploymentStepper';
import { DeploymentTerminalLog } from './DeploymentTerminalLog';
import { useDeploymentStream } from './useDeploymentStream';
import { Rocket, Minimize2, CheckCircle2, AlertOctagon, RotateCcw } from 'lucide-react';
import type { DeploymentStatus } from '../../../types/deployments';

export interface DeploymentProgressModalProps {
  isOpen: boolean;
  deploymentId: string | null;
  containerId: string;
  containerName: string;
  imageName?: string;
  onClose: () => void;
  onSuccess?: () => void;
  onMinimize?: () => void;
}

export const DeploymentProgressModal: React.FC<DeploymentProgressModalProps> = ({
  isOpen,
  deploymentId,
  containerId,
  containerName,
  imageName,
  onClose,
  onSuccess,
  onMinimize
}) => {
  const { t } = useI18n();

  const handleCompleted = useCallback((status: DeploymentStatus) => {
    if (status === 'success') {
      onSuccess?.();
    }
  }, [onSuccess]);

  const {
    currentStep,
    status,
    logs,
    durationMs,
    errorMessage,
    isConnected,
    isDone,
    clearLogs
  } = useDeploymentStream({
    deploymentId,
    containerId,
    containerName,
    onCompleted: handleCompleted
  });

  if (!isOpen || !deploymentId) return null;

  const isSuccess = status === 'success' || currentStep === 'live';
  const isRolledBack = status === 'rolled_back' || currentStep === 'rolled_back';
  const isFailed = status === 'failed' || currentStep === 'failed';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-zinc-100">
            {t('deployments.liveModalTitle', { name: containerName })}
          </span>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono">
          <span>{imageName || containerId.substring(0, 12)}</span>
          {deploymentId && (
            <span className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
              #{deploymentId.substring(0, 10)}
            </span>
          )}
        </div>
      }
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-4">
        {/* Visual Stepper */}
        <DeploymentStepper
          currentStep={currentStep}
          durationMs={durationMs}
          errorMessage={errorMessage}
        />

        {/* Live ANSI Terminal Console */}
        <DeploymentTerminalLog
          logs={logs}
          isStreaming={isConnected && !isDone}
          onClear={clearLogs}
          heightClass="h-[300px]"
        />

        {/* Status Callout Banner */}
        {isSuccess && (
          <div className="flex items-center gap-2.5 p-3 rounded-[var(--radius-sm)] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('deployments.stepLiveDesc')}</span>
          </div>
        )}

        {isRolledBack && (
          <div className="flex items-center gap-2.5 p-3 rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs">
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>{t('deployments.stepRolledBackDesc')}</span>
          </div>
        )}

        {isFailed && (
          <div className="flex items-center gap-2.5 p-3 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>{errorMessage || t('deployments.stepFailedDesc')}</span>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
          <div>
            {!isDone && onMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMinimize}
                icon={<Minimize2 className="w-3.5 h-3.5" />}
              >
                {t('deployments.minimize')}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isDone ? 'primary' : 'secondary'}
              size="sm"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
