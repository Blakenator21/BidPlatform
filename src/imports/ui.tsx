import React from 'react';

/**
 * 1CG design primitives — Modernist.
 * Flat, architectural, zero radius, flush-left labels, structure from rules not whitespace.
 * Every value below comes from 1cg-theme.css tokens. Do not hard-code hexes or font names.
 *
 * Usage: import './1cg-theme.css' once at the app root, then use these primitives
 * instead of a component library. Anything not covered here should be plain markup
 * styled with the same tokens.
 */

type Div = React.HTMLAttributes<HTMLDivElement>;
type Btn = React.ButtonHTMLAttributes<HTMLButtonElement>;

/* ---------- type scale (matches the app exactly) ---------- */
export const T = {
  pageTitle: { font: '800 30px/1.05 var(--font-heading)' },
  sectionTitle: { font: '800 16.5px/1 var(--font-heading)' },
  blockTitle: { font: '800 15px/1 var(--font-heading)' },
  cardName: { font: '700 15px/1.25 var(--font-heading)' },
  kpi: { font: '800 34px/1 var(--font-heading)' },
  kpiSmall: { font: '800 24px/1 var(--font-heading)' },
  label: {
    font: '500 11.5px/1 var(--font-body)',
    letterSpacing: '.14em',
    color: 'var(--color-neutral-600)',
  },
  meta: { font: '400 12.5px/1.35 var(--font-body)', color: 'var(--color-neutral-700)' },
  body: { font: '400 13.5px/1.5 var(--font-body)', color: 'var(--color-neutral-800)' },
  micro: {
    font: '400 11px/1 var(--font-body)',
    letterSpacing: '.08em',
    color: 'var(--color-neutral-600)',
  },
} as const;

/* ---------- status semantics (the only non-mono colors) ---------- */
export const STATUS = {
  good: 'oklch(0.58 0.12 150)',
  awaiting: 'oklch(0.72 0.15 78)',
  urgent: 'var(--color-accent)',
  idle: 'var(--color-neutral-400)',
} as const;

export type StatusKey = keyof typeof STATUS;

/* ---------- rules ---------- */
export const Rule = ({ strong = false, ...p }: Div & { strong?: boolean }) => (
  <div
    {...p}
    style={{
      height: strong ? 2 : 1,
      background: strong ? 'var(--color-text)' : 'var(--color-divider)',
      ...p.style,
    }}
  />
);

/* ---------- buttons ---------- */
const btnBase: React.CSSProperties = {
  padding: '11px 16px',
  border: 'none',
  borderRadius: 0,
  font: '600 13.5px/1 var(--font-body)',
  letterSpacing: '.06em',
  fontFamily: 'var(--font-body)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  ...p
}: Btn & { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' }) => {
  const skin: React.CSSProperties =
    variant === 'primary'
      ? { background: 'var(--color-accent)', color: '#fff' }
      : variant === 'secondary'
      ? { background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-text)' }
      : { background: 'transparent', color: 'var(--color-accent-700)', border: '1px solid var(--color-divider)' };
  const scale: React.CSSProperties =
    size === 'sm'
      ? { padding: '8px 11px', font: '600 10.5px/1 var(--font-body)', letterSpacing: '.1em' }
      : {};
  return <button {...p} className={'cg-btn ' + (p.className || '')} style={{ ...btnBase, ...skin, ...scale, ...p.style }} />;
};

