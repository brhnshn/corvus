import { useEffect } from 'react';

type LoadResult = void | Promise<unknown> | (() => void);

/**
 * Bir yükleyici (loader) fonksiyonunu, kimliği (useCallback bağımlılıkları) değiştiğinde
 * senkronize eder: mount'ta ve yükleyici bağımlılıkları değiştiğinde çağrılır.
 * Yükleyici bir temizleme fonksiyonu döndürürse unmount/yeniden çalıştırmada çağrılır.
 *
 * Yükleyici daima `useCallback` ile bağımlılıkları doğru verilerek sarılmalıdır.
 */
export function useLoadEffect(load: () => LoadResult): void {
  useEffect(() => {
    const result = load();
    return typeof result === 'function' ? result : undefined;
  }, [load]);
}
