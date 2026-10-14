import React, { useState } from 'react';
import { UserPlus, Shield, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('userManagement.addUser') || 'Kullanıcı Ekle'}
      subtitle={t('userManagement.usersListSubtitle') || 'Yeni ekip hesabı tanımlayın'}
      icon={<UserPlus className="w-5 h-5 text-[var(--text-primary)]" />}
      maxWidth="max-w-md"
    >
      {error && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 text-[var(--status-down)] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            {t('userManagement.username') || 'Kullanıcı Adı'} *
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('userManagement.usernamePlaceholder') || 'Kullanıcı adı'}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            {t('userManagement.password') || 'Şifre'} *
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('userManagement.passwordPlaceholder') || 'En az 4 karakter'}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            {t('userManagement.role') || 'Rol ve Yetki'}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className={`flex flex-col p-3 rounded-[var(--radius-sm)] border cursor-pointer text-xs transition-all ${
              role === 'viewer'
                ? 'bg-[var(--bg-subtle)] border-[var(--border-strong)] text-[var(--text-primary)] font-medium shadow-xs'
                : 'bg-transparent border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
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
              <span className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2">
                {t('userManagement.roleViewerDescription') || 'Salt okunur görünüm'}
              </span>
            </label>

            <label className={`flex flex-col p-3 rounded-[var(--radius-sm)] border cursor-pointer text-xs transition-all ${
              role === 'admin'
                ? 'bg-[var(--status-up-bg)] border-[var(--status-up)]/40 text-[var(--text-primary)] font-medium shadow-xs'
                : 'bg-transparent border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
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
                <Shield className="w-3.5 h-3.5 text-[var(--status-up)]" />
                <span>{t('userManagement.roleAdmin') || 'Yönetici'}</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2">
                {t('userManagement.roleAdminDescription') || 'Tam yönetim yetkisi'}
              </span>
            </label>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[var(--border-hairline)]">
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
    </Modal>
  );
};
