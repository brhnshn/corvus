import React, { useEffect, useState } from 'react';
import { X, Cpu, HardDrive, Boxes, Play, Square, RotateCw } from 'lucide-react';
import { api } from '../../api';
import type { SystemDetailDto, SystemDownsampledPoint, TelemetryTimeRange } from '../../types';
import { formatBytes, getSystemStatusTheme } from '../../utils/systemsUtils';
import { useI18n } from '../../i18n';

interface SystemDetailModalProps {
  systemId: string;
  onClose: () => void;
  onSystemDeleted: () => void;
  isAdmin: boolean;
}

export const SystemDetailModal: React.FC<SystemDetailModalProps> = ({
  systemId,
  onClose,
  onSystemDeleted,
  isAdmin
}) => {
  const { t } = useI18n();

  const [detail, setDetail] = useState<SystemDetailDto | null>(null);
  const [metrics, setMetrics] = useState<SystemDownsampledPoint[]>([]);
  const [range, setRange] = useState<TelemetryTimeRange>('live');
  const [activeTab, setActiveTab] = useState<'telemetry' | 'containers' | 'security'>('telemetry');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [d, m] = await Promise.all([
        api.getSystemById(systemId),
        api.getMetrics(systemId, range)
      ]);
      setDetail(d);
      setMetrics(m);
    } catch (err) {
      console.error('Sistem detayları yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, range === 'live' ? 3000 : 15000);
    return () => clearInterval(interval);
  }, [systemId, range]);

  if (!detail && loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="p-8 rounded-3xl bg-[#1b1d2a] text-[#9ba0b5] text-xs font-mono">
          Yükleniyor...
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const theme = getSystemStatusTheme(detail.system.status as any);

  const handleContainerAction = async (cid: string, action: 'start' | 'stop' | 'restart') => {
    try {
      setActionMsg(`Konteyner ${action} komutu gönderildi...`);
      const res = await api.sendContainerAction(systemId, cid, action);
      setActionMsg(res.message || 'İşlem tamamlandı.');
      loadData();
    } catch (err: any) {
      setActionMsg(`Hata: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('systems.cockpit.deleteSystemConfirm'))) return;
    try {
      await api.deleteSystem(systemId);
      onSystemDeleted();
      onClose();
    } catch (err) {
      alert('Sistem silinemedi.');
    }
  };

  const handleRevokeToken = async () => {
    if (!window.confirm(t('systems.cockpit.rotateTokenConfirm'))) return;
    try {
      await api.revokeToken(systemId);
      alert('Token iptal edildi.');
      loadData();
    } catch (err) {
      alert('Token iptal edilemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
      <div className="w-full max-w-4xl rounded-3xl bg-[#1b1d2a] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${theme.dotColor}`} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#eceef6]">
                  {detail.system.name}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-[#9ba0b5] font-mono">
                  {detail.system.hostname || 'host'}
                </span>
              </div>
              <p className="text-xs text-[#9ba0b5] font-mono mt-0.5">
                {detail.system.ipAddress || 'IP atanmadı'} · {detail.system.osInfo || 'Linux'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9ba0b5] hover:text-[#eceef6] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sekmeler & Zaman Seçici */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-5 py-2.5 bg-white/[0.02] border-b border-white/5 gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'telemetry'
                  ? 'bg-white/10 text-[#eceef6]'
                  : 'text-[#9ba0b5] hover:text-[#eceef6]'
              }`}
            >
              {t('systems.cockpit.tabs.telemetry')}
            </button>
            <button
              onClick={() => setActiveTab('containers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'containers'
                  ? 'bg-white/10 text-[#eceef6]'
                  : 'text-[#9ba0b5] hover:text-[#eceef6]'
              }`}
            >
              {t('systems.cockpit.tabs.containers')} ({detail.containers.length})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'security'
                  ? 'bg-white/10 text-[#eceef6]'
                  : 'text-[#9ba0b5] hover:text-[#eceef6]'
              }`}
            >
              {t('systems.cockpit.tabs.security')}
            </button>
          </div>

          {activeTab === 'telemetry' && (
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5">
              {(['live', '1h', '24h', '7d', '30d'] as TelemetryTimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                    range === r ? 'bg-white/15 text-[#eceef6]' : 'text-[#9ba0b5] hover:text-[#eceef6]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Gövde */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {actionMsg && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-[#eceef6] font-mono flex items-center justify-between">
              <span>{actionMsg}</span>
              <button onClick={() => setActionMsg(null)} className="text-[#9ba0b5] hover:text-white">✕</button>
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              {/* Canlı Metrik Kartları */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between text-xs text-[#9ba0b5] mb-2">
                    <span>CPU Yükü</span>
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#eceef6]">
                    %{detail.latestPoint ? detail.latestPoint.cpuPercent.toFixed(1) : '0.0'}
                  </div>
                  <div className="text-[11px] text-[#9ba0b5] font-mono mt-1">
                    {detail.latestPoint?.cpuCores || 1} Çekirdek
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between text-xs text-[#9ba0b5] mb-2">
                    <span>RAM Kullanımı</span>
                    <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#eceef6]">
                    {formatBytes(detail.latestPoint?.ramUsedBytes)}
                  </div>
                  <div className="text-[11px] text-[#9ba0b5] font-mono mt-1">
                    / {formatBytes(detail.latestPoint?.ramTotalBytes)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between text-xs text-[#9ba0b5] mb-2">
                    <span>Disk Kullanımı</span>
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#eceef6]">
                    {formatBytes(detail.latestPoint?.diskUsedBytes)}
                  </div>
                  <div className="text-[11px] text-[#9ba0b5] font-mono mt-1">
                    / {formatBytes(detail.latestPoint?.diskTotalBytes)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between text-xs text-[#9ba0b5] mb-2">
                    <span>Linux Yük Ort.</span>
                    <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-[#eceef6]">
                    {detail.latestPoint
                      ? `${detail.latestPoint.loadAvg1m.toFixed(2)} / ${detail.latestPoint.loadAvg5m.toFixed(2)}`
                      : '0.0 / 0.0'}
                  </div>
                  <div className="text-[11px] text-[#9ba0b5] font-mono mt-1">
                    1m / 5m yük
                  </div>
                </div>
              </div>

              {/* Sparkline / Zaman Çizelgesi */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="text-xs font-semibold text-[#eceef6] mb-3">
                  {t('systems.cockpit.cpuSparklineTitle')} ({metrics.length} Nokta)
                </div>

                {metrics.length > 0 ? (
                  <div className="h-32 flex items-end gap-1 pt-4">
                    {metrics.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-indigo-500/80 hover:bg-indigo-400 rounded-t transition-all group relative"
                        style={{ height: `${Math.max(4, Math.min(100, m.cpuPercent))}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block p-1.5 rounded-lg bg-black/90 border border-white/10 text-[10px] font-mono text-white whitespace-nowrap z-10">
                          %{m.cpuPercent.toFixed(1)} · {new Date(m.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-[#9ba0b5] font-mono">
                    Veri noktası bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'containers' && (
            <div className="space-y-3">
              {detail.containers.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#9ba0b5]">
                  {t('systems.cockpit.noContainers')}
                </div>
              ) : (
                detail.containers.map(c => (
                  <div
                    key={c.containerId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            c.state === 'running' ? 'bg-[#34d399]' : 'bg-[#f87171]'
                          }`}
                        />
                        <span className="text-xs font-semibold text-[#eceef6]">{c.name}</span>
                        <span className="text-[10px] text-[#9ba0b5] font-mono truncate max-w-[200px]">
                          {c.image}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9ba0b5] mt-1 font-mono">{c.status}</p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {c.state === 'running' ? (
                          <>
                            <button
                              onClick={() => handleContainerAction(c.containerId, 'restart')}
                              title={t('systems.cockpit.restartContainer')}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9ba0b5] hover:text-[#eceef6]"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleContainerAction(c.containerId, 'stop')}
                              title={t('systems.cockpit.stopContainer')}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#f87171]"
                            >
                              <Square className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleContainerAction(c.containerId, 'start')}
                            title={t('systems.cockpit.startContainer')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#34d399]"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              {systemId === 'local-host' ? (
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 space-y-2">
                  <h4 className="text-xs font-semibold text-indigo-300">Yerel Sunucu (Host Node)</h4>
                  <p className="text-xs text-[#9ba0b5] leading-relaxed">
                    Bu sistem Corvus Hub'ın doğrudan üzerinde çalıştığı ana sunucudur. Doğrudan yerel işletim sistemi ve Docker daemon üzerinden yönetildiği için tünel veya uzaktan erişim belirteci gerektirmez ve silinemez.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <h4 className="text-xs font-semibold text-[#eceef6]">Erişim Belirteci</h4>
                    <p className="text-xs text-[#9ba0b5]">
                      Ajan bu sisteme Hub tarafından üretilen kriptografik anahtar ile bağlıdır.
                    </p>
                    {isAdmin && (
                      <button
                        onClick={handleRevokeToken}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-colors"
                      >
                        {t('systems.cockpit.rotateToken')}
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="p-4 rounded-2xl bg-[#f87171]/10 border border-[#f87171]/20 space-y-2">
                      <h4 className="text-xs font-semibold text-[#f87171]">Tehlikeli Bölge</h4>
                      <p className="text-xs text-[#9ba0b5]">
                        Bu sistemi Corvus panelinden kaldırdığınızda tünel kapatılır ve tüm geçmiş metrikler silinir.
                      </p>
                      <button
                        onClick={handleDelete}
                        className="px-3.5 py-2 rounded-xl bg-[#f87171] hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                      >
                        {t('systems.cockpit.deleteSystem')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
