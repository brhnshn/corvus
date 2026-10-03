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
          <Globe className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {t('containers.portsTitle')}
          </h4>
        </div>

        {portEntries.length === 0 ? (
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
            {t('containers.noPorts')}
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
            <div className="divide-y divide-slate-800/80 font-mono text-xs">
              {portEntries.map(([containerPortProto, hostBindings]) => {
                const [cPort, proto] = containerPortProto.split('/');
                const bindings = hostBindings && hostBindings.length > 0 ? hostBindings : null;

                return (
                  <div
                    key={containerPortProto}
                    className="p-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-400">Container:</span>
                      <span className="font-semibold text-slate-200">
                        {cPort}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase rounded bg-slate-800 text-slate-400">
                        {proto || 'tcp'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
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
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors"
                            >
                              <span>{hostIp}:{hostPort}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          );
                        })
                      ) : (
                        <span className="text-slate-500 italic">No host port bound</span>
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
          <Network className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {t('containers.networksTitle')}
          </h4>
        </div>

        {networkEntries.length === 0 ? (
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
            {t('containers.noNetworks')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {networkEntries.map(([netName, netDetails]) => (
              <div
                key={netName}
                className="p-3.5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 font-mono">{netName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {netDetails.networkId ? netDetails.networkId.substring(0, 12) : ''}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">IP Address:</span>
                    <span>{netDetails.ipAddress || inspect.networkSettings?.ipAddress || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gateway:</span>
                    <span>{netDetails.gateway || inspect.networkSettings?.gateway || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MAC:</span>
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
