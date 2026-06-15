import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, ResponsiveTable, Select, type Column } from '../components/ui';
import { EmployeeFormModal } from '../components/payroll/EmployeeFormModal';
import { ImportModal } from '../components/payroll/ImportModal';
import { useAppStore } from '../store/AppStore';
import { employeeBreakdown } from '../lib/payroll';
import { branchFilterOptions, employeeInBranch } from '../lib/branches';
import { downloadCsv } from '../lib/download';
import { formatINR0 } from '../services';
import type { Employee } from '../types';

const mono = { fontFamily: 'var(--font-mono)' as const };

export function EmployeeMasterPage() {
  const navigate = useNavigate();
  const { employees, branches } = useAppStore();
  const [branch, setBranch] = useState(''); // '' = All branches
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const rows = employees.filter((e) => {
    const matchBranch = employeeInBranch(e, branch, branches);
    const q = query.trim().toLowerCase();
    const matchQuery = !q || e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.role.toLowerCase().includes(q);
    return matchBranch && matchQuery;
  });

  const exportCsv = () =>
    downloadCsv('ganguram-employees.csv', [
      ['ID', 'Name', 'Branch', 'Role', 'Joined', 'Tenure (months)', 'Salary', 'Status', 'Login'],
      ...rows.map((e) => [e.id, e.name, e.branch, e.role, e.joined, e.tenureMonths, e.salary, e.status, e.login]),
    ]);

  const columns: Column<Employee>[] = [
    {
      key: 'emp',
      header: 'Employee',
      render: (e) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <Avatar name={e.name} size={38} status={e.status === 'active' ? 'present' : 'off'} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{e.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', ...mono }}>{e.id}</div>
          </div>
        </div>
      ),
    },
    { key: 'br', header: 'Branch · Role', render: (e) => (<div><div style={{ color: 'var(--text-strong)', fontWeight: 500 }}>{e.branch}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.role}</div></div>) },
    { key: 'joined', header: 'Joined', render: (e) => (<div><div style={{ color: 'var(--text-body)' }}>{e.joined}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.tenureMonths} months</div></div>) },
    { key: 'salary', header: 'Salary', render: (e) => (e.salaryMissing ? <Badge variant="pending" size="sm" dot>Salary missing</Badge> : <span style={{ ...mono, fontWeight: 600, color: 'var(--text-strong)' }}>{formatINR0(e.salary)}</span>) },
    { key: 'elig', header: 'Leave eligibility', render: (e) => (employeeBreakdown(e).eligible ? <Badge variant="eligible" dot>Eligible</Badge> : <Badge variant="noteligible" dot>Not eligible</Badge>) },
    { key: 'status', header: 'Status', render: (e) => (e.archived ? <Badge variant="locked" icon="lock">Archived</Badge> : e.status === 'active' ? <Badge variant="present" dot>Active</Badge> : <Badge variant="locked" dot>Resigned</Badge>) },
    { key: 'login', header: 'Login', render: (e) => (e.login === 'enabled' ? <Badge variant="approved" icon="unlock" size="sm">Enabled</Badge> : <Badge variant="locked" icon="lock" size="sm">Disabled</Badge>) },
    { key: 'go', header: '', align: 'right', render: () => <Icon name="chevronRight" size={16} color="var(--text-subtle)" /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 44, gap: 8, padding: '0 12px', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', flex: '1 1 240px', minWidth: 0 }}>
          <Icon name="search" size={16} color="var(--text-subtle)" />
          <input
            placeholder="Search name, ID or role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-body)', minWidth: 0 }}
          />
        </div>
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={branchFilterOptions(branches)} />
        </div>
        <Button variant="secondary" iconLeft={<Icon name="upload" size={16} />} onClick={() => setImportOpen(true)}>Import</Button>
        <Button variant="secondary" iconLeft={<Icon name="download" size={16} />} onClick={exportCsv}>Export</Button>
        <Button variant="primary" iconLeft={<Icon name="plus" size={17} />} onClick={() => setAddOpen(true)}>Add employee</Button>
      </div>

      <Card padding="0">
        <ResponsiveTable
          columns={columns}
          rows={rows}
          rowKey={(e) => e.id}
          onRowClick={(e) => navigate(`/employees/${e.id}`)}
          minWidth={940}
          emptyText="No employees match your search."
          mobileCard={(e) => {
            const eligible = employeeBreakdown(e).eligible;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar name={e.name} size={42} status={e.status === 'active' ? 'present' : 'off'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>{e.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', ...mono }}>{e.id} · {e.branch}</div>
                  </div>
                  <Icon name="chevronRight" size={16} color="var(--text-subtle)" />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {e.status === 'active' ? <Badge variant="present" dot>Active</Badge> : <Badge variant="locked" dot>Resigned</Badge>}
                  {eligible ? <Badge variant="eligible" dot>Eligible</Badge> : <Badge variant="noteligible" dot>Not eligible</Badge>}
                  {e.login === 'enabled' ? <Badge variant="approved" icon="unlock" size="sm">Login</Badge> : <Badge variant="locked" icon="lock" size="sm">No login</Badge>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-muted)' }}>
                  <span>{e.role} · {e.tenureMonths}m</span>
                  {e.salaryMissing ? <Badge variant="pending" size="sm" dot>Salary missing</Badge> : <span style={{ ...mono, fontWeight: 700, color: 'var(--text-strong)' }}>{formatINR0(e.salary)}</span>}
                </div>
              </div>
            );
          }}
        />
      </Card>

      {addOpen && <EmployeeFormModal onClose={() => setAddOpen(false)} />}
      {importOpen && <ImportModal kind="employees" onClose={() => setImportOpen(false)} />}
    </div>
  );
}
