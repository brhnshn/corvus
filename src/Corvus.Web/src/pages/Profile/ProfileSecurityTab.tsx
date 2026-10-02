import React, { useState } from 'react';
import { KeyRound, Shield, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { useI18n } from '../../i18n';

interface ProfileSecurityTabProps {
  currentUsername: string;
  currentRole: string;
}

export const ProfileSecurityTab: React.FC<ProfileSecurityTabProps> = ({
  currentUsername,
  currentRole
}) => {
  const { t } = useI18n();
  const isAdmin = currentRole === 'admin';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError(t('userManagement.currentPasswordPlaceholder'));
      return;
    }
    if (newPassword.length < 4) {
      setError(t('userManagement.newPasswordPlaceholder'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('userManagement.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setSuccess(t('userManagement.passwordChanged'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(res.message || 'Şifre değiştirilemedi.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'İşlem sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Kullanıcı Kimlik Özeti */}
      <div className="p-5 rounded-2xl bg-[#1a1d29] border border-[#2a2e3f] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#e5e7eb] truncate">{currentUsername}</h3>
            <p className="text-xs text-[#9ca3af] mt-0.5">
              {isAdmin ? t('userManagement.roleAdminDescription') : t('userManagement.roleViewerDescription')}
            </p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold font-mono shrink-0 border ${
          isAdmin
            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        }`}>
          {isAdmin ? t('userManagement.roleAdmin') : t('userManagement.roleViewer')}
        </span>
      </div>

      {/* Şifre Değiştirme Kartı */}
      <div className="p-6 rounded-2xl bg-[#1a1d29] border border-[#2a2e3f] space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#2a2e3f]">
          <KeyRound className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-[#e5e7eb]">{t('userManagement.changePassword')}</h4>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
              {t('userManagement.currentPassword')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('userManagement.currentPasswordPlaceholder')}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#0f1117] border border-[#2a2e3f] text-[#e5e7eb] text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-[#9ca3af]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#e5e7eb] p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
                {t('userManagement.newPassword')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('userManagement.newPasswordPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#2a2e3f] text-[#e5e7eb] text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-[#9ca3af]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
                {t('userManagement.confirmPassword')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('userManagement.confirmPasswordPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#2a2e3f] text-[#e5e7eb] text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-[#9ca3af]/50"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/20"
            >
              {loading ? t('userManagement.updatingPassword') : t('userManagement.changePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
