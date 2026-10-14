import React, { useState } from 'react';
import { api } from '../api/client';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface RegistrationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

export const RegistrationPromptModal: React.FC<RegistrationPromptModalProps> = ({
  isOpen,
  onClose,
  onDisabled
}) => {
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const handleDisableRegistration = async () => {
    setLoading(true);
    try {
      await api.toggleRegistration(false);
      onDisabled();
      onClose();
    } catch (err: unknown) {
      alert(`${t('common.error')}: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('regModal.title')}
      subtitle={t('regModal.subtitle')}
      icon={<ShieldAlert className="w-5 h-5 text-[var(--status-warn)]" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {t('regModal.desc')}
        </p>

        <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[var(--status-up)] shrink-0 mt-0.5" />
          <span>{t('regModal.hint')}</span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-hairline)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('regModal.keepOpenBtn')}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleDisableRegistration}
            disabled={loading}
            icon={loading ? <span className="spinner" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          >
            {t('regModal.disableBtn')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
