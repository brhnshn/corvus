import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import { useI18n } from '../../i18n';
import { api } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface AddSnitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSnitchModal: React.FC<AddSnitchModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useI18n();
  const [snitchName, setSnitchName] = useState('');
  const [snitchInterval, setSnitchInterval] = useState<number>(1440);
  const [snitchGrace, setSnitchGrace] = useState<number>(60);
  const [savingSnitch, setSavingSnitch] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snitchName.trim()) return;

    setSavingSnitch(true);
    try {
      await api.createPushMonitor({
        name: snitchName.trim(),
        expectedIntervalMinutes: snitchInterval,
        gracePeriodMinutes: snitchGrace,
      });
      setSnitchName('');
      setSnitchInterval(1440);
      setSnitchGrace(60);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      alert(`${t('uptime.pushCreateError')}${err instanceof Error ? err.message : ''}`);
    } finally {
      setSavingSnitch(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('uptime.newPushModalTitle')}
      subtitle={t('uptime.newPushModalSubtitle')}
      icon={<Radio className="w-5 h-5 text-[var(--text-primary)]" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t('uptime.monitorName')}</label>
          <input
            type="text"
            required
            placeholder={t('uptime.monitorNamePlaceholder')}
            value={snitchName}
            onChange={(e) => setSnitchName(e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t('uptime.expectedInterval')}</label>
          <input
            type="number"
            required
            min={1}
            placeholder="1440"
            value={snitchInterval}
            onChange={(e) => setSnitchInterval(Number(e.target.value))}
            className="input w-full"
          />
          <span className="text-[10px] text-[var(--text-muted)] block mt-1">{t('uptime.intervalHelp')}</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t('uptime.gracePeriod')}</label>
          <input
            type="number"
            required
            min={0}
            placeholder="60"
            value={snitchGrace}
            onChange={(e) => setSnitchGrace(Number(e.target.value))}
            className="input w-full"
          />
          <span className="text-[10px] text-[var(--text-muted)] block mt-1">{t('uptime.graceHelp')}</span>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-hairline)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={savingSnitch}
          >
            {savingSnitch ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
