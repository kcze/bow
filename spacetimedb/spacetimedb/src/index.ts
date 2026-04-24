import spacetimedb from './schema';
import { t, SenderError } from 'spacetimedb/server';

export default spacetimedb;

// ─── Validation caps ───────────────────────────────────────────────────────
// Hard ceilings that reject obviously impossible submissions. Picked
// generous (well above realistic play) so no one gets a legitimate run
// silently discarded — only absurdly large values are stopped.
const MAX_TIME_SECONDS = 14_400;       // 4 hours
const MAX_LEVEL = 30;                  // matches client MAX_LEVEL
// Per-second caps tuned to the integer-damage rework:
//   • Peak enemy spawn rate is 6/s, so 8 kills/s leaves headroom for the
//     wave-pause-then-flush case without crowning cheaters.
//   • One split5 + explosive3 volley can briefly spike damage into the
//     hundreds (5 direct + ~5 × ~3 damage × many enemies in a 230px cloud).
//     600/s keeps room for that without letting a cheater claim the top
//     spot with a clearly inflated total.
const MAX_KILLS_PER_SECOND = 8;
const MAX_DAMAGE_PER_SECOND = 600;
const MIN_SUBMIT_INTERVAL_MICROS = 30_000_000n; // 30 seconds per identity
const MAX_NAME_LEN = 20;

// Matches the client-side sanitizer. Strips anything that would let a
// name disrupt the leaderboard visually: control chars, combining marks
// (Zalgo), directional overrides (RTL spoof), etc. Authoritative copy
// lives on the server so clients can't bypass it.
function sanitizeName(raw: string): string {
  const trimmed = raw
    .replace(/[\p{C}\p{M}]/gu, '')
    .trim()
    .slice(0, MAX_NAME_LEN);
  return trimmed || 'Bowman';
}

// Mirrors client `levelForXp` (xp = damage dealt) after the k=5 curve
// change: xpToReach(L) = 5·L·(L-1), so L = floor((1 + sqrt(1 + 0.8·xp))/2).
// Given claimed damage, returns the max level the XP curve supports.
function levelForDamage(damage: number): number {
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + 0.8 * damage)) / 2));
}

// Strict "new run beats old run" comparator — mirrors the client-side
// leaderboard sort (damage → time → kills → level).
function isStrictlyBetter(
  a: { damage: number; timeSeconds: number; kills: number; level: number },
  b: { damage: number; timeSeconds: number; kills: number; level: number },
): boolean {
  if (a.damage !== b.damage) return a.damage > b.damage;
  if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds > b.timeSeconds;
  if (a.kills !== b.kills) return a.kills > b.kills;
  return a.level > b.level;
}

export const init = spacetimedb.init(_ctx => {
  // No-op: tables start empty on first publish.
});

export const onConnect = spacetimedb.clientConnected(_ctx => {});
export const onDisconnect = spacetimedb.clientDisconnected(_ctx => {});

export const submit_score = spacetimedb.reducer(
  {
    name: t.string(),
    level: t.u32(),
    kills: t.u32(),
    damage: t.u32(),
    timeSeconds: t.u32(),
  },
  (ctx, { name, level, kills, damage, timeSeconds }) => {
    const trimmed = sanitizeName(name);

    if (timeSeconds < 1 || timeSeconds > MAX_TIME_SECONDS) {
      throw new SenderError('invalid time');
    }
    if (level < 1 || level > MAX_LEVEL) {
      throw new SenderError('invalid level');
    }
    if (level > levelForDamage(damage)) {
      throw new SenderError('level/damage mismatch');
    }
    if (kills > MAX_KILLS_PER_SECOND * timeSeconds) {
      throw new SenderError('kills exceed physical max');
    }
    if (damage > MAX_DAMAGE_PER_SECOND * timeSeconds) {
      throw new SenderError('damage exceeds physical max');
    }

    const existingPlayer = ctx.db.player.identity.find(ctx.sender);
    if (existingPlayer) {
      const delta =
        ctx.timestamp.microsSinceUnixEpoch
        - existingPlayer.lastSubmittedAt.microsSinceUnixEpoch;
      if (delta < MIN_SUBMIT_INTERVAL_MICROS) {
        throw new SenderError('rate limit');
      }
      ctx.db.player.identity.update({
        ...existingPlayer,
        name: trimmed,
        lastSubmittedAt: ctx.timestamp,
      });
    } else {
      ctx.db.player.insert({
        identity: ctx.sender,
        name: trimmed,
        lastSubmittedAt: ctx.timestamp,
      });
    }

    // Find existing score for (identity, name). No multi-column index —
    // single-column .filter() + in-memory name check (one identity rarely
    // has more than a handful of names).
    let existing: ReturnType<typeof ctx.db.score.id.find> = null;
    for (const s of ctx.db.score.score_identity.filter(ctx.sender)) {
      if (s.name === trimmed) { existing = s; break; }
    }

    if (!existing) {
      ctx.db.score.insert({
        id: 0n,
        identity: ctx.sender,
        name: trimmed,
        level, kills, damage, timeSeconds,
        submittedAt: ctx.timestamp,
      });
      return;
    }

    const incoming = { damage, timeSeconds, kills, level };
    if (isStrictlyBetter(incoming, existing)) {
      ctx.db.score.id.update({
        ...existing,
        level, kills, damage, timeSeconds,
        submittedAt: ctx.timestamp,
      });
    }
    // else: silently ignored — new run didn't beat the stored best.
  }
);