/* ---------- segmented control (WIP / WAITING / DONE, WEEK / MONTH, filters) ---------- */
export function Seg<V extends string>({
  options,
  value,
  onChange,
  width,
}: {
  options: { value: V; label: string }[];
  value: V | null;
  onChange: (v: V) => void;
  width?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', width: 'max-content', border: '1px solid var(--color-text)' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="cg-seg-opt"
            style={{
              width,
              display: 'flex',
              alignItems: 'center',
              justifyContent: width ? 'center' : 'flex-start',
              padding: '9px 13px',
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              font: '600 11px/1 var(--font-body)',
              letterSpacing: '.1em',
              whiteSpace: 'nowrap',
              background: on ? 'var(--color-text)' : 'transparent',
              color: on ? 'var(--color-neutral-100)' : 'var(--color-neutral-700)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- status chip + light ---------- */
export const StatusLight = ({ status }: { status: StatusKey }) => (
  <span style={{ width: 9, height: 9, flex: 'none', background: STATUS[status] }} />
);

export const Chip = ({
  tone = 'neutral',
  children,
}: {
  tone?: 'accent' | 'accentSoft' | 'neutral' | 'ink' | 'outline';
  children: React.ReactNode;
}) => {
  const skin: React.CSSProperties =
    tone === 'ink'
      ? { background: 'var(--color-text)', color: 'var(--color-neutral-100)', border: '1px solid var(--color-text)' }
      : tone === 'accent'
      ? { background: 'var(--color-accent)', color: '#fff', border: '1px solid var(--color-accent)' }
      : tone === 'accentSoft'
      ? { background: 'var(--color-accent-200)', color: 'var(--color-accent-800)', border: '1px solid var(--color-accent-300)' }
      : tone === 'neutral'
      ? { background: 'var(--color-neutral-200)', color: 'var(--color-neutral-800)', border: '1px solid var(--color-neutral-400)' }
      : { background: 'transparent', color: 'var(--color-neutral-800)', border: '1px solid var(--color-neutral-400)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 8px',
        borderRadius: 0,
        font: '600 10.5px/1 var(--font-body)',
        letterSpacing: '.1em',
        whiteSpace: 'nowrap',
        ...skin,
      }}
    >
      {children}
    </span>
  );
};

/* ---------- KPI strip: equal cells divided by rules ---------- */
export const KpiStrip = ({
  items,
  large = true,
}: {
  items: { label: string; value: React.ReactNode; note?: string; color?: string }[];
  large?: boolean;
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      borderBottom: '2px solid var(--color-text)',
    }}
  >
    {items.map((k, i) => (
      <div
        key={k.label}
        style={{
          padding: large ? 24 : '18px 24px',
          borderRight: i < items.length - 1 ? '1px solid var(--color-divider)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={T.label}>{k.label}</div>
        <div style={{ ...(large ? T.kpi : T.kpiSmall), color: k.color || 'var(--color-text)', whiteSpace: 'nowrap' }}>
          {k.value}
        </div>
        {k.note ? <div style={T.meta}>{k.note}</div> : null}
      </div>
    ))}
  </div>
);

/* ---------- ruled list row (tasks, follow-ups, CRM rows) ---------- */
export const ListRow = ({
  status,
  children,
  onClick,
  right,
}: {
  status?: StatusKey;
  children: React.ReactNode;
  onClick?: () => void;
  right?: React.ReactNode;
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) auto',
      alignItems: 'stretch',
      borderBottom: '1px solid var(--color-divider)',
      borderLeft: status ? `3px solid ${STATUS[status]}` : undefined,
    }}
  >
    <button
      onClick={onClick}
      className="cg-row"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        alignItems: 'flex-start',
        padding: 12,
        background: 'transparent',
        border: 'none',
        borderRadius: 0,
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'var(--font-body)',
        minWidth: 0,
      }}
    >
      {children}
    </button>
    {right}
  </div>
);

/* ---------- field ---------- */
export const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ ...T.label, letterSpacing: '.12em' }}>{label}</span>
    {children}
  </label>
);

export const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--color-text)',
  borderRadius: 0,
  background: 'var(--color-neutral-100)',
  font: '400 13.5px/1 var(--font-body)',
  width: '100%',
};

/* ---------- page header ---------- */
export const PageHeader = ({
  kicker,
  title,
  actions,
}: {
  kicker?: string;
  title: string;
  actions?: React.ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 16,
      padding: '26px 28px 18px',
      borderBottom: '2px solid var(--color-text)',
      flexWrap: 'wrap',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {kicker ? (
        <div style={{ font: '500 11.5px/1 var(--font-body)', letterSpacing: '.16em', color: 'var(--color-accent-700)' }}>
          {kicker}
        </div>
      ) : null}
      <div style={T.pageTitle}>{title}</div>
    </div>
    {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div> : null}
  </div>
);
