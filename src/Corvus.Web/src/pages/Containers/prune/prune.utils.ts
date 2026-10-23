import type {
  DockerDfContainerInfo,
  DockerDfImageInfo,
  DockerDfVolumeInfo,
  DockerDfBuildCacheInfo
} from '../../../types';

export type PruneTab = 'containers' | 'images' | 'volumes' | 'buildCache';

// Askıda (dangling) imaj kontrolü
export const isDanglingImage = (img: DockerDfImageInfo): boolean =>
  !img.repoTags || img.repoTags.length === 0 || img.repoTags.includes('<none>:<none>');

// Set içinde tek bir anahtarı aç/kapat (yeni Set döndürür)
export const toggleInSet = (set: Set<string>, key: string): Set<string> => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

// Tümü seçiliyse temizle, değilse tümünü seç
export const toggleAllInSet = (set: Set<string>, keys: string[]): Set<string> =>
  keys.every(k => set.has(k)) ? new Set() : new Set(keys);

interface SelectionSummaryInput {
  containers: DockerDfContainerInfo[];
  selectedContainers: Set<string>;
  images: DockerDfImageInfo[];
  selectedImages: Set<string>;
  volumes: DockerDfVolumeInfo[];
  selectedVolumes: Set<string>;
  buildCache: DockerDfBuildCacheInfo[];
  selectedBuildCache: boolean;
}

// Seçilen öğelerin toplam geri kazanılabilir boyut hesabı
export const computeSelectionSummary = ({
  containers,
  selectedContainers,
  images,
  selectedImages,
  volumes,
  selectedVolumes,
  buildCache,
  selectedBuildCache
}: SelectionSummaryInput): { bytes: number; count: number } => {
  let bytes = 0;
  let count = 0;

  // Konteynerler
  containers.forEach(c => {
    if (selectedContainers.has(c.id)) {
      bytes += c.sizeRw || 0;
      count++;
    }
  });

  // İmajlar
  images.forEach(img => {
    if (selectedImages.has(img.id)) {
      bytes += img.size || 0;
      count++;
    }
  });

  // Hacimler
  volumes.forEach(v => {
    if (selectedVolumes.has(v.name)) {
      bytes += v.usageData?.size || 0;
      count++;
    }
  });

  // Build Cache
  if (selectedBuildCache) {
    buildCache.forEach(bc => {
      bytes += bc.size || 0;
    });
    if (buildCache.length > 0) count++;
  }

  return { bytes, count };
};
