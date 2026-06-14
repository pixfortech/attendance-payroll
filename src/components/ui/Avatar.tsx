import { type CSSProperties } from 'react';

const PALETTE: [string, string][] = [
  ['var(--indigo-100)', 'var(--indigo-700)'],
  ['var(--coral-100)', 'var(--coral-700)'],
  ['var(--green-100)', 'var(--green-700)'],
  ['var(--blue-100)', 'var(--blue-700)'],
  ['var(--amber-100)', 'var(--amber-700)'],
];

function hashIdx(s = ''): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
}

function initials(name = ''): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export type AvatarStatus = 'online' | 'present' | 'absent' | 'leave' | 'off';

export interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: number;
  status?: AvatarStatus | null;
  square?: boolean;
  style?: CSSProperties;
}

/** Employee avatar — image or auto-coloured initials, optional status ring. */
export function Avatar({ name = '', src = null, size = 40, status = null, square = false, style = {} }: AvatarProps) {
  const [pBg, pFg] = PALETTE[hashIdx(name)];
  const statusColors: Record<AvatarStatus, string> = {
    online: 'var(--green-500)',
    present: 'var(--green-500)',
    absent: 'var(--coral-500)',
    leave: 'var(--blue-500)',
    off: 'var(--neutral-400)',
  };
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, ...style }}>
      {src ? (
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          style={{ width: size, height: size, borderRadius: square ? 'var(--radius-md)' : '50%', objectFit: 'cover', display: 'block', border: '1px solid var(--border-subtle)' }}
        />
      ) : (
        <span
          style={{
            width: size,
            height: size,
            borderRadius: square ? 'var(--radius-md)' : '50%',
            background: pBg,
            color: pFg,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: size * 0.4,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '-0.02em',
            userSelect: 'none',
          }}
        >
          {initials(name)}
        </span>
      )}
      {status && (
        <span
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: size * 0.3,
            height: size * 0.3,
            minWidth: 9,
            minHeight: 9,
            borderRadius: '50%',
            background: statusColors[status] || 'var(--neutral-400)',
            border: '2px solid var(--surface-card)',
          }}
        />
      )}
    </span>
  );
}
