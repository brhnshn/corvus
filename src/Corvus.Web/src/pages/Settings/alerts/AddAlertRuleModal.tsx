import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateAlertRuleRequest } from '../../../types';
import { Button } from '../../../components/ui/Button';

interface AddAlertRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAlertRuleRequest) => Promise<void>;
}

export const AddAlertRuleModal: React.FC<AddAlertRuleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<'cpu' | 'memory' | 'disk'>('cpu');
  const [operator, setOperator] = useState<'gt' | 'lt'>('gt');
  const [thresholdValue, setThresholdValue] = useState<number>(85);
  const [durationSeconds, setDurationSeconds] = useState<number>(60);
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Lütfen kural için bir isim belirleyin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        targetType: 'system',
        targetId: null,
        metric,
        operator,
        thresholdValue,
        durationSeconds,
        cooldownMinutes,
        isEnabled: true,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Kural kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Yeni Alarm Kuralı Ekle"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[#1b1d2a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-base font-bold text-[#eceef6]">Yeni Eşik Alarmı Ekle</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#9ba0b5] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
              Kural Adı
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="örn: Kritik Sunucu CPU Yükü"
              required
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#eceef6] focus:outline-hidden focus:border-white/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
                Metrik Tipi
              </label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#0d0e15] border border-white/10 text-xs text-[#eceef6] focus:outline-hidden focus:border-white/30"
              >
                <option value="cpu">CPU Kullanımı (%)</option>
                <option value="memory">Bellek / RAM (%)</option>
                <option value="disk">Disk Doluluğu (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
                Koşul
              </label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#0d0e15] border border-white/10 text-xs text-[#eceef6] focus:outline-hidden focus:border-white/30"
              >
                <option value="gt">Büyüktür (&gt;)</option>
                <option value="lt">Küçüktür (&lt;)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-[#9ba0b5]">
                Eşik Değeri: %{thresholdValue}
              </label>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={thresholdValue}
              onChange={(e) => setThresholdValue(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
                İhlal Süresi (Saniye)
              </label>
              <input
                type="number"
                min="10"
                step="5"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#eceef6] focus:outline-hidden focus:border-white/30"
              />
              <span className="text-[10px] text-[#9ba0b5] mt-1 block">
                Eşik bu kadar süre aşılırsa alarm verilir.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
                Susturma / Cooldown (Dakika)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#eceef6] focus:outline-hidden focus:border-white/30"
              />
              <span className="text-[10px] text-[#9ba0b5] mt-1 block">
                Aynı alarmın tekrarı arasındaki süre.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#9ba0b5] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              İptal
            </button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kuralı Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
