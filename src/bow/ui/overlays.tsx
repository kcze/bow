import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BowKind, QuiverKind, ItemKind, Stats, Loadout, UpgradeKind } from '../types';
import { UPGRADES, BOW_RENDER } from '../upgrades';
import { BOW_LABEL, QUIVER_LABEL, QUIVER_ACCENT, ITEM_LABEL, ItemIcon, ArrowIcon } from './slots';
import { bowGeometry } from '../utils';
import { getMusicBeat } from '../sounds/music';

// ─── Card icon helpers ──────────────────────────────────────────────────────
// The level-up cards render the same visuals the HUD uses for held gear so
// the player can recognise the offered upgrade at a glance.
function bowKindFromId(id: string): BowKind | null {
  if (!id.startsWith('bow-')) return null;
  return id.slice(4) as BowKind;
}
function quiverKindFromId(id: string): QuiverKind | null {
  if (!id.startsWith('q-')) return null;
  return id.slice(2) as QuiverKind;
}
function itemKindFromId(id: string): ItemKind | null {
  // 'item-power' is a stat mod, not an item slot — must exclude.
  if (!id.startsWith('item-') || id === 'item-power') return null;
  return id.slice(5) as ItemKind;
}

function BowCardIcon({ bow, size }: { bow: BowKind; size: number }) {
  const style = BOW_RENDER[bow];
  const color = '#' + style.color.toString(16).padStart(6, '0');
  const accentColor = style.accentColor !== undefined
    ? '#' + style.accentColor.toString(16).padStart(6, '0') : null;
  // Use a generous internal coordinate space (100×100) so the tallest bow
  // (limbLength 40, forks extending another 14) still fits with margin.
  // The SVG scales the whole thing down to `size`.
  const VB = 100;
  const cx = VB * 0.5, cy = VB * 0.5;
  const geo = bowGeometry(style, cx, cy);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
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
    </svg>
  );
}

