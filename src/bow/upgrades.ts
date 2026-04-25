import type { BowKind, QuiverKind, BowRenderStyle, BowStatsMod, Upgrade } from './types';

// Tree membership + tier (0 = base, 1..3 = upgrade levels) for each bow/quiver.
// Used by the card roller to offer tier-matched cross-tree swaps — e.g. a
// player on split3 sees ricochet2/shatter2 instead of tier-1 entries, so
// switching trees mid-run isn't a downgrade.
export type BowTree = 'split' | 'ricochet' | 'shatter';
export type QuiverTree = 'explosive' | 'piercing' | 'blazing';

export const BOW_TREE_OF: Record<BowKind, BowTree | null> = {
  basic: null,
  split2: 'split', split3: 'split', split5: 'split',
  ricochet1: 'ricochet', ricochet2: 'ricochet', ricochet3: 'ricochet',
  shatter1: 'shatter', shatter2: 'shatter', shatter3: 'shatter',
};
export const BOW_TIER_OF: Record<BowKind, 0 | 1 | 2 | 3> = {
  basic: 0,
  split2: 1, ricochet1: 1, shatter1: 1,
  split3: 2, ricochet2: 2, shatter2: 2,
  split5: 3, ricochet3: 3, shatter3: 3,
};
export const BOW_UPGRADE_BY_TIER: Record<BowTree, Record<1 | 2 | 3, string>> = {
  split:    { 1: 'bow-split2',    2: 'bow-split3',    3: 'bow-split5'    },
  ricochet: { 1: 'bow-ricochet1', 2: 'bow-ricochet2', 3: 'bow-ricochet3' },
  shatter:  { 1: 'bow-shatter1',  2: 'bow-shatter2',  3: 'bow-shatter3'  },
};

export const QUIVER_TREE_OF: Record<QuiverKind, QuiverTree | null> = {
  basic: null,
  explosive: 'explosive', explosive2: 'explosive', explosive3: 'explosive',
  piercing: 'piercing', piercing2: 'piercing', piercing3: 'piercing',
  blazing: 'blazing', blazing2: 'blazing', blazing3: 'blazing',
};
export const QUIVER_TIER_OF: Record<QuiverKind, 0 | 1 | 2 | 3> = {
  basic: 0,
  explosive: 1, piercing: 1, blazing: 1,
  explosive2: 2, piercing2: 2, blazing2: 2,
  explosive3: 3, piercing3: 3, blazing3: 3,
};
export const QUIVER_UPGRADE_BY_TIER: Record<QuiverTree, Record<1 | 2 | 3, string>> = {
  explosive: { 1: 'q-explosive', 2: 'q-explosive2', 3: 'q-explosive3' },
  piercing:  { 1: 'q-piercing',  2: 'q-piercing2',  3: 'q-piercing3'  },
  blazing:   { 1: 'q-blazing',   2: 'q-blazing2',   3: 'q-blazing3'   },
};

export const BOW_RENDER: Record<BowKind, BowRenderStyle> = {
  basic:     { color: 0xddbb88, limbLength: 28, curve: 6,  forkCount: 0, forkLength: 0 },
  split2:    { color: 0xccaa55, accentColor: 0xffe088, limbLength: 34, curve: 9,  forkCount: 1, forkLength: 12 },
  split3:    { color: 0x55bbdd, accentColor: 0xaadcff, limbLength: 40, curve: 12, forkCount: 2, forkLength: 14 },
  split5:    { color: 0x6677ee, accentColor: 0xccddff, limbLength: 44, curve: 14, forkCount: 3, forkLength: 16 },
  ricochet1: { color: 0x99bbcc, accentColor: 0xddf0ff, limbLength: 30, curve: 7,  forkCount: 0, forkLength: 0 },
  ricochet2: { color: 0xbbddee, accentColor: 0xffffff, limbLength: 34, curve: 9,  forkCount: 0, forkLength: 0 },
  ricochet3: { color: 0xddeeff, accentColor: 0xffffff, limbLength: 38, curve: 11, forkCount: 0, forkLength: 0 },
  shatter1:  { color: 0xaa77dd, accentColor: 0xddbbff, limbLength: 30, curve: 6,  forkCount: 2, forkLength: 8  },
  shatter2:  { color: 0xcc66ee, accentColor: 0xeeccff, limbLength: 34, curve: 8,  forkCount: 3, forkLength: 10 },
  shatter3:  { color: 0xee44ff, accentColor: 0xffddff, limbLength: 38, curve: 10, forkCount: 4, forkLength: 12 },
};

