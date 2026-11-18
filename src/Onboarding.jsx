import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
import {
  QUESTIONS, DEFAULTS, TOTAL_XP, fill, pick, buildContext, toResponses,
} from './onboardingQuestions';

// ─────────────────────────────────────────────────────────────────────────────
// EvoWorld onboarding: 17 questions, one per feature.
// Each answer flips a reveal card: what the feature is, why we asked, where it lives.
// Finishing calls POST /onboarding/complete, which saves the answers, grants
// +200 XP / +50 credits once, and returns an AI Life Role.
// ─────────────────────────────────────────────────────────────────────────────

const XP_PER_ANSWER = 10;
const STORAGE_KEY   = 'evo_onboarding_v2';

const C = {
  bg: '#0a0a14', card: '#0d1117', border: '#1e2a3a', text: '#e8e8e8',
  muted: '#888', dim: '#555', purple: '#a855f7', blue: '#1a73e8',
  green: '#00c896', gold: '#f5c542', red: '#ff6b6b',
};

const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; } };
const persist   = (s) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } };
const clearSaved = () => { try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ } };

const sectionLabel = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: C.dim, marginBottom: 10,
};

// ── Background ────────────────────────────────────────────────────────────────
function Background({ accentColor }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: C.bg, overflow: 'hidden', pointerEvents: 'none' }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.07, 0.13, 0.07] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', borderRadius: '50%', width: 500, height: 500,
          background: accentColor || C.purple, left: '10%', top: '10%',
          transform: 'translate(-50%,-50%)', filter: 'blur(100px)',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute', borderRadius: '50%', width: 400, height: 400,
          background: C.blue, right: '10%', bottom: '15%',
          transform: 'translate(50%,50%)', filter: 'blur(100px)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(#ffffff03 1px,transparent 1px),linear-gradient(90deg,#ffffff03 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
    </div>
  );
}

