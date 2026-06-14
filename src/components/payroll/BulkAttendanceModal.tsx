import { useState } from 'react';
import { Button, Checkbox, Chip, Icon, Input, Modal, Select, useConfirm } from '../ui';
import { useAppStore } from '../../store/AppStore';
import { CURRENT_MONTH } from '../../data';
import type { Mark } from '../../data/attendanceMarks';

const MARKS: { id: Mark; label: string }[] = [
  { id: 'P', label: 'Present' },
  { id: 'A', label: 'Absent' },
  { id: 'H', label: 'Half-day' },
  { id: 'L', label: 'Leave' },
  { id: 'O', label: 'Weekly off' },
];

export function BulkAttendanceModal({ onClose, branchLocked }: { onClose: () => void; branchLocked?: string }) {
  const { employees, branches, bulkMark, logAudit } = useAppStore();
  const confirm = useConfirm();
  const [branch, setBranch] = useState(branchLocked ?? branches[0].name);
  const [day, setDay] = useState('1');
  const [mark, setMark] = useState<Mark>('P');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const staff = employees.filter((e) => e.branch === branch && e.status === 'active');
  const allSelected = staff.length > 0 && selected.length === staff.length;
  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => setSelected(allSelected ? [] : staff.map((e) => e.id));

  const apply = async () => {
    if (selected.length === 0) return;
    const label = MARKS.find((m) => m.id === mark)!.label;
    const ok = await confirm({
      title: 'Apply bulk attendance?',
      message: `Mark ${selected.length} employee${selected.length > 1 ? 's' : ''} as ${label} on day ${day} (${branch}).`,
      confirmLabel: 'Apply',
      tone: 'primary',
      icon: 'badgeCheck',
    });
    if (!ok) return;
    bulkMark(selected, Number(day) - 1, mark);
    logAudit({ entity: 'Attendance', target: `${branch} · day ${day}`, field: 'Bulk mark', oldValue: '—', newValue: `${selected.length} × ${label}`, reason: note || undefined });
    onClose();
  };

  return (
    <Modal
      icon="calendar"
      title="Bulk attendance"
      subtitle="Mark several employees at once"
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={selected.length === 0} onClick={apply} iconLeft={<Icon name="badgeCheck" size={16} />}>Apply to {selected.length || ''}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Branch" value={branch} onChange={(e) => { setBranch(e.target.value); setSelected([]); }} options={branches.map((b) => b.name)} disabled={!!branchLocked} />
          <Select label={`Working day (1–${CURRENT_MONTH.workingDays})`} value={day} onChange={(e) => setDay(e.target.value)} options={Array.from({ length: CURRENT_MONTH.workingDays }, (_, i) => String(i + 1))} />
        </div>

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)', marginBottom: 8 }}>Mark as</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MARKS.map((m) => (
              <Chip key={m.id} kind="filter" active={mark === m.id} onClick={() => setMark(m.id)}>{m.label}</Chip>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)' }}>Employees ({selected.length}/{staff.length})</span>
            <button onClick={toggleAll} style={{ border: 'none', background: 'transparent', color: 'var(--indigo-600)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="gx-scroll" style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            {staff.map((e) => (
              <Checkbox key={e.id} checked={selected.includes(e.id)} onChange={() => toggle(e.id)} label={`${e.name} · ${e.role}`} />
            ))}
            {staff.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active staff at this branch.</span>}
          </div>
        </div>

        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Branch event" />
      </div>
    </Modal>
  );
}
