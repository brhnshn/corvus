import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Copy, 
  Check, 
  Loader2,
  Layers
} from 'lucide-react';
import { containersApi } from '../../api';
import type { ContainerImageUpdateInfo } from '../../types';
import { useI18n } from '../../i18n';

interface ImageUpdateModalProps {
  containerId: string;
  containerName: string;
  imageName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export const ImageUpdateModal: React.FC<ImageUpdateModalProps> = ({
  containerId,
  containerName,
  imageName,
  isOpen,
  onClose,
  onSuccess,
  isAdmin = true
}) => {
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [recreating, setRecreating] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<ContainerImageUpdateInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedDigest, setCopiedDigest] = useState<'local' | 'remote' | null>(null);

  const loadUpdateInfo = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await containersApi.checkContainerUpdate(containerId);
      setUpdateInfo(data);
      if (data.error) {
        setErrorMessage(data.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Güncelleme kontrolü başarısız oldu.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  useEffect(() => {
    if (isOpen && containerId) {
      loadUpdateInfo();
    }
  }, [isOpen, containerId, loadUpdateInfo]);

  const handleCopy = (text: string, type: 'local' | 'remote') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedDigest(type);
    setTimeout(() => setCopiedDigest(null), 2000);
  };

  const handleRecreate = async () => {
    if (!isAdmin) return;
    setRecreating(true);
    setErrorMessage(null);
    try {
      const res = await containersApi.recreateContainer(containerId, true);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.message || 'Yeniden başlatma başarısız oldu.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Konteyner yeniden başlatılırken hata oluştu.';
      setErrorMessage(msg);
    } finally {
      setRecreating(false);
    }
  };

  if (!isOpen) return null;

  const truncateDigest = (digest?: string | null) => {
    if (!digest) return '—';
    if (digest.length <= 24) return digest;
    return `${digest.substring(0, 16)}...${digest.substring(digest.length - 8)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#14151b] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#eceef6]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold leading-tight">{t('containers.imageUpdateTitle') || 'Konteyner İmaj Güncellemesi'}</h3>
              <p className="text-xs text-[#9ba0b5] mt-0.5">{containerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#9ba0b5]">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm">{t('containers.checkingUpdate') || 'Kontrol ediliyor...'}</p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {updateInfo?.hasUpdate ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-emerald-300">
                      {t('containers.updateAvailable') || 'Güncelleme Mevcut'}
                    </h4>
                    <p className="text-xs text-emerald-400/90 leading-relaxed">
                      {t('containers.updateFoundDesc') || 'Uzak depoda bu imaj etiketi için yeni bir sürüm tespit edildi.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-[#eceef6]">
                      {t('containers.upToDate') || 'İmaj Güncel'}
                    </h4>
                    <p className="text-xs text-[#9ba0b5] leading-relaxed">
                      {t('containers.noUpdateFound') || 'Konteyner en son imaj digest sürümünü kullanıyor.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Notice if any */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Image & Digest Information Grid */}
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9ba0b5] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    {t('containers.image') || 'İmaj'}
                  </span>
                  <span className="font-mono text-[#eceef6] truncate max-w-[260px] font-medium" title={imageName}>
                    {imageName}
                  </span>
                </div>

                <div className="border-t border-white/5 pt-2 flex items-center justify-between text-xs">
                  <span className="text-[#9ba0b5]">{t('containers.registrySource') || 'Kayıt Defteri'}</span>
                  <span className="font-medium text-[#eceef6]">
                    {updateInfo?.registry || 'registry-1.docker.io'}
                  </span>
                </div>

                {/* Local Digest */}
                <div className="border-t border-white/5 pt-2 flex items-center justify-between text-xs">
                  <span className="text-[#9ba0b5]">{t('containers.localDigest') || 'Yerel Digest'}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[#9ba0b5]" title={updateInfo?.localDigest || ''}>
                      {truncateDigest(updateInfo?.localDigest)}
                    </span>
                    {updateInfo?.localDigest && (
                      <button
                        onClick={() => handleCopy(updateInfo.localDigest!, 'local')}
                        className="p-1 hover:text-[#eceef6] text-[#9ba0b5] transition-colors rounded hover:bg-white/[0.08]"
                        title="Digest'ı Kopyala"
                      >
                        {copiedDigest === 'local' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Remote Digest */}
                <div className="border-t border-white/5 pt-2 flex items-center justify-between text-xs">
                  <span className="text-[#9ba0b5]">{t('containers.remoteDigest') || 'Uzak Registry Digest'}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={updateInfo?.hasUpdate ? "text-emerald-400 font-medium" : "text-[#9ba0b5]"} title={updateInfo?.remoteDigest || ''}>
                      {truncateDigest(updateInfo?.remoteDigest)}
                    </span>
                    {updateInfo?.remoteDigest && (
                      <button
                        onClick={() => handleCopy(updateInfo.remoteDigest!, 'remote')}
                        className="p-1 hover:text-[#eceef6] text-[#9ba0b5] transition-colors rounded hover:bg-white/[0.08]"
                        title="Digest'ı Kopyala"
                      >
                        {copiedDigest === 'remote' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <button
            onClick={loadUpdateInfo}
            disabled={loading || recreating}
            className="flex items-center gap-1.5 text-xs text-[#9ba0b5] hover:text-[#eceef6] px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('containers.checkUpdate') || 'Güncellemeyi Kontrol Et'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={recreating}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-white/10 hover:bg-white/[0.08] text-[#9ba0b5] hover:text-[#eceef6] transition-colors"
            >
              {t('common.close') || 'Kapat'}
            </button>

            {isAdmin && (
              <button
                onClick={handleRecreate}
                disabled={loading || recreating}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {recreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('containers.recreating') || 'Yeniden başlatılıyor...'}
                  </>
                ) : (
                  <>
                    <RotateCw className="w-3.5 h-3.5" />
                    {t('containers.recreateContainer') || 'İmajı Çek & Yeniden Başlat'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
