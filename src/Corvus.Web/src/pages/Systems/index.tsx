import React, { useState } from 'react';
import { useSystemsPageState } from './useSystemsPageState';
import { SystemsNavbar } from './SystemsNavbar';
import { SystemsAlertBanner } from './SystemsAlertBanner';
import { SystemsTable } from './SystemsTable';
import { SystemsEmptyState } from './SystemsEmptyState';
import { AddSystemSheet } from './AddSystemSheet';
import { useI18n } from '../../i18n';
import type { PageId } from '../../components/Sidebar';

interface SystemsPageProps {
  isAdmin?: boolean;
  onNavigate?: (page: PageId, containerId?: string | null, tab?: string | null) => void;
}

export const SystemsPage: React.FC<SystemsPageProps> = ({ isAdmin = true, onNavigate }) => {
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

  const [dismissAlert, setDismissAlert] = useState(false);

  // Eşik aşımı uyarısı (Disk > %65 veya CPU > %85)
  const alertSystem = systems.find(s => {
    const diskUsed = s.currentDiskUsedBytes ?? 0;
    const diskTotal = s.currentDiskTotalBytes ?? 1;
    const diskPct = (diskUsed / diskTotal) * 100;
    return diskPct > 65 || (s.currentCpuPercent ?? 0) > 85;
  });

  const handleSelectSystem = (systemId: string) => {
    localStorage.setItem('corvus_active_system_id', systemId);
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0e15] text-[#eceef6] flex flex-col">
      {/* Üst Bar: Corvus Logo + Canlı Arama + Araçlar + Kullanıcı Ayarları + "+ Sistem Ekle" */}
      <SystemsNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={refresh}
        isLoading={isLoading}
        onAddClick={() => setIsAddOpen(true)}
        onOpenProfile={onNavigate ? () => onNavigate('profile') : undefined}
        isAdmin={isAdmin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Aktif Eşik / Kaynak Kullanım Uyarısı */}
        {alertSystem && !dismissAlert && (
          <SystemsAlertBanner
            systemName={alertSystem.name}
            metricName={t('systems.alert.thresholdExceeded')}
            conditionText={`${alertSystem.name}: CPU > %85 / Disk > %65`}
            onDismiss={() => setDismissAlert(true)}
            onViewAlerts={() => handleSelectSystem(alertSystem.id)}
          />
        )}

        {/* Tablo Üstü Başlık & Sistem Sayacı */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h1 className="text-xl font-bold text-[#eceef6] tracking-tight">
              {t('systems.allSystems')}
            </h1>
            <p className="text-xs text-[#9ba0b5] mt-0.5">
              {t('systems.allSystemsDesc')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9ba0b5] font-mono">
              {t('systems.systemsCount', {
                filtered: String(filteredSystems.length),
                total: String(systems.length)
              })}
            </span>
          </div>
        </div>

        {/* Sistemler Tablosu (Bir sunucuya tıklandığında doğrudan ana Corvus ekranı açılır) */}
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
          />
        )}
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
