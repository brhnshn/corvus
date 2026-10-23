import type { I18nContextType } from '../../../i18n';
import type { ContainerResourceUpdateRequest } from '../../../types';

export interface ResourceLimitsFormValues {
  cpuCores: string;
  memoryMb: string;
  restartPolicy: string;
  maxRetries: string;
}

export const CPU_PRESETS = ['0', '0.5', '1.0', '2.0', '4.0'];

/** Form değerlerini doğrular; hata varsa yerelleştirilmiş mesajı döndürür. */
export const validateResourceLimitsForm = (
  { cpuCores, memoryMb, restartPolicy, maxRetries }: ResourceLimitsFormValues,
  t: I18nContextType['t']
): string | null => {
  const parsedCpu = parseFloat(cpuCores);
  if (!isNaN(parsedCpu) && parsedCpu < 0) {
    return t('containers.validationCpuNegative');
  }

  const parsedMemory = parseInt(memoryMb, 10);
  if (!isNaN(parsedMemory)) {
    if (parsedMemory < 0) {
      return t('containers.validationMemoryMin');
    }
    if (parsedMemory > 0 && parsedMemory < 6) {
      return t('containers.validationMemoryMin');
    }
  }

  if (restartPolicy === 'on-failure') {
    const parsedRetries = parseInt(maxRetries, 10);
    if (!isNaN(parsedRetries) && parsedRetries < 0) {
      return t('containers.validationRetriesNegative');
    }
  }

  return null;
};

/** Form değerlerinden API güncelleme isteğini oluşturur. */
export const buildResourceUpdateRequest = ({
  cpuCores,
  memoryMb,
  restartPolicy,
  maxRetries,
}: ResourceLimitsFormValues): ContainerResourceUpdateRequest => {
  const parsedCores = parseFloat(cpuCores);
  const parsedMemory = parseInt(memoryMb, 10);
  const parsedRetries = parseInt(maxRetries, 10);

  return {
    cpuCores: !isNaN(parsedCores) ? parsedCores : 0,
    memoryMb: !isNaN(parsedMemory) ? parsedMemory : 0,
    restartPolicy,
    maximumRetryCount: restartPolicy === 'on-failure' && !isNaN(parsedRetries) ? parsedRetries : 0,
  };
};
