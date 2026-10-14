import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { disableUptime } from '../../../api/uptime';
import type { Service } from '../../../types';
import { useI18n } from '../../../i18n';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface DisableUptimeDialogProps {
  isOpen: boolean;
  service: Service | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const DisableUptimeDialog: React.FC<DisableUptimeDialogProps> = ({
  isOpen,
  service,
  onClose,
  onSuccess
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !service) return null;

  const handleDisable = async () => {
    setLoading(true);
    setError(null);
    try {
      await disableUptime(service.id);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (t('uptime.disableError') || 'Uptime takibi kapatılırken bir hata oluştu.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('uptime.disableTitle') || 'Uptime Takibini Kapat'}
      subtitle={service.name}
      icon={<AlertTriangle className="w-5 h-5 text-[var(--status-warn)]" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          <strong className="text-[var(--text-primary)] font-semibold">{service.name}</strong> {t('uptime.disableDesc') || 'servisinin Uptime sağlık kontrolleri durdurulacaktır. Konteyner silinmez, yalnızca keşfedilen servisler havuzuna taşınır.'}
        </p>

        {error && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 text-[var(--status-down)] text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-hairline)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleDisable}
            disabled={loading}
            icon={loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
          >
            {t('uptime.disableConfirmBtn') || 'Takibi Durdur'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
