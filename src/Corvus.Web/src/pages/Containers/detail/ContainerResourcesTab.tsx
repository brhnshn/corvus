import React, { useState } from 'react';
import { useI18n } from '../../../i18n';
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers
} from 'lucide-react';
import type {
  DockerContainerInspectInfo,
  ContainerStats
} from '../../../types';
import { ContainerResourceLimitsModal } from './ContainerResourceLimitsModal';
import { useContainerResources } from './useContainerResources';
import { ResourcesTelemetrySection } from './ResourcesTelemetrySection';
import { ResourcesLimitsSection } from './ResourcesLimitsSection';

interface ContainerResourcesTabProps {
  inspect: DockerContainerInspectInfo;
  isAdmin: boolean;
  initialStats?: ContainerStats;
  onUpdated: () => void;
  onOpenResourceLimitsModal?: () => void;
}

export const ContainerResourcesTab: React.FC<ContainerResourcesTabProps> = ({
  inspect,
  isAdmin,
  initialStats,
  onUpdated,
  onOpenResourceLimitsModal
}) => {
  const { t } = useI18n();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    stats,
    isRunning,
    initialNanoCpus,
    initialMemoryBytes,
    cpuCores,
    setCpuCores,
    memoryMb,
    setMemoryMb,
    restartPolicy,
    setRestartPolicy,
    saving,
    statusMessage,
    handleSave
  } = useContainerResources({ inspect, isAdmin, initialStats, onUpdated });

  // Compose bilgisi
  const composeProject = inspect.config?.labels?.['com.docker.compose.project'];
  const composeService = inspect.config?.labels?.['com.docker.compose.service'];

  const handleEditLimits = () => {
    if (onOpenResourceLimitsModal) {
      onOpenResourceLimitsModal();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <ResourcesTelemetrySection
        isRunning={isRunning}
        isAdmin={isAdmin}
        stats={stats}
        initialNanoCpus={initialNanoCpus}
        initialMemoryBytes={initialMemoryBytes}
        onEditLimits={handleEditLimits}
      />

      {/* Compose Bildirimi (Varsa) */}
      {composeProject && (
        <div className="p-3.5 rounded-2xl border border-sky-500/20 bg-sky-500/5 flex items-start gap-3 text-xs">
          <Layers className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-[var(--text-primary)]">
              {t('containers.composeMemberNotice', { project: composeProject, service: composeService ? `(${composeService})` : '' })}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {t('containers.composeMemberHelp')}
            </p>
          </div>
        </div>
      )}

      {/* Durum Mesajı (Başarı / Hata) */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-[#34d399]'
              : 'bg-rose-500/10 border-rose-500/25 text-[#f87171]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      <ResourcesLimitsSection
        isAdmin={isAdmin}
        saving={saving}
        cpuCores={cpuCores}
        onCpuCoresChange={setCpuCores}
        memoryMb={memoryMb}
        onMemoryMbChange={setMemoryMb}
        restartPolicy={restartPolicy}
        onRestartPolicyChange={setRestartPolicy}
      />

      {/* Kaydet Butonu */}
      {isAdmin && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-black bg-white hover:bg-[var(--border-subtle)] rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('containers.updatingResources')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('containers.updateResourcesBtn')}</span>
              </>
            )}
          </button>
        </div>
      )}

      {isAdmin && (
        <ContainerResourceLimitsModal
          isOpen={isModalOpen}
          containerId={inspect.id}
          containerName={inspect.name}
          inspect={inspect}
          onClose={() => setIsModalOpen(false)}
          onSuccess={onUpdated}
        />
      )}
    </form>
  );
};
