import React from 'react';
import {
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { PruneContainersTable } from './prune/PruneContainersTable';
import { PruneImagesTable } from './prune/PruneImagesTable';
import { PruneVolumesTable } from './prune/PruneVolumesTable';
import { PruneBuildCacheCard } from './prune/PruneBuildCacheCard';
import { PruneResultReport } from './prune/PruneResultReport';
import { PruneTabBar } from './prune/PruneTabBar';
import { PruneFooter } from './prune/PruneFooter';
import { Modal } from '../../components/ui/Modal';
import { useSystemPrune } from './useSystemPrune';

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

  const {
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
  } = useSystemPrune();

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
          {result && <PruneResultReport result={result} />}

          {/* 3. Aşama: İnteraktif Önizleme ve Seçim Tabloları */}
          {!isLoadingDf && !result && dfData && (
            <div className="space-y-4">
              {/* Sekme Butonları */}
              <PruneTabBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={{
                  containers: prunableContainers.length,
                  images: prunableImages.length,
                  volumes: prunableVolumes.length,
                  buildCache: buildCacheEntries.length
                }}
              />

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
        <PruneFooter
          hasResult={!!result}
          isExecuting={isExecuting}
          selectedCount={selectedSummary.count}
          selectedBytes={selectedSummary.bytes}
          onDone={handleDone}
          onCancel={onClose}
          onExecute={handleExecuteSelectivePrune}
        />
    </Modal>
  );
};
