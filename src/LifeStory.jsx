import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence }                          from 'framer-motion';
import { useNavigate }                                      from 'react-router-dom';
import axios                                                from 'axios';
import API_BASE                                             from './config';
const LEVEL_NAMES = { 1:'Junior', 2:'Mid', 3:'Senior', 4:'Lead', 5:'Legend' };
const ROLE_COLORS = {
  Junior:  'from-green-500  to-emerald-700',
  Mid:     'from-blue-500   to-indigo-700',
  Senior:  'from-purple-500 to-violet-700',
  Lead:    'from-orange-500 to-amber-700',
  Legend:  'from-red-500    to-rose-700',
};
const ROLE_ICONS = {
  Junior:'🌱', Mid:'💻', Senior:'🔥', Lead:'👑', Legend:'⚡',
};
function getWeekLabel(weekId) {
  if (!weekId) return 'Unknown Week';
  // weekId format: "YYYY-Www"
  const match = weekId.match(/(\d{4})-W(\d{2})/);
  if (!match) return weekId;
  return `Week ${parseInt(match[2], 10)}, ${match[1]}`;
}
function formatDate(ts) {
  if (!ts) return '';

  let date;

  // Firestore Timestamp object (from SDK)
  if (typeof ts?.toDate === 'function') {
    date = ts.toDate();

  // Firestore Timestamp serialized over HTTP: { _seconds, _nanoseconds }
  } else if (ts?._seconds !== undefined) {
    date = new Date(ts._seconds * 1000);

  // Firestore REST API format: { seconds, nanoseconds }
  } else if (ts?.seconds !== undefined) {
    date = new Date(ts.seconds * 1000);

  // Already a JS Date
  } else if (ts instanceof Date) {
    date = ts;

  // ISO string or timestamp number
  } else {
    date = new Date(ts);
  }

  if (isNaN(date.getTime())) return '';   // ← silently hide if still invalid

  return date.toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  });
}
// ─── Typewriter Hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 28, active = false) {
  const [displayed, setDisplayed] = useState('');
  const [done,      setDone]      = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    if (!active || !text) return;
    setDisplayed('');
    setDone(false);
    idx.current = 0;

    const interval = setInterval(() => {
      idx.current += 1;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, active]);

  return { displayed, done };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Cinematic loading screen
function CinematicLoader() {
  return (
    <motion.div
      key="loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen"
    >
      {/* Outer ring */}
      <div className="relative w-28 h-28 mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-transparent
                     border-t-cyan-400 border-r-purple-500"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-3 rounded-full border-2 border-transparent
                     border-t-pink-400 border-l-blue-500"
        />
        <div className="absolute inset-0 flex items-center justify-center text-4xl">
          📖
        </div>
      </div>

      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-cyan-400 font-mono text-sm tracking-widest uppercase"
      >
        Generating your story...
      </motion.p>
      <p className="text-gray-600 text-xs mt-2">
        The AI is writing your DSA journey
      </p>
    </motion.div>
  );
}

// Particle burst on story reveal
function Particles() {
  const particles = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, x: '50%', y: '50%', scale: 0 }}
          animate={{
            opacity:  [1, 0],
            x:        `${50 + (Math.random() - 0.5) * 80}%`,
            y:        `${50 + (Math.random() - 0.5) * 80}%`,
            scale:    [0, 1.5, 0],
          }}
          transition={{ duration: 1.2, delay: i * 0.05, ease: 'easeOut' }}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: ['#22d3ee','#a855f7','#ec4899','#f59e0b'][i % 4],
          }}
        />
      ))}
    </div>
  );
}

