import * as PIXI from 'pixi.js';

// ─── Loadout kinds ──────────────────────────────────────────────────────────
export type BowKind =
  | 'basic'
  | 'split2' | 'split3' | 'split5'
  | 'ricochet1' | 'ricochet2' | 'ricochet3'
  | 'shatter1' | 'shatter2' | 'shatter3';
export type QuiverKind =
  | 'basic'
  | 'explosive' | 'explosive2' | 'explosive3'
  | 'piercing'  | 'piercing2'  | 'piercing3'
  | 'blazing'   | 'blazing2'   | 'blazing3';
export type ItemKind = 'none' | 'shield' | 'ring' | 'embers';

export type UpgradeKind = 'mod' | 'bow' | 'quiver' | 'item';

export interface Upgrade {
  id: string;
  kind: UpgradeKind;
  name: string;
  desc: string;
  weight: number;
  needBow?: BowKind;
  needQuiver?: QuiverKind;
  blockIfBow?: BowKind | BowKind[];
  blockIfQuiver?: QuiverKind | QuiverKind[];
  blockIfItem?: ItemKind | ItemKind[];
  needStatLevel?: { id: string; level: number };
  // For stat-modifier upgrades: how many times this can stack.
  maxStacks?: number;
}

export interface BowRenderStyle {
  color: number;
  accentColor?: number;
  limbLength: number;
  curve: number;
  forkCount: number;
  forkLength: number;
}

export interface BowStatsMod {
  rangeMult: number;
  drawRateMult: number;
  perArrowDamageMult: number;
}

export interface Stats {
  damageMult: number;
  speedMult: number;
  drawRateMult: number;
  reloadRateMult: number;
  arrowSpeedMult: number;
  quiverBonus: number;
}
export function baseStats(): Stats {
  return {
    damageMult: 1, speedMult: 1, drawRateMult: 1, reloadRateMult: 1,
    arrowSpeedMult: 1, quiverBonus: 0,
  };
}

export interface Loadout { bow: BowKind; quiver: QuiverKind; item: ItemKind; }

// ─── Runtime entities ───────────────────────────────────────────────────────
export type EnemyKind =
  | 'grunt' | 'weaver' | 'charger' | 'stalker'
  | 'broodmother' | 'spawnling' | 'sapper' | 'pulser'
  | 'mine';
export type ChargeState = 'pursue' | 'telegraph' | 'launching';

// Shared state for every arrow spawned by a single shot — both the initial
// split siblings and any ricochet children they spawn. Lets impact pitch
// climb across the whole volley so chaining a split3+piercing2 combo through
// nine enemies reads as one rising arc.
export interface ArrowVolley {
  hitCount: number;
}

export interface Arrow {
  gfx: PIXI.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  damage: number;
  alive: boolean;
  trailAccum: number;
  pierce: boolean;
  pierceLimit: number;
  explodeOnHit: boolean;
  explosionRadius: number;
  hitEnemies: Set<Enemy>;
  shaftColor: number;
  trailColor: number;
  coreSparkColor: number;
  bounces: number;
  blazing: boolean;
  blazingPatchDuration: number;
  blazingAccum: number;
  childArrowsSpawned: number;
  // Shatter: on every direct hit, spawn `shatterShards` radial copies at the
  // impact point, each dealing `shatterShardDamage`. Shards themselves have
  // shatterShards=0 so a burst can't chain — one level of explosion.
  shatterShards: number;
  shatterShardDamage: number;
  volley: ArrowVolley;
}

export interface Enemy {
  kind: EnemyKind;
  aura: PIXI.Sprite;
  body: PIXI.Graphics;
  x: number; y: number;
  hp: number; maxHp: number;
  radius: number;
  alive: boolean;
  pop: number;
  spawnT: number;
  emberAccum: number;
  phase: number;
  travelDx: number; travelDy: number;
  dirX: number; dirY: number;
  chargeState: ChargeState;
  chargeT: number;
  chargeDirX: number; chargeDirY: number;
  chargeVx: number; chargeVy: number;
  spawnCooldown: number;
  wanderT: number;
  xpReward: number;
}

export interface HitRing {
  gfx: PIXI.Graphics;
  x: number; y: number;
  t: number; maxT: number;
  color: number;
}

export interface Particle {
  sprite: PIXI.Sprite;
  worldX: number; worldY: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  startSize: number; endSize: number;
  startAlpha: number;
  drag: number;
  parallax: number;
}
export interface SpawnParticleArgs {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  startSize: number; endSize: number;
  startAlpha: number;
  color: number;
  drag: number;
  parallax?: number;
  // accepted + ignored (legacy call sites)
  fadeInT?: number;
  fadeOutStartT?: number;
}

export interface FirePatch {
  gfx: PIXI.Graphics;
  x: number; y: number;
  radius: number;
  duration: number;
  life: number;
  dps: number;
  emberAccum: number;
  pulsePhase: number;
  tickDamageAccum: number;
  damageBudget: number;
}

export interface RingEffect {
  gfx: PIXI.Graphics;
  x: number; y: number;
  radius: number;
  maxRadius: number;
  expandSpeed: number;
  damage: number;
  hitEnemies: Set<Enemy>;
  life: number;
}

export interface EnemyRing {
  gfx: PIXI.Graphics;
  x: number; y: number;
  radius: number;
  maxRadius: number;
  expandSpeed: number;
  damage: number;
  didHit: boolean;
}

// ─── HUD state — serialised snapshot consumed by React UI ────────────────────
export interface HudState {
  hp: number; maxHp: number;
  arrows: number; maxArrows: number;
  reloadRemaining: number;
  reloadSeconds: number;
  wave: number;
  wavePhase: 'active' | 'pause';
  waveRemaining: number;
  damageDealt: number;
  timeSurvived: number;
  dead: boolean;
  xp: number; level: number;
  xpInLevel: number; xpForLevel: number;
  kills: number;
  awaitingStart: boolean;
  paused: boolean;
  levelUpPending: boolean;
  levelUpChoices: Array<{ id: string; kind: UpgradeKind; name: string; desc: string }>;
  stats: Stats;
  statLevels: Record<string, number>;
  loadout: Loadout;
  atMaxLevel: boolean;
  shieldUp: boolean;
  shieldRegenFrac: number;
  itemPowerLevel: number;
}

// ─── Palette (per-wave theming) ──────────────────────────────────────────────
export interface Palette {
  bg: number;
  grid: number;
  arena: number;
  particleWarm: number;
  particleCool: number;
}
