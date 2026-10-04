import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';

interface AddSnitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSnitchModal: React.FC<AddSnitchModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useI18n();
  const [snitchName, setSnitchName] = useState('');
  const [snitchInterval, setSnitchInterval] = useState(1440);
  const [snitchGrace, setSnitchGrace] = useState(60);
  const [savingSnitch, setSavingSnitch] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snitchName.trim()) return;

    setSavingSnitch(true);
    try {
      await api.createPushMonitor({
        name: snitchName.trim(),
        expectedIntervalMinutes: snitchInterval,
        gracePeriodMinutes: snitchGrace
      });
      setSnitchName('');
      setSnitchInterval(1440);
      setSnitchGrace(60);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      alert(`Hata: ${err instanceof Error ? err.message : 'Snitch oluşturulamadı.'}`);
    } finally {
      setSavingSnitch(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto select-none">
      <div className="sheet-glass border border-white/10 rounded-[28px] p-5 sm:p-6 w-full max-w-md max-h-[92vh] overflow-y-auto space-y-4 shadow-[0_25px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.15)] my-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-bold text-[#eceef6] text-base">{t('uptime.newPushModalTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9ba0b5] hover:text-[#eceef6] p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
          <div>
            <label className="block text-xs font-medium text-[#9ba0b5] mb-1.5">{t('uptime.monitorName')}</label>
            <input
              type="text"
              required
              placeholder={t('uptime.monitorNamePlaceholder')}
              value={snitchName}
              onChange={(e) => setSnitchName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-[#eceef6] placeholder:text-[#9ba0b5]/50 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ba0b5] mb-1.5">{t('uptime.expectedInterval')}</label>
            <input
              type="number"
              required
              min={1}
              placeholder="1440"
              value={snitchInterval}
              onChange={(e) => setSnitchInterval(Number(e.target.value))}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-[#eceef6] placeholder:text-[#9ba0b5]/50 focus:outline-none focus:border-white/20 transition-colors"
            />
            <span className="text-[10px] text-[#9ba0b5] block mt-1">{t('uptime.intervalHelp')}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ba0b5] mb-1.5">{t('uptime.gracePeriod')}</label>
            <input
              type="number"
              required
              min={0}
              placeholder="60"
              value={snitchGrace}
              onChange={(e) => setSnitchGrace(Number(e.target.value))}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-[#eceef6] placeholder:text-[#9ba0b5]/50 focus:outline-none focus:border-white/20 transition-colors"
            />
            <span className="text-[10px] text-[#9ba0b5] block mt-1">{t('uptime.graceHelp')}</span>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={savingSnitch}
              className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-[#eceef6] disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
            >
              {savingSnitch ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
