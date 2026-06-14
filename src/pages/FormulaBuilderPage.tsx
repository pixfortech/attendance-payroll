import { useState } from 'react';
import { Badge, Button, Card, Chip, Icon, Input, Select, Switch } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { employeeScope } from '../lib/payroll';
import { DISPLAY_OPERATORS, evaluateFormula, FORMULA_VARIABLES, formulaToString } from '../services';
import { BLOCK_TYPE_META } from '../data/formulaBlocks';
import type { BlockType, FormulaBlock, ScopeType } from '../types';

const NUMERIC_PRESETS = ['7', '0.5', '80', '100'];
const TYPE_OPTIONS = (Object.keys(BLOCK_TYPE_META) as BlockType[]).map((t) => ({ value: t, label: BLOCK_TYPE_META[t].label }));
const SCOPE_OPTIONS: { id: ScopeType; label: string }[] = [
  { id: 'all', label: 'All employees' },
  { id: 'branches', label: 'Selected branches' },
  { id: 'roles', label: 'Selected roles' },
  { id: 'employees', label: 'Specific employees' },
];

function chipKind(token: string): 'operator' | 'number' | 'variable' {
  if ((DISPLAY_OPERATORS as readonly string[]).includes(token)) return 'operator';
  if (/^\d+(\.\d+)?$/.test(token)) return 'number';
  return 'variable';
}

export function FormulaBuilderPage() {
  const { employees, formulaBlocks, saveFormulaBlock } = useAppStore();
  const sampleEmployee = employees[0];
  const scope = employeeScope(sampleEmployee);

  const [label, setLabel] = useState('Leave Deduction');
  const [type, setType] = useState<BlockType>('deduction');
  const [tokens, setTokens] = useState<string[]>(['days_absent_deductible', '×', 'daily_salary']);
  const [active, setActive] = useState(true);
  const [scopeType, setScopeType] = useState<ScopeType>('all');

  const add = (t: string) => setTokens((p) => [...p, t]);
  const backspace = () => setTokens((p) => p.slice(0, -1));
  const result = evaluateFormula(tokens, scope);
  const meta = BLOCK_TYPE_META[type];

  const loadPreset = (block: FormulaBlock) => {
    setLabel(block.label);
    setType(block.type);
    setTokens(block.tokens);
    setActive(block.active);
    setScopeType(block.scope);
  };

  const save = () => {
    const block: FormulaBlock = {
      id: 'fb-' + label.toLowerCase().replace(/\s+/g, '-'),
      label,
      type,
      tokens,
      display: label,
      active,
      month: 'March 2026',
      scope: scopeType,
      scopeValues: [],
    };
    saveFormulaBlock(block);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Custom payroll block" subtitle="Build a salary formula from approved variables" action={<Badge variant={active ? 'paid' : 'neutral'} dot>{active ? 'Active' : 'Inactive'}</Badge>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <Input label="Block label" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value as BlockType)} options={TYPE_OPTIONS} />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Formula</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', minHeight: 64, padding: 14, background: 'var(--surface-inset)', border: '1.5px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
            {tokens.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Tap variables and operators below to build your formula…</span>}
            {tokens.map((t, i) => (
              <Chip key={i} kind={chipKind(t)}>{t}</Chip>
            ))}
            {tokens.length > 0 && (
              <button
                onClick={backspace}
                title="Backspace"
                style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                <Icon name="x" size={14} /> Backspace
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {DISPLAY_OPERATORS.map((o) => (
              <Chip key={o} kind="operator" onClick={() => add(o)}>{o}</Chip>
            ))}
            {NUMERIC_PRESETS.map((n) => (
              <Chip key={n} kind="number" onClick={() => add(n)}>{n}</Chip>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '20px 0 10px' }}>Variables · click to insert</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FORMULA_VARIABLES.map((v) => (
              <Chip key={v.key} kind="variable" onClick={() => add(v.key)} title={v.description}>{v.key}</Chip>
            ))}
          </div>
        </Card>

        <Card title="Scope &amp; applicability" subtitle="Who and when this block applies">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)', marginBottom: 8 }}>Apply to</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SCOPE_OPTIONS.map((s) => (
                  <Chip key={s.id} kind="filter" active={scopeType === s.id} onClick={() => setScopeType(s.id)}>{s.label}</Chip>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Select label="Applicable month" value="March 2026" options={['March 2026', 'Every month', 'April 2026']} />
              <Select label="Display on slip as" value={label} options={[label, 'Custom text']} />
            </div>
            <Switch checked={active} onChange={setActive} label="Block is active" description="Inactive blocks are skipped during salary calculation" />
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Live preview" subtitle={`Evaluated on ${sampleEmployee.name}`} action={<Icon name="sparkles" size={16} color="var(--indigo-500)" />}>
          <div style={{ padding: '12px 14px', background: 'var(--indigo-950)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c8c7e3', lineHeight: 1.7, wordBreak: 'break-word' }}>
            <span style={{ color: '#7e7cb5' }}>{label || 'block'}</span> = {formulaToString(tokens)}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 14,
              padding: '14px 16px',
              background: result.ok ? 'var(--green-50)' : 'var(--coral-50)',
              border: `1px solid ${result.ok ? 'var(--green-100)' : 'var(--coral-100)'}`,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: result.ok ? 'var(--green-700)' : 'var(--coral-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {result.ok ? 'Computed result' : 'Incomplete formula'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{result.ok ? meta.effect : (result as { error: string }).error}</div>
            </div>
            <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: result.ok ? 'var(--green-700)' : 'var(--coral-600)' }}>
              {result.ok ? `${meta.sign}₹${result.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
            <Icon name="shield" size={13} color="var(--green-600)" style={{ verticalAlign: '-2px', marginRight: 4 }} />
            Evaluated safely in the service layer using only approved variables, numbers and operators.
          </div>
        </Card>

        <Card title="Sample employee" subtitle="Variables used in preview">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {Object.entries(scope).slice(0, 8).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{k}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{Math.round(v * 100) / 100}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Saved blocks">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {formulaBlocks.map((block) => (
              <button
                key={block.id}
                onClick={() => loadPreset(block)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-50)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-card)')}
              >
                <Icon name="formula" size={17} color="var(--indigo-600)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{block.label}</span>
                    {!block.active && <Badge variant="neutral" size="sm">Inactive</Badge>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.tokens.join(' ')}</div>
                </div>
                <Icon name="chevronRight" size={15} color="var(--text-subtle)" />
              </button>
            ))}
          </div>
        </Card>

        <Button variant="primary" full iconLeft={<Icon name="check" size={17} />} onClick={save}>Save payroll block</Button>
      </div>
    </div>
  );
}
