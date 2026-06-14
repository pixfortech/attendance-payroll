import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, Select } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { employeeBreakdown } from '../lib/payroll';
import { formatINR0 } from '../services';
import { BRANCH_NAMES } from '../data';

const cell: CSSProperties = { padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 };
const th: CSSProperties = {
  textAlign: 'left',
  padding: '11px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-subtle)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  borderBottom: '1px solid var(--border-subtle)',
  whiteSpace: 'nowrap',
};

export function EmployeeMasterPage() {
  const navigate = useNavigate();
  const { employees } = useAppStore();
  const [branch, setBranch] = useState('');
  const [query, setQuery] = useState('');

  const rows = employees.filter((e) => {
    const matchBranch = !branch || e.branch === branch;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.role.toLowerCase().includes(q);
    return matchBranch && matchQuery;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 42, gap: 8, padding: '0 12px', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', width: 260 }}>
          <Icon name="search" size={16} color="var(--text-subtle)" />
          <input
            placeholder="Search name, ID or role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-body)', minWidth: 0 }}
          />
        </div>
        <div style={{ width: 190 }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="All branches" options={['', ...BRANCH_NAMES]} />
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" iconLeft={<Icon name="download" size={16} />}>Export</Button>
        <Button variant="primary" iconLeft={<Icon name="plus" size={17} />}>Add employee</Button>
      </div>

      <Card padding="0">
        <div className="gx-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 940 }}>
            <thead>
              <tr style={{ background: 'var(--surface-inset)' }}>
                {['Employee', 'Branch · Role', 'Joined', 'Salary', 'Leave eligibility', 'Status', 'Login', ''].map((h, i) => (
                  <th key={i} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const eligible = employeeBreakdown(e).eligible;
                return (
                  <tr
                    key={e.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/employees/${e.id}`)}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--neutral-50)')}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <td style={cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Avatar name={e.name} size={38} status={e.status === 'active' ? 'present' : 'off'} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>{e.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{e.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={cell}>
                      <div style={{ color: 'var(--text-strong)', fontWeight: 500 }}>{e.branch}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.role}</div>
                    </td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                      <div style={{ color: 'var(--text-body)' }}>{e.joined}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.tenureMonths} months</div>
                    </td>
                    <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>{formatINR0(e.salary)}</td>
                    <td style={cell}>{eligible ? <Badge variant="eligible" dot>Eligible</Badge> : <Badge variant="noteligible" dot>Not eligible</Badge>}</td>
                    <td style={cell}>{e.status === 'active' ? <Badge variant="present" dot>Active</Badge> : <Badge variant="locked" dot>Resigned</Badge>}</td>
                    <td style={cell}>{e.login === 'enabled' ? <Badge variant="approved" icon="unlock" size="sm">Enabled</Badge> : <Badge variant="locked" icon="lock" size="sm">Disabled</Badge>}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>
                      <Icon name="chevronRight" size={16} color="var(--text-subtle)" />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...cell, textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
                    No employees match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
