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
      <div className="p-8 text-center surface border border-white/10 rounded-2xl text-xs text-[#9ba0b5]">
        <Boxes className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
        <p className="font-medium text-[#eceef6]">{t('containers.noPrunableContainersTitle') || 'Durdurulmuş Konteyner Yok'}</p>
        <p className="mt-1 text-[11px] text-[#9ba0b5]/80">
          {t('containers.noPrunableContainersDesc') || 'Sistemde temizlenebilecek durdurulmuş veya artık bir konteyner bulunmuyor.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[#9ba0b5]">
        <span className="text-[11px]">
          {containers.length} {t('containers.containersFound') || 'durdurulmuş konteyner bulundu'} ({selectedIds.size} {t('containers.selected') || 'seçili'})
        </span>
        <button
          type="button"
          onClick={onToggleAll}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-[#eceef6] transition-colors cursor-pointer"
        >
          {allSelected ? (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-[#d5d5dc]" />
              <span>{t('containers.deselectAll') || 'Seçimi Kaldır'}</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5 text-[#9ba0b5]" />
              <span>{t('containers.selectAll') || 'Tümünü Seç'}</span>
            </>
          )}
        </button>
      </div>

      <div className="border border-white/10 rounded-2xl overflow-hidden surface max-h-60 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.02] text-[#9ba0b5] sticky top-0 border-b border-white/10">
            <tr>
              <th className="py-2.5 px-3 w-10"></th>
              <th className="py-2.5 px-3">{t('containers.pruneColName')}</th>
              <th className="py-2.5 px-3">{t('containers.image')}</th>
              <th className="py-2.5 px-3">{t('containers.pruneColStatus')}</th>
              <th className="py-2.5 px-3 text-right">{t('containers.pruneColReclaimable')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {containers.map((c) => {
              const isChecked = selectedIds.has(c.id);
              const displayName = (c.names?.[0] || c.id.substring(0, 12)).replace(/^\//, '');
              return (
                <tr
                  key={c.id}
                  onClick={() => onToggle(c.id)}
                  className={`cursor-pointer transition-colors ${
                    isChecked ? 'bg-white/[0.08] hover:bg-white/[0.12]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(c.id)}
                      className="rounded border-white/20 bg-white/5 text-[#eceef6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#eceef6] truncate max-w-[140px]">
                    {displayName}
                  </td>
                  <td className="py-2.5 px-3 text-[#9ba0b5] truncate max-w-[130px] font-mono text-[11px]">
                    {c.image || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-[#9ba0b5] text-[11px]">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#d5d5dc]">
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
