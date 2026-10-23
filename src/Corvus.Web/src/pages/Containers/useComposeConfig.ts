import { useState, useCallback, useMemo } from 'react';
import { containersApi } from '../../api';
import type { ComposeFileDto, ComposeDeployResult } from '../../types';
import { useI18n } from '../../i18n';
import { useToast } from '../../components/ui/ToastContext';
import { useLoadEffect } from '../../hooks/useLoadEffect';

export type EditorTab = 'yaml' | 'env';

interface UseComposeConfigOptions {
  projectName: string;
  isOpen: boolean;
  onSuccess?: () => void;
  isAdmin: boolean;
}

/**
 * Compose yapılandırma modalının durum yönetimi:
 * dosya yükleme, düzenleme, kaydetme ve compose up dağıtımı.
 */
export function useComposeConfig({
  projectName,
  isOpen,
  onSuccess,
  isAdmin
}: UseComposeConfigOptions) {
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
      const msg = err instanceof Error ? err.message : t('containers.composeNotFound');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [projectName, t]);

  const [prevOpenState, setPrevOpenState] = useState({ isOpen, projectName });
  if (prevOpenState.isOpen !== isOpen || prevOpenState.projectName !== projectName) {
    setPrevOpenState({ isOpen, projectName });
    if (isOpen && projectName) {
      setActiveTab('yaml');
      setShowDeployOutput(false);
    }
  }

  const loadWhenOpen = useCallback(() => {
    if (isOpen && projectName) {
      loadComposeFile();
    }
  }, [isOpen, projectName, loadComposeFile]);

  useLoadEffect(loadWhenOpen);

  // Sözcüksel (Lexical) TAB kontrolü
  const hasTabWarning = useMemo(() => {
    if (activeTab !== 'yaml') return false;
    const lines = yamlContent.split('\n');
    return lines.some((l) => l.startsWith('\t') || l.trimStart().startsWith('\t'));
  }, [activeTab, yamlContent]);

  const activeContent = activeTab === 'yaml' ? yamlContent : envContent;
  const lineCount = activeContent ? activeContent.split('\n').length : 1;
  const lineNumbers = useMemo(() => Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1), [lineCount]);

  const setActiveContent = (value: string) => {
    if (activeTab === 'yaml') setYamlContent(value);
    else setEnvContent(value);
  };

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
        const err = res.message || t('containers.composeSaveFailed');
        setErrorMessage(err);
        toast.error(err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('containers.composeSaveFailed');
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
        setErrorMessage(saveRes.message || t('containers.composeSaveFailed'));
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
      const msg = err instanceof Error ? err.message : t('containers.composeDeployError');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setDeploying(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    loading,
    saving,
    deploying,
    composeData,
    errorMessage,
    successMessage,
    copied,
    deployResult,
    showDeployOutput,
    hasTabWarning,
    activeContent,
    setActiveContent,
    lineCount,
    lineNumbers,
    loadComposeFile,
    handleCopy,
    handleSaveOnly,
    handleDeploy
  };
}
