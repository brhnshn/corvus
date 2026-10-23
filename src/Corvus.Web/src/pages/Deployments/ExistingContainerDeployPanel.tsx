import React from 'react';
import { Rocket, Radio, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import type { DockerContainer } from '../../types';
import type { ContainerConnectionTestResult } from '../../types/deployments';
import { getContainerName } from './newDeployment.utils';

interface ExistingContainerDeployPanelProps {
  deployableContainers: DockerContainer[];
  selectedContainerId: string;
  onSelectContainer: (id: string) => void;
  selectedContainer?: DockerContainer;
  containerDisplayName: string;
  testingConnection: boolean;
  testResult: ContainerConnectionTestResult | null;
  onTestConnection: () => void;
  onOpenWebhookWizard: (container: DockerContainer) => void;
  onTriggerExistingDeploy: (container: DockerContainer) => Promise<void>;
  onClose: () => void;
}

export const ExistingContainerDeployPanel: React.FC<ExistingContainerDeployPanelProps> = ({
  deployableContainers,
  selectedContainerId,
  onSelectContainer,
  selectedContainer,
  containerDisplayName,
  testingConnection,
  testResult,
  onTestConnection,
  onOpenWebhookWizard,
  onTriggerExistingDeploy,
  onClose
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Konteyner Seçimi */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          {t('deployments.selectExistingContainer')}
        </label>
        <select
          value={selectedContainerId}
          onChange={e => onSelectContainer(e.target.value)}
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
              onClick={onTestConnection}
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
  );
};
