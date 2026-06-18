import { useState } from 'react';
import { Button, Checkbox, Chip, Icon, Input, Modal, Select, useConfirm } from '../ui';
import { useAppStore } from '../../store/AppStore';
import { activeBranchNames, employeeInBranch } from '../../lib/branches';
import { CURRENT_MONTH } from '../../data';
import type { Mark } from '../../data/attendanceMarks';

const MARKS: { id: Mark; label: string }[] = [
  { id: 'P', label: 'Present' },
  { id: 'A', label: 'Absent' },
  { id: 'H', label: 'Half-day' },
  { id: 'L', label: 'Paid leave' },
  { id: 'O', label: 'Weekly off / clear' },
];
const DAY_OPTS = Array.from({ length: CURRENT_MONTH.workingDays }, (_, i) => String(i + 1));

export function BulkAttendanceModal({ onClose, branchLocked }: { onClose: () => void; branchLocked?: string }) {
  const { employees, branches, bulkMarkDays } = useAppStore();
  const confirm = useConfirm();
  const branchNames = activeBranchNames(branches);
  const [branch, setBranch] = useState(branchLocked ?? branchNames[0] ?? '');
  const [startDay, setStartDay] = useState('1');
  const [endDay, setEndDay] = useState('1');
  const [mark, setMark] = useState<Mark>('P');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const branchCode = branches.find((b) => b.name === branch)?.code ?? '';
  const staff = employees.filter((e) => e.status === 'active' && employeeInBranch(e, branchCode, branches));
  const allSelected = staff.length > 0 && selected.length === staff.length;
  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => setSelected(allSelected ? [] : staff.map((e) => e.id));

  const lo = Math.min(Number(startDay), Number(endDay));
  const hi = Math.max(Number(startDay), Number(endDay));
  const dayIndexes = Array.from({ length: hi - lo + 1 }, (_, i) => lo - 1 + i);
  const entries = selected.length * dayIndexes.length;

  const apply = async () => {
    if (selected.length === 0 || dayIndexes.length === 0) return;
    const label = MARKS.find((m) => m.id === mark)!.label;
    const dateText = dayIndexes.length === 1 ? `day ${lo}` : `days ${lo}–${hi}`;
    const ok = await confirm({
      title: 'Apply bulk attendance?',
      message: `Branch: ${branch}\nEmployees: ${selected.length}\nDates: ${dayIndexes.length} (${dateText})\nMark: ${label}\nTotal entries affected: ${entries}`,
      confirmLabel: `Apply ${entries} entr${entries > 1 ? 'ies' : 'y'}`,
      tone: 'primary',
      icon: 'badgeCheck',
    });
    if (!ok) return;
    bulkMarkDays(selected, dayIndexes, mark);
    onClose();
  };

  return (
    <Modal
      icon="calendar"
      title="Bulk attendance"
      subtitle="Mark several employees across one or more days"
      onClose={onClose}
      width={540}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={entries === 0} onClick={apply} iconLeft={<Icon name="badgeCheck" size={16} />}>Apply {entries || ''}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Branch" value={branch} onChange={(e) => { setBranch(e.target.value); setSelected([]); }} options={branchNames} disabled={!!branchLocked} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="From working day" value={startDay} onChange={(e) => setStartDay(e.target.value)} options={DAY_OPTS} />
          <Select label="To working day" value={endDay} onChange={(e) => setEndDay(e.target.value)} options={DAY_OPTS} hint={dayIndexes.length > 1 ? `${dayIndexes.length} days selected` : 'Single day'} />
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

        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
          Will affect <strong style={{ color: 'var(--text-strong)' }}>{entries}</strong> attendance entr{entries === 1 ? 'y' : 'ies'} ({selected.length} employee{selected.length === 1 ? '' : 's'} × {dayIndexes.length} day{dayIndexes.length === 1 ? '' : 's'}).
        </div>

        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Branch event" />
      </div>
    </Modal>
  );
}
