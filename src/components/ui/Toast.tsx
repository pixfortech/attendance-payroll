import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

type ToastFn = (message: string, tone?: ToastTone) => void;
const ToastContext = createContext<ToastFn | null>(null);

const TONE: Record<ToastTone, { icon: IconName; fg: string; bg: string; bd: string }> = {
  success: { icon: 'circleCheck', fg: 'var(--green-700)', bg: 'var(--green-50)', bd: 'var(--green-100)' },
  error: { icon: 'alert', fg: 'var(--coral-700)', bg: 'var(--coral-50)', bd: 'var(--coral-100)' },
  info: { icon: 'info', fg: 'var(--indigo-700)', bg: 'var(--indigo-50)', bd: 'var(--indigo-100)' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const toast = useCallback<ToastFn>((message, tone = 'success') => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
          transform: 'translateX(-50%)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: 'min(420px, calc(100vw - 24px))',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const c = TONE[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: c.bg,
                color: c.fg,
                border: `1px solid ${c.bd}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                fontSize: 13.5,
                fontWeight: 600,
                pointerEvents: 'auto',
              }}
            >
              <Icon name={c.icon} size={18} />
              <span style={{ flex: 1 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