// Bows set per-arrow INTEGER damage. Multi-arrow bows (split) pay a damage
// penalty; single-arrow bows stay at the basic 3. Final arrow damage adds
// stats.damageBonus (0–3 from the +1 Damage mod).
export const BOW_STATS: Record<BowKind, BowStatsMod> = {
  basic:     { rangeMult: 1, drawRateMult: 1, arrowDamage: 3 },
  split2:    { rangeMult: 1, drawRateMult: 1, arrowDamage: 2 },
  split3:    { rangeMult: 1, drawRateMult: 1, arrowDamage: 2 },
  split5:    { rangeMult: 1, drawRateMult: 1, arrowDamage: 2 },
  // Ricochet keeps full 3 damage at every tier — the bow is already weak,
  // so it needs the damage ceiling to justify picking it.
  ricochet1: { rangeMult: 1, drawRateMult: 1, arrowDamage: 3 },
  ricochet2: { rangeMult: 1, drawRateMult: 1, arrowDamage: 3 },
  ricochet3: { rangeMult: 1, drawRateMult: 1, arrowDamage: 3 },
  shatter1:  { rangeMult: 1, drawRateMult: 1, arrowDamage: 3 },
  shatter2:  { rangeMult: 1, drawRateMult: 1, arrowDamage: 3 },
  shatter3:  { rangeMult: 1, drawRateMult: 1, arrowDamage: 3 },
};

// Base damage each shatter shard deals (before the +2 Damage mod bonus is
// added — every arrow, including shards, gets the bonus). Shards still
// inherit quiver effects (explosive / pierce / blazing).
export const SHATTER_SHARD_DAMAGE: Partial<Record<BowKind, number>> = {
  shatter1: 1,
  shatter2: 1,
  shatter3: 1,
};

export const SHATTER_SHARD_COUNT: Partial<Record<BowKind, number>> = {
  shatter1: 3,
  shatter2: 5,
  shatter3: 7,
};

