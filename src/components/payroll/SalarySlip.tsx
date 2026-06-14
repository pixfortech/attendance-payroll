import { Avatar, Badge, Button, Icon, IconButton } from '../ui';
import { formatINR, formatSignedINR } from '../../services';
import { employeeBreakdown } from '../../lib/payroll';
import { CURRENT_MONTH } from '../../data';
import { PAYROLL_STATUS_META } from './statusMeta';
import type { Employee } from '../../types';
import logo from '../../assets/ganguram-logo.png';

function tenureLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y}y` : '', m || !y ? `${m}m` : ''].filter(Boolean).join(' ');
}

function LineItem({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'red' | 'green';
}) {
  const color = tone === 'red' ? 'var(--coral-600)' : tone === 'green' ? 'var(--green-700)' : 'var(--text-strong)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px dashed var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color }}>{value}</span>
    </div>
  );
}

export function SalarySlip({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const b = employeeBreakdown(employee);
  const status = PAYROLL_STATUS_META[employee.payrollStatus];

  return (
    <div
      onClick={onClose}
      className="gx-no-print"
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,34,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="gx-scroll gx-print"
        style={{ width: 480, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--indigo-600)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={logo} alt="" style={{ height: 34, filter: 'brightness(0) invert(1)' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Salary Slip</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>
                {CURRENT_MONTH.label} · SAL/2026/03/{employee.id.slice(-4)}
              </div>
            </div>
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} style={{ color: '#fff' }} />
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
            <Avatar name={employee.name} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>{employee.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                {employee.role} · {employee.branch} · {tenureLabel(employee.tenureMonths)}
              </div>
            </div>
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
          </div>

          {employee.note && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', marginTop: 14, background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-md)' }}>
              <Icon name="info" size={15} color="var(--amber-700)" style={{ marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: 'var(--amber-700)', fontWeight: 500 }}>{employee.note}</span>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Earnings &amp; deductions</div>
            <LineItem label="Gross monthly salary" value={formatINR(employee.salary)} />
            <LineItem label="Worked days" sub={`${employee.worked} of ${CURRENT_MONTH.workingDays} · daily ${formatINR(b.daily)}`} value={`${employee.worked} d`} />
            <LineItem label="Paid leave" sub={`${employee.leaveUsed} used · ${b.freeLeaveAllowed} free / month`} value={`${employee.leaveUsed} / ${b.freeLeaveAllowed}`} />
            <LineItem
              label="Leave deduction"
              sub={b.leaveDeduction > 0 ? `${b.deductibleDays} day(s) above free leave` : 'Within free-leave limit'}
              value={b.leaveDeduction > 0 ? formatSignedINR(-b.leaveDeduction) : formatINR(0)}
              tone={b.leaveDeduction > 0 ? 'red' : undefined}
            />
            <LineItem label="Tiffin / food allowance" sub="Company-paid CTC · on top of salary" value={formatSignedINR(b.tiffinTotal)} tone="green" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', marginTop: 18, background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-600)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Net payable</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Salary {formatINR(b.salaryPayable)} + Tiffin {formatINR(b.tiffinTotal)}
              </div>
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--indigo-700)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{formatINR(b.finalPayable)}</span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }} className="gx-no-print">
            <Button variant="secondary" full iconLeft={<Icon name="printer" size={16} />} onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="primary" full iconLeft={<Icon name="download" size={16} />} onClick={() => window.print()}>
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