// One SVG per stat-mod id. Kept intentionally simple — a recognisable glyph
// tinted with the row's accent colour.
function StatModIcon({ id, size, color }: { id: string; size: number; color: string }) {
  const s = size, cx = s / 2, cy = s / 2;
  const stroke = { fill: 'none', stroke: color, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const solid  = { fill: color, stroke: color, strokeWidth: 0.5 };
  if (id === 'dmg') {
    // Circle with a cross that extends slightly outside — reads more as
    // "impact / target" than a plain "plus in circle".
    const r = s * 0.26;
    const armOut = s * 0.38;    // arm reaches past the circle by ~12%.
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={cx} cy={cy} r={r} {...stroke} />
        <line x1={cx - armOut} y1={cy} x2={cx + armOut} y2={cy} {...stroke} />
        <line x1={cx} y1={cy - armOut} x2={cx} y2={cy + armOut} {...stroke} />
      </svg>
    );
  }
  if (id === 'spd') {
    // Two rightward "play" triangles — fast-forward glyph.
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={`${s * 0.14},${s * 0.22} ${s * 0.52},${cy} ${s * 0.14},${s * 0.78}`} {...solid} />
        <polygon points={`${s * 0.48},${s * 0.22} ${s * 0.86},${cy} ${s * 0.48},${s * 0.78}`} {...solid} />
      </svg>
    );
  }
  if (id === 'draw') {
    // Symbolic bow built from two UP-pointing triangles — one broader at the
    // bottom (the bow body) and a smaller one above (the nocked arrow
    // tip / top limb).
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={`${cx},${s * 0.46} ${s * 0.14},${s * 0.88} ${s * 0.86},${s * 0.88}`} {...solid} />
        <polygon points={`${cx},${s * 0.10} ${s * 0.30},${s * 0.48} ${s * 0.70},${s * 0.48}`} {...solid} />
      </svg>
    );
  }
  if (id === 'reload') {
    // Circular arrow: 3/4 loop with a clear gap in the upper-right, head
    // drawn as an explicit triangle at the start of the loop pointing
    // leftward — the "re-load" direction reads as arrow-rotating-back.
    const r = s * 0.28;
    // Arc from just below "3 o'clock" going counter-clockwise (sweep=0 in
    // SVG) all the way around through 6, 9, 12 o'clock and ending just
    // above "3 o'clock". This puts the gap on the right side.
    const a0 = -Math.PI * 0.15;     // tail end (just above horizontal, on the right)
    const a1 =  Math.PI * 0.15;     // head end (just below horizontal, on the right)
    const x0 = cx + Math.cos(a0) * r;
    const y0 = cy + Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r;
    const y1 = cy + Math.sin(a1) * r;
    // large-arc=1, sweep=0 → go counter-clockwise the long way.
    const d = `M ${x0} ${y0} A ${r} ${r} 0 1 0 ${x1} ${y1}`;
    // Head sits at (x1, y1). Counter-clockwise motion in SVG at angle a1
    // has tangent (sin a1, -cos a1). We want the head to POINT in the
    // motion direction, so tip is in front, base trails behind.
    const tx = Math.sin(a1);
    const ty = -Math.cos(a1);
    const px = -ty, py = tx;        // perpendicular for the base spread
    const headLen = s * 0.16;
    const headHalf = s * 0.09;
    const tipX = x1 + tx * headLen * 0.5;
    const tipY = y1 + ty * headLen * 0.5;
    const backX = x1 - tx * headLen * 0.5;
    const backY = y1 - ty * headLen * 0.5;
    const bx1 = backX + px * headHalf;
    const by1 = backY + py * headHalf;
    const bx2 = backX - px * headHalf;
    const by2 = backY - py * headHalf;
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <path d={d} {...stroke} />
        <polygon points={`${tipX},${tipY} ${bx1},${by1} ${bx2},${by2}`} {...solid} />
      </svg>
    );
  }
  if (id === 'arrowspd') {
    // Horizontal arrow. Head: triangle pointing RIGHT at the front. Fletch:
    // a V-shape at the back (two angled lines meeting at the shaft) so it
    // can't be mistaken for another arrowhead.
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <line x1={s * 0.18} y1={cy} x2={s * 0.80} y2={cy} {...stroke} />
        <polygon points={`${s * 0.88},${cy} ${s * 0.70},${cy - s * 0.14} ${s * 0.70},${cy + s * 0.14}`} {...solid} />
        <line x1={s * 0.12} y1={cy - s * 0.14} x2={s * 0.26} y2={cy} {...stroke} />
        <line x1={s * 0.12} y1={cy + s * 0.14} x2={s * 0.26} y2={cy} {...stroke} />
      </svg>
    );
  }
  if (id === 'quiver') {
    // Plus sign next to a single arrow. Fletch drawn as a V at the tail so
    // it reads as "back of arrow" and not "second arrowhead".
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <line x1={s * 0.16} y1={cy} x2={s * 0.42} y2={cy} {...stroke} />
        <line x1={s * 0.29} y1={cy - s * 0.13} x2={s * 0.29} y2={cy + s * 0.13} {...stroke} />
        <line x1={s * 0.62} y1={s * 0.80} x2={s * 0.62} y2={s * 0.22} {...stroke} />
        <polygon points={`${s * 0.62},${s * 0.14} ${s * 0.52},${s * 0.30} ${s * 0.72},${s * 0.30}`} {...solid} />
        <line x1={s * 0.54} y1={s * 0.86} x2={s * 0.62} y2={s * 0.74} {...stroke} />
        <line x1={s * 0.70} y1={s * 0.86} x2={s * 0.62} y2={s * 0.74} {...stroke} />
      </svg>
    );
  }
  if (id === 'hp') {
    // Two plus icons of different sizes, offset vertically, so they feel
    // like "more lives added" rather than "one + one".
    const makePlus = (pcx: number, pcy: number, arm: number, key: string) => (
      <g key={key}>
        <line x1={pcx - arm} y1={pcy} x2={pcx + arm} y2={pcy} {...stroke} />
        <line x1={pcx} y1={pcy - arm} x2={pcx} y2={pcy + arm} {...stroke} />
      </g>
    );
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {makePlus(s * 0.34, s * 0.56, s * 0.16, 'big')}
        {makePlus(s * 0.70, s * 0.34, s * 0.10, 'small')}
      </svg>
    );
  }
  if (id === 'item-power') {
    // Lightning bolt, inset from the viewBox edge so the top peak isn't
    // clipped by a surrounding card with tight padding.
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={`${s * 0.58},${s * 0.18} ${s * 0.28},${s * 0.54} ${s * 0.46},${s * 0.54} ${s * 0.36},${s * 0.84} ${s * 0.72},${s * 0.46} ${s * 0.54},${s * 0.46} ${s * 0.62},${s * 0.18}`} {...solid} />
      </svg>
    );
  }
  if (id === 'heal-full') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={s * 0.42} y={s * 0.18} width={s * 0.16} height={s * 0.64} fill={color} />
        <rect x={s * 0.18} y={s * 0.42} width={s * 0.64} height={s * 0.16} fill={color} />
      </svg>
    );
  }
  return null;
}

