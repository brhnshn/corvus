import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  FileCode2, 
  Save, 
  RotateCw, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle, 
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { containersApi } from '../../api';
import type { ComposeFileDto } from '../../types';
import { useI18n } from '../../i18n';

interface ComposeConfigModalProps {
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export const ComposeConfigModal: React.FC<ComposeConfigModalProps> = ({
  projectName,
  isOpen,
  onClose,
  onSuccess,
  isAdmin = true
}) => {
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [composeData, setComposeData] = useState<ComposeFileDto | null>(null);
  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadComposeFile = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const data = await containersApi.getComposeFile(projectName);
      setComposeData(data);
      setContent(data.content || '');
      if (data.error) {
        setErrorMessage(data.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Compose dosyası yüklenemedi.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  useEffect(() => {
    if (isOpen && projectName) {
      loadComposeFile();
    }
  }, [isOpen, projectName, loadComposeFile]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (restartStack: boolean) => {
    if (!isAdmin) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await containersApi.saveComposeFile(projectName, {
        content,
        restartStack
      });

      if (res.success) {
        setSuccessMessage(res.message || 'Compose dosyası başarıyla kaydedildi.');
        if (onSuccess) onSuccess();
        if (restartStack) {
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      } else {
        setErrorMessage(res.message || 'Kaydetme başarısız oldu.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Compose dosyası kaydedilirken hata oluştu.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const lineCount = content ? content.split('\n').length : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-[#14151b] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#eceef6]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold leading-tight">{t('containers.composeYamlEditor')}</h3>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.08] text-[11px] font-mono text-[#eceef6] font-medium">
                  {projectName}
                </span>
              </div>
              <p className="text-xs text-[#9ba0b5] mt-0.5">
                {t('containers.composeYamlSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File Path & Backup Banner */}
        <div className="px-6 py-2.5 bg-white/[0.015] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-mono text-[#9ba0b5] min-w-0 flex-1 truncate">
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
            <span className="truncate" title={composeData?.filePath || ''}>
              {composeData?.filePath || `${projectName}/compose.yaml`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[11px] text-[#9ba0b5]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('containers.composeBackupNotice')}</span>
          </div>
        </div>

        {/* Modal Body: Editor */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 flex flex-col">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#9ba0b5]">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-sm">Compose dosyası okunuyor...</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* YAML Editor Textarea with Syntax-Friendly Container */}
              <div className="relative flex-1 min-h-[360px] rounded-xl border border-white/10 bg-[#0c0d12] overflow-hidden flex flex-col font-mono text-xs">
                {/* Editor Header Bar */}
                <div className="px-3.5 py-2 bg-white/[0.04] border-b border-white/5 flex items-center justify-between text-[#9ba0b5]">
                  <span className="text-[11px] font-medium tracking-wide text-white/60">
                    compose.yaml ({lineCount} satır)
                  </span>
                  <button
                    onClick={handleCopy}
                    disabled={!content}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors"
                    title="İçeriği Kopyala"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>
                </div>

                {/* Textarea */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={!isAdmin || saving}
                  placeholder="# services:&#10;#   web:&#10;#     image: nginx:alpine"
                  className="w-full flex-1 p-4 bg-transparent text-[#eceef6] font-mono text-xs leading-relaxed resize-none focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 selection:bg-indigo-500/30 disabled:opacity-60"
                  spellCheck={false}
                  rows={18}
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <button
            onClick={loadComposeFile}
            disabled={loading || saving}
            className="flex items-center gap-1.5 text-xs text-[#9ba0b5] hover:text-[#eceef6] px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-white/10 hover:bg-white/[0.08] text-[#9ba0b5] hover:text-[#eceef6] transition-colors"
            >
              {t('common.close')}
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={loading || saving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-[#eceef6] border border-white/10 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{t('containers.composeSave')}</span>
                </button>

                <button
                  onClick={() => handleSave(true)}
                  disabled={loading || saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('containers.composeSaving')}</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{t('containers.composeSaveAndRestart')}</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
