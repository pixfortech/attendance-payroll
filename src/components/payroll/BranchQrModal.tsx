import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Badge, Button, Icon, Input, Modal, Select, Switch, useConfirm, useToast, type BadgeVariant } from '../ui';
import { useAppStore } from '../../store/AppStore';
import type { Branch, QrStatus } from '../../types';

export const QR_STATUS_META: Record<QrStatus, { variant: BadgeVariant; label: string }> = {
  active: { variant: 'confirmed', label: 'Active' },
  rotated: { variant: 'approved', label: 'Rotated' },
  expired: { variant: 'rejected', label: 'Expired' },
};

/** Stable, branch-specific QR payload (branch_id + secure token). */
export function qrPayload(branch: Branch): string {
  return `GANGURAM:ATTEND:${branch.id}:${branch.qr.token}`;
}

export function BranchQrModal({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const { rotateBranchQr, updateBranchQrRotation, updateBranchGeofence } = useAppStore();
  const confirm = useConfirm();
  const toast = useToast();
  const wrapRef = useRef<HTMLDivElement>(null);
  const status = QR_STATUS_META[branch.qr.status];
  const g = branch.geofence;

  const rotate = async () => {
    const ok = await confirm({ title: 'Rotate branch QR?', message: `${branch.name}'s current QR will stop working immediately. Print and display the new code.`, confirmLabel: 'Rotate QR', tone: 'danger', icon: 'refresh' });
    if (ok) rotateBranchQr(branch.id);
  };
  const done = () => {
    toast('Branch settings saved');
    onClose();
  };

  const download = () => {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${branch.code}-attendance-qr.png`;
    a.click();
  };

  const print = () => {
    const data = wrapRef.current?.querySelector('canvas')?.toDataURL('image/png');
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w || !data) return;
    w.document.write(
      `<html><head><title>${branch.name} — attendance QR</title></head>` +
        `<body style="font-family:sans-serif;text-align:center;padding:32px;color:#1a1a22">` +
        `<h2 style="color:#49488d;margin:0 0 4px">${branch.name}</h2>` +
        `<p style="color:#7b7b91;margin:0 0 20px">Scan to mark attendance</p>` +
        `<img src="${data}" width="280" height="280"/>` +
        `<p style="color:#a9a9bd;font-size:12px;margin-top:18px;font-family:monospace">${branch.qr.token}</p>` +
        `</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Modal
      icon="qr"
      title={`${branch.name} — QR & location`}
      subtitle="Branch-specific attendance QR and geofence rules"
      onClose={onClose}
      width={540}
      footer={<Button variant="primary" full iconLeft={<Icon name="check" size={16} />} onClick={done}>Save &amp; close</Button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* QR preview */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div ref={wrapRef} style={{ padding: 12, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}>
            <QRCodeCanvas value={qrPayload(branch)} size={148} fgColor="#49488d" bgColor="#ffffff" level="M" />
          </div>
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge variant={status.variant} dot>{status.label}</Badge>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Generated {branch.qr.generatedAt}</span>
            </div>
            <div style={{ fontSize: 12, ...{ fontFamily: 'var(--font-mono)' }, color: 'var(--indigo-700)', wordBreak: 'break-all' }}>{branch.qr.token}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="primary" size="sm" iconLeft={<Icon name="refresh" size={14} />} onClick={rotate}>Rotate now</Button>
              <Button variant="secondary" size="sm" iconLeft={<Icon name="download" size={14} />} onClick={download}>Download</Button>
              <Button variant="secondary" size="sm" iconLeft={<Icon name="printer" size={14} />} onClick={print}>Print</Button>
            </div>
          </div>
        </div>

        <Select
          label="Auto-rotate QR"
          value={branch.qr.rotation}
          onChange={(e) => updateBranchQrRotation(branch.id, e.target.value as Branch['qr']['rotation'])}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          hint="Old QR codes stop working after each rotation"
        />

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Geofence & rules</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Latitude" mono value={String(g.latitude)} onChange={(e) => updateBranchGeofence(branch.id, { latitude: Number(e.target.value) || 0 })} />
            <Input label="Longitude" mono value={String(g.longitude)} onChange={(e) => updateBranchGeofence(branch.id, { longitude: Number(e.target.value) || 0 })} />
            <Input label="Allowed radius (m)" mono value={String(g.radiusMetres)} onChange={(e) => updateBranchGeofence(branch.id, { radiusMetres: Number(e.target.value) || 0 })} />
            <Input label="Wi-Fi SSID" value={g.wifiSsid ?? ''} onChange={(e) => updateBranchGeofence(branch.id, { wifiSsid: e.target.value })} icon="qr" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <Switch checked={g.gpsRequired} onChange={(v) => updateBranchGeofence(branch.id, { gpsRequired: v })} label="GPS required" description="Check-in must be inside the branch radius" />
            <Switch checked={g.selfieRequired} onChange={(v) => updateBranchGeofence(branch.id, { selfieRequired: v })} label="Selfie required" description="Capture a selfie at check-in" />
            <Switch checked={g.managerApprovalRequired} onChange={(v) => updateBranchGeofence(branch.id, { managerApprovalRequired: v })} label="Manager approval required" description="Hold every check-in for sign-off" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
