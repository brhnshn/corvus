import React, { useState } from 'react';
import { api, type AuthStatus } from '../../api/client';
import { Lock, User, UserPlus, LogIn, AlertCircle, CheckCircle2, Info, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { Button } from '../../components/ui/Button';

interface AuthPageProps {
  authStatus: AuthStatus;
  onAuthSuccess: (isNewRegistration: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ authStatus, onAuthSuccess }) => {
  const { t } = useI18n();
  const isFirstSetup = !authStatus.hasUsers;
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(isFirstSetup);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError(t('auth.credentialsRequired') || 'Kullanıcı adı ve şifre gereklidir.');
      return;
    }

    if (cleanUser.length < 3) {
      setError(t('auth.usernameTooShort') || 'Kullanıcı adı en az 3 karakter olmalıdır.');
      return;
    }

    if (password.length < 4) {
      setError(t('auth.passwordTooShort') || 'Şifre en az 4 karakter olmalıdır.');
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch') || 'Şifreler birbiriyle uyuşmuyor.');
      return;
    }

    setLoading(true);

    try {
      if (isRegisterMode) {
        await api.register({ username: cleanUser, password });
        setSuccessMsg(t('auth.registrationSuccess') || 'Kayıt başarılı. Yönlendiriliyorsunuz...');
        setTimeout(() => {
          onAuthSuccess(true);
        }, 600);
      } else {
        await api.login({ username: cleanUser, password });
        onAuthSuccess(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0e15] text-[#eceef6] flex flex-col justify-center items-center p-4 sm:p-6 select-none overflow-y-auto relative animate-rv">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitch variant="compact" />
      </div>

      <div className="w-full max-w-md surface rounded-[24px] p-6 sm:p-8 border border-white/10 shadow-2xl my-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/logo_transparent.png" 
            alt="Corvus" 
            className="w-14 h-14 object-contain mb-2.5"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-bold tracking-tight text-[#eceef6]">CORVUS</h1>
          <p className="text-[11px] text-[#9ba0b5] tracking-widest font-mono uppercase mt-0.5">
            {isFirstSetup && isRegisterMode ? (t('auth.brandSubtitleSetup') || 'İlk Kurulum & Yönetici') : (t('auth.brandSubtitleMain') || 'Sistem İzleme & Yönetim')}
          </p>
        </div>

        {/* Tab Selection */}
        {!isFirstSetup && authStatus.registrationEnabled && (
          <div className="glass rounded-[19px] p-[3px] grid grid-cols-2 mb-5">
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setError(null); }}
              className={`py-1.5 text-xs font-semibold rounded-[16px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                !isRegisterMode 
                  ? 'bg-[#d5d5dc] text-[#1b1d2a] shadow-xs' 
                  : 'text-[#9ba0b5] hover:text-[#eceef6]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('auth.tabLogin') || 'Giriş Yap'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setError(null); }}
              className={`py-1.5 text-xs font-semibold rounded-[16px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isRegisterMode 
                  ? 'bg-[#d5d5dc] text-[#1b1d2a] shadow-xs' 
                  : 'text-[#9ba0b5] hover:text-[#eceef6]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('auth.tabRegister') || 'Kayıt Ol'}</span>
            </button>
          </div>
        )}

        {/* Bildirimler */}
        {error && (
          <div className="mb-4 p-3 rounded-[12px] bg-[#f87171]/15 border border-[#f87171]/30 text-[#f87171] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-[12px] bg-[#34d399]/15 border border-[#34d399]/30 text-[#34d399] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-[#9ba0b5] mb-1.5 tracking-wider uppercase font-mono">
              {t('auth.usernameLabel') || 'Kullanıcı Adı'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ba0b5]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.usernamePlaceholder') || 'Kullanıcı adı'}
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-[12px] text-xs text-[#eceef6] placeholder:text-[#9ba0b5]/40 focus:outline-none focus:border-[#d5d5dc] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#9ba0b5] mb-1.5 tracking-wider uppercase font-mono">
              {t('auth.passwordLabel') || 'Şifre'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ba0b5]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/10 rounded-[12px] text-xs text-[#eceef6] placeholder:text-[#9ba0b5]/40 focus:outline-none focus:border-[#d5d5dc] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9ba0b5] hover:text-[#eceef6] transition-colors focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-[11px] font-semibold text-[#9ba0b5] mb-1.5 tracking-wider uppercase font-mono">
                {t('auth.confirmPasswordLabel') || 'Şifre Doğrulama'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ba0b5]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/10 rounded-[12px] text-xs text-[#eceef6] placeholder:text-[#9ba0b5]/40 focus:outline-none focus:border-[#d5d5dc] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9ba0b5] hover:text-[#eceef6] transition-colors focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full h-[40px] text-xs"
              icon={isRegisterMode ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            >
              {loading ? (t('common.loading') || 'Lütfen bekleyin...') : isRegisterMode ? (t('auth.registerBtn') || 'Hesap Oluştur') : (t('auth.loginBtn') || 'Giriş Yap')}
            </Button>
          </div>
        </form>

        {/* First Setup: Optional toggle to Login using ENV credentials */}
        {isFirstSetup && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
              }}
              className="text-xs text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer underline decoration-dotted"
            >
              {isRegisterMode ? (t('auth.envLoginSwitch') || 'Önceden tanımlı çevre değişkeni ile giriş yap') : (t('auth.envRegisterSwitch') || 'Yeni yönetici hesabı oluştur')}
            </button>
          </div>
        )}

        {/* Footer note */}
        {(isFirstSetup || !authStatus.registrationEnabled) && (
          <div className="mt-5 pt-3.5 border-t border-white/10 text-center">
            <p className="text-[11px] text-[#9ba0b5]/80 font-mono flex items-center justify-center gap-1.5">
              {isFirstSetup ? (
                <>
                  <Info className="w-3.5 h-3.5 text-[#9ba0b5] shrink-0" />
                  <span>{t('auth.firstUserHint') || 'İlk kayıt olan kullanıcı tam yetkili yönetici olacaktır.'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#9ba0b5] shrink-0" />
                  <span>{t('auth.regDisabledHint') || 'Yeni kullanıcı kayıtları yönetici tarafından kapatılmıştır.'}</span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
