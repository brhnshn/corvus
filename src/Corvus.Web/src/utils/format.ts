/**
 * Format bytes into human readable string (B, KB, MB, GB, TB)
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Shorten raw 64-char Docker IDs (older activity log rows) to the usual 12-char form
 */
export function formatTargetResource(target?: string | null): string {
  if (!target) return '-';
  return /^[0-9a-f]{64}$/i.test(target) ? target.slice(0, 12) : target;
}

/**
 * Format date string into human-readable relative time string
 */
export function formatRelativeTime(dateStr?: string | null, isTr = true): string {
  if (!dateStr) return isTr ? 'Bilinmiyor' : 'Unknown';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return isTr ? 'Az önce' : 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return isTr ? `${diffMin} dk önce` : `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return isTr ? `${diffHours} sa önce` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return isTr ? `${diffDays} gün önce` : `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}
