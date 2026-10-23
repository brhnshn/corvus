import type { DockerContainer } from '../../types';

/** Konteynerin okunabilir adını döndürür (baştaki "/" temizlenir, yoksa kısa ID). */
export const getContainerName = (c?: DockerContainer | null) => {
  if (!c) return '';
  return c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12);
};

// Corvus Öz-Koruma Kuralı (Self-Preservation Guard): Corvus konteynerleri asla hedef seçilemez
export const filterDeployableContainers = (containers: DockerContainer[]) => {
  return containers.filter(c => {
    const name = (c.Names?.[0] || '').toLowerCase();
    const img = (c.Image || '').toLowerCase();
    const id = (c.Id || '').toLowerCase();
    return !name.includes('corvus') && !img.includes('corvus') && !id.includes('corvus');
  });
};
