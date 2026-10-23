import React from 'react';
import { AlertCircle, Loader2, Save, Sliders } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { useI18n } from '../../../i18n';
import type { DockerContainerInspectInfo } from '../../../types';
import { useContainerResourceLimitsForm } from './useContainerResourceLimitsForm';
import { ResourceLimitsCurrentCard } from './ResourceLimitsCurrentCard';
import { ResourceLimitsCpuMemoryFields } from './ResourceLimitsCpuMemoryFields';
import { ResourceLimitsRestartPolicyField } from './ResourceLimitsRestartPolicyField';

export interface ContainerResourceLimitsModalProps {
  isOpen: boolean;
  containerId: string;
  containerName?: string;
  inspect?: DockerContainerInspectInfo | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ContainerResourceLimitsModal: React.FC<ContainerResourceLimitsModalProps> = ({
  isOpen,
  containerId,
  containerName,
  inspect,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();

  const {
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
  } = useContainerResourceLimitsForm({ isOpen, containerId, inspect, onClose, onSuccess });

  const displayName = containerName ?? containerId.slice(0, 12);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>{t('containers.resourceLimitsModalTitle')}</span>
        </div>
      }
      subtitle={
        <span className="font-mono text-xs text-[var(--text-secondary)]">
          {displayName} • {t('containers.resourceLimitsModalSubtitle')}
        </span>
      }
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
        <ResourceLimitsCurrentCard
          activeNanoCpus={activeNanoCpus}
          activeMemoryBytes={activeMemoryBytes}
          activePolicy={activePolicy}
          activeRetries={activeRetries}
        />

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <ResourceLimitsCpuMemoryFields
          cpuCores={cpuCores}
          onCpuCoresChange={setCpuCores}
          memoryMb={memoryMb}
          onMemoryMbChange={setMemoryMb}
          saving={saving}
        />

        <ResourceLimitsRestartPolicyField
          restartPolicy={restartPolicy}
          onRestartPolicyChange={setRestartPolicy}
          maxRetries={maxRetries}
          onMaxRetriesChange={setMaxRetries}
          saving={saving}
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-hairline)]">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-black bg-white hover:bg-white/90 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t('containers.savingResourceChanges')}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{t('containers.saveResourceChanges')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
