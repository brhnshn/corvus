import React, { useState } from 'react';
import { useSystemsPageState } from './useSystemsPageState';
import { SystemsTable } from './SystemsTable';
import { SystemsEmptyState } from './SystemsEmptyState';
import { AddSystemSheet } from './AddSystemSheet';
import { EditSystemModal } from './EditSystemModal';
import { DeleteSystemModal } from './DeleteSystemModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Plus, RefreshCw, Server } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { PageId } from '../../components/Sidebar';
import type { SystemSummaryDto } from '../../types';

import { api, invalidateCache } from '../../api';

interface SystemsPageProps {
  isAdmin?: boolean;
  username?: string | null;
  role?: string | null;
  onNavigate?: (page: PageId, containerId?: string | null, tab?: string | null) => void;
}

export const SystemsPage: React.FC<SystemsPageProps> = ({
  isAdmin = true,
  onNavigate
}) => {
  const { t } = useI18n();
  const {
    systems,
    filteredSystems,
    isLoading,
    sortBy,
    setSortBy,
    isAddOpen,
    setIsAddOpen,
    refresh
  } = useSystemsPageState();

  const [editingSystem, setEditingSystem] = useState<SystemSummaryDto | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<SystemSummaryDto | null>(null);

  const handleSelectSystem = (systemId: string) => {
    localStorage.setItem('corvus_active_system_id', systemId);
    invalidateCache();
    window.dispatchEvent(new CustomEvent('corvus_active_system_changed', { detail: { systemId } }));
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  const handleTogglePause = async (sys: SystemSummaryDto) => {
    try {
      const nextStatus = sys.status === 'paused' ? 'online' : 'paused';
      await api.updateSystem(sys.id, { status: nextStatus });
      refresh();
    } catch (err) {
      console.error('Sistem durumu değiştirilemedi:', err);
    }
  };

  return (
    <div className="space-y-6 animate-rv">
      {/* Corvus Midnight v2 PageHeader Yapısı */}
      <PageHeader
        title={t('systems.allSystems')}
        subtitle={t('systems.allSystemsDesc')}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-[#9ba0b5]">
            <Server className="w-3 h-3 text-indigo-400" />
            <span>
              {t('systems.systemsCount', {
                filtered: String(filteredSystems.length),
                total: String(systems.length)
              })}
            </span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={refresh}
              disabled={isLoading}
              icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />}
              aria-label={t('common.refresh')}
            >
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </Button>

            {isAdmin && (
              <Button
                variant="primary"
                onClick={() => setIsAddOpen(true)}
                icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              >
                <span>{t('systems.addSystemButton')}</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Sistemler Tablosu */}
      <section className="w-full">
        {filteredSystems.length === 0 ? (
          <SystemsEmptyState
            onAddClick={() => setIsAddOpen(true)}
            isAdmin={isAdmin}
          />
        ) : (
          <SystemsTable
            systems={filteredSystems}
            onSelectSystem={handleSelectSystem}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            onEditSystem={isAdmin ? setEditingSystem : undefined}
            onTogglePauseSystem={isAdmin ? handleTogglePause : undefined}
            onDeleteSystem={isAdmin ? setDeletingSystem : undefined}
          />
        )}
      </section>

      {/* Yeni Sistem Ekleme Yan Paneli */}
      <AddSystemSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSystemCreated={refresh}
      />

      {/* Sistem Düzenleme Modalı */}
      <EditSystemModal
        system={editingSystem}
        isOpen={Boolean(editingSystem)}
        onClose={() => setEditingSystem(null)}
        onUpdated={refresh}
      />

      {/* Sistem Silme Onay Modalı */}
      <DeleteSystemModal
        system={deletingSystem}
        isOpen={Boolean(deletingSystem)}
        onClose={() => setDeletingSystem(null)}
        onDeleted={refresh}
      />
    </div>
  );
};

export default SystemsPage;

