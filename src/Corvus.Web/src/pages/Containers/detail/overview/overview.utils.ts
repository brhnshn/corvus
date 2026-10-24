export const formatInspectDate = (isoString?: string): string => {
  if (!isoString || isoString.startsWith('0001-01-01')) return '—';
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
};
