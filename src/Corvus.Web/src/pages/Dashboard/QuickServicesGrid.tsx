import React, { useState, useMemo } from 'react';
import { 
  Server, 
  Search, 
  ChevronRight, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowUpRight 
} from 'lucide-react';
import { useI18n } from '../../i18n';
import type { Service } from '../../api/client';
import { formatServiceUrl } from '../../utils/url';
import { StatusBadge } from '../../components/StatusBadge';
import { TagBadge } from '../../components/common/TagBadge';

interface QuickServicesGridProps {
  services: Service[];
  onNavigate?: (page: 'services') => void;
}

const MAX_VISIBLE = 8;

export const QuickServicesGrid: React.FC<QuickServicesGridProps> = ({ services, onNavigate }) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Kategorileri çıkar
  const categories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach(s => {
      if (s.category && s.category.trim()) cats.add(s.category.trim());
    });
    return Array.from(cats);
  }, [services]);

  // Filtrelenmiş servisler
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        service.name.toLowerCase().includes(q) ||
        (service.category && service.category.toLowerCase().includes(q)) ||
        (service.url && service.url.toLowerCase().includes(q)) ||
        (service.tags && service.tags.some(tag => tag.toLowerCase().includes(q)));

      const matchCategory = selectedCategory === 'all' || service.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [services, search, selectedCategory]);

  // Arama/filtre yoksa yalnızca MAX_VISIBLE kadar göster
  const isFiltering = search.trim().length > 0 || selectedCategory !== 'all';
  const visibleServices = isFiltering ? filteredServices : filteredServices.slice(0, MAX_VISIBLE);
  const hiddenCount = isFiltering ? 0 : Math.max(0, filteredServices.length - MAX_VISIBLE);


  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d29] border border-[#2a2e3f] space-y-4">
      {/* Header with Title and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#e5e7eb]">
              {t('dashboard.quickServices')}
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#0f1117] border border-[#2a2e3f] text-[#9ca3af]">
              {filteredServices.length} / {services.length}
            </span>
          </div>
          <p className="text-xs text-[#9ca3af] mt-0.5">
            {t('dashboard.quickServicesSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search Input */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0f1117] border border-[#2a2e3f] rounded-xl text-xs text-[#e5e7eb] placeholder-[#6b7280] focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('services')}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-500/10 cursor-pointer shrink-0 transition-colors"
            >
              <span>{t('dashboard.viewAllServices')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills (if more than 1 category) */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#d4d4d8] text-[#0f1117] font-semibold'
                : 'bg-[#0f1117] text-[#9ca3af] hover:text-[#e5e7eb] border border-[#2a2e3f]'
            }`}
          >
            {t('common.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#d4d4d8] text-[#0f1117] font-semibold'
                  : 'bg-[#0f1117] text-[#9ca3af] hover:text-[#e5e7eb] border border-[#2a2e3f]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Services Grid */}
      {visibleServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-[#9ca3af] bg-[#0f1117]/50 rounded-xl border border-dashed border-[#2a2e3f]">
          <Server className="w-8 h-8 text-[#9ca3af]/40 mb-2" />
          <p className="text-xs text-[#9ca3af]">{t('services.noServicesFound')}</p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('services')}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-500 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('dashboard.addService')}</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleServices.map((service) => {
              const finalUrl = formatServiceUrl(service.url);

              return (
                <div
                  key={service.id}
                  className="group relative p-3.5 rounded-xl bg-[#0f1117] border border-[#2a2e3f] hover:border-[#3b4252] hover:bg-[#141724] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Icon & Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] flex items-center justify-center shrink-0 overflow-hidden text-sm font-bold text-indigo-400">
                          {service.icon ? (
                            service.icon.startsWith('http') || service.icon.startsWith('/') ? (
                              <img 
                                src={service.icon} 
                                alt={service.name} 
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{service.icon.slice(0, 2).toUpperCase()}</span>
                            )
                          ) : (
                            <Server className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-xs text-[#e5e7eb] truncate group-hover:text-white transition-colors">
                              {service.name}
                            </h3>
                          </div>
                          {service.category && (
                            <span className="text-[10px] text-[#9ca3af] bg-[#1a1d29] px-1.5 py-0.5 rounded border border-[#2a2e3f]/60 inline-block truncate max-w-full">
                              {service.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <StatusBadge status={service.status} />
                    </div>

                    {/* URL / Port info */}
                    <div className="text-[11px] font-mono text-[#9ca3af] truncate mt-1">
                      {service.port ? (
                        <span>Port: {service.port}</span>
                      ) : service.url ? (
                        <span className="truncate">{service.url.replace(/^https?:\/\//, '')}</span>
                      ) : (
                        <span>{service.source === 'docker' ? 'Docker' : 'Manuel'}</span>
                      )}
                    </div>

                    {/* Tags */}
                    {service.tags && service.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {service.tags.slice(0, 3).map((tag) => (
                          <TagBadge key={tag} tag={tag} size="sm" />
                        ))}
                        {service.tags.length > 3 && (
                          <span className="text-[9px] font-mono text-[#9ca3af] px-1 py-0.2 bg-[#1a1d29] rounded">
                            +{service.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="mt-3 pt-2.5 border-t border-[#2a2e3f]/60 flex items-center justify-between text-[11px]">
                    {/* SSL Indicator if available */}
                    {typeof service.sslExpiryDays === 'number' ? (
                      <span className={`flex items-center gap-1 text-[10px] font-mono ${
                        service.sslExpiryDays <= 14 ? 'text-amber-400' : 'text-emerald-400/80'
                      }`}>
                        {service.sslExpiryDays <= 14 ? (
                          <ShieldAlert className="w-3 h-3" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        <span>{service.sslExpiryDays}d</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#6b7280]">
                        {service.checkType ? service.checkType.toUpperCase() : 'HTTP'}
                      </span>
                    )}

                    {finalUrl ? (
                      <a
                        href={finalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-200 transition-colors"
                      >
                        <span>{t('dashboard.quickLaunch')}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-[#6b7280]">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* "X servis daha" butonu — yalnızca filtre yokken göster */}
          {hiddenCount > 0 && onNavigate && (
            <div className="pt-1 text-center border-t border-[#2a2e3f]/60">
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="inline-flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#e5e7eb] font-mono transition-colors cursor-pointer"
              >
                <span>+{hiddenCount} {t('dashboard.moreServices')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
