import { useState, useCallback, useEffect } from 'react';
import { api, type AuthStatus } from '../api/client';
import { useLoadEffect } from './useLoadEffect';

export function useAuthStatus(isStatusPath: boolean) {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(!isStatusPath);
  const [showRegPrompt, setShowRegPrompt] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();
      setAuthStatus(status);
    } catch (err) {
      console.error('Auth durumu sorgulanamadı:', err);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loadAuth = useCallback(() => {
    if (!isStatusPath) {
      checkAuth();
    }
  }, [isStatusPath, checkAuth]);

  useLoadEffect(loadAuth);

  useEffect(() => {
    const handleUnauthorized = () => {
      checkAuth();
    };

    window.addEventListener('corvus_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('corvus_unauthorized', handleUnauthorized);
  }, [checkAuth]);

  const handleAuthSuccess = async (isNewRegistration: boolean) => {
    try {
      const status = await api.getAuthStatus();
      setAuthStatus(status);

      if (isNewRegistration && status.registrationEnabled) {
        setShowRegPrompt(true);
      }
    } catch (err) {
      console.error('Auth yenilenemedi:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      await checkAuth();
    } catch (err) {
      console.error('Çıkış hatası:', err);
    }
  };

  const handleRegistrationDisabled = () => {
    if (authStatus) {
      setAuthStatus({
        ...authStatus,
        registrationEnabled: false,
      });
    }
  };

  return {
    authStatus,
    setAuthStatus,
    authLoading,
    showRegPrompt,
    setShowRegPrompt,
    checkAuth,
    handleAuthSuccess,
    handleLogout,
    handleRegistrationDisabled,
  };
}
