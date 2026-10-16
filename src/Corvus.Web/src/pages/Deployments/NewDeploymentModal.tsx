import React, { useState } from 'react';
import { 
  X, 
  Rocket, 
  Server, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { deploymentsApi } from '../../api/deployments';
import type { DockerContainer } from '../../types';
import type { 
  ScratchDeploymentRequest, 
  ContainerConnectionTestResult 
} from '../../types/deployments';

interface NewDeploymentModalProps {
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

  if (!isOpen) return null;

  const getContainerName = (c?: DockerContainer | null) => {
    if (!c) return '';
    return c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12);
  };

  const selectedContainer = containers.find(c => c.Id === selectedContainerId);
  const containerDisplayName = getContainerName(selectedContainer);
  const isCorvusSelf = containerDisplayName.toLowerCase().includes('corvus') ||
                       (selectedContainer?.Image || '').toLowerCase().includes('corvus');

  const handleScratchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.trim() || !containerName.trim()) return;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {t('deployments.newDeploymentBtn')}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTab === 'scratch' ? t('deployments.scratchTabTitle') : t('deployments.existingTabTitle')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sekmeler (Tabs) */}
        <div className="flex border-b border-slate-800 px-6 pt-3 gap-6 bg-slate-950/40">
          <button
            type="button"
            onClick={() => { setActiveTab('scratch'); setErrorMsg(null); }}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'scratch'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-4 h-4" />
            {t('deployments.scratchTabTitle')}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('existing'); setErrorMsg(null); }}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'existing'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            {t('deployments.existingTabTitle')}
          </button>
        </div>

        {/* Hata Bildirimi */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Gövdesi */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'scratch' ? (
            <form id="scratch-deploy-form" onSubmit={handleScratchSubmit} className="space-y-4">
              {/* İmaj Adı */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('deployments.imageLabel')} *
                </label>
                <input
                  type="text"
                  required
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  placeholder={t('deployments.imagePlaceholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              {/* Konteyner Adı */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('deployments.containerNameLabel')} *
                </label>
                <input
                  type="text"
                  required
                  value={containerName}
                  onChange={e => setContainerName(e.target.value)}
                  placeholder={t('deployments.containerNamePlaceholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Port Eşlemeleri */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('deployments.portsLabel')}
                </label>
                <input
                  type="text"
                  value={ports}
                  onChange={e => setPorts(e.target.value)}
                  placeholder={t('deployments.portsPlaceholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              {/* Ortam Değişkenleri */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('deployments.envLabel')}
                </label>
                <textarea
                  rows={3}
                  value={env}
                  onChange={e => setEnv(e.target.value)}
                  placeholder={t('deployments.envPlaceholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              {/* Yeniden Başlatma Politikası */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('deployments.restartPolicyLabel')}
                </label>
                <select
                  value={restartPolicy}
                  onChange={e => setRestartPolicy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
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
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('deployments.selectExistingContainer')}
                </label>
                <select
                  value={selectedContainerId}
                  onChange={e => {
                    setSelectedContainerId(e.target.value);
                    setTestResult(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">{t('deployments.selectContainerPlaceholder')}</option>
                  {containers.map(c => {
                    const name = getContainerName(c);
                    return (
                      <option key={c.Id} value={c.Id}>
                        {name} ({c.Image}) - {c.State}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Corvus Kendi Konteyneri İkazı */}
              {isCorvusSelf && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-300 text-xs">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-200 mb-0.5">
                      {t('deployments.selfContainerWarning')}
                    </div>
                    <div className="text-amber-300/80">
                      502 Bad Gateway kesintisini önlemek için Corvus kendi kendini panelden durduramaz. Lütfen CI/CD Webhook veya docker compose kullanınız.
                    </div>
                  </div>
                </div>
              )}

              {/* Seçilen Konteyner İşlemleri & Bağlantı Testi */}
              {selectedContainer && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <span>{containerDisplayName}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          selectedContainer.State === 'running'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {selectedContainer.State}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-md">
                        {selectedContainer.Image}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Radio className={`w-3.5 h-3.5 text-cyan-400 ${testingConnection ? 'animate-pulse' : ''}`} />
                      {testingConnection ? t('deployments.testingConnection') : t('deployments.testConnectionBtn')}
                    </button>
                  </div>

                  {/* Test Sonuç Kartı */}
                  {testResult && (
                    <div className={`p-3.5 rounded-lg border text-xs ${
                      testResult.canConnect
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                    }`}>
                      <div className="flex items-center gap-2 font-semibold mb-1.5">
                        {testResult.canConnect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px] font-mono mt-2 pt-2 border-t border-slate-800">
                        <div>
                          <span className="text-slate-500">{t('deployments.ipAddressLabel')}: </span>
                          <span className="text-slate-300">{testResult.ipAddress || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">{t('deployments.portsStatusLabel')}: </span>
                          <span className="text-slate-300">{testResult.exposedPorts?.join(', ') || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Aksiyon Butonları */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenWebhookWizard(selectedContainer);
                        onClose();
                      }}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t('deployments.quickWebhookBtn')}
                    </button>
                    <button
                      type="button"
                      disabled={isCorvusSelf}
                      onClick={() => onTriggerExistingDeploy(selectedContainer)}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      {t('deployments.quickDeployBtn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {t('deployments.closeModal')}
          </button>
          {activeTab === 'scratch' && (
            <button
              type="submit"
              form="scratch-deploy-form"
              disabled={submitting || !image.trim() || !containerName.trim()}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t('deployments.deploying')}</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>{t('deployments.startScratchDeployBtn')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
