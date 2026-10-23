// CPU Bar Rengi
export const getCpuBarColor = (cpuPercent: number): string =>
  cpuPercent > 80 ? 'bg-rose-500' : cpuPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400';

// RAM Bar Rengi
export const getMemoryBarColor = (memPercent: number): string =>
  memPercent > 85 ? 'bg-rose-500' : memPercent > 65 ? 'bg-amber-400' : 'bg-emerald-400';

// İlerleme çubuğu genişliği (0-100 aralığına sıkıştırılır)
export const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

export const CPU_PRESETS = ['0', '0.5', '1.0', '2.0', '4.0'];

export const MEMORY_PRESETS = [
  { label: '256 MB', val: '256' },
  { label: '512 MB', val: '512' },
  { label: '1 GB', val: '1024' },
  { label: '2 GB', val: '2048' },
  { label: '4 GB', val: '4096' },
  { label: '8 GB', val: '8192' }
];

export const presetButtonClass = (active: boolean): string =>
  `px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${
    active
      ? 'bg-white text-black font-bold border-white'
      : 'bg-white/[0.04] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)] hover:bg-white/[0.08]'
  }`;
