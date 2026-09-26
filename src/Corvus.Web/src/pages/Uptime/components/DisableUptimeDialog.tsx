import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { disableUptime } from '../../../api/uptime';
import type { Service } from '../../../types';
import { useI18n } from '../../../i18n';

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
      setError(err instanceof Error ? err.message : 'Uptime takibi kapatılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#14161f] border border-[#2a2e3f] shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#2a2e3f]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-[#e5e7eb]">Uptime Takibini Kapat</h3>
          <p className="text-xs text-[#9ca3af] mt-1 leading-relaxed">
            <strong className="text-white">{service.name}</strong> servisinin Uptime sağlık kontrolleri durdurulacaktır. Konteyner silinmez, yalnızca keşfedilen servisler havuzuna taşınır.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1a1d29] transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleDisable}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Takibi Durdur</span>
          </button>
        </div>
      </div>
    </div>
  );
};
