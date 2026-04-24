import * as PIXI from 'pixi.js';
import type { BowRenderStyle } from './types';
import { BOW_REST_BEND } from './constants';

export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Format seconds as M:SS.
export function fmtMMSS(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

// Shared soft radial glow — used for the player / enemy auras.
let glowTextureCache: PIXI.Texture | null = null;
export function getGlowTexture(): PIXI.Texture {
  if (glowTextureCache) return glowTextureCache;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTextureCache = PIXI.Texture.from(canvas);
  return glowTextureCache;
}

// Solid hard-edged circle for particles — no soft gradient, no alpha fade.
let circleTextureCache: PIXI.Texture | null = null;
export function getCircleTexture(): PIXI.Texture {
  if (circleTextureCache) return circleTextureCache;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  circleTextureCache = PIXI.Texture.from(canvas);
  return circleTextureCache;
}

// Weighted random pick without replacement.
export function weightedPickN<T extends { weight: number }>(pool: T[], n: number): T[] {
  const remaining = [...pool];
  const out: T[] = [];
  for (let i = 0; i < n && remaining.length > 0; i++) {
    const total = remaining.reduce((s, u) => s + u.weight, 0);
    if (total <= 0) break;
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < remaining.length - 1; idx++) {
      r -= remaining[idx].weight;
      if (r <= 0) break;
    }
    out.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return out;
}

// ─── XP curve ─────────────────────────────────────────────────────────────────
// Quadratic: xpToReach(L) = 5 * L * (L - 1). Each level costs 25% more XP
// than the prior k=4 tuning, so early leveling slows after the integer-damage
// rework (bigger hits → more XP/hit) started producing levels too quickly.
export function xpToReachLevel(level: number) { return 5 * level * (level - 1); }
export function levelForXp(xp: number) {
  // Invert 5*L*(L-1) <= xp → L <= (1 + sqrt(1 + 0.8 * xp)) / 2
  const L = Math.floor((1 + Math.sqrt(1 + 0.8 * xp)) / 2);
  return Math.max(1, L);
}

// ─── Bow geometry (SVG / shape helpers) ──────────────────────────────────────
export function bowGeometry(style: BowRenderStyle, cx: number, cy: number) {
  const aimNx = 1, aimNy = 0;
  const perpX = -aimNy, perpY = aimNx;
  const cosB = Math.cos(BOW_REST_BEND), sinB = Math.sin(BOW_REST_BEND);
  const upTipX = cx + (perpX * cosB - aimNx * sinB) * style.limbLength;
  const upTipY = cy + (perpY * cosB - aimNy * sinB) * style.limbLength;
  const loTipX = cx + (-perpX * cosB - aimNx * sinB) * style.limbLength;
  const loTipY = cy + (-perpY * cosB - aimNy * sinB) * style.limbLength;
  const upBulgeX = (cx + upTipX) * 0.5 + aimNx * style.curve;
  const upBulgeY = (cy + upTipY) * 0.5 + aimNy * style.curve;
  const loBulgeX = (cx + loTipX) * 0.5 + aimNx * style.curve;
  const loBulgeY = (cy + loTipY) * 0.5 + aimNy * style.curve;
  const upLimb = `${cx},${cy} ${upBulgeX},${upBulgeY} ${upTipX},${upTipY}`;
  const loLimb = `${cx},${cy} ${loBulgeX},${loBulgeY} ${loTipX},${loTipY}`;
  const accent = style.accentColor !== undefined ? {
    up: `${cx},${cy} ${(cx + upBulgeX) * 0.5 + aimNx * style.curve * 0.25},${(cy + upBulgeY) * 0.5 + aimNy * style.curve * 0.25} ${cx + (upTipX - cx) * 0.6},${cy + (upTipY - cy) * 0.6}`,
    lo: `${cx},${cy} ${(cx + loBulgeX) * 0.5 + aimNx * style.curve * 0.25},${(cy + loBulgeY) * 0.5 + aimNy * style.curve * 0.25} ${cx + (loTipX - cx) * 0.6},${cy + (loTipY - cy) * 0.6}`,
  } : null;
  const forks: string[] = [];
  if (style.forkCount > 0 && style.forkLength > 0) {
    const drawForks = (tipX: number, tipY: number) => {
      const dir = Math.atan2(tipY - cy, tipX - cx);
      const halfSpread = 0.55;
      for (let i = 0; i < style.forkCount; i++) {
        const ft = style.forkCount === 1 ? 0 : (i / (style.forkCount - 1)) - 0.5;
        const fa = dir + ft * halfSpread * 2;
        const w = 0.16;
        forks.push(
          `${tipX},${tipY} ${tipX + Math.cos(fa - w) * style.forkLength},${tipY + Math.sin(fa - w) * style.forkLength} ${tipX + Math.cos(fa + w) * style.forkLength},${tipY + Math.sin(fa + w) * style.forkLength}`
        );
      }
    };
    drawForks(upTipX, upTipY);
    drawForks(loTipX, loTipY);
  }
  return { upLimb, loLimb, upTipX, upTipY, loTipX, loTipY, accent, forks };
}
