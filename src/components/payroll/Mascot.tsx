import { type ReactNode } from 'react';
import gauri from '../../assets/gauri-mascot.png';

export interface MascotProps {
  /** Headline beside/under Gauri. */
  title?: string;
  message?: ReactNode;
  size?: number;
  children?: ReactNode;
}

/**
 * Gauri — kept restrained and premium. Use only for welcome, onboarding
 * completion, salary-paid confirmation and friendly empty states. Do NOT use
 * inside serious payroll, deduction, attendance or approval screens.
 */
export function Mascot({ title, message, size = 180, children }: MascotProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16, padding: '32px 20px' }}>
      <img src={gauri} alt="Gauri, the Ganguram mascot" style={{ height: size, filter: 'drop-shadow(0 14px 26px rgba(38,37,74,0.16))' }} />
      {title && <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--indigo-700)', letterSpacing: '-0.02em' }}>{title}</h2>}
      {message && <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 440, lineHeight: 1.5 }}>{message}</p>}
      {children}
    </div>
  );
}
