import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { getPageTitle, formatDocumentTitle } from '../utils/pageTitle';
import type { AuthStatus } from '../api/client';
import type { PageId } from '../components/Sidebar';

export interface UseDocumentTitleProps {
  currentPage: PageId;
  selectedContainerId: string | null;
  isStatusPath: boolean;
  authStatus: AuthStatus | null;
}

// Sayfa ve dil değişimlerine göre dinamik tarayıcı sekme başlığı (document.title)
// Kurallar gereği tüm hook'lar erken dönüşlerden (return) önce çağrılmalıdır
export function useDocumentTitle({
  currentPage,
  selectedContainerId,
  isStatusPath,
  authStatus,
}: UseDocumentTitleProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (isStatusPath) {
      const statusTitle = t('publicStatus.badge') || 'Status';
      document.title = formatDocumentTitle(statusTitle);
    } else if (authStatus && authStatus.authEnabled && !authStatus.isAuthenticated) {
      const loginTitle = t('auth.tabLogin') || 'Login';
      document.title = formatDocumentTitle(loginTitle);
    } else {
      const pageTitle = getPageTitle(currentPage, t, { selectedContainerId });
      document.title = formatDocumentTitle(pageTitle);
    }
  }, [currentPage, selectedContainerId, isStatusPath, authStatus, t]);
}
