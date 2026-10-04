import React from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { AlertCircle } from 'lucide-react';

export interface DeleteConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export const DeleteConfirmSheet: React.FC<DeleteConfirmSheetProps> = ({
  isOpen,
  onClose,
  serviceName,
  onConfirm,
  loading = false,
}) => {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-[#f87171]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Servisi Sil</span>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <p className="text-sm text-[#eceef6] leading-relaxed">
          <strong className="text-white font-semibold">"{serviceName}"</strong> servisini izleme listesinden silmek istediğinize emin misiniz?
        </p>

        <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-[#9ba0b5] space-y-1 font-mono">
          <p className="text-[#eceef6]">⚠️ Bu işlem yalnızca Corvus sağlık kontrolünü kaldırır.</p>
          <p>Arka plandaki Docker konteynerini veya çalışan süreci durdurmaz ya da silmez.</p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Vazgeç
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Siliniyor...' : 'Evet, Servisi Sil'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
