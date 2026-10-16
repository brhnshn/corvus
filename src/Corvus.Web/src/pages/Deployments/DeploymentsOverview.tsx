import React from 'react';
import { Rocket, CheckCircle2, Clock, Activity } from 'lucide-react';
import { useI18n } from '../../i18n';

interface DeploymentsOverviewProps {
  stats: {
    total: number;
    successRate: number;
    active: number;
    avgDurationMs: number;
  };
}

export const DeploymentsOverview: React.FC<DeploymentsOverviewProps> = ({ stats }) => {
  const { t } = useI18n();

  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) return '-';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    const secs = (ms / 1000).toFixed(1);
    return `${secs} s`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Toplam Dağıtım */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-sm">
        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Rocket className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t('deployments.statTotalDeployments')}
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {stats.total}
          </div>
        </div>
      </div>

      {/* Başarı Oranı */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-sm">
        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t('deployments.statSuccessRate')}
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {stats.total > 0 ? `${stats.successRate.toFixed(1)}%` : '-'}
          </div>
        </div>
      </div>

      {/* Aktif Dağıtımlar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-sm">
        <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t('deployments.statActiveDeployments')}
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {stats.active}
          </div>
        </div>
      </div>

      {/* Ortalama Süre */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-sm">
        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t('deployments.statAvgDuration')}
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {formatDuration(stats.avgDurationMs)}
          </div>
        </div>
      </div>
    </div>
  );
};
