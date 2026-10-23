import React from 'react';
import { useI18n } from '../../i18n';

interface ScratchDeploymentFormProps {
  image: string;
  onImageChange: (value: string) => void;
  containerName: string;
  onContainerNameChange: (value: string) => void;
  ports: string;
  onPortsChange: (value: string) => void;
  env: string;
  onEnvChange: (value: string) => void;
  restartPolicy: string;
  onRestartPolicyChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ScratchDeploymentForm: React.FC<ScratchDeploymentFormProps> = ({
  image,
  onImageChange,
  containerName,
  onContainerNameChange,
  ports,
  onPortsChange,
  env,
  onEnvChange,
  restartPolicy,
  onRestartPolicyChange,
  onSubmit
}) => {
  const { t } = useI18n();

  return (
    <form id="scratch-deploy-form" onSubmit={onSubmit} className="space-y-3.5">
      {/* İmaj Adı */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          {t('deployments.imageLabel')} *
        </label>
        <input
          type="text"
          required
          value={image}
          onChange={e => onImageChange(e.target.value)}
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
          onChange={e => onContainerNameChange(e.target.value)}
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
          onChange={e => onPortsChange(e.target.value)}
          placeholder={t('deployments.portsPlaceholder')}
          className="w-full h-[38px] px-3.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-white/[0.05] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs outline-none focus:border-[var(--cloud-400)] transition-colors font-mono"
        />
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
          {t('deployments.portsHelp')}
        </p>
      </div>

      {/* Ortam Değişkenleri */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          {t('deployments.envLabel')}
        </label>
        <textarea
          rows={3}
          value={env}
          onChange={e => onEnvChange(e.target.value)}
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
          onChange={e => onRestartPolicyChange(e.target.value)}
          className="w-full h-[38px] px-3.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--cloud-400)] transition-colors"
        >
          <option value="unless-stopped">{t('deployments.restartPolicyUnlessStopped')}</option>
          <option value="always">{t('deployments.restartPolicyAlways')}</option>
          <option value="on-failure">{t('deployments.restartPolicyOnFailure')}</option>
          <option value="no">{t('deployments.restartPolicyNo')}</option>
        </select>
      </div>
    </form>
  );
};
