import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import './Odyssey.css';

// ─────────────────────────────────────────────────────────────────────────────
// DISTRICTS
// ─────────────────────────────────────────────────────────────────────────────
const DISTRICTS = {
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
const CHAPTERS = {
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

// Short codes shown on each company's map tile (no logos)
const COMPANY_CODES = {
  Google: 'GO', Amazon: 'AM', Apple: 'AP', Meta: 'ME', Microsoft: 'MS', Oracle: 'OR', Salesforce: 'SF', Adobe: 'AD', Broadcom: 'BC',
  Stripe: 'ST', PayPal: 'PP', 'Ant Group': 'AG', Adyen: 'AY', Wise: 'WI', Accenture: 'AC', TCS: 'TCS', Infosys: 'IN', Capgemini: 'CG', Cognizant: 'CZ',
  Tesla: 'TS', NVIDIA: 'NV', Qualcomm: 'QC', Bosch: 'BO', 'Li Auto': 'LA',
};
const ORDER = Object.keys(CHAPTERS).map(Number).sort((a, b) => a - b);
const DISTRICT_IDS = Object.keys(DISTRICTS).map(Number);
const ALWAYS_OPEN = [1, 4, 5, 6, 7];
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };

// The look saved on the Profile page (user doc first, then this device)
function loadLook(uid, userData) {
  let saved = userData?.avatarLook || null;
  if (!saved) { try { saved = JSON.parse(localStorage.getItem(`evoprofile:${uid || 'anon'}`) || 'null'); } catch (e) { saved = null; } }
  return saved || {};
}

function Stars({ count = 0, max = 3 }) {
  return <span className="od-stars" aria-label={`${count} of ${max} stars`}>{Array.from({ length: max }).map((_, i) => <span key={i} className={i < count ? 'on' : ''}>★</span>)}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER PROBLEMS (same logic as before: sequential unlocks, /solve/:id)
// ─────────────────────────────────────────────────────────────────────────────
function ChapterProblems({ chapterId, chapter, problems, userProgress, onBack }) {
  const navigate = useNavigate();
  const diffColor = { Easy: '#00c896', Medium: '#1a73e8', Hard: '#ff4d4d', Enterprise: '#a855f7', FinTech: '#00D4AA' };
  return (
    <div style={{ '--c': chapter.color }}>
      <div className="od-chhead">
        <button className="od-btn" onClick={onBack} style={{ marginBottom: 14 }}>&larr; Back to map</button>
        <div className="tag">CHAPTER {chapterId} · {chapter.company.toUpperCase()}{chapter.isBoss ? ' · BOSS' : ''}</div>
        <h2>{chapter.title}</h2>
        <p>{problems.length} problems loaded</p>
      </div>
      {problems.length === 0 ? (
        <div className="od-empty">
          No problems found for Chapter {chapterId}.<br />
          Make sure the seed script has been run and problems have <code>chapter: {chapterId}</code> as a number.
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className="od-btn" href={`${API_BASE}/problems/debug`} target="_blank" rel="noreferrer">Check /problems/debug</a>
            <a className="od-btn" href={`${API_BASE}/problems?chapter=${chapterId}`} target="_blank" rel="noreferrer">Check chapter {chapterId} raw</a>
          </div>
        </div>
      ) : (
        <div className="od-plist">
          {problems.map((problem, idx) => {
            const prog = userProgress[problem.id] || {};
            const isSolved = prog.solved || false;
            const isLocked = idx > 0 && !userProgress[problems[idx - 1]?.id]?.solved;
            const dc = diffColor[problem.difficulty] || '#888';
            const boss = problem.isBoss || chapter.isBoss;
            return (
              <button key={problem.id} className={`od-prob${isSolved ? ' solved' : ''}`} disabled={isLocked} onClick={() => navigate(`/solve/${problem.id}`)}>
                <span className="num">{idx + 1}</span>
                <span style={{ width: 22, flex: 'none', textAlign: 'center', color: isSolved ? chapter.color : '#9aa79f' }} aria-hidden="true">{isLocked ? '🔒' : isSolved ? '✓' : boss ? '⚔' : '○'}</span>
                <span className="ttl">
                  <b>{problem.title}</b>
                  {boss && <span className="od-pill" style={{ color: '#ff6b6b' }}>BOSS</span>}
                  {problem.enterpriseOnly && <span className="od-pill" style={{ color: '#c084fc' }}>ENTERPRISE</span>}
                  {chapter.district === 5 && <span className="od-pill" style={{ color: '#00D4AA' }}>FINTECH</span>}
                  <small>{[...(problem.tags || []).slice(0, 3), problem.pattern].filter(Boolean).join(' · ')}</small>
                </span>
                {isSolved && <Stars count={prog.stars || 0} max={3} />}
                <span className="od-pill" style={{ color: dc }}>{problem.difficulty}</span>
                <span className="od-rw"><b>+{problem.xpReward || 100} XP</b><span>+{problem.creditReward || 10} CR</span></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GAMEMAP
// ─────────────────────────────────────────────────────────────────────────────
export default function GameMap({ user, userData }) {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [stats, setStats] = useState({ totalSolved: 0, totalXp: 0, currentStreak: 0 });
  const [view, setView] = useState('map');
  const [panelId, setPanelId] = useState(null);
  const [toast, setToast] = useState('');
  const uid = user?.uid;

  // ── Fetch problems + progress (unchanged) ──
  const fetchData = useCallback(async () => {
    if (!uid) return;
    setLoading(true); setError('');
    try {
      const [probRes, progRes] = await Promise.all([
        axios.get(`${API_BASE}/problems`, { params: { limit: 1000 } }),
        axios.get(`${API_BASE}/problems/progress/${uid}`).catch(() => ({ data: { progress: {} } })),
      ]);
      const all = (probRes.data?.problems || []).map((p) => ({
        ...p,
        chapter: Number(p.chapter || 0), district: Number(p.district || 0), orderInChapter: Number(p.orderInChapter || 0),
        xpReward: Number(p.xpReward || 100), creditReward: Number(p.creditReward || 20),
      })).filter((p) => p.chapter >= 1 && p.chapter <= 73 && p.district >= 1 && p.problemType !== 'roadmap' && p.source !== 'roadmap' && p.isRoadmap !== true && p.roadmap !== true && p.excludeFromOdyssey !== true);
      const prog = progRes.data?.progress || {};
      setProblems(all); setUserProgress(prog);
      const solved = all.filter((p) => prog[p.id]?.solved).length;
      const totalXp = Object.values(prog).reduce((s, p) => s + (p.xpEarned || 0), 0);
      setStats({ totalSolved: solved, totalXp, currentStreak: userData?.currentStreak || userData?.streak || 0 });
    } catch (err) {
      console.error('GameMap fetch error:', err.message);
      setError(err.message);
    } finally { setLoading(false); }
  }, [uid, userData?.currentStreak, userData?.streak]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Chapter progress (unchanged) ──
  const getChapterProgress = useCallback((chapterId) => {
    const chProbs = problems.filter((p) => p.chapter === Number(chapterId));
    const solved = chProbs.filter((p) => userProgress[p.id]?.solved).length;
    const stars = chProbs.reduce((s, p) => s + (userProgress[p.id]?.stars || 0), 0);
    return { solved, total: CHAPTERS[chapterId]?.problems || 0, stars };
  }, [problems, userProgress]);

  // ── Unlock logic (unchanged) ──
  const unlockedChapters = useMemo(() => {
    const unlocked = [1, 14, 29, 44, 59];
    if (problems.length === 0) return unlocked;
    for (const id of ORDER) {
      if (unlocked.includes(id)) continue;
      const prevChapter = CHAPTERS[id - 1], thisChapter = CHAPTERS[id];
      if (!prevChapter) continue;
      if (prevChapter.district !== thisChapter.district) {
        const prevDistrictProblems = problems.filter((p) => p.district === prevChapter.district);
        if (prevDistrictProblems.length === 0) continue;
        const pct = prevDistrictProblems.filter((p) => userProgress[p.id]?.solved).length / prevDistrictProblems.length;
        if (pct >= 0.5) unlocked.push(id);
        continue;
      }
      const prevProblems = problems.filter((p) => p.chapter === id - 1);
      if (prevProblems.length === 0) continue;
      if (prevProblems.some((p) => userProgress[p.id]?.solved)) unlocked.push(id);
    }
    return unlocked;
  }, [problems, userProgress]);

  const districtOpen = useCallback((d) => {
    const first = ORDER.find((id) => CHAPTERS[id].district === d);
    return ALWAYS_OPEN.includes(d) || unlockedChapters.includes(first);
  }, [unlockedChapters]);

  // ── One row per chapter, in path order, with its map state ──
  const rows = useMemo(() => ORDER.map((id) => {
    const ch = CHAPTERS[id], pr = getChapterProgress(id);
    const state = !districtOpen(ch.district) ? 'fog' : pr.total > 0 && pr.solved >= pr.total ? 'done' : unlockedChapters.includes(id) ? 'active' : 'locked';
    return { id, district: ch.district, company: ch.company, title: ch.title, color: ch.color, isBoss: !!ch.isBoss, code: COMPANY_CODES[ch.company] || ch.company.slice(0, 2).toUpperCase(), solved: pr.solved, total: pr.total, stars: pr.stars, state };
  }), [getChapterProgress, districtOpen, unlockedChapters]);
  const current = rows.find((r) => r.state === 'active') || rows[0];
  const districtList = DISTRICT_IDS.map((d) => ({ id: d, ...DISTRICTS[d], lockHint: d > 1 ? `Solve 50% of ${DISTRICTS[d - 1].name} to unlock` : '' }));
  const dStats = DISTRICT_IDS.map((d) => {
    const rs = rows.filter((r) => r.district === d);
    return { d, solved: rs.reduce((a, r) => a + r.solved, 0), total: rs.reduce((a, r) => a + r.total, 0), open: districtOpen(d), cleared: rs.length > 0 && rs.every((r) => r.state === 'done') };
  });
  const totalAvailable = dStats.reduce((a, s) => a + s.total, 0);

  // ── Toast ──
  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(''), 2600); return () => clearTimeout(id); }, [toast]);

  // ── 3D map (loaded after first paint) ──
  const stageRef = useRef(null), sceneRef = useRef(null), latest = useRef(null);
  latest.current = { rows, currentId: current?.id, look: loadLook(uid, userData) };
  const [sceneReady, setSceneReady] = useState(false);
  const ready = !loading && !error;
  useEffect(() => {
    if (!ready || view !== 'map' || selectedChapter) return undefined;
    let dead = false;
    import('./OdysseyScene').then((m) => {
      if (dead || !stageRef.current) return;
      const L = latest.current;
      sceneRef.current = m.default(stageRef.current, { districts: districtList, chapters: L.rows, look: L.look, currentId: L.currentId, onSelect: (id) => setPanelId(id) });
      setSceneReady(true);
    }).catch((e) => console.warn('3D map unavailable:', e));
    return () => { dead = true; setSceneReady(false); if (sceneRef.current) sceneRef.current.destroy(); sceneRef.current = null; };
  }, [ready, view, selectedChapter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sceneRef.current) sceneRef.current.update(rows, current?.id); }, [rows, current?.id]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.select(panelId); }, [panelId, sceneReady]);

  // ── Remember what was open last time: lift the fog and move the avatar when things change ──
  const memDone = useRef(false);
  useEffect(() => {
    if (!sceneReady || memDone.current || !uid) return;
    memDone.current = true;
    const key = `odyssey:${uid}`, openNow = DISTRICT_IDS.filter((d) => districtOpen(d));
    let mem = null; try { mem = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { mem = null; }
    if (mem && Array.isArray(mem.open)) {
      const newly = openNow.filter((d) => !mem.open.includes(d));
      newly.forEach((d) => sceneRef.current.liftFog(d));
      if (newly.length) setToast(`District ${newly[0]} unlocked: ${DISTRICTS[newly[0]].name}. The fog lifts!`);
      if (mem.at && current && mem.at !== current.id) sceneRef.current.travel(mem.at, current.id);
    }
    try { localStorage.setItem(key, JSON.stringify({ open: openNow, at: current?.id })); } catch (e) { /* ignore */ }
  }, [sceneReady, uid, districtOpen, current]);

  // ── Banner portrait ──
  const bustRef = useRef(null);
  useEffect(() => {
    if (!ready) return undefined;
    let cleanup = null, dead = false;
    import('./avatarKit').then((m) => { if (!dead && bustRef.current) cleanup = m.mountAvatarBust(bustRef.current, m.loadLook(uid, userData), '#39ff88'); }).catch(() => {});
    return () => { dead = true; if (cleanup) cleanup(); };
  }, [ready, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (panelId == null) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setPanelId(null); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [panelId]);

  const openChapter = (id) => { setPanelId(null); setSelectedChapter(id); window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); };
  const jumpTo = (d) => {
    if (view === 'map' && sceneRef.current) sceneRef.current.flyToDistrict(d);
    else { const el = document.getElementById(`od-dist-${d}`); if (el) el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' }); }
  };

  // ── Loading / error ──
  if (loading) {
    return <div className="od"><div className="od-center"><div><div style={{ color: '#39ff88', fontSize: 15, fontWeight: 800 }}>loading the Engineer&apos;s Odyssey…</div></div></div></div>;
  }
  if (error) {
    return (
      <div className="od"><div className="od-center"><div>
        <div style={{ color: '#ff8a8a', fontSize: 15, maxWidth: 420, lineHeight: 1.6 }}>Backend error: {error}<br /><span style={{ color: '#9db8aa', fontSize: 12 }}>Make sure Render has deployed the latest backend and the /problems route is working.</span></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
          <button className="od-btn" onClick={fetchData}>Retry</button>
          <a className="od-btn" href={`${API_BASE}/problems/debug`} target="_blank" rel="noreferrer">Debug API</a>
        </div>
      </div></div></div>
    );
  }

  const selectedData = selectedChapter ? CHAPTERS[selectedChapter] : null;
  const selectedProblems = selectedChapter ? problems.filter((p) => p.chapter === Number(selectedChapter)).sort((a, b) => a.orderInChapter - b.orderInChapter) : [];
  const name = user?.displayName || 'Developer', handle = (name.split(' ')[0] || 'dev').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev';
  const level = userData?.level ?? 1;
  const anyDone = rows.some((r) => r.state === 'done'), bossDone = rows.some((r) => r.isBoss && r.state === 'done'), districtDone = dStats.some((s) => s.cleared);
  const slot = (on, title, hint) => (
    <div className={`od-slot${on ? ' on' : ''}`} title={title}>
      {on ? <><svg viewBox="0 0 42 46" aria-hidden="true"><path d="M21 2l17 10v22L21 44 4 34V12z" fill="#3a2a06" stroke="#f4b740" strokeWidth="2.5" /><path d="M21 14l2.8 5.8 6.2.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2-4.5-4.4 6.2-.9z" fill="#f4b740" /></svg>{title}</> : <>EMPTY<br />{hint}</>}
    </div>
  );
  const panel = panelId != null ? rows.find((r) => r.id === panelId) : null;
  const panelD = panel ? DISTRICTS[panel.district] : null;

  return (
    <div className="od">
      <div className="od-crt" aria-hidden="true" />
      <div className="od-page">
        <div className="od-top">
          <button className="od-btn" onClick={() => navigate('/world')}>&larr; World</button>
          <div className="od-path"><b>{handle}</b>@<i>evoworld</i>:~/odyssey$</div>
        </div>

        {/* ── Travel banner ── */}
        <section className="od-banner" aria-label="Your journey">
          <div className="od-portrait"><div className="od-bust" ref={bustRef} aria-hidden="true" /><span className="lv">LV {level} · {(LEVEL_NAMES[Math.min(level, 5)] || 'Legend').toUpperCase()}</span></div>
          <div className="od-who">
            <h1>Engineer&apos;s <span>Odyssey</span></h1>
            <p>{name} · traveling through 7 districts and {Object.keys(COMPANY_CODES).length} companies</p>
            <div className="od-slots" aria-label="Milestones">
              {slot(stats.currentStreak >= 3, `${stats.currentStreak}-Day Streak`, 'reach a 3-day streak')}
              {slot(anyDone, 'Chapter Cleared', 'clear a chapter')}
              {slot(bossDone, 'Boss Slain', 'beat a boss')}
              {slot(districtDone, 'District Cleared', 'clear a district')}
            </div>
          </div>
          <div className="od-stats">
            <div><small>SOLVED</small><b>{stats.totalSolved}</b></div>
            <div><small>XP EARNED</small><b style={{ color: '#c4a6ff' }}>{stats.totalXp}</b></div>
            <div><small>DAY STREAK</small><b style={{ color: '#f4b740' }}>{stats.currentStreak}</b></div>
          </div>
          <div className="od-prog">
            <div className="hd"><span>Overall progress</span><span><b>{stats.totalSolved}</b> / {totalAvailable} problems</span></div>
            <div className="od-bar" role="img" aria-label={`${stats.totalSolved} of ${totalAvailable} problems solved`}>
              {dStats.map((s) => (
                <div key={s.d} className={`seg${s.open ? '' : ' locked'}`} style={{ width: `${s.total / totalAvailable * 100}%`, '--c': DISTRICTS[s.d].color }} title={`District ${s.d}: ${DISTRICTS[s.d].name}`}>
                  <i style={{ width: `${s.total ? s.solved / s.total * 100 : 0}%` }} />
                </div>
              ))}
            </div>
            <div className="od-marks">{dStats.map((s) => <span key={s.d} style={{ width: `${s.total / totalAvailable * 100}%` }}>D{s.d}</span>)}</div>
            {problems.length === 0 && <div className="od-warn">No problems loaded from the backend yet. Run the seed script and check /problems.</div>}
          </div>
        </section>

        {selectedChapter && selectedData ? (
          <div style={{ marginTop: 16 }}>
            <ChapterProblems chapterId={selectedChapter} chapter={selectedData} problems={selectedProblems} userProgress={userProgress} onBack={() => setSelectedChapter(null)} />
          </div>
        ) : (
          <>
            <div className="od-toolbar">
              <div className="od-chips" aria-label="Jump to a district">
                {dStats.map((s) => (
                  <button key={s.d} className={`od-chip${s.open ? '' : ' locked'}`} style={{ '--c': DISTRICTS[s.d].color }} onClick={() => jumpTo(s.d)}>
                    <i />{s.d} · {s.open ? DISTRICTS[s.d].name : 'Locked'}
                  </button>
                ))}
              </div>
              <div className="od-seg" role="group" aria-label="View">
                <button aria-pressed={view === 'map'} onClick={() => setView('map')}>Map</button>
                <button aria-pressed={view === 'list'} onClick={() => { setPanelId(null); setView('list'); }}>List</button>
              </div>
            </div>

            {view === 'map' ? (
              <section className="od-mapwrap" aria-label="3D metro map of the Odyssey. Use the List view for a text version.">
                <div className="od-stage" ref={stageRef} />
                <div className="od-hint">drag to move · scroll to zoom · tap a station</div>
                <div className="od-zoom">
                  <button className="od-btn" aria-label="Zoom in" onClick={() => sceneRef.current && sceneRef.current.zoom(0.8)}>+</button>
                  <button className="od-btn" aria-label="Zoom out" onClick={() => sceneRef.current && sceneRef.current.zoom(1.25)}>&minus;</button>
                </div>
                <div className="od-legend"><span><i style={{ background: '#39ff88', boxShadow: '0 0 8px #39ff88' }} />cleared</span><span><i style={{ background: '#fff' }} />open</span><span><i style={{ background: '#2a3236' }} />locked</span><span><i style={{ background: 'repeating-linear-gradient(45deg,#3b4448 0 3px,#1a1f24 3px 6px)' }} />fog of war</span></div>
                {panel && (
                  <div className="od-panel" role="dialog" aria-labelledby="od-ptitle" style={{ '--c': panel.state === 'fog' ? '#5d6a70' : panel.color }}>
                    <div className="tag">{panel.state === 'fog' ? `DISTRICT ${panel.district} · LOCKED` : `CH.${panel.id} · ${panel.company.toUpperCase()}`}</div>
                    <h2 id="od-ptitle">{panel.state === 'fog' ? 'Hidden in the fog' : panel.title}</h2>
                    <p>{panel.state === 'fog' ? `Solve 50% of ${DISTRICTS[panel.district - 1]?.name || 'the previous district'} to reveal this chapter.` : `District ${panel.district}: ${panelD.name}${panel.isBoss ? ' · boss chapter' : ''}`}</p>
                    {panel.state !== 'fog' && <>
                      <div className="pb"><i style={{ width: `${panel.total ? Math.round(panel.solved / panel.total * 100) : 0}%` }} /></div>
                      <div className="row"><span>{panel.solved} / {panel.total} problems</span><Stars count={Math.min(3, panel.stars)} /></div>
                    </>}
                    <span className="od-state" style={{ color: panel.state === 'done' ? panel.color : panel.state === 'active' ? '#ffffff' : '#9aa79f' }}>
                      {panel.state === 'done' ? 'CLEARED' : panel.state === 'active' ? 'OPEN' : panel.state === 'fog' ? 'FOG OF WAR' : 'LOCKED: solve one problem in the previous chapter'}
                    </span>
                    <div className="acts">
                      <button className="od-btn go" disabled={!(panel.state === 'active' || panel.state === 'done')} onClick={() => openChapter(panel.id)}>{panel.state === 'done' ? 'Replay chapter' : 'Enter chapter'}</button>
                      <button className="od-btn" onClick={() => setPanelId(null)}>Close</button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section aria-label="Chapters list">
                {dStats.map((s) => {
                  const d = DISTRICTS[s.d];
                  return (
                    <section key={s.d} id={`od-dist-${s.d}`} className={`od-dist${s.open ? '' : ' locked'}`} style={{ '--c': d.color }}>
                      <header><h3>District {s.d}: {s.open ? d.name : 'Locked'}</h3><span>{s.open ? `${s.solved}/${s.total} problems · ${d.difficulty}` : `Solve 50% of ${DISTRICTS[s.d - 1]?.name} to reveal`}</span></header>
                      {s.open ? (
                        <div className="od-rows">
                          {rows.filter((r) => r.district === s.d).map((r) => (
                            <button key={r.id} className={`od-row ${r.state}`} disabled={r.state === 'locked'} onClick={() => openChapter(r.id)} style={{ '--c': r.color }}>
                              <code>{r.code}</code>
                              <span><b>{r.title}</b><small>Ch.{r.id} · {r.company} · {r.state === 'done' ? 'cleared' : r.state === 'active' ? 'open' : 'locked'} · {r.solved}/{r.total}{r.isBoss ? ' · boss' : ''}</small></span>
                            </button>
                          ))}
                        </div>
                      ) : <div className="od-fogmsg">Fog of war hides this district. Its chapters appear once it unlocks.</div>}
                    </section>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
      {toast && <div className="od-toast" role="status">{toast}</div>}
    </div>
  );
}
