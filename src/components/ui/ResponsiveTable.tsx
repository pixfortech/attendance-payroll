import { type CSSProperties, type ReactNode } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Icon } from './Icon';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
  /** Omit from the mobile card body. */
  hideOnMobile?: boolean;
  /** Pin this column to the right edge so it never scrolls off / clips
   *  (used for an Actions column on a wide table). */
  stickyRight?: boolean;
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  minWidth?: number;
  emptyText?: string;
  /** Full custom mobile card; otherwise the first column is the title and the
      rest render as label/value rows (empty-header columns become actions). */
  mobileCard?: (row: T) => ReactNode;
}

const headCell: CSSProperties = {
  padding: '12px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-subtle)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  borderBottom: '1px solid var(--border-subtle)',
  whiteSpace: 'nowrap',
};
const bodyCell: CSSProperties = { padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 };

export function ResponsiveTable<T>({ columns, rows, rowKey, onRowClick, minWidth = 720, emptyText = 'Nothing to show.', mobileCard }: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
        {rows.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>{emptyText}</div>}
        {rows.map((row) => {
          if (mobileCard) {
            return (
              <div
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14, cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {mobileCard(row)}
              </div>
            );
          }
          const [title, ...rest] = columns;
          const bodyCols = rest.filter((c) => !c.hideOnMobile);
          return (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14, cursor: onRowClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>{title.render(row)}</div>
                {onRowClick && <Icon name="chevronRight" size={16} color="var(--text-subtle)" />}
              </div>
              {bodyCols.map((c) =>
                c.header === '' ? (
                  <div key={c.key} style={{ display: 'flex', justifyContent: 'flex-start' }}>{c.render(row)}</div>
                ) : (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)' }}>{c.header}</span>
                    <span style={{ fontSize: 13, textAlign: 'right' }}>{c.render(row)}</span>
                  </div>
                ),
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const stickyHead: CSSProperties = { position: 'sticky', right: 0, zIndex: 2, background: 'var(--surface-inset)', boxShadow: '-8px 0 8px -8px rgba(38,37,74,0.18)' };
  const stickyBody: CSSProperties = { position: 'sticky', right: 0, zIndex: 1, background: 'var(--surface-card)', boxShadow: '-8px 0 8px -8px rgba(38,37,74,0.18)' };

  return (
    <div className="gx-scroll" style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth }}>
        <thead>
          <tr style={{ background: 'var(--surface-inset)' }}>
            {columns.map((c) => (
              <th key={c.key} style={{ ...headCell, textAlign: c.align ?? 'left', ...(c.stickyRight ? stickyHead : {}) }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ ...bodyCell, textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>{emptyText}</td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((c) => (
                <td key={c.key} style={{ ...bodyCell, textAlign: c.align ?? 'left', ...(c.stickyRight ? stickyBody : {}) }}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
