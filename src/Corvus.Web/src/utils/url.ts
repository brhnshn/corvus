/**
 * Sunucu dışından (uzaktan) bağlanan kullanıcılar için
 * container URL'lerindeki 'localhost' / '127.0.0.1' değerini
 * otomatik olarak tarayıcının bağlı olduğu host alan adına/IP'sine dönüştürür.
 */
export const formatServiceUrl = (url?: string): string => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `http://${cleanUrl}`;
  }
  try {
    const parsed = new URL(cleanUrl);
    if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1') {
      parsed.hostname = window.location.hostname;
      return parsed.toString();
    }
  } catch {
    // URL parse edilemezse temizlenmiş halini dön
  }
  return cleanUrl;
};

/**
 * URL dizesinden port numarasını ayıklar; geçersiz veya portsuz ise boş dize döner.
 */
export const extractPort = (urlStr: string): number | '' => {
  try {
    const parsed = new URL(urlStr);
    return parsed.port ? parseInt(parsed.port, 10) : '';
  } catch {
    return '';
  }
};
