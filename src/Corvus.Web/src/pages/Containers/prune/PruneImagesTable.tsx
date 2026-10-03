import React from 'react';
import { Layers, CheckSquare, Square } from 'lucide-react';
import type { DockerDfImageInfo } from '../../../types';
import { formatBytes } from '../../../utils/format';
import { useI18n } from '../../../i18n';

interface PruneImagesTableProps {
  images: DockerDfImageInfo[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export const PruneImagesTable: React.FC<PruneImagesTableProps> = ({
  images,
  selectedIds,
  onToggle,
  onToggleAll
}) => {
  const { t } = useI18n();
  const allSelected = images.length > 0 && images.every(img => selectedIds.has(img.id));

  if (images.length === 0) {
    return (
      <div className="p-8 text-center bg-[#131620] border border-[#2a2e3f] rounded-xl text-xs text-[#9ca3af]">
        <Layers className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
        <p className="font-medium text-[#e5e7eb]">{t('containers.noPrunableImagesTitle') || 'Kullanılmayan İmaj Yok'}</p>
        <p className="mt-1 text-[11px] text-[#9ca3af]/80">
          {t('containers.noPrunableImagesDesc') || 'Sistemde silinebilecek askıda veya boşta bir Docker imajı bulunmuyor.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
        <span className="text-[11px]">
          {images.length} {t('containers.imagesFound') || 'kullanılmayan imaj'} ({selectedIds.size} {t('containers.selected') || 'seçili'})
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
              <th className="py-2.5 px-3">{t('containers.pruneColImageTag')}</th>
              <th className="py-2.5 px-3">{t('containers.pruneColStatus')}</th>
              <th className="py-2.5 px-3 text-right">{t('containers.pruneColSize')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2e3f]">
            {images.map((img) => {
              const isChecked = selectedIds.has(img.id);
              const isDangling = !img.repoTags || img.repoTags.length === 0 || img.repoTags.includes('<none>:<none>');
              const tagText = isDangling ? (img.id.replace('sha256:', '').substring(0, 12)) : img.repoTags?.join(', ');

              return (
                <tr
                  key={img.id}
                  onClick={() => onToggle(img.id)}
                  className={`cursor-pointer transition-colors ${
                    isChecked ? 'bg-indigo-500/10 hover:bg-indigo-500/15' : 'hover:bg-[#1a1d29]'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(img.id)}
                      className="rounded border-[#2a2e3f] bg-[#0f1117] text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[#e5e7eb] truncate max-w-[200px]">
                    {tagText}
                  </td>
                  <td className="py-2.5 px-3">
                    {isDangling ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-medium">
                        {t('containers.danglingBadge') || 'Askıda (Dangling)'}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px]">
                        {t('containers.unusedBadge') || 'Boşta (Unused)'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-400">
                    {formatBytes(img.size || 0)}
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