// ── Particle burst for role reveal ────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    angle: (i / 18) * 360,
    delay: i * 0.04,
    color: [C.purple, C.blue, C.green, C.gold, C.red][i % 5],
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: '50vw', y: '50vh', scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: `calc(50vw + ${Math.cos((p.angle * Math.PI) / 180) * 280}px)`,
            y: `calc(50vh + ${Math.sin((p.angle * Math.PI) / 180) * 280}px)`,
            scale: [0, 1.4, 0],
          }}
          transition={{ duration: 1.4, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute', width: 8, height: 8, borderRadius: '50%',
            background: p.color, boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ── "Where it lives" breadcrumb ───────────────────────────────────────────────
function WherePath({ path }) {
  const parts = path.split('→').map((p) => p.trim());
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          <span style={{
            background: '#00c89614', border: '1px solid #00c89640', borderRadius: 6,
            padding: '4px 8px', color: '#5eead4', fontSize: 12, fontWeight: 700,
          }}>
            {p}
          </span>
          {i < parts.length - 1 && <span style={{ color: C.dim }}>→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── XP counter (top bar) ──────────────────────────────────────────────────────
function XpCounter({ xp, pops }) {
  return (
    <div style={{
      position: 'relative', background: '#f5c5421a', border: '1px solid #f5c5424d',
      borderRadius: 999, padding: '4px 12px', color: C.gold, fontSize: 13, fontWeight: 800,
    }}>
      ⭐ {xp} XP
      <AnimatePresence>
        {pops.map(({ id, gained }) => (
          <motion.span
            key={id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ position: 'absolute', right: 0, top: -4, fontSize: 12, fontWeight: 800, color: C.gold }}
          >
            +{gained}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Stage: Intro ──────────────────────────────────────────────────────────────
function IntroStage({ onStart, onSkip, skipping, userName, resuming }) {
  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        style={{ fontSize: 64, marginBottom: 16 }}
      >
        📱
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{ fontSize: 36, fontWeight: 900, color: C.text, margin: '0 0 10px', letterSpacing: '-0.5px' }}
      >
        Welcome, {userName?.split(' ')[0] || 'Developer'}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ color: '#666', fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}
      >
        It's 2:47 AM and your phone just buzzed. Something broke.
        Answer {QUESTIONS.length} quick questions to find out what, and to unlock every secret of EvoWorld.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: '20px 28px', marginBottom: 28, textAlign: 'left',
        }}
      >
        {[
          { icon: '👆', text: `${QUESTIONS.length} tap-to-answer questions. No typing.` },
          { icon: '🔓', text: 'Every answer reveals a hidden feature and where to find it' },
          { icon: '🎭', text: 'AI reads your answers and assigns your Life Role' },
          { icon: '⭐', text: `+${TOTAL_XP} XP and +50 credits for finishing` },
        ].map((item, i, arr) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
              borderBottom: i < arr.length - 1 ? '1px solid #0f1923' : 'none',
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ color: C.muted, fontSize: 13 }}>{item.text}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        style={{
          width: '100%', background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
          border: 'none', borderRadius: 14, color: '#fff', cursor: 'pointer',
          fontSize: 15, fontWeight: 700, padding: '14px 0', boxShadow: '0 0 30px #a855f744',
        }}
      >
        {resuming ? '▶️ Continue where you left off' : '🚨 Answer the call'}
      </motion.button>

      <button
        onClick={onSkip}
        disabled={skipping}
        style={{
          marginTop: 14, background: 'none', border: 'none', color: C.dim,
          fontSize: 12, cursor: skipping ? 'not-allowed' : 'pointer',
        }}
      >
        {skipping ? 'Skipping…' : 'Skip intro and go straight to the world'}
      </button>
    </motion.div>
  );
}

// ── Stage: Questions ──────────────────────────────────────────────────────────
function QuestionsStage({
  q, index, total, phase, chosen, nextReady, ctx, xp, pops,
  onChoose, onNext, onSkip, skipping,
}) {
  const progress = ((index + (phase === 'reveal' ? 1 : 0)) / total) * 100;
  const isLast = index === total - 1;

  return (
    <motion.div
      key="questions"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 640, width: '100%' }}
    >
      {/* Top bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: C.dim, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {q.section} · {index + 1} / {total}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <XpCounter xp={xp} pops={pops} />
            <button
              onClick={onSkip}
              disabled={skipping}
              style={{ background: 'none', border: 'none', color: C.dim, fontSize: 12, cursor: 'pointer' }}
            >
              {skipping ? 'Skipping…' : 'Skip intro'}
            </button>
          </div>
        </div>
        <div style={{ width: '100%', height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ height: '100%', background: `linear-gradient(90deg, ${C.purple}, ${C.blue})`, borderRadius: 2 }}
          />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
            padding: '28px 28px 24px', boxShadow: '0 0 40px #a855f711',
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>{q.emoji}</div>
          <h2 style={{ color: C.text, fontSize: 21, fontWeight: 800, margin: '0 0 22px', lineHeight: 1.4 }}>
            {q.question}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {q.options.map((opt, i) => {
              const isChosen = chosen?.value === opt.value;
              const dimmed = phase === 'reveal' && !isChosen;
              return (
                <motion.button
                  key={opt.value}
                  onClick={() => onChoose(opt)}
                  disabled={phase !== 'question'}
                  whileHover={phase === 'question' ? { scale: 1.015 } : {}}
                  whileTap={phase === 'question' ? { scale: 0.98 } : {}}
                  animate={{ opacity: dimmed ? 0.35 : 1 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left',
                    background: isChosen ? '#a855f71a' : '#060910',
                    border: `1px solid ${isChosen ? C.purple : C.border}`,
                    borderRadius: 12, padding: '12px 16px', color: C.text,
                    cursor: phase === 'question' ? 'pointer' : 'default',
                    fontFamily: 'inherit', transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <span style={{
                    flexShrink: 0, width: 24, height: 24, marginTop: 1, borderRadius: 6,
                    border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 11, color: C.muted,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>{opt.label}</span>
                    {opt.sub && <span style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{opt.sub}</span>}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Reveal card */}
          <AnimatePresence>
            {phase === 'reveal' && chosen && (
              <motion.div
                initial={{ opacity: 0, rotateX: -80, y: 10 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  transformPerspective: 800, marginTop: 22, borderRadius: 16, padding: '20px 22px',
                  background: 'linear-gradient(180deg, #00c89614, #0d1117)',
                  border: '1px solid #00c8964d', boxShadow: '0 0 30px #00c89614',
                }}
              >
                <p style={{ color: C.text, fontSize: 15, fontWeight: 700, lineHeight: 1.6, margin: 0 }}>
                  {fill(pick(q.reveal, chosen.value), ctx)}
                </p>

                <p style={{ color: '#aaa', fontSize: 13, lineHeight: 1.6, margin: '14px 0 0' }}>
                  <span style={{ color: C.text, fontWeight: 700 }}>💡 Why we asked: </span>
                  {fill(pick(q.why, chosen.value), ctx)}
                </p>

                <div style={{ marginTop: 16 }}>
                  <div style={sectionLabel}>📍 Where it lives</div>
                  <WherePath path={fill(pick(q.where, chosen.value), ctx)} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, minHeight: 40 }}>
                  <AnimatePresence>
                    {nextReady && (
                      <motion.button
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onNext}
                        style={{
                          background: isLast
                            ? `linear-gradient(135deg, ${C.gold}, ${C.red})`
                            : `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
                          border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
                          fontSize: 14, fontWeight: 800, padding: '10px 22px',
                          boxShadow: isLast ? '0 0 20px #f5c54233' : '0 0 20px #a855f733',
                        }}
                      >
                        {isLast ? '✨ Reveal My Role' : 'Next →'}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ── Stage: Analyzing (waiting for the backend) ────────────────────────────────
function AnalyzingStage({ error, onRetry }) {
  return (
    <motion.div
      key="analyzing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}
    >
      {!error ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: 56, display: 'inline-block', marginBottom: 18 }}
          >
            🎭
          </motion.div>
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ color: '#aaa', fontSize: 15, lineHeight: 1.6, margin: 0 }}
          >
            Reading your {QUESTIONS.length} answers to figure out what kind of engineer you are…
          </motion.p>
        </>
      ) : (
        <>
          <div style={{ fontSize: 48, marginBottom: 14 }}>📡</div>
          <p style={{ color: C.red, fontSize: 14, margin: '0 0 6px' }}>Couldn't save your answers just now.</p>
          <p style={{ color: C.dim, fontSize: 13, margin: '0 0 20px' }}>They're kept on this device, so nothing is lost.</p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onRetry}
            style={{
              background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`, border: 'none',
              borderRadius: 12, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '12px 28px',
            }}
          >
            Try again
          </motion.button>
        </>
      )}
    </motion.div>
  );
}