type CardStatus = 'new' | 'upgrade' | 'replace' | 'pickup' | 'stack' | 'maxed' | null;

function computeCardStatus(
  choice: { id: string; kind: UpgradeKind },
  loadout: Loadout,
  statLevels: Record<string, number>,
): CardStatus {
  if (choice.kind === 'mod') {
    const lvl = statLevels[choice.id] ?? 0;
    if (lvl === 0) return 'new';
    return 'stack';
  }
  const u = UPGRADES.find(x => x.id === choice.id);
  if (choice.kind === 'bow') {
    const need = u?.needBow;
    if (need && need === loadout.bow && loadout.bow !== 'basic') return 'upgrade';
    if (loadout.bow !== 'basic') return 'replace';
    return 'pickup';
  }
  if (choice.kind === 'quiver') {
    const need = u?.needQuiver;
    if (need && need === loadout.quiver && loadout.quiver !== 'basic') return 'upgrade';
    if (loadout.quiver !== 'basic') return 'replace';
    return 'pickup';
  }
  if (choice.kind === 'item') {
    if (loadout.item !== 'none') return 'replace';
    return 'pickup';
  }
  return null;
}

function StatusBadge({ status }: { status: CardStatus }) {
  if (!status || status === 'stack') return null;
  if (status === 'new') {
    return (
      <span style={{
        fontSize: 9, letterSpacing: 2, padding: '2px 6px', borderRadius: 3,
        background: 'rgba(102,204,255,0.18)', border: '1px solid #66ccff', color: '#bfe4ff',
      }}>NEW</span>
    );
  }
  if (status === 'upgrade') {
    return (
      <span style={{
        fontSize: 9, letterSpacing: 2, padding: '2px 6px', borderRadius: 3,
        background: 'rgba(136,221,102,0.15)', border: '1px solid #88dd66', color: '#c8eeb5',
      }}>UPGRADE</span>
    );
  }
  if (status === 'replace') {
    return (
      <span title="Replaces your current equipment" style={{
        fontSize: 9, letterSpacing: 2, padding: '2px 6px', borderRadius: 3, display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'rgba(255,170,60,0.15)', border: '1px solid #ffaa33', color: '#ffd78a',
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,0 10,10 0,10" fill="#ffaa33" /><rect x="4.3" y="3.4" width="1.4" height="3.4" fill="#1a1a24" /><rect x="4.3" y="7.5" width="1.4" height="1.3" fill="#1a1a24" /></svg>
        REPLACE
      </span>
    );
  }
  return null;
}

const STAT_ACCENT: Record<string, string> = {
  dmg: '#ff8866', spd: '#88dd66', draw: '#ffcc44', reload: '#aaddff',
  arrowspd: '#cc99ff', quiver: '#ddbb88', hp: '#ff6688', 'item-power': '#eeaa44',
  'heal-full': '#ff6688',
};

function kindAccent(kind: UpgradeKind): string {
  return kind === 'bow' ? '#ddbb88'
       : kind === 'quiver' ? '#ff8844'
       : kind === 'item' ? '#eeaa44'
       : '#66ccff';
}

// Pick the right icon for any upgrade id. Reused by the level-up cards and
// the pause-menu icon gallery so both stay visually in sync.
function UpgradeIcon({ id, kind, size }: { id: string; kind: UpgradeKind; size: number }) {
  const bowIconKind = bowKindFromId(id);
  const quiverIconKind = quiverKindFromId(id);
  const itemIconKind = itemKindFromId(id);
  if (bowIconKind)    return <BowCardIcon bow={bowIconKind} size={size} />;
  if (quiverIconKind) return <ArrowIcon kind={quiverIconKind} fillPct={1} height={size} />;
  if (itemIconKind)   return <ItemIcon kind={itemIconKind} size={size} />;
  return <StatModIcon id={id} size={size} color={STAT_ACCENT[id] ?? kindAccent(kind)} />;
}

// ─── Level-up card ──────────────────────────────────────────────────────────
export function UpgradeCard({ idx, choice, onClick, enabled, loadout, statLevels, onHoverChange }: {
  idx: number;
  choice: { id: string; kind: UpgradeKind; name: string; desc: string };
  onClick: () => void;
  enabled: boolean;
  loadout: Loadout;
  statLevels: Record<string, number>;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const [hover, setHover] = useState(false);
  const accent = kindAccent(choice.kind);
  const kindLabel = choice.kind.toUpperCase();
  const hovered = enabled && hover;
  const status = computeCardStatus(choice, loadout, statLevels);
  const iconSize = 56;
  const setHovered = (v: boolean) => { setHover(v); onHoverChange?.(v); };

  return (
    <button
      onClick={enabled ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 210, height: 260, padding: 14,
        background: hovered ? 'rgba(44,52,68,1)' : 'rgba(28,32,44,0.9)',
        border: `1px solid ${hovered ? '#fff' : accent}`, borderRadius: 8,
        cursor: enabled ? 'pointer' : 'default',
        color: '#ddd', fontFamily: 'monospace', textAlign: 'left',
        display: 'flex', flexDirection: 'column', gap: 6,
        transform: hovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? `0 6px 20px rgba(0,0,0,0.5), 0 0 14px ${accent}` : 'none',
        transition: 'transform 120ms ease, box-shadow 180ms ease, border-color 180ms, background 180ms',
        opacity: enabled ? 1 : 0.85,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: accent, letterSpacing: 2 }}>
        <span>[{idx + 1}]</span>
        <span>{kindLabel}</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: iconSize + 8,
      }}>
        <UpgradeIcon id={choice.id} kind={choice.kind} size={iconSize} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 18 }}>
        <StatusBadge status={status} />
      </div>
      <div style={{ fontSize: 14, color: hovered ? '#fff' : '#eee', textAlign: 'center' }}>{choice.name}</div>
      <div style={{ fontSize: 11, color: '#aab', lineHeight: 1.4, flex: 1 }}>{choice.desc}</div>
    </button>
  );
}

