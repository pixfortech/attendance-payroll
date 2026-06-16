import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

/** Reusable, touch-friendly back button.
 *  - `onClick` overrides everything (e.g. close a sub-view in place).
 *  - else navigates to `to` (a deterministic, dead-end-proof fallback route).
 *  - else uses browser history (navigate(-1)), falling back to "/".
 *  The browser's own Back button keeps working independently. */
export function BackButton({ to, label = 'Back', onClick, style }: { to?: string; label?: string; onClick?: () => void; style?: CSSProperties }) {
  const navigate = useNavigate();
  const handle = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (to) {
      navigate(to);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        alignSelf: 'flex-start',
        minHeight: 40,
        padding: '8px 12px 8px 8px',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--surface-card)',
        cursor: 'pointer',
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--text-body)',
        fontFamily: 'var(--font-sans)',
        boxShadow: 'var(--shadow-xs)',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <Icon name="chevronLeft" size={18} /> {label}
    </button>
  );
}
