import { Identity } from 'spacetimedb';
import { DbConnection } from './module_bindings';

// Published Maincloud instance for the "bow" online leaderboard. Module
// source lives in ./spacetimedb; regenerate bindings with
// `spacetime generate --lang typescript --out-dir src/module_bindings
// --module-path spacetimedb/spacetimedb`.
export const MODULE_NAME = 'bow-leaderboard-jngim';
export const MODULE_URI = 'wss://maincloud.spacetimedb.com';

// Anonymous identity is persisted across sessions so a returning player's
// overwrite-if-better rule actually overwrites their own prior row.
const TOKEN_LS = 'bow.spacetime.token';

function loadToken(): string | undefined {
  try { return localStorage.getItem(TOKEN_LS) ?? undefined; } catch { return undefined; }
}

function saveToken(token: string) {
  try { localStorage.setItem(TOKEN_LS, token); } catch { /* ignore */ }
}

// Single builder reused by the provider. `DbConnection.builder()` is
// pure — same config every render — so constructing it at module scope
// is equivalent to `useMemo(..., [])`.
export const connectionBuilder = DbConnection.builder()
  .withUri(MODULE_URI)
  .withDatabaseName(MODULE_NAME)
  .withToken(loadToken())
  .onConnect((_ctx: unknown, _identity: Identity, token: string) => saveToken(token));