// ─── Pause-menu icon gallery ────────────────────────────────────────────────
// Renders every upgrade with its card icon, grouped by kind. With onPick the
// tiles act as a loadout cheat — clicking applies that upgrade directly, so
// the tester can swap gear mid-run (e.g. put Explosive II on the basic bow)
// without waiting on level-up rolls.
export function UpgradeGallery({ onPick }: { onPick?: (id: string) => void }) {
  const groups: Array<{ label: string; kind: UpgradeKind }> = [
    { label: 'Mods',    kind: 'mod' },
    { label: 'Bows',    kind: 'bow' },
    { label: 'Quivers', kind: 'quiver' },
    { label: 'Items',   kind: 'item' },
  ];
  const clickable = !!onPick;
  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #223', textAlign: 'left' }}>
      <div style={{ fontSize: 10, color: '#88a', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' }}>
        Upgrade icons {clickable && <span style={{ color: '#556', marginLeft: 6, letterSpacing: 1 }}>· click to equip / stack</span>}
      </div>
      {groups.map(g => {
        const items = UPGRADES.filter(u => u.kind === g.kind);
        if (items.length === 0) return null;
        return (
          <div key={g.kind} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: '#667', letterSpacing: 2, marginBottom: 6 }}>{g.label.toUpperCase()}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 8 }}>
              {items.map(u => {
                const accent = kindAccent(u.kind);
                const tile = (
                  <>
                    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UpgradeIcon id={u.id} kind={u.kind} size={40} />
                    </div>
                    <div style={{ fontSize: 9, color: '#aab', textAlign: 'center', lineHeight: 1.2 }}>{u.name}</div>
                  </>
                );
                const baseStyle: React.CSSProperties = {
                  background: 'rgba(28,32,44,0.7)', border: '1px solid #2a2e3c',
                  borderRadius: 6, padding: 8,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  width: '100%',
                  transition: 'border-color 120ms, background 120ms, transform 120ms',
                };
                if (!clickable) {
                  return <div key={u.id} title={u.desc} style={baseStyle}>{tile}</div>;
                }
                return (
                  <button
                    key={u.id}
                    type="button"
                    title={u.desc}
                    onClick={() => onPick(u.id)}
                    style={{
                      ...baseStyle,
                      cursor: 'pointer',
                      color: '#ccd', fontFamily: 'monospace',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = accent;
                      e.currentTarget.style.background = `${accent}22`;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2a2e3c';
                      e.currentTarget.style.background = 'rgba(28,32,44,0.7)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >{tile}</button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Maps an offered upgrade id to the progression-row family label(s) it
// influences. Used by ProgressionPanel to glow rows the player already has a
// stake in, making the connection to the cards above obvious.
export function familiesForUpgrade(id: string): string[] {
  if (id.startsWith('bow-split'))    return ['Split'];
  if (id.startsWith('bow-ricochet')) return ['Ricochet'];
  if (id.startsWith('bow-shatter'))  return ['Shatter'];
  if (id.startsWith('q-explosive'))  return ['Explosive'];
  if (id.startsWith('q-piercing'))   return ['Piercing'];
  if (id.startsWith('q-blazing'))    return ['Blazing'];
  if (id === 'item-shield')          return ['Shield'];
  if (id === 'item-ring')            return ['Shockwave'];
  if (id === 'item-embers')          return ['Fire Trail'];
  // Stat mods share labels with the STAT_FAMILIES row entries below.
  const STAT_LABELS: Record<string, string> = {
    dmg: 'Damage', spd: 'Speed', draw: 'Draw', reload: 'Reload',
    arrowspd: 'Range', quiver: 'Quiver', hp: 'Max HP', 'item-power': 'Item Power',
  };
  return STAT_LABELS[id] ? [STAT_LABELS[id]] : [];
}

// ─── Floating particles behind the level-up modal ───────────────────────────
export function LevelUpParticles() {
  const particles = useMemo(() => {
    const n = 34;
    return Array.from({ length: n }).map((_, i) => {
      const left = (i / n) * 100 + (Math.random() - 0.5) * 8;
      const size = 4 + Math.random() * 10;
      const dur = 4.5 + Math.random() * 5;
      const delay = -Math.random() * dur;
      const hue = 170 + Math.random() * 100;
      const alpha = 0.3 + Math.random() * 0.35;
      return { left, size, dur, delay, hue, alpha };
    });
  }, []);

  // Whole-field sway + glow-pulse driven by the music analyser. rAF loop so
  // we can animate faster than React's 12Hz HUD sync without re-rendering.
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    let smoothBeat = 0;
    let swayT = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      swayT += dt;
      // Smoothed copy of the BPM-locked beat envelope.
      smoothBeat += (getMusicBeat() - smoothBeat) * 0.35;
      // Horizontal sway: pure sine, fixed amplitude — no music term, so no
      // jiggle bleeds in.
      const x = Math.sin(swayT * 1.1) * 18;
      // Vertical push + scale + glow all ride the beat together. Gentle
      // multipliers — every-other-beat pulses add motion without strobing.
      const y = -smoothBeat * 12;
      const scale = 1 + smoothBeat * 0.08;
      const glow = 1 + smoothBeat * 0.5;
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(3)})`;
      el.style.filter = `brightness(${glow.toFixed(2)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={containerRef} style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
      willChange: 'transform, filter',
      transformOrigin: 'center center',
      transition: 'none',
    }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${p.left}%`,
          bottom: '-24px',
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: `hsla(${p.hue}, 75%, 72%, ${p.alpha})`,
          animation: `floatUpParticle ${p.dur}s linear ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Progression panel (bows/quivers/items/stats) ───────────────────────────
const BOW_FAMILIES: Array<{ label: string; levels: BowKind[]; accent: string }> = [
  { label: 'Split',    levels: ['split2', 'split3', 'split5'],              accent: '#ccaa55' },
  { label: 'Ricochet', levels: ['ricochet1', 'ricochet2', 'ricochet3'],     accent: '#99bbcc' },
  { label: 'Shatter',  levels: ['shatter1', 'shatter2', 'shatter3'],        accent: '#cc77ee' },
];
const QUIVER_FAMILIES: Array<{ label: string; levels: QuiverKind[]; accent: string }> = [
  { label: 'Explosive', levels: ['explosive', 'explosive2', 'explosive3'], accent: '#ff8844' },
  { label: 'Piercing',  levels: ['piercing', 'piercing2', 'piercing3'],    accent: '#88ccff' },
  { label: 'Blazing',   levels: ['blazing', 'blazing2', 'blazing3'],       accent: '#ffaa33' },
];
const STAT_FAMILIES: Array<{ label: string; id: string; maxStacks: number; accent: string }> = [
  { label: 'Damage',     id: 'dmg',        maxStacks: 3, accent: '#ff8866' },
  { label: 'Speed',      id: 'spd',        maxStacks: 3, accent: '#88dd66' },
  { label: 'Draw',       id: 'draw',       maxStacks: 3, accent: '#ffcc44' },
  { label: 'Reload',     id: 'reload',     maxStacks: 3, accent: '#aaddff' },
  { label: 'Range',      id: 'arrowspd',   maxStacks: 3, accent: '#cc99ff' },
  { label: 'Quiver',     id: 'quiver',     maxStacks: 3, accent: '#ddbb88' },
  { label: 'Max HP',     id: 'hp',         maxStacks: 3, accent: '#ff6688' },
  { label: 'Item Power', id: 'item-power', maxStacks: 3, accent: '#eeaa44' },
];
const ITEM_FAMILIES: Array<{ label: string; levels: ItemKind[]; accent: string }> = [
  { label: 'Shield',      levels: ['shield'], accent: '#77ccff' },
  { label: 'Shockwave',   levels: ['ring'],   accent: '#ffaa33' },
  { label: 'Fire Trail',  levels: ['embers'], accent: '#ff7733' },
];

function levelOf<T>(current: T, levels: T[]): number {
  for (let i = levels.length - 1; i >= 0; i--) if (current === levels[i]) return i + 1;
  return 0;
}

function Chevron({ filled, color }: { filled: boolean; color: string }) {
  return (
    <div style={{
      width: 10, height: 10,
      borderLeft: `2px solid ${filled ? color : '#333844'}`,
      borderBottom: `2px solid ${filled ? color : '#333844'}`,
      transform: 'rotate(-45deg)',
      opacity: filled ? 1 : 0.5,
      transition: 'border-color 200ms, opacity 200ms',
    }} />
  );
}

export function ProgressionPanel({ bow, quiver, item, statLevels, highlightFamilies }: {
  bow: BowKind; quiver: QuiverKind; item: ItemKind; statLevels: Record<string, number>;
  highlightFamilies?: Set<string>;
}) {
  const sectionTitle: React.CSSProperties = { color: '#667', fontSize: 9, letterSpacing: 2, marginBottom: 4 };
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 };
  const cell: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120 };
  const colStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 };

  const bowPicks = BOW_FAMILIES.filter(f => levelOf(bow, f.levels) > 0);
  const quiverPicks = QUIVER_FAMILIES.filter(f => levelOf(quiver, f.levels) > 0);
  const itemPicks = ITEM_FAMILIES.filter(f => levelOf(item, f.levels) > 0);
  const statPicks = STAT_FAMILIES.filter(f => (statLevels[f.id] ?? 0) > 0);

  const renderFamilyRow = (label: string, accent: string, filled: number, total: number) => {
    const highlighted = !!highlightFamilies?.has(label);
    return (
      <div key={label} style={{
        ...cell,
        padding: highlighted ? '3px 6px' : 0,
        margin: highlighted ? '-3px -6px' : 0,
        borderRadius: 4,
        background: highlighted ? `${accent}22` : 'transparent',
        boxShadow: highlighted ? `inset 0 0 0 1px ${accent}` : 'none',
        transition: 'background 200ms, box-shadow 200ms',
      }}>
        <div style={row}>
          <span style={{ color: accent, width: 80 }}>{label}</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: total }).map((_, i) => <Chevron key={i} filled={filled > i} color={accent} />)}
          </div>
        </div>
      </div>
    );
  };

  const leftEmpty = bowPicks.length === 0 && quiverPicks.length === 0 && itemPicks.length === 0;
  const rightEmpty = statPicks.length === 0;
  if (leftEmpty && rightEmpty) return null;

  return (
    <div style={{ display: 'flex', gap: 28, justifyContent: 'center', fontFamily: 'monospace', padding: '4px 6px', flexWrap: 'wrap' }}>
      {!leftEmpty && (
        <div style={colStyle}>
          {bowPicks.length > 0 && <div style={sectionTitle}>BOWS</div>}
          {bowPicks.map(f => renderFamilyRow(f.label, f.accent, levelOf(bow, f.levels), f.levels.length))}
          {quiverPicks.length > 0 && <div style={{ ...sectionTitle, marginTop: 4 }}>QUIVERS</div>}
          {quiverPicks.map(f => renderFamilyRow(f.label, f.accent, levelOf(quiver, f.levels), f.levels.length))}
          {itemPicks.length > 0 && <div style={{ ...sectionTitle, marginTop: 4 }}>ITEMS</div>}
          {itemPicks.map(f => renderFamilyRow(f.label, f.accent, levelOf(item, f.levels), f.levels.length))}
        </div>
      )}
      {!rightEmpty && (
        <div style={colStyle}>
          <div style={sectionTitle}>STATS</div>
          {statPicks.map(f => renderFamilyRow(f.label, f.accent, statLevels[f.id] ?? 0, f.maxStacks))}
        </div>
      )}
    </div>
  );
}

// ─── Debug panel (Tab) ──────────────────────────────────────────────────────
export function DebugPanel({ stats, loadout, onClose }: {
  stats: Stats; loadout: Loadout; onClose: () => void;
}) {
  const statRows: Array<[string, string]> = [
    ['damage bonus',     '+' + stats.damageBonus],
    ['speed mult',       stats.speedMult.toFixed(2) + 'x'],
    ['draw rate mult',   stats.drawRateMult.toFixed(2) + 'x'],
    ['reload mult',      stats.reloadRateMult.toFixed(2) + 'x'],
    ['arrow speed mult', stats.arrowSpeedMult.toFixed(2) + 'x'],
    ['quiver bonus',     '+' + stats.quiverBonus],
  ];
  return (
    <div style={{
      position: 'fixed', top: 14, right: 14, zIndex: 30,
      width: 440, maxHeight: '90vh', overflowY: 'auto',
      background: 'rgba(12,14,22,0.95)', border: '1px solid #445', borderRadius: 8,
      padding: 14, color: '#ccd', fontFamily: 'monospace', fontSize: 11,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: '#88aadd', letterSpacing: 2 }}>MODIFIERS</div>
        <button onClick={onClose} style={{
          background: 'transparent', border: '1px solid #445', color: '#aab',
          borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
        }}>TAB / X</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ color: '#99b', marginBottom: 4 }}>Active stats</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {statRows.map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '2px 4px', color: '#aab' }}>{k}</td>
                <td style={{ padding: '2px 4px', color: '#fff', textAlign: 'right' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ color: '#99b', marginBottom: 4 }}>Loadout</div>
        <div style={{ color: '#ffd288' }}>Bow: {BOW_LABEL[loadout.bow]}</div>
        <div style={{ color: QUIVER_ACCENT[loadout.quiver] }}>Quiver: {QUIVER_LABEL[loadout.quiver]}</div>
        <div style={{ color: '#eeaa44' }}>Item: {ITEM_LABEL[loadout.item] || '—'}</div>
      </div>

      <div>
        <div style={{ color: '#99b', marginBottom: 4 }}>Upgrade catalog</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#667' }}>
              <th style={{ textAlign: 'left', padding: '2px 4px' }}>name</th>
              <th style={{ textAlign: 'left', padding: '2px 4px' }}>kind</th>
              <th style={{ textAlign: 'right', padding: '2px 4px' }}>wt</th>
            </tr>
          </thead>
          <tbody>
            {UPGRADES.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #1a1a24' }}>
                <td style={{ padding: '3px 4px' }}>
                  <div style={{ color: '#fff' }}>{u.name}</div>
                  <div style={{ color: '#889', fontSize: 10 }}>{u.desc}</div>
                </td>
                <td style={{ padding: '3px 4px', color: u.kind === 'bow' ? '#ddbb88' : u.kind === 'quiver' ? '#ff8844' : u.kind === 'item' ? '#eeaa44' : '#66ccff' }}>{u.kind}</td>
                <td style={{ padding: '3px 4px', textAlign: 'right', color: '#aab' }}>{u.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
