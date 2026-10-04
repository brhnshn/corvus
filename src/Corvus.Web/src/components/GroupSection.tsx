import React, { useState } from 'react';
import { 
  ChevronDown, 
  Pencil, 
  Check, 
  X, 
  Layers
} from 'lucide-react';
import { useI18n } from '../i18n';

interface GroupSectionProps {
  title: string;
  count: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRenameGroup?: (newName: string) => Promise<void> | void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
}

export const GroupSection: React.FC<GroupSectionProps> = ({
  title,
  count,
  isCollapsed,
  onToggleCollapse,
  onRenameGroup,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  children
}) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(title);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editValue.trim() || editValue.trim() === title) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      if (onRenameGroup) {
        await onRenameGroup(editValue.trim());
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Grup adı güncellenemedi:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditing(false);
    setEditValue(title);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`space-y-3 p-3 rounded-2xl transition-all duration-200 ${
        isDragOver
          ? 'border-2 border-dashed border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
          : 'border border-transparent'
      }`}
    >
      {/* Group Header Bar */}
      <div 
        onClick={onToggleCollapse}
        className="surface flex items-center justify-between px-3 py-2 rounded-[16px] border border-white/10 hover:bg-white/[0.10] cursor-pointer transition-colors group select-none font-mono text-xs font-semibold uppercase tracking-[0.8px] text-[#9ba0b5]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            className="p-1 rounded text-[#9ca3af] hover:text-[#e5e7eb] transition-transform duration-200"
            title={isCollapsed ? 'Genişlet' : 'Daralt'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
          </button>

          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                className="px-2 py-0.5 bg-[#0f1117] border border-indigo-500 rounded text-xs font-mono text-[#e5e7eb] focus:outline-none"
                placeholder={t('groups.newGroupName')}
              />
              <button
                type="submit"
                disabled={saving}
                className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                title={t('common.save')}
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1 rounded bg-[#2a2e3f] hover:bg-[#3b4252] text-[#9ca3af] cursor-pointer"
                title={t('common.cancel')}
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-[0.8px] text-[#eceef6] font-mono flex items-center gap-2 truncate">
                <Layers className="w-3.5 h-3.5 text-[#9ba0b5] shrink-0" />
                <span className="truncate">{title}</span>
              </h2>

              <span className="not-italic text-[11px] px-2 py-0.5 rounded-[10px] bg-white/10 text-[#9ba0b5] font-mono">
                {count}
              </span>

              {onRenameGroup && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#9ca3af] hover:text-indigo-400 transition-opacity cursor-pointer"
                  title={t('groups.rename')}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Drag over badge */}
        {isDragOver && (
          <span className="text-[11px] text-indigo-400 font-mono font-medium animate-pulse px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40">
            {t('groups.dropHere')}
          </span>
        )}
      </div>

      {/* Group Items Grid / Content */}
      {!isCollapsed && (
        <div className="transition-all duration-200">
          {children}
        </div>
      )}
    </div>
  );
};
