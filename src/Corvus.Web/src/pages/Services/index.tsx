import React, { useEffect, useState } from 'react';
import { api, type Service } from '../../api/client';
import { useI18n } from '../../i18n';
import { RefreshCw } from 'lucide-react';
import { AddServiceModal } from './AddServiceModal';
import { EditServiceModal } from './EditServiceModal';
import { GroupSection } from '../../components/GroupSection';
import { useEntityGrouping } from '../../utils/grouping';
import { ServiceCard } from './ServiceCard';
import { ServicesHeader } from './ServicesHeader';
import { ServicesEmptyState } from './ServicesEmptyState';

export const ServicesPage: React.FC = () => {
  const { t } = useI18n();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [reordering, setReordering] = useState(false);

  const isMountedRef = React.useRef(true);

  const loadServices = React.useCallback(async () => {
    try {
      const data = await api.getServices();
      if (isMountedRef.current) setServices(data);
    } catch (err: unknown) {
      if (isMountedRef.current) console.error('Servisler yüklenemedi', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadServices();

    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) loadServices();
    }, 25000);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) loadServices();
    };
    const onOnline = () => {
      if (isMountedRef.current) loadServices();
    };

    const handleCorvusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type: string | undefined = detail?.eventType || detail?.type;
      if (type?.includes('service') && isMountedRef.current) {
        loadServices();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('corvus_event', handleCorvusEvent);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('corvus_event', handleCorvusEvent);
    };
  }, [loadServices]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('services.deleteConfirm', { name }))) return;
    try {
      await api.deleteService(id);
      await loadServices();
    } catch (err: unknown) {
      alert(`${t('common.error')}: ${err instanceof Error ? err.message : 'Error'}`);
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
      const ids = newServices.map(s => s.id);
      await api.reorderServices(ids);
    } catch (err: unknown) {
      console.error('Sıralama güncellenemedi:', err);
      await loadServices();
    } finally {
      setReordering(false);
    }
  };

  const filtered = services.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

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
    handleDrop
  } = useEntityGrouping<Service>({
    items: filtered,
    getId: (s) => s.id,
    getName: (s) => s.name,
    getCategory: (s) => s.category || t('groups.general'),
    storageKey: 'corvus_services',
    onUpdateCategory: async (id, newCat) => {
      setServices(prev => prev.map(s => s.id === id ? { ...s, category: newCat } : s));
      await api.updateService(id, { category: newCat });
    },
    onBatchUpdateCategory: async (ids, newCat) => {
      setServices(prev => prev.map(s => ids.includes(s.id) ? { ...s, category: newCat } : s));
      await Promise.allSettled(ids.map(id => api.updateService(id, { category: newCat })));
    }
  });

  return (
    <div className="space-y-6">
      <ServicesHeader
        search={search}
        onSearchChange={setSearch}
        onAddClick={() => setShowAddModal(true)}
        onRefreshClick={loadServices}
      />

      {loading && services.length === 0 && (
        <div className="flex items-center justify-center h-64 text-[#9ca3af]">
          <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-400" />
          {t('common.loading')}
        </div>
      )}

      {!loading && services.length === 0 && (
        <ServicesEmptyState onAddClick={() => setShowAddModal(true)} />
      )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.items.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  globalIndex={services.findIndex(s => s.id === service.id)}
                  totalServices={services.length}
                  isDragging={draggingId === service.id}
                  reordering={reordering}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  onEdit={setEditingService}
                />
              ))}
            </div>
          </GroupSection>
        );
      })}

      <AddServiceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => {
          await loadServices();
          setShowAddModal(false);
        }}
      />

      <EditServiceModal
        isOpen={!!editingService}
        service={editingService}
        onClose={() => setEditingService(null)}
        onSuccess={async () => {
          await loadServices();
          setEditingService(null);
        }}
      />
    </div>
  );
};

export default ServicesPage;