// Story reveal card with typewriter
function StoryReveal({ story, userData, onViewArchive, onRegenerate, loading }) {
  const level     = userData?.level ?? 1;
  const levelName = LEVEL_NAMES[level] || 'Junior';
  const gradient  = ROLE_COLORS[levelName]  || ROLE_COLORS.Junior;
  const roleIcon  = ROLE_ICONS[levelName]   || '🌱';

  const [showParticles, setShowParticles] = useState(true);
  const [copied,        setCopied]        = useState(false);

  const storyText = story?.content || story?.story || '';
  const weekLabel = getWeekLabel(story?.weekId);
  const genDate   = formatDate(story?.generatedAt);

  const { displayed, done } = useTypewriter(storyText, 25, true);

  useEffect(() => {
    const t = setTimeout(() => setShowParticles(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleCopy = () => {
    const text = `📖 My DSA Life Story — ${weekLabel}\n\n${storyText}\n\n— ${userData?.displayName || 'DSA Coder'} (${levelName})\nDSA Life Simulator`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <motion.div
      key="reveal"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y:  0  }}
      exit={{    opacity: 0, y: -30 }}
      transition={{ duration: 0.6 }}
      className="relative w-full max-w-2xl mx-auto"
    >
      {showParticles && <Particles />}

      {/* Chapter badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y:   0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center mb-6"
      >
        <span className="bg-white/10 border border-white/20 text-gray-300
                         text-xs px-4 py-1.5 rounded-full font-mono tracking-widest uppercase">
          📅 {weekLabel}
        </span>
      </motion.div>

      {/* Main story card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1    }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative bg-white/5 border border-white/10 rounded-2xl
                   overflow-hidden shadow-2xl"
      >
        {/* Gradient top bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

        {/* Role header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 pt-5 pb-4 border-b border-white/10">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient}
                          flex items-center justify-center text-xl`}>
            {roleIcon}
          </div>
          <div>
            <p className="text-white font-bold text-sm">
              {userData?.displayName || 'DSA Coder'}
            </p>
            <p className="text-gray-400 text-xs">{levelName} Developer</p>
          </div>
          {genDate && (
            <p className="ml-auto text-gray-600 text-xs">{genDate}</p>
          )}
        </div>

        {/* Story text with typewriter */}
        <div className="px-6 py-6 min-h-[160px]">
          {/* Decorative quote mark */}
          <span className="text-5xl text-cyan-500/20 font-serif leading-none
                           select-none float-left mr-2 -mt-2">
            "
          </span>

          <p className="text-gray-200 leading-relaxed text-sm md:text-base
                        font-light tracking-wide">
            {displayed}
            {/* Blinking cursor while typing */}
            {!done && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 align-middle"
              />
            )}
          </p>
        </div>

        {/* Actions footer */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y:  0  }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-6 pb-5"
            >
              {/* Share / Copy */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs
                            font-semibold transition-all duration-300
                            ${copied
                              ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                              : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30'
                            }`}
              >
                {copied ? '✅ Copied!' : '📋 Share Story'}
              </motion.button>

              {/* View archive */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onViewArchive}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs
                           font-semibold bg-white/10 border border-white/10
                           text-gray-300 hover:bg-white/20 transition-all"
              >
                📚 View All Chapters
              </motion.button>

              {/* Regenerate */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onRegenerate}
                disabled={loading}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl
                           text-xs font-semibold bg-white/5 border border-white/10
                           text-gray-500 hover:text-gray-300 hover:bg-white/10
                           transition-all disabled:opacity-40"
              >
                🔄 {loading ? 'Writing…' : 'Regenerate'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Decorative glow */}
      <div className={`absolute -inset-px -z-10 blur-2xl opacity-10
                       bg-gradient-to-br ${gradient} rounded-2xl`} />
    </motion.div>
  );
}

// Archive chapter card
function ChapterCard({ chapter, index, onClick }) {
  const weekLabel = getWeekLabel(chapter?.weekId);
  const genDate   = formatDate(chapter?.generatedAt);
  const preview   = (chapter?.content || chapter?.story || '').slice(0, 120);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y:  0  }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={() => onClick(chapter)}
      className="cursor-pointer bg-white/5 hover:bg-white/10
                 border border-white/10 hover:border-cyan-500/30
                 rounded-xl p-4 transition-all duration-200 group"
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30
                          flex items-center justify-center text-sm">
            📖
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Chapter {index + 1}</p>
            <p className="text-gray-500 text-xs">{weekLabel}</p>
          </div>
        </div>
        <span className="text-gray-600 text-xs">{genDate}</span>
      </div>

      {/* Preview */}
      <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">
        {preview}…
      </p>

      {/* Read more */}
      <div className="flex items-center gap-1 mt-3 text-cyan-500/60
                      group-hover:text-cyan-400 transition-colors">
        <span className="text-xs">Read chapter</span>
        <span className="text-xs">→</span>
      </div>
    </motion.div>
  );
}

// Archive modal overlay
function ArchiveModal({ archive, onClose, onSelectChapter }) {
  return (
    <motion.div
      key="archive-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y:  0  }}
        exit={{    opacity: 0, scale: 0.92, y: 20  }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0d0d1f] border border-white/10
                   rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg">📚 Story Archive</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              {archive.length} chapter{archive.length !== 1 ? 's' : ''} in your journey
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20
                       flex items-center justify-center text-gray-400
                       hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Chapter grid */}
        <div className="overflow-y-auto p-5"
             style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {archive.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-gray-400 text-sm">No archived chapters yet.</p>
              <p className="text-gray-600 text-xs mt-1">
                Stories are saved weekly after generation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {archive.map((chapter, i) => (
                <ChapterCard
                  key={chapter.weekId || i}
                  chapter={chapter}
                  index={i}
                  onClick={(ch) => {
                    onSelectChapter(ch);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main LifeStory Component ─────────────────────────────────────────────────
export default function LifeStory({ user, userData }) {
  const navigate = useNavigate();

  const [story,        setStory]        = useState(null);
  const [archive,      setArchive]      = useState([]);
  const [stage,        setStage]        = useState('loading'); // loading | reveal | error
  const [error,        setError]        = useState('');
  const [generating,   setGenerating]   = useState(false);
  const [showArchive,  setShowArchive]  = useState(false);
  const uid = user?.uid;

  // ── Fetch current story ────────────────────────────────────────────────────
  const fetchStory = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await axios.get(`${API_BASE}/story/${uid}`);
      if (res.data?.story) {
        setStory(res.data.story);
        setStage('reveal');
      } else {
        // No story yet — auto-generate
        await generateStory();
      }
    } catch (err) {
      console.error('[LifeStory] fetchStory error:', err);
      setError('⚠️ Failed to load story.');
      setStage('error');
    }
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate story ─────────────────────────────────────────────────────────
  const generateStory = useCallback(async () => {
    if (!uid) return;
    setGenerating(true);
    setStage('loading');
    try {
      const res = await axios.post(`${API_BASE}/story/generate`, { userId: uid });
      setStory(res.data?.story || res.data);
      setStage('reveal');
    } catch (err) {
      console.error('[LifeStory] generateStory error:', err);
      setError('⚠️ Failed to generate story.');
      setStage('error');
    } finally {
      setGenerating(false);
    }
  }, [uid]);

  // ── Fetch archive ──────────────────────────────────────────────────────────
  const fetchArchive = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await axios.get(`${API_BASE}/story/${uid}/archive`);
      setArchive(res.data?.archive || []);
    } catch (err) {
      console.error('[LifeStory] fetchArchive error:', err);
    }
  }, [uid]);

  // ── On mount ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStory();
    fetchArchive();
  }, [fetchStory, fetchArchive]);

  // ── View selected archive chapter ─────────────────────────────────────────
  const handleSelectChapter = (chapter) => {
    setStory(chapter);
    setStage('reveal');
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060612] text-white overflow-x-hidden">
      {/* ── Background glow ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2
                        w-[600px] h-[400px] rounded-full
                        bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4
                        w-[400px] h-[300px] rounded-full
                        bg-cyan-600/8 blur-[100px]" />
      </div>

      {/* ── Top nav ── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y:   0 }}
        className="relative z-10 flex items-center justify-between
                   px-6 py-4 border-b border-white/5"
      >
        <motion.button
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/world')}
          className="flex items-center gap-2 text-gray-400 hover:text-white
                     transition-colors text-sm"
        >
          ← Back to World
        </motion.button>

        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">
            Life Story
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowArchive(true)}
          className="flex items-center gap-2 text-gray-400 hover:text-cyan-400
                     transition-colors text-sm"
        >
          📚 Archive
          {archive.length > 0 && (
            <span className="bg-cyan-500/20 border border-cyan-500/30
                             text-cyan-400 text-xs px-1.5 py-0.5 rounded-full">
              {archive.length}
            </span>
          )}
        </motion.button>
      </motion.nav>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center
                      justify-center px-4 py-12 min-h-[calc(100vh-70px)]">

        {/* Page title */}
        <AnimatePresence mode="wait">
          {stage !== 'loading' && (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y:   0 }}
              className="text-center mb-10"
            >
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                📖 Your{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-purple-500
                                 bg-clip-text text-transparent">
                  Life Story
                </span>
              </h1>
              <p className="text-gray-500 text-sm">
                An AI-generated chronicle of your DSA journey this week
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stages ── */}
        <AnimatePresence mode="wait">

          {/* Loading */}
          {stage === 'loading' && <CinematicLoader key="loader" />}

          {/* Story reveal */}
          {stage === 'reveal' && story && (
            <StoryReveal
              key="reveal"
              story={story}
              userData={userData}
              onViewArchive={() => setShowArchive(true)}
              onRegenerate={generateStory}
              loading={generating}
            />
          )}

          {/* Error */}
          {stage === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1    }}
              exit={{    opacity: 0, scale: 0.95  }}
              className="text-center"
            >
              <p className="text-5xl mb-4">📕</p>
              <p className="text-red-400 text-lg font-semibold mb-2">{error}</p>
              <p className="text-gray-500 text-sm mb-6">
                Could not load your story. Check your connection and try again.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={fetchStory}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40
                           text-cyan-400 px-6 py-2.5 rounded-xl text-sm font-semibold
                           transition-all"
              >
                🔄 Try Again
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Archive modal ── */}
      <AnimatePresence>
        {showArchive && (
          <ArchiveModal
            archive={archive}
            onClose={() => setShowArchive(false)}
            onSelectChapter={handleSelectChapter}
          />
        )}
      </AnimatePresence>
    </div>
  );
}