export const UPGRADES: Upgrade[] = [
  // Stat mods — 3 levels each, smaller bumps per level so progression is slower.
  { id: 'dmg',       kind: 'mod', name: '+2 Damage',           desc: 'Every arrow deals 2 more damage.',        weight: 10, maxStacks: 3 },
  { id: 'spd',       kind: 'mod', name: '+10% Move Speed',     desc: 'You move 10% faster.',                    weight: 10, maxStacks: 3 },
  { id: 'draw',      kind: 'mod', name: '+10% Draw Speed',     desc: 'Bow reaches full draw 10% faster.',       weight: 8,  maxStacks: 3 },
  { id: 'reload',    kind: 'mod', name: '+20% Reload',         desc: 'Arrows replenish 20% faster.',            weight: 8,  maxStacks: 3 },
  { id: 'arrowspd',  kind: 'mod', name: '+10% Arrow Range',    desc: 'Arrows fly 10% farther (same draw).',     weight: 7,  maxStacks: 3 },
  { id: 'quiver',    kind: 'mod', name: '+1 Max Arrows',       desc: 'Carry one more arrow. Refills you.',      weight: 6,  maxStacks: 3 },
  { id: 'hp',        kind: 'mod', name: '+1 Max HP',           desc: 'One more health rectangle. Fully heals.', weight: 6,  maxStacks: 3 },
  { id: 'item-power', kind: 'mod', name: 'Item Power',         desc: 'Makes your equipped item stronger.',      weight: 6,  maxStacks: 3, blockIfItem: 'none' },
  // Healing mod — only appears once HP has been maxed (3 stacks). Fully heals.
  { id: 'heal-full', kind: 'mod', name: 'Full Heal',           desc: 'Restores your health to full.',           weight: 5,  needStatLevel: { id: 'hp', level: 3 } },
  { id: 'bow-split2',    kind: 'bow', name: 'Split Bow II',   desc: 'Fires 2 arrows. 2 base damage each.',                           weight: 4, blockIfBow: ['split2', 'split3', 'split5'], needBow: 'basic' },
  { id: 'bow-split3',    kind: 'bow', name: 'Split Bow III',  desc: 'Fires 3 arrows. 2 base damage each.',                           weight: 3, needBow: 'split2' },
  { id: 'bow-split5',    kind: 'bow', name: 'Split Bow V',    desc: 'Fires 5 arrows. 2 base damage each.',                           weight: 2, needBow: 'split3' },
  { id: 'bow-ricochet1', kind: 'bow', name: 'Ricochet Bow',   desc: 'Arrows bounce to 1 more enemy on hit. 3 base damage.',          weight: 3, blockIfBow: ['ricochet1', 'ricochet2', 'ricochet3'] },
  { id: 'bow-ricochet2', kind: 'bow', name: 'Ricochet II',    desc: 'Arrows bounce to 2 more enemies on hit. 3 base damage.',        weight: 2, needBow: 'ricochet1' },
  { id: 'bow-ricochet3', kind: 'bow', name: 'Ricochet III',   desc: 'Arrows bounce to 3 more enemies on hit. 3 base damage.',        weight: 2, needBow: 'ricochet2' },
  { id: 'bow-shatter1',  kind: 'bow', name: 'Shatter Bow',    desc: 'Arrows burst into 3 shards on hit. 3 base damage + 1 per shard.', weight: 3, blockIfBow: ['shatter1', 'shatter2', 'shatter3'] },
  { id: 'bow-shatter2',  kind: 'bow', name: 'Shatter II',     desc: 'Burst grows to 5 shards (1 base damage each).',                  weight: 2, needBow: 'shatter1' },
  { id: 'bow-shatter3',  kind: 'bow', name: 'Shatter III',    desc: 'Burst grows to 7 shards (1 base damage each).',                  weight: 2, needBow: 'shatter2' },
  { id: 'q-explosive',   kind: 'quiver', name: 'Explosive Arrows',     desc: 'Arrows detonate on impact.',                          weight: 4, blockIfQuiver: ['explosive', 'explosive2', 'explosive3'] },
  { id: 'q-explosive2',  kind: 'quiver', name: 'Explosive Arrows II',  desc: 'Larger blast radius.',                                weight: 3, needQuiver: 'explosive' },
  { id: 'q-explosive3',  kind: 'quiver', name: 'Explosive Arrows III', desc: 'Even larger blast radius.',                           weight: 2, needQuiver: 'explosive2' },
  { id: 'q-piercing',    kind: 'quiver', name: 'Piercing Arrows',      desc: 'Arrows pierce through up to 2 enemies.',              weight: 4, blockIfQuiver: ['piercing', 'piercing2', 'piercing3'] },
  { id: 'q-piercing2',   kind: 'quiver', name: 'Piercing Arrows II',   desc: 'Arrows pierce through up to 3 enemies.',              weight: 3, needQuiver: 'piercing' },
  { id: 'q-piercing3',   kind: 'quiver', name: 'Piercing Arrows III',  desc: 'Arrows pierce through up to 4 enemies.',              weight: 2, needQuiver: 'piercing2' },
  { id: 'q-blazing',     kind: 'quiver', name: 'Blazing Arrows',       desc: 'Arrows leave a trail of fire that damages enemies.',  weight: 4, blockIfQuiver: ['blazing', 'blazing2', 'blazing3'] },
  { id: 'q-blazing2',    kind: 'quiver', name: 'Blazing Arrows II',    desc: 'Fire trail lingers longer.',                          weight: 3, needQuiver: 'blazing' },
  { id: 'q-blazing3',    kind: 'quiver', name: 'Blazing Arrows III',   desc: 'Fire trail lingers even longer.',                     weight: 2, needQuiver: 'blazing2' },
  { id: 'item-shield',    kind: 'item', name: 'Shield',               desc: 'Barrier that blocks one hit. Recovers over time.',       weight: 3, blockIfItem: 'shield' },
  { id: 'item-ring',      kind: 'item', name: 'Shockwave',            desc: 'Emits a damaging ring whenever you take damage.',         weight: 3, blockIfItem: 'ring' },
  { id: 'item-embers',    kind: 'item', name: 'Fire Trail',           desc: 'You drop a burning patch on every beat while moving. Item Power extends each patch.', weight: 3, blockIfItem: 'embers' },
];
