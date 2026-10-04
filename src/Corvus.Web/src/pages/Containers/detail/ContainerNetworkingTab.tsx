import React from 'react';
import { useI18n } from '../../../i18n';
import { Globe, ArrowRight, ExternalLink, Network } from 'lucide-react';
import type { DockerContainerInspectInfo } from '../../../types';

interface ContainerNetworkingTabProps {
  inspect: DockerContainerInspectInfo;
}

export const ContainerNetworkingTab: React.FC<ContainerNetworkingTabProps> = ({ inspect }) => {
  const { t } = useI18n();

  const portsMap = inspect.networkSettings?.ports || inspect.hostConfig?.portBindings || {};
  const portEntries = Object.entries(portsMap);

  const networksMap = inspect.networkSettings?.networks || {};
  const networkEntries = Object.entries(networksMap);

  return (
    <div className="space-y-6">
      {/* Port Mappings Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#d5d5dc]" />
          <h4 className="text-xs font-bold text-[#eceef6] uppercase tracking-wider">
            {t('containers.portsTitle')}
          </h4>
        </div>

        {portEntries.length === 0 ? (
          <div className="p-5 surface border border-white/10 rounded-2xl text-center text-xs text-[#9ba0b5]">
            {t('containers.noPorts')}
          </div>
        ) : (
          <div className="border border-white/10 rounded-2xl overflow-hidden surface">
            <div className="divide-y divide-white/10 font-mono text-xs">
              {portEntries.map(([containerPortProto, hostBindings]) => {
                const [cPort, proto] = containerPortProto.split('/');
                const bindings = hostBindings && hostBindings.length > 0 ? hostBindings : null;

                return (
                  <div
                    key={containerPortProto}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[#9ba0b5]">Konteyner:</span>
                      <span className="font-semibold text-[#eceef6]">
                        {cPort}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-white/[0.08] text-[#eceef6]">
                        {proto || 'tcp'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-[#9ba0b5]" />
                      {bindings ? (
                        bindings.map((b, idx) => {
                          const hostIp = b.hostIp || '0.0.0.0';
                          const hostPort = b.hostPort;
                          const accessUrl = `http://${hostIp === '0.0.0.0' ? window.location.hostname : hostIp}:${hostPort}`;
                          return (
                            <a
                              key={idx}
                              href={accessUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#eceef6] bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 rounded-xl transition-colors cursor-pointer"
                            >
                              <span>{hostIp}:{hostPort}</span>
                              <ExternalLink className="w-3 h-3 text-[#9ba0b5]" />
                            </a>
                          );
                        })
                      ) : (
                        <span className="text-[#9ba0b5]/50 italic">Ana makine portu bağlı değil</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Docker Networks Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-[#34d399]" />
          <h4 className="text-xs font-bold text-[#eceef6] uppercase tracking-wider">
            {t('containers.networksTitle')}
          </h4>
        </div>

        {networkEntries.length === 0 ? (
          <div className="p-5 surface border border-white/10 rounded-2xl text-center text-xs text-[#9ba0b5]">
            {t('containers.noNetworks')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {networkEntries.map(([netName, netDetails]) => (
              <div
                key={netName}
                className="p-4 surface border border-white/10 rounded-2xl space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#eceef6] font-mono">{netName}</span>
                  <span className="text-[10px] text-[#9ba0b5] font-mono">
                    {netDetails.networkId ? netDetails.networkId.substring(0, 12) : ''}
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-[11px] text-[#eceef6]">
                  <div className="flex justify-between">
                    <span className="text-[#9ba0b5]">IP Adresi:</span>
                    <span>{netDetails.ipAddress || inspect.networkSettings?.ipAddress || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9ba0b5]">Ağ Geçidi:</span>
                    <span>{netDetails.gateway || inspect.networkSettings?.gateway || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9ba0b5]">MAC:</span>
                    <span>{netDetails.macAddress || inspect.networkSettings?.macAddress || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
