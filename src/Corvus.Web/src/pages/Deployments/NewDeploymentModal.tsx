import React from 'react';
import { Rocket, Server, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { DockerContainer } from '../../types';
import type { ScratchDeploymentRequest } from '../../types/deployments';
import { useNewDeploymentForm } from './useNewDeploymentForm';
import { ScratchDeploymentForm } from './ScratchDeploymentForm';
import { ExistingContainerDeployPanel } from './ExistingContainerDeployPanel';

export interface NewDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  containers: DockerContainer[];
  onTriggerScratchDeploy: (req: ScratchDeploymentRequest) => Promise<void>;
  onTriggerExistingDeploy: (container: DockerContainer) => Promise<void>;
  onOpenWebhookWizard: (container: DockerContainer) => void;
}

const tabButtonClass = (isActive: boolean) =>
  `pb-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
    isActive
      ? 'border-[var(--cloud-400)] text-[var(--cloud-400)]'
      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
  }`;

export const NewDeploymentModal: React.FC<NewDeploymentModalProps> = ({
  isOpen,
  onClose,
  containers,
  onTriggerScratchDeploy,
  onTriggerExistingDeploy,
  onOpenWebhookWizard
}) => {
  const { t } = useI18n();
  const form = useNewDeploymentForm({ containers, onClose, onTriggerScratchDeploy });
  const { activeTab, scratchForm, submitting } = form;

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
            onClick={() => form.selectTab('scratch')}
            className={tabButtonClass(activeTab === 'scratch')}
          >
            <Rocket className="w-3.5 h-3.5" />
            {t('deployments.scratchTabTitle')}
          </button>
          <button
            type="button"
            onClick={() => form.selectTab('existing')}
            className={tabButtonClass(activeTab === 'existing')}
          >
            <Server className="w-3.5 h-3.5" />
            {t('deployments.existingTabTitle')}
          </button>
        </div>

        {/* Hata Bildirimi */}
        {form.errorMsg && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{form.errorMsg}</span>
          </div>
        )}

        {/* Tab İçerikleri */}
        {activeTab === 'scratch' ? (
          <ScratchDeploymentForm
            image={scratchForm.image}
            onImageChange={form.setImage}
            containerName={scratchForm.containerName}
            onContainerNameChange={form.setContainerName}
            ports={scratchForm.ports}
            onPortsChange={form.setPorts}
            env={scratchForm.env}
            onEnvChange={form.setEnv}
            restartPolicy={scratchForm.restartPolicy}
            onRestartPolicyChange={form.setRestartPolicy}
            onSubmit={form.handleScratchSubmit}
          />
        ) : (
          <ExistingContainerDeployPanel
            deployableContainers={form.deployableContainers}
            selectedContainerId={form.selectedContainerId}
            onSelectContainer={form.selectContainer}
            selectedContainer={form.selectedContainer}
            containerDisplayName={form.containerDisplayName}
            testingConnection={form.testingConnection}
            testResult={form.testResult}
            onTestConnection={form.handleTestConnection}
            onOpenWebhookWizard={onOpenWebhookWizard}
            onTriggerExistingDeploy={onTriggerExistingDeploy}
            onClose={onClose}
          />
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
              disabled={submitting || !scratchForm.image.trim() || !scratchForm.containerName.trim()}
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
