import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }                  from 'framer-motion';
import { useNavigate }                              from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
// ── Constants ──────────────────────────────────────────────────────────────────
const API        = `${API_BASE}/leaderboard`;
const TABS       = [
  { id: 'global',   label: '🌍 Global',   sub: 'Top by XP'           },
  { id: 'arena',    label: '⚔️ Arena',    sub: 'Top by ELO'          },
  { id: 'creators', label: '🧪 Creators', sub: 'Top Challenge Makers' },
  { id: 'weekly',   label: '🔥 Weekly',   sub: 'Resets Monday'       },
];
const TOPICS     = ['All','Array','LinkedList','Stack','Queue','Tree','Graph','DynamicProgramming'];
const LEVELS     = ['All', '1', '2', '3', '4', '5'];
const LEVEL_NAMES= { 1:'Junior', 2:'Mid', 3:'Senior', 4:'Lead', 5:'Legend' };
const MEDAL      = { 1: '🥇', 2: '🥈', 3: '🥉' };

// ── Medal / rank color helper ──────────────────────────────────────────────────
function rankColor(rank) {
  if (rank === 1) return '#f5c542';
  if (rank === 2) return '#aaaaaa';
  if (rank === 3) return '#cd7f32';
  return '#444';
}

// ── Single row ─────────────────────────────────────────────────────────────────
function LeaderRow({ entry, tab, currentUid, rank }) {
  const isYou    = entry.uid === currentUid;
  const medal    = MEDAL[rank];
  const isTop3   = rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0   }}
      transition={{ delay: rank * 0.03 }}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '14px',
        padding:        '12px 18px',
        borderRadius:   '12px',
        background:     isYou  ? '#1a73e811' : isTop3 ? '#ffffff05' : 'transparent',
        border:         isYou  ? '1px solid #1a73e844' : '1px solid transparent',
        marginBottom:   '6px',
        transition:     'background 0.2s',
        cursor:         'default',
      }}
    >
      {/* Rank */}
      <div style={{ width: '36px', textAlign: 'center', flexShrink: 0 }}>
        {medal
          ? <span style={{ fontSize: '20px' }}>{medal}</span>
          : <span style={{ color: rankColor(rank), fontWeight: 700, fontSize: '14px' }}>#{rank}</span>
        }
      </div>

      {/* Avatar */}
      <img
        src={entry.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.uid}`}
        alt=""
        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: isTop3 ? `2px solid ${rankColor(rank)}` : '2px solid #1e2a3a', flexShrink: 0 }}
      />

      {/* Name + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: isYou ? '#1a73e8' : '#e8e8e8', fontWeight: isYou ? 700 : 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.name} {isYou && <span style={{ color: '#1a73e8', fontSize: '11px' }}>(You)</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
          <span style={{ background: '#1a73e818', color: '#1a73e8', borderRadius: '10px', padding: '1px 7px', fontSize: '10px' }}>
            Lv{entry.level} {LEVEL_NAMES[entry.level] || ''}
          </span>
          <span style={{ background: '#00c89618', color: '#00c896', borderRadius: '10px', padding: '1px 7px', fontSize: '10px' }}>
            {entry.topic}
          </span>
          {entry.country && entry.country !== 'Global' && (
          <span
              className="hidden sm:inline-block"
              style={{ background: '#a855f718', color: '#a855f7', borderRadius: '10px', padding: '1px 7px',   fontSize: '10px' }}>
             {entry.country}
           </span>
          )}
        </div>
      </div>

      {/* Score column */}
      <div className="hidden sm:block"
           style={{ textAlign: 'right', flexShrink: 0 }}>
        {tab === 'global' && (
          <>
            <div style={{ color: '#a855f7', fontWeight: 700, fontSize: '15px' }}>{entry.xp.toLocaleString()} XP</div>
            <div style={{ color: '#555', fontSize: '11px' }}>💰 {entry.credits}</div>
          </>
        )}
        {tab === 'arena' && (
          <>
            <div style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '15px' }}>{entry.elo} ELO</div>
            <div style={{ color: '#555', fontSize: '11px' }}>Lv{entry.level}</div>
          </>
        )}
        {tab === 'creators' && (
          <>
            <div style={{ color: '#a855f7', fontWeight: 700, fontSize: '15px' }}>⭐ {entry.avgChallengeRating?.toFixed(1)}</div>
            <div style={{ color: '#555', fontSize: '11px' }}>{entry.challengesCreated} challenges</div>
          </>
        )}
        {tab === 'weekly' && (
          <>
            <div style={{ color: '#f5c542', fontWeight: 700, fontSize: '15px' }}>{entry.weeklyXp?.toLocaleString()} XP</div>
            <div style={{ color: '#555', fontSize: '11px' }}>this week</div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Leaderboard({ user, userData }) {
  const navigate = useNavigate();

  const [activeTab,   setActiveTab]   = useState('global');
  const [entries,     setEntries]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [myRanks,     setMyRanks]     = useState({});
  const [weekStart,   setWeekStart]   = useState(null);

  // Filters
  const [filterTopic,   setFilterTopic]   = useState('All');
  const [filterLevel,   setFilterLevel]   = useState('All');
  const [filterCountry, setFilterCountry] = useState('');

  // ── Fetch leaderboard data ──────────────────────────────────────────────────
  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (activeTab === 'global') {
        if (filterTopic   !== 'All') params.topic   = filterTopic;
        if (filterLevel   !== 'All') params.level   = filterLevel;
        if (filterCountry)           params.country = filterCountry;
      }

      const { data } = await axios.get(`${API}/${activeTab}`, { params });
      setEntries(data.leaderboard || []);
      if (data.weekStart) setWeekStart(data.weekStart);
    } catch (err) {
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterTopic, filterLevel, filterCountry]);

  // ── Fetch my ranks ──────────────────────────────────────────────────────────
  const fetchMyRanks = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const { data } = await axios.get(`${API}/me/${user.uid}`);
      setMyRanks(data);
    } catch (_) {}
  }, [user?.uid]);

  useEffect(() => { fetchBoard(); },   [fetchBoard]);
  useEffect(() => { fetchMyRanks(); }, [fetchMyRanks]);

  // My position in current board
  const myEntry = entries.find(e => e.uid === user?.uid);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', fontFamily: 'Arial, sans-serif', color: '#e8e8e8' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid #1e2a3a',
        background: '#0a0a14cc', backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/world')}
            style={{ background: '#1e2a3a', border: '1px solid #2a3a4a', color: '#aaa', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>🏆 Leaderboard</h1>
            <p style={{ margin: 0, color: '#555', fontSize: '11px' }}>Compete. Climb. Conquer.</p>
          </div>
        </div>

        {/* My ranks pill row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: '🌍 Global',  value: myRanks.globalRank,  color: '#1a73e8' },
            { label: '⚔️ Arena',   value: myRanks.arenaRank,   color: '#ff6b6b' },
            { label: '🔥 Weekly',  value: myRanks.weeklyRank,  color: '#f5c542' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#1a1a2e', border: `1px solid ${color}44`, borderRadius: '10px', padding: '5px 12px', textAlign: 'center', minWidth: '72px' }}>
              <div style={{ color: '#555', fontSize: '9px' }}>{label}</div>
              <div style={{ color, fontWeight: 700, fontSize: '14px' }}>
                {value ? `#${value}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}
             className="flex gap-1.5 overflow-x-auto pb-1 px-4">             
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background:   activeTab === tab.id ? '#1a73e8' : '#1a1a2e',
                border:       `1px solid ${activeTab === tab.id ? '#1a73e8' : '#2a3a4a'}`,
                color:        activeTab === tab.id ? '#fff' : '#888',
                borderRadius: '10px',
                padding:      '8px 16px',
                cursor:       'pointer',
                fontSize:     '13px',
                fontWeight:   600,
                whiteSpace:   'nowrap',
                transition:   'all 0.2s',
              }}
            >
              {tab.label}
              <span style={{ display: 'block', fontSize: '9px', fontWeight: 400, opacity: 0.7, marginTop: '1px' }}>{tab.sub}</span>
            </button>
          ))}
        </div>

        {/* ── Filters (global tab only) ── */}
        <AnimatePresence>
          {activeTab === 'global' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}
            >
              {/* Topic filter */}
              <select
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
                style={{ background: '#1a1a2e', border: '1px solid #2a3a4a', color: '#ccc', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                {TOPICS.map(t => <option key={t} value={t}>{t === 'All' ? '📚 All Topics' : t}</option>)}
              </select>

              {/* Level filter */}
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                style={{ background: '#1a1a2e', border: '1px solid #2a3a4a', color: '#ccc', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                {LEVELS.map(l => <option key={l} value={l}>{l === 'All' ? '⭐ All Levels' : `Lv${l} — ${LEVEL_NAMES[l]}`}</option>)}
              </select>

              {/* Country filter */}
              <input
                placeholder="🌍 Country (e.g. IN, US)"
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value.toUpperCase())}
                style={{ background: '#1a1a2e', border: '1px solid #2a3a4a', color: '#ccc', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', width: '160px' }}
              />

              <button
                onClick={fetchBoard}
                style={{ background: '#1a73e822', border: '1px solid #1a73e844', color: '#1a73e8', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Apply
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Weekly info banner ── */}
        {activeTab === 'weekly' && weekStart && (
          <div style={{ background: '#f5c54211', border: '1px solid #f5c54233', borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', fontSize: '12px', color: '#f5c542' }}>
            🔥 Week started: {new Date(weekStart).toDateString()} — Resets next Monday midnight UTC
          </div>
        )}

        {/* ── My position sticky card (if not top 10) ── */}
        {myEntry && myEntry.rank > 10 && (
          <div style={{ background: '#1a73e811', border: '1px solid #1a73e844', borderRadius: '12px', padding: '10px 18px', marginBottom: '16px' }}>
            <div style={{ color: '#1a73e8', fontSize: '11px', marginBottom: '4px' }}>Your Position</div>
            <LeaderRow entry={myEntry} tab={activeTab} currentUid={user?.uid} rank={myEntry.rank} />
          </div>
        )}

        {/* ── List ── */}
        <div style={{ background: '#0d1117', borderRadius: '16px', border: '1px solid #1e2a3a', padding: '12px', minHeight: '300px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
              Loading leaderboard...
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ff6b6b' }}>
              ⚠️ {error}
              <br />
              <button onClick={fetchBoard} style={{ marginTop: '12px', background: '#ff6b6b22', border: '1px solid #ff6b6b44', color: '#ff6b6b', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
              No players yet. Be the first! 🚀
            </div>
          )}

          {!loading && !error && entries.map((entry, i) => (
            <LeaderRow
              key={entry.uid}
              entry={entry}
              tab={activeTab}
              currentUid={user?.uid}
              rank={i + 1}
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', color: '#333', fontSize: '11px', marginTop: '16px' }}>
          Rankings update in real-time • Weekly board resets every Monday 00:00 UTC
        </div>
      </div>
    </div>
  );
}
