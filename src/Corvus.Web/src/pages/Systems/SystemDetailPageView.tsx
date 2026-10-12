import React, { useEffect, useState } from 'react';
import { ArrowLeft, Cpu, HardDrive, Boxes, Activity, Play, Square, RotateCw, RefreshCw, Shield } from 'lucide-react';
import { api } from '../../api';
import type { SystemDetailDto, SystemDownsampledPoint, TelemetryTimeRange } from '../../types';
import { formatBytes, getSystemStatusTheme } from '../../utils/systemsUtils';
import { useI18n } from '../../i18n';

interface SystemDetailPageViewProps {
  systemId: string;
  onBack: () => void;
  isAdmin: boolean;
}

export const SystemDetailPageView: React.FC<SystemDetailPageViewProps> = ({
  systemId,
  onBack,
  isAdmin
}) => {
  const { t } = useI18n();
  const [detail, setDetail] = useState<SystemDetailDto | null>(null);
  const [metrics, setMetrics] = useState<SystemDownsampledPoint[]>([]);
  const [range, setRange] = useState<TelemetryTimeRange>('live');
  const [activeTab, setActiveTab] = useState<'core' | 'network' | 'storage' | 'containers' | 'security'>('core');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [d, m] = await Promise.all([
        api.getSystemById(systemId),
        api.getMetrics(systemId, range)
      ]);
      setDetail(d);
      setMetrics(Array.isArray(m) ? m : []);
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
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-xs font-mono text-[#9ba0b5]">{t('systems.detail.loadingTelemetry')}</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-sm text-red-400">{t('systems.detail.notFound')}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white hover:bg-white/20 cursor-pointer"
        >
          {t('systems.detail.backToList')}
        </button>
      </div>
    );
  }

  const theme = getSystemStatusTheme(detail.system.status as any);

  const handleContainerAction = async (cid: string, action: 'start' | 'stop' | 'restart') => {
    try {
      setActionMsg(`Konteyner ${action} komutu gönderildi...`);
      const res = await api.sendContainerAction(systemId, cid, action);
      setActionMsg(res.message || 'İşlem tamamlandı.');
      loadData();
    } catch (err: any) {
      setActionMsg(`Hata: ${err?.message || 'İşlem başarısız'}`);
    }
  };

  const lp = detail.latestPoint;
  const cpuPercentVal = typeof lp?.cpuPercent === 'number' ? lp.cpuPercent.toFixed(1) : '0.0';
  const load1 = typeof lp?.loadAvg1m === 'number' ? lp.loadAvg1m.toFixed(2) : '-';
  const load5 = typeof lp?.loadAvg5m === 'number' ? lp.loadAvg5m.toFixed(2) : '-';
  const load15 = typeof lp?.loadAvg15m === 'number' ? lp.loadAvg15m.toFixed(2) : '-';

  const ramUsed = lp?.ramUsedBytes ?? 0;
  const ramTotal = lp?.ramTotalBytes ?? 1;
  const ramPct = ramTotal > 0 ? Math.min(100, Math.round((ramUsed / ramTotal) * 100)) : 0;

  const diskUsed = lp?.diskUsedBytes ?? 0;
  const diskTotal = lp?.diskTotalBytes ?? 1;
  const diskPct = diskTotal > 0 ? Math.min(100, Math.round((diskUsed / diskTotal) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-fade-in">
      {/* Üst Navigasyon: Geri Dön Butonu & Sistem Başlık Rozetleri */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer"
            title={t('systems.detail.backToFleet')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${theme.dotColor}`} />
              <h2 className="text-xl font-bold text-[#eceef6]">
                {detail.system.name}
              </h2>
              {detail.system.id === 'local-host' && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-semibold text-indigo-300">
                  {t('systems.detail.hostNode')}
                </span>
              )}
            </div>

            {/* Sistem Meta Bilgileri */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-mono text-[#9ba0b5]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{detail.system.status === 'online' ? t('common.online') : detail.system.status}</span>
              </span>
              <span>·</span>
              <span>{detail.system.hostname || 'host'}</span>
              <span>·</span>
              <span>{detail.system.ipAddress || '127.0.0.1'}</span>
              <span>·</span>
              <span className="truncate max-w-[200px]">{detail.system.osInfo || 'Linux'}</span>
              {lp && (
                <>
                  <span>·</span>
                  <span>{lp.cpuCores} Core</span>
                  <span>·</span>
                  <span>{formatBytes(lp.ramTotalBytes)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sağ: Zaman Aralığı Seçici */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/5 font-mono text-xs">
            {(['live', '1h', '24h', '7d', '30d'] as TelemetryTimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  range === r
                    ? 'bg-white/10 text-white font-semibold shadow-xs'
                    : 'text-[#9ba0b5] hover:text-[#eceef6]'
                }`}
              >
                {r === 'live' ? t('systems.timeRanges.live') : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alt Sekmeler: Çekirdek | Ağ | Depolama Alanı | Konteynerler | Güvenlik */}
      <div className="flex items-center gap-1 border-b border-white/10 pb-2 overflow-x-auto text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('core')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'core'
              ? 'bg-white/10 text-white font-semibold'
              : 'text-[#9ba0b5] hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>{t('systems.detail.tabs.core')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'network'
              ? 'bg-white/10 text-white font-semibold'
              : 'text-[#9ba0b5] hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>{t('systems.detail.tabs.network')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'storage'
              ? 'bg-white/10 text-white font-semibold'
              : 'text-[#9ba0b5] hover:text-white'
          }`}
        >
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span>{t('systems.detail.tabs.storage')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('containers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'containers'
              ? 'bg-white/10 text-white font-semibold'
              : 'text-[#9ba0b5] hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4 text-sky-400" />
          <span>{t('systems.detail.tabs.containers')} ({detail.containers.length})</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-[#9ba0b5] hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span>{t('systems.detail.tabs.security')}</span>
          </button>
        )}
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-[#eceef6] font-mono flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-[#9ba0b5] hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* SEKME 1: ÇEKİRDEK (CPU & RAM KARTLARI VE GRAFİKLERİ) */}
      {activeTab === 'core' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU Kullanımı */}
            <div className="p-5 rounded-2xl bg-[#161824]/60 border border-white/10 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#eceef6]">{t('systems.detail.cpuUsage')}</h3>
                  <p className="text-[11px] text-[#9ba0b5]">{t('systems.detail.cpuSubtitle')}</p>
                </div>
                <div className="text-lg font-bold font-mono text-[#eceef6]">
                  %{cpuPercentVal}
                </div>
              </div>

              {/* CPU Çizelgesi */}
              <div className="h-40 flex items-end gap-1 pt-6">
                {metrics.length > 0 ? (
                  metrics.map((m, idx) => {
                    const mCpu = typeof m?.cpuPercent === 'number' ? m.cpuPercent : 0;
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-indigo-500/80 hover:bg-indigo-400 rounded-t transition-all group relative"
                        style={{ height: `${Math.max(4, Math.min(100, mCpu))}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block p-1.5 rounded-lg bg-black/90 border border-white/10 text-[10px] font-mono text-white whitespace-nowrap z-20 shadow-xl">
                          %{mCpu.toFixed(1)} · {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#9ba0b5] font-mono">
                    {t('systems.detail.loadingTelemetry')}
                  </div>
                )}
              </div>
            </div>

            {/* Yük Ortalaması (Load Avg) */}
            <div className="p-5 rounded-2xl bg-[#161824]/60 border border-white/10 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#eceef6]">{t('systems.detail.loadAvg')}</h3>
                  <p className="text-[11px] text-[#9ba0b5]">{t('systems.detail.loadAvgSubtitle')}</p>
                </div>
                <div className="text-sm font-bold font-mono text-[#eceef6]">
                  {load1 !== '-' ? `${load1} · ${load5} · ${load15}` : '-'}
                </div>
              </div>

              <div className="h-40 flex items-center justify-center border border-white/5 rounded-xl bg-white/[0.01]">
                <div className="text-center font-mono text-xs text-[#9ba0b5] space-y-2">
                  <div className="flex items-center justify-center gap-4 text-[11px]">
                    <span className="text-pink-400">● {t('systems.detail.load1m')} ({load1})</span>
                    <span className="text-indigo-400">● {t('systems.detail.load5m')} ({load5})</span>
                    <span className="text-amber-400">● {t('systems.detail.load15m')} ({load15})</span>
                  </div>
                  <p className="text-[10px] text-white/40">{t('systems.detail.loadThreads')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bellek (RAM) Kullanımı */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#161824]/60 border border-white/10 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#eceef6]">{t('systems.detail.ramUsage')}</h3>
                  <p className="text-[11px] text-[#9ba0b5]">{t('systems.detail.ramSubtitle')}</p>
                </div>
                <div className="text-sm font-bold font-mono text-[#eceef6]">
                  {formatBytes(ramUsed)} / {formatBytes(ramTotal)}
                </div>
              </div>

              <div className="h-32 flex items-end gap-1 pt-6">
                {metrics.length > 0 ? (
                  metrics.map((m, idx) => {
                    const total = ramTotal > 0 ? ramTotal : 1;
                    const mUsed = typeof m?.ramUsedBytes === 'number' ? m.ramUsedBytes : 0;
                    const pct = Math.min(100, Math.round((mUsed / total) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-sky-500/80 hover:bg-sky-400 rounded-t transition-all group relative"
                        style={{ height: `${Math.max(4, pct)}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block p-1.5 rounded-lg bg-black/90 border border-white/10 text-[10px] font-mono text-white whitespace-nowrap z-20 shadow-xl">
                          %{pct} · {formatBytes(mUsed)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#9ba0b5] font-mono">
                    {t('systems.detail.loadingTelemetry')}
                  </div>
                )}
              </div>
            </div>

            {/* Takas (Swap) & Ek Bellek */}
            <div className="p-5 rounded-2xl bg-[#161824]/60 border border-white/10 space-y-3 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#eceef6]">{t('systems.detail.swapUsage')}</h3>
                <p className="text-[11px] text-[#9ba0b5]">{t('systems.detail.swapSubtitle')}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#9ba0b5]">{t('systems.detail.activeRam')}</span>
                  <span className="text-[#eceef6]">%{ramPct}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all"
                    style={{ width: `${ramPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#9ba0b5]">
                  <span>{t('systems.detail.used')}: {formatBytes(ramUsed)}</span>
                  <span>{t('systems.detail.total')}: {formatBytes(ramTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 2: AĞ (NETWORK I/O) */}
      {activeTab === 'network' && (
        <div className="p-5 rounded-2xl bg-[#161824]/60 border border-white/10 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#eceef6]">{t('systems.detail.networkTraffic')}</h3>
              <p className="text-[11px] text-[#9ba0b5]">{t('systems.detail.networkSubtitle')}</p>
            </div>
            <div className="text-xs font-mono text-emerald-400">
              {formatBytes(lp?.netRxBytesSec ?? 0)}/s {t('systems.detail.rxLabel')}
            </div>
          </div>

          <div className="h-48 flex items-end gap-1 pt-6">
            {metrics.length > 0 ? (
              metrics.map((m, idx) => {
                const rx = typeof m?.rxBytesPerSec === 'number' ? m.rxBytesPerSec : 0;
                const tx = typeof m?.txBytesPerSec === 'number' ? m.txBytesPerSec : 0;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all group relative"
                    style={{ height: `${Math.max(4, Math.min(100, (rx / 102400) * 100))}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block p-1.5 rounded-lg bg-black/90 border border-white/10 text-[10px] font-mono text-white whitespace-nowrap z-20 shadow-xl">
                      Rx: {formatBytes(rx)}/s · Tx: {formatBytes(tx)}/s
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#9ba0b5] font-mono">
                {t('systems.detail.loadingTelemetry')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEKME 3: DEPOLAMA (STORAGE & DISK) */}
      {activeTab === 'storage' && (
        <div className="p-5 rounded-2xl bg-[#161824]/60 border border-white/10 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#eceef6]">{t('systems.detail.storageTitle')}</h3>
              <p className="text-[11px] text-[#9ba0b5]">{t('systems.detail.storageSubtitle')}</p>
            </div>
            <div className="text-sm font-mono font-bold text-[#eceef6]">
              {formatBytes(diskUsed)} / {formatBytes(diskTotal)}
            </div>
          </div>

          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-500"
              style={{ width: `${diskPct}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[#9ba0b5] block text-[10px]">{t('systems.detail.usedSpace')}</span>
              <span className="text-[#eceef6] font-bold text-sm">{formatBytes(diskUsed)}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[#9ba0b5] block text-[10px]">{t('systems.detail.freeSpace')}</span>
              <span className="text-[#34d399] font-bold text-sm">
                {formatBytes(Math.max(0, diskTotal - diskUsed))}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[#9ba0b5] block text-[10px]">{t('systems.detail.totalCapacity')}</span>
              <span className="text-[#eceef6] font-bold text-sm">{formatBytes(diskTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 4: KONTEYNERLER (DOCKER / SERVICES) */}
      {activeTab === 'containers' && (
        <div className="space-y-3">
          {detail.containers.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#9ba0b5] rounded-2xl bg-white/[0.02] border border-white/5">
              {t('systems.detail.noContainers')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {detail.containers.map((c) => (
                <div
                  key={c.containerId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-[#161824]/60 border border-white/10 hover:border-white/20 transition-all gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          c.state === 'running' ? 'bg-[#34d399]' : 'bg-[#f87171]'
                        }`}
                      />
                      <span className="text-xs font-semibold text-[#eceef6]">{c.name}</span>
                      <span className="text-[10px] text-[#9ba0b5] font-mono truncate max-w-[220px]">
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
                            type="button"
                            onClick={() => handleContainerAction(c.containerId, 'restart')}
                            title="Yeniden Başlat"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleContainerAction(c.containerId, 'stop')}
                            title="Durdur"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#f87171] transition-colors cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleContainerAction(c.containerId, 'start')}
                          title="Başlat"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#34d399] transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEKME 5: AYARLAR & GÜVENLİK */}
      {activeTab === 'security' && (
        <div className="space-y-4 max-w-2xl">
          {detail.system.id === 'local-host' ? (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 space-y-2">
              <h4 className="text-xs font-semibold text-indigo-300">{t('systems.detail.hostNode')}</h4>
              <p className="text-xs text-[#9ba0b5] leading-relaxed">
                {t('systems.detail.hostNodeDesc')}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <h4 className="text-xs font-semibold text-[#eceef6]">{t('systems.detail.tokenTitle')}</h4>
              <p className="text-xs text-[#9ba0b5]">
                {t('systems.detail.tokenDesc')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
