import type { BowKind, QuiverKind, ItemKind } from '../types';
import { BOW_RENDER } from '../upgrades';
import { ARROW_RELOAD_S } from '../constants';
import { bowGeometry } from '../utils';

// ─── Labels + accent colours ────────────────────────────────────────────────
export const BOW_LABEL: Record<BowKind, string> = {
  basic: 'Basic Bow',
  split2: 'Split II', split3: 'Split III', split5: 'Split V',
  ricochet1: 'Ricochet I', ricochet2: 'Ricochet II', ricochet3: 'Ricochet III',
  shatter1: 'Shatter I', shatter2: 'Shatter II', shatter3: 'Shatter III',
};

export const QUIVER_LABEL: Record<QuiverKind, string> = {
  basic: 'Basic Arrows',
  explosive: 'Explosive I', explosive2: 'Explosive II', explosive3: 'Explosive III',
  piercing: 'Piercing I', piercing2: 'Piercing II', piercing3: 'Piercing III',
  blazing: 'Blazing I', blazing2: 'Blazing II', blazing3: 'Blazing III',
};
export const QUIVER_ACCENT: Record<QuiverKind, string> = {
  basic: '#ffd288',
  explosive: '#ff8844', explosive2: '#ff6622', explosive3: '#ff4411',
  piercing: '#88ccff', piercing2: '#55aaff', piercing3: '#3388ff',
  blazing: '#ffaa33', blazing2: '#ff8811', blazing3: '#ff6600',
};

export const ITEM_LABEL: Record<ItemKind, string> = {
  none: '',
  shield: 'Shield',
  ring: 'Shockwave',
  embers: 'Fire Trail',
};
export const ITEM_ACCENT: Record<ItemKind, string> = {
  none: '#444',
  shield: '#77ccff',
  ring: '#ffaa33',
  embers: '#ff7733',
};

// ─── Arrow icon config (per quiver kind) ────────────────────────────────────
export const ARROW_ICON_CFG: Record<QuiverKind, {
  shaft: string; head: string; core: string; fletch: string;
  thick: number; headShape: 'triangle' | 'round' | 'needle';
}> = {
  basic:      { shaft: '#ffeecc', head: '#fff6dc', core: '#fff',     fletch: '#ffd288', thick: 1.5, headShape: 'triangle' },
  explosive:  { shaft: '#ff8844', head: '#ff6633', core: '#ffee99',  fletch: '#ff7733', thick: 2.2, headShape: 'round'    },
  explosive2: { shaft: '#ff7733', head: '#ff4422', core: '#ffdd88',  fletch: '#ff5522', thick: 2.6, headShape: 'round'    },
  explosive3: { shaft: '#ff5511', head: '#ff3311', core: '#ffcc66',  fletch: '#ff3300', thick: 3.0, headShape: 'round'    },
  piercing:   { shaft: '#88ccff', head: '#ddf4ff', core: '#ccefff',  fletch: '#66ccff', thick: 1.3, headShape: 'needle'   },
  piercing2:  { shaft: '#66aaff', head: '#ddf4ff', core: '#ccefff',  fletch: '#55aaff', thick: 1.5, headShape: 'needle'   },
  piercing3:  { shaft: '#3388ff', head: '#ddf4ff', core: '#ccefff',  fletch: '#3388ff', thick: 1.8, headShape: 'needle'   },
  blazing:    { shaft: '#ffcc66', head: '#ff8844', core: '#ffee88',  fletch: '#ff7722', thick: 1.7, headShape: 'triangle' },
  blazing2:   { shaft: '#ffaa44', head: '#ff6622', core: '#ffdd66',  fletch: '#ff5511', thick: 2.0, headShape: 'triangle' },
  blazing3:   { shaft: '#ff8822', head: '#ff4411', core: '#ffcc55',  fletch: '#ff3300', thick: 2.3, headShape: 'triangle' },
};

