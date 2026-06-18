/* ============================================================
   Payslip generation (Phase 3B fix pack, Part E)

   Builds a filled, printable HTML payslip from an employee's actual attendance
   + payroll figures (never blank). Downloaded as a self-contained .html file so
   it works without a PDF library; the user can print → Save as PDF.
   ============================================================ */
import type { Employee } from '../types';
import type { Mark } from '../data/attendanceMarks';
import { CURRENT_MONTH } from '../data/month';
import { employeeAdvanceRemaining, employeeBreakdown, salaryStatus } from './payroll';
import { formatINR } from '../services/format';

const STATUS_LABEL: Record<string, string> = { notstarted: 'Not started', requested: 'Requested', pending: 'Pending', approved: 'Approved', paid: 'Paid', hold: 'On hold' };
const BASIS_LABEL: Record<Employee['basis'], string> = { fixed30: 'Fixed 30-day', calendar: 'Actual calendar-day' };

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/** Build a complete, filled payslip HTML document for one employee/month.
 *  Pass the month's attendance `marks` so figures match the salary table. */
export function buildPayslipHtml(employee: Employee, marks?: Mark[]): string {
  const b = employeeBreakdown(employee, marks);
  const adjusted = b.advanceAdjustment;
  const remaining = employeeAdvanceRemaining(employee);
  const status = salaryStatus(employee);

  const rows: [string, string][] = [
    ['Employee', employee.name],
    ['Employee code', employee.id],
    ['Branch', employee.branch],
    ['Month', CURRENT_MONTH.label],
    ['Monthly salary', employee.salaryMissing ? '—' : formatINR(employee.salary)],
    ['Salary basis', BASIS_LABEL[employee.basis]],
    ['Daily rate', formatINR(b.daily)],
    ['Present days', String(b.presentDays)],
    ['Half days', String(b.halfDays)],
    ['Leave days', String(b.leaveDays)],
    ['Absent days', String(b.absentDays)],
    ['Free / paid leave used', `${b.freeLeaveUsed} / ${b.freeLeaveAllowed}`],
    ['Payable days', String(b.payableDays)],
    ['Gross earned', formatINR(b.grossEarned)],
    ['Tiffin / allowance (CTC)', formatINR(b.tiffinTotal)],
    ['Advance adjusted (this month)', adjusted > 0 ? '− ' + formatINR(adjusted) : formatINR(0)],
    ['Advance remaining', formatINR(remaining)],
    ['Payment status', STATUS_LABEL[status] ?? status],
    ['Generated', new Date().toLocaleString('en-IN')],
  ];
  const body = rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('');
  const note = `This is a system-generated payslip${status !== 'paid' ? ' (provisional — salary not yet paid)' : ''}. Tiffin/food allowance is a company-paid CTC, separate from net salary. Figures are based on recorded attendance for ${esc(CURRENT_MONTH.label)}.`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Payslip — ${esc(employee.name)} — ${esc(CURRENT_MONTH.label)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a22;max-width:640px;margin:24px auto;padding:0 16px}
  h1{color:#49488d;font-size:22px;margin:0}
  .sub{color:#666;font-size:12px;margin:2px 0 16px}
  table{width:100%;border-collapse:collapse}
  td{padding:8px 10px;border-bottom:1px solid #eee;font-size:13px}
  td.k{color:#555}
  td.v{text-align:right;font-weight:600}
  tr.net td{background:#f4f4fb;font-size:16px;color:#49488d;border-top:2px solid #49488d}
  .note{color:#888;font-size:11px;margin-top:16px;line-height:1.5}
  @media print{body{margin:0}}
</style></head>
<body>
  <h1>Ganguram Sweets</h1>
  <div class="sub">Salary Slip · ${esc(CURRENT_MONTH.label)}</div>
  <table>
    ${body}
    <tr class="net"><td class="k">Net payable</td><td class="v">${esc(employee.salaryMissing ? '—' : formatINR(b.netSalary))}</td></tr>
  </table>
  <p class="note">${note}</p>
</body></html>`;
}

/** Download the payslip as a self-contained .html file. */
export function downloadPayslip(employee: Employee, marks?: Mark[]): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([buildPayslipHtml(employee, marks)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${employee.id}-${CURRENT_MONTH.short.replace(/\s+/g, '-')}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
