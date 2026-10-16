import { lazy, type ComponentType } from 'react';

/**
 * Chunk yukleme hatalarini (yeni dagitimlarda 404 veren eski JS dosyalarini) yakalayip
 * sayfayi tazeleyen direncli lazy sarmalayici.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('chunk_reload_retry') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.removeItem('chunk_reload_retry');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('chunk_reload_retry', 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      window.sessionStorage.removeItem('chunk_reload_retry');
      throw error;
    }
  });
}
