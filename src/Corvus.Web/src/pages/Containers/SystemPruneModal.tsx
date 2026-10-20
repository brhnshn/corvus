import React, { useState, useMemo, useCallback } from 'react';
import { 
  Trash2, 
  Layers, 
  Boxes, 
  HardDrive, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sparkles
} from 'lucide-react';
import { api, type DockerSystemDfResponse, type DockerSelectivePruneResult } from '../../api/client';
import { formatBytes } from '../../utils/format';
import { useI18n } from '../../i18n';
import { PruneContainersTable } from './prune/PruneContainersTable';
import { PruneImagesTable } from './prune/PruneImagesTable';
import { PruneVolumesTable } from './prune/PruneVolumesTable';
import { PruneBuildCacheCard } from './prune/PruneBuildCacheCard';
import { Modal } from '../../components/ui/Modal';
import { useLoadEffect } from '../../hooks/useLoadEffect';

interface SystemPruneModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SystemPruneModal: React.FC<SystemPruneModalProps> = ({
  isOpen = true,
  onClose,
  onSuccess
}) => {
  const { t } = useI18n();

  // Durumlar
  const [isLoadingDf, setIsLoadingDf] = useState(true);
  const [dfData, setDfData] = useState<DockerSystemDfResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'containers' | 'images' | 'volumes' | 'buildCache'>('containers');

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
        const isDangling = !img.repoTags || img.repoTags.length === 0 || img.repoTags.includes('<none>:<none>');
        if (isDangling) {
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
  const selectedSummary = useMemo(() => {
    let bytes = 0;
    let count = 0;

    // Konteynerler
    prunableContainers.forEach(c => {
      if (selectedContainers.has(c.id)) {
        bytes += c.sizeRw || 0;
        count++;
      }
    });

    // İmajlar
    prunableImages.forEach(img => {
      if (selectedImages.has(img.id)) {
        bytes += img.size || 0;
        count++;
      }
    });

    // Hacimler
    prunableVolumes.forEach(v => {
      if (selectedVolumes.has(v.name)) {
        bytes += v.usageData?.size || 0;
        count++;
      }
    });

    // Build Cache
    if (selectedBuildCache) {
      buildCacheEntries.forEach(bc => {
        bytes += bc.size || 0;
      });
      if (buildCacheEntries.length > 0) count++;
    }

    return { bytes, count };
  }, [prunableContainers, selectedContainers, prunableImages, selectedImages, prunableVolumes, selectedVolumes, selectedBuildCache, buildCacheEntries]);

  // Toggle helpers
  const handleToggleContainer = (id: string) => {
    const next = new Set(selectedContainers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContainers(next);
  };

  const handleToggleAllContainers = () => {
    if (prunableContainers.every(c => selectedContainers.has(c.id))) {
      setSelectedContainers(new Set());
    } else {
      setSelectedContainers(new Set(prunableContainers.map(c => c.id)));
    }
  };

  const handleToggleImage = (id: string) => {
    const next = new Set(selectedImages);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedImages(next);
  };

  const handleToggleAllImages = () => {
    if (prunableImages.every(img => selectedImages.has(img.id))) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(prunableImages.map(img => img.id)));
    }
  };

  const handleToggleVolume = (name: string) => {
    const next = new Set(selectedVolumes);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedVolumes(next);
  };

  const handleToggleAllVolumes = () => {
    if (prunableVolumes.every(v => selectedVolumes.has(v.name))) {
      setSelectedVolumes(new Set());
    } else {
      setSelectedVolumes(new Set(prunableVolumes.map(v => v.name)));
    }
  };

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

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('containers.pruneTitle')}
      subtitle={t('containers.pruneSubtitle')}
      icon={<Trash2 className="w-5 h-5 text-[var(--status-down)]" />}
      maxWidth="max-w-2xl"
    >
      <div className="max-h-[75vh] overflow-y-auto space-y-5 pr-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* 1. Aşama: Yükleniyor Ekranı */}
          {isLoadingDf && !result && (
            <div className="py-14 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#d5d5dc] animate-spin mx-auto" />
              <div className="text-sm font-semibold text-[#eceef6]">
                {t('containers.scanningDiskUsage')}
              </div>
              <p className="text-xs text-[#9ba0b5]">
                {t('containers.scanningDiskUsageDesc')}
              </p>
            </div>
          )}

          {/* 2. Aşama: Sonuç Raporu */}
          {result && (
            <div className="space-y-6 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#eceef6]">
                  {t('containers.pruneSuccessTitle')}
                </h3>
                <p className="text-xs text-[#9ba0b5] mt-1">
                  {t('containers.pruneTotalReclaimed')}
                </p>
                <div className="text-3xl font-extrabold text-[#34d399] font-mono mt-2">
                  {formatBytes(result.totalSpaceReclaimed)}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left pt-2">
                <div className="p-3.5 surface rounded-2xl border border-white/10">
                  <div className="text-[11px] text-[#9ba0b5] flex items-center gap-1">
                    <Boxes className="w-3.5 h-3.5 text-[#d5d5dc]" />
                    <span>{t('containers.pruneBreakdownContainers')}</span>
                  </div>
                  <div className="text-sm font-bold text-[#eceef6] mt-1 font-mono">
                    {t('containers.pruneCountUnit', { count: result.deletedContainers.length })}
                  </div>
                </div>

                <div className="p-3.5 surface rounded-2xl border border-white/10">
                  <div className="text-[11px] text-[#9ba0b5] flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#d5d5dc]" />
                    <span>{t('containers.pruneBreakdownImages')}</span>
                  </div>
                  <div className="text-sm font-bold text-[#eceef6] mt-1 font-mono">
                    {t('containers.pruneCountUnit', { count: result.deletedImages.length })}
                  </div>
                </div>

                <div className="p-3.5 surface rounded-2xl border border-white/10">
                  <div className="text-[11px] text-[#9ba0b5] flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-[#d5d5dc]" />
                    <span>{t('containers.pruneBreakdownVolumes')}</span>
                  </div>
                  <div className="text-sm font-bold text-[#eceef6] mt-1 font-mono">
                    {t('containers.pruneCountUnit', { count: result.deletedVolumes.length })}
                  </div>
                </div>

                <div className="p-3.5 surface rounded-2xl border border-white/10">
                  <div className="text-[11px] text-[#9ba0b5] flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-[#d5d5dc]" />
                    <span>{t('containers.pruneCacheLabel')}</span>
                  </div>
                  <div className="text-sm font-bold text-[#eceef6] mt-1 font-mono">
                    {result.buildCachePruned ? t('containers.pruneCacheCleaned') : '—'}
                  </div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left space-y-1">
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t('containers.prunePartialErrorsTitle')}</span>
                  </div>
                  <ul className="text-[11px] text-amber-200/80 list-disc list-inside space-y-0.5">
                    {result.errors.map((err, idx) => (
                      <li key={idx} className="truncate">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 3. Aşama: İnteraktif Önizleme ve Seçim Tabloları */}
          {!isLoadingDf && !result && dfData && (
            <div className="space-y-4">
              {/* Sekme Butonları */}
              <div className="flex items-center gap-1.5 p-1 surface border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('containers')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'containers'
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.04]'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>{t('containers.pruneContainersOption')}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'containers' ? 'bg-black/10 text-black' : 'bg-white/[0.06] text-[#9ba0b5]'
                  }`}>
                    {prunableContainers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('images')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'images'
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.04]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('containers.pruneImagesOption')}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'images' ? 'bg-black/10 text-black' : 'bg-white/[0.06] text-[#9ba0b5]'
                  }`}>
                    {prunableImages.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('volumes')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'volumes'
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.04]'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>{t('containers.pruneOrphanedVolumesTab')}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'volumes' ? 'bg-black/10 text-black' : 'bg-white/[0.06] text-[#9ba0b5]'
                  }`}>
                    {prunableVolumes.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('buildCache')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'buildCache'
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.04]'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{t('containers.pruneBuildCacheOption')}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'buildCache' ? 'bg-black/10 text-black' : 'bg-white/[0.06] text-[#9ba0b5]'
                  }`}>
                    {buildCacheEntries.length}
                  </span>
                </button>
              </div>

              {/* Aktif Sekme İçeriği */}
              <div className="pt-1">
                {activeTab === 'containers' && (
                  <PruneContainersTable
                    containers={prunableContainers}
                    selectedIds={selectedContainers}
                    onToggle={handleToggleContainer}
                    onToggleAll={handleToggleAllContainers}
                  />
                )}

                {activeTab === 'images' && (
                  <PruneImagesTable
                    images={prunableImages}
                    selectedIds={selectedImages}
                    onToggle={handleToggleImage}
                    onToggleAll={handleToggleAllImages}
                  />
                )}

                {activeTab === 'volumes' && (
                  <PruneVolumesTable
                    volumes={prunableVolumes}
                    selectedNames={selectedVolumes}
                    onToggle={handleToggleVolume}
                    onToggleAll={handleToggleAllVolumes}
                  />
                )}

                {activeTab === 'buildCache' && (
                  <PruneBuildCacheCard
                    cacheEntries={buildCacheEntries}
                    selected={selectedBuildCache}
                    onToggle={setSelectedBuildCache}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alt Çubuk */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-t border-white/10">
          {result ? (
            <button
              onClick={handleDone}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-medium text-xs text-[#0a0d14] transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {t('containers.pruneDoneButton')}
            </button>
          ) : (
            <>
              {/* Canlı Hesaplanan Geri Kazanım Özeti */}
              <div className="text-xs">
                <span className="text-[var(--text-secondary)]">
                  {t('containers.selectedCount', { count: selectedSummary.count })}
                </span>
                <span className="mx-2 text-white/20">|</span>
                <span className="text-[var(--text-secondary)]">
                  {t('containers.reclaimableAmount', { amount: '' })}
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatBytes(selectedSummary.bytes)}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isExecuting}
                  className="px-4 py-2 rounded-xl border border-[var(--border-hairline)] bg-white/[0.04] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="button"
                  onClick={handleExecuteSelectivePrune}
                  disabled={isExecuting || selectedSummary.count === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-xs font-semibold text-white shadow-lg shadow-rose-500/20 transition-all disabled:cursor-not-allowed cursor-pointer"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('containers.pruningInProgress')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {t('containers.pruneSelectedBtn', { count: selectedSummary.count })}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
    </Modal>
  );
};
