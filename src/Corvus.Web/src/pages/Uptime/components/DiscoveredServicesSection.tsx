import React, { useState } from 'react';
import { Layers, Search, Server, Zap, Globe } from 'lucide-react';
import type { Service } from '../../../types';
import { useI18n } from '../../../i18n';

interface DiscoveredServicesSectionProps {
  unmonitoredServices: Service[];
  onEnableUptime: (service: Service) => void;
}

export const DiscoveredServicesSection: React.FC<DiscoveredServicesSectionProps> = ({
  unmonitoredServices,
  onEnableUptime
}) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [onlyWithDomain, setOnlyWithDomain] = useState(true);

  const domainServices = unmonitoredServices.filter((s) => !!s.url && s.url.startsWith('http'));
  const baseList = onlyWithDomain ? domainServices : unmonitoredServices;

  const filtered = baseList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(search.toLowerCase())) ||
    (s.url && s.url.toLowerCase().includes(search.toLowerCase()))
  );

  if (unmonitoredServices.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#14161f] border border-[#2a2e3f] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#2a2e3f] bg-[#1a1d29]/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#e5e7eb] flex items-center gap-2">
              <span>{t('uptime.discoveredContainers')}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal">
                {unmonitoredServices.length}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {domainServices.length} web
              </span>
            </h3>
            <p className="text-xs text-[#9ca3af]">
              {t('uptime.discoveredContainersDesc')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Domain Only Toggle Button */}
          <button
            type="button"
            onClick={() => setOnlyWithDomain(!onlyWithDomain)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
              onlyWithDomain
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                : 'bg-[#1a1d29] text-[#9ca3af] border-[#2a2e3f] hover:text-[#e5e7eb]'
            }`}
            title="Yalnızca domain/web bağlantısı olanları göster"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('uptime.domainOnlyWeb')}</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] text-[#e5e7eb] text-xs focus:outline-none focus:border-indigo-500 transition-colors w-40 sm:w-44"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-2.5 py-1.5 rounded-xl text-xs text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#2a2e3f]/40 transition-colors cursor-pointer"
          >
            {isOpen ? 'Gizle' : 'Göster'}
          </button>
        </div>
      </div>

      {/* Grid List */}
      {isOpen && (
        <div className="p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#9ca3af] space-y-2">
              <p>
                {onlyWithDomain && domainServices.length === 0
                  ? t('uptime.noDiscoveredWithDomain')
                  : 'Aramanızla eşleşen keşfedilmiş servis bulunamadı.'}
              </p>
              {onlyWithDomain && (
                <button
                  type="button"
                  onClick={() => setOnlyWithDomain(false)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
                >
                  {t('uptime.clearFilter')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filtered.map((service) => (
                <div
                  key={service.id}
                  className="p-4 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] hover:border-[#383d54] transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#242838] border border-[#34394f] flex items-center justify-center text-xs font-bold text-[#d4d4d8] shrink-0">
                        {service.icon ? (
                          <span>{service.icon}</span>
                        ) : (
                          <Server className="w-4 h-4 text-[#9ca3af]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#e5e7eb] truncate group-hover:text-indigo-400 transition-colors">
                          {service.name}
                        </h4>
                        <span className="text-[11px] text-[#9ca3af] truncate block">
                          {service.category || 'Docker'}
                        </span>
                      </div>
                    </div>

                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      {service.status === 'healthy' ? 'running' : service.status}
                    </span>
                  </div>

                  {/* Target Details */}
                  <div className="text-[11px] font-mono text-[#9ca3af]/80 bg-[#14161f] px-2.5 py-1.5 rounded-lg border border-[#2a2e3f]/60 truncate">
                    {service.url || (service.port ? `Port: ${service.port}` : 'İç Ağ Konteyneri')}
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() => onEnableUptime(service)}
                    className="w-full py-1.5 px-3 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>İzlemeye Al</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
