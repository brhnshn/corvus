import { createContext, useContext } from 'react';
import type { DotStatus } from './StatusDot';

export type ToastType = 'success' | 'warn' | 'error' | 'info' | DotStatus;

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onUndo?: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  onUndo?: () => void;
}

export interface ToastContextType {
  toast: (message: string, options?: ToastOptions | (() => void)) => void;
  showToast: (message: string, type?: ToastType, onUndo?: () => void) => void;
  success: (message: string, onUndo?: () => void) => void;
  warn: (message: string, onUndo?: () => void) => void;
  error: (message: string, onUndo?: () => void) => void;
  info: (message: string, onUndo?: () => void) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (m: string) => console.log(m),
      showToast: (m: string) => console.log(m),
      success: (m: string) => console.log(m),
      warn: (m: string) => console.warn(m),
      error: (m: string) => console.error(m),
      info: (m: string) => console.info(m),
    };
  }
  return ctx;
};
