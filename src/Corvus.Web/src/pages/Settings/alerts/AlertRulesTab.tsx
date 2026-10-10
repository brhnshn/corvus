import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Power, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Cpu, 
  HardDrive 
} from 'lucide-react';
import type { AlertRule, CreateAlertRuleRequest } from '../../../types';
import { api } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { AddAlertRuleModal } from './AddAlertRuleModal';
import { useToast } from '../../../components/ui/Toast';

interface AlertRulesTabProps {
  rules: AlertRule[];
  onRefresh: () => void;
}

export const AlertRulesTab: React.FC<AlertRulesTabProps> = ({ rules, onRefresh }) => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleCreateRule = async (data: CreateAlertRuleRequest) => {
    try {
      await api.createAlertRule(data);
      showToast('Alarm kuralı başarıyla oluşturuldu.', 'success');
      onRefresh();
    } catch {
      showToast('Kural oluşturulurken hata meydana geldi.', 'error');
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      setActionLoadingId(rule.id);
      await api.updateAlertRule(rule.id, { isEnabled: !rule.isEnabled });
      showToast(`Kural ${!rule.isEnabled ? 'aktif edildi' : 'devre dışı bırakıldı'}.`, 'info');
      onRefresh();
    } catch {
      showToast('Kural güncellenemedi.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Bu alarm kuralını silmek istediğinize emin misiniz?')) return;

    try {
      setActionLoadingId(id);
      await api.deleteAlertRule(id);
      showToast('Alarm kuralı silindi.', 'success');
      onRefresh();
    } catch {
      showToast('Kural silinirken hata oluştu.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric.toLowerCase()) {
      case 'cpu':
        return <Cpu className="w-4 h-4 text-indigo-400" />;
      case 'memory':
      case 'ram':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'disk':
        return <HardDrive className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#9ba0b5]" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1b1d2a]/50 border border-white/10">
        <div>
          <h3 className="text-sm font-bold text-[#eceef6]">Metrik Eşik Alarmları</h3>
          <p className="text-xs text-[#9ba0b5] mt-1">
            CPU, Bellek ve Disk kullanım eşikleri aşıldığında aktif bildirim kanallarına proaktif uyarılar gönderin.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span>Kural Ekle</span>
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl p-6">
          <Bell className="w-8 h-8 text-[#9ba0b5] mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-[#eceef6]">Henüz tanımlı alarm kuralı yok</p>
          <p className="text-[11px] text-[#9ba0b5] mt-1 max-w-sm mx-auto">
            Sistem metriklerinizi 7/24 izlemek ve kritik darboğazlarda erken uyarı almak için yeni bir kural ekleyin.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rules.map((rule) => {
            const isLoading = actionLoadingId === rule.id;

            return (
              <div
                key={rule.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#1b1d2a] border border-white/10 gap-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10 shrink-0">
                    {getMetricIcon(rule.metric)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#eceef6] truncate">
                        {rule.name}
                      </span>
                      {rule.isFiring ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          ALARMDA
                        </span>
                      ) : rule.isEnabled ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Normal
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-[#9ba0b5] border border-white/10">
                          Devre Dışı
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9ba0b5]">
                      <span>
                        Koşul: <strong className="text-white font-mono">{rule.metric.toUpperCase()} {rule.operator === 'gt' ? '>' : '<'} %{rule.thresholdValue}</strong>
                      </span>
                      <span>•</span>
                      <span>İhlal Süresi: {rule.durationSeconds} sn</span>
                      <span>•</span>
                      <span>Susturma: {rule.cooldownMinutes} dk</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule)}
                    disabled={isLoading}
                    title={rule.isEnabled ? 'Devre Dışı Bırak' : 'Aktif Et'}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      rule.isEnabled
                        ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        : 'border-white/10 text-[#9ba0b5] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={isLoading}
                    title="Kuralı Sil"
                    className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddAlertRuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateRule}
      />
    </div>
  );
};
