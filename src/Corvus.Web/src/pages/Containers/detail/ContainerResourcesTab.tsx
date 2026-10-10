import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n';
import { 
  Cpu, 
  HardDrive, 
  RotateCcw, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowDownUp, 
  Layers 
} from 'lucide-react';
import { containersApi } from '../../../api/containers';
import { formatBytes } from '../../../utils/format';
import type { 
  DockerContainerInspectInfo, 
  DockerContainerUpdateRequest, 
  ContainerStats 
} from '../../../types';
import { getInspectHostConfig, getInspectState } from './inspectHelpers';

interface ContainerResourcesTabProps {
  inspect: DockerContainerInspectInfo;
  isAdmin: boolean;
  initialStats?: ContainerStats;
  onUpdated: () => void;
}

export const ContainerResourcesTab: React.FC<ContainerResourcesTabProps> = ({
  inspect,
  isAdmin,
  initialStats,
  onUpdated
}) => {
  const { t } = useI18n();

  const hostConfig = getInspectHostConfig(inspect);
  const state = getInspectState(inspect);

  // Canlı Stats State'i & Polling
  const [stats, setStats] = useState<ContainerStats | null>(initialStats || null);
  const isMountedRef = useRef(true);

  const isRunning = state.running === true;

  // Başlangıç değerleri (Inspect'ten)
  const initialNanoCpus = hostConfig.nanoCpus || 0;
  const initialCores = initialNanoCpus > 0 ? (initialNanoCpus / 1_000_000_000).toString() : '0';

  const initialMemoryBytes = hostConfig.memory || 0;
  const initialMemoryMb = initialMemoryBytes > 0 ? Math.round(initialMemoryBytes / (1024 * 1024)).toString() : '0';

  const initialRestartPolicy = hostConfig.restartPolicy?.name || 'no';

  const [cpuCores, setCpuCores] = useState<string>(initialCores);
  const [memoryMb, setMemoryMb] = useState<string>(initialMemoryMb);
  const [restartPolicy, setRestartPolicy] = useState<string>(initialRestartPolicy);

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Canlı telemetri verilerini çek
  useEffect(() => {
    isMountedRef.current = true;

    // Eğer konteyner çalışıyorsa 2.5 saniyede bir stats güncelle
    if (!isRunning || !inspect.id) return;

    let timer: ReturnType<typeof setInterval>;

    const fetchLiveStats = async () => {
      try {
        const live = await containersApi.getContainerStats(inspect.id);
        if (isMountedRef.current && live) {
          setStats(live);
        }
      } catch (err) {
        // Sessiz hata (arka plan telemetrisi)
      }
    };

    // İlk stats boşsa hemen çek
    if (!stats) {
      fetchLiveStats();
    }

    timer = setInterval(fetchLiveStats, 2500);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [inspect.id, isRunning]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const parsedCores = parseFloat(cpuCores);
      const nanoCpus = !isNaN(parsedCores) && parsedCores > 0 ? Math.round(parsedCores * 1_000_000_000) : 0;

      const parsedMemory = parseInt(memoryMb, 10);
      const memoryBytes = !isNaN(parsedMemory) && parsedMemory > 0 ? parsedMemory * 1024 * 1024 : 0;

      const updateReq: DockerContainerUpdateRequest = {
        nanoCpus: nanoCpus > 0 ? nanoCpus : undefined,
        memory: memoryBytes > 0 ? memoryBytes : undefined,
        restartPolicy: {
          name: restartPolicy
        }
      };

      const res = await containersApi.updateContainer(inspect.id, updateReq);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || t('containers.updateResourcesSuccess')
        });
        onUpdated();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || t('containers.updateResourcesError')
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || t('containers.updateResourcesError')
      });
    } finally {
      setSaving(false);
    }
  };

  // Compose bilgisi
  const composeProject = inspect.config?.labels?.['com.docker.compose.project'];
  const composeService = inspect.config?.labels?.['com.docker.compose.service'];

  // CPU Bar Rengi
  const cpuPercent = stats?.cpuPercent || 0;
  const cpuBarColor = cpuPercent > 80 ? 'bg-rose-500' : cpuPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400';

  // RAM Bar Rengi
  const memPercent = stats?.memoryPercent || 0;
  const memBarColor = memPercent > 85 ? 'bg-rose-500' : memPercent > 65 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Başlık ve Canlı Durum Rozeti */}
      <div className="p-4 surface border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-[#eceef6]">
              {t('containers.tabResources')} & Canlı Telemetri
            </h4>
            {isRunning ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Canlı Veri (2.5s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Konteyner Durdu
              </span>
            )}
          </div>
          <p className="text-xs text-[#9ba0b5] mt-0.5">
            Çalışma zamanı cgroup kaynak kısıtlamalarını yönetin ve anlık CPU, bellek ile I/O tüketimini izleyin.
          </p>
        </div>

        {/* Canlı Trafik Özet Rozeti */}
        {isRunning && stats && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] font-mono shrink-0">
            <div className="flex items-center gap-1 text-[#9ba0b5]">
              <ArrowDownUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Ağ:</span>
            </div>
            <span className="text-emerald-400 font-medium">↓ {formatBytes(stats.networkRxBytes)}</span>
            <span className="text-sky-400 font-medium">↑ {formatBytes(stats.networkTxBytes)}</span>
          </div>
        )}
      </div>

      {/* CANLI PERFORMANS KARTLARI (GERÇEK VERİLER) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CPU Canlı Telemetri Kartı */}
        <div className="p-4 surface border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-[#eceef6]">Anlık CPU Kullanımı</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#eceef6]">
              {isRunning && stats ? `${stats.cpuPercent.toFixed(1)}%` : isRunning ? 'Hesaplanıyor...' : '0.0%'}
            </span>
          </div>

          {/* Dinamik CPU İlerleme Çubuğu */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${cpuBarColor}`}
              style={{ width: `${Math.min(100, Math.max(0, stats?.cpuPercent || 0))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#9ba0b5]">
            <span>Aktif Sınır:</span>
            <span className="font-mono text-[#eceef6] font-medium">
              {initialNanoCpus > 0 
                ? `${(initialNanoCpus / 1_000_000_000).toFixed(1)} vCPU Çekirdek` 
                : 'Sınırsız (Tüm Host Çekirdekleri)'}
            </span>
          </div>
        </div>

        {/* Bellek (RAM) Canlı Telemetri Kartı */}
        <div className="p-4 surface border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-[#eceef6]">Anlık Bellek (RAM) Kullanımı</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#eceef6]">
              {isRunning && stats 
                ? `${formatBytes(stats.memoryUsageBytes)} (${stats.memoryPercent.toFixed(1)}%)`
                : isRunning ? 'Hesaplanıyor...' : '0 B (0%)'}
            </span>
          </div>

          {/* Dinamik RAM İlerleme Çubuğu */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${memBarColor}`}
              style={{ width: `${Math.min(100, Math.max(0, stats?.memoryPercent || 0))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#9ba0b5]">
            <span>{initialMemoryBytes > 0 ? 'Yapılandırılmış Limit:' : 'Host Toplam RAM:'}</span>
            <span className="font-mono text-[#eceef6] font-medium">
              {initialMemoryBytes > 0 
                ? formatBytes(initialMemoryBytes) 
                : stats?.memoryLimitBytes 
                  ? `${formatBytes(stats.memoryLimitBytes)} (Sınırsız)`
                  : 'Sınırsız'}
            </span>
          </div>
        </div>
      </div>

      {/* Compose Bildirimi (Varsa) */}
      {composeProject && (
        <div className="p-3.5 rounded-2xl border border-sky-500/20 bg-sky-500/5 flex items-start gap-3 text-xs">
          <Layers className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-[#eceef6]">
              Docker Compose Yığın Üyesi: <span className="font-mono text-sky-300">{composeProject}</span> {composeService && `(${composeService})`}
            </p>
            <p className="text-[11px] text-[#9ba0b5] leading-relaxed">
              Bu formdan uygulanan limitler anında çalışan konteynere yansıtılır. Konteyner silinip <code className="text-sky-300 font-mono">docker compose up</code> ile yeniden oluşturulduğunda sınırların kalıcı olması için projenin compose dosyasında <code className="text-sky-300 font-mono">deploy.resources.limits</code> belirtmeniz önerilir.
            </p>
          </div>
        </div>
      )}

      {/* Durum Mesajı (Başarı / Hata) */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-[#34d399]'
              : 'bg-rose-500/10 border-rose-500/25 text-[#f87171]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Girdi Alanları (CPU & Memory Limits) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Limits Formu */}
        <div className="p-4 surface border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#d5d5dc]" />
            <label className="text-xs font-bold text-[#eceef6]">
              {t('containers.cpuLimitLabel')} (vCPU Çekirdek)
            </label>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              step="0.1"
              min="0"
              max="64"
              value={cpuCores}
              disabled={!isAdmin || saving}
              onChange={(e) => setCpuCores(e.target.value)}
              placeholder="0 (Sınırsız)"
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-xl text-[#eceef6] focus:outline-none focus:border-[#d5d5dc] transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[#9ba0b5]">
              {t('containers.cpuLimitHelp')}
            </p>
          </div>

          {/* Quick preset buttons */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['0', '0.5', '1.0', '2.0', '4.0'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCpuCores(preset)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${
                    cpuCores === preset
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-white/[0.04] text-[#9ba0b5] border-white/10 hover:text-[#eceef6] hover:bg-white/[0.08]'
                  }`}
                >
                  {preset === '0' ? 'Sınırsız' : `${preset} Çekirdek`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Memory Limits Formu */}
        <div className="p-4 surface border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#d5d5dc]" />
            <label className="text-xs font-bold text-[#eceef6]">
              {t('containers.memoryLimitLabel')} (MB)
            </label>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              step="32"
              min="0"
              value={memoryMb}
              disabled={!isAdmin || saving}
              onChange={(e) => setMemoryMb(e.target.value)}
              placeholder="0 (Sınırsız)"
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-xl text-[#eceef6] focus:outline-none focus:border-[#d5d5dc] transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[#9ba0b5]">
              {t('containers.memoryLimitHelp')}
            </p>
          </div>

          {/* Quick preset buttons */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: 'Sınırsız', val: '0' },
                { label: '256 MB', val: '256' },
                { label: '512 MB', val: '512' },
                { label: '1 GB', val: '1024' },
                { label: '2 GB', val: '2048' },
                { label: '4 GB', val: '4096' },
                { label: '8 GB', val: '8192' }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setMemoryMb(p.val)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${
                    memoryMb === p.val
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-white/[0.04] text-[#9ba0b5] border-white/10 hover:text-[#eceef6] hover:bg-white/[0.08]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Restart Policy Formu */}
      <div className="p-4 surface border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[#d5d5dc]" />
          <label className="text-xs font-bold text-[#eceef6]">
            {t('containers.restartPolicyLabel')}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { id: 'no', label: 'No', desc: t('containers.restartPolicyNo') },
            { id: 'always', label: 'Always', desc: t('containers.restartPolicyAlways') },
            { id: 'unless-stopped', label: 'Unless Stopped', desc: t('containers.restartPolicyUnlessStopped') },
            { id: 'on-failure', label: 'On Failure', desc: t('containers.restartPolicyOnFailure') }
          ].map((item) => (
            <label
              key={item.id}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                restartPolicy === item.id
                  ? 'bg-white/[0.08] border-white/30 text-[#eceef6] shadow-sm'
                  : 'bg-white/[0.02] border-white/10 text-[#9ba0b5] hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="restartPolicy"
                value={item.id}
                checked={restartPolicy === item.id}
                disabled={!isAdmin || saving}
                onChange={() => setRestartPolicy(item.id)}
                className="sr-only"
              />
              <div className="font-bold text-xs text-[#eceef6] mb-0.5">{item.label}</div>
              <div className="text-[11px] leading-relaxed text-[#9ba0b5]">{item.desc}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Kaydet Butonu */}
      {isAdmin && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-black bg-white hover:bg-[#d5d5dc] rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Güncelleniyor...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('containers.updateResourcesBtn')}</span>
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
};
