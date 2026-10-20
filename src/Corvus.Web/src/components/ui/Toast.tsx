import React, { useState, useCallback, useEffect } from 'react';
import { StatusDot, type DotStatus } from './StatusDot';
import { Button } from './Button';
import { ToastContext, type ToastItem, type ToastType, type ToastOptions } from './ToastContext';

function normalizeStatus(type?: ToastType): DotStatus {
  if (!type || type === 'success' || type === 'up' || type === 'healthy') return 'up';
  if (type === 'warn' || type === 'degraded') return 'warn';
  if (type === 'error' || type === 'down' || type === 'offline') return 'down';
  return 'muted';
}

const ToastSingle: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const [shrinking, setShrinking] = useState(false);
  const duration = item.duration || 2800;

  useEffect(() => {
    // Start shrinking progress bar on mount
    const rAf = requestAnimationFrame(() => {
      setShrinking(true);
    });

    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, duration);

    return () => {
      cancelAnimationFrame(rAf);
      clearTimeout(timer);
    };
  }, [item.id, duration, onDismiss]);

  const handleUndo = () => {
    if (item.onUndo) {
      item.onUndo();
    }
    onDismiss(item.id);
  };

  const statusType: DotStatus = normalizeStatus(item.type);

  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <StatusDot status={statusType} size={6} />
        <span className="truncate">{item.message}</span>
      </div>

      {item.onUndo && (
        <Button
          variant="default"
          size="sm"
          onClick={handleUndo}
          className="!py-0.5 !px-2 !text-[11px] shrink-0"
        >
          Geri Al
        </Button>
      )}

      <div
        className="toast-progress"
        style={{
          width: shrinking ? '0%' : '100%',
          transition: `width ${duration}ms linear`,
        }}
      />
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options?: ToastOptions | (() => void)) => {
      const id = Math.random().toString(36).substring(2, 9);
      let opts: ToastOptions = {};
      if (typeof options === 'function') {
        opts = { onUndo: options };
      } else if (options) {
        opts = options;
      }

      const newItem: ToastItem = {
        id,
        message,
        type: opts.type || 'up',
        duration: opts.duration || 2800,
        onUndo: opts.onUndo,
      };

      setToasts((prev) => [...prev.slice(-4), newItem]); // Max 5 stacked toasts
    },
    []
  );

  const showToast = useCallback(
    (message: string, type: ToastType = 'up', onUndo?: () => void) => {
      toast(message, { type, onUndo });
    },
    [toast]
  );

  const success = useCallback((msg: string, onUndo?: () => void) => showToast(msg, 'success', onUndo), [showToast]);
  const warn = useCallback((msg: string, onUndo?: () => void) => showToast(msg, 'warn', onUndo), [showToast]);
  const error = useCallback((msg: string, onUndo?: () => void) => showToast(msg, 'error', onUndo), [showToast]);
  const info = useCallback((msg: string, onUndo?: () => void) => showToast(msg, 'info', onUndo), [showToast]);

  return (
    <ToastContext.Provider value={{ toast, showToast, success, warn, error, info }}>
      {children}
      <div className="toast-wrap" aria-label="Bildirimler">
        {toasts.map((item) => (
          <ToastSingle key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
