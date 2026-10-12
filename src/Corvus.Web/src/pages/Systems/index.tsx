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

import { api, invalidateCache } from '../../api';

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
  onNavigate
}) => {
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
    <div className="space-y-4 animate-rv">
      {/* Genişletilmiş HTML Mockup Stili Ana Kart */}
      <section className="bg-[#12131e] border border-[#242637] rounded-3xl p-6 sm:p-7 shadow-2xl">
        {/* Başlık & Araçlar (Header & Tools) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-[#eceef5] flex items-center gap-3">
              <span>{t('systems.allSystems')}</span>
              <span className="font-mono text-xs font-normal text-[#7c7cff] bg-[#1a1b30] border border-[#2a2c4d] rounded-lg px-2.5 py-1">
                {t('systems.systemsCount', {
                  filtered: String(filteredSystems.length),
                  total: String(systems.length)
                })}
              </span>
            </h1>
            <p className="text-sm text-[#8b90a7] mt-1.5">
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
                className="w-full h-11 px-3.5 py-2 pl-9 rounded-xl bg-[#0d0e17] border border-[#242637] focus:border-[#7c7cff] focus:outline-none text-sm text-[#eceef5] placeholder:text-[#8b90a7] transition-all"
              />
              <Search className="w-4 h-4 text-[#8b90a7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Görüntüle (Sütun Seçici Menü) */}
            <SystemsColumnsMenu
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
            />

            {/* Yenile Butonu */}
            <button
              type="button"
              onClick={refresh}
              disabled={isLoading}
              className="h-11 px-3.5 flex items-center gap-2 bg-[#0d0e17] border border-[#242637] hover:border-white/20 rounded-xl text-sm font-semibold text-[#eceef5] hover:bg-[#171929] transition-all cursor-pointer disabled:opacity-50"
              aria-label={t('common.refresh')}
              title={t('common.refresh')}
            >
              <RefreshCw className={`w-4 h-4 text-[#8b90a7] ${isLoading ? 'animate-spin text-[#7c7cff]' : ''}`} />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </button>

            {/* Sistem Ekle Butonu */}
            {isAdmin && (
              <Button
                variant="primary"
                onClick={() => setIsAddOpen(true)}
                icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                className="h-11 px-4"
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
            isAdmin={isAdmin}
          />
        ) : (
          <SystemsTable
            systems={filteredSystems}
            onSelectSystem={handleSelectSystem}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortByChange={handleSortChange}
            visibleColumns={visibleColumns}
            onEditSystem={isAdmin ? setEditingSystem : undefined}
            onTogglePauseSystem={isAdmin ? handleTogglePause : undefined}
            onDeleteSystem={isAdmin ? setDeletingSystem : undefined}
          />
        )}

        {/* Footer Dipnot */}
        <div className="text-right text-[#8b90a7] text-xs mt-3.5 select-none font-mono">
          {t('systems.footerNote')}
        </div>
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
