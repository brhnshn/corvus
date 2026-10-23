import type { Service } from '../../api/client';

export type EditCheckType = 'http' | 'tcp' | 'docker' | 'none' | 'ping';

/** Servisin kayıtlı kontrol türünü çözer; yoksa docker/http varsayılanına düşer. */
export const resolveCheckType = (service: Service | null): EditCheckType =>
  (service?.checkType as EditCheckType) || (service?.source === 'docker' && !service?.url ? 'docker' : 'http');

/** HTTP kontrolünde URL ve sağlık kontrolü adreslerini şema/köken ile tamamlar. */
export const normalizeServiceUrls = (
  url: string,
  health: string,
  checkType: EditCheckType
): { finalUrl: string; finalHealth: string } => {
  let finalUrl = url.trim();
  if (finalUrl && !/^https?:\/\//i.test(finalUrl) && checkType === 'http') {
    finalUrl = `https://${finalUrl}`;
  }

  let finalHealth = health.trim();
  if (finalHealth && !/^https?:\/\//i.test(finalHealth) && checkType === 'http') {
    if (finalHealth.startsWith('/')) {
      if (finalUrl) {
        try {
          const parsed = new URL(finalUrl);
          finalHealth = `${parsed.origin}${finalHealth}`;
        } catch {
          finalHealth = `${finalUrl}${finalHealth}`;
        }
      }
    } else {
      finalHealth = `https://${finalHealth}`;
    }
  }

  return { finalUrl, finalHealth };
};
