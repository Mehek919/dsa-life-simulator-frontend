import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }                  from 'framer-motion';
import { useNavigate }                              from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';

// ── Constants ──────────────────────────────────────────────────────────────────
const API    = `${API_BASE}/leaderboard`;
const TABS   = [
  { id: 'global',   label: '🌍',  full: '🌍 Global',   sub: 'Top by XP'           },
  { id: 'arena',    label: '⚔️',  full: '⚔️ Arena',    sub: 'Top by ELO'          },
  { id: 'creators', label: '🧪',  full: '🧪 Creators', sub: 'Top Challenge Makers' },
  { id: 'weekly',   label: '🔥',  full: '🔥 Weekly',   sub: 'Resets Monday'       },
];
const TOPICS      = ['All','Array','LinkedList','Stack','Queue','Tree','Graph','DP'];
const LEVELS      = ['All', '1', '2', '3', '4', '5'];
const LEVEL_NAMES = { 1:'Junior', 2:'Mid', 3:'Senior', 4:'Lead', 5:'Legend' };
const MEDAL       = { 1: '🥇', 2: '🥈', 3: '🥉' };

function rankColor(rank) {
  if (rank === 1) return '#f5c542';
  if (rank === 2) return '#aaaaaa';
  if (rank === 3) return '#cd7f32';
  return '#444';
}

