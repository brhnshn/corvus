import React, { useState } from 'react';
import { useI18n } from '../../../i18n';
import { Cpu, HardDrive, RotateCcw, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { containersApi } from '../../../api/containers';
import type { DockerContainerInspectInfo, DockerContainerUpdateRequest } from '../../../types';

interface ContainerResourcesTabProps {
  inspect: DockerContainerInspectInfo;
  isAdmin: boolean;
  onUpdated: () => void;
}

export const ContainerResourcesTab: React.FC<ContainerResourcesTabProps> = ({
  inspect,
  isAdmin,
  onUpdated
}) => {
  const { t } = useI18n();

  // Initial values from inspect
  const initialNanoCpus = inspect.hostConfig?.nanoCpus || 0;
  const initialCores = initialNanoCpus > 0 ? (initialNanoCpus / 1_000_000_000).toString() : '0';

  const initialMemoryBytes = inspect.hostConfig?.memory || 0;
  const initialMemoryMb = initialMemoryBytes > 0 ? Math.round(initialMemoryBytes / (1024 * 1024)).toString() : '0';

  const initialRestartPolicy = inspect.hostConfig?.restartPolicy?.name || 'no';

  const [cpuCores, setCpuCores] = useState<string>(initialCores);
  const [memoryMb, setMemoryMb] = useState<string>(initialMemoryMb);
  const [restartPolicy, setRestartPolicy] = useState<string>(initialRestartPolicy);

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const parsedCores = parseFloat(cpuCores);
      const nanoCpus = !isNaN(parsedCores) && parsedCores > 0 ? Math.round(parsedCores * 1_000_000_000) : 0;

      const parsedMemory = parseInt(memoryMb, 10);
      const memoryBytes = !isNaN(parsedMemory) && parsedMemory > 0 ? parsedMemory * 1024 * 1024 : 0;

      const updateReq: DockerContainerUpdateRequest = {
        nanoCpus: nanoCpus > 0 ? nanoCpus : undefined,
        memory: memoryBytes > 0 ? memoryBytes : undefined,
        restartPolicy: {
          name: restartPolicy
        }
      };

      const res = await containersApi.updateContainer(inspect.id, updateReq);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || t('containers.updateResourcesSuccess')
        });
        onUpdated();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || t('containers.updateResourcesError')
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || t('containers.updateResourcesError')
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="p-4 surface border border-white/10 rounded-2xl space-y-1">
        <h4 className="text-xs font-bold text-[#eceef6]">
          {t('containers.tabResources')}
        </h4>
        <p className="text-xs text-[#9ba0b5]">
          {t('containers.resourcesDesc')}
        </p>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Limits */}
        <div className="p-4 surface border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#d5d5dc]" />
            <label className="text-xs font-bold text-[#eceef6]">
              {t('containers.cpuLimitLabel')}
            </label>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              step="0.1"
              min="0"
              max="64"
              value={cpuCores}
              disabled={!isAdmin || saving}
              onChange={(e) => setCpuCores(e.target.value)}
              placeholder="0 (Sınırsız)"
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-xl text-[#eceef6] focus:outline-none focus:border-[#d5d5dc] transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[#9ba0b5]">
              {t('containers.cpuLimitHelp')}
            </p>
          </div>

          {/* Quick preset buttons */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['0', '0.5', '1.0', '2.0', '4.0'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCpuCores(preset)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${
                    cpuCores === preset
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-white/[0.04] text-[#9ba0b5] border-white/10 hover:text-[#eceef6] hover:bg-white/[0.08]'
                  }`}
                >
                  {preset === '0' ? 'Sınırsız' : `${preset} Çekirdek`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Memory Limits */}
        <div className="p-4 surface border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#d5d5dc]" />
            <label className="text-xs font-bold text-[#eceef6]">
              {t('containers.memoryLimitLabel')}
            </label>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              step="32"
              min="0"
              value={memoryMb}
              disabled={!isAdmin || saving}
              onChange={(e) => setMemoryMb(e.target.value)}
              placeholder="0 (Sınırsız)"
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-xl text-[#eceef6] focus:outline-none focus:border-[#d5d5dc] transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[#9ba0b5]">
              {t('containers.memoryLimitHelp')}
            </p>
          </div>

          {/* Quick preset buttons */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: 'Sınırsız', val: '0' },
                { label: '256 MB', val: '256' },
                { label: '512 MB', val: '512' },
                { label: '1 GB', val: '1024' },
                { label: '2 GB', val: '2048' },
                { label: '4 GB', val: '4096' }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setMemoryMb(p.val)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${
                    memoryMb === p.val
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-white/[0.04] text-[#9ba0b5] border-white/10 hover:text-[#eceef6] hover:bg-white/[0.08]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Restart Policy */}
      <div className="p-4 surface border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[#d5d5dc]" />
          <label className="text-xs font-bold text-[#eceef6]">
            {t('containers.restartPolicyLabel')}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { id: 'no', label: 'No', desc: t('containers.restartPolicyNo') },
            { id: 'always', label: 'Always', desc: t('containers.restartPolicyAlways') },
            { id: 'unless-stopped', label: 'Unless Stopped', desc: t('containers.restartPolicyUnlessStopped') },
            { id: 'on-failure', label: 'On Failure', desc: t('containers.restartPolicyOnFailure') }
          ].map((item) => (
            <label
              key={item.id}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                restartPolicy === item.id
                  ? 'bg-white/[0.08] border-white/30 text-[#eceef6] shadow-sm'
                  : 'bg-white/[0.02] border-white/10 text-[#9ba0b5] hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="restartPolicy"
                value={item.id}
                checked={restartPolicy === item.id}
                disabled={!isAdmin || saving}
                onChange={() => setRestartPolicy(item.id)}
                className="sr-only"
              />
              <div className="font-bold text-xs text-[#eceef6] mb-0.5">{item.label}</div>
              <div className="text-[11px] leading-relaxed text-[#9ba0b5]">{item.desc}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Submit button */}
      {isAdmin && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-black bg-white hover:bg-[#d5d5dc] rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Güncelleniyor...</span>
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
    </form>
  );
};
