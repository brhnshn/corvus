import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useI18n } from '../../i18n';

export type SystemColumnKey =
  | 'system'
  | 'cpu'
  | 'ram'
  | 'disk'
  | 'gpu'
  | 'load'
  | 'net'
  | 'temp'
  | 'bat'
  | 'wifi'
  | 'svc'
  | 'upd';

interface SystemsColumnsMenuProps {
  visibleColumns: Record<SystemColumnKey, boolean>;
  onToggleColumn: (key: SystemColumnKey) => void;
}

export const SystemsColumnsMenu: React.FC<SystemsColumnsMenuProps> = ({
  visibleColumns,
  onToggleColumn,
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen]);

  const columnKeys: { key: SystemColumnKey; label: string }[] = [
    { key: 'system', label: t('systems.columns.system') },
    { key: 'cpu', label: t('systems.columns.cpu') },
    { key: 'ram', label: t('systems.columns.ram') },
    { key: 'disk', label: t('systems.columns.disk') },
    { key: 'gpu', label: t('systems.columns.gpu') },
    { key: 'load', label: t('systems.columns.load') },
    { key: 'net', label: t('systems.columns.net') },
    { key: 'temp', label: t('systems.columns.temp') },
    { key: 'bat', label: t('systems.columns.bat') },
    { key: 'wifi', label: t('systems.columns.wifi') },
    { key: 'svc', label: t('systems.columns.svc') },
    { key: 'upd', label: t('systems.columns.upd') },
  ];

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-10 px-3.5 flex items-center gap-2 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2] text-[var(--text-secondary)]" />
        <span>{t('systems.viewColumns')}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-[var(--radius-md)] p-2 min-w-[210px] shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150 select-none">
          <div className="space-y-0.5">
            {columnKeys.map(({ key, label }) => {
              const isChecked = visibleColumns[key] ?? true;
              return (
                <label
                  key={key}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] cursor-pointer text-xs text-[var(--text-primary)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleColumn(key)}
                    className="w-3.5 h-3.5 rounded accent-[var(--cloud-200)] cursor-pointer"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
