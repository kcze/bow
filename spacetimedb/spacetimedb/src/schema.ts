import { schema, table, t } from 'spacetimedb/server';

// Per-identity metadata. Tracks the latest name and when the identity last
// submitted a score (used for rate limiting).
export const player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(),
    name: t.string(),
    lastSubmittedAt: t.timestamp(),
  }
);

// One row per (identity, name) — represents that player's best-ever run
// under that name. Re-submissions overwrite only when strictly better.
export const score = table(
  {
    name: 'score',
    public: true,
    indexes: [
      { accessor: 'score_identity', algorithm: 'btree', columns: ['identity'] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    identity: t.identity(),
    name: t.string(),
    level: t.u32(),
    kills: t.u32(),
    damage: t.u32(),
    timeSeconds: t.u32(),
    submittedAt: t.timestamp(),
  }
);

const spacetimedb = schema({ player, score });
export default spacetimedb;
