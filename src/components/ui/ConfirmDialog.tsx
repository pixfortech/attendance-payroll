import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  icon?: IconName;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  };

  const danger = opts?.tone !== 'primary';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          onClick={() => close(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,34,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: '100%', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: danger ? 'var(--coral-50)' : 'var(--indigo-50)', color: danger ? 'var(--coral-600)' : 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={opts.icon ?? (danger ? 'alert' : 'info')} size={20} />
              </span>
              <h3 style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-strong)' }}>{opts.title}</h3>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{opts.message}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button variant="ghost" full onClick={() => close(false)}>{opts.cancelLabel ?? 'Cancel'}</Button>
              <Button variant={danger ? 'danger' : 'primary'} full onClick={() => close(true)}>{opts.confirmLabel ?? 'Confirm'}</Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
