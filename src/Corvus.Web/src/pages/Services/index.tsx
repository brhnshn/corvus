import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { api, type Service } from '../../api/client';
import { useI18n } from '../../i18n';
import { RefreshCw, Server, Plus } from 'lucide-react';
import { AddServiceModal } from './AddServiceModal';
import { EditServiceModal } from './EditServiceModal';
import { DeleteConfirmSheet } from './DeleteConfirmSheet';
import { GroupSection } from '../../components/GroupSection';
import { useEntityGrouping } from '../../utils/grouping';
import { ServiceCard } from './ServiceCard';
import { ServicesHeader } from './ServicesHeader';
import { ServicesStats } from './ServicesStats';
import { FilterChip } from '../../components/ui/FilterChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { tagHue } from '../../utils/tagHue';

export const ServicesPage: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reordering, setReordering] = useState(false);

  const isMountedRef = useRef(true);

  const loadServices = useCallback(async (isManual = false) => {
    if (isManual && isMountedRef.current) setRefreshing(true);
    try {
      const data = await api.getServices();
      if (isMountedRef.current) setServices(data);
    } catch (err: unknown) {
      if (isMountedRef.current) {
        toast.error('Servisler yüklenemedi');
        console.error('Servisler yüklenemedi', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (isManual) setRefreshing(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    isMountedRef.current = true;
    loadServices();

    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) loadServices();
    }, 25000);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) loadServices();
    };

    const handleCorvusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type: string | undefined = detail?.eventType || detail?.type;
      if (type?.includes('service') && isMountedRef.current) {
        loadServices();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('corvus_event', handleCorvusEvent);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_event', handleCorvusEvent);
    };
  }, [loadServices]);

  const confirmDelete = async () => {
    if (!deletingService) return;
    setDeleteLoading(true);
    try {
      await api.deleteService(deletingService.id);
      toast.success(`"${deletingService.name}" servisi kaldırıldı`);
      setDeletingService(null);
      await loadServices();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Servis silinemedi');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMove = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    const newServices = [...services];
    const temp = newServices[currentIndex];
    newServices[currentIndex] = newServices[targetIndex];
    newServices[targetIndex] = temp;

    setServices(newServices);
    setReordering(true);

    try {
      const ids = newServices.map((s) => s.id);
      await api.reorderServices(ids);
    } catch (err: unknown) {
      console.error('Sıralama güncellenemedi:', err);
      await loadServices();
    } finally {
      setReordering(false);
    }
  };

  const tagsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    services.forEach((s) => {
      s.tags?.forEach((tag) => {
        const clean = tag.trim();
        if (clean) {
          counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)));

      const matchesTag =
        !selectedTag ||
        (s.tags && s.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));

      const matchesStatus = !selectedStatus || s.status === selectedStatus;

      return matchesSearch && matchesTag && matchesStatus;
    });
  }, [services, search, selectedTag, selectedStatus]);

  const {
    groups,
    collapsed,
    toggleCollapse,
    renameGroup,
    draggingId,
    dragOverGroup,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useEntityGrouping<Service>({
    items: filtered,
    getId: (s) => s.id,
    getName: (s) => s.name,
    getCategory: (s) => s.category || t('groups.general'),
    storageKey: 'corvus_services',
    onUpdateCategory: async (id, newCat) => {
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, category: newCat } : s)));
      await api.updateService(id, { category: newCat });
      toast.success('Kategori güncellendi');
    },
    onBatchUpdateCategory: async (ids, newCat) => {
      setServices((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, category: newCat } : s)));
      await Promise.allSettled(ids.map((id) => api.updateService(id, { category: newCat })));
      toast.success('Kategoriler güncellendi');
    },
  });

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Başlık & Arama & Hızlı Aksiyonlar */}
      <ServicesHeader
        search={search}
        onSearchChange={setSearch}
        onAddClick={() => setShowAddModal(true)}
        onRefreshClick={() => loadServices(true)}
        refreshing={refreshing}
      />

      {/* 2. KPI İstatistik Şeridi */}
      <ServicesStats
        services={services}
        selectedStatus={selectedStatus}
        onFilterStatus={(st) => setSelectedStatus((prev) => (prev === st ? null : st))}
      />

      {/* 3. Filtre Çipleri (Etiketler + Tümü) */}
      {(tagsWithCounts.length > 0 || selectedTag || selectedStatus) && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none animate-rv">
          <FilterChip
            label="Tümü"
            count={services.length}
            selected={!selectedTag && !selectedStatus}
            onClick={() => {
              setSelectedTag(null);
              setSelectedStatus(null);
            }}
          />

          {tagsWithCounts.map(({ tag, count }) => {
            const h = tagHue(tag);
            return (
              <FilterChip
                key={tag}
                label={tag}
                count={count}
                dotColor={`hsl(${h} 80% 65%)`}
                selected={selectedTag?.toLowerCase() === tag.toLowerCase()}
                onClick={() =>
                  setSelectedTag((prev) => (prev?.toLowerCase() === tag.toLowerCase() ? null : tag))
                }
              />
            );
          })}
        </div>
      )}

      {/* Yükleniyor Durumu */}
      {loading && services.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-[#9ba0b5]">
          <RefreshCw className="w-7 h-7 animate-spin text-[#d5d5dc] mb-3" />
          <span className="text-xs font-mono tracking-wider">{t('common.loading')}</span>
        </div>
      )}

      {/* Boş Durum */}
      {!loading && services.length === 0 && (
        <EmptyState
          icon={<Server className="w-6 h-6" />}
          title={t('services.noServicesFound')}
          description={t('services.noServicesDesc')}
          action={
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              {t('services.addService')}
            </Button>
          }
        />
      )}

      {/* Filtre Sonucu Boş Durumu */}
      {!loading && services.length > 0 && filtered.length === 0 && (
        <EmptyState
          title="Eşleşen servis bulunamadı"
          description="Arama kriterlerinize veya seçilen filtrelere uyan bir servis kaydı yok."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedTag(null);
                setSelectedStatus(null);
              }}
            >
              Filtreleri Temizle
            </Button>
          }
        />
      )}

      {/* 4. Gruplanmış Kart Izgarası */}
      {groups.map((group) => {
        if (group.items.length === 0) return null;

        return (
          <GroupSection
            key={group.name}
            title={group.name}
            count={group.items.length}
            isCollapsed={!!collapsed[group.name]}
            onToggleCollapse={() => toggleCollapse(group.name)}
            onRenameGroup={(newName) => renameGroup(group.name, newName)}
            isDragOver={dragOverGroup === group.name}
            onDragOver={(e) => handleDragOver(e, group.name)}
            onDragLeave={() => handleDragLeave(group.name)}
            onDrop={(e) => handleDrop(e, group.name)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {group.items.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  globalIndex={services.findIndex((s) => s.id === service.id)}
                  totalServices={services.length}
                  isDragging={draggingId === service.id}
                  reordering={reordering}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onMove={handleMove}
                  onDelete={(id, name) => setDeletingService({ id, name })}
                  onEdit={setEditingService}
                  onSelectTag={setSelectedTag}
                />
              ))}
            </div>
          </GroupSection>
        );
      })}

      {/* Servis Ekleme Modalı */}
      <AddServiceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => {
          await loadServices();
          setShowAddModal(false);
          toast.success('Yeni servis başarıyla eklendi');
        }}
      />

      {/* Servis Düzenleme Modalı */}
      <EditServiceModal
        isOpen={!!editingService}
        service={editingService}
        onClose={() => setEditingService(null)}
        onSuccess={async () => {
          await loadServices();
          setEditingService(null);
          toast.success('Servis güncellendi');
        }}
      />

      {/* Silme Onay Paneli (Midnight v2 Sheet) */}
      <DeleteConfirmSheet
        isOpen={!!deletingService}
        onClose={() => setDeletingService(null)}
        serviceName={deletingService?.name || ''}
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
};

export default ServicesPage;
