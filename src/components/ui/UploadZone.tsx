import { Icon } from './Icon';

export interface UploadZoneProps {
  label?: string;
}

/** Dashed drag-and-drop affordance for receipt / document uploads (visual). */
export function UploadZone({ label = 'Upload receipt (image / PDF)' }: UploadZoneProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '20px 16px',
        border: '1.5px dashed var(--border-default)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-inset)',
        cursor: 'pointer',
        textAlign: 'center',
      }}
    >
      <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="upload" size={18} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
      <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>Drag &amp; drop or click · JPG, PNG, PDF up to 5 MB</span>
    </div>
  );
}
