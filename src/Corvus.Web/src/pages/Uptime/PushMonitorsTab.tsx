import React, { useState } from 'react';
import { Radio, Plus, Trash2, Copy, Check, Clock, RefreshCw } from 'lucide-react';
import { api, type PushMonitor } from '../../api/client';
import { useI18n } from '../../i18n';
import { AddSnitchModal } from './AddSnitchModal';

interface PushMonitorsTabProps {
  snitches: PushMonitor[];
  loading: boolean;
  onRefresh: () => void;
}

export const PushMonitorsTab: React.FC<PushMonitorsTabProps> = ({
  snitches,
  loading,
  onRefresh
}) => {
  const { t } = useI18n();
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleDeleteSnitch = async (id: string, name: string) => {
    if (!confirm(t('uptime.deletePushConfirm', { name }))) return;
    try {
      await api.deletePushMonitor(id);
      onRefresh();
    } catch (err: unknown) {
      alert(`Hata: ${err instanceof Error ? err.message : 'Silinemedi.'}`);
    }
  };

  const handleCopyCurl = (token: string) => {
    const origin = window.location.origin;
    const cmd = `curl -fsS -m 10 --retry 3 ${origin}/api/push/${token}`;
    navigator.clipboard.writeText(cmd);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#eceef6]">{t('uptime.pushSectionTitle')}</h2>
          <p className="text-xs text-[#9ba0b5] mt-0.5">{t('uptime.pushSectionDesc')}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-[#eceef6] transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('uptime.addPushMonitor')}
        </button>
      </div>

      {loading && snitches.length === 0 && (
        <div className="flex items-center justify-center h-48 text-[#9ba0b5]">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#d5d5dc]" />
          {t('common.loading')}
        </div>
      )}

      {!loading && snitches.length === 0 && (
        <div className="p-10 rounded-2xl surface border border-white/10 text-center max-w-md mx-auto space-y-3">
          <Radio className="w-10 h-10 text-[#9ba0b5]/40 mx-auto" />
          <h3 className="text-base font-semibold text-[#eceef6]">{t('uptime.noPushMonitors')}</h3>
          <p className="text-xs text-[#9ba0b5]">{t('uptime.noPushMonitorsDesc')}</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-[#eceef6] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('uptime.createPushMonitor')}
          </button>
        </div>
      )}

      {snitches.length > 0 && (
        <div className="grid gap-3">
          {snitches.map((snitch) => {
            const isHealthy = snitch.status === 'healthy';
            const isDown = snitch.status === 'down';

            return (
              <div
                key={snitch.id}
                className="p-5 rounded-2xl surface border border-white/10 hover:border-white/20 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-[#d5d5dc] shrink-0" />
                      <h3 className="font-semibold text-[#eceef6] text-sm">{snitch.name}</h3>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                          isHealthy
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isDown
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-white/[0.06] text-[#9ba0b5] border border-white/10'
                        }`}
                      >
                        {isHealthy ? t('uptime.signalReceiving') : isDown ? t('uptime.signalTimeout') : t('uptime.signalWaiting')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#9ba0b5] mt-1 font-mono">
                      <span>{t('uptime.expectedPeriodLabel', { interval: snitch.expectedIntervalMinutes, grace: snitch.gracePeriodMinutes })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteSnitch(snitch.id, snitch.name)}
                      className="p-1.5 rounded-xl text-[#9ba0b5] hover:text-[#f87171] hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Son Görülme & Sinyal Komutu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-[#9ba0b5]">
                    <Clock className="w-4 h-4 text-[#9ba0b5] shrink-0" />
                    <span>{t('uptime.lastSignal')}</span>
                    <span className="text-[#eceef6] font-mono">
                      {snitch.lastSeenAt ? new Date(snitch.lastSeenAt).toLocaleString() : t('uptime.noSignalYet')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5">
                    <span className="font-mono text-[11px] text-[#9ba0b5] truncate max-w-[200px] sm:max-w-xs">
                      curl .../api/push/{snitch.token}
                    </span>
                    <button
                      onClick={() => handleCopyCurl(snitch.token)}
                      className="p-1 text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer"
                      title={t('uptime.copyCurlTooltip')}
                    >
                      {copiedToken === snitch.token ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddSnitchModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
