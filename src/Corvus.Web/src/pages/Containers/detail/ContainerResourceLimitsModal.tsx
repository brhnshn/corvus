import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, RotateCcw, AlertCircle, Loader2, Save, Sliders } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { useI18n } from '../../../i18n';
import { useToast } from '../../../components/ui/Toast';
import { containersApi } from '../../../api/containers';
import { formatBytes } from '../../../utils/format';
import type { DockerContainerInspectInfo, ContainerResourceUpdateRequest } from '../../../types';
import { getInspectHostConfig } from './inspectHelpers';

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
  useEffect(() => {
    if (isOpen) {
      setCpuCores(activeCores);
      setMemoryMb(activeMemoryMb);
      setRestartPolicy(activePolicy);
      setMaxRetries(activeRetries);
      setErrorMessage(null);
    }
  }, [isOpen, activeCores, activeMemoryMb, activePolicy, activeRetries]);

  const validateForm = (): string | null => {
    const parsedCpu = parseFloat(cpuCores);
    if (!isNaN(parsedCpu) && parsedCpu < 0) {
      return t('containers.validationCpuNegative');
    }

    const parsedMemory = parseInt(memoryMb, 10);
    if (!isNaN(parsedMemory)) {
      if (parsedMemory < 0) {
        return t('containers.validationMemoryMin');
      }
      if (parsedMemory > 0 && parsedMemory < 6) {
        return t('containers.validationMemoryMin');
      }
    }

    if (restartPolicy === 'on-failure') {
      const parsedRetries = parseInt(maxRetries, 10);
      if (!isNaN(parsedRetries) && parsedRetries < 0) {
        return t('containers.validationRetriesNegative');
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    try {
      const parsedCores = parseFloat(cpuCores);
      const parsedMemory = parseInt(memoryMb, 10);
      const parsedRetries = parseInt(maxRetries, 10);

      const request: ContainerResourceUpdateRequest = {
        cpuCores: !isNaN(parsedCores) ? parsedCores : 0,
        memoryMb: !isNaN(parsedMemory) ? parsedMemory : 0,
        restartPolicy,
        maximumRetryCount: restartPolicy === 'on-failure' && !isNaN(parsedRetries) ? parsedRetries : 0,
      };

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

  const displayName = containerName ?? containerId.slice(0, 12);

  const cpuPresets = ['0', '0.5', '1.0', '2.0', '4.0'];
  const memoryPresets = [
    { label: t('containers.unlimited'), val: '0' },
    { label: '256 MB', val: '256' },
    { label: '512 MB', val: '512' },
    { label: '1 GB', val: '1024' },
    { label: '2 GB', val: '2048' },
    { label: '4 GB', val: '4096' },
    { label: '8 GB', val: '8192' },
  ];

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
        {/* Current Active Configuration Card */}
        <div className="p-3.5 surface rounded-2xl border border-[var(--border-hairline)] space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {t('containers.currentLimitsHeader')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border-hairline)]">
              <span className="text-[11px] text-[var(--text-muted)] block mb-0.5">
                {t('containers.currentCpu')}
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {activeNanoCpus > 0
                  ? `${(activeNanoCpus / 1_000_000_000).toFixed(1)} ${t('containers.coresUnit')}`
                  : t('containers.unlimited')}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border-hairline)]">
              <span className="text-[11px] text-[var(--text-muted)] block mb-0.5">
                {t('containers.currentMemory')}
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {activeMemoryBytes > 0 ? formatBytes(activeMemoryBytes) : t('containers.unlimited')}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border-hairline)]">
              <span className="text-[11px] text-[var(--text-muted)] block mb-0.5">
                {t('containers.currentRestartPolicy')}
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {activePolicy}
                {activePolicy === 'on-failure' && activeRetries !== '0' ? ` (${activeRetries}x)` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* CPU & Memory Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* CPU Limit */}
          <div className="p-4 surface rounded-2xl border border-[var(--border-hairline)] space-y-2.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <label htmlFor="resource-modal-cpu" className="text-xs font-bold text-[var(--text-primary)]">
                {t('containers.cpuLimitLabel')}
              </label>
            </div>
            <input
              id="resource-modal-cpu"
              type="number"
              step="0.1"
              min="0"
              max="64"
              value={cpuCores}
              disabled={saving}
              onChange={(e) => setCpuCores(e.target.value)}
              placeholder={`0 (${t('containers.unlimited')})`}
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-[var(--border-hairline)] hover:border-white/20 rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-sky-400 transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[var(--text-secondary)]">
              {t('containers.cpuLimitHelp')}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {cpuPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCpuCores(preset)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-lg border transition-colors cursor-pointer ${
                    cpuCores === preset
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-white/[0.04] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {preset === '0' ? t('containers.unlimited') : `${preset}c`}
                </button>
              ))}
            </div>
          </div>

          {/* Memory Limit */}
          <div className="p-4 surface rounded-2xl border border-[var(--border-hairline)] space-y-2.5">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <label htmlFor="resource-modal-memory" className="text-xs font-bold text-[var(--text-primary)]">
                {t('containers.memoryLimitLabel')}
              </label>
            </div>
            <input
              id="resource-modal-memory"
              type="number"
              step="32"
              min="0"
              value={memoryMb}
              disabled={saving}
              onChange={(e) => setMemoryMb(e.target.value)}
              placeholder={`0 (${t('containers.unlimited')})`}
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-[var(--border-hairline)] hover:border-white/20 rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-purple-400 transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[var(--text-secondary)]">
              {t('containers.memoryLimitHelp')}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {memoryPresets.map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setMemoryMb(preset.val)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-lg border transition-colors cursor-pointer ${
                    memoryMb === preset.val
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-white/[0.04] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Restart Policy Selection */}
        <div className="p-4 surface rounded-2xl border border-[var(--border-hairline)] space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <label className="text-xs font-bold text-[var(--text-primary)]">
              {t('containers.restartPolicyLabel')}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'no', label: t('containers.restartPolicyNo'), desc: t('containers.restartPolicyNoDesc') },
              { id: 'always', label: t('containers.restartPolicyAlways'), desc: t('containers.restartPolicyAlwaysDesc') },
              { id: 'unless-stopped', label: t('containers.restartPolicyUnlessStopped'), desc: t('containers.restartPolicyUnlessStoppedDesc') },
              { id: 'on-failure', label: t('containers.restartPolicyOnFailure'), desc: t('containers.restartPolicyOnFailureDesc') },
            ].map((item) => (
              <label
                key={item.id}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  restartPolicy === item.id
                    ? 'bg-white/[0.08] border-white/40 text-[var(--text-primary)] shadow-xs'
                    : 'bg-white/[0.02] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="restartPolicyModal"
                  value={item.id}
                  checked={restartPolicy === item.id}
                  disabled={saving}
                  onChange={() => setRestartPolicy(item.id)}
                  className="sr-only"
                />
                <div className="font-bold text-xs text-[var(--text-primary)] mb-0.5">{item.label}</div>
                <div className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{item.desc}</div>
              </label>
            ))}
          </div>

          {/* On-Failure Retry Count */}
          {restartPolicy === 'on-failure' && (
            <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1.5">
              <label htmlFor="resource-modal-retries" className="text-xs font-semibold text-[var(--text-primary)]">
                {t('containers.maxRetriesLabel')}
              </label>
              <input
                id="resource-modal-retries"
                type="number"
                min="0"
                step="1"
                value={maxRetries}
                disabled={saving}
                onChange={(e) => setMaxRetries(e.target.value)}
                placeholder="0"
                className="w-full sm:w-48 px-3.5 py-1.5 text-xs font-mono bg-white/[0.04] border border-[var(--border-hairline)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[11px] text-[var(--text-secondary)]">
                {t('containers.maxRetriesHelp')}
              </p>
            </div>
          )}
        </div>

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
