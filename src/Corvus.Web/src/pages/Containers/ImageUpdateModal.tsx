import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Copy, 
  Check, 
  Layers
} from 'lucide-react';
import { containersApi } from '../../api';
import type { ContainerImageUpdateInfo } from '../../types';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

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
  const toast = useToast();

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
      const msg = err instanceof Error ? err.message : t('containers.actionFailedToast');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [containerId, t]);

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
    toast.info(t('containers.imagePullingAndRecreating'));
    try {
      const res = await containersApi.recreateContainer(containerId, true);
      if (res.success) {
        toast.success(res.message || t('containers.imageUpdatedAndRestartedToast'));
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const err = res.message || t('containers.actionFailedToast');
        setErrorMessage(err);
        toast.error(err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('containers.actionFailedToast');
      setErrorMessage(msg);
      toast.error(msg);
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !recreating) onClose();
      }}
    >
      <div 
        className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-[var(--radius-lg)] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)] animate-modal-card"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] text-[var(--status-warn)] border border-[var(--border-hairline)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                {t('containers.imageUpdateTitle')}
              </h3>
              <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">{containerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={recreating}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
              <RotateCw className="w-7 h-7 animate-spin text-[var(--cloud-200)]" />
              <p className="text-xs font-mono">{t('containers.checkingUpdate')}</p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {updateInfo?.hasUpdate ? (
                <div className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--status-warn-bg)] border border-[var(--status-warn)]/30 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-[var(--status-warn)] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-[var(--status-warn)]">
                      {t('containers.updateAvailable')}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {t('containers.updateFoundDesc')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--status-up-bg)] border border-[var(--status-up)]/30 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[var(--status-up)] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-[var(--status-up)]">
                      {t('containers.upToDate')}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {t('containers.noUpdateFound')}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 flex items-center gap-2.5 text-xs text-[var(--status-down)]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Grid Info */}
              <div className="space-y-2.5 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[var(--cloud-400)]" />
                    {t('containers.image')}
                  </span>
                  <span className="font-mono text-[var(--text-primary)] truncate max-w-[260px] font-semibold" title={imageName}>
                    {imageName}
                  </span>
                </div>

                <div className="border-t border-[var(--border-hairline)] pt-2 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{t('containers.registrySource')}</span>
                  <span className="font-medium font-mono text-[var(--text-primary)]">
                    {updateInfo?.registry || 'registry-1.docker.io'}
                  </span>
                </div>

                <div className="border-t border-[var(--border-hairline)] pt-2 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{t('containers.localDigest')}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[var(--text-muted)]" title={updateInfo?.localDigest || ''}>
                      {truncateDigest(updateInfo?.localDigest)}
                    </span>
                    {updateInfo?.localDigest && (
                      <button
                        onClick={() => handleCopy(updateInfo.localDigest!, 'local')}
                        className="p-1 hover:text-[var(--text-primary)] text-[var(--text-muted)] transition-colors rounded cursor-pointer"
                        title={t('containers.copyDigestTooltip')}
                      >
                        {copiedDigest === 'local' ? <Check className="w-3 h-3 text-[var(--status-up)]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--border-hairline)] pt-2 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{t('containers.remoteDigest')}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={updateInfo?.hasUpdate ? "text-[var(--status-warn)] font-semibold" : "text-[var(--text-muted)]"} title={updateInfo?.remoteDigest || ''}>
                      {truncateDigest(updateInfo?.remoteDigest)}
                    </span>
                    {updateInfo?.remoteDigest && (
                      <button
                        onClick={() => handleCopy(updateInfo.remoteDigest!, 'remote')}
                        className="p-1 hover:text-[var(--text-primary)] text-[var(--text-muted)] transition-colors rounded cursor-pointer"
                        title={t('containers.copyDigestTooltip')}
                      >
                        {copiedDigest === 'remote' ? <Check className="w-3 h-3 text-[var(--status-up)]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadUpdateInfo}
            disabled={loading || recreating}
            icon={<RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            <span>{t('common.refresh')}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={recreating}
            >
              <span>{t('common.close')}</span>
            </Button>

            {isAdmin && (
              <Button
                variant="cloud"
                size="sm"
                onClick={handleRecreate}
                disabled={loading || recreating}
                isLoading={recreating}
                icon={<RotateCw className="w-3.5 h-3.5" />}
              >
                <span>{recreating ? t('containers.recreating') : t('containers.imagePullAndRecreate')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
