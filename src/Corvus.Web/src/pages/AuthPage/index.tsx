import React, { useState } from 'react';
import { api, type AuthStatus } from '../../api/client';
import { Lock, User, UserPlus, LogIn, AlertCircle, CheckCircle2, Info, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from '../../components/LanguageSwitch';

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
      setError(t('auth.credentialsRequired'));
      return;
    }

    if (cleanUser.length < 3) {
      setError(t('auth.usernameTooShort'));
      return;
    }

    if (password.length < 4) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }

    setLoading(true);

    try {
      if (isRegisterMode) {
        await api.register({ username: cleanUser, password });
        setSuccessMsg(t('auth.registrationSuccess'));
        setTimeout(() => {
          onAuthSuccess(true);
        }, 600);
      } else {
        await api.login({ username: cleanUser, password });
        onAuthSuccess(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col justify-center items-center p-4 sm:p-6 select-none overflow-y-auto relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitch variant="compact" />
      </div>

      <div className="w-full max-w-md bg-[#1a1d29] border border-[#2a2e3f] rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo_transparent.png" 
            alt="Corvus" 
            className="w-16 h-16 object-contain mb-3"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-bold tracking-wider text-[#e5e7eb]">CORVUS</h1>
          <p className="text-xs text-[#9ca3af] tracking-widest font-mono uppercase mt-1">
            {isFirstSetup && isRegisterMode ? t('auth.brandSubtitleSetup') : t('auth.brandSubtitleMain')}
          </p>
        </div>

        {/* Tab Selection (only if users already exist and registration is enabled) */}
        {!isFirstSetup && authStatus.registrationEnabled && (
          <div className="grid grid-cols-2 bg-[#0f1117] p-1 rounded-xl mb-6 border border-[#2a2e3f]">
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setError(null); }}
              className={`py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                !isRegisterMode 
                  ? 'bg-[#d4d4d8] text-[#0f1117] font-semibold shadow' 
                  : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              {t('auth.tabLogin')}
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setError(null); }}
              className={`py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isRegisterMode 
                  ? 'bg-[#d4d4d8] text-[#0f1117] font-semibold shadow' 
                  : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              {t('auth.tabRegister')}
            </button>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
              {t('auth.usernameLabel')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.usernamePlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0f1117] border border-[#2a2e3f] rounded-lg text-sm text-[#e5e7eb] placeholder-[#9ca3af]/40 focus:outline-none focus:border-[#d4d4d8] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
              {t('auth.passwordLabel')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-[#0f1117] border border-[#2a2e3f] rounded-lg text-sm text-[#e5e7eb] placeholder-[#9ca3af]/40 focus:outline-none focus:border-[#d4d4d8] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9ca3af] hover:text-[#e5e7eb] transition-colors focus:outline-none cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                {t('auth.confirmPasswordLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0f1117] border border-[#2a2e3f] rounded-lg text-sm text-[#e5e7eb] placeholder-[#9ca3af]/40 focus:outline-none focus:border-[#d4d4d8] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9ca3af] hover:text-[#e5e7eb] transition-colors focus:outline-none cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#d4d4d8] hover:bg-[#e4e4e7] text-[#0f1117] font-semibold text-sm rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-[#0f1117] border-t-transparent rounded-full animate-spin" />
            ) : isRegisterMode ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{t('auth.registerBtn')}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{t('auth.loginBtn')}</span>
              </>
            )}
          </button>
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
              className="text-xs text-[#9ca3af] hover:text-[#e5e7eb] transition-colors cursor-pointer underline decoration-dotted"
            >
              {isRegisterMode ? t('auth.envLoginSwitch') : t('auth.envRegisterSwitch')}
            </button>
          </div>
        )}

        {/* Footer note */}
        {(isFirstSetup || !authStatus.registrationEnabled) && (
          <div className="mt-6 pt-4 border-t border-[#2a2e3f] text-center">
            <p className="text-[11px] text-[#9ca3af]/60 font-mono flex items-center justify-center gap-1.5">
              {isFirstSetup ? (
                <>
                  <Info className="w-3.5 h-3.5 text-[#9ca3af]/80 shrink-0" />
                  <span>{t('auth.firstUserHint')}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#9ca3af]/80 shrink-0" />
                  <span>{t('auth.regDisabledHint')}</span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
