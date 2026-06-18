import { useState } from 'react';
import { Badge, Button, Icon, Select, useToast } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { employeeBreakdown, employeeTiffinTotal } from '../lib/payroll';
import { branchFilterOptions, branchNameForFilter, employeeInBranch } from '../lib/branches';
import { downloadCsv } from '../lib/download';
import { round2 } from '../services';
import { CURRENT_MONTH } from '../data';
import type { IconName } from '../components/ui';

type Tone = 'brand' | 'blue' | 'amber' | 'green' | 'coral';

const REPORTS: { name: string; desc: string; icon: IconName; tone: Tone }[] = [
  { name: 'Monthly salary sheet', desc: 'Full payout sheet for the selected month', icon: 'fileText', tone: 'brand' },
  { name: 'Branch-wise salary report', desc: 'Totals grouped by branch location', icon: 'building', tone: 'brand' },
  { name: 'Employee-wise history', desc: 'Payment timeline per employee', icon: 'user', tone: 'blue' },
  { name: 'Tiffin / food allowance', desc: 'CTC tiffin paid, per employee & branch', icon: 'utensils', tone: 'blue' },
  { name: 'Paid leave report', desc: 'Leave taken vs 4-day monthly bucket', icon: 'calendar', tone: 'amber' },
  { name: 'Unused leave payable', desc: 'Encashable unused free leaves', icon: 'wallet', tone: 'green' },
  { name: 'Advance / loan / deduction', desc: 'Outstanding advances and recoveries', icon: 'banknote', tone: 'coral' },
  { name: 'Final payroll summary', desc: 'Net payable + CTC consolidated', icon: 'barChart', tone: 'brand' },
  { name: 'Cash / bank / UPI payment', desc: 'Split of payments by method', icon: 'rupee', tone: 'green' },
];

const CHIP: Record<Tone, [string, string]> = {
  brand: ['var(--indigo-50)', 'var(--indigo-600)'],
  blue: ['var(--blue-50)', 'var(--blue-600)'],
  amber: ['var(--amber-50)', 'var(--amber-700)'],
  green: ['var(--green-50)', 'var(--green-600)'],
  coral: ['var(--coral-50)', 'var(--coral-600)'],
};

export function ReportsPage() {
  const { employees, branches, tiffinLabels } = useAppStore();
  const toast = useToast();
  const [month, setMonth] = useState<string>(CURRENT_MONTH.label);
  const [branch, setBranch] = useState('');

  const list = employees.filter((e) => employeeInBranch(e, branch, branches));
  const branchList = branches.filter((b) => !branch || b.code === branch);

  const generators: Record<string, () => (string | number)[][]> = {
    'Monthly salary sheet': () => [
      ['Employee', 'ID', 'Branch', 'Gross', 'Worked', 'Deduction', 'Tiffin CTC', 'Net payable', 'Status'],
      ...list.map((e) => {
        const b = employeeBreakdown(e);
        return [e.name, e.id, e.branch, e.salary, e.worked, b.leaveDeduction, b.tiffinTotal, b.finalPayable, e.payrollStatus];
      }),
    ],
    'Branch-wise salary report': () => [
      ['Branch', 'Code', 'Staff', 'Present today', 'Payable'],
      ...branchList.map((b) => [b.name, b.code, b.staffCount, b.presentToday, b.payable]),
    ],
    'Employee-wise history': () => [
      ['Employee', 'Type', 'Period', 'Amount', 'Method', 'Confirmation'],
      ...list.flatMap((e) => e.payments.map((p) => [e.name, p.type, p.period, p.amount, p.method, p.status])),
    ],
    'Tiffin / food allowance': () => [
      ['Employee', 'Branch', 'Tiffin days', 'Tiffin CTC'],
      ...list.map((e) => [e.name, e.branch, e.tiffinDays, employeeTiffinTotal(e, tiffinLabels)]),
    ],
    'Paid leave report': () => [
      ['Employee', 'Leave used', 'Free allowed', 'Deductible days'],
      ...list.map((e) => {
        const b = employeeBreakdown(e);
        return [e.name, e.leaveUsed, b.freeLeaveAllowed, b.deductibleDays];
      }),
    ],
    'Unused leave payable': () => [
      ['Employee', 'Unused free leave', 'Daily salary', 'Encashable'],
      ...list.map((e) => {
        const b = employeeBreakdown(e);
        return [e.name, b.leaveUnused, b.daily, round2(b.leaveUnused * b.daily)];
      }),
    ],
    'Advance / loan / deduction': () => [
      ['Employee', 'Date', 'Amount', 'Method', 'Reference', 'Status'],
      ...list.flatMap((e) => e.advances.map((a) => [e.name, a.date, a.amount, a.method, a.ref ?? '', a.cleared ? 'Cleared' : 'Outstanding'])),
    ],
    'Final payroll summary': () => [
      ['Metric', 'Value'],
      ['Employees', list.length],
      ['Gross total', list.reduce((s, e) => s + e.salary, 0)],
      ['Total deductions', round2(list.reduce((s, e) => s + employeeBreakdown(e).totalDeductions, 0))],
      ['Tiffin CTC total', list.reduce((s, e) => s + employeeTiffinTotal(e, tiffinLabels), 0)],
      ['Net payable total', round2(list.reduce((s, e) => s + employeeBreakdown(e).finalPayable, 0))],
    ],
    'Cash / bank / UPI payment': () => {
      const totals: Record<string, { count: number; amount: number }> = {};
      for (const e of list) for (const p of e.payments) {
        totals[p.method] = totals[p.method] ?? { count: 0, amount: 0 };
        totals[p.method].count += 1;
        totals[p.method].amount += p.amount;
      }
      return [['Payment method', 'Count', 'Total amount'], ...Object.entries(totals).map(([m, v]) => [m, v.count, round2(v.amount)])];
    },
  };

  const exportReport = (name: string) => {
    const gen = generators[name];
    const rows = gen ? gen() : [['Report'], [name]];
    downloadCsv(`${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${CURRENT_MONTH.short}.csv`, rows);
    toast(`${name} exported`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 170, flex: '0 1 190px' }}>
          <Select value={month} onChange={(e) => setMonth(e.target.value)} options={[CURRENT_MONTH.label, 'February 2026', 'Q4 FY25-26']} />
        </div>
        <div style={{ minWidth: 170, flex: '0 1 190px' }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={branchFilterOptions(branches)} />
        </div>
        <div style={{ flex: 1 }} />
        <Badge variant="brand" icon="filter">{branchNameForFilter(branch, branches)} · {month}</Badge>
      </div>

      <div className="gx-grid gx-grid-stats3">
        {REPORTS.map((r) => {
          const [bg, fg] = CHIP[r.tone];
          return (
            <div key={r.name} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: bg, color: fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={r.icon} size={21} />
                </span>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-strong)' }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>{r.desc}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" full iconLeft={<Icon name="download" size={15} />} onClick={() => exportReport(r.name)}>Excel</Button>
                <Button variant="tonal" size="sm" full iconLeft={<Icon name="printer" size={15} />} onClick={() => window.print()}>PDF</Button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--text-muted)', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
        <Icon name="info" size={15} color="var(--indigo-500)" style={{ marginTop: 1 }} />
        Excel exports download a CSV of live data for the current filters. PDF opens the browser print dialog.
        {/* TODO(backend): server-generated XLSX/PDF with branding and pagination. */}
      </div>
    </div>
  );
}
