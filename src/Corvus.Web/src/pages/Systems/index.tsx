import React, { useState } from 'react';
import { useSystemsPageState } from './useSystemsPageState';
import { SystemsNavbar } from './SystemsNavbar';
import { SystemsAlertBanner } from './SystemsAlertBanner';
import { SystemsTable } from './SystemsTable';
import { SystemsEmptyState } from './SystemsEmptyState';
import { SystemsEngineBadge } from './SystemsEngineBadge';
import { AddSystemSheet } from './AddSystemSheet';
import { SystemDetailPageView } from './SystemDetailPageView';

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
    sortBy,
    setSortBy,
    isAddOpen,
    setIsAddOpen,
    selectedSystemId,
    setSelectedSystemId,
    refresh
  } = useSystemsPageState();

  const [dismissAlert, setDismissAlert] = useState(false);

  // Eşik aşımı uyarısı (Örn: Burhan-Server Disk Kullanımı %65 aşıyor gibi Beszel banner'ı)
  const alertSystem = systems.find(s => {
    const diskUsed = s.currentDiskUsedBytes ?? 0;
    const diskTotal = s.currentDiskTotalBytes ?? 1;
    const diskPct = (diskUsed / diskTotal) * 100;
    return diskPct > 65 || (s.currentCpuPercent ?? 0) > 85;
  });

  // KATMAN 2: Eğer bir sisteme tıklandıysa, doğrudan o sistemin detay görünümünü aç
  if (selectedSystemId) {
    return (
      <div className="min-h-screen bg-[#0d0e15] text-[#eceef6]">
        <SystemDetailPageView
          systemId={selectedSystemId}
          onBack={() => setSelectedSystemId(null)}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  // KATMAN 1: BESZEL İLHAMLI İLK AÇILIŞ - TÜM SİSTEMLER GİRİŞ EKRANI (TAM EKRAN, SİDEBAR'SIZ)
  return (
    <div className="min-h-screen bg-[#0d0e15] text-[#eceef6] flex flex-col">
      {/* Üst Bar: Corvus Logo + Arama Çubuğu + Araçlar + "+ Sistem Ekle" */}
      <SystemsNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={refresh}
        isLoading={isLoading}
        onAddClick={() => setIsAddOpen(true)}
        isAdmin={isAdmin}
        alertCount={alertSystem ? 1 : 0}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Beszel Tarzı Aktif Eşik / Uyarı Banner'ı */}
        {alertSystem && !dismissAlert && (
          <SystemsAlertBanner
            systemName={alertSystem.name}
            metricName="Disk / Kaynak Kullanımı"
            conditionText="Son 1 dakika içinde %65 sınırını aşıyor"
            onDismiss={() => setDismissAlert(true)}
            onViewAlerts={() => setSelectedSystemId(alertSystem.id)}
          />
        )}

        {/* Tablo Üstü Başlık & Filtreler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h1 className="text-xl font-bold text-[#eceef6] tracking-tight">
              Tüm Sistemler
            </h1>
            <p className="text-xs text-[#9ba0b5] mt-0.5">
              Daha fazla bilgi ve yönetim için bir sisteme tıklayın.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9ba0b5] font-mono">
              {filteredSystems.length}/{systems.length} Sistem
            </span>
          </div>
        </div>

        {/* Sistemler Tablosu (Beszel Ekran Görüntüsü 1'deki Gibi) */}
        {filteredSystems.length === 0 ? (
          <SystemsEmptyState
            onAddClick={() => setIsAddOpen(true)}
            isAdmin={isAdmin}
          />
        ) : (
          <SystemsTable
            systems={filteredSystems}
            onSelectSystem={setSelectedSystemId}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />
        )}

        {/* Motor & Durum Göstergesi Rozeti */}
        <div className="pt-2">
          <SystemsEngineBadge status={status} />
        </div>
      </main>

      {/* Yeni Sistem Ekleme Yan Paneli */}
      <AddSystemSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSystemCreated={refresh}
      />
    </div>
  );
};

export default SystemsPage;
