import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'warn' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const id = Math.random().toString(36).substring(2, 9);
    setActiveToast({ id, type, message });

    timerRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 1800);
  }, []);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const warn = useCallback((msg: string) => showToast(msg, 'warn'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, warn, error, info }}>
      {children}
      {activeToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-[90px] lg:bottom-8 z-50 pointer-events-none animate-in fade-in-0 slide-in-from-bottom-3 duration-300"
        >
          <div
            className={`
              glass flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[13px] font-semibold text-[#eceef6] shadow-xl
              ${
                activeToast.type === 'success'
                  ? 'border-[#34d399]/40 text-[#34d399]'
                  : activeToast.type === 'error'
                  ? 'border-[#f87171]/40 text-[#f87171]'
                  : activeToast.type === 'warn'
                  ? 'border-[#fbbf24]/40 text-[#fbbf24]'
                  : 'border-white/15 text-[#eceef6]'
              }
            `}
          >
            {activeToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />}
            {activeToast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0" />}
            {activeToast.type === 'warn' && <AlertTriangle className="w-4 h-4 text-[#fbbf24] shrink-0" />}
            {activeToast.type === 'info' && <Info className="w-4 h-4 text-[#818cf8] shrink-0" />}
            <span className="text-[#eceef6] font-medium">{activeToast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      showToast: (m: string) => console.log(m),
      success: (m: string) => console.log(m),
      warn: (m: string) => console.warn(m),
      error: (m: string) => console.error(m),
      info: (m: string) => console.info(m),
    };
  }
  return ctx;
};