// ─── Bow slot ────────────────────────────────────────────────────────────────
export function BowSlot({ bow }: { bow: BowKind }) {
  const style = BOW_RENDER[bow];
  const color = '#' + style.color.toString(16).padStart(6, '0');
  const accentColor = style.accentColor !== undefined
    ? '#' + style.accentColor.toString(16).padStart(6, '0') : null;
  const cx = 60, cy = 34;
  const geo = bowGeometry(style, cx, cy);
  const arrowCount = bow === 'split5' ? 5 : bow === 'split3' ? 3 : bow === 'split2' ? 2 : 1;
  const arrowSpread = arrowCount === 5 ? 12 : arrowCount === 3 ? 9 : arrowCount === 2 ? 5 : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={96} height={68} viewBox="0 0 120 68">
        <polygon points={geo.upLimb} fill={color} />
        <polygon points={geo.loLimb} fill={color} />
        {geo.accent && accentColor && (
          <>
            <polygon points={geo.accent.up} fill={accentColor} />
            <polygon points={geo.accent.lo} fill={accentColor} />
          </>
        )}
        {geo.forks.map((pts, i) => <polygon key={i} points={pts} fill={color} />)}
        <line x1={geo.upTipX} y1={geo.upTipY} x2={geo.loTipX} y2={geo.loTipY}
          stroke="#fff" strokeWidth="0.6" opacity="0.6" />
        {Array.from({ length: arrowCount }).map((_, i) => {
          const t = arrowCount === 1 ? 0.5 : i / (arrowCount - 1);
          const yOff = (t - 0.5) * arrowSpread * 2;
          const y = cy + yOff;
          return (
            <polygon key={i} points={`${cx + 18},${y} ${cx + 6},${y - 4.5} ${cx + 6},${y + 4.5}`} fill="#ffeecc" />
          );
        })}
      </svg>
      <div style={{ fontSize: 10, color, letterSpacing: 1 }}>{BOW_LABEL[bow]}</div>
    </div>
  );
}

// ─── Arrow icon (shape in quiver slot) ──────────────────────────────────────
export function ArrowIcon({ kind, fillPct, height }: {
  kind: QuiverKind; fillPct: number; height: number;
}) {
  const cfg = ARROW_ICON_CFG[kind];
  const W = 14, H = 44;
  const topInsetPct = (1 - fillPct) * 100;
  return (
    <svg
      width={height * (W / H)}
      height={height}
      viewBox={`0 0 ${W} ${H}`}
      style={{ clipPath: `inset(${topInsetPct}% 0 0 0)` }}
    >
      <line x1={W / 2} y1="8" x2={W / 2} y2={H - 8} stroke={cfg.shaft} strokeWidth={cfg.thick} />
      {cfg.headShape === 'triangle' && (
        <polygon points={`${W / 2},0 ${W / 2 - 4},8 ${W / 2 + 4},8`} fill={cfg.head} />
      )}
      {cfg.headShape === 'round' && (
        <>
          <circle cx={W / 2} cy="5" r="3.6" fill={cfg.head} />
          <circle cx={W / 2} cy="5" r="1.7" fill={cfg.core} />
        </>
      )}
      {cfg.headShape === 'needle' && (
        <polygon points={`${W / 2},0 ${W / 2 - 1.6},12 ${W / 2 + 1.6},12`} fill={cfg.head} />
      )}
      <polygon
        points={`${W / 2},${H - 8} ${W / 2 - 3.2},${H - 2} ${W / 2 + 3.2},${H - 2}`}
        fill={cfg.fletch}
      />
    </svg>
  );
}

// ─── Quiver slot — draws each arrow; they fill up as reload progresses ──────
export function QuiverSlot({ arrows, max, reloadRemaining, reloadSeconds, kind }: {
  arrows: number; max: number; reloadRemaining: number; reloadSeconds: number; kind: QuiverKind;
}) {
  void ARROW_RELOAD_S;  // constant kept re-exportable from elsewhere if needed
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 56 }}>
        {Array.from({ length: max }).map((_, i) => {
          let fillPct = 0;
          if (i < arrows) fillPct = 1;
          else if (i === arrows && reloadRemaining > 0) {
            fillPct = Math.max(0, Math.min(1, 1 - reloadRemaining / reloadSeconds));
          }
          return <ArrowIcon key={i} kind={kind} fillPct={fillPct} height={52} />;
        })}
      </div>
      <div style={{ fontSize: 10, color: QUIVER_ACCENT[kind], letterSpacing: 1 }}>{QUIVER_LABEL[kind]}</div>
    </div>
  );
}

