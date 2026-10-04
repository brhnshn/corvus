import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  RefreshCw, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Wrench, 
  Pin, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Trash2, 
  Check 
} from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import type { ServiceIncident } from '../../types';
import { AddIncidentModal } from './components/AddIncidentModal';

export const IncidentsTab: React.FC = () => {
  const { t } = useI18n();
  const [incidents, setIncidents] = useState<ServiceIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<ServiceIncident | null>(null);

  // Sub-filter: 'all' | 'active' | 'resolved'
  const [subFilter, setSubFilter] = useState<'all' | 'active' | 'resolved'>('all');

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleResolve = async (id: string) => {
    if (!window.confirm(t('incidents.confirmResolve'))) return;
    try {
      await api.resolveIncident(id);
      fetchIncidents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('incidents.confirmDelete'))) return;
    try {
      await api.deleteIncident(id);
      fetchIncidents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const openCreateModal = () => {
    setSelectedIncident(null);
    setIsModalOpen(true);
  };

  const openEditModal = (inc: ServiceIncident) => {
    setSelectedIncident(inc);
    setIsModalOpen(true);
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-rose-500/30',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: <AlertOctagon className="w-4 h-4 text-rose-400" />
        };
      case 'maintenance':
        return {
          border: 'border-purple-500/30',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: <Wrench className="w-4 h-4 text-purple-400" />
        };
      case 'warning':
        return {
          border: 'border-amber-500/30',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />
        };
      case 'info':
      default:
        return {
          border: 'border-sky-500/30',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          icon: <Info className="w-4 h-4 text-sky-400" />
        };
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical':
        return t('incidents.severities.critical');
      case 'warning':
        return t('incidents.severities.warning');
      case 'maintenance':
        return t('incidents.severities.maintenance');
      case 'info':
      default:
        return t('incidents.severities.info');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'investigating':
        return t('incidents.statuses.investigating');
      case 'identified':
        return t('incidents.statuses.identified');
      case 'monitoring':
        return t('incidents.statuses.monitoring');
      case 'resolved':
        return t('incidents.statuses.resolved');
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

  const filteredIncidents = subFilter === 'active' 
    ? activeIncidents 
    : subFilter === 'resolved' 
    ? resolvedIncidents 
    : incidents;

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl surface border border-white/10">
        <div className="flex items-center gap-2">
          {/* Sub filter buttons */}
          <button
            onClick={() => setSubFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              subFilter === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#9ba0b5] hover:text-[#eceef6] bg-white/[0.04] border border-white/10'
            }`}
          >
            {t('common.all')} ({incidents.length})
          </button>
          <button
            onClick={() => setSubFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              subFilter === 'active'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#9ba0b5] hover:text-[#eceef6] bg-white/[0.04] border border-white/10'
            }`}
          >
            {t('incidents.activeTab')} ({activeIncidents.length})
          </button>
          <button
            onClick={() => setSubFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              subFilter === 'resolved'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#9ba0b5] hover:text-[#eceef6] bg-white/[0.04] border border-white/10'
            }`}
          >
            {t('incidents.resolvedTab')} ({resolvedIncidents.length})
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#d5d5dc]' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-black hover:bg-[#eceef6] rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('incidents.newIncident')}
          </button>
        </div>
      </div>

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
          {filteredIncidents.map((incident) => {
            const style = getSeverityStyle(incident.severity);
            const isResolved = incident.status === 'resolved';

            return (
              <div
                key={incident.id}
                className={`p-5 rounded-2xl surface border ${style.border} space-y-3 shadow-sm transition-all`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="p-1.5 rounded-xl bg-white/[0.06] border border-white/10">
                      {style.icon}
                    </span>
                    <h3 className="font-bold text-base text-[#eceef6]">
                      {incident.title}
                    </h3>
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${style.badge}`}>
                      {getSeverityText(incident.severity)}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                        isResolved
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/[0.08] text-[#d5d5dc] border-white/15'
                      }`}
                    >
                      {getStatusText(incident.status)}
                    </span>
                    {incident.isPinned && (
                      <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Pin className="w-3 h-3" />
                        {t('incidents.pinnedBadge')}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {!isResolved && (
                      <button
                        onClick={() => handleResolve(incident.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                        title={t('incidents.resolve')}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('incidents.resolve')}</span>
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(incident)}
                      className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer"
                      title={t('common.edit')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(incident.id)}
                      className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-[#9ba0b5] hover:text-rose-300 transition-colors cursor-pointer"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-[#9ba0b5] leading-relaxed whitespace-pre-line break-words pl-0 sm:pl-10">
                  {incident.message}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#9ba0b5] pt-2 border-t border-white/10 pl-0 sm:pl-10">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#9ba0b5]" />
                    {t('incidents.createdAt')}: {formatDate(incident.createdAt)}
                  </span>
                  {incident.resolvedAt && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('incidents.resolvedAt')}: {formatDate(incident.resolvedAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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
