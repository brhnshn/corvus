import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, 
  FileCode2, 
  Save, 
  Rocket,
  RotateCw, 
  Copy, 
  Check, 
  AlertCircle, 
  ShieldCheck,
  FolderOpen,
  Terminal,
  FileText
} from 'lucide-react';
import { containersApi } from '../../api';
import type { ComposeFileDto, ComposeDeployResult } from '../../types';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

interface ComposeConfigModalProps {
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

type EditorTab = 'yaml' | 'env';

export const ComposeConfigModal: React.FC<ComposeConfigModalProps> = ({
  projectName,
  isOpen,
  onClose,
  onSuccess,
  isAdmin = true
}) => {
  const { t } = useI18n();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<EditorTab>('yaml');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [composeData, setComposeData] = useState<ComposeFileDto | null>(null);
  const [yamlContent, setYamlContent] = useState('');
  const [envContent, setEnvContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deployResult, setDeployResult] = useState<ComposeDeployResult | null>(null);
  const [showDeployOutput, setShowDeployOutput] = useState(false);

  const loadComposeFile = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDeployResult(null);
    try {
      const data = await containersApi.getComposeFile(projectName);
      setComposeData(data);
      setYamlContent(data.content || '');
      setEnvContent(data.envContent || '');
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
      setActiveTab('yaml');
      setShowDeployOutput(false);
    }
  }, [isOpen, projectName, loadComposeFile]);

  // Sözcüksel (Lexical) TAB kontrolü
  const hasTabWarning = useMemo(() => {
    if (activeTab !== 'yaml') return false;
    const lines = yamlContent.split('\n');
    return lines.some((l) => l.startsWith('\t') || l.trimStart().startsWith('\t'));
  }, [activeTab, yamlContent]);

  const activeContent = activeTab === 'yaml' ? yamlContent : envContent;
  const lineCount = activeContent ? activeContent.split('\n').length : 1;
  const lineNumbers = useMemo(() => Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1), [lineCount]);

  const handleCopy = () => {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveOnly = async () => {
    if (!isAdmin) return;
    if (hasTabWarning) {
      setErrorMessage(t('containers.composeYamlTabWarning'));
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await containersApi.saveComposeFile(projectName, {
        content: yamlContent,
        envContent: envContent,
        restartStack: false
      });

      if (res.success) {
        const msg = res.message || t('common.success');
        setSuccessMessage(msg);
        toast.success(msg);
        if (onSuccess) onSuccess();
      } else {
        const err = res.message || 'Kaydetme başarısız oldu.';
        setErrorMessage(err);
        toast.error(err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Compose dosyası kaydedilemedi.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!isAdmin) return;
    if (hasTabWarning) {
      setErrorMessage(t('containers.composeYamlTabWarning'));
      return;
    }

    setDeploying(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowDeployOutput(true);
    toast.info(t('containers.composeDeploying'));

    try {
      // 1. Önce güncel içerikleri kaydet
      const saveRes = await containersApi.saveComposeFile(projectName, {
        content: yamlContent,
        envContent: envContent,
        restartStack: false
      });

      if (!saveRes.success) {
        setErrorMessage(saveRes.message || 'Dosyalar kaydedilemedi.');
        setDeploying(false);
        return;
      }

      // 2. Compose Up dağıtımını başlat
      const deployRes = await containersApi.deployCompose(projectName);
      setDeployResult(deployRes);

      if (deployRes.success) {
        setSuccessMessage(t('containers.composeDeploySuccess'));
        toast.success(t('containers.composeDeploySuccess'));
        if (onSuccess) onSuccess();
      } else {
        const err = deployRes.error || t('containers.composeDeployFailed');
        setErrorMessage(err);
        toast.error(err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Compose dağıtımı sırasında hata oluştu.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setDeploying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !deploying) onClose();
      }}
    >
      <div 
        className="w-full max-w-5xl max-h-[92vh] bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-[var(--radius-lg)] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)] animate-modal-card"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Üst Başlık & Sekmeler */}
        <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] text-[var(--cloud-200)] border border-[var(--border-hairline)]">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  {t('containers.composeYamlEditor')}
                </h3>
                <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border-hairline)] text-xs font-mono font-semibold text-[var(--cloud-200)]">
                  {projectName}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {t('containers.composeYamlSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving || deploying}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dosya Bilgisi & Sekme Seçici */}
        <div className="px-5 py-2.5 bg-[var(--bg-canvas)] border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Sekmeler (YAML vs .env) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('yaml')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] font-medium transition-all text-xs cursor-pointer ${
                activeTab === 'yaml'
                  ? 'bg-[var(--cloud-100)] text-[var(--bg-canvas)] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{t('containers.composeTabYaml')}</span>
              {hasTabWarning && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warn)]" title="TAB Sözdizimi Uyarısı" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('env')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] font-medium transition-all text-xs cursor-pointer ${
                activeTab === 'env'
                  ? 'bg-[var(--cloud-100)] text-[var(--bg-canvas)] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('containers.composeTabEnv')}</span>
              {composeData?.envExists && (
                <span className="text-[10px] font-mono opacity-80">(.env)</span>
              )}
            </button>
          </div>

          {/* Dosya Yolu & Yedekleme Bildirimi */}
          <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] font-mono">
            <div className="flex items-center gap-1.5 truncate max-w-xs sm:max-w-md" title={composeData?.filePath || ''}>
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[var(--cloud-300)]" />
              <span className="truncate">
                {activeTab === 'yaml' 
                  ? (composeData?.filePath || `${projectName}/compose.yaml`)
                  : (composeData?.envFilePath || `${projectName}/.env`)}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[var(--status-up)] font-sans">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('containers.composeBackupNotice')}</span>
            </div>
          </div>
        </div>

        {/* Modal Gövdesi: Editör */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 flex flex-col min-h-[380px]">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
              <RotateCw className="w-7 h-7 animate-spin text-[var(--cloud-200)]" />
              <p className="text-sm font-mono">{t('common.loading')}</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 flex items-center gap-2.5 text-xs text-[var(--status-down)]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-up-bg)] border border-[var(--status-up)]/30 flex items-center gap-2.5 text-xs text-[var(--status-up)]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              {hasTabWarning && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-warn-bg)] border border-[var(--status-warn)]/30 flex items-center gap-2.5 text-xs text-[var(--status-warn)]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{t('containers.composeYamlTabWarning')}</span>
                </div>
              )}

              {/* Kod Editörü (Satır Numaraları Gutter + Textarea) */}
              <div className="relative flex-1 min-h-[320px] rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden flex flex-col font-mono text-xs">
                {/* Editör Üst Bar */}
                <div className="px-3.5 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] flex items-center justify-between text-[var(--text-muted)]">
                  <span className="text-[11px] font-medium font-mono text-[var(--cloud-400)]">
                    {activeTab === 'yaml' ? 'compose.yaml' : '.env'} ({lineCount} L)
                  </span>

                  <button
                    onClick={handleCopy}
                    disabled={!activeContent}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    title={t('common.copy') || 'Kopyala'}
                  >
                    {copied ? <Check className="w-3 h-3 text-[var(--status-up)]" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? (t('common.copied') || 'Kopyalandı') : (t('common.copy') || 'Kopyala')}</span>
                  </button>
                </div>

                {/* Editör Gövdesi: Satır Numaraları & Metin Kutusu */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Satır Numaraları Gutter */}
                  <div 
                    aria-hidden="true"
                    className="w-11 shrink-0 bg-[var(--bg-subtle)] border-r border-[var(--border-hairline)] py-3 select-none text-right pr-2.5 text-[11px] font-mono text-[var(--text-muted)] opacity-60 overflow-hidden leading-relaxed"
                  >
                    {lineNumbers.map((num) => (
                      <div key={num} className="h-[21px]">{num}</div>
                    ))}
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={activeTab === 'yaml' ? yamlContent : envContent}
                    onChange={(e) => {
                      if (activeTab === 'yaml') setYamlContent(e.target.value);
                      else setEnvContent(e.target.value);
                    }}
                    disabled={!isAdmin || saving || deploying}
                    placeholder={activeTab === 'yaml' 
                      ? '# services:\n#   app:\n#     image: nginx:alpine' 
                      : t('containers.composeEnvPlaceholder')}
                    className="flex-1 p-3 bg-transparent text-[var(--text-primary)] font-mono text-xs leading-[21px] resize-none outline-none selection:bg-[var(--bg-active)] disabled:opacity-50"
                    spellCheck={false}
                    rows={16}
                  />
                </div>
              </div>

              {/* Dağıtım Çıktısı (docker compose up -d output console) */}
              {showDeployOutput && deployResult && (
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden font-mono text-xs">
                  <div className="px-3.5 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--cloud-200)] flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      {t('containers.composeDeployOutput')}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      deployResult.success ? 'bg-[var(--status-up-bg)] text-[var(--status-up)]' : 'bg-[var(--status-down-bg)] text-[var(--status-down)]'
                    }`}>
                      {deployResult.success ? 'SUCCESS (0)' : `FAILED (${deployResult.exitCode})`}
                    </span>
                  </div>
                  <pre className="p-3 text-[11px] text-[var(--text-secondary)] overflow-x-auto max-h-40 leading-snug whitespace-pre-wrap">
                    {deployResult.output || deployResult.error || 'İşlem tamamlandı.'}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Alt Çubuk & Aksiyon Butonları */}
        <div className="px-5 py-3.5 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadComposeFile}
            disabled={loading || saving || deploying}
            icon={<RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            <span>{t('common.refresh')}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={saving || deploying}
            >
              <span>{t('common.close')}</span>
            </Button>

            {isAdmin && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveOnly}
                  disabled={loading || saving || deploying || hasTabWarning}
                  isLoading={saving}
                  icon={<Save className="w-3.5 h-3.5" />}
                >
                  <span>{t('containers.composeSaveOnly')}</span>
                </Button>

                <Button
                  variant="cloud"
                  size="sm"
                  onClick={handleDeploy}
                  disabled={loading || saving || deploying || hasTabWarning}
                  isLoading={deploying}
                  icon={<Rocket className="w-3.5 h-3.5" />}
                >
                  <span>{deploying ? t('containers.composeDeploying') : t('containers.composeDeploy')}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
