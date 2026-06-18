import { useState } from 'react';
import { Button, Checkbox, Chip, Icon, Modal, Select, useConfirm } from '../ui';
import { useAppStore } from '../../store/AppStore';
import { activeBranches, employeeInBranch } from '../../lib/branches';
import { CURRENT_MONTH } from '../../data';
import type { Mark } from '../../data/attendanceMarks';

const MARKS: { id: Mark; label: string }[] = [
  { id: 'P', label: 'Present' },
  { id: 'A', label: 'Absent' },
  { id: 'H', label: 'Half-day' },
  { id: 'L', label: 'Paid leave' },
  { id: 'O', label: 'Weekly off / clear' },
];

/** Today's working-day number (1-based), clamped into the running month's grid.
 *  Day options never exceed this, so future attendance can't be marked. */
function todayWorkingDay(): number {
  return Math.min(CURRENT_MONTH.workingDays, Math.max(1, new Date().getDate()));
}

export function BulkAttendanceModal({ onClose, branchLocked }: { onClose: () => void; branchLocked?: string }) {
  const { employees, branches, bulkMarkDays } = useAppStore();
  const confirm = useConfirm();
  const liveBranches = activeBranches(branches);
  const lockedBranch = branchLocked ? branches.find((b) => b.name === branchLocked) : undefined;

  // Manager: locked to one branch. Admin: pick any/all branches.
  const [branchCodes, setBranchCodes] = useState<string[]>(lockedBranch ? [lockedBranch.code] : liveBranches.map((b) => b.code));
  const maxDay = todayWorkingDay();
  const dayOpts = Array.from({ length: maxDay }, (_, i) => String(i + 1));
  const [startDay, setStartDay] = useState(String(maxDay)); // default = today
  const [endDay, setEndDay] = useState(String(maxDay));
  const [mark, setMark] = useState<Mark>('P');
  const [selected, setSelected] = useState<string[]>([]);

  const toggleBranch = (code: string) => setBranchCodes((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]));
  const pool = employees.filter((e) => e.status === 'active' && branchCodes.some((c) => employeeInBranch(e, c, branches)));
  const allSelected = pool.length > 0 && selected.length === pool.length;
  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => setSelected(allSelected ? [] : pool.map((e) => e.id));

  const lo = Math.min(Number(startDay), Number(endDay), maxDay);
  const hi = Math.min(Math.max(Number(startDay), Number(endDay)), maxDay);
  const dayIndexes = Array.from({ length: hi - lo + 1 }, (_, i) => lo - 1 + i);
  const chosen = selected.filter((id) => pool.some((e) => e.id === id));
  const entries = chosen.length * dayIndexes.length;
  const branchNames = branchCodes.map((c) => branches.find((b) => b.code === c)?.name ?? c);

  const apply = async () => {
    if (entries === 0) return;
    const dateText = dayIndexes.length === 1 ? `day ${lo}` : `days ${lo}–${hi}`;
    const ok = await confirm({
      title: 'Apply bulk attendance?',
      message: `Branches: ${branchNames.join(', ')}\nEmployees: ${chosen.length}\nDates: ${dayIndexes.length} (${dateText}, today max)\nMark: ${MARKS.find((m) => m.id === mark)!.label}\nTotal entries affected: ${entries}`,
      confirmLabel: `Apply ${entries} entr${entries > 1 ? 'ies' : 'y'}`,
      tone: 'primary',
      icon: 'badgeCheck',
    });
    if (!ok) return;
    bulkMarkDays(chosen, dayIndexes, mark);
    onClose();
  };

  return (
    <Modal
      icon="calendar"
      title="Bulk attendance"
      subtitle="Mark across branches, employees and dates (today or earlier)"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={entries === 0} onClick={apply} iconLeft={<Icon name="badgeCheck" size={16} />}>Apply {entries || ''}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)', marginBottom: 8 }}>{branchLocked ? 'Branch' : 'Branches'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(branchLocked && lockedBranch ? [lockedBranch] : liveBranches).map((b) => (
              <Chip key={b.code} kind="filter" active={branchCodes.includes(b.code)} onClick={branchLocked ? undefined : () => { toggleBranch(b.code); setSelected([]); }}>{b.name}</Chip>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="From working day" value={startDay} onChange={(e) => setStartDay(e.target.value)} options={dayOpts} />
          <Select label="To working day" value={endDay} onChange={(e) => setEndDay(e.target.value)} options={dayOpts} hint={dayIndexes.length > 1 ? `${dayIndexes.length} days` : 'Single day (today by default)'} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Future attendance marking is not allowed — dates are capped to today (working day {maxDay}).</div>

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
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)' }}>Employees ({chosen.length}/{pool.length})</span>
            <button onClick={toggleAll} style={{ border: 'none', background: 'transparent', color: 'var(--indigo-600)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="gx-scroll" style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            {pool.map((e) => (
              <Checkbox key={e.id} checked={selected.includes(e.id)} onChange={() => toggle(e.id)} label={`${e.name} · ${e.branch}`} />
            ))}
            {pool.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a branch to list staff.</span>}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
          Will affect <strong style={{ color: 'var(--text-strong)' }}>{entries}</strong> entr{entries === 1 ? 'y' : 'ies'} · {branchCodes.length} branch{branchCodes.length === 1 ? '' : 'es'} · {chosen.length} employee{chosen.length === 1 ? '' : 's'} × {dayIndexes.length} day{dayIndexes.length === 1 ? '' : 's'}.
        </div>
      </div>
    </Modal>
  );
}
