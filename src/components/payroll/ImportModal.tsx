import { useRef, useState } from 'react';
import { Button, Icon, Modal } from '../ui';
import { useAppStore, type NewBranchInput, type NewEmployeeInput } from '../../store/AppStore';
import { BRANCH_COLUMNS, EMPLOYEE_COLUMNS, parseBranchFile, parseEmployeeFile } from '../../lib/importData';
import { downloadCsv } from '../../lib/download';

type Kind = 'employees' | 'branches';

export function ImportModal({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  const { importEmployees, importBranches } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<(NewEmployeeInput | NewBranchInput)[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const columns = kind === 'employees' ? EMPLOYEE_COLUMNS : BRANCH_COLUMNS;

  const onFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const parsed = kind === 'employees' ? await parseEmployeeFile(file) : await parseBranchFile(file);
      setRows(parsed);
      if (parsed.length === 0) setError('No valid rows found. Check the column headers.');
    } catch {
      setRows([]);
      setError('Could not read this file. Use a .csv or .xlsx export.');
    }
  };

  const doImport = () => {
    if (kind === 'employees') importEmployees(rows as NewEmployeeInput[]);
    else importBranches(rows as NewBranchInput[]);
    onClose();
  };

  const template = () => downloadCsv(`${kind}-template.csv`, [columns, kind === 'employees' ? ['Mou Sen', 'Beadon Street', 'Counter Sales', '10000', 'fixed30', '01 Mar 2026', '+91 90000 00000', 'mou@ganguram.in'] : ['New Market', 'NM', 'A. Saha', '+91 90000 00000', 'Kolkata 700001']]);

  return (
    <Modal
      icon="download"
      title={`Import ${kind}`}
      subtitle="Upload a CSV or XLSX file"
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={rows.length === 0} onClick={doImport}>Import {rows.length || ''}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <button
          onClick={() => inputRef.current?.click()}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '22px 16px', border: '1.5px dashed var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--surface-inset)', cursor: 'pointer', textAlign: 'center', fontFamily: 'var(--font-sans)' }}
        >
          <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="upload" size={19} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-body)' }}>{fileName || 'Choose CSV / XLSX file'}</span>
          <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{rows.length > 0 ? `${rows.length} row(s) ready to import` : 'First sheet is read'}</span>
        </button>

        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--coral-700)', background: 'var(--coral-50)', border: '1px solid var(--coral-100)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
            <Icon name="alert" size={14} style={{ marginTop: 1 }} /> {error}
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, marginBottom: 6 }}>Expected columns</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {columns.map((c) => (
              <span key={c} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--indigo-700)', background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)', borderRadius: 'var(--radius-pill)', padding: '3px 9px', fontFamily: 'var(--font-mono)' }}>{c}</span>
            ))}
          </div>
        </div>

        <Button variant="secondary" size="sm" iconLeft={<Icon name="download" size={15} />} onClick={template}>Download template</Button>
      </div>
    </Modal>
  );
}
