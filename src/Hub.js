import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import API_BASE from './config';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─── Constants ───────────────────────────────────────
const TOPICS = ['All','Array','LinkedList','Stack','Queue','Tree','Graph','DynamicProgramming'];
const DIFFS  = ['All','easy','medium','hard'];
const SORTS  = [
  { value: 'newest',   label: '🕐 Newest'    },
  { value: 'rating',   label: '⭐ Top Rated'  },
  { value: 'attempts', label: '🔥 Most Tried' },
];

const DIFF_STYLE = {
  easy:   { badge: '#00ff9f', glow: '0 0 8px #00ff9f55', label: 'Easy'   },
  medium: { badge: '#f0c040', glow: '0 0 8px #f0c04055', label: 'Medium' },
  hard:   { badge: '#ff4d6d', glow: '0 0 8px #ff4d6d55', label: 'Hard'   },
};

const API = API_BASE;

// ─── Shared styles ───────────────────────────────────
const selectStyle = {
  background:   '#12122a',
  border:       '1px solid #1e1e3a',
  borderRadius: 8,
  padding:      '8px 12px',
  color:        '#e0e0ff',
  fontSize:     13,
  cursor:       'pointer',
  outline:      'none',
};

const spinnerStyle = {
  width:        40,
  height:       40,
  border:       '3px solid #1e1e3a',
  borderTop:    '3px solid #1a73e8',
  borderRadius: '50%',
  margin:       '0 auto 16px',
  animation:    'spin 0.8s linear infinite',
};

// ─── Star Rating Widget ──────────────────────────────
function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4, cursor: disabled ? 'default' : 'pointer' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          onMouseEnter={() => !disabled && setHovered(s)}
          onMouseLeave={() => !disabled && setHovered(0)}
          onClick={() => !disabled && onChange(s)}
          style={{
            fontSize:   20,
            color:      s <= (hovered || value) ? '#f0c040' : '#333',
            textShadow: s <= (hovered || value) ? '0 0 6px #f0c04088' : 'none',
            transition: 'color 0.15s',
          }}
        >★</span>
      ))}
    </div>
  );
}

