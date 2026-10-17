import React from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface DeleteConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export const DeleteConfirmSheet: React.FC<DeleteConfirmSheetProps> = ({
  isOpen,
  onClose,
  serviceName,
  onConfirm,
  loading = false,
}) => {
  const { t } = useI18n();

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-[#f87171]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{t('services.deleteServiceModalTitle')}</span>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <p className="text-sm text-[#eceef6] leading-relaxed">
          {t('services.deleteConfirmPrompt', { name: serviceName })}
        </p>

        <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-[#9ba0b5] space-y-1 font-mono">
          <p className="text-[#eceef6]">{t('services.deleteWarningNotice')}</p>
          <p>{t('services.deleteWarningSub')}</p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? t('services.deleting') : t('services.deleteConfirmBtn')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
