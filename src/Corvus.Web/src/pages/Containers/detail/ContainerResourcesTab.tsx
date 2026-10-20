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
  Layers,
  Sliders
} from 'lucide-react';
import { containersApi } from '../../../api/containers';
import { formatBytes } from '../../../utils/format';
import type { 
  DockerContainerInspectInfo, 
  ContainerStats 
} from '../../../types';
import { getInspectHostConfig, getInspectState } from './inspectHelpers';
import { ContainerResourceLimitsModal } from './ContainerResourceLimitsModal';

interface ContainerResourcesTabProps {
  inspect: DockerContainerInspectInfo;
  isAdmin: boolean;
  initialStats?: ContainerStats;
  onUpdated: () => void;
  onOpenResourceLimitsModal?: () => void;
}

export const ContainerResourcesTab: React.FC<ContainerResourcesTabProps> = ({
  inspect,
  isAdmin,
  initialStats,
  onUpdated,
  onOpenResourceLimitsModal
}) => {
  const { t } = useI18n();

  const hostConfig = getInspectHostConfig(inspect);
  const state = getInspectState(inspect);

  const [isModalOpen, setIsModalOpen] = useState(false);

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
  const [prevInitial, setPrevInitial] = useState({ initialCores, initialMemoryMb, initialRestartPolicy });

  if (
    initialCores !== prevInitial.initialCores ||
    initialMemoryMb !== prevInitial.initialMemoryMb ||
    initialRestartPolicy !== prevInitial.initialRestartPolicy
  ) {
    setPrevInitial({ initialCores, initialMemoryMb, initialRestartPolicy });
    setCpuCores(initialCores);
    setMemoryMb(initialMemoryMb);
    setRestartPolicy(initialRestartPolicy);
  }

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

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
      } catch {
        // Sessiz hata (arka plan telemetrisi)
      }
    };

    // İlk stats boşsa hemen çek
    if (!statsRef.current) {
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
      if (!isNaN(parsedCores) && parsedCores < 0) {
        setStatusMessage({
          type: 'error',
          text: t('containers.validationCpuNegative')
        });
        setSaving(false);
        return;
      }

      const parsedMemory = parseInt(memoryMb, 10);
      if (!isNaN(parsedMemory) && ((parsedMemory > 0 && parsedMemory < 6) || parsedMemory < 0)) {
        setStatusMessage({
          type: 'error',
          text: t('containers.validationMemoryMin')
        });
        setSaving(false);
        return;
      }

      const res = await containersApi.updateContainerResources(inspect.id, {
        cpuCores: !isNaN(parsedCores) ? parsedCores : 0,
        memoryMb: !isNaN(parsedMemory) ? parsedMemory : 0,
        restartPolicy
      });
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message ?? t('containers.updateResourcesSuccess')
        });
        onUpdated();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message ?? t('containers.updateResourcesError')
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('containers.updateResourcesError');
      setStatusMessage({
        type: 'error',
        text: msg
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
      <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">
              {t('containers.tabResources')} & {t('containers.tabTelemetryLive')}
            </h4>
            {isRunning ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('containers.liveDataBadge', { interval: '2.5s' })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {t('containers.containerStoppedBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {t('containers.resourcesSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Canlı Trafik Özet Rozeti */}
          {isRunning && stats && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[var(--border-hairline)] text-[11px] font-mono shrink-0">
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <ArrowDownUp className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('containers.networkBadge')}</span>
              </div>
              <span className="text-emerald-400 font-medium">↓ {formatBytes(stats.networkRxBytes)}</span>
              <span className="text-sky-400 font-medium">↑ {formatBytes(stats.networkTxBytes)}</span>
            </div>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (onOpenResourceLimitsModal) {
                  onOpenResourceLimitsModal();
                } else {
                  setIsModalOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border-hairline)] text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('containers.editResourceLimitsBtn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* CANLI PERFORMANS KARTLARI (GERÇEK VERİLER) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CPU Canlı Telemetri Kartı */}
        <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {t('containers.liveCpuUsage')}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
              {isRunning && typeof stats?.cpuPercent === 'number' ? `${stats.cpuPercent.toFixed(1)}%` : '-'}
            </span>
          </div>

          {/* Dinamik CPU İlerleme Çubuğu */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${cpuBarColor}`}
              style={{ width: `${Math.min(100, Math.max(0, stats?.cpuPercent || 0))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{t('containers.activeLimit')}</span>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {initialNanoCpus > 0 
                ? `${(initialNanoCpus / 1_000_000_000).toFixed(1)} ${t('containers.coresUnit')}` 
                : t('containers.allHostCores')}
            </span>
          </div>
        </div>

        {/* Bellek (RAM) Canlı Telemetri Kartı */}
        <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {t('containers.liveMemoryUsage')}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
              {isRunning && stats && typeof stats.memoryUsageBytes === 'number'
                ? `${formatBytes(stats.memoryUsageBytes)} (${stats.memoryPercent.toFixed(1)}%)`
                : '-'}
            </span>
          </div>

          {/* Dinamik RAM İlerleme Çubuğu */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${memBarColor}`}
              style={{ width: `${Math.min(100, Math.max(0, stats?.memoryPercent || 0))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{initialMemoryBytes > 0 ? t('containers.configuredLimit') : t('containers.hostTotalRam')}</span>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {initialMemoryBytes > 0 
                ? formatBytes(initialMemoryBytes) 
                : stats?.memoryLimitBytes 
                  ? `${formatBytes(stats.memoryLimitBytes)} (${t('containers.unlimited')})`
                  : t('containers.unlimited')}
            </span>
          </div>
        </div>
      </div>

      {/* Compose Bildirimi (Varsa) */}
      {/* Compose Bildirimi (Varsa) */}
      {composeProject && (
        <div className="p-3.5 rounded-2xl border border-sky-500/20 bg-sky-500/5 flex items-start gap-3 text-xs">
          <Layers className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-[var(--text-primary)]">
              {t('containers.composeMemberNotice', { project: composeProject, service: composeService ? `(${composeService})` : '' })}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {t('containers.composeMemberHelp')}
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
        <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--border-subtle)]" />
            <label className="text-xs font-bold text-[var(--text-primary)]">
              {t('containers.cpuLimitLabel')} ({t('containers.coresUnit')})
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
              placeholder={`0 (${t('containers.unlimited')})`}
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-[var(--border-hairline)] hover:border-white/20 rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-subtle)] transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[var(--text-secondary)]">
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
                      : 'bg-white/[0.04] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)] hover:bg-white/[0.08]'
                  }`}
                >
                  {preset === '0' ? t('containers.unlimited') : `${preset} ${t('containers.coresUnit')}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Memory Limits Formu */}
        <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[var(--border-subtle)]" />
            <label className="text-xs font-bold text-[var(--text-primary)]">
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
              placeholder={`0 (${t('containers.unlimited')})`}
              className="w-full px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-[var(--border-hairline)] hover:border-white/20 rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-subtle)] transition-colors disabled:opacity-50"
            />
            <p className="text-[11px] text-[var(--text-secondary)]">
              {t('containers.memoryLimitHelp')}
            </p>
          </div>

          {/* Quick preset buttons */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: t('containers.unlimited'), val: '0' },
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
                      : 'bg-white/[0.04] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)] hover:bg-white/[0.08]'
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
      <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[var(--border-subtle)]" />
          <label className="text-xs font-bold text-[var(--text-primary)]">
            {t('containers.restartPolicyLabel')}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { id: 'no', label: t('containers.restartPolicyNo'), desc: t('containers.restartPolicyNoDesc') },
            { id: 'always', label: t('containers.restartPolicyAlways'), desc: t('containers.restartPolicyAlwaysDesc') },
            { id: 'unless-stopped', label: t('containers.restartPolicyUnlessStopped'), desc: t('containers.restartPolicyUnlessStoppedDesc') },
            { id: 'on-failure', label: t('containers.restartPolicyOnFailure'), desc: t('containers.restartPolicyOnFailureDesc') }
          ].map((item) => (
            <label
              key={item.id}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                restartPolicy === item.id
                  ? 'bg-white/[0.08] border-white/30 text-[var(--text-primary)] shadow-sm'
                  : 'bg-white/[0.02] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-white/20'
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
              <div className="font-bold text-xs text-[var(--text-primary)] mb-0.5">{item.label}</div>
              <div className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{item.desc}</div>
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
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-black bg-white hover:bg-[var(--border-subtle)] rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('containers.updatingResources')}</span>
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

      {isAdmin && (
        <ContainerResourceLimitsModal
          isOpen={isModalOpen}
          containerId={inspect.id}
          containerName={inspect.name}
          inspect={inspect}
          onClose={() => setIsModalOpen(false)}
          onSuccess={onUpdated}
        />
      )}
    </form>
  );
};
