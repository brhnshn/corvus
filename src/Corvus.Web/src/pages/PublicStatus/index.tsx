import { useEffect, useState, useMemo } from 'react';
import { api, type PublicStatusPage } from '../../api/client';
import { CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { PublicStatusCategoryGroup } from './PublicStatusCategoryGroup';
import { PublicStatusDisabled } from './PublicStatusDisabled';
import { PublicStatusIncidentBanner } from './PublicStatusIncidentBanner';
import type { PublicService } from '../../types';

export default function PublicStatus() {
  const { t } = useI18n();
  const [data, setData] = useState<PublicStatusPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      const res = await api.getPublicStatusPage();
      setData(res);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Durum bilgisi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = `${t('publicStatus.badge')} - Corvus`;
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [t]);

  const groupedServices = useMemo(() => {
    if (!data || !data.services) return [];
    const groups = new Map<string, PublicService[]>();
    for (const svc of data.services) {
      const cat = svc.category?.trim() || t('publicStatus.generalCategory');
      if (!groups.has(cat)) {
        groups.set(cat, []);
      }
      groups.get(cat)!.push(svc);
    }
    return Array.from(groups.entries()).map(([category, services]) => ({
      category,
      services
    }));
  }, [data, t]);

  const getSystemStatusHeader = () => {
    if (!data) return null;
    if (data.systemStatus === 'no_services' || data.services.length === 0) {
      return {
        title: t('publicStatus.noServicesTitle'),
        desc: t('publicStatus.noServicesDesc'),
        bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
        icon: <AlertTriangle className="w-8 h-8 text-rose-400" />
      };
    }
    if (data.systemStatus === 'all_operational') {
      return {
        title: t('publicStatus.allOperationalTitle'),
        desc: t('publicStatus.allOperationalDesc'),
        bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      };
    }
    if (data.systemStatus === 'some_degraded') {
      return {
        title: t('publicStatus.degradedTitle'),
        desc: t('publicStatus.degradedDesc'),
        bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        icon: <AlertTriangle className="w-8 h-8 text-amber-400" />
      };
    }
    return {
      title: t('publicStatus.outageTitle'),
      desc: t('publicStatus.outageDesc'),
      bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      icon: <XCircle className="w-8 h-8 text-rose-400" />
    };
  };

  if (data?.enabled === false) {
    return <PublicStatusDisabled message={data.message} />;
  }

  const statusHeader = getSystemStatusHeader();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-10 px-4 sm:px-6 selection:bg-indigo-500/30">
      <div className="w-full max-w-4xl space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo_transparent.png"
              alt="Corvus"
              className="w-9 h-9 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                {t('publicStatus.title')}{' '}
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-medium">
                  {t('publicStatus.badge')}
                </span>
              </h1>
              <p className="text-xs text-slate-400">{t('publicStatus.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <LanguageSwitch variant="compact" />
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {t('publicStatus.lastUpdate', { time: lastUpdated.toLocaleTimeString() })}
            </span>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer"
              title={t('common.refresh')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="/"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors font-medium"
            >
              {t('publicStatus.adminPanelBtn')}
            </a>
          </div>
        </div>

        {/* Global Operational Status Hero */}
        {statusHeader && (
          <div
            className={`p-6 rounded-2xl border ${statusHeader.bgColor} backdrop-blur-sm flex items-start gap-4 shadow-lg transition-all`}
          >
            <div className="p-2 rounded-xl bg-slate-900/50 border border-current/20 shrink-0">
              {statusHeader.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{statusHeader.title}</h2>
              <p className="text-sm mt-1 opacity-90">{statusHeader.desc}</p>
            </div>
          </div>
        )}

        {/* Incident & Maintenance Announcements */}
        {data?.incidents && data.incidents.length > 0 && (
          <PublicStatusIncidentBanner incidents={data.incidents} />
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm">{t('common.loading')}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* Categorized Services List */}
        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                {t('publicStatus.monitoredServices', { count: data.services.length })}
              </h3>
            </div>

            {data.services.length === 0 ? (
              <div className="p-8 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center text-rose-300 text-sm space-y-2">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="font-semibold text-rose-300">{t('publicStatus.noServicesTitle')}</p>
                <p className="text-xs text-slate-400">{t('publicStatus.noServicesDesc')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedServices.map((group) => (
                  <PublicStatusCategoryGroup
                    key={group.category}
                    category={group.category}
                    services={group.services}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 border-t border-slate-800/60 text-center text-xs text-slate-500">
          <p>{t('publicStatus.footerText')}</p>
        </div>
      </div>
    </div>
  );
}
