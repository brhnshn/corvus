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
import { PageStage, MotionItem } from '../../components/ui/MotionStage';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { SystemdUnitsTab } from './SystemdUnitsTab';

export interface ServicesPageProps {
  isAdmin?: boolean;
  role?: string | null;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  isAdmin = true,
  role = 'admin'
}) => {
  const { t } = useI18n();
  const toast = useToast();
  const isViewer = role === 'viewer';
  const effectiveIsAdmin = isAdmin && !isViewer;

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'containers' | 'systemd'>('containers');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [activeSystemName, setActiveSystemName] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('corvus_active_system_name') : null) || 'Host';
  });
  const [activeSystemId, setActiveSystemId] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('corvus_active_system_id') : null) || 'local-host';
  });

  const isMountedRef = useRef(true);

  const loadServices = useCallback(async (isManual = false) => {
    if (isManual && isMountedRef.current) setRefreshing(true);
    try {
      const data = await api.getServices();
      if (isMountedRef.current) setServices(data);
    } catch (err: unknown) {
      if (isMountedRef.current) {
        toast.error(t('services.loadFailed'));
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

    const handleSystemChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sId = customEvent.detail?.systemId || localStorage.getItem('corvus_active_system_id') || 'local-host';
      const sName = customEvent.detail?.systemName || localStorage.getItem('corvus_active_system_name') || 'Host';
      setActiveSystemId(sId);
      setActiveSystemName(sName);
      if (isMountedRef.current) {
        loadServices(true);
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('corvus_event', handleCorvusEvent);
    window.addEventListener('corvus_active_system_changed', handleSystemChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_event', handleCorvusEvent);
      window.removeEventListener('corvus_active_system_changed', handleSystemChange);
    };
  }, [loadServices]);

  const confirmDelete = async () => {
    if (!deletingService) return;
    setDeleteLoading(true);
    try {
      await api.deleteService(deletingService.id);
      toast.success(t('services.serviceDeleted', { name: deletingService.name }));
      setDeletingService(null);
      await loadServices();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('services.deleteFailed'));
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
      toast.success(t('services.categoryUpdated'));
    },
    onBatchUpdateCategory: async (ids, newCat) => {
      setServices((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, category: newCat } : s)));
      await Promise.allSettled(ids.map((id) => api.updateService(id, { category: newCat })));
      toast.success(t('services.categoriesUpdated'));
    },
  });

  return (
    <PageStage className="space-y-4">
      {/* 0. Görünüm Modu Sekmesi (Konteyner Servisleri ↔ Systemd Servisleri) */}
      <MotionItem staggerIndex={0}>
        <div className="flex items-center justify-between">
          <SegmentedTabs
            tabs={[
              { id: 'containers', label: t('services.tabContainerServices'), meta: services.length },
              { id: 'systemd', label: t('services.tabSystemdUnits') },
            ]}
            activeTab={viewMode}
            onChange={(id) => setViewMode(id as 'containers' | 'systemd')}
          />
        </div>
      </MotionItem>

      {viewMode === 'systemd' ? (
        <SystemdUnitsTab isAdmin={effectiveIsAdmin} selectedSystemId={activeSystemId} />
      ) : (
        <>
          {/* 1. Başlık & Arama & Hızlı Aksiyonlar */}
          <MotionItem staggerIndex={1}>
            <ServicesHeader
              isAdmin={effectiveIsAdmin}
              systemName={activeSystemName}
              search={search}
              onSearchChange={setSearch}
              onAddClick={() => setShowAddModal(true)}
              onRefreshClick={() => loadServices(true)}
              refreshing={refreshing}
            />
          </MotionItem>

      {/* 2. KPI İstatistik Şeridi */}
      <MotionItem staggerIndex={1}>
        <ServicesStats
          services={services}
          selectedStatus={selectedStatus}
          onFilterStatus={(st) => setSelectedStatus((prev) => (prev === st ? null : st))}
        />
      </MotionItem>

      {/* 3. Filtre Çipleri (Etiketler + Tümü) */}
      {(tagsWithCounts.length > 0 || selectedTag || selectedStatus) && (
        <MotionItem staggerIndex={2}>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <FilterChip
              label={t('common.all')}
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
        </MotionItem>
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
          title={t('services.noMatchingServices')}
          description={t('services.noMatchingServicesDesc')}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedTag(null);
                setSelectedStatus(null);
              }}
            >
              {t('services.clearFilters')}
            </Button>
          }
        />
      )}

      {/* 4. Gruplanmış Kart Izgarası */}
      <MotionItem staggerIndex={3}>
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
                    isAdmin={effectiveIsAdmin}
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
      </MotionItem>
      </>
      )}

      {/* Servis Ekleme Modalı */}
      <AddServiceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => {
          await loadServices();
          setShowAddModal(false);
          toast.success(t('services.serviceAdded'));
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
          toast.success(t('services.serviceUpdated'));
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
    </PageStage>
  );
};

export default ServicesPage;
