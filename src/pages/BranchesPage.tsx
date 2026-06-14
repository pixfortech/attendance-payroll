import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Badge, Button, Card, Icon, IconButton, ProgressBar, StatCard, useToast } from '../components/ui';
import { BranchQrModal, QR_STATUS_META, qrPayload } from '../components/payroll/BranchQrModal';
import { useAppStore } from '../store/AppStore';
import { formatINR0 } from '../services';
import type { Branch } from '../types';

const BASIS_LABEL = { fixed30: 'Fixed 30-day', calendar: 'Calendar-day' } as const;

export function BranchesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { branches, employees } = useAppStore();
  const [qrBranch, setQrBranch] = useState<Branch | null>(null);
  const totalStaff = branches.reduce((s, b) => s + b.staffCount, 0);
  const totalPayable = branches.reduce((s, b) => s + b.payable, 0);

  // Re-read the live branch (so QR/geofence edits reflect in the modal).
  const liveQrBranch = qrBranch ? branches.find((b) => b.id === qrBranch.id) ?? null : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" iconLeft={<Icon name="qr" size={16} />} onClick={() => window.open('/kiosk', '_blank')}>Open kiosk</Button>
        {/* TODO(backend): branch creation form persisting to the backend. */}
        <Button variant="primary" iconLeft={<Icon name="plus" size={17} />} onClick={() => toast('Branch creation will be enabled with backend setup', 'info')}>Add branch</Button>
      </div>

      <div className="gx-grid gx-grid-stats3">
        <StatCard label="Branches" value={branches.length} icon="building" tone="brand" footnote="all active" />
        <StatCard label="Total staff" value={totalStaff} icon="users" tone="blue" footnote={`${employees.length} in sample data`} />
        <StatCard label="Net payable — March" value={formatINR0(totalPayable).replace('₹', '')} prefix="₹" icon="wallet" tone="green" footnote="across all branches" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {branches.map((b) => {
          const pct = Math.round((b.presentToday / b.staffCount) * 100);
          const qrStatus = QR_STATUS_META[b.qr.status];
          return (
            <Card key={b.id} hover>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="building" size={22} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>{b.name}</h3>
                    <Badge variant="brand" size="sm">{b.code}</Badge>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="mapPin" size={13} /> {b.address}
                  </div>
                </div>
                <IconButton icon="pencil" label="Edit branch" size="sm" onClick={() => setQrBranch(b)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginTop: 18 }}>
                <Field icon="user" label="Branch manager" value={b.manager} />
                <Field icon="phone" label="Contact" value={b.managerPhone} />
                <Field icon="users" label="Staff" value={`${b.staffCount} employees`} />
                <Field icon="calculator" label="Default basis" value={BASIS_LABEL[b.defaultBasis]} />
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)' }}>Present today · {b.presentToday}/{b.staffCount}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{formatINR0(b.payable)}</span>
                </div>
                <ProgressBar value={pct} max={100} tone={pct >= 92 ? 'green' : pct >= 89 ? 'brand' : 'amber'} height={6} />
              </div>

              {/* QR & geofence */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ padding: 6, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>
                  <QRCodeCanvas value={qrPayload(b)} size={56} fgColor="#49488d" bgColor="#ffffff" level="M" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>Attendance QR</span>
                    <Badge variant={qrStatus.variant} size="sm" dot>{qrStatus.label}</Badge>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {b.geofence.radiusMetres}m radius · {b.geofence.gpsRequired ? 'GPS on' : 'GPS off'} · rotates {b.qr.rotation}
                  </div>
                </div>
                <Button variant="tonal" size="sm" iconLeft={<Icon name="qr" size={14} />} onClick={() => setQrBranch(b)}>Manage</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--text-muted)', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
        <Icon name="info" size={15} color="var(--indigo-500)" style={{ marginTop: 1 }} />
        <span>Staff without smartphones can mark attendance from a shared branch device — <button onClick={() => navigate('/kiosk')} style={{ border: 'none', background: 'transparent', color: 'var(--indigo-600)', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 12.5 }}>open kiosk mode</button>.</span>
      </div>

      {liveQrBranch && <BranchQrModal branch={liveQrBranch} onClose={() => setQrBranch(null)} />}
    </div>
  );
}

function Field({ icon, label, value }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={13} color="var(--text-subtle)" />
        {label}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{value}</span>
    </div>
  );
}