// ─── Item slot ──────────────────────────────────────────────────────────────
export function ItemIcon({ kind, size }: { kind: ItemKind; size: number }) {
  const c = ITEM_ACCENT[kind];
  const s = size;
  const cx = s / 2, cy = s / 2;
  if (kind === 'shield') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <path d={`M ${cx} ${cy - s * 0.32} L ${cx - s * 0.28} ${cy - s * 0.18} L ${cx - s * 0.28} ${cy + s * 0.1} Q ${cx - s * 0.28} ${cy + s * 0.32} ${cx} ${cy + s * 0.36} Q ${cx + s * 0.28} ${cy + s * 0.32} ${cx + s * 0.28} ${cy + s * 0.1} L ${cx + s * 0.28} ${cy - s * 0.18} Z`}
          fill="rgba(100,170,230,0.35)" stroke={c} strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === 'ring') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={cx} cy={cy} r={s * 0.12} fill="rgba(255,200,102,0.6)" />
        <circle cx={cx} cy={cy} r={s * 0.22} stroke={c} strokeWidth="1.6" fill="none" opacity="0.85" />
        <circle cx={cx} cy={cy} r={s * 0.32} stroke={c} strokeWidth="1.1" fill="none" opacity="0.5" />
      </svg>
    );
  }
  if (kind === 'embers') {
    // Three descending ember blobs (like footstep fire drops)
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {[-s * 0.22, 0, s * 0.22].map((dx, i) => {
          const yOff = Math.abs(dx) * 0.35;
          const r = s * (0.11 - i * 0.01);
          return (
            <g key={i}>
              <circle cx={cx + dx} cy={cy + yOff + 2} r={r * 1.6} fill="rgba(255,120,50,0.18)" />
              <circle cx={cx + dx} cy={cy + yOff} r={r} fill="rgba(255,160,60,0.7)" stroke={c} strokeWidth="1.1" />
            </g>
          );
        })}
      </svg>
    );
  }
  return null;
}

export function ItemSlot({ item, shieldUp, shieldRegenFrac, itemPower, placeholder }: {
  item: ItemKind;
  shieldUp: boolean;
  shieldRegenFrac: number;
  itemPower: number;
  // When true AND no item is equipped, draws a "?" so the slot reads as
  // "something can go here" rather than dead whitespace. Used during the
  // start-screen highlight state.
  placeholder?: boolean;
}) {
  if (item === 'none') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 64, height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {placeholder && (
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '2px dashed #ffaa66',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffaa66', fontFamily: 'monospace', fontSize: 22, fontWeight: 700,
            }}>?</div>
          )}
        </div>
        <div style={{ fontSize: 10, color: placeholder ? '#ffaa66' : '#556', letterSpacing: 1 }}>
          {placeholder ? 'Item' : '\u00A0'}
        </div>
      </div>
    );
  }
  const accent = ITEM_ACCENT[item];
  const isShield = item === 'shield';
  const fillFrac = isShield ? (shieldUp ? 1 : shieldRegenFrac) : 1;
  const fullyCharged = isShield && shieldUp;
  const clipTop = (1 - fillFrac) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 64, height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {isShield && !fullyCharged && (
          <div style={{ position: 'absolute', opacity: 0.18 }}>
            <ItemIcon kind={item} size={48} />
          </div>
        )}
        <div style={{
          clipPath: `inset(${clipTop}% 0 0 0)`,
          transition: 'clip-path 120ms linear',
          filter: fullyCharged ? `drop-shadow(0 0 8px ${accent})` : 'none',
        }}>
          <ItemIcon kind={item} size={48} />
        </div>
      </div>
      <div style={{ fontSize: 10, color: accent, letterSpacing: 1 }}>
        {ITEM_LABEL[item]}
        {itemPower > 0 && <span style={{ color: '#ffcc44', marginLeft: 4 }}>+{itemPower}</span>}
      </div>
    </div>
  );
}
