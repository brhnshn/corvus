import React, { useState } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { ServiceIncident } from '../../types';
import { AddIncidentModal } from './components/AddIncidentModal';
import { useIncidents } from './incidents/useIncidents';
import { IncidentsToolbar } from './incidents/IncidentsToolbar';
import { IncidentCard } from './incidents/IncidentCard';

export const IncidentsTab: React.FC = () => {
  const { t } = useI18n();

  const {
    incidents,
    loading,
    error,
    subFilter,
    setSubFilter,
    fetchIncidents,
    handleResolve,
    handleDelete,
    activeIncidents,
    resolvedIncidents,
    filteredIncidents,
  } = useIncidents();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<ServiceIncident | null>(null);

  const openCreateModal = () => {
    setSelectedIncident(null);
    setIsModalOpen(true);
  };

  const openEditModal = (inc: ServiceIncident) => {
    setSelectedIncident(inc);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <IncidentsToolbar
        subFilter={subFilter}
        onSubFilterChange={setSubFilter}
        totalCount={incidents.length}
        activeCount={activeIncidents.length}
        resolvedCount={resolvedIncidents.length}
        loading={loading}
        onRefresh={fetchIncidents}
        onCreate={openCreateModal}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Incidents List */}
      {loading && incidents.length === 0 ? (
        <div className="text-center py-16 text-[#9ba0b5] flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#d5d5dc]" />
          <p className="text-sm">{t('common.loading')}</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="text-center py-16 surface border border-white/10 rounded-2xl p-8 space-y-3">
          <Info className="w-10 h-10 text-[#9ba0b5] mx-auto opacity-50" />
          <h4 className="text-sm font-semibold text-[#eceef6]">
            {subFilter === 'resolved' ? t('incidents.noResolvedIncidents') : t('incidents.noActiveIncidents')}
          </h4>
          <p className="text-xs text-[#9ba0b5] max-w-sm mx-auto">
            {t('incidents.subtitle')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onResolve={handleResolve}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Incident Modal */}
      <AddIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchIncidents}
        incident={selectedIncident}
      />
    </div>
  );
};
