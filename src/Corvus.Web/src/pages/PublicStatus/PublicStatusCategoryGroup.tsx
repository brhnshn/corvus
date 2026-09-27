import { useState } from 'react';
import { ChevronDown, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { PublicService } from '../../types';
import { PublicStatusServiceCard } from './PublicStatusServiceCard';

interface PublicStatusCategoryGroupProps {
  category: string;
  services: PublicService[];
  defaultOpen?: boolean;
}

export function PublicStatusCategoryGroup({
  category,
  services,
  defaultOpen = true
}: PublicStatusCategoryGroupProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const issuesCount = services.filter(
    (s) => s.status === 'down' || s.status === 'degraded'
  ).length;
  const isAllOperational = issuesCount === 0;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 overflow-hidden shadow-sm transition-colors">
      {/* Category Header Accordion Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 bg-slate-900/50 hover:bg-slate-800/40 transition-colors text-left cursor-pointer border-b border-slate-800/40"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
          <h3 className="font-semibold text-white text-base tracking-tight truncate">
            {category}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-slate-400 font-medium">
            {services.length}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Group health status badge */}
          {isAllOperational ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('publicStatus.allOperationalInGroup')}</span>
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t('publicStatus.issuesInGroup', { count: issuesCount })}</span>
            </span>
          )}

          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Services List in Category */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-3 bg-slate-950/40">
          {services.map((svc) => (
            <PublicStatusServiceCard key={svc.id} service={svc} />
          ))}
        </div>
      )}
    </div>
  );
}
