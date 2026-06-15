import { useState } from 'react';
import { Button, Input, Modal } from '../ui';
import { useAppStore } from '../../store/AppStore';

export function BranchFormModal({ onClose }: { onClose: () => void }) {
  const { addBranch } = useAppStore();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [manager, setManager] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    addBranch({ name: name.trim(), code: code.trim().toUpperCase() || name.trim().slice(0, 2).toUpperCase(), manager: manager.trim() || '—', managerPhone: phone.trim() || undefined, address: address.trim() || undefined });
    onClose();
  };

  return (
    <Modal
      icon="building"
      title="Add branch"
      subtitle="Create a new branch location"
      onClose={onClose}
      width={500}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={!valid} onClick={save}>Add branch</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <Input label="Branch name" value={name} onChange={(e) => setName(e.target.value)} icon="building" required />
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. NM" mono />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Branch manager" value={manager} onChange={(e) => setManager(e.target.value)} icon="user" />
          <Input label="Contact" value={phone} onChange={(e) => setPhone(e.target.value)} icon="phone" placeholder="+91 …" />
        </div>
        <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} icon="mapPin" />
      </div>
    </Modal>
  );
}