// ── Single row ─────────────────────────────────────────────────────────────────
function LeaderRow({ entry, tab, currentUid, rank }) {
  const isYou  = entry.uid === currentUid;
  const medal  = MEDAL[rank];
  const isTop3 = rank <= 3;

  // per-tab score
  let scoreMain = null;
  let scoreSub  = null;
  if (tab === 'global') {
    scoreMain = <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '14px' }}>{(entry.xp || 0).toLocaleString()} XP</span>;
    scoreSub  = <span style={{ color: '#555', fontSize: '10px' }}>💰 {entry.credits ?? 0}</span>;
  } else if (tab === 'arena') {
    scoreMain = <span style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '14px' }}>{entry.elo} ELO</span>;
    scoreSub  = <span style={{ color: '#555', fontSize: '10px' }}>Lv{entry.level}</span>;
  } else if (tab === 'creators') {
    scoreMain = <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '14px' }}>⭐ {entry.avgChallengeRating?.toFixed(1)}</span>;
    scoreSub  = <span style={{ color: '#555', fontSize: '10px' }}>{entry.challengesCreated} made</span>;
  } else if (tab === 'weekly') {
    scoreMain = <span style={{ color: '#f5c542', fontWeight: 700, fontSize: '14px' }}>{(entry.weeklyXp || 0).toLocaleString()} XP</span>;
    scoreSub  = <span style={{ color: '#555', fontSize: '10px' }}>this week</span>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.5) }}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '10px',
        padding:      '10px 12px',
        borderRadius: '12px',
        background:   isYou  ? '#1a73e811' : isTop3 ? '#ffffff05' : 'transparent',
        border:       isYou  ? '1px solid #1a73e844' : '1px solid transparent',
        marginBottom: '4px',
      }}
    >
      {/* Rank */}
      <div style={{ width: '28px', textAlign: 'center', flexShrink: 0 }}>
        {medal
          ? <span style={{ fontSize: '18px' }}>{medal}</span>
          : <span style={{ color: rankColor(rank), fontWeight: 700, fontSize: '13px' }}>#{rank}</span>
        }
      </div>

      {/* Avatar */}
      <img
        src={entry.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.uid}`}
        alt=""
        style={{
          width: '32px', height: '32px', borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          border: isTop3 ? `2px solid ${rankColor(rank)}` : '2px solid #1e2a3a',
        }}
      />

      {/* Name + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color:     isYou ? '#1a73e8' : '#e8e8e8',
          fontWeight: isYou ? 700 : 600,
          fontSize:  '13px',
          overflow:  'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.name}
          {isYou && <span style={{ color: '#1a73e888', fontSize: '10px', marginLeft: '4px' }}>(You)</span>}
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
          <span style={{
            background: '#1a73e818', color: '#1a73e8',
            borderRadius: '8px', padding: '1px 6px', fontSize: '9px', whiteSpace: 'nowrap',
          }}>
            Lv{entry.level} {LEVEL_NAMES[entry.level] || ''}
          </span>
          {entry.topic && (
            <span style={{
              background: '#00c89618', color: '#00c896',
              borderRadius: '8px', padding: '1px 6px', fontSize: '9px',
              maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {entry.topic}
            </span>
          )}
        </div>

        {/* Score shown BELOW name on mobile */}
        <div style={{ marginTop: '4px' }} className="sm:hidden">
          {scoreMain}
        </div>
      </div>

      {/* Score — right side, hidden on mobile (shown inline above) */}
      <div className="hidden sm:block" style={{ textAlign: 'right', flexShrink: 0 }}>
        <div>{scoreMain}</div>
        <div style={{ marginTop: '2px' }}>{scoreSub}</div>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Leaderboard({ user, userData }) {
  const navigate = useNavigate();

  const [activeTab,     setActiveTab]     = useState('global');
  const [entries,       setEntries]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [myRanks,       setMyRanks]       = useState({});
  const [weekStart,     setWeekStart]     = useState(null);
  const [filterTopic,   setFilterTopic]   = useState('All');
  const [filterLevel,   setFilterLevel]   = useState('All');
  const [filterCountry, setFilterCountry] = useState('');

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
    } catch (_) {
      setError('Failed to load leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterTopic, filterLevel, filterCountry]);

  const fetchMyRanks = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const { data } = await axios.get(`${API}/me/${user.uid}`);
      setMyRanks(data);
    } catch (_) {}
  }, [user?.uid]);

  useEffect(() => { fetchBoard();   }, [fetchBoard]);
  useEffect(() => { fetchMyRanks(); }, [fetchMyRanks]);

  const myEntry = entries.find(e => e.uid === user?.uid);

  return (
    <div style={{
      minHeight:  '100vh',
      background: '#0a0a14',
      fontFamily: 'Arial, sans-serif',
      color:      '#e8e8e8',
      overflowX:  'hidden',
    }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        position:       'sticky', top: 0, zIndex: 50,
        background:     '#0a0a14ee',
        backdropFilter: 'blur(16px)',
        borderBottom:   '1px solid #1e2a3a',
        padding:        '12px 16px',
      }}>
        {/* Row 1: back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <button
            onClick={() => navigate('/world')}
            style={{
              background: '#1e2a3a', border: '1px solid #2a3a4a',
              color: '#aaa', borderRadius: '8px',
              padding: '6px 12px', cursor: 'pointer', fontSize: '13px',
              flexShrink: 0,
            }}
          >
            ← Back
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap' }}>
              🏆 Leaderboard
            </h1>
            <p style={{ margin: 0, color: '#555', fontSize: '10px' }}>
              Compete. Climb. Conquer.
            </p>
          </div>
        </div>

        {/* Row 2: my rank pills — scrollable */}
        <div style={{
          display:    'flex',
          gap:        '6px',
          overflowX:  'auto',
          paddingBottom: '2px',
        }}>
          {[
            { label: '🌍 Global', value: myRanks.globalRank,  color: '#1a73e8' },
            { label: '⚔️ Arena',  value: myRanks.arenaRank,   color: '#ff6b6b' },
            { label: '🔥 Weekly', value: myRanks.weeklyRank,  color: '#f5c542' },
            { label: '🧪 Creator',value: myRanks.creatorRank, color: '#a855f7' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background:   '#1a1a2e',
                border:       `1px solid ${color}44`,
                borderRadius: '10px',
                padding:      '4px 10px',
                textAlign:    'center',
                flexShrink:   0,
              }}
            >
              <div style={{ color: '#555', fontSize: '8px', whiteSpace: 'nowrap' }}>{label}</div>
              <div style={{ color, fontWeight: 700, fontSize: '13px' }}>
                {value ? `#${value}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '16px 12px 40px' }}>

        {/* ── Tabs ── */}
        <div style={{
          display:        'flex',
          gap:            '6px',
          marginBottom:   '16px',
          overflowX:      'auto',
          paddingBottom:  '4px',
          // hide scrollbar visually
          scrollbarWidth: 'none',
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background:   active ? '#1a73e8'  : '#1a1a2e',
                  border:       `1px solid ${active ? '#1a73e8' : '#2a3a4a'}`,
                  color:        active ? '#fff'     : '#888',
                  borderRadius: '10px',
                  // ✅ flexible padding — fits on any screen
                  padding:      '8px 14px',
                  cursor:       'pointer',
                  fontWeight:   600,
                  whiteSpace:   'nowrap',
                  flexShrink:   0,
                  transition:   'all 0.2s',
                  // ✅ responsive font
                  fontSize:     'clamp(11px, 2.5vw, 13px)',
                }}
              >
                {/* Full label on sm+, emoji-only on xs */}
                <span className="hidden sm:inline">{tab.full}</span>
                <span className="sm:hidden">{tab.label}</span>
                <span style={{
                  display:    'block',
                  fontSize:   '9px',
                  fontWeight: 400,
                  opacity:    0.7,
                  marginTop:  '1px',
                }}>
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Filters (global only) ── */}
        <AnimatePresence>
          {activeTab === 'global' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{    opacity: 0, height: 0 }}
              style={{
                display:      'flex',
                gap:          '8px',
                marginBottom: '14px',
                flexWrap:     'wrap',
              }}
            >
              <select
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
                style={{
                  background: '#1a1a2e', border: '1px solid #2a3a4a',
                  color: '#ccc', borderRadius: '8px',
                  padding: '6px 8px', fontSize: '12px', cursor: 'pointer',
                  flex: '1 1 120px',
                }}
              >
                {TOPICS.map(t => (
                  <option key={t} value={t}>{t === 'All' ? '📚 All Topics' : t}</option>
                ))}
              </select>

              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                style={{
                  background: '#1a1a2e', border: '1px solid #2a3a4a',
                  color: '#ccc', borderRadius: '8px',
                  padding: '6px 8px', fontSize: '12px', cursor: 'pointer',
                  flex: '1 1 120px',
                }}
              >
                {LEVELS.map(l => (
                  <option key={l} value={l}>
                    {l === 'All' ? '⭐ All Levels' : `Lv${l} — ${LEVEL_NAMES[l]}`}
                  </option>
                ))}
              </select>

              <input
                placeholder="🌍 Country (IN, US…)"
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value.toUpperCase())}
                style={{
                  background: '#1a1a2e', border: '1px solid #2a3a4a',
                  color: '#ccc', borderRadius: '8px',
                  padding: '6px 8px', fontSize: '12px',
                  flex: '1 1 120px',
                }}
              />

              <button
                onClick={fetchBoard}
                style={{
                  background: '#1a73e822', border: '1px solid #1a73e844',
                  color: '#1a73e8', borderRadius: '8px',
                  padding: '6px 14px', fontSize: '12px',
                  cursor: 'pointer', fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                Apply
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Weekly banner ── */}
        {activeTab === 'weekly' && weekStart && (
          <div style={{
            background: '#f5c54211', border: '1px solid #f5c54233',
            borderRadius: '10px', padding: '10px 14px',
            marginBottom: '14px', fontSize: '11px', color: '#f5c542',
          }}>
            🔥 Week started: {new Date(weekStart).toDateString()} — Resets Monday 00:00 UTC
          </div>
        )}

        {/* ── My position card (if not in top 10) ── */}
        {myEntry && myEntry.rank > 10 && (
          <div style={{
            background: '#1a73e811', border: '1px solid #1a73e844',
            borderRadius: '12px', padding: '8px 12px', marginBottom: '14px',
          }}>
            <div style={{ color: '#1a73e8', fontSize: '10px', marginBottom: '4px' }}>
              Your Position
            </div>
            <LeaderRow
              entry={myEntry} tab={activeTab}
              currentUid={user?.uid} rank={myEntry.rank}
            />
          </div>
        )}

        {/* ── List ── */}
        <div style={{
          background:    '#0d1117',
          borderRadius:  '16px',
          border:        '1px solid #1e2a3a',
          padding:       '10px',
          minHeight:     '300px',
        }}>
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
              <button
                onClick={fetchBoard}
                style={{
                  marginTop: '12px', background: '#ff6b6b22',
                  border: '1px solid #ff6b6b44', color: '#ff6b6b',
                  borderRadius: '8px', padding: '6px 16px', cursor: 'pointer',
                }}
              >
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

        <div style={{
          textAlign: 'center', color: '#333',
          fontSize: '10px', marginTop: '14px',
        }}>
          Rankings update in real-time • Weekly board resets every Monday 00:00 UTC
        </div>
      </div>
    </div>
  );
}
