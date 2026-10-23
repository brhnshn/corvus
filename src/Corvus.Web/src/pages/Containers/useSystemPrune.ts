import { useState, useMemo, useCallback } from 'react';
import { api, type DockerSystemDfResponse, type DockerSelectivePruneResult } from '../../api/client';
import { useI18n } from '../../i18n';
import { useLoadEffect } from '../../hooks/useLoadEffect';
import {
  type PruneTab,
  isDanglingImage,
  toggleInSet,
  toggleAllInSet,
  computeSelectionSummary
} from './prune/prune.utils';

/**
 * Seçmeli sistem temizliği (prune) modalının durum yönetimi:
 * disk kullanım analizi, öğe seçimi ve silme işleminin yürütülmesi.
 */
export function useSystemPrune() {
  const { t } = useI18n();

  // Durumlar
  const [isLoadingDf, setIsLoadingDf] = useState(true);
  const [dfData, setDfData] = useState<DockerSystemDfResponse | null>(null);
  const [activeTab, setActiveTab] = useState<PruneTab>('containers');

  // Seçili öğeler (Varsayılanlar güvenli olarak boş veya sadece dangling imajlar seçili)
  const [selectedContainers, setSelectedContainers] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectedVolumes, setSelectedVolumes] = useState<Set<string>>(new Set());
  const [selectedBuildCache, setSelectedBuildCache] = useState(false);

  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<DockerSelectivePruneResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Docker disk kullanım analizi (Dry-run / audit)
  const loadDiskUsage = useCallback(async () => {
    setIsLoadingDf(true);
    setError(null);
    try {
      const data = await api.getSystemDf();
      setDfData(data);

      // Güvenli varsayılanlar:
      // Konteynerler: Boş (kullanıcı belki durdurdu, ilerde açacak)
      setSelectedContainers(new Set());

      // İmajlar: Sadece askıda (dangling) olanlar varsayılan seçilir
      const danglingImageIds = new Set<string>();
      data.images?.forEach((img) => {
        if (isDanglingImage(img)) {
          danglingImageIds.add(img.id);
        }
      });
      setSelectedImages(danglingImageIds);

      // Hacimler: KESİNLİKLE BOŞ (veri kaybı koruması)
      setSelectedVolumes(new Set());
      setSelectedBuildCache(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('containers.actionFailedToast'));
    } finally {
      setIsLoadingDf(false);
    }
  }, [t]);

  useLoadEffect(loadDiskUsage);

  // Filtrelenmiş prunable listeleri
  const prunableContainers = useMemo(() => {
    return dfData?.containers?.filter(c => c.state !== 'running') || [];
  }, [dfData]);

  const prunableImages = useMemo(() => {
    return dfData?.images?.filter(img => img.containers === 0) || [];
  }, [dfData]);

  const prunableVolumes = useMemo(() => {
    return dfData?.volumes || [];
  }, [dfData]);

  const buildCacheEntries = useMemo(() => {
    return dfData?.buildCache || [];
  }, [dfData]);

  // Seçilen öğelerin toplam geri kazanılabilir boyut hesabı
  const selectedSummary = useMemo(() => computeSelectionSummary({
    containers: prunableContainers,
    selectedContainers,
    images: prunableImages,
    selectedImages,
    volumes: prunableVolumes,
    selectedVolumes,
    buildCache: buildCacheEntries,
    selectedBuildCache
  }), [prunableContainers, selectedContainers, prunableImages, selectedImages, prunableVolumes, selectedVolumes, selectedBuildCache, buildCacheEntries]);

  // Toggle helpers
  const handleToggleContainer = (id: string) => setSelectedContainers(toggleInSet(selectedContainers, id));
  const handleToggleAllContainers = () =>
    setSelectedContainers(toggleAllInSet(selectedContainers, prunableContainers.map(c => c.id)));

  const handleToggleImage = (id: string) => setSelectedImages(toggleInSet(selectedImages, id));
  const handleToggleAllImages = () =>
    setSelectedImages(toggleAllInSet(selectedImages, prunableImages.map(img => img.id)));

  const handleToggleVolume = (name: string) => setSelectedVolumes(toggleInSet(selectedVolumes, name));
  const handleToggleAllVolumes = () =>
    setSelectedVolumes(toggleAllInSet(selectedVolumes, prunableVolumes.map(v => v.name)));

  // Seçili silme işlemini yürüt
  const handleExecuteSelectivePrune = async () => {
    if (selectedSummary.count === 0) return;

    setIsExecuting(true);
    setError(null);

    try {
      const res = await api.selectivePrune({
        containerIds: Array.from(selectedContainers),
        imageIds: Array.from(selectedImages),
        volumeNames: Array.from(selectedVolumes),
        pruneBuildCache: selectedBuildCache
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('containers.actionFailedToast'));
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    isLoadingDf,
    dfData,
    activeTab,
    setActiveTab,
    selectedContainers,
    selectedImages,
    selectedVolumes,
    selectedBuildCache,
    setSelectedBuildCache,
    isExecuting,
    result,
    error,
    prunableContainers,
    prunableImages,
    prunableVolumes,
    buildCacheEntries,
    selectedSummary,
    handleToggleContainer,
    handleToggleAllContainers,
    handleToggleImage,
    handleToggleAllImages,
    handleToggleVolume,
    handleToggleAllVolumes,
    handleExecuteSelectivePrune
  };
}
