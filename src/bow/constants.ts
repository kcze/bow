// ─── Feel tuning ─────────────────────────────────────────────────────────────
export const PLAYER_SPEED = 260;
export const DRAW_PLAYER_SPEED_MULT = 0.45;
export const DRAW_RATE = 1.1;

// Base arrow damage for the starting bow. Each bow in BOW_STATS picks its own
// integer `arrowDamage`; the `+1 Damage` mod stacks on top (0–3). Enemies use
// integer HP too, so every shot resolves to a clean "N hits to kill" count.
export const ARROW_DAMAGE = 3;
export const MIN_RANGE = 170;
export const MAX_RANGE = 460;
export const FLIGHT_TIME = 0.35;

export const CAM_LOOKAHEAD = 90;
export const CAM_LERP = 0.16;

// Player
// HP is now discrete: 5 base, each Max HP upgrade adds 1 (cap 8). All damage
// sources deal exactly 1, so the HUD reads one rectangle per hit.
export const PLAYER_MAX_HP = 5;
export const PLAYER_MAX_HP_CAP = 8;

// Quiver — sequential reload
export const QUIVER_CAPACITY = 3;
export const ARROW_RELOAD_S = 1.5;

// ─── Bow geometry ────────────────────────────────────────────────────────────
export const BOW_GRIP_OFFSET = 14;
export const BOW_LIMB_LENGTH = 28;
export const BOW_REST_BEND = 0.18;
export const BOW_DRAW_BEND = 0.40;
export const BOW_MAX_PULL = 16;
export const ARROW_LENGTH = 36;

// Range indicator silhouettes — larger than held bow
export const BOW_SIL_LIMB_LENGTH = 46;
export const BOW_SIL_CUR_ALPHA = 0.6;
export const BOW_SIL_MAX_ALPHA = 0.22;

// ─── Enemies ─────────────────────────────────────────────────────────────────
// All player damage is 1 per source — HP is discrete (7–10 rectangles).
export const ENEMY_TOUCH_DAMAGE = 1;

// Grunt — walks in a STRAIGHT line across the arena, does not follow the player.
export const GRUNT_RADIUS = 22;
export const GRUNT_SPEED = 110;
export const GRUNT_HP = 2;
export const GRUNT_XP = 3;
export const GRUNT_AURA_TINT = 0xcc4a66;
export const GRUNT_FILL_DARK = 0x2e1820;
export const GRUNT_FILL_MID  = 0xa64558;
export const GRUNT_FILL_HIGH = 0xe8abb8;
export const GRUNT_STROKE    = 0xcc6a82;
export const GRUNT_EMBER     = 0xdd5577;

// Weaver — same visual as grunt, wavy path across the arena, still does not follow.
export const WEAVER_SPEED = 138;
export const WEAVER_LATERAL_AMP = 120;
export const WEAVER_LATERAL_FREQ = 3.4;
export const WEAVER_XP = 6;

// Broodmother — big slow grunt that crosses the arena and spits small
// spawnlings at the player periodically.
export const BROODMOTHER_RADIUS = 40;
export const BROODMOTHER_SPEED = 55;
export const BROODMOTHER_HP = 8;
export const BROODMOTHER_XP = 25;
export const BROODMOTHER_SPAWN_INTERVAL = 2.4;
export const BROODMOTHER_AURA_TINT = 0xe83366;
export const BROODMOTHER_FILL_DARK = 0x3a0f22;
export const BROODMOTHER_FILL_MID  = 0xcc2a55;
export const BROODMOTHER_FILL_HIGH = 0xffaacc;
export const BROODMOTHER_STROKE    = 0xee5580;
export const BROODMOTHER_EMBER     = 0xff4477;

// Sapper — random-walker that drops damaging mines. Yellow palette shared w/ pulser.
export const SAPPER_RADIUS = 24;
export const SAPPER_SPEED = 70;
export const SAPPER_HP = 5;
export const SAPPER_MINE_INTERVAL = 3.2;
export const SAPPER_WANDER_CHANGE = 2.4;   // seconds between picking a new target heading
export const SAPPER_TURN_RATE = 1.2;       // rad/s — smooth steer toward target
export const SAPPER_LIFETIME = 22;

// Pulser — slow mover that emits indestructible short-range rings at the player.
export const PULSER_RADIUS = 28;
export const PULSER_SPEED = 55;
export const PULSER_HP = 6;
export const PULSER_PULSE_INTERVAL = 3.0;
export const PULSER_RING_MAX_RADIUS = 150;
export const PULSER_RING_SPEED = 280;
export const PULSER_RING_DAMAGE = 1;
export const PULSER_LIFETIME = 22;

export const YELLOW_AURA_TINT = 0xeecc33;
export const YELLOW_FILL_DARK = 0x3a2e10;
export const YELLOW_FILL_MID  = 0xbb9922;
export const YELLOW_FILL_HIGH = 0xffeeaa;
export const YELLOW_STROKE    = 0xeedd66;
export const YELLOW_EMBER     = 0xffdd66;

// Pulser palette — slightly more orange + saturated than sapper so the two
// are immediately distinguishable on screen.
export const PULSER_AURA_TINT = 0xee9922;
export const PULSER_FILL_DARK = 0x3a1d08;
export const PULSER_FILL_MID  = 0xcc6615;
export const PULSER_FILL_HIGH = 0xffcc88;
export const PULSER_STROKE    = 0xee9933;
export const PULSER_EMBER     = 0xff9933;