// ── Stage: Role reveal ────────────────────────────────────────────────────────
function RoleRevealStage({ roleData, reward, xp, ctx, onEnter }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      key="role"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}
    >
      <Particles />

      {/* Reward */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ color: C.gold, fontSize: 15, fontWeight: 800, marginBottom: 6 }}
      >
        ⭐ +{reward?.xp ?? xp} XP{reward?.credits ? `   🪙 +${reward.credits} credits` : ''}
      </motion.div>
      <div style={{ color: C.dim, fontSize: 12, marginBottom: 22 }}>
        You are now officially more prepared than you were 3 minutes ago.
      </div>

      <div style={{ ...sectionLabel, marginBottom: 6 }}>🎭 Your Life Role</div>

      {/* Role title, cinematic entrance */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.3 }}
        onAnimationComplete={() => setRevealed(true)}
        style={{ marginBottom: 8 }}
      >
        <motion.div
          animate={{ textShadow: revealed ? ['0 0 20px #a855f7', '0 0 60px #a855f7', '0 0 20px #a855f7'] : '0 0 0px transparent' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            fontSize: 48, fontWeight: 900, letterSpacing: '-1px',
            background: `linear-gradient(135deg, ${C.purple}, ${C.blue}, ${C.green})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.1, marginBottom: 12,
          }}
        >
          {roleData.primaryRole}
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={{ color: C.muted, fontSize: 15, margin: '0 0 24px', lineHeight: 1.6 }}
      >
        {roleData.roleDescription}
      </motion.p>

      {/* Details card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        style={{
          background: C.card, border: '1px solid #a855f733', borderRadius: 18,
          padding: '24px 28px', marginBottom: 16, textAlign: 'left', boxShadow: '0 0 40px #a855f711',
        }}
      >
        {roleData.traits?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>🎯 Traits</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {roleData.traits.map((trait, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 + i * 0.07 }}
                  style={{
                    background: '#a855f711', border: '1px solid #a855f744', borderRadius: 20,
                    padding: '4px 14px', color: C.purple, fontSize: 12, fontWeight: 600,
                  }}
                >
                  {trait}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {roleData.strengths?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>💪 Strengths</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roleData.strengths.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.08 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                >
                  <span style={{ color: C.green, fontSize: 14, marginTop: 1 }}>✓</span>
                  <span style={{ color: '#c8c8c8', fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {roleData.reasoning && (
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>🧠 Why This Role</div>
            <p style={{ color: '#777', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{roleData.reasoning}</p>
          </div>
        )}

        <div>
          <div style={sectionLabel}>📍 Where it lives</div>
          <WherePath path="Profile → Life Role" />
        </div>
      </motion.div>

      {/* First mission */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
          padding: '20px 28px', marginBottom: 24, textAlign: 'left',
        }}
      >
        <div style={sectionLabel}>🚨 Your first mission</div>
        <div style={{ color: C.text, fontSize: 17, fontWeight: 800, marginBottom: 10 }}>{ctx.districtFull}</div>
        <WherePath path={`Engineer's Odyssey → ${ctx.districtFull} → Mission 1`} />
        <p style={{ color: C.dim, fontSize: 12, margin: '14px 0 0' }}>
          Remember what you broke at 2:47 AM? This is where you fix it.
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onEnter}
        style={{
          width: '100%', background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
          border: 'none', borderRadius: 14, color: '#fff', cursor: 'pointer',
          fontSize: 16, fontWeight: 800, padding: '16px 0', boxShadow: '0 0 40px #a855f755', letterSpacing: '0.02em',
        }}
      >
        🌍 Enter The World →
      </motion.button>
    </motion.div>
  );
}

