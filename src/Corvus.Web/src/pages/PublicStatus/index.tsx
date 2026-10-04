import { useEffect, useState, useMemo } from 'react';
import { api, type PublicStatusPage } from '../../api/client';
import { CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { PublicStatusCategoryGroup } from './PublicStatusCategoryGroup';
import { PublicStatusDisabled } from './PublicStatusDisabled';
import { PublicStatusIncidentBanner } from './PublicStatusIncidentBanner';
import { Button } from '../../components/ui/Button';
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
    document.title = `${t('publicStatus.badge') || 'Durum'} - Corvus`;
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [t]);

  const groupedServices = useMemo(() => {
    if (!data || !data.services) return [];
    const groups = new Map<string, PublicService[]>();
    for (const svc of data.services) {
      const cat = svc.category?.trim() || t('publicStatus.generalCategory') || 'Genel';
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
        title: t('publicStatus.noServicesTitle') || 'İzlenen Servis Yok',
        desc: t('publicStatus.noServicesDesc') || 'Şu anda sistemde izlenen aktif servis bulunmuyor.',
        borderColor: 'border-[#f87171]/30',
        textColor: 'text-[#f87171]',
        icon: <AlertTriangle className="w-7 h-7 text-[#f87171]" />
      };
    }
    if (data.systemStatus === 'all_operational') {
      return {
        title: t('publicStatus.allOperationalTitle') || 'Tüm Sistemler Sorunsuz Çalışıyor',
        desc: t('publicStatus.allOperationalDesc') || 'Tüm servisler beklenen operasyonel standartlarda aktiftir.',
        borderColor: 'border-[#34d399]/30',
        textColor: 'text-[#34d399]',
        icon: <CheckCircle2 className="w-7 h-7 text-[#34d399]" />
      };
    }
    if (data.systemStatus === 'some_degraded') {
      return {
        title: t('publicStatus.degradedTitle') || 'Bazı Sistemlerde Aksaklık Var',
        desc: t('publicStatus.degradedDesc') || 'Belirli servislerde gecikme veya performans düşüklüğü gözlemleniyor.',
        borderColor: 'border-[#fbbf24]/30',
        textColor: 'text-[#fbbf24]',
        icon: <AlertTriangle className="w-7 h-7 text-[#fbbf24]" />
      };
    }
    return {
      title: t('publicStatus.outageTitle') || 'Sistem Kesintisi Tespit Edildi',
      desc: t('publicStatus.outageDesc') || 'Bazı kritik servisler şu anda yanıt vermiyor.',
      borderColor: 'border-[#f87171]/30',
      textColor: 'text-[#f87171]',
      icon: <XCircle className="w-7 h-7 text-[#f87171]" />
    };
  };

  if (data?.enabled === false) {
    return <PublicStatusDisabled message={data.message} />;
  }

  const statusHeader = getSystemStatusHeader();

  return (
    <div className="min-h-screen bg-[#0d0e15] text-[#eceef6] flex flex-col items-center py-8 px-4 sm:px-6 selection:bg-white/20 animate-rv">
      <div className="w-full max-w-4xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-5">
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
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#eceef6] flex items-center gap-2">
                <span>{t('publicStatus.title') || 'Sistem Durumu'}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-[10px] bg-white/[0.07] border border-white/10 text-[#d5d5dc] font-semibold">
                  {t('publicStatus.badge') || 'Canlı'}
                </span>
              </h1>
              <p className="text-xs text-[#9ba0b5] mt-0.5">
                {t('publicStatus.subtitle') || 'Gerçek zamanlı servis erişilebilirlik ve altyapı raporu'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#9ba0b5] flex-wrap justify-end">
            <LanguageSwitch variant="compact" />
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[#9ba0b5]" />
              {t('publicStatus.lastUpdate', { time: lastUpdated.toLocaleTimeString() }) || lastUpdated.toLocaleTimeString()}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              disabled={loading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              <span className="sr-only">Yenile</span>
            </Button>
            <a
              href="/"
              className="px-3 py-1.5 rounded-[12px] bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-[#eceef6] transition-colors text-xs font-semibold"
            >
              {t('publicStatus.adminPanelBtn') || 'Yönetim Paneli'}
            </a>
          </div>
        </div>

        {/* Global Operational Status Hero */}
        {statusHeader && (
          <div
            className={`p-5 sm:p-6 rounded-[22px] surface border ${statusHeader.borderColor} flex items-start gap-4 shadow-xl transition-all`}
          >
            <div className="p-2.5 rounded-[14px] bg-white/[0.07] border border-white/10 shrink-0">
              {statusHeader.icon}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#eceef6]">{statusHeader.title}</h2>
              <p className="text-xs sm:text-sm mt-1 text-[#9ba0b5] leading-relaxed">{statusHeader.desc}</p>
            </div>
          </div>
        )}

        {/* Incident & Maintenance Announcements */}
        {data?.incidents && data.incidents.length > 0 && (
          <PublicStatusIncidentBanner incidents={data.incidents} />
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="text-center py-20 text-[#9ba0b5] flex flex-col items-center gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-[#d5d5dc]" />
            <p className="text-xs font-mono">{t('common.loading') || 'Yükleniyor...'}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-[14px] bg-[#f87171]/15 border border-[#f87171]/30 text-[#f87171] text-xs">
            {error}
          </div>
        )}

        {/* Categorized Services List */}
        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-mono font-bold tracking-wider text-[#9ba0b5] uppercase">
                {t('publicStatus.monitoredServices', { count: data.services.length }) || `İzlenen Servisler (${data.services.length})`}
              </h3>
            </div>

            {data.services.length === 0 ? (
              <div className="p-8 rounded-[20px] border border-[#f87171]/30 surface text-center text-[#f87171] text-sm space-y-2">
                <AlertTriangle className="w-8 h-8 text-[#f87171] mx-auto" />
                <p className="font-semibold text-[#eceef6]">{t('publicStatus.noServicesTitle') || 'İzlenen Servis Bulunmuyor'}</p>
                <p className="text-xs text-[#9ba0b5]">{t('publicStatus.noServicesDesc') || 'Genel erişime açık servis tanımlanmamış.'}</p>
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
        <div className="pt-6 border-t border-white/10 text-center text-xs text-[#9ba0b5]/80 font-mono">
          <p>{t('publicStatus.footerText') || 'Corvus Altyapı İzleme Motoru Tarafından Sağlanmaktadır'}</p>
        </div>
      </div>
    </div>
  );
}
