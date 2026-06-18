import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import axios from 'axios';
import API_BASE from './config';
import CodeEditor from './CodeEditor';

// ─────────────────────────────────────────────────────────────────────────────
// ATTEMPT REWARD TABLE
// attempt 1 → full XP/credits, no hints, no solution
// attempt 2 → 75% XP, hint 1 shown
// attempt 3 → 50% XP, hint 2 shown
// attempt 4 → 25% XP, all hints + FULL SOLUTION revealed
// attempt 5+ → 10% XP, solution always visible
// ─────────────────────────────────────────────────────────────────────────────
const ATTEMPT_CONFIG = [
  { attempt: 1, xpMult: 1.00, crMult: 1.00, hintsUnlocked: 0, solutionUnlocked: false, label: 'First Try',      color: '#00c896', badge: '⭐⭐⭐ Perfect Score'     },
  { attempt: 2, xpMult: 0.75, crMult: 0.75, hintsUnlocked: 1, solutionUnlocked: false, label: 'Second Try',     color: '#22d3ee', badge: '⭐⭐ Hint Used (-25%)'    },
  { attempt: 3, xpMult: 0.50, crMult: 0.50, hintsUnlocked: 2, solutionUnlocked: false, label: 'Third Try',      color: '#f59e0b', badge: '⭐ Struggled (-50%)'      },
  { attempt: 4, xpMult: 0.25, crMult: 0.25, hintsUnlocked: 99, solutionUnlocked: true, label: 'Solution Peek',  color: '#f97316', badge: '📖 Solution Revealed (-75%)' },
  { attempt: 5, xpMult: 0.10, crMult: 0.10, hintsUnlocked: 99, solutionUnlocked: true, label: 'Practice Mode',  color: '#ef4444', badge: '🔄 Practice (-90%)'       },
];

