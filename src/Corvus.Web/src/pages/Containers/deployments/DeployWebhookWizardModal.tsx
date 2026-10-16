import React, { useState } from 'react';
import { useI18n } from '../../../i18n';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { GitBranch, Copy, Check, ShieldCheck, Key, Terminal } from 'lucide-react';

export interface DeployWebhookWizardModalProps {
  isOpen: boolean;
  containerId: string;
  containerName?: string;
  onClose: () => void;
}

export const DeployWebhookWizardModal: React.FC<DeployWebhookWizardModalProps> = ({
  isOpen,
  containerId,
  onClose
}) => {
  const { t } = useI18n();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://corvus.example.com';
  const webhookUrl = `${origin}/api/hooks/deploy/\${CORVUS_DEPLOY_TOKEN}?containerId=${encodeURIComponent(containerId)}&wait=true`;

  const yamlTemplate = `name: Deploy to Corvus

on:
  push:
    branches: [ "main" ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Build and Push Docker Image
        run: |
          docker build -t your-registry/app:latest .
          docker push your-registry/app:latest

      - name: Trigger Corvus Zero-Downtime Deployment
        env:
          CORVUS_DEPLOY_TOKEN: \${{ secrets.CORVUS_DEPLOY_TOKEN }}
        run: |
          echo "Triggering Corvus Deployment..."
          curl -f -X POST "${origin}/api/hooks/deploy/$CORVUS_DEPLOY_TOKEN?containerId=${encodeURIComponent(containerId)}&wait=true" \\
            -H "Content-Type: application/json" \\
            --max-time 180
`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.warn('Copy URL failed', err);
    }
  };

  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yamlTemplate);
      setCopiedYaml(true);
      setTimeout(() => setCopiedYaml(false), 2000);
    } catch (err) {
      console.warn('Copy YAML failed', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-zinc-100">
            {t('deployments.webhookWizardTitle')}
          </span>
        </div>
      }
      subtitle={t('deployments.webhookWizardSubtitle')}
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-4 text-xs">
        {/* Step 1: Webhook URL */}
        <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-[var(--radius-md)] flex flex-col gap-2">
          <div className="flex items-center gap-2 font-semibold text-zinc-200">
            <Key className="w-4 h-4 text-amber-400" />
            <span>{t('deployments.step1Title')}</span>
          </div>
          <p className="text-[11.5px] text-[var(--text-muted)]">
            {t('deployments.webhookSyncParamDesc')}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 bg-black/40 border border-white/[0.08] rounded px-2.5 py-1.5 font-mono text-[11px] text-zinc-300 select-all focus:outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyUrl}
              icon={copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedUrl ? t('common.copied') : t('common.copy')}
            </Button>
          </div>
        </div>

        {/* Step 2: GitHub Secret Instruction */}
        <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-[var(--radius-md)] flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-semibold text-zinc-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('deployments.step2Title')}</span>
          </div>
          <p className="text-[11.5px] text-[var(--text-muted)]">
            {t('deployments.stepSecretNameHelp')}
          </p>
          <div className="mt-1 font-mono text-[11px] bg-black/30 p-2 rounded text-zinc-400">
            Name: <span className="text-emerald-300 font-semibold">CORVUS_DEPLOY_TOKEN</span>
          </div>
        </div>

        {/* Step 3: Workflow Template */}
        <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-[var(--radius-md)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-zinc-200">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span>{t('deployments.step3Title')}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyYaml}
              icon={copiedYaml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedYaml ? t('deployments.yamlCopied') : t('common.copy')}
            </Button>
          </div>

          <pre className="p-3 rounded bg-[#090b10] border border-white/[0.06] text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-[180px] custom-scrollbar">
            {yamlTemplate}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('deployments.closeModal')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
