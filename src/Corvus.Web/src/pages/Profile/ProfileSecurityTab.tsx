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
      <div className="card p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[var(--status-up)]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{currentUsername}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isAdmin ? (t('userManagement.roleAdminDescription') || 'Yönetici ayrıcalıkları devrede') : (t('userManagement.roleViewerDescription') || 'Salt okunur erişim')}
            </p>
          </div>
        </div>

        <span className={isAdmin ? 'badge badge-up' : 'badge'}>
          {isAdmin ? (t('userManagement.roleAdmin') || 'Yönetici') : (t('userManagement.roleViewer') || 'İzleyici')}
        </span>
      </div>

      {/* Şifre Değiştirme Kartı */}
      <div className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-hairline)]">
          <KeyRound className="w-4 h-4 text-[var(--text-secondary)]" />
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            {t('userManagement.changePassword') || 'Şifre Değiştir'}
          </h4>
        </div>

        {error && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 text-[var(--status-down)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-up-bg)] border border-[var(--status-up)]/30 text-[var(--status-up)] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              {t('userManagement.currentPassword') || 'Mevcut Şifre'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('userManagement.currentPasswordPlaceholder') || 'Mevcut şifrenizi girin'}
                className="input w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                {t('userManagement.newPassword') || 'Yeni Şifre'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('userManagement.newPasswordPlaceholder') || 'En az 4 karakter'}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                {t('userManagement.confirmPassword') || 'Yeni Şifre (Tekrar)'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('userManagement.confirmPasswordPlaceholder') || 'Yeni şifrenizi doğrulayın'}
                className="input w-full"
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
