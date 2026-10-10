import React, { useEffect, useState, useCallback } from 'react';
import { History, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type ActivityLogEntry } from '../../api/client';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
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
    <div className="space-y-4 animate-rv">
      <PageHeader
        title="Olay ve Denetim Günlüğü (Audit Log)"
        subtitle="Konteyner yaşam döngüsü, otomatik kurtarma, alarmlar ve sistem eylemlerinin kronolojik geçmişi"
        actions={
          <Button
            variant="secondary"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            <span>Yenile</span>
          </Button>
        }
      />

      <ActivityTimelineFilter
        category={category}
        onCategoryChange={handleCategoryChange}
        search={search}
        onSearchChange={handleSearchChange}
      />

      {loading ? (
        <div className="py-20 text-center text-xs text-[#9ba0b5]">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
          <span>Olay geçmişi yükleniyor...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl p-6">
          <History className="w-8 h-8 text-[#9ba0b5] mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-[#eceef6]">Henüz kayıtlı olay bulunmuyor</p>
          <p className="text-[11px] text-[#9ba0b5] mt-1 max-w-sm mx-auto">
            Sistemde gerçekleşen konteyner işlemleri, eşik alarmları ve kullanıcı aksiyonları burada listelenecektir.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => (
            <ActivityTimelineItem key={entry.id} entry={entry} />
          ))}

          {/* Sayfalama */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-[#9ba0b5]">
              <span>Toplam {totalCount} olay</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Önceki
                </Button>
                <span className="font-mono px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
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
      )}
    </div>
  );
};
