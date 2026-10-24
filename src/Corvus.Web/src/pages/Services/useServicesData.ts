import { useEffect, useState, useCallback, useRef } from 'react';
import { api, type Service } from '../../api/client';
import { useI18n } from '../../i18n';
import { useLoadEffect } from '../../hooks/useLoadEffect';
import { useToast } from '../../components/ui/ToastContext';
import { useActiveSystem } from '../../hooks';

/** Servis listesini yükler, periyodik/olay tabanlı yenilemeyi ve sıralamayı yönetir. */
export const useServicesData = () => {
  const { t } = useI18n();
  const toast = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reordering, setReordering] = useState(false);

  const { systemId: activeSystemId, systemName: activeSystemName } = useActiveSystem();

  const isMountedRef = useRef(true);

  const loadServices = useCallback(async (isManual = false) => {
    if (isManual && isMountedRef.current) setRefreshing(true);
    try {
      const data = await api.getServices();
      if (isMountedRef.current) setServices(data);
    } catch (err: unknown) {
      if (isMountedRef.current) {
        toast.error(t('services.loadFailed'));
        console.error('Servisler yüklenemedi', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (isManual) setRefreshing(false);
      }
    }
  }, [toast, t]);

  useLoadEffect(loadServices);

  useEffect(() => {
    isMountedRef.current = true;

    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) loadServices();
    }, 25000);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) loadServices();
    };

    const handleCorvusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type: string | undefined = detail?.eventType || detail?.type;
      if (type?.includes('service') && isMountedRef.current) {
        loadServices();
      }
    };

    const handleSystemChange = () => {
      if (isMountedRef.current) {
        loadServices(true);
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('corvus_event', handleCorvusEvent);
    window.addEventListener('corvus_active_system_changed', handleSystemChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_event', handleCorvusEvent);
      window.removeEventListener('corvus_active_system_changed', handleSystemChange);
    };
  }, [loadServices]);

  const handleMove = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    const newServices = [...services];
    const temp = newServices[currentIndex];
    newServices[currentIndex] = newServices[targetIndex];
    newServices[targetIndex] = temp;

    setServices(newServices);
    setReordering(true);

    try {
      const ids = newServices.map((s) => s.id);
      await api.reorderServices(ids);
    } catch (err: unknown) {
      console.error('Sıralama güncellenemedi:', err);
      await loadServices();
    } finally {
      setReordering(false);
    }
  };

  return {
    services,
    setServices,
    loading,
    refreshing,
    reordering,
    activeSystemName,
    activeSystemId,
    loadServices,
    handleMove
  };
};
