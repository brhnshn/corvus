import React, { useState, useMemo } from 'react';
import { 
  Rocket, 
  Server, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { deploymentsApi } from '../../api/deployments';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { DockerContainer } from '../../types';
import type { 
  ScratchDeploymentRequest, 
  ContainerConnectionTestResult 
} from '../../types/deployments';

export interface NewDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  containers: DockerContainer[];
  onTriggerScratchDeploy: (req: ScratchDeploymentRequest) => Promise<void>;
  onTriggerExistingDeploy: (container: DockerContainer) => Promise<void>;
  onOpenWebhookWizard: (container: DockerContainer) => void;
}

export const NewDeploymentModal: React.FC<NewDeploymentModalProps> = ({
  isOpen,
  onClose,
  containers,
  onTriggerScratchDeploy,
  onTriggerExistingDeploy,
  onOpenWebhookWizard
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'scratch' | 'existing'>('scratch');

  // Scratch Form State
  const [image, setImage] = useState('');
  const [containerName, setContainerName] = useState('');
  const [ports, setPorts] = useState('');
  const [env, setEnv] = useState('');
  const [restartPolicy, setRestartPolicy] = useState('unless-stopped');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Existing Form State
  const [selectedContainerId, setSelectedContainerId] = useState<string>('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ContainerConnectionTestResult | null>(null);

  // Corvus Öz-Koruma Kuralı (Self-Preservation Guard): Corvus konteynerleri asla hedef seçilemez
  const deployableContainers = useMemo(() => {
    return containers.filter(c => {
      const name = (c.Names?.[0] || '').toLowerCase();
      const img = (c.Image || '').toLowerCase();
      const id = (c.Id || '').toLowerCase();
      return !name.includes('corvus') && !img.includes('corvus') && !id.includes('corvus');
    });
  }, [containers]);

  const getContainerName = (c?: DockerContainer | null) => {
    if (!c) return '';
    return c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12);
  };

  const selectedContainer = deployableContainers.find(c => c.Id === selectedContainerId);
  const containerDisplayName = getContainerName(selectedContainer);

  const handleScratchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.trim() || !containerName.trim()) return;

    const lowerName = containerName.trim().toLowerCase();
    const lowerImg = image.trim().toLowerCase();
    if (lowerName.includes('corvus') || lowerImg.includes('corvus')) {
      setErrorMsg('Corvus bileşenleri panel üzerinden dağıtılamaz (Corvus Self-Preservation Guard).');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onTriggerScratchDeploy({
        image: image.trim(),
        containerName: containerName.trim(),
        ports: ports.trim() || undefined,
        env: env.trim() || undefined,
        restartPolicy
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || t('deployments.deployGenericError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedContainerId) return;
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await deploymentsApi.testContainerConnection(selectedContainerId);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        containerId: selectedContainerId,
        name: containerDisplayName || selectedContainerId,
        isRunning: false,
        status: 'error',
        exposedPorts: [],
        canConnect: false,
        message: err?.message || t('deployments.connectionFailed')
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-[var(--cloud-400)]" />
          <span>{t('deployments.newDeploymentBtn')}</span>
        </div>
      }
      subtitle={activeTab === 'scratch' ? t('deployments.scratchTabTitle') : t('deployments.existingTabTitle')}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Sekmeler (Tabs) */}
        <div className="flex border-b border-[var(--border-subtle)] pb-2 gap-4">
          <button
            type="button"
            onClick={() => { setActiveTab('scratch'); setErrorMsg(null); }}
            className={`pb-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'scratch'
                ? 'border-[var(--cloud-400)] text-[var(--cloud-400)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            {t('deployments.scratchTabTitle')}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('existing'); setErrorMsg(null); }}
            className={`pb-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'existing'
                ? 'border-[var(--cloud-400)] text-[var(--cloud-400)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            {t('deployments.existingTabTitle')}
          </button>
        </div>

        {/* Hata Bildirimi */}
        {errorMsg && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab İçerikleri */}
        {activeTab === 'scratch' ? (
          <form id="scratch-deploy-form" onSubmit={handleScratchSubmit} className="space-y-3.5">
            {/* İmaj Adı */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {t('deployments.imageLabel')} *
              </label>
              <input
                type="text"
                required
                value={image}
                onChange={e => setImage(e.target.value)}
                placeholder={t('deployments.imagePlaceholder')}
                className="w-full h-[38px] px-3.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-white/[0.05] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs outline-none focus:border-[var(--cloud-400)] transition-colors font-mono"
              />
            </div>

            {/* Konteyner Adı */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {t('deployments.containerNameLabel')} *
              </label>
              <input
                type="text"
                required
                value={containerName}
                onChange={e => setContainerName(e.target.value)}
                placeholder={t('deployments.containerNamePlaceholder')}
                className="w-full h-[38px] px-3.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-white/[0.05] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs outline-none focus:border-[var(--cloud-400)] transition-colors"
              />
            </div>

            {/* Port Eşlemeleri */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {t('deployments.portsLabel')}
              </label>
              <input
                type="text"
                value={ports}
                onChange={e => setPorts(e.target.value)}
                placeholder={t('deployments.portsPlaceholder')}
                className="w-full h-[38px] px-3.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-white/[0.05] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs outline-none focus:border-[var(--cloud-400)] transition-colors font-mono"
              />
            </div>

            {/* Ortam Değişkenleri */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {t('deployments.envLabel')}
              </label>
              <textarea
                rows={3}
                value={env}
                onChange={e => setEnv(e.target.value)}
                placeholder={t('deployments.envPlaceholder')}
                className="w-full px-3.5 py-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-white/[0.05] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs outline-none focus:border-[var(--cloud-400)] transition-colors font-mono"
              />
            </div>

            {/* Yeniden Başlatma Politikası */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {t('deployments.restartPolicyLabel')}
              </label>
              <select
                value={restartPolicy}
                onChange={e => setRestartPolicy(e.target.value)}
                className="w-full h-[38px] px-3.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--cloud-400)] transition-colors"
              >
                <option value="unless-stopped">{t('deployments.restartPolicyUnlessStopped')}</option>
                <option value="always">{t('deployments.restartPolicyAlways')}</option>
                <option value="on-failure">{t('deployments.restartPolicyOnFailure')}</option>
                <option value="no">{t('deployments.restartPolicyNo')}</option>
              </select>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Konteyner Seçimi */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {t('deployments.selectExistingContainer')}
              </label>
              <select
                value={selectedContainerId}
                onChange={e => {
                  setSelectedContainerId(e.target.value);
                  setTestResult(null);
                }}
                className="w-full h-[38px] px-3.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--cloud-400)] transition-colors"
              >
                <option value="">{t('deployments.selectContainerPlaceholder')}</option>
                {deployableContainers.map(c => {
                  const name = getContainerName(c);
                  return (
                    <option key={c.Id} value={c.Id}>
                      {name} ({c.Image}) - {c.State}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Seçilen Konteyner İşlemleri & Bağlantı Testi */}
            {selectedContainer && (
              <div className="surface rounded-[var(--radius-md)] p-4 border border-[var(--border-subtle)] space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span>{containerDisplayName}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        selectedContainer.State === 'running'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-white/[0.05] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                      }`}>
                        {selectedContainer.State}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5 truncate max-w-md">
                      {selectedContainer.Image}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    icon={<Radio className={`w-3.5 h-3.5 text-cyan-400 ${testingConnection ? 'animate-pulse' : ''}`} />}
                  >
                    {testingConnection ? t('deployments.testingConnection') : t('deployments.testConnectionBtn')}
                  </Button>
                </div>

                {/* Test Sonuç Kartı */}
                {testResult && (
                  <div className={`p-3 rounded-[var(--radius-sm)] border text-xs ${
                    testResult.canConnect
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      {testResult.canConnect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[var(--text-muted)] text-[11px] font-mono mt-2 pt-2 border-t border-[var(--border-hairline)]">
                      <div>
                        <span>{t('deployments.ipAddressLabel')}: </span>
                        <span className="text-[var(--text-primary)]">{testResult.ipAddress || '-'}</span>
                      </div>
                      <div>
                        <span>{t('deployments.portsStatusLabel')}: </span>
                        <span className="text-[var(--text-primary)]">{testResult.exposedPorts?.join(', ') || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Aksiyon Butonları */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onOpenWebhookWizard(selectedContainer);
                      onClose();
                    }}
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    {t('deployments.quickWebhookBtn')}
                  </Button>
                  <Button
                    variant="cloud"
                    size="sm"
                    onClick={() => onTriggerExistingDeploy(selectedContainer)}
                    icon={<Rocket className="w-3.5 h-3.5" />}
                  >
                    {t('deployments.quickDeployBtn')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Alt Aksiyonları */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('deployments.closeModal')}
          </Button>
          {activeTab === 'scratch' && (
            <Button
              type="submit"
              form="scratch-deploy-form"
              variant="cloud"
              size="sm"
              isLoading={submitting}
              disabled={submitting || !image.trim() || !containerName.trim()}
              icon={<Rocket className="w-3.5 h-3.5" />}
            >
              {submitting ? t('deployments.deploying') : t('deployments.startScratchDeployBtn')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
