import React from 'react';
import { useI18n } from '../../../i18n';
import { Cpu, HardDrive, RotateCcw } from 'lucide-react';
import { CPU_PRESETS, MEMORY_PRESETS, presetButtonClass } from './resources.utils';

interface ResourcesLimitsSectionProps {
  isAdmin: boolean;
  saving: boolean;
  cpuCores: string;
  onCpuCoresChange: (value: string) => void;
  memoryMb: string;
  onMemoryMbChange: (value: string) => void;
  restartPolicy: string;
  onRestartPolicyChange: (value: string) => void;
}

export const ResourcesLimitsSection: React.FC<ResourcesLimitsSectionProps> = ({
  isAdmin,
  saving,
  cpuCores,
  onCpuCoresChange,
  memoryMb,
  onMemoryMbChange,
  restartPolicy,
  onRestartPolicyChange
}) => {
  const { t } = useI18n();

  const restartPolicies = [
    { id: 'no', label: t('containers.restartPolicyNo'), desc: t('containers.restartPolicyNoDesc') },
    { id: 'always', label: t('containers.restartPolicyAlways'), desc: t('containers.restartPolicyAlwaysDesc') },
    { id: 'unless-stopped', label: t('containers.restartPolicyUnlessStopped'), desc: t('containers.restartPolicyUnlessStoppedDesc') },
    { id: 'on-failure', label: t('containers.restartPolicyOnFailure'), desc: t('containers.restartPolicyOnFailureDesc') }
  ];

  return (
    <>
      {/* Girdi Alanları (CPU & Memory Limits) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Limits Formu */}
        <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--border-subtle)]" />
            <label className="text-xs font-bold text-[var(--text-primary)]">
              {t('containers.cpuLimitLabel')} ({t('containers.coresUnit')})
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
              onChange={(e) => onCpuCoresChange(e.target.value)}
              placeholder={`0 (${t('containers.unlimited')})`}
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-[var(--border-hairline)] hover:border-white/20 rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-subtle)] transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[var(--text-secondary)]">
              {t('containers.cpuLimitHelp')}
            </p>
          </div>

          {/* Quick preset buttons */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CPU_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onCpuCoresChange(preset)}
                  className={presetButtonClass(cpuCores === preset)}
                >
                  {preset === '0' ? t('containers.unlimited') : `${preset} ${t('containers.coresUnit')}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Memory Limits Formu */}
        <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[var(--border-subtle)]" />
            <label className="text-xs font-bold text-[var(--text-primary)]">
              {t('containers.memoryLimitLabel')} (MB)
            </label>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              step="32"
              min="0"
              value={memoryMb}
              disabled={!isAdmin || saving}
              onChange={(e) => onMemoryMbChange(e.target.value)}
              placeholder={`0 (${t('containers.unlimited')})`}
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-[var(--border-hairline)] hover:border-white/20 rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-subtle)] transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[var(--text-secondary)]">
              {t('containers.memoryLimitHelp')}
            </p>
          </div>

          {/* Quick preset buttons */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[{ label: t('containers.unlimited'), val: '0' }, ...MEMORY_PRESETS].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onMemoryMbChange(p.val)}
                  className={presetButtonClass(memoryMb === p.val)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Restart Policy Formu */}
      <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[var(--border-subtle)]" />
          <label className="text-xs font-bold text-[var(--text-primary)]">
            {t('containers.restartPolicyLabel')}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {restartPolicies.map((item) => (
            <label
              key={item.id}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                restartPolicy === item.id
                  ? 'bg-white/[0.08] border-white/30 text-[var(--text-primary)] shadow-sm'
                  : 'bg-white/[0.02] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="restartPolicy"
                value={item.id}
                checked={restartPolicy === item.id}
                disabled={!isAdmin || saving}
                onChange={() => onRestartPolicyChange(item.id)}
                className="sr-only"
              />
              <div className="font-bold text-xs text-[var(--text-primary)] mb-0.5">{item.label}</div>
              <div className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{item.desc}</div>
            </label>
          ))}
        </div>
      </div>
    </>
  );
};
