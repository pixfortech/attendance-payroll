import { useRef, useState, type ReactNode } from 'react';
import { Badge, Button, Icon, Modal, type BadgeVariant } from '../ui';
import { useAppStore } from '../../store/AppStore';
import {
  parseBranchCsv,
  parseEmployeeCsv,
  previewBranches,
  previewEmployees,
  type ImportPreview,
  type RowStatus,
} from '../../lib/importData';
import { downloadCsv } from '../../lib/download';
import type { Branch, Employee } from '../../types';

type Kind = 'employees' | 'branches';

const STATUS_META: Record<RowStatus, { variant: BadgeVariant; label: string }> = {
  valid: { variant: 'eligible', label: 'Valid' },
  warning: { variant: 'pending', label: 'Warning' },
  error: { variant: 'rejected', label: 'Error' },
};

const BRANCH_TEMPLATE = ['branchCode', 'branchName', 'addressLine1', 'addressLine2', 'landmark', 'city', 'state', 'pincode', 'phone', 'latitude', 'longitude', 'radiusMeters', 'active'];
const EMPLOYEE_TEMPLATE = ['employeeCode', 'name', 'mobile', 'branchCode', 'branchName', 'role', 'designation', 'gender', 'monthlySalary', 'joiningDate', 'status', 'salaryBasis', 'latitude', 'longitude', 'notes'];

export function ImportModal({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  const { branches, employees, upsertBranches, upsertEmployees } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const builtRef = useRef<(Branch | Employee)[]>([]);

  const onFile = async (file: File) => {
    setReadError(null);
    setFileName(file.name);
    setBusy(true);
    try {
      if (kind === 'branches') {
        const parsed = await parseBranchCsv(file);
        const { preview: p, built } = previewBranches(parsed, branches);
        builtRef.current = built;
        setPreview(p);
      } else {
        const parsed = await parseEmployeeCsv(file);
        const { preview: p, built } = previewEmployees(parsed, branches, employees);
        builtRef.current = built;
        setPreview(p);
      }
    } catch {
      setPreview(null);
      setReadError('Could not read this file. Use a .csv or .xlsx export with a header row.');
    } finally {
      setBusy(false);
    }
  };

  const blocked = !preview || preview.uploadable === 0 || preview.blocking.length > 0;

  const doImport = () => {
    if (blocked) return;
    if (kind === 'branches') upsertBranches(builtRef.current as Branch[]);
    else upsertEmployees(builtRef.current as Employee[]);
    onClose();
  };

  const downloadTemplate = () => downloadCsv(`${kind}-template.csv`, [kind === 'branches' ? BRANCH_TEMPLATE : EMPLOYEE_TEMPLATE]);

  return (
    <Modal
      icon="upload"
      title={`Import ${kind}`}
      subtitle={kind === 'employees' ? 'Import branches first, then employees' : 'Branch master data'}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={blocked} onClick={doImport} iconLeft={<Icon name="upload" size={16} />}>
            {preview && preview.uploadable > 0 ? `Import ${preview.uploadable}` : 'Import'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <button
          onClick={() => inputRef.current?.click()}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '20px 16px', border: '1.5px dashed var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--surface-inset)', cursor: 'pointer', textAlign: 'center', fontFamily: 'var(--font-sans)' }}
        >
          <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="upload" size={19} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-body)' }}>{fileName || 'Choose CSV / XLSX file'}</span>
          <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{busy ? 'Reading…' : 'First sheet · header row required'}</span>
        </button>

        {readError && <Notice tone="error" icon="alert">{readError}</Notice>}

        {preview && (
          <>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              <Stat label="Total" value={preview.total} />
              <Stat label="Valid" value={preview.valid} tone="var(--green-700)" />
              <Stat label="Warnings" value={preview.warnings} tone="var(--amber-700)" />
              <Stat label="Errors" value={preview.errors} tone="var(--coral-600)" />
            </div>
            {preview.updates > 0 && <Notice tone="info" icon="refresh">{preview.updates} existing record(s) will be updated (merged by code), not duplicated.</Notice>}
            {preview.blocking.map((b) => <Notice key={b} tone="error" icon="alert">{b}</Notice>)}
            {!blocked && <Notice tone="info" icon="check">{preview.uploadable} row(s) ready — valid &amp; warning rows will be imported; error rows are skipped.</Notice>}

            {/* Rows */}
            <div className="gx-scroll" style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 8 }}>
              {preview.rows.map((r) => {
                const m = STATUS_META[r.status];
                return (
                  <div key={r.rowNo} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: r.status === 'error' ? 'var(--coral-50)' : 'var(--surface-card)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--indigo-600)', fontWeight: 600 }}>{r.code}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{r.label}</span>
                        {r.isUpdate && r.status !== 'error' && <Badge variant="approved" size="sm">Update</Badge>}
                      </div>
                      {r.sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.sub}</div>}
                      {r.messages.length > 0 && <div style={{ fontSize: 11.5, color: r.status === 'error' ? 'var(--coral-700)' : 'var(--text-muted)', marginTop: 2 }}>{r.messages.join(' · ')}</div>}
                    </div>
                    <Badge variant={m.variant} size="sm" dot>{m.label}</Badge>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>Columns: {(kind === 'branches' ? BRANCH_TEMPLATE : EMPLOYEE_TEMPLATE).slice(0, 4).join(', ')}…</span>
          <Button variant="secondary" size="sm" iconLeft={<Icon name="download" size={15} />} onClick={downloadTemplate}>Template</Button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: tone ?? 'var(--text-strong)' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function Notice({ tone, icon, children }: { tone: 'info' | 'error'; icon: Parameters<typeof Icon>[0]['name']; children: ReactNode }) {
  const c = tone === 'error' ? { fg: 'var(--coral-700)', bg: 'var(--coral-50)', bd: 'var(--coral-100)' } : { fg: 'var(--indigo-700)', bg: 'var(--indigo-50)', bd: 'var(--indigo-100)' };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: c.fg, background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
      <Icon name={icon} size={14} style={{ marginTop: 1, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}
