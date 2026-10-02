import React, { useState } from 'react';
import { X, UserPlus, Shield, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { useI18n } from '../../i18n';

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
      setError(t('userManagement.usernamePlaceholder'));
      return;
    }
    if (password.length < 4) {
      setError(t('userManagement.passwordPlaceholder'));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#14161f] border border-[#2a2e3f] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2e3f] bg-[#1a1d29]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#e5e7eb]">{t('userManagement.addUser')}</h3>
              <p className="text-xs text-[#9ca3af]">{t('userManagement.usersListSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1e2130] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
              {t('userManagement.username')} *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('userManagement.usernamePlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#2a2e3f] text-[#e5e7eb] text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
              {t('userManagement.password')} *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('userManagement.passwordPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#2a2e3f] text-[#e5e7eb] text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
              {t('userManagement.role')}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                role === 'viewer'
                  ? 'bg-indigo-500/10 border-indigo-500 text-white font-medium shadow-xs'
                  : 'bg-[#0f1117] border-[#2a2e3f] text-[#9ca3af] hover:border-[#3f4458]'
              }`}>
                <input
                  type="radio"
                  name="newUserRole"
                  value="viewer"
                  checked={role === 'viewer'}
                  onChange={() => setRole('viewer')}
                  className="sr-only"
                />
                <span className="font-semibold">{t('userManagement.roleViewer')}</span>
                <span className="text-[10px] text-[#9ca3af] mt-1 line-clamp-2">
                  {t('userManagement.roleViewerDescription')}
                </span>
              </label>

              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                role === 'admin'
                  ? 'bg-indigo-500/10 border-indigo-500 text-white font-medium shadow-xs'
                  : 'bg-[#0f1117] border-[#2a2e3f] text-[#9ca3af] hover:border-[#3f4458]'
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
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('userManagement.roleAdmin')}</span>
                </span>
                <span className="text-[10px] text-[#9ca3af] mt-1 line-clamp-2">
                  {t('userManagement.roleAdminDescription')}
                </span>
              </label>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1a1d29] hover:bg-[#252a3b] text-[#9ca3af] hover:text-[#e5e7eb] text-xs font-semibold transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              {loading ? t('userManagement.creatingUser') : t('userManagement.addUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