// ── Main Onboarding Component ─────────────────────────────────────────────────
const Onboarding = ({ user, onComplete }) => {
  const navigate = useNavigate();
  const saved = useMemo(loadSaved, []);

  const [stage,     setStage]     = useState('intro');           // intro | questions | analyzing | role
  const [index,     setIndex]     = useState(saved?.index ?? 0);
  const [answers,   setAnswers]   = useState(saved?.answers ?? {});
  const [xp,        setXp]        = useState(saved?.xp ?? 0);
  const [phase,     setPhase]     = useState('question');        // question | reveal
  const [chosen,    setChosen]    = useState(null);
  const [nextReady, setNextReady] = useState(false);
  const [pops,      setPops]      = useState([]);
  const [roleData,  setRoleData]  = useState(null);
  const [reward,    setReward]    = useState(null);
  const [error,     setError]     = useState('');
  const [skipping,  setSkipping]  = useState(false);

  const total = QUESTIONS.length;
  const q = QUESTIONS[index];
  const ctx = buildContext(answers);
  const resuming = (saved?.index ?? 0) > 0 || Object.keys(saved?.answers ?? {}).length > 0;

  useEffect(() => { persist({ index, answers, xp }); }, [index, answers, xp]);

  // Next button appears shortly after the reveal, so people actually read it.
  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    setNextReady(false);
    const t = setTimeout(() => setNextReady(true), 900);
    return () => clearTimeout(t);
  }, [phase, index]);

  const prep = useCallback(() => ({
    goal:       answers.goal       ?? DEFAULTS.goal,
    difficulty: answers.difficulty ?? DEFAULTS.difficulty,
    commMode:   answers.commMode   ?? DEFAULTS.commMode,
  }), [answers]);

  // ── Pick an answer ──
  const handleChoose = useCallback((opt) => {
    if (phase !== 'question') return;
    setAnswers((a) => ({ ...a, [q.saves || q.id]: opt.value }));
    setChosen(opt);
    const gained = q.xp ?? XP_PER_ANSWER;
    setXp((x) => x + gained);
    const id = Date.now();
    setPops((p) => [...p, { id, gained }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1200);
    setPhase('reveal');
  }, [phase, q]);

  // ── Save everything and get the Life Role ──
  const submit = useCallback(async () => {
    setStage('analyzing');
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/onboarding/complete`, {
        uid:       user?.uid,
        name:      user?.displayName || undefined,
        ...prep(),
        responses: toResponses(answers),
      });
      setRoleData(res.data.roleAnalysis);
      setReward(res.data.reward);
      clearSaved();
      setStage('role');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save your answers. Please try again.');
    }
  }, [user, prep, answers]);

  // ── Next question / finish ──
  const handleNext = useCallback(() => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setChosen(null);
      setPhase('question');
    } else {
      submit();
    }
  }, [index, total, submit]);

  // ── Skip ──
  const handleSkip = async () => {
    if (skipping) return;
    setSkipping(true);
    let skippedRole = null;
    try {
      // Only send what the user actually picked before skipping.
      const res = await axios.post(`${API_BASE}/onboarding/skip`, {
        uid:        user?.uid,
        goal:       answers.goal,
        difficulty: answers.difficulty,
        commMode:   answers.commMode,
      });
      const lr = res.data?.user?.lifeRole;
      if (lr) {
        skippedRole = {
          primaryRole: lr.primary, roleDescription: lr.description,
          traits: lr.traits, strengths: lr.strengths, reasoning: lr.reasoning,
        };
      }
    } catch (err) {
      console.error('Onboarding skip failed:', err);
    }
    clearSaved();
    if (onComplete) onComplete(skippedRole);
    navigate('/world', { state: { startGoal: answers.goal ?? DEFAULTS.goal } });
  };

  const handleEnterWorld = () => {
    if (onComplete) onComplete(roleData);
    navigate('/world', { state: { startGoal: prep().goal } });
  };

  // Keyboard: 1-5 picks an option, Enter goes next.
  useEffect(() => {
    if (stage !== 'questions') return undefined;
    const onKey = (e) => {
      if (phase === 'question') {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= q.options.length) handleChoose(q.options[n - 1]);
      } else if (phase === 'reveal' && nextReady && e.key === 'Enter') {
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, phase, q, nextReady, handleChoose, handleNext]);

  const accentColor = stage === 'role' ? C.purple : stage === 'questions' ? C.blue : C.purple;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Arial, sans-serif', position: 'relative',
    }}>
      <Background accentColor={accentColor} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {stage === 'intro' && (
            <IntroStage
              key="intro"
              onStart={() => setStage('questions')}
              onSkip={handleSkip}
              skipping={skipping}
              userName={user?.displayName}
              resuming={resuming}
            />
          )}
          {stage === 'questions' && (
            <QuestionsStage
              key="questions"
              q={q}
              index={index}
              total={total}
              phase={phase}
              chosen={chosen}
              nextReady={nextReady}
              ctx={ctx}
              xp={xp}
              pops={pops}
              onChoose={handleChoose}
              onNext={handleNext}
              onSkip={handleSkip}
              skipping={skipping}
            />
          )}
          {stage === 'analyzing' && (
            <AnalyzingStage key="analyzing" error={error} onRetry={submit} />
          )}
          {stage === 'role' && roleData && (
            <RoleRevealStage
              key="role"
              roleData={roleData}
              reward={reward}
              xp={xp}
              ctx={ctx}
              onEnter={handleEnterWorld}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default Onboarding;
