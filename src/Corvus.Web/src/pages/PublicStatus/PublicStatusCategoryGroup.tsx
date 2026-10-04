import { useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { PublicService } from '../../types';
import { PublicStatusServiceCard } from './PublicStatusServiceCard';
import { Pill } from '../../components/ui/Pill';

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
    <div className="surface rounded-[22px] overflow-hidden border border-white/10 shadow-sm transition-colors">
      {/* Category Header Accordion Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors text-left cursor-pointer border-b border-white/10"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Layers className="w-4 h-4 text-[#d5d5dc] shrink-0" />
          <h3 className="font-semibold text-[#eceef6] text-sm tracking-tight truncate">
            {category}
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[8px] bg-white/[0.06] border border-white/10 text-[#9ba0b5] font-medium">
            {services.length}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Group health status badge */}
          {isAllOperational ? (
            <Pill status="ok" label={t('publicStatus.allOperationalInGroup') || 'Tümü Operasyonel'} />
          ) : (
            <Pill status="err" label={t('publicStatus.issuesInGroup', { count: issuesCount }) || `${issuesCount} Sorun`} />
          )}

          <ChevronDown
            className={`w-4 h-4 text-[#9ba0b5] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Services List Inside Accordion */}
      {isOpen && (
        <div className="p-3.5 sm:p-4 space-y-2.5 bg-black/10">
          {services.map((service) => (
            <PublicStatusServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
