import React, { useState } from 'react';
import { KeyRound, Shield, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';

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
      setError(t('userManagement.currentPasswordPlaceholder') || 'Mevcut şifrenizi girin');
      return;
    }
    if (newPassword.length < 4) {
      setError(t('userManagement.newPasswordPlaceholder') || 'Yeni şifre en az 4 karakter olmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('userManagement.passwordMismatch') || 'Yeni şifreler birbiriyle uyuşmuyor');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setSuccess(t('userManagement.passwordChanged') || 'Şifreniz başarıyla değiştirildi.');
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
    <div className="space-y-4 max-w-2xl">
      {/* Kullanıcı Kimlik Özeti */}
      <div className="surface rounded-[22px] p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-[14px] bg-white/[0.07] border border-white/10 text-[#eceef6] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[#34d399]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#eceef6] truncate">{currentUsername}</h3>
            <p className="text-xs text-[#9ba0b5] mt-0.5">
              {isAdmin ? (t('userManagement.roleAdminDescription') || 'Yönetici ayrıcalıkları devrede') : (t('userManagement.roleViewerDescription') || 'Salt okunur erişim')}
            </p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[12px] text-xs font-semibold font-mono shrink-0 border ${
          isAdmin
            ? 'bg-[#34d399]/15 border-[#34d399]/30 text-[#34d399]'
            : 'bg-white/[0.06] border-white/10 text-[#9ba0b5]'
        }`}>
          {isAdmin ? (t('userManagement.roleAdmin') || 'Yönetici') : (t('userManagement.roleViewer') || 'İzleyici')}
        </span>
      </div>

      {/* Şifre Değiştirme Kartı */}
      <div className="surface rounded-[22px] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <KeyRound className="w-4 h-4 text-[#d5d5dc]" />
          <h4 className="text-sm font-semibold text-[#eceef6]">
            {t('userManagement.changePassword') || 'Şifre Değiştir'}
          </h4>
        </div>

        {error && (
          <div className="p-3.5 rounded-[14px] bg-[#f87171]/15 border border-[#f87171]/30 text-[#f87171] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-[14px] bg-[#34d399]/15 border border-[#34d399]/30 text-[#34d399] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
              {t('userManagement.currentPassword') || 'Mevcut Şifre'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('userManagement.currentPasswordPlaceholder') || 'Mevcut şifrenizi girin'}
                className="w-full px-3.5 py-2 pr-10 rounded-[12px] bg-white/[0.04] border border-white/10 text-[#eceef6] text-xs focus:outline-none focus:border-[#d5d5dc] transition-colors placeholder:text-[#9ba0b5]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ba0b5] hover:text-[#eceef6] p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
                {t('userManagement.newPassword') || 'Yeni Şifre'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('userManagement.newPasswordPlaceholder') || 'En az 4 karakter'}
                className="w-full px-3.5 py-2 rounded-[12px] bg-white/[0.04] border border-white/10 text-[#eceef6] text-xs focus:outline-none focus:border-[#d5d5dc] transition-colors placeholder:text-[#9ba0b5]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
                {t('userManagement.confirmPassword') || 'Yeni Şifre (Tekrar)'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('userManagement.confirmPasswordPlaceholder') || 'Yeni şifrenizi doğrulayın'}
                className="w-full px-3.5 py-2 rounded-[12px] bg-white/[0.04] border border-white/10 text-[#eceef6] text-xs focus:outline-none focus:border-[#d5d5dc] transition-colors placeholder:text-[#9ba0b5]/50"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? (t('userManagement.updatingPassword') || 'Güncelleniyor...') : (t('userManagement.changePassword') || 'Şifreyi Güncelle')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
