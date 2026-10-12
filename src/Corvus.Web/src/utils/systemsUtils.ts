import type { SystemStatus } from '../types/systems';

export function resolveHubUrl(customOverride?: string): string {
  if (customOverride && customOverride.trim().length > 0) {
    return customOverride.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:8090';
}

export function generateDockerRunCommand(options: {
  hubUrl: string;
  nodeKey: string;
  containerName?: string;
  imageTag?: string;
}): string {
  const hub = options.hubUrl.replace(/\/+$/, '');
  const name = options.containerName || 'corvus-agent';
  const tag = options.imageTag || 'ghcr.io/brhnshn/corvus-agent:latest';

  return `docker run -d --name ${name} --restart unless-stopped \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -e HUB_URL="${hub}" \\
  -e NODE_KEY="${options.nodeKey}" \\
  ${tag}`;
}

export function formatBytes(bytes?: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatBitrate(bytesPerSec?: number): string {
  if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function getSystemStatusTheme(status: SystemStatus): {
  dotColor: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
} {
  switch (status) {
    case 'online':
      return {
        dotColor: 'bg-[#34d399]',
        textColor: 'text-[#34d399]',
        badgeBg: 'bg-[#34d399]/10',
        badgeBorder: 'border-[#34d399]/20'
      };
    case 'degraded':
      return {
        dotColor: 'bg-[#fbbf24]',
        textColor: 'text-[#fbbf24]',
        badgeBg: 'bg-[#fbbf24]/10',
        badgeBorder: 'border-[#fbbf24]/20'
      };
    case 'offline':
      return {
        dotColor: 'bg-[#f87171]',
        textColor: 'text-[#f87171]',
        badgeBg: 'bg-[#f87171]/10',
        badgeBorder: 'border-[#f87171]/20'
      };
    case 'pending':
      return {
        dotColor: 'bg-[#fbbf24]',
        textColor: 'text-[#fbbf24]',
        badgeBg: 'bg-[#fbbf24]/10',
        badgeBorder: 'border-[#fbbf24]/20'
      };
    case 'paused':
      return {
        dotColor: 'bg-[#9ba0b5]',
        textColor: 'text-[#9ba0b5]',
        badgeBg: 'bg-white/10',
        badgeBorder: 'border-white/15'
      };
    default:
      return {
        dotColor: 'bg-[#d5d5dc]',
        textColor: 'text-[#d5d5dc]',
        badgeBg: 'bg-white/10',
        badgeBorder: 'border-white/15'
      };
  }
}
