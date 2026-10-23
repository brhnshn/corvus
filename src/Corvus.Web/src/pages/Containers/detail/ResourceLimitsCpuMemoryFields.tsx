import React from 'react';
import { Cpu, HardDrive } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { CPU_PRESETS } from './containerResourceLimits.utils';

interface ResourceLimitsCpuMemoryFieldsProps {
  cpuCores: string;
  onCpuCoresChange: (value: string) => void;
  memoryMb: string;
  onMemoryMbChange: (value: string) => void;
  saving: boolean;
}

const presetClass = (isActive: boolean) =>
  `px-2 py-0.5 text-[10px] font-mono rounded-lg border transition-colors cursor-pointer ${
    isActive
      ? 'bg-white text-black font-bold border-white'
      : 'bg-white/[0.04] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
  }`;

// CPU & Memory Inputs
export const ResourceLimitsCpuMemoryFields: React.FC<ResourceLimitsCpuMemoryFieldsProps> = ({
  cpuCores,
  onCpuCoresChange,
  memoryMb,
  onMemoryMbChange,
  saving,
}) => {
  const { t } = useI18n();

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
          onChange={(e) => onCpuCoresChange(e.target.value)}
          placeholder={`0 (${t('containers.unlimited')})`}
          className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-[var(--border-hairline)] hover:border-white/20 rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-sky-400 transition-colors disabled:opacity-50"
        />
        <p className="text-[11px] text-[var(--text-secondary)]">
          {t('containers.cpuLimitHelp')}
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          {CPU_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onCpuCoresChange(preset)}
              className={presetClass(cpuCores === preset)}
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
          onChange={(e) => onMemoryMbChange(e.target.value)}
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
              onClick={() => onMemoryMbChange(preset.val)}
              className={presetClass(memoryMb === preset.val)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
