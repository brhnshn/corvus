import React from 'react';
import { Boxes, CheckSquare, Square } from 'lucide-react';
import type { DockerDfContainerInfo } from '../../../types';
import { formatBytes } from '../../../utils/format';
import { useI18n } from '../../../i18n';

interface PruneContainersTableProps {
  containers: DockerDfContainerInfo[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export const PruneContainersTable: React.FC<PruneContainersTableProps> = ({
  containers,
  selectedIds,
  onToggle,
  onToggleAll
}) => {
  const { t } = useI18n();
  const allSelected = containers.length > 0 && containers.every(c => selectedIds.has(c.id));

  if (containers.length === 0) {
    return (
      <div className="p-8 text-center bg-[#131620] border border-[#2a2e3f] rounded-xl text-xs text-[#9ca3af]">
        <Boxes className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
        <p className="font-medium text-[#e5e7eb]">{t('containers.noPrunableContainersTitle') || 'Durdurulmuş Konteyner Yok'}</p>
        <p className="mt-1 text-[11px] text-[#9ca3af]/80">
          {t('containers.noPrunableContainersDesc') || 'Sistemde temizlenebilecek durdurulmuş veya artık bir konteyner bulunmuyor.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
        <span className="text-[11px]">
          {containers.length} {t('containers.containersFound') || 'durdurulmuş konteyner bulundu'} ({selectedIds.size} {t('containers.selected') || 'seçili'})
        </span>
        <button
          type="button"
          onClick={onToggleAll}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1d29] hover:bg-[#252837] border border-[#2a2e3f] text-xs text-[#e5e7eb] transition-colors cursor-pointer"
        >
          {allSelected ? (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('containers.deselectAll') || 'Seçimi Kaldır'}</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5 text-[#9ca3af]" />
              <span>{t('containers.selectAll') || 'Tümünü Seç'}</span>
            </>
          )}
        </button>
      </div>

      <div className="border border-[#2a2e3f] rounded-xl overflow-hidden bg-[#131620] max-h-60 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1a1d29] text-[#9ca3af] sticky top-0 border-b border-[#2a2e3f]">
            <tr>
              <th className="py-2.5 px-3 w-10"></th>
              <th className="py-2.5 px-3">{t('containers.pruneColName')}</th>
              <th className="py-2.5 px-3">{t('containers.image')}</th>
              <th className="py-2.5 px-3">{t('containers.pruneColStatus')}</th>
              <th className="py-2.5 px-3 text-right">{t('containers.pruneColReclaimable')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2e3f]">
            {containers.map((c) => {
              const isChecked = selectedIds.has(c.id);
              const displayName = (c.names?.[0] || c.id.substring(0, 12)).replace(/^\//, '');
              return (
                <tr
                  key={c.id}
                  onClick={() => onToggle(c.id)}
                  className={`cursor-pointer transition-colors ${
                    isChecked ? 'bg-indigo-500/10 hover:bg-indigo-500/15' : 'hover:bg-[#1a1d29]'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(c.id)}
                      className="rounded border-[#2a2e3f] bg-[#0f1117] text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#e5e7eb] truncate max-w-[140px]">
                    {displayName}
                  </td>
                  <td className="py-2.5 px-3 text-[#9ca3af] truncate max-w-[130px] font-mono text-[11px]">
                    {c.image || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-[#9ca3af] text-[11px]">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-300">
                      {c.status || c.state || 'exited'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-400">
                    {formatBytes(c.sizeRw || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