// Mines dropped by Sapper — static hazard, damages player on contact.
// Contact damage flows through ENEMY_TOUCH_DAMAGE like any other enemy.
export const MINE_RADIUS = 20;
export const MINE_LIFETIME = 12;

// Spawnling — small fast projectile-enemy launched by a broodmother.
export const SPAWNLING_RADIUS = 12;
export const SPAWNLING_SPEED = 225;
export const SPAWNLING_HP = 1;
export const SPAWNLING_XP = 1;
export const SPAWNLING_MAX_LIFE = 4.5;
export const SPAWNLING_AURA_TINT = 0xee5577;
export const SPAWNLING_FILL_MID  = 0xcc4466;
export const SPAWNLING_STROKE    = 0xee6699;
export const SPAWNLING_EMBER     = 0xff6688;

// Charger — re-tuned so it's an actual threat: faster pursuit, longer lunge.
export const CHARGER_RADIUS = 26;
export const CHARGER_HP = 4;
export const CHARGER_XP = 15;
export const CHARGER_PURSUE_SPEED = 95;
export const CHARGER_DETECT_RANGE = 380;
export const CHARGER_TELEGRAPH_S = 0.9;
export const CHARGER_LAUNCH_SPEED = 680;
export const CHARGER_LAUNCH_DRAG = 0.5;
export const CHARGER_MIN_LAUNCH_SPEED = 110;
export const CHARGER_MAX_LAUNCH_T = 1.2;
export const CHARGER_AURA_TINT = 0x9a55dd;
export const CHARGER_FILL_DARK = 0x20112f;
export const CHARGER_FILL_MID  = 0x6844a8;
export const CHARGER_FILL_HIGH = 0xd8b0f8;
export const CHARGER_STROKE    = 0xa66dcc;
export const CHARGER_EMBER     = 0xaa66ee;

// Stalker — fast at all times, follows the player but turns slowly.
export const STALKER_RADIUS = 22;
export const STALKER_SPEED = 240;
export const STALKER_TURN_RATE = 1.35;
export const STALKER_HP = 3;
export const STALKER_XP = 10;
export const STALKER_LIFETIME = 22;
export const STALKER_AURA_TINT = 0x7766dd;
export const STALKER_FILL_DARK = 0x161028;
export const STALKER_FILL_MID  = 0x5444bb;
export const STALKER_FILL_HIGH = 0xb8a8f0;
export const STALKER_STROKE    = 0x8877dd;
export const STALKER_EMBER     = 0x8877ee;

export const GRUNT_DESPAWN_MARGIN = 160;

// ─── Arena & waves ───────────────────────────────────────────────────────────
export const ARENA_RADIUS = 1000;
export const ARENA_COLOR = 0x4a66a8;
export const WAVE_DURATION = 28;
export const WAVE_PAUSE_S = 2.0;
export const WAVE_BASE_COUNT = 3;

// ─── XP & levels ─────────────────────────────────────────────────────────────
export const MAX_LEVEL = 30;

// ─── Split bow spreads (degrees) ─────────────────────────────────────────────
export const SPLIT2_SPREAD_DEG = 14;
export const SPLIT3_SPREAD_DEG = 22;
export const SPLIT5_SPREAD_DEG = 34;

// ─── Explosive arrow ─────────────────────────────────────────────────────────
// Explosion deals the arrow's full damage to every enemy in radius, once each
// (same one-hit-per-enemy rule as arrows). Its value is AoE coverage, not a
// damage multiplier.
export const EXPLOSION_RADIUS = 75;

// ─── Blazing Chevron — fire trail along the flight path ──────────────────────
export const BLAZING_PATCH_SPACING = 38;
export const BLAZING_PATCH_RADIUS = 28;
export const BLAZING_PATCH_DURATION_1 = 1.0;
export const BLAZING_PATCH_DURATION_2 = 1.5;
export const BLAZING_PATCH_DURATION_3 = 2.5;
// One hit per enemy per patch (arrow-style), not a DoT.
export const BLAZING_PATCH_HIT_DAMAGE = 2;

// ─── Items (all passive) ─────────────────────────────────────────────────────
export const SHIELD_REGEN_BASE = 30;
export const SHIELD_REGEN_PER_POWER = -2;

export const SHOCKWAVE_EXPAND_SPEED = 520;
export const SHOCKWAVE_MAX_RADIUS_BASE = 240;
export const SHOCKWAVE_MAX_RADIUS_PER_POWER = 45;
export const SHOCKWAVE_DAMAGE_BASE = 4;
export const SHOCKWAVE_DAMAGE_PER_POWER = 2;

// Fire Trail — passive item. Drops a burning patch on every beat while the
// player is moving. Item Power extends patch lifetime (longer-lasting fire)
// rather than dropping more patches.
export const EMBER_TRAIL_PATCH_DURATION_BASE = 1.6;
export const EMBER_TRAIL_PATCH_DURATION_PER_POWER = 0.7;
export const EMBER_TRAIL_PATCH_RADIUS = 34;
export const EMBER_TRAIL_PATCH_HIT_DAMAGE = 2;
