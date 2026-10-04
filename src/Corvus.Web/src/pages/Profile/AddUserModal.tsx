import React, { useState } from 'react';
import { X, UserPlus, Shield, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.trim().length < 3) {
      setError(t('userManagement.usernamePlaceholder') || 'Kullanıcı adı en az 3 karakter olmalıdır');
      return;
    }
    if (password.length < 4) {
      setError(t('userManagement.passwordPlaceholder') || 'Şifre en az 4 karakter olmalıdır');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createUser({
        username: username.trim(),
        password,
        role
      });
      if (res.success) {
        setUsername('');
        setPassword('');
        setRole('viewer');
        await onSuccess();
        onClose();
      } else {
        setError(res.message || 'Kullanıcı oluşturulamadı.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kullanıcı eklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md sheet-glass rounded-[24px] border border-white/15 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[12px] bg-white/[0.07] border border-white/10 text-[#eceef6]">
              <UserPlus className="w-4 h-4 text-[#d5d5dc]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#eceef6]">
                {t('userManagement.addUser') || 'Kullanıcı Ekle'}
              </h3>
              <p className="text-xs text-[#9ba0b5]">
                {t('userManagement.usersListSubtitle') || 'Yeni ekip hesabı tanımlayın'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[10px] text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-[12px] bg-[#f87171]/15 border border-[#f87171]/30 text-[#f87171] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
              {t('userManagement.username') || 'Kullanıcı Adı'} *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('userManagement.usernamePlaceholder') || 'Kullanıcı adı'}
              className="w-full px-3.5 py-2.5 rounded-[12px] bg-white/[0.04] border border-white/10 text-[#eceef6] text-xs focus:outline-none focus:border-[#d5d5dc] transition-colors placeholder:text-[#9ba0b5]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
              {t('userManagement.password') || 'Şifre'} *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('userManagement.passwordPlaceholder') || 'En az 4 karakter'}
              className="w-full px-3.5 py-2.5 rounded-[12px] bg-white/[0.04] border border-white/10 text-[#eceef6] text-xs focus:outline-none focus:border-[#d5d5dc] transition-colors placeholder:text-[#9ba0b5]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
              {t('userManagement.role') || 'Rol ve Yetki'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={`flex flex-col p-3 rounded-[14px] border cursor-pointer text-xs transition-all ${
                role === 'viewer'
                  ? 'bg-white/[0.1] border-[#d5d5dc] text-[#eceef6] font-medium shadow-xs'
                  : 'bg-white/[0.03] border-white/10 text-[#9ba0b5] hover:border-white/20'
              }`}>
                <input
                  type="radio"
                  name="newUserRole"
                  value="viewer"
                  checked={role === 'viewer'}
                  onChange={() => setRole('viewer')}
                  className="sr-only"
                />
                <span className="font-semibold">{t('userManagement.roleViewer') || 'İzleyici'}</span>
                <span className="text-[10px] text-[#9ba0b5] mt-1 line-clamp-2">
                  {t('userManagement.roleViewerDescription') || 'Salt okunur görünüm'}
                </span>
              </label>

              <label className={`flex flex-col p-3 rounded-[14px] border cursor-pointer text-xs transition-all ${
                role === 'admin'
                  ? 'bg-[#34d399]/15 border-[#34d399]/40 text-[#eceef6] font-medium shadow-xs'
                  : 'bg-white/[0.03] border-white/10 text-[#9ba0b5] hover:border-white/20'
              }`}>
                <input
                  type="radio"
                  name="newUserRole"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="sr-only"
                />
                <span className="font-semibold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#34d399]" />
                  <span>{t('userManagement.roleAdmin') || 'Yönetici'}</span>
                </span>
                <span className="text-[10px] text-[#9ba0b5] mt-1 line-clamp-2">
                  {t('userManagement.roleAdminDescription') || 'Tam yönetim yetkisi'}
                </span>
              </label>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              {t('common.cancel') || 'İptal'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? (t('userManagement.creatingUser') || 'Ekleniyor...') : (t('userManagement.addUser') || 'Kullanıcı Ekle')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
