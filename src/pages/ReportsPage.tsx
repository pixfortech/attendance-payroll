import { Badge, Button, Icon, Select } from '../components/ui';
import { BRANCH_NAMES } from '../data';
import type { IconName } from '../components/ui';

type Tone = 'brand' | 'blue' | 'amber' | 'green' | 'coral';

const REPORTS: { name: string; desc: string; icon: IconName; tone: Tone }[] = [
  { name: 'Monthly salary sheet', desc: 'Full payout sheet for the selected month', icon: 'fileText', tone: 'brand' },
  { name: 'Branch-wise salary report', desc: 'Totals grouped by branch location', icon: 'building', tone: 'brand' },
  { name: 'Employee-wise history', desc: 'Salary timeline for one employee', icon: 'user', tone: 'blue' },
  { name: 'Tiffin / food allowance', desc: 'CTC tiffin paid, per employee & branch', icon: 'utensils', tone: 'blue' },
  { name: 'Paid leave report', desc: 'Leave taken vs 4-day monthly bucket', icon: 'calendar', tone: 'amber' },
  { name: 'Unused leave payable', desc: 'Encashable unused free leaves', icon: 'wallet', tone: 'green' },
  { name: 'Advance / loan / deduction', desc: 'Outstanding advances and recoveries', icon: 'banknote', tone: 'coral' },
  { name: 'Final payroll summary', desc: 'Net payable + CTC consolidated', icon: 'barChart', tone: 'brand' },
  { name: 'Cash / bank / UPI payment', desc: 'Split of cash vs bank disbursement', icon: 'rupee', tone: 'green' },
];

const CHIP: Record<Tone, [string, string]> = {
  brand: ['var(--indigo-50)', 'var(--indigo-600)'],
  blue: ['var(--blue-50)', 'var(--blue-600)'],
  amber: ['var(--amber-50)', 'var(--amber-700)'],
  green: ['var(--green-50)', 'var(--green-600)'],
  coral: ['var(--coral-50)', 'var(--coral-600)'],
};

export function ReportsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 190 }}>
          <Select value="March 2026" options={['March 2026', 'February 2026', 'Q4 FY25-26']} />
        </div>
        <div style={{ width: 190 }}>
          <Select value="" placeholder="All branches" options={['', ...BRANCH_NAMES]} />
        </div>
        <div style={{ flex: 1 }} />
        <Badge variant="brand" icon="download">11 export formats</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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
                <Button variant="secondary" size="sm" full iconLeft={<Icon name="download" size={15} />}>Excel</Button>
                <Button variant="tonal" size="sm" full iconLeft={<Icon name="printer" size={15} />}>PDF</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
