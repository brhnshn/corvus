import React from 'react';
import { useSystemsPageState } from './useSystemsPageState';
import { SystemsHeader } from './SystemsHeader';
import { SystemsKpis } from './SystemsKpis';
import { SystemsFilterBar } from './SystemsFilterBar';
import { SystemRow } from './SystemRow';
import { SystemsEmptyState } from './SystemsEmptyState';
import { SystemsEngineBadge } from './SystemsEngineBadge';
import { AddSystemSheet } from './AddSystemSheet';
import { SystemDetailModal } from './SystemDetailModal';

interface SystemsPageProps {
  isAdmin?: boolean;
}

export const SystemsPage: React.FC<SystemsPageProps> = ({ isAdmin = true }) => {
  const {
    systems,
    filteredSystems,
    status,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    isAddOpen,
    setIsAddOpen,
    selectedSystemId,
    setSelectedSystemId,
    refresh
  } = useSystemsPageState();

  const onlineCount = systems.filter(s => s.status === 'online').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Üst Başlık & Eylem Çubuğu */}
      <SystemsHeader
        totalCount={systems.length}
        onlineCount={onlineCount}
        onRefresh={refresh}
        onAddClick={() => setIsAddOpen(true)}
        isLoading={isLoading}
        isAdmin={isAdmin}
      />

      {/* KPI Özet Kartları */}
      <SystemsKpis systems={systems} />

      {/* Filtre ve Arama Alanı */}
      <SystemsFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {/* Sistemler Listesi veya Boş Durum */}
      {filteredSystems.length === 0 ? (
        <SystemsEmptyState
          onAddClick={() => setIsAddOpen(true)}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredSystems.map(system => (
            <SystemRow
              key={system.id}
              system={system}
              onSelect={setSelectedSystemId}
            />
          ))}
        </div>
      )}

      {/* Motor & Bellek Göstergesi Alt Bilgi Rozeti */}
      <SystemsEngineBadge status={status} />

      {/* Yeni Sistem Ekleme Yan Paneli */}
      <AddSystemSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSystemCreated={refresh}
      />

      {/* Sistem Detay Modal */}
      {selectedSystemId && (
        <SystemDetailModal
          systemId={selectedSystemId}
          onClose={() => setSelectedSystemId(null)}
          onSystemDeleted={() => {
            setSelectedSystemId(null);
            refresh();
          }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

export default SystemsPage;
