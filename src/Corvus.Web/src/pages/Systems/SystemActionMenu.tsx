import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoreVertical, 
  Pencil, 
  Pause, 
  Play, 
  Copy, 
  Trash2, 
  Check 
} from 'lucide-react';
import type { SystemSummaryDto } from '../../types';
import { useI18n } from '../../i18n';

interface SystemActionMenuProps {
  system: SystemSummaryDto;
  onEdit: (system: SystemSummaryDto) => void;
  onTogglePause: (system: SystemSummaryDto) => void;
  onDelete: (system: SystemSummaryDto) => void;
}

export const SystemActionMenu: React.FC<SystemActionMenuProps> = ({
  system,
  onEdit,
  onTogglePause,
  onDelete
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<'name' | 'host' | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const calculatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 192; // 12rem (w-48)
    const menuHeight = 220; // approximate menu height
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUp = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = shouldOpenUp 
      ? Math.max(8, rect.top - menuHeight - 6) 
      : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 6);
    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));

    setCoords({ top, left });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current && 
        !menuRef.current.contains(target) && 
        buttonRef.current && 
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleCopy = (text: string, type: 'name' | 'host', e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
      setIsOpen(false);
    }, 1200);
  };

  const isLocalHost = system.id === 'local-host';
  const isPaused = system.status === 'paused';
  const hostValue = system.hostname || system.ipAddress || system.id;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={t('systems.actions.more')}
        title={t('systems.actions.more')}
        className={`
          p-1.5 rounded-xl transition-all cursor-pointer
          ${isOpen 
            ? 'bg-white/15 text-[#eceef6]' 
            : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] active:scale-95'
          }
        `}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && coords && createPortal(
        <div 
          ref={menuRef}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed w-48 rounded-2xl border border-white/10 bg-[#161824] shadow-2xl backdrop-blur-xl p-1.5 z-[9999] animate-modal-card select-none"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Düzenle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit(system);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
            role="menuitem"
          >
            <Pencil className="w-3.5 h-3.5 text-[#9ba0b5]" />
            <span>{t('systems.actions.edit')}</span>
          </button>

          {/* 2. Duraklat / Devam Ettir (Local host hariç) */}
          {!isLocalHost && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onTogglePause(system);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
              role="menuitem"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('systems.actions.resume')}</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('systems.actions.pause')}</span>
                </>
              )}
            </button>
          )}

          {/* 3. Adı kopyala */}
          <button
            type="button"
            onClick={(e) => handleCopy(system.name, 'name', e)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
            role="menuitem"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-3.5 h-3.5 text-[#9ba0b5]" />
              <span>{t('systems.actions.copyName')}</span>
            </div>
            {copiedType === 'name' && (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          {/* 4. Ana bilgisayarı kopyala */}
          <button
            type="button"
            onClick={(e) => handleCopy(hostValue, 'host', e)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
            role="menuitem"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-3.5 h-3.5 text-[#9ba0b5]" />
              <span>{t('systems.actions.copyHost')}</span>
            </div>
            {copiedType === 'host' && (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          {/* 5. Sil (Local host hariç) */}
          {!isLocalHost && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onDelete(system);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors cursor-pointer text-left"
                role="menuitem"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>{t('systems.actions.delete')}</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
