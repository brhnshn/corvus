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
    <form onSubmit={handleSave} className="space-y-6">
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
        <h4 className="text-xs font-semibold text-slate-200">
          {t('containers.tabResources')}
        </h4>
        <p className="text-xs text-slate-400">
          {t('containers.resourcesDesc')}
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CPU Limits */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <label className="text-xs font-semibold text-slate-200">
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
              placeholder="0 (Unlimited)"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-slate-500">
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
                  className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                    cpuCores === preset
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {preset === '0' ? 'Unlimited' : `${preset} Core`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Memory Limits */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <label className="text-xs font-semibold text-slate-200">
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
              placeholder="0 (Unlimited)"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-slate-500">
              {t('containers.memoryLimitHelp')}
            </p>
          </div>

          {/* Quick preset buttons */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: 'Unlimited', val: '0' },
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
                  className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                    memoryMb === p.val
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
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
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <label className="text-xs font-semibold text-slate-200">
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
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                restartPolicy === item.id
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
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
              <div className="font-semibold text-xs text-slate-200 mb-0.5">{item.label}</div>
              <div className="text-[11px] leading-relaxed text-slate-400">{item.desc}</div>
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
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating...</span>
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