function getAttemptConfig(attemptNumber) {
  if (attemptNumber <= 0) return ATTEMPT_CONFIG[0];
  if (attemptNumber >= ATTEMPT_CONFIG.length) return ATTEMPT_CONFIG[ATTEMPT_CONFIG.length - 1];
  return ATTEMPT_CONFIG[attemptNumber - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function Typewriter({ text, speed = 14, onDone }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0; setDisplayed(''); setDone(false);
    const t = setInterval(() => {
      if (idx.current < text.length) { setDisplayed(text.slice(0, ++idx.current)); }
      else { clearInterval(t); setDone(true); onDone?.(); }
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span>{displayed}{!done && <span style={{ color: '#00c896', animation: 'blink 1s infinite' }}>|</span>}<style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style></span>;
}

function StarRating({ stars, max = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <motion.span key={i} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: i * 0.15, type: 'spring', stiffness: 200 }}
          style={{ fontSize: 22, color: i < stars ? '#f5c542' : '#2a2a3a', filter: i < stars ? 'drop-shadow(0 0 6px #f5c542)' : 'none' }}>★</motion.span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTEMPT BADGE — shown before editor loads
// ─────────────────────────────────────────────────────────────────────────────
function AttemptBadge({ attemptNumber, config }) {
  return (
    <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ background: config.color + '22', border: `1px solid ${config.color}55`, borderRadius: 20, padding: '4px 14px', color: config.color, fontSize: 12, fontWeight: 700 }}>
        🎯 Attempt #{attemptNumber}
      </div>
      <div style={{ background: '#ffffff11', border: '1px solid #ffffff22', borderRadius: 20, padding: '4px 14px', color: '#aaa', fontSize: 12 }}>
        {config.badge}
      </div>
      {config.solutionUnlocked && (
        <div style={{ background: '#ef444422', border: '1px solid #ef444466', borderRadius: 20, padding: '4px 14px', color: '#ef4444', fontSize: 12, fontWeight: 700 }}>
          📖 Solution Unlocked
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HINT PANEL — shown based on attempt number
// ─────────────────────────────────────────────────────────────────────────────
function HintPanel({ hints = [], hintsUnlocked, problemId, attemptNumber }) {
  const [open, setOpen] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const available = Math.min(hintsUnlocked, hints.length);
  if (available === 0) return null;

  return (
    <div style={{ background: '#0d1117', border: '1px solid #22d3ee33', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#22d3ee', fontSize: 13, fontWeight: 700 }}>
          💡 Hints Available ({available}/{hints.length})
        </span>
        <span style={{ color: '#22d3ee', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {hints.slice(0, available).map((hint, i) => (
                <div key={i}>
                  {i < revealedCount ? (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: '#22d3ee11', border: '1px solid #22d3ee33', borderRadius: 8, padding: '8px 12px', color: '#c8e8f0', fontSize: 13 }}>
                      <span style={{ color: '#22d3ee', fontWeight: 700 }}>Hint {i + 1}: </span>{hint}
                    </motion.div>
                  ) : (
                    <button onClick={() => setRevealedCount(i + 1)}
                      style={{ background: '#ffffff08', border: '1px dashed #ffffff22', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#666', fontSize: 12, width: '100%', textAlign: 'left' }}>
                      🔒 Click to reveal Hint {i + 1}
                    </button>
                  )}
                </div>
              ))}
              {available < hints.length && (
                <div style={{ color: '#444', fontSize: 11, textAlign: 'center', paddingTop: 4 }}>
                  🔒 {hints.length - available} more hint{hints.length - available > 1 ? 's' : ''} unlock on next attempt
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOLUTION PANEL — shown only on attempt 4+
// ─────────────────────────────────────────────────────────────────────────────
function SolutionPanel({ solution, pattern, memoryHook, timeComplexity, spaceComplexity }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!solution && !pattern) return null;

  return (
    <div style={{ background: '#0d1117', border: '1px solid #ef444433', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 700 }}>
          📖 Solution & Pattern (Attempt 4+ unlock)
        </span>
        <span style={{ color: '#ef4444', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 16px' }}>
              {!confirmed ? (
                <div style={{ background: '#ef444411', border: '1px solid #ef444433', borderRadius: 8, padding: '12px', marginBottom: 8 }}>
                  <p style={{ color: '#ef9090', fontSize: 13, margin: '0 0 12px' }}>
                    ⚠️ Viewing the solution reduces your score. Companies can see when this was accessed. Are you sure?
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmed(true)}
                      style={{ background: '#ef444422', border: '1px solid #ef444466', borderRadius: 8, padding: '6px 16px', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                      Yes, show solution
                    </button>
                    <button onClick={() => setOpen(false)}
                      style={{ background: '#ffffff11', border: '1px solid #ffffff22', borderRadius: 8, padding: '6px 16px', color: '#888', cursor: 'pointer', fontSize: 12 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Pattern */}
                  <div style={{ background: '#a855f711', border: '1px solid #a855f733', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ color: '#a855f7', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>🧠 Pattern</div>
                    <div style={{ color: '#d4b8f7', fontSize: 13 }}>{pattern}</div>
                  </div>
                  {/* Memory Hook */}
                  {memoryHook && (
                    <div style={{ background: '#22d3ee11', border: '1px solid #22d3ee33', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ color: '#22d3ee', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>🔑 Memory Hook</div>
                      <div style={{ color: '#c8e8f0', fontSize: 13, lineHeight: 1.6 }}>{memoryHook}</div>
                    </div>
                  )}
                  {/* Complexity */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {timeComplexity && (
                      <div style={{ flex: 1, background: '#00c89611', border: '1px solid #00c89633', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ color: '#00c896', fontSize: 10, fontWeight: 700 }}>TIME</div>
                        <div style={{ color: '#a8f0d8', fontSize: 13 }}>{timeComplexity}</div>
                      </div>
                    )}
                    {spaceComplexity && (
                      <div style={{ flex: 1, background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700 }}>SPACE</div>
                        <div style={{ color: '#fde68a', fontSize: 13 }}>{spaceComplexity}</div>
                      </div>
                    )}
                  </div>
                  {/* Solution code */}
                  {solution && (
                    <div>
                      <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>💻 Reference Solution</div>
                      <pre style={{ background: '#0a0a14', border: '1px solid #ef444422', borderRadius: 8, padding: '12px', color: '#f0c060', fontSize: 12, overflow: 'auto', margin: 0, lineHeight: 1.6, maxHeight: 320 }}>
                        {solution}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// XP DECAY VISUAL
// ─────────────────────────────────────────────────────────────────────────────
function XPDecayBar({ attemptNumber, baseXP, baseCredits }) {
  const configs = ATTEMPT_CONFIG;
  return (
    <div style={{ background: '#0d1117', border: '1px solid #ffffff11', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ color: '#888', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        📊 Reward Decay — Attempt #{attemptNumber}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
        {configs.map((cfg, i) => {
          const isActive = (attemptNumber - 1) === i;
          const isPast   = attemptNumber - 1 > i;
          const h = Math.max(cfg.xpMult * 48, 8);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ fontSize: 9, color: isActive ? cfg.color : isPast ? '#333' : '#555', fontWeight: 700 }}>
                {Math.round(cfg.xpMult * 100)}%
              </div>
              <div style={{
                width: '100%', height: h, borderRadius: 4,
                background: isActive ? cfg.color : isPast ? '#1a1a2a' : '#1e2030',
                border: isActive ? `1px solid ${cfg.color}` : '1px solid #2a2a3a',
                boxShadow: isActive ? `0 0 10px ${cfg.color}66` : 'none',
                transition: 'all 0.3s',
              }} />
              <div style={{ fontSize: 9, color: isActive ? cfg.color : '#444' }}>
                A{i + 1}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
        <span style={{ color: '#a855f7', fontSize: 12, fontWeight: 700 }}>
          +{Math.round(baseXP * getAttemptConfig(attemptNumber).xpMult)} XP
        </span>
        <span style={{ color: '#f5c542', fontSize: 12, fontWeight: 700 }}>
          +{Math.round(baseCredits * getAttemptConfig(attemptNumber).crMult)} CR
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CINEMATIC SCENE (intro)
// ─────────────────────────────────────────────────────────────────────────────
function CinematicScene({ problem, onReveal, attemptNumber, attemptConfig }) {
  const [sceneTyped, setSceneTyped] = useState(false);
  const [showBtn, setShowBtn]       = useState(false);

  const companyColor = {
    Google: '#4285f4', Amazon: '#ff9900', Apple: '#a2aaad', Meta: '#0081fb',
    Microsoft: '#00a4ef', Oracle: '#f80000', Salesforce: '#00a1e0',
    Adobe: '#ff0000', Broadcom: '#cc092f',
  }[problem.companies?.[0]] || '#1a73e8';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Background orb */}
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 6, repeat: Infinity }}
        style={{ position: 'absolute', width: 500, height: 500, background: companyColor, borderRadius: '50%', left: '30%', top: '20%', transform: 'translate(-50%,-50%)', filter: 'blur(120px)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
        style={{ maxWidth: 700, width: '100%', position: 'relative', zIndex: 1 }}>

        {/* Attempt + company badges */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ background: companyColor + '22', border: `1px solid ${companyColor}44`, borderRadius: 20, padding: '4px 14px', color: companyColor, fontSize: 12, fontWeight: 700 }}>
            📍 {problem.companies?.join(' · ') || 'FAANG'}
          </div>
          <div style={{ background: '#ffffff11', border: '1px solid #ffffff22', borderRadius: 20, padding: '4px 14px', color: '#ccc', fontSize: 12 }}>
            {problem.difficulty}
          </div>
          {problem.isBoss && (
            <div style={{ background: '#ff4d4d33', border: '1px solid #ff4d4d66', borderRadius: 20, padding: '4px 14px', color: '#ff4d4d', fontSize: 12, fontWeight: 900 }}>
              ⚔️ BOSS
            </div>
          )}
          {problem.enterpriseOnly && (
            <div style={{ background: '#a855f722', border: '1px solid #a855f744', borderRadius: 20, padding: '4px 14px', color: '#a855f7', fontSize: 12, fontWeight: 700 }}>
              🏢 Enterprise
            </div>
          )}
          <AttemptBadge attemptNumber={attemptNumber} config={attemptConfig} />
        </motion.div>

        {/* Title */}
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ fontSize: 28, fontWeight: 900, margin: '0 0 24px', background: `linear-gradient(135deg, #e8e8e8, ${companyColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {problem.title}
        </motion.h1>

        {/* XP decay preview */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <XPDecayBar attemptNumber={attemptNumber} baseXP={problem.xpReward || 100} baseCredits={problem.creditReward || 20} />
        </motion.div>

        {/* Cinematic story */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ background: '#0d1117', border: `1px solid ${companyColor}33`, borderRadius: 16, padding: '20px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${companyColor}, transparent)` }} />
          <div style={{ color: companyColor, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>🎬 Mission Briefing</div>
          <p style={{ color: '#c8c8c8', fontSize: 14, lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>
            <Typewriter
              text={problem.cinematicStory || problem.description || ''}
              speed={12}
              onDone={() => { setSceneTyped(true); setTimeout(() => setShowBtn(true), 400); }}
            />
          </p>
        </motion.div>

        {/* Memory hook */}
        <AnimatePresence>
          {sceneTyped && (
            <motion.div key="hook" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: '#0d1117', border: '1px solid #a855f733', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ color: '#a855f7', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>🧠 Memory Hook</div>
              <div style={{ color: '#c8a8f7', fontSize: 13, lineHeight: 1.6 }}>{problem.memoryHook || problem.pattern}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reveal button */}
        <AnimatePresence>
          {showBtn && (
            <motion.button key="reveal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onClick={onReveal}
              style={{ width: '100%', background: `linear-gradient(135deg, ${companyColor}33, ${companyColor}66)`, border: `1px solid ${companyColor}66`, borderRadius: 12, color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, padding: '14px 0', boxShadow: `0 0 20px ${companyColor}33` }}>
              {attemptNumber > 1 ? `🔄 Attempt #${attemptNumber} — Start Coding` : '🚀 Accept Mission'}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function ResultScreen({ problem, result, onContinue, onRetry, attemptNumber, allAttempts }) {
  const cfg = getAttemptConfig(attemptNumber);

  const passed     = result.allPassed;
  const xpEarned   = result.xp;
  const crEarned   = result.credits;
  const stars      = passed ? (attemptNumber === 1 ? 3 : attemptNumber === 2 ? 2 : 1) : 0;
  const nextCfg    = getAttemptConfig(attemptNumber + 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: '#0a0a14cc', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24, fontFamily: 'Arial, sans-serif' }}>

      <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 22 }}
        style={{ background: '#0d1117', border: passed ? '1px solid #00c89644' : '1px solid #ef444433', borderRadius: 20, padding: 28, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1, repeat: passed ? 3 : 0 }}
            style={{ fontSize: 48, marginBottom: 8 }}>{passed ? '🎉' : '💪'}</motion.div>
          <h2 style={{ color: passed ? '#00c896' : '#ef4444', fontSize: 20, fontWeight: 900, margin: '0 0 6px' }}>
            {passed ? 'All Tests Passed!' : 'Not Quite — Keep Going!'}
          </h2>
          <div style={{ color: '#666', fontSize: 13 }}>{passed ? `Solved on attempt #${attemptNumber}` : `Attempt #${attemptNumber} failed`}</div>
        </div>

        {/* Stars */}
        {passed && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <StarRating stars={stars} />
          </div>
        )}

        {/* Test results */}
        <div style={{ background: '#ffffff08', border: '1px solid #ffffff11', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: 14, fontWeight: 700 }}>
            <span>Test Cases</span>
            <span style={{ color: passed ? '#00c896' : '#ef4444' }}>{result.passed}/{result.total} passed</span>
          </div>
        </div>

        {/* XP & Credits earned */}
        {passed && (xpEarned > 0 || crEarned > 0) && (
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 1.5, repeat: 3 }}
            style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { val: `+${xpEarned} XP`, color: '#a855f7', glow: '#a855f744' },
              { val: `+${crEarned} CR`, color: '#f5c542', glow: '#f5c54244' },
            ].map(({ val, color, glow }) => (
              <div key={val} style={{ background: glow, border: `1px solid ${color}66`, borderRadius: 30, padding: '8px 22px', color, fontSize: 18, fontWeight: 900, boxShadow: `0 0 16px ${glow}` }}>
                {val}
              </div>
            ))}
          </motion.div>
        )}

        {/* Attempt history */}
        {allAttempts?.length > 0 && (
          <div style={{ background: '#ffffff06', border: '1px solid #ffffff0a', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ color: '#666', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Attempt History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {allAttempts.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#888' }}>#{a.attemptNumber} — {getAttemptConfig(a.attemptNumber).label}</span>
                  <span style={{ color: a.passed ? '#00c896' : '#ef4444' }}>{a.passed ? `✓ +${a.xpAwarded}XP` : '✗ 0XP'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score decay warning for next attempt */}
        {!passed && attemptNumber < 5 && (
          <div style={{ background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>⚠️ Next Attempt: {nextCfg.badge}</div>
            <div style={{ color: '#999', fontSize: 12 }}>
              {nextCfg.hintsUnlocked > 0 && `${nextCfg.hintsUnlocked} hint${nextCfg.hintsUnlocked > 1 ? 's' : ''} will unlock. `}
              {nextCfg.solutionUnlocked && 'Solution will be revealed. '}
              XP reduces to {Math.round(nextCfg.xpMult * 100)}%.
            </div>
          </div>
        )}

        {/* Pattern learned */}
        {passed && (
          <div style={{ background: '#a855f711', border: '1px solid #a855f733', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ color: '#a855f7', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Pattern Learned</div>
            <div style={{ color: '#c8a8f7', fontSize: 13 }}>{problem.pattern}</div>
            <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{problem.memoryHook}</div>
          </div>
        )}

        {/* Company HR visibility note */}
        <div style={{ background: '#ffffff06', border: '1px solid #ffffff0a', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ color: '#555', fontSize: 11 }}>
            📊 <strong style={{ color: '#777' }}>Company Profile Visible:</strong>{' '}
            {attemptNumber === 1 ? '⭐⭐⭐ First-try solve — Strong signal for FAANG/Enterprise roles' :
             attemptNumber === 2 ? '⭐⭐ Solved with hints — Good candidate, used guidance' :
             attemptNumber === 3 ? '⭐ Solved after struggle — Shows persistence' :
             attemptNumber >= 4  ? '📖 Solved after viewing solution — Learning mode' :
             'Profile updated'}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!passed && (
            <button onClick={onRetry}
              style={{ flex: 1, background: '#1e2a3a', border: '1px solid #2a3a4a', borderRadius: 10, color: '#ccc', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: '12px 0' }}>
              🔄 Try Again (A#{attemptNumber + 1})
            </button>
          )}
          <button onClick={onContinue}
            style={{ flex: 1, background: passed ? 'linear-gradient(135deg, #00c896, #1a73e8)' : '#1e2a3a', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '12px 0', boxShadow: passed ? '0 0 20px #00c89633' : 'none' }}>
            {passed ? 'Continue →' : 'Back to Map'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDE PANEL — hints + solution (rendered alongside editor)
// ─────────────────────────────────────────────────────────────────────────────
function SideAssistPanel({ problem, attemptNumber, attemptConfig, onClose }) {
  const [tab, setTab] = useState('problem');
  const tabs = ['problem', 'hints', ...(attemptConfig.solutionUnlocked ? ['solution'] : [])];

  return (
    <motion.div initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, background: '#0d1117', borderLeft: '1px solid #1e2a3a', zIndex: 30, display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #1e2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#ccc', fontSize: 13, fontWeight: 700 }}>📋 {problem.title}</div>
          <div style={{ color: getAttemptConfig(attemptNumber).color, fontSize: 11, marginTop: 2 }}>
            Attempt #{attemptNumber} · {getAttemptConfig(attemptNumber).badge}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e2a3a' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #22d3ee' : '2px solid transparent', color: tab === t ? '#22d3ee' : '#666', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 4px', textTransform: 'capitalize' }}>
            {t === 'problem' ? '📄 Problem' : t === 'hints' ? `💡 Hints` : '📖 Solution'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tab === 'problem' && (
          <>
            <XPDecayBar attemptNumber={attemptNumber} baseXP={problem.xpReward || 100} baseCredits={problem.creditReward || 20} />
            <div style={{ background: '#ffffff06', border: '1px solid #ffffff0a', borderRadius: 10, padding: '12px' }}>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{problem.description}</div>
            </div>
            {problem.examples?.map((ex, i) => (
              <div key={i} style={{ background: '#ffffff06', border: '1px solid #ffffff0a', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ color: '#666', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Example {i + 1}</div>
                <div style={{ color: '#a8d8a8', fontSize: 12 }}>Input: {ex.input}</div>
                <div style={{ color: '#f0c060', fontSize: 12 }}>Output: {ex.output}</div>
              </div>
            ))}
            {problem.constraints && (
              <div style={{ background: '#ffffff06', border: '1px solid #ffffff0a', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ color: '#666', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Constraints</div>
                {problem.constraints.map((c, i) => <div key={i} style={{ color: '#888', fontSize: 12 }}>• {c}</div>)}
              </div>
            )}
          </>
        )}

        {tab === 'hints' && (
          <HintPanel
            hints={problem.hints || []}
            hintsUnlocked={attemptConfig.hintsUnlocked}
            problemId={problem.id}
            attemptNumber={attemptNumber}
          />
        )}

        {tab === 'solution' && attemptConfig.solutionUnlocked && (
          <SolutionPanel
            solution={problem.solution || problem.solutionCode}
            pattern={problem.pattern}
            memoryHook={problem.memoryHook}
            timeComplexity={problem.timeComplexity}
            spaceComplexity={problem.spaceComplexity}
          />
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CinematicProblemSolver({ user, userData, setUserData }) {
  const { problemId } = useParams();
  const navigate      = useNavigate();

  const [problem,       setProblem]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [phase,         setPhase]         = useState('cinematic'); // cinematic | editor | result
  const [result,        setResult]        = useState(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [allAttempts,   setAllAttempts]   = useState([]);
  const [showSidePanel, setShowSidePanel] = useState(true);

  const attemptConfig = getAttemptConfig(attemptNumber);

  // ── Load problem + previous attempt count ────────────────────────────────
  useEffect(() => {
  if (!problemId) {
    setError('Problem ID missing.');
    setLoading(false);
    return;
  }

  if (!user?.uid) {
    setError('Please login first.');
    setLoading(false);
    return;
  }

  let alive = true;

  const loadProblem = async () => {
    setLoading(true);
    setError('');

    try {
      const probRes = await axios.get(`${API_BASE}/problems/${problemId}`);

      if (!alive) return;

      if (probRes.data?.problem) {
        setProblem(probRes.data.problem);
      } else {
        setError('Problem not found.');
        setProblem(null);
      }

      try {
        const attDoc = await getDoc(
          doc(db, 'userProblemAttempts', `${user.uid}_${problemId}`)
        );

        if (!alive) return;

        if (attDoc.exists()) {
          const data = attDoc.data();
          setAttemptNumber((data.attemptCount || 0) + 1);
          setAllAttempts(data.attempts || []);
        } else {
          setAttemptNumber(1);
          setAllAttempts([]);
        }
      } catch (attemptErr) {
        console.warn('Attempt fetch failed:', attemptErr);
        setAttemptNumber(1);
        setAllAttempts([]);
      }
    } catch (err) {
      console.error('Problem fetch failed:', err);
      if (!alive) return;
      setProblem(null);
      setError(
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load problem.'
      );
    } finally {
      if (alive) setLoading(false);
    }
  };

  loadProblem();

   return () => {
    alive = false;
   };
  }, [problemId, user?.uid]);

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (code, langId, testResults) => {
    const passed    = testResults.filter(r => r.passed).length;
    const total     = testResults.length;
    const allPassed = passed === total && total > 0;
    const cfg       = getAttemptConfig(attemptNumber);

    const baseXP      = problem?.xpReward     || 100;
    const baseCredits = problem?.creditReward  || 20;
    const xpAwarded   = allPassed ? Math.round(baseXP * cfg.xpMult)      : 0;
    const crAwarded   = allPassed ? Math.round(baseCredits * cfg.crMult) : 0;

    const stars = allPassed
      ? (attemptNumber === 1 ? 3 : attemptNumber <= 3 ? 2 : 1)
      : 0;

    // ── Save attempt record to Firestore ────────────────────────────────────
    const attemptRef  = doc(db, 'userProblemAttempts', `${user.uid}_${problemId}`);
    const newAttempt  = {
      attemptNumber,
      passed:       allPassed,
      passedTests:  passed,
      totalTests:   total,
      xpAwarded,
      crAwarded,
      solutionViewed: cfg.solutionUnlocked,
      hintsUnlocked:  cfg.hintsUnlocked,
      timestamp:      new Date().toISOString(),
    };
    const updatedAttempts = [...allAttempts, newAttempt];
    await setDoc(attemptRef, {
      userId:       user.uid,
      problemId,
      attemptCount: attemptNumber,
      lastAttempt:  serverTimestamp(),
      solved:       allPassed,
      solvedOnAttempt: allPassed ? attemptNumber : null,
      attempts:     updatedAttempts,
    }, { merge: true });

    setAllAttempts(updatedAttempts);

    // ── Post to backend ──────────────────────────────────────────────────────
    try {
      const res = await axios.post(`${API_BASE}/problems/${problemId}/submit`, {
        userId:      user.uid,
        code,
        language:    langId,
        passed,
        total,
        allPassed,
        stars,
        hintsUsed:   cfg.hintsUnlocked,
        attemptNumber,
        xpMultiplier: cfg.xpMult,
        testResults: testResults.map(r => ({ label: r.label || '', passed: r.passed, time: r.time || null, memory: r.memory || null })),
      });

      const data = res.data || {};
      if (data.newXp !== undefined && typeof setUserData === 'function') {
        setUserData(prev => ({ ...prev, xp: data.newXp, credits: data.newCredits, level: data.newLevel }));
      }

      setResult({ allPassed, passed, total, xp: data.xpAwarded || xpAwarded, credits: data.creditsAwarded || crAwarded, stars });
      setPhase('result');

      return { passed: allPassed, passedCount: passed, total, xp: data.xpAwarded || xpAwarded, credits: data.creditsAwarded || crAwarded };
    } catch {
      setResult({ allPassed, passed, total, xp: xpAwarded, credits: crAwarded, stars });
      setPhase('result');
      return { passed: allPassed, passedCount: passed, total, xp: xpAwarded, credits: crAwarded };
    }
  }, [problemId, user?.uid, attemptNumber, allAttempts, problem]);

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setAttemptNumber(n => n + 1);
    setPhase('cinematic');
    setResult(null);
  }, []);

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'Arial, sans-serif' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ width: 36, height: 36, border: '3px solid #1e2a3a', borderTop: '3px solid #1a73e8', borderRadius: '50%' }} />
        <div style={{ color: '#555', fontSize: 13 }}>Loading mission briefing...</div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'Arial, sans-serif' }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ color: '#ff6b6b', fontSize: 15 }}>{error || 'Mission not found.'}</div>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: '1px solid #ff4d4d44', borderRadius: 10, color: '#ff6b6b', cursor: 'pointer', fontSize: 13, padding: '8px 20px' }}>← Go Back</button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">

      {/* ── Phase 1: Cinematic intro ── */}
      {phase === 'cinematic' && (
        <motion.div key="cinematic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <CinematicScene
            problem={problem}
            onReveal={() => setPhase('editor')}
            attemptNumber={attemptNumber}
            attemptConfig={attemptConfig}
          />
        </motion.div>
      )}

      {/* ── Phase 2: Code editor ── */}
      {phase === 'editor' && (
        <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100vh', position: 'relative' }}>
          <div style={{ marginRight: showSidePanel ? 320 : 0, height: '100%', transition: 'margin-right 0.3s' }}>
            <CodeEditor
              problem={problem}
              user={user}
              onSubmit={handleSubmit}
              onHintUsed={() => {}}
              defaultLanguage="python3"
            />
          </div>

          {/* Toggle side panel button */}
          <button
            onClick={() => setShowSidePanel(p => !p)}
            style={{ position: 'fixed', right: showSidePanel ? 330 : 8, top: '50%', transform: 'translateY(-50%)', background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 8, color: '#22d3ee', cursor: 'pointer', padding: '8px 6px', zIndex: 31, fontSize: 14, transition: 'right 0.3s' }}
          >
            {showSidePanel ? '→' : '←'}
          </button>

          {/* Side assist panel */}
          <AnimatePresence>
            {showSidePanel && (
              <SideAssistPanel
                key="side"
                problem={problem}
                attemptNumber={attemptNumber}
                attemptConfig={attemptConfig}
                onClose={() => setShowSidePanel(false)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Phase 3: Result ── */}
      {phase === 'result' && result && (
        <motion.div key="result-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100vh' }}>
          <div style={{ marginRight: showSidePanel ? 320 : 0, height: '100%' }}>
            <CodeEditor problem={problem} user={user} onSubmit={handleSubmit} defaultLanguage="python3" />
          </div>
          <ResultScreen
            problem={problem}
            result={result}
            attemptNumber={attemptNumber}
            allAttempts={allAttempts}
            onContinue={() => navigate(-1)}
            onRetry={handleRetry}
          />
        </motion.div>
      )}

    </AnimatePresence>
  );
}