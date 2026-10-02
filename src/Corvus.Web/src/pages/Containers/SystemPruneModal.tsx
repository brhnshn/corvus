import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Layers, 
  Boxes, 
  HardDrive, 
  Network, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import { api, type DockerPruneRequest, type DockerPruneResult } from '../../api/client';
import { formatBytes } from '../../utils/format';
import { useI18n } from '../../i18n';

interface SystemPruneModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const SystemPruneModal: React.FC<SystemPruneModalProps> = ({
  onClose,
  onSuccess
}) => {
  const { t } = useI18n();

  // Temizlik seçenekleri (varsayılanlar güvenli olarak ayarlanmıştır)
  const [pruneContainers, setPruneContainers] = useState(true);
  const [pruneImages, setPruneImages] = useState(true);
  const [pruneAllImages, setPruneAllImages] = useState(false);
  const [pruneVolumes, setPruneVolumes] = useState(false); // Varsayılan kesinlikle kapalı
  const [pruneNetworks, setPruneNetworks] = useState(true);
  const [pruneBuildCache, setPruneBuildCache] = useState(true);

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DockerPruneResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecutePrune = async () => {
    setIsRunning(true);
    setError(null);

    const payload: DockerPruneRequest = {
      pruneContainers,
      pruneImages,
      pruneAllImages,
      pruneVolumes,
      pruneNetworks,
      pruneBuildCache
    };

    try {
      const res = await api.systemPrune(payload);
      setResult(res);
      if (!res.success && res.errorMessage) {
        setError(res.errorMessage);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sistem temizliği sırasında bir hata oluştu');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  const hasAnySelected = pruneContainers || pruneImages || pruneVolumes || pruneNetworks || pruneBuildCache;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex flex-col bg-[#0f1117] border border-[#2a2e3f] shadow-2xl rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden">
        {/* Üst Başlık */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1a1d29] border-b border-[#2a2e3f]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e5e7eb]">{t('containers.pruneTitle')}</h2>
              <p className="text-xs text-[#9ca3af]">{t('containers.pruneSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-1.5 rounded-lg border border-[#2a2e3f] bg-[#0f1117] text-[#9ca3af] hover:text-white hover:bg-[#1e2130] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gövde Alanı */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Durum 1: Sonuç Ekranı */}
          {result ? (
            <div className="space-y-6 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#e5e7eb]">{t('containers.pruneSuccessTitle')}</h3>
                <p className="text-xs text-[#9ca3af] mt-1">{t('containers.pruneTotalReclaimed')}</p>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-2">
                  {formatBytes(result.totalSpaceReclaimed)}
                </div>
              </div>

              {/* Kategori Detay Kartları */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-left pt-2">
                {/* İmajlar */}
                <div className="p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f]">
                  <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('containers.pruneBreakdownImages')}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#e5e7eb] mt-1 font-mono">
                    {formatBytes(result.imagesSpaceReclaimed)}
                  </div>
                  <div className="text-[11px] text-[#9ca3af]/80 mt-0.5">
                    {t('containers.pruneItemsDeleted', { count: result.imagesDeletedCount })}
                  </div>
                </div>

                {/* Konteynerler */}
                <div className="p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f]">
                  <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
                    <Boxes className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('containers.pruneBreakdownContainers')}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#e5e7eb] mt-1 font-mono">
                    {formatBytes(result.containersSpaceReclaimed)}
                  </div>
                  <div className="text-[11px] text-[#9ca3af]/80 mt-0.5">
                    {t('containers.pruneItemsDeleted', { count: result.containersDeletedCount })}
                  </div>
                </div>

                {/* Hacimler */}
                <div className="p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f]">
                  <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
                    <HardDrive className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t('containers.pruneBreakdownVolumes')}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#e5e7eb] mt-1 font-mono">
                    {formatBytes(result.volumesSpaceReclaimed)}
                  </div>
                  <div className="text-[11px] text-[#9ca3af]/80 mt-0.5">
                    {t('containers.pruneItemsDeleted', { count: result.volumesDeletedCount })}
                  </div>
                </div>

                {/* Ağlar */}
                <div className="p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f]">
                  <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
                    <Network className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('containers.pruneBreakdownNetworks')}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#e5e7eb] mt-1 font-mono">
                    {result.networksDeletedCount}
                  </div>
                  <div className="text-[11px] text-[#9ca3af]/80 mt-0.5">
                    {t('containers.pruneItemsDeleted', { count: result.networksDeletedCount })}
                  </div>
                </div>

                {/* Derleme Önbelleği */}
                <div className="p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] col-span-2 sm:col-span-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t('containers.pruneBreakdownBuildCache')}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#e5e7eb] mt-1 font-mono">
                    {formatBytes(result.buildCacheSpaceReclaimed)}
                  </div>
                  <div className="text-[11px] text-[#9ca3af]/80 mt-0.5">
                    Katmanlar temizlendi
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Durum 2: Yapılandırma ve Seçim Listesi */
            <div className="space-y-4">
              {/* Konteynerler */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] hover:border-[#3b4259] transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={pruneContainers}
                  onChange={(e) => setPruneContainers(e.target.checked)}
                  disabled={isRunning}
                  className="mt-1 rounded bg-[#0f1117] border-[#2a2e3f] text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-[#e5e7eb]">{t('containers.pruneContainersOption')}</span>
                  </div>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">{t('containers.pruneContainersDesc')}</p>
                </div>
              </label>

              {/* İmajlar */}
              <div className="p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pruneImages}
                    onChange={(e) => setPruneImages(e.target.checked)}
                    disabled={isRunning}
                    className="mt-1 rounded bg-[#0f1117] border-[#2a2e3f] text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-[#e5e7eb]">{t('containers.pruneImagesOption')}</span>
                    </div>
                  </div>
                </label>

                {pruneImages && (
                  <div className="pl-7 space-y-1.5 pt-1 border-t border-[#2a2e3f]/60 text-xs">
                    <label className="flex items-center gap-2 text-[#9ca3af] hover:text-[#e5e7eb] cursor-pointer">
                      <input
                        type="radio"
                        name="imagePruneType"
                        checked={!pruneAllImages}
                        onChange={() => setPruneAllImages(false)}
                        disabled={isRunning}
                        className="text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>{t('containers.pruneImagesDangling')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-[#9ca3af] hover:text-[#e5e7eb] cursor-pointer">
                      <input
                        type="radio"
                        name="imagePruneType"
                        checked={pruneAllImages}
                        onChange={() => setPruneAllImages(true)}
                        disabled={isRunning}
                        className="text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>{t('containers.pruneImagesAll')}</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Hacimler (Volumes) - Güvenlik Uyarılı */}
              <div className="p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pruneVolumes}
                    onChange={(e) => setPruneVolumes(e.target.checked)}
                    disabled={isRunning}
                    className="mt-1 rounded bg-[#0f1117] border-[#2a2e3f] text-rose-600 focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-semibold text-[#e5e7eb]">{t('containers.pruneVolumesOption')}</span>
                    </div>
                    <p className="text-[11px] text-[#9ca3af] mt-0.5">{t('containers.pruneVolumesDesc')}</p>
                  </div>
                </label>

                {pruneVolumes && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>{t('containers.pruneVolumesWarning')}</span>
                  </div>
                )}
              </div>

              {/* Ağlar (Networks) */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] hover:border-[#3b4259] transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={pruneNetworks}
                  onChange={(e) => setPruneNetworks(e.target.checked)}
                  disabled={isRunning}
                  className="mt-1 rounded bg-[#0f1117] border-[#2a2e3f] text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-[#e5e7eb]">{t('containers.pruneNetworksOption')}</span>
                  </div>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">{t('containers.pruneNetworksDesc')}</p>
                </div>
              </label>

              {/* Derleme Önbelleği (Build Cache) */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] hover:border-[#3b4259] transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={pruneBuildCache}
                  onChange={(e) => setPruneBuildCache(e.target.checked)}
                  disabled={isRunning}
                  className="mt-1 rounded bg-[#0f1117] border-[#2a2e3f] text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-[#e5e7eb]">{t('containers.pruneBuildCacheOption')}</span>
                  </div>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">{t('containers.pruneBuildCacheDesc')}</p>
                </div>
              </label>

              {/* Alt Bilgi Uyarısı */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-[#2a2e3f] text-[11px] text-[#9ca3af] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{t('containers.pruneConfirmWarning')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Alt Butonlar */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#1a1d29] border-t border-[#2a2e3f]">
          {result ? (
            <button
              onClick={handleDone}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              {t('containers.pruneDoneButton')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isRunning}
                className="px-4 py-2 rounded-xl border border-[#2a2e3f] bg-[#0f1117] text-xs font-medium text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1e2130] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleExecutePrune}
                disabled={isRunning || !hasAnySelected}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-900/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('containers.pruneRunning')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('containers.pruneStartButton')}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
