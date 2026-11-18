// Shared Engineer's Odyssey data: districts, chapters and unlock rules.
// Used by GameMap (the full map) and World (the home screen "Continue" card).
// ─────────────────────────────────────────────────────────────────────────────
// DISTRICTS
// ─────────────────────────────────────────────────────────────────────────────
export const DISTRICTS = {
  1: { name: 'The Valley',          subtitle: 'Origin Stories',          color: '#00c896', glow: '#00c89633', bg: '#00c89611', difficulty: 'Easy',       emoji: '🌱' },
  2: { name: 'The Arena',           subtitle: 'Corporate Wars',           color: '#1a73e8', glow: '#1a73e833', bg: '#1a73e811', difficulty: 'Medium',     emoji: '⚔️' },
  3: { name: 'The Fortress',        subtitle: 'Final Boss Gauntlet',      color: '#ff4d4d', glow: '#ff4d4d33', bg: '#ff4d4d11', difficulty: 'Hard',       emoji: '🔥' },
  4: { name: 'Enterprise Empire',   subtitle: 'Microsoft · Oracle · Salesforce · Adobe · Broadcom', color: '#a855f7', glow: '#a855f733', bg: '#a855f711', difficulty: 'Enterprise', emoji: '🏢' },
  5: { name: 'The FinTech Frontier', subtitle: 'Stripe · PayPal · Ant Group · Adyen · Wise', color: '#00D4AA', glow: '#00D4AA33', bg: '#00D4AA0d', difficulty: 'FinTech', emoji: '💳' },
  6: { name: 'Consulting Kingdom', subtitle: 'Accenture · TCS · Infosys · Capgemini · Cognizant', emoji: '🏛️', color: '#f59e0b', glow: '#f59e0b33', bg: '#f59e0b11', difficulty: 'Consulting' },
  7: { name: 'The Silicon Frontier', subtitle: 'Tesla · NVIDIA · Qualcomm · Li Auto · Robert Bosch', emoji: '🔩', color: '#e82127', glow: '#e8212733', bg: '#e8212711', difficulty: 'Deep Tech' },
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTERS — source of truth for titles, colors, problem counts
// ─────────────────────────────────────────────────────────────────────────────
export const CHAPTERS = {
  // ── District 1: The Valley ──
  1: { district: 1, company: 'Google', title: 'The Search Engine War',          badge: '🔍', color: '#4285f4', problems: 20 },
  2: { district: 1, company: 'Amazon', title: 'The Fulfillment Crisis',          badge: '📦', color: '#ff9900', problems: 15 },
  3: { district: 1, company: 'Apple',  title: 'The Launch Day Panic',            badge: '🍎', color: '#a2aaad', problems: 15 },
  // ── District 2: The Arena ──
  4: { district: 2, company: 'Meta',   title: 'The Algorithm That Broke Democracy', badge: '🌐', color: '#0081fb', problems: 15 },
  5: { district: 2, company: 'Google', title: 'The City That Disappeared',           badge: '🗺️', color: '#4285f4', problems: 15 },
  6: { district: 2, company: 'Amazon', title: 'The Cloud That Crashed',              badge: '☁️', color: '#ff9900', problems: 20 },
  // ── District 3: The Fortress ──
  7: { district: 3, company: 'Apple',     title: 'The Model Gone Rogue',             badge: '🤖', color: '#a2aaad', problems: 15 },
  8: { district: 3, company: 'Microsoft', title: 'The Billion Dollar Outage',        badge: '⚡', color: '#00a4ef', problems: 15 },
  9: { district: 3, company: 'Google',    title: 'DeepMind Intelligence Wars',       badge: '🧠', color: '#4285f4', problems: 20 },
  // ── District 4: Enterprise Empire ──
  14: { district: 4, company: 'Microsoft', title: 'The Gates of Redmond',            badge: '🪟', color: '#00a4ef', problems: 15 },
  15: { district: 4, company: 'Microsoft', title: 'The Azure Depths',                badge: '☁️', color: '#00a4ef', problems: 15 },
  16: { district: 4, company: 'Microsoft', title: 'The Redmond Boss Fight',          badge: '⚔️', color: '#00a4ef', problems: 5,  isBoss: true },
  17: { district: 4, company: 'Oracle', title: 'The Oracle Database Labyrinth',      badge: '🗄️', color: '#f80000', problems: 15 },
  18: { district: 4, company: 'Oracle', title: 'The Cloud SQL Catacombs',            badge: '☁️', color: '#f80000', problems: 15 },
  19: { district: 4, company: 'Oracle', title: "Larry's Boss Chamber",               badge: '⚔️', color: '#f80000', problems: 5,  isBoss: true },
  20: { district: 4, company: 'Salesforce', title: 'The Salesforce Tower',           badge: '☁️', color: '#00a1e0', problems: 10 },
  21: { district: 4, company: 'Salesforce', title: 'The CRM Colosseum',              badge: '🏟️', color: '#00a1e0', problems: 10 },
  22: { district: 4, company: 'Salesforce', title: "Marc's Boss Fight",              badge: '⚔️', color: '#00a1e0', problems: 5,  isBoss: true },
  23: { district: 4, company: 'Adobe', title: 'The Adobe Studio',                   badge: '🎨', color: '#ff0000', problems: 10 },
  24: { district: 4, company: 'Adobe', title: 'The Creative Cloud',                 badge: '☁️', color: '#ff0000', problems: 10 },
  25: { district: 4, company: 'Adobe', title: 'The Render Farm Boss',               badge: '⚔️', color: '#ff0000', problems: 5,  isBoss: true },
  26: { district: 4, company: 'Broadcom', title: 'The Broadcom Chip Floor',         badge: '🔌', color: '#ef4444', problems: 10 },
  27: { district: 4, company: 'Broadcom', title: 'Silicon Valley Signals',          badge: '📡', color: '#ef4444', problems: 10 },
  28: { district: 4, company: 'Broadcom', title: 'The ASIC Boss Fight',             badge: '⚔️', color: '#ef4444', problems: 5,  isBoss: true },
  // ── District 5: The FinTech Frontier ──
  29: { district: 5, company: 'Stripe', title: 'The Stripe Codex',                  badge: '💳', color: '#635BFF', problems: 15 },
  30: { district: 5, company: 'Stripe', title: 'The Payment Rails',                 badge: '⚡', color: '#635BFF', problems: 15 },
  31: { district: 5, company: 'Stripe', title: 'The Idempotency Boss Fight',        badge: '⚔️', color: '#635BFF', problems: 5,  isBoss: true },
  32: { district: 5, company: 'PayPal', title: 'The PayPal Protocols',              badge: '🅿️', color: '#0070E0', problems: 15 },
  33: { district: 5, company: 'PayPal', title: 'Trust at Scale',                    badge: '🛡️', color: '#0070E0', problems: 15 },
  34: { district: 5, company: 'PayPal', title: 'The Checkout Boss Fight',           badge: '⚔️', color: '#0070E0', problems: 5,  isBoss: true },
  35: { district: 5, company: 'Ant Group', title: 'The Ant Group Algorithms',       badge: '🐜', color: '#00A854', problems: 15 },
  36: { district: 5, company: 'Ant Group', title: 'Super App at Scale',             badge: '📱', color: '#00A854', problems: 15 },
  37: { district: 5, company: 'Ant Group', title: 'Singles Day Boss Fight',         badge: '⚔️', color: '#00A854', problems: 5,  isBoss: true },
  38: { district: 5, company: 'Adyen', title: 'The Adyen Architecture',             badge: '🌍', color: '#0ABF53', problems: 15 },
  39: { district: 5, company: 'Adyen', title: 'The Global Commerce Engine',         badge: '🔀', color: '#0ABF53', problems: 15 },
  40: { district: 5, company: 'Adyen', title: 'The Reconciliation Boss Fight',      badge: '⚔️', color: '#0ABF53', problems: 5,  isBoss: true },
  41: { district: 5, company: 'Wise', title: 'The Wise Equations',                  badge: '💱', color: '#9FE870', problems: 15 },
  42: { district: 5, company: 'Wise', title: 'The Cross-Border Rails',              badge: '🌐', color: '#9FE870', problems: 15 },
  43: { district: 5, company: 'Wise', title: 'The Settlement Singularity',          badge: '⚔️', color: '#9FE870', problems: 7,  isBoss: true },
  // ── District 6: Consulting Kingdom ──
  44: { district: 6, company: 'Accenture', problems: 10, title: 'The Accenture AI Citadel', badge: '🧠', color: '#a100ff' },
  45: { district: 6, company: 'Accenture', problems: 10, title: 'The Cloud Transformation Lab', badge: '☁️', color: '#a100ff' },
  46: { district: 6, company: 'Accenture', title: 'The Digital Transformation Boss', badge: '⚔️', color: '#a100ff', problems: 10, isBoss: true },
  47: { district: 6, company: 'TCS', title: 'The Banking Systems Modernization', badge: '🏦', color: '#2563eb', problems: 10 },
  48: { district: 6, company: 'TCS', title: 'The Enterprise Integration Patterns', badge: '🔗', color: '#2563eb', problems: 10 },
  49: { district: 6, company: 'TCS', title: 'The Data Processing Boss', badge: '⚔️', color: '#2563eb', problems: 10, isBoss: true },
  50: { district: 6, company: 'Infosys', title: 'The AI Business Automation Lab', badge: '🤖', color: '#06b6d4', problems: 10 },
  51: { district: 6, company: 'Infosys', title: 'The ERP Optimization Arena', badge: '📊', color: '#06b6d4', problems: 10 },
  52: { district: 6, company: 'Infosys', title: 'The Sustainability Boss', badge: '⚔️', color: '#06b6d4', problems: 10, isBoss: true },
  53: { district: 6, company: 'Capgemini', title: 'The Customer Experience Engine', badge: '🎯', color: '#12abdb', problems: 10 },
  54: { district: 6, company: 'Capgemini', title: 'The Multi-Cloud Architecture Hub', badge: '☁️', color: '#12abdb', problems: 10 },
  55: { district: 6, company: 'Capgemini', title: 'The Smart Manufacturing Boss', badge: '⚔️', color: '#12abdb', problems: 10, isBoss: true },
  56: { district: 6, company: 'Cognizant', title: 'The Healthcare Technology Solutions', badge: '🏥', color: '#22c55e', problems: 10 },
  57: { district: 6, company: 'Cognizant', title: 'The Financial Analytics Platform', badge: '📈', color: '#22c55e', problems: 10 },
  58: { district: 6, company: 'Cognizant', title: 'The Enterprise Innovation Boss', badge: '⚔️', color: '#22c55e', problems: 10, isBoss: true },
  // ── District 7: The Silicon Frontier ──
  59: { district: 7, company: 'Tesla', title: 'The Autopilot Trials', badge: '🚗', color: '#e82127', problems: 15 },
  60: { district: 7, company: 'Tesla', title: 'The Gigafactory Depths', badge: '🏭', color: '#e82127', problems: 12 },
  61: { district: 7, company: 'Tesla', title: "Musk's Robotaxi Boss Fight", badge: '⚔️', color: '#e82127', problems: 8, isBoss: true },
  62: { district: 7, company: 'NVIDIA', title: 'The CUDA Core Trials', badge: '🎮', color: '#76b900', problems: 13 },
  63: { district: 7, company: 'NVIDIA', title: 'The Silicon Fabrication Vault', badge: '🔬', color: '#76b900', problems: 10 },
  64: { district: 7, company: 'NVIDIA', title: 'The Blackwell Boss Fight', badge: '⚔️', color: '#76b900', problems: 12, isBoss: true },
  65: { district: 7, company: 'Qualcomm', title: 'The Snapdragon Circuits', badge: '📱', color: '#3253dc', problems: 15 },
  66: { district: 7, company: 'Qualcomm', title: 'The 5G Signal Depths', badge: '📡', color: '#3253dc', problems: 9 },
  67: { district: 7, company: 'Qualcomm', title: 'The 6G Spectrum Boss Fight', badge: '⚔️', color: '#3253dc', problems: 6, isBoss: true },
  68: { district: 7, company: 'Bosch', title: 'The Sensor Fusion Workshop', badge: '⚙️', color: '#ea0016', problems: 12 },
  69: { district: 7, company: 'Bosch', title: 'The Safety-Critical Foundry', badge: '🛡️', color: '#ea0016', problems: 11 },
  70: { district: 7, company: 'Bosch', title: 'The Airbag Millisecond Boss', badge: '⚔️', color: '#ea0016', problems: 5, isBoss: true },
  71: { district: 7, company: 'Li Auto', title: 'The Battery Swap Yards', badge: '🔋', color: '#00b899', problems: 6 },
  72: { district: 7, company: 'Li Auto', title: 'The NOA Traffic Gauntlet', badge: '🚦', color: '#00b899', problems: 9 },
  73: { district: 7, company: 'Li Auto', title: 'The Shanghai Robotaxi Boss', badge: '⚔️', color: '#00b899', problems: 7, isBoss: true },
};

export const ORDER = Object.keys(CHAPTERS).map(Number).sort((a, b) => a - b);
export const DISTRICT_IDS = Object.keys(DISTRICTS).map(Number);
export const ALWAYS_OPEN = [1, 4, 5, 6, 7];
export const FIRST_CHAPTERS = [1, 14, 29, 44, 59];

// Same unlock rules GameMap uses: next chapter opens after one solve in the
// previous chapter; a new district opens at 50% of the previous district.
export function computeOdyssey(problems = [], progress = {}) {
  const solvedIn = (list) => list.filter((p) => progress[p.id]?.solved).length;
  const unlocked = [...FIRST_CHAPTERS];
  if (problems.length) {
    for (const id of ORDER) {
      if (unlocked.includes(id)) continue;
      const prev = CHAPTERS[id - 1], cur = CHAPTERS[id];
      if (!prev) continue;
      if (prev.district !== cur.district) {
        const dp = problems.filter((p) => p.district === prev.district);
        if (dp.length && solvedIn(dp) / dp.length >= 0.5) unlocked.push(id);
        continue;
      }
      const pp = problems.filter((p) => p.chapter === id - 1);
      if (pp.some((p) => progress[p.id]?.solved)) unlocked.push(id);
    }
  }
  const districtOpen = (d) => ALWAYS_OPEN.includes(d) || unlocked.includes(ORDER.find((id) => CHAPTERS[id].district === d));
  const chapters = ORDER.map((id) => {
    const ch = CHAPTERS[id];
    const solved = solvedIn(problems.filter((p) => p.chapter === id));
    const total = ch.problems || 0;
    const state = !districtOpen(ch.district) ? 'fog' : total > 0 && solved >= total ? 'done' : unlocked.includes(id) ? 'active' : 'locked';
    return { id, ...ch, solved, total, state };
  });
  const districts = DISTRICT_IDS.map((d) => {
    const rs = chapters.filter((c) => c.district === d);
    const solved = rs.reduce((a, c) => a + c.solved, 0), total = rs.reduce((a, c) => a + c.total, 0);
    return { id: d, ...DISTRICTS[d], solved, total, open: districtOpen(d), cleared: rs.length > 0 && rs.every((c) => c.state === 'done') };
  });
  // Where to continue: an open chapter already started, else the first open one.
  const current = chapters.find((c) => c.state === 'active' && c.solved > 0) || chapters.find((c) => c.state === 'active') || chapters[0];
  const totalSolved = chapters.reduce((a, c) => a + c.solved, 0);
  return { chapters, districts, current, totalSolved };
}