// ─── Single Challenge Card ───────────────────────────
function ChallengeCard({ challenge, userId, onAttempted, onRated }) {
  const [expanded,   setExpanded]   = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [submitted,  setSubmitted]  = useState(false);
  const [result,     setResult]     = useState(null);
  const [rating,     setRating]     = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const [busy,       setBusy]       = useState(false);
  const [toast,      setToast]      = useState('');

  const ds      = DIFF_STYLE[challenge.difficulty] || DIFF_STYLE.medium;
  const already = challenge.alreadyAttempted;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  async function handleSubmit() {
    if (!selected) return showToast('⚠️ Pick an option first!');
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/challenges/${challenge.id}/attempt`, {
        userId,
        answer: selected,
      });
      setResult(data);
      setSubmitted(true);
      // ✅ FIX: was 'attemperReward' (typo) — now correctly 'attempterReward'
      onAttempted(challenge.id, data.isCorrect, data.attempterReward);
    } catch (err) {
      showToast(err.response?.data?.error || '❌ Submission failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRate(stars) {
    setRating(stars);
    try {
      const { data } = await axios.post(`${API}/challenges/${challenge.id}/rate`, {
        userId,
        rating: stars,
      });
      setRatingDone(true);
      onRated(challenge.id, data.newRating, data.ratingCount);
      showToast('⭐ Thanks for your rating!');
    } catch (err) {
      showToast(err.response?.data?.error || '❌ Rating failed.');
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        background:  'linear-gradient(135deg, #0f0f1a 60%, #12122a)',
        border:      `1px solid ${expanded ? ds.badge : '#1e1e3a'}`,
        borderRadius: 16,
        padding:     '18px 20px',
        marginBottom: 16,
        boxShadow:   expanded ? ds.glow : 'none',
        transition:  'border 0.2s, box-shadow 0.2s',
        position:    'relative',
        overflow:    'hidden',
      }}
    >
      {/* ── Toast ──────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position:     'absolute',
              top:          10,
              right:        14,
              background:   '#1a73e8',
              color:        '#fff',
              padding:      '6px 14px',
              borderRadius: 8,
              fontSize:     13,
              zIndex:       10,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header Row ─────────────────────────────── */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
      >
        {/* Creator avatar */}
        <img
          src={
            challenge.creatorPhoto ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${challenge.createdBy}`
          }
          alt="creator"
          style={{
            width:        38,
            height:       38,
            borderRadius: '50%',
            border:       '2px solid #1a73e8',
            flexShrink:   0,
          }}
        />

        <div style={{ flex: 1 }}>
          {/* Question preview */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#e0e0ff', fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>
              {challenge.question.length > 90
                ? challenge.question.slice(0, 90) + '…'
                : challenge.question}
            </span>
          </div>

          {/* Meta row */}
          <div style={{
            display:     'flex',
            flexWrap:    'wrap',
            gap:         8,
            marginTop:   8,
            alignItems:  'center',
          }}>
            <span style={{
              background:   ds.badge + '22',
              color:        ds.badge,
              border:       `1px solid ${ds.badge}`,
              borderRadius: 6,
              padding:      '2px 10px',
              fontSize:     11,
              fontWeight:   700,
            }}>
              {ds.label}
            </span>

            <span style={{
              background:   '#1a73e822',
              color:        '#1a73e8',
              border:       '1px solid #1a73e8',
              borderRadius: 6,
              padding:      '2px 10px',
              fontSize:     11,
              fontWeight:   700,
            }}>
              {challenge.topic}
            </span>

            <span style={{ color: '#888', fontSize: 12 }}>
              👤 {challenge.creatorName}
            </span>

            <span style={{ color: '#666', fontSize: 12, marginLeft: 'auto' }}>
              🔥 {challenge.attempts || 0} tried &nbsp;·&nbsp;
              ✅ {challenge.passes   || 0} passed &nbsp;·&nbsp;
              ⭐ {challenge.rating ? challenge.rating.toFixed(1) : '—'} ({challenge.ratingCount || 0})
            </span>
          </div>
        </div>

        {/* Chevron */}
        <span style={{ color: '#444', fontSize: 18, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* ── Expanded Body ───────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 18 }}>

              {/* Full question text */}
              <p style={{ color: '#c0c0e0', fontSize: 15, marginBottom: 14, lineHeight: 1.6 }}>
                {challenge.question}
              </p>

              {/* ── Answer options (before submission) ── */}
              {!already && !submitted ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {challenge.options.map((opt, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelected(opt)}
                      style={{
                        background:   selected === opt ? '#1a73e822' : '#0a0a18',
                        border:       `1px solid ${selected === opt ? '#1a73e8' : '#1e1e3a'}`,
                        borderRadius: 10,
                        padding:      '11px 16px',
                        color:        selected === opt ? '#1a73e8' : '#a0a0cc',
                        textAlign:    'left',
                        cursor:       'pointer',
                        fontSize:     14,
                        transition:   'all 0.15s',
                      }}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </motion.button>
                  ))}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubmit}
                    disabled={busy}
                    style={{
                      marginTop:    8,
                      background:   busy ? '#333' : 'linear-gradient(135deg, #1a73e8, #0d47a1)',
                      color:        '#fff',
                      border:       'none',
                      borderRadius: 10,
                      padding:      '12px 0',
                      cursor:       busy ? 'not-allowed' : 'pointer',
                      fontWeight:   700,
                      fontSize:     15,
                    }}
                  >
                    {busy ? '⏳ Submitting…' : '🚀 Submit Answer'}
                  </motion.button>
                </div>

              ) : (
                /* ── Post-attempt state ── */
                <div>
                  {/* Result banner */}
                  {result && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1,   opacity: 1 }}
                      style={{
                        background:   result.isCorrect ? '#00ff9f11' : '#ff4d6d11',
                        border:       `1px solid ${result.isCorrect ? '#00ff9f' : '#ff4d6d'}`,
                        borderRadius: 12,
                        padding:      '14px 18px',
                        marginBottom: 14,
                        color:        result.isCorrect ? '#00ff9f' : '#ff4d6d',
                        fontWeight:   600,
                        fontSize:     14,
                      }}
                    >
                      {result.message}
                      {result.isCorrect && result.attempterReward && (
                        <div style={{ marginTop: 6, color: '#f0c040', fontSize: 13 }}>
                          💰 +15 Credits &nbsp;·&nbsp; ⭐ +30 XP
                          &nbsp;·&nbsp; New Balance: {result.attempterReward.newCredits} Credits
                        </div>
                      )}
                    </motion.div>
                  )}

                  {already && (
                    <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
                      ✔️ You already attempted this challenge.
                    </div>
                  )}

                  {/* Rating section */}
                  <div style={{ marginTop: 8 }}>
                    <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>
                      Rate this challenge:
                    </p>
                    <StarRating
                      value={rating}
                      onChange={handleRate}
                      disabled={ratingDone || challenge.alreadyRated}
                    />
                    {(ratingDone || challenge.alreadyRated) && (
                      <p style={{ color: '#f0c04088', fontSize: 12, marginTop: 6 }}>
                        ⭐ Rating submitted!
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Hub Component ──────────────────────────────
export default function Hub({ user, userData, setUserData }) {
  const navigate = useNavigate();

  const [challenges, setChallenges] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [topic,      setTopic]      = useState('All');
  const [diff,       setDiff]       = useState('All');
  const [sort,       setSort]       = useState('newest');
  const [search,     setSearch]     = useState('');

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { sort };
      if (topic !== 'All') params.topic      = topic;
      if (diff  !== 'All') params.difficulty = diff;

      const { data } = await axios.get(`${API}/challenges`, { params });

      const enriched = data.challenges.map(c => ({
        ...c,
        alreadyAttempted: (c.attemptedBy || []).includes(user.uid),
        alreadyRated:     (c.ratedBy     || []).includes(user.uid),
      }));

      setChallenges(enriched);
    } catch (err) {
      console.error('❌ Hub fetchChallenges error:', err.response?.data || err.message);
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to load challenges. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [topic, diff, sort, user.uid]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  function handleAttempted(id, isCorrect, reward) {
    setChallenges(prev =>
      prev.map(c => c.id !== id ? c : {
        ...c,
        attempts:         (c.attempts || 0) + 1,
        passes:           isCorrect ? (c.passes || 0) + 1 : (c.passes || 0),
        alreadyAttempted: true,
      })
    );
    if (isCorrect && reward && setUserData) {
      setUserData(prev => ({ ...prev, ...reward }));
    }
  }

  function handleRated(id, newRating, ratingCount) {
    setChallenges(prev =>
      prev.map(c => c.id !== id ? c : {
        ...c,
        rating:      newRating,
        ratingCount,
        alreadyRated: true,
      })
    );
  }

  const visible = challenges.filter(c =>
    c.question.toLowerCase().includes(search.toLowerCase()) ||
    (c.creatorName || '').toLowerCase().includes(search.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────
  return (
    <div style={{
      minHeight:   '100vh',
      background:  '#0f0f1a',
      fontFamily:  'Arial, sans-serif',
      color:       '#e0e0ff',
      padding:     '0 0 60px',
    }}>

      {/* ── Top Bar ────────────────────────────────── */}
      <div style={{
        background:   'linear-gradient(90deg, #0a0a18, #12122a)',
        borderBottom: '1px solid #1e1e3a',
        padding:      '16px 28px',
        display:      'flex',
        alignItems:   'center',
        gap:          16,
        flexWrap:     'wrap',
      }}>
        <button
          onClick={() => navigate('/world')}
          style={{
            background:   'none',
            border:       '1px solid #333',
            color:        '#888',
            borderRadius: 8,
            padding:      '7px 14px',
            cursor:       'pointer',
            fontSize:     13,
          }}
        >
          ← World
        </button>

        <h1 style={{
          margin:             0,
          fontSize:           22,
          fontWeight:         800,
          flex:               1,
          background:         'linear-gradient(90deg, #1a73e8, #00ff9f)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          🏛️ Community Hub
        </h1>

        <div style={{
          background:   '#f0c04018',
          border:       '1px solid #f0c04066',
          borderRadius: 8,
          padding:      '7px 16px',
          color:        '#f0c040',
          fontSize:     13,
          fontWeight:   700,
        }}>
          💰 {userData?.credits ?? '—'} Credits
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────── */}
      <div style={{
        background:   '#0a0a18',
        borderBottom: '1px solid #1e1e3a',
        padding:      '14px 28px',
        display:      'flex',
        gap:          12,
        flexWrap:     'wrap',
        alignItems:   'center',
      }}>
        <input
          placeholder="🔍 Search by question or creator…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background:   '#12122a',
            border:       '1px solid #1e1e3a',
            borderRadius: 8,
            padding:      '8px 14px',
            color:        '#e0e0ff',
            fontSize:     13,
            minWidth:     240,
            outline:      'none',
          }}
        />

        <select value={topic} onChange={e => setTopic(e.target.value)} style={selectStyle}>
          {TOPICS.map(t => <option key={t}>{t}</option>)}
        </select>

        <select value={diff} onChange={e => setDiff(e.target.value)} style={selectStyle}>
          {DIFFS.map(d => <option key={d}>{d}</option>)}
        </select>

        <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <button onClick={fetchChallenges} style={{
          background:   '#1a73e822',
          border:       '1px solid #1a73e8',
          color:        '#1a73e8',
          borderRadius: 8,
          padding:      '8px 16px',
          cursor:       'pointer',
          fontSize:     13,
          fontWeight:   700,
        }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Main Feed ──────────────────────────────── */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px' }}>

        {/* Loading spinner */}
        {loading && (
          <div style={{ textAlign: 'center', color: '#888', fontSize: 16, marginTop: 60 }}>
            <div style={spinnerStyle} />
            <p>Loading challenges…</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            background:   '#ff4d6d11',
            border:       '1px solid #ff4d6d',
            borderRadius: 12,
            padding:      20,
            color:        '#ff4d6d',
            textAlign:    'center',
          }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && visible.length === 0 && (
          <div style={{ textAlign: 'center', color: '#555', marginTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏜️</div>
            <p style={{ fontSize: 16 }}>No challenges found. Be the first to create one!</p>
            <button
              onClick={() => navigate('/lab')}
              style={{
                marginTop:    16,
                background:   'linear-gradient(135deg, #1a73e8, #0d47a1)',
                color:        '#fff',
                border:       'none',
                borderRadius: 10,
                padding:      '12px 28px',
                cursor:       'pointer',
                fontWeight:   700,
              }}
            >
              🔬 Go to Lab
            </button>
          </div>
        )}

        {/* Count bar */}
        {!loading && visible.length > 0 && (
          <div style={{ color: '#555', fontSize: 12, marginBottom: 20 }}>
            Showing{' '}
            <span style={{ color: '#1a73e8', fontWeight: 700 }}>{visible.length}</span>
            {' '}challenge{visible.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Challenge cards */}
        <AnimatePresence>
          {!loading && visible.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              userId={user.uid}
              onAttempted={handleAttempted}
              onRated={handleRated}
            />
          ))}
        </AnimatePresence>

      </div>
    </div>
  );
}
