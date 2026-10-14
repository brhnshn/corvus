import React, { useEffect, useState, useCallback } from 'react';
import { History, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type ActivityLogEntry } from '../../api/client';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { PageStage, MotionItem } from '../../components/ui/MotionStage';
import { ActivityTimelineItem } from './ActivityTimelineItem';
import { ActivityTimelineFilter } from './ActivityTimelineFilter';

export const ActivityTimelinePage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [activeSystemName, setActiveSystemName] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('corvus_active_system_name') : null) || 'Host';
  });

  const fetchLogs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await api.getActivityLogs(page, 50, category, search);
      setLogs(res.items);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.warn('[ActivityTimeline] Loglar yüklenemedi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, category, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const handleSystemChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sName = customEvent.detail?.systemName || localStorage.getItem('corvus_active_system_name') || 'Host';
      setActiveSystemName(sName);
      fetchLogs(true);
    };
    window.addEventListener('corvus_active_system_changed', handleSystemChange);
    return () => window.removeEventListener('corvus_active_system_changed', handleSystemChange);
  }, [fetchLogs]);

  // Kategori veya arama değişince 1. sayfaya dön
  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <PageStage className="space-y-4">
      <MotionItem staggerIndex={0}>
        <PageHeader
          title="Olay ve Denetim Günlüğü (Audit Log)"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--bg-card)] border border-[var(--border-hairline)] text-[var(--cloud-200)] shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--cloud-400)]" />
              {activeSystemName}
            </span>
          }
          subtitle="Konteyner yaşam döngüsü, otomatik kurtarma, alarmlar ve sistem eylemlerinin kronolojik geçmişi"
          actions={
            <Button
              variant="default"
              size="sm"
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              <span>Yenile</span>
            </Button>
          }
        />
      </MotionItem>

      <MotionItem staggerIndex={1}>
        <ActivityTimelineFilter
          category={category}
          onCategoryChange={handleCategoryChange}
          search={search}
          onSearchChange={handleSearchChange}
        />
      </MotionItem>

      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)]">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--cloud-200)] mx-auto mb-2" />
          <span>Olay geçmişi yükleniyor...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[var(--border-hairline)] rounded-[var(--radius-sm)] p-6">
          <History className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-[var(--cloud-100)]">Henüz kayıtlı olay bulunmuyor</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
            Sistemde gerçekleşen konteyner işlemleri, eşik alarmları ve kullanıcı aksiyonları burada listelenecektir.
          </p>
        </div>
      ) : (
        <MotionItem staggerIndex={2}>
          <div className="space-y-2">
            {logs.map((entry) => (
              <ActivityTimelineItem key={entry.id} entry={entry} />
            ))}

            {/* Sayfalama */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-hairline)] text-xs text-[var(--text-secondary)]">
                <span className="font-mono text-[11px]">Toplam {totalCount} olay</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    icon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    Önceki
                  </Button>
                  <span className="font-mono px-2 tabular-nums">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </div>
        </MotionItem>
      )}
    </PageStage>
  );
};
