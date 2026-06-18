import { useState } from 'react';
import { Button, Input, Modal, Select } from '../ui';
import { useAppStore } from '../../store/AppStore';
import { activeBranchNames } from '../../lib/branches';
import { todayISO, toISODate } from '../../lib/dates';
import type { Employee } from '../../types';

const ROLES = ['Counter Sales', 'Cashier', 'Kitchen', 'Packing', 'Delivery', 'Manager', 'Helper'];

export function EmployeeFormModal({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const { addEmployee, updateEmployeeProfile, branches } = useAppStore();
  const branchNames = activeBranchNames(branches);
  const editing = !!employee;
  const [name, setName] = useState(employee?.name ?? '');
  const [branch, setBranch] = useState(employee?.branch ?? branchNames[0] ?? '');
  const [role, setRole] = useState(employee?.role ?? ROLES[0]);
  const [joined, setJoined] = useState(toISODate(employee?.joined) || todayISO());
  const [salary, setSalary] = useState(String(employee?.salary ?? ''));
  const [basis, setBasis] = useState<Employee['basis']>(employee?.basis ?? 'fixed30');
  const [phone, setPhone] = useState(employee?.phone ?? '');
  const [email, setEmail] = useState(employee?.email ?? '');

  const valid = name.trim() && Number(salary) > 0;

  const save = () => {
    if (!valid) return;
    const branchCode = branches.find((b) => b.name === branch)?.code;
    const values = { name: name.trim(), branch, branchCode, role, joined, salary: Number(salary), basis, phone: phone.trim() || '—', email: email.trim() || '—' };
    if (editing) updateEmployeeProfile(employee.id, values);
    else addEmployee(values);
    onClose();
  };

  return (
    <Modal
      icon="user"
      title={editing ? 'Edit employee' : 'Add employee'}
      subtitle={editing ? employee!.id : 'Create a new employee record'}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full onClick={save} disabled={!valid}>{editing ? 'Save changes' : 'Add employee'}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} icon="user" required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} options={branchNames} />
          <Select label="Role / designation" value={role} onChange={(e) => setRole(e.target.value)} options={ROLES} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Joining date" type="date" value={joined} max={todayISO()} onChange={(e) => setJoined(e.target.value)} />
          <Input label="Monthly salary" prefix="₹" mono value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0" required />
        </div>
        <Select
          label="Salary basis"
          value={basis}
          onChange={(e) => setBasis(e.target.value as Employee['basis'])}
          options={[
            { value: 'fixed30', label: 'Fixed 30-day' },
            { value: 'calendar', label: 'Actual calendar-day' },
          ]}
          hint={editing ? undefined : "A new joiner's first month always uses calendar-day"}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} icon="phone" placeholder="+91 …" />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} icon="mail" placeholder="name@ganguram.in" />
        </div>
      </div>
    </Modal>
  );
}
