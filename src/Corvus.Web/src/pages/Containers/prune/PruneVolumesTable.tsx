import React from 'react';
import { HardDrive, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import type { DockerDfVolumeInfo } from '../../../types';
import { formatBytes } from '../../../utils/format';
import { useI18n } from '../../../i18n';

interface PruneVolumesTableProps {
  volumes: DockerDfVolumeInfo[];
  selectedNames: Set<string>;
  onToggle: (name: string) => void;
  onToggleAll: () => void;
}

export const PruneVolumesTable: React.FC<PruneVolumesTableProps> = ({
  volumes,
  selectedNames,
  onToggle,
  onToggleAll
}) => {
  const { t } = useI18n();
  const allSelected = volumes.length > 0 && volumes.every(v => selectedNames.has(v.name));

  if (volumes.length === 0) {
    return (
      <div className="p-8 text-center surface border border-white/10 rounded-2xl text-xs text-[#9ba0b5]">
        <HardDrive className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
        <p className="font-medium text-[#eceef6]">{t('containers.noPrunableVolumesTitle') || 'Bağlantısız Hacim Yok'}</p>
        <p className="mt-1 text-[11px] text-[#9ba0b5]/80">
          {t('containers.noPrunableVolumesDesc') || 'Sistemde herhangi bir konteynere bağlı olmayan sahipsiz Docker hacmi bulunmuyor.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Kritik Veri Güvenliği Uyarısı */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-200">
            {t('containers.volumeWarningTitle') || 'DİKKAT: Hacimler Kalıcı Veri İçerebilir!'}
          </p>
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            {t('containers.volumeWarningDesc') || 
              'Bir konteynere bağlı olmayan hacimler veritabanı tabloları, yüklenen dosyalar veya yedekler barındırıyor olabilir. Yalnızca içeriğine artık ihtiyaç duymadığınızdan kesinlikle emin olduğunuz hacimleri işaretleyin.'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[#9ba0b5]">
        <span className="text-[11px]">
          {volumes.length} {t('containers.volumesFound') || 'bağlantısız hacim'} ({selectedNames.size} {t('containers.selected') || 'seçili'})
        </span>
        <button
          type="button"
          onClick={onToggleAll}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-[#eceef6] transition-colors cursor-pointer"
        >
          {allSelected ? (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-rose-400" />
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
              <th className="py-2.5 px-3">{t('containers.pruneColVolumeName')}</th>
              <th className="py-2.5 px-3">{t('containers.pruneColDriver')}</th>
              <th className="py-2.5 px-3 text-right">{t('containers.pruneColSize')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {volumes.map((v) => {
              const isChecked = selectedNames.has(v.name);
              const volSize = v.usageData?.size || 0;

              return (
                <tr
                  key={v.name}
                  onClick={() => onToggle(v.name)}
                  className={`cursor-pointer transition-colors ${
                    isChecked ? 'bg-rose-500/10 hover:bg-rose-500/15' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(v.name)}
                      className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[#eceef6] truncate max-w-[220px]">
                    {v.name}
                  </td>
                  <td className="py-2.5 px-3 text-[#9ba0b5] text-[11px]">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#d5d5dc]">
                      {v.driver || 'local'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-400">
                    {formatBytes(volSize)}
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
