import React, { useState } from 'react';
import { useSystemsPageState } from './useSystemsPageState';
import { SystemsTable } from './SystemsTable';
import { SystemsEmptyState } from './SystemsEmptyState';
import { AddSystemSheet } from './AddSystemSheet';
import { EditSystemModal } from './EditSystemModal';
import { DeleteSystemModal } from './DeleteSystemModal';
import { SystemsColumnsMenu, type SystemColumnKey } from './SystemsColumnsMenu';
import { Button } from '../../components/ui/Button';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { PageId } from '../../components/Sidebar';
import type { SystemSummaryDto } from '../../types';

import { api } from '../../api';
import { setActiveSystem } from '../../hooks';

import { PageStage, MotionItem } from '../../components/ui/MotionStage';

const DEFAULT_VISIBLE_COLUMNS: Record<SystemColumnKey, boolean> = {
  system: true,
  cpu: true,
  ram: true,
  disk: true,
  gpu: false,
  load: true,
  net: true,
  temp: false,
  bat: false,
  wifi: false,
  svc: true,
  upd: false,
};

interface SystemsPageProps {
  isAdmin?: boolean;
  username?: string | null;
  role?: string | null;
  onNavigate?: (page: PageId, containerId?: string | null, tab?: string | null) => void;
}

export const SystemsPage: React.FC<SystemsPageProps> = ({
  isAdmin = true,
  role,
  onNavigate
}) => {
  const effectiveIsAdmin = isAdmin && role !== 'viewer';
  const { t } = useI18n();
  const {
    systems,
    filteredSystems,
    isLoading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    isAddOpen,
    setIsAddOpen,
    refresh
  } = useSystemsPageState();

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [visibleColumns, setVisibleColumns] = useState<Record<SystemColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem('corvus_systems_visible_columns');
      if (saved) return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
    } catch { }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  const handleToggleColumn = (key: SystemColumnKey) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('corvus_systems_visible_columns', JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
  };

  const [editingSystem, setEditingSystem] = useState<SystemSummaryDto | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<SystemSummaryDto | null>(null);

  const handleSelectSystem = (systemId: string) => {
    const selected = systems.find((s) => s.id === systemId);
    const systemName = selected ? selected.name : systemId === 'local-host' ? 'Host' : systemId;
    setActiveSystem(systemId, systemName);
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
    <PageStage className="space-y-6">
      {/* ObsidianUI Sistem Kartı */}
      <MotionItem staggerIndex={0}>
        <section className="card p-6 sm:p-7 space-y-6">
          {/* Başlık & Araçlar (Header & Tools) */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                <span>{t('systems.allSystems')}</span>
                <span className="font-mono text-xs font-semibold text-[var(--cloud-200)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1">
                  {t('systems.systemsCount', {
                    filtered: String(filteredSystems.length),
                    total: String(systems.length)
                  })}
                </span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {t('systems.allSystemsDesc')}
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
              {/* Hızlı Filtreleme Kutusu */}
              <div className="relative flex-1 sm:w-56 lg:w-60">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('systems.filterPlaceholder')}
                  className="input w-full h-10 pl-9 font-sans text-xs"
                />
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Görüntüle (Sütun Seçici Menü) */}
              <SystemsColumnsMenu
                visibleColumns={visibleColumns}
                onToggleColumn={handleToggleColumn}
              />

              {/* Yenile Butonu */}
              <Button
                variant="secondary"
                onClick={refresh}
                disabled={isLoading}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--cloud-200)]' : ''}`} />}
              >
                <span className="hidden sm:inline">{t('common.refresh')}</span>
              </Button>

              {/* Sistem Ekle Butonu */}
              {effectiveIsAdmin && (
                <Button
                  variant="primary"
                  onClick={() => setIsAddOpen(true)}
                  icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                >
                  <span>{t('systems.addSystemButton')}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Tablo Alanı */}
          {filteredSystems.length === 0 ? (
            <SystemsEmptyState
              onAddClick={() => setIsAddOpen(true)}
              isAdmin={effectiveIsAdmin}
            />
          ) : (
            <SystemsTable
              systems={filteredSystems}
              onSelectSystem={handleSelectSystem}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSortByChange={handleSortChange}
              visibleColumns={visibleColumns}
              onEditSystem={effectiveIsAdmin ? setEditingSystem : undefined}
              onTogglePauseSystem={effectiveIsAdmin ? handleTogglePause : undefined}
              onDeleteSystem={effectiveIsAdmin ? setDeletingSystem : undefined}
            />
          )}

          {/* Footer Dipnot */}
          <div className="text-right text-[var(--text-muted)] text-xs pt-1 select-none font-mono">
            {t('systems.footerNote')}
          </div>
        </section>
      </MotionItem>

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
    </PageStage>
  );
};

export default SystemsPage;
