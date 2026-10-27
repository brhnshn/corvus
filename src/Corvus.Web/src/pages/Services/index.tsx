import React, { useState, useMemo } from 'react';
import { api, type Service } from '../../api/client';
import { useI18n } from '../../i18n';
import { RefreshCw, Server, Plus } from 'lucide-react';
import { AddServiceModal } from './AddServiceModal';
import { EditServiceModal } from './EditServiceModal';
import { DeleteConfirmSheet } from './DeleteConfirmSheet';
import { useEntityGrouping } from '../../utils/grouping';
import { ServicesHeader } from './ServicesHeader';
import { ServicesStats } from './ServicesStats';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastContext';
import { PageStage, MotionItem } from '../../components/ui/MotionStage';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { SystemdUnitsTab } from './SystemdUnitsTab';
import { useServicesData } from './useServicesData';
import { countServiceTags, filterServices } from './services.utils';
import { ServicesTagFilters } from './ServicesTagFilters';
import { ServicesGroupedGrid } from './ServicesGroupedGrid';

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

  const {
    services,
    setServices,
    loading,
    refreshing,
    reordering,
    activeSystemName,
    loadServices,
    handleMove
  } = useServicesData();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'containers' | 'systemd'>('containers');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const tagsWithCounts = useMemo(() => countServiceTags(services), [services]);

  const filtered = useMemo(
    () => filterServices(services, search, selectedTag, selectedStatus),
    [services, search, selectedTag, selectedStatus]
  );

  const grouping = useEntityGrouping<Service>({
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
        <SystemdUnitsTab isAdmin={effectiveIsAdmin} />
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
          <ServicesTagFilters
            totalCount={services.length}
            tagsWithCounts={tagsWithCounts}
            selectedTag={selectedTag}
            selectedStatus={selectedStatus}
            onSelectTag={setSelectedTag}
            onClearAll={() => {
              setSelectedTag(null);
              setSelectedStatus(null);
            }}
          />
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
        <ServicesGroupedGrid
          grouping={grouping}
          services={services}
          reordering={reordering}
          isAdmin={effectiveIsAdmin}
          onMove={handleMove}
          onDelete={(id, name) => setDeletingService({ id, name })}
          onEdit={setEditingService}
          onSelectTag={setSelectedTag}
        />
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
