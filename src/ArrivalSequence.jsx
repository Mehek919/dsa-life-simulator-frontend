import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

/**
 * ArrivalSequence.jsx
 *
 * The cinematic onsite experience that plays between "Start Interview" and
 * the actual interview phase. Makes the user feel like they physically
 * walked into the company building and sat down across from a real person.
 *
 * Stages: arrival lobby, waiting, interviewer entrance, small talk, handoff.
 *
 * Usage in Mockinterview.jsx:
 *   1. Add a new phase value 'arrival' between 'select' and 'interview'
 *   2. In startInterview(), replace setPhase('interview') with setPhase('arrival')
 *      and stash the session in state as you already do
 *   3. Render:
 *      {phase === 'arrival' && (
 *        <ArrivalSequence
 *          company={company}
 *          config={CONFIGS[company] || CONFIGS.general}
 *          interviewType={session?.interviewType}
 *          userName={userData?.displayName || user?.displayName || 'Candidate'}
 *          onEnterInterview={() => setPhase('interview')}
 *        />
 *      )}
 */

// Company-specific environment theming
const ENVIRONMENTS = {
  google: {
    buildingName: 'Googleplex, Building 43',
    lobbyLine: 'Mountain View, California',
    wallColor: '#4285f4',
    accentColor: '#fbbc05',
    ambience: 'Open atrium. Bikes parked inside. Someone rolls past on a scooter.',
    receptionist: 'Dana',
    badgeStyle: 'GUEST',
  },
  amazon: {
    buildingName: 'Amazon Day 1 Tower',
    lobbyLine: 'Seattle, Washington',
    wallColor: '#ff9900',
    accentColor: '#232f3e',
    ambience: 'Glass everywhere. The Spheres visible through the window. Dogs in the lobby.',
    receptionist: 'Marcus',
    badgeStyle: 'VISITOR',
  },
  meta: {
    buildingName: 'Meta MPK 21',
    lobbyLine: 'Menlo Park, California',
    wallColor: '#0081fb',
    accentColor: '#00c6ff',
    ambience: 'A living roof garden above. Murals on every wall. Very quiet keyboards.',
    receptionist: 'Sofia',
    badgeStyle: 'GUEST',
  },
  microsoft: {
    buildingName: 'Microsoft Building 92',
    lobbyLine: 'Redmond, Washington',
    wallColor: '#00a4ef',
    accentColor: '#7fba00',
    ambience: 'Rain on the windows. A wall of Xbox history behind reception.',
    receptionist: 'Priya',
    badgeStyle: 'VISITOR',
  },
  apple: {
    buildingName: 'Apple Park',
    lobbyLine: 'Cupertino, California',
    wallColor: '#a2aaad',
    accentColor: '#f5f5f7',
    ambience: 'Curved glass. Absolute silence. Everything is exactly aligned.',
    receptionist: 'James',
    badgeStyle: 'GUEST',
  },
  general: {
    buildingName: 'TechCorp HQ, Tower B',
    lobbyLine: 'Floor 14, Engineering',
    wallColor: '#a855f7',
    accentColor: '#22d3ee',
    ambience: 'Standard startup lobby. Cold brew on tap. A wall of team photos.',
    receptionist: 'Alex',
    badgeStyle: 'INTERVIEW',
  },
};

// Interviewer personas keyed by interview type. Each persists through the session.
const INTERVIEWERS = {
  coding: {
    name: 'Priya Sharma',
    role: 'Senior Software Engineer',
    avatar: '👩🏽‍💻',
    style: 'quiet, watches your screen closely, asks short precise questions',
    entranceLine: (userName) =>
      `${userName}? Hi, I'm Priya. I'll be doing your coding round today. Come on in.`,
    smallTalk: [
      `Find the building alright? Parking here is honestly the hardest interview question.`,
      `Can I get you some water or coffee before we start?`,
    ],
    transitionLine: `Alright. Let's pull up a problem and see how you think.`,
  },
  'system-design': {
    name: 'David Chen',
    role: 'Staff Engineer, Infrastructure',
    avatar: '👨🏻‍💼',
    style: 'skeptical, pushes on tradeoffs, long pauses before responding',
    entranceLine: (userName) =>
      `${userName}, right? David. I run the infra team here. Let's grab this room.`,
    smallTalk: [
      `You been through one of these design rounds before? They can go a lot of directions.`,
      `I like to keep these conversational. Push back on me if you disagree with something.`,
    ],
    transitionLine: `Okay. Let me give you a system to design, and we'll go from there.`,
  },
  behavioral: {
    name: 'Rachel Okafor',
    role: 'Engineering Manager',
    avatar: '👩🏿‍💼',
    style: 'warm but probing, calls out vague answers, takes notes constantly',
    entranceLine: (userName) =>
      `Hi ${userName}! Rachel, I manage one of the platform teams. So glad we could set this up.`,
    smallTalk: [
      `How's your day going so far? I know these interview loops can be a marathon.`,
      `I'll mostly be asking about your past experience today, real situations, real decisions.`,
    ],
    transitionLine: `Let's dive in. Tell me about yourself, and then I'll dig into a few specifics.`,
  },
  default: {
    name: 'Sam Rivera',
    role: 'Senior Engineer',
    avatar: '🧑🏼‍💻',
    style: 'balanced, professional, occasionally checks their notes',
    entranceLine: (userName) =>
      `${userName}? Hey, I'm Sam. I'll be your interviewer today. Right this way.`,
    smallTalk: [
      `Did you come far to get here? Traffic's been rough all week.`,
      `We've got the room for the full hour, so no need to rush anything.`,
    ],
    transitionLine: `Alright, let's get into it.`,
  },
};

// Speak a line using browser TTS. Falls back silently if unsupported.
function speak(text, onEnd) {
  try {
    if (!window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) u.voice = preferred;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  } catch { onEnd?.(); }
}

// Ambient office sound via Web Audio API. Subtle brown noise bed so the
// room never feels dead silent. Cheap, no audio files needed.
function useAmbience(enabled) {
  const ctxRef = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 2.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.012;
      src.connect(gain).connect(ctx.destination);
      src.start();
      ctxRef.current = ctx;
    } catch { /* no audio, fine */ }
    return () => { ctxRef.current?.close?.(); };
  }, [enabled]);
}

const STAGES = ['lobby', 'waiting', 'entrance', 'smalltalk', 'transition'];

export default function ArrivalSequence({
  company = 'general',
  config = {},
  interviewType = 'coding',
  userName = 'Candidate',
  sessionId = null,
  onEnterInterview,
}) {
  const env = ENVIRONMENTS[company] || ENVIRONMENTS.general;
  const interviewer = INTERVIEWERS[interviewType] || INTERVIEWERS.default;

  const [stage, setStage] = useState('lobby');
  const [receptionDone, setReceptionDone] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [talkIdx, setTalkIdx] = useState(0);
  const [userReply, setUserReply] = useState('');
  const [aiReplies, setAiReplies] = useState([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const [skippable, setSkippable] = useState(false);
  const [muted, setMuted] = useState(false);

  useAmbience(!muted && stage !== 'transition');

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  // Lobby: receptionist greets, then move to waiting
  useEffect(() => {
    if (stage !== 'lobby') return;
    const line = `Hi, welcome to ${config.company || 'the office'}. You must be ${userName}, here for the ${timeStr} interview. I'll let them know you're here. Please take a seat.`;
    const t = setTimeout(() => {
      if (!muted) speak(line, () => setReceptionDone(true));
      else setReceptionDone(true);
    }, 1400);
    return () => clearTimeout(t);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage === 'lobby' && receptionDone) {
      const t = setTimeout(() => setStage('waiting'), 1600);
      return () => clearTimeout(t);
    }
  }, [stage, receptionDone]);

  // Waiting: tick a timer, allow skip after 8s, auto-advance after 22s
  useEffect(() => {
    if (stage !== 'waiting') return;
    const iv = setInterval(() => setWaitSeconds(s => s + 1), 1000);
    const skipT = setTimeout(() => setSkippable(true), 8000);
    const autoT = setTimeout(() => setStage('entrance'), 22000);
    return () => { clearInterval(iv); clearTimeout(skipT); clearTimeout(autoT); };
  }, [stage]);

  // Entrance: interviewer speaks their entrance line, then small talk
  useEffect(() => {
    if (stage !== 'entrance') return;
    const line = interviewer.entranceLine(userName);
    const t = setTimeout(() => {
      if (!muted) speak(line, () => setTimeout(() => setStage('smalltalk'), 900));
      else setTimeout(() => setStage('smalltalk'), 2500);
    }, 1200);
    return () => clearTimeout(t);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Small talk: speak current line when index changes
  useEffect(() => {
    if (stage !== 'smalltalk') return;
    const line = interviewer.smallTalk[talkIdx];
    if (line && !muted) speak(line);
  }, [stage, talkIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optional: send user's small-talk reply to the AI so the interviewer
  // responds naturally instead of ignoring them. Uses the existing chat
  // endpoint if a sessionId is available, otherwise a canned warm response.
  const sendReply = useCallback(async () => {
    const text = userReply.trim();
    if (!text) return;
    setUserReply('');
    setReplyLoading(true);

    let response = null;
    if (sessionId) {
      try {
        const res = await axios.post(`${API_BASE}/mock-interview/${sessionId}/ai-question`, {
          context: 'smalltalk',
          persona: `${interviewer.name}, ${interviewer.role}, ${interviewer.style}`,
          userMessage: text,
        });
        response = res.data?.reply || res.data?.question || null;
      } catch { /* fall through to canned */ }
    }
    if (!response) {
      const canned = [
        `Ha, fair enough. Alright.`,
        `Good to hear. I appreciate you making the time.`,
        `Nice. Okay, I think we're all set here.`,
      ];
      response = canned[Math.min(talkIdx, canned.length - 1)];
    }

    setAiReplies(prev => [...prev, { user: text, ai: response }]);
    setReplyLoading(false);
    if (!muted) speak(response);
  }, [userReply, sessionId, talkIdx, muted, interviewer]);

  const advanceSmallTalk = () => {
    if (talkIdx < interviewer.smallTalk.length - 1) {
      setTalkIdx(i => i + 1);
    } else {
      setStage('transition');
    }
  };

  // Transition: interviewer says the handoff line, then we enter the interview
  useEffect(() => {
    if (stage !== 'transition') return;
    const done = () => setTimeout(() => onEnterInterview?.(), 700);
    if (!muted) speak(interviewer.transitionLine, done);
    else setTimeout(done, 2200);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipAll = () => {
    window.speechSynthesis?.cancel?.();
    onEnterInterview?.();
  };

  // Shared style tokens
  const S = {
    screen: {
      position: 'fixed', inset: 0, zIndex: 500,
      background: '#06060d',
      fontFamily: 'Arial, sans-serif',
      color: '#e8e8e8',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
  };

  return (
    <div style={S.screen}>
      {/* ambient wall glow tinted by company color */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '15%', top: '10%', width: 500, height: 500, borderRadius: '50%', background: env.wallColor, filter: 'blur(160px)', opacity: 0.07 }} />
        <div style={{ position: 'absolute', right: '10%', bottom: '15%', width: 400, height: 400, borderRadius: '50%', background: env.accentColor, filter: 'blur(140px)', opacity: 0.05 }} />
      </div>

      {/* controls */}
      <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', gap: 10, zIndex: 10 }}>
        <button onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel?.(); }}
          style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: 12, padding: '6px 12px' }}>
          {muted ? '🔇 Unmute' : '🔊 Sound on'}
        </button>
        <button onClick={skipAll}
          style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 8, color: '#666', cursor: 'pointer', fontSize: 12, padding: '6px 12px' }}>
          Skip to interview →
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ── STAGE: LOBBY ─────────────────────────────────────────── */}
        {stage === 'lobby' && (
          <motion.div key="lobby"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 1.1 }}
            style={{ textAlign: 'center', maxWidth: 640, padding: 24 }}>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              style={{ color: '#555', fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10 }}>
              {dateStr} · {timeStr}
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              style={{ margin: 0, fontSize: 34, fontWeight: 900, color: '#fff' }}>
              {config.logo} {env.buildingName}
            </motion.h1>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
              style={{ color: env.wallColor, fontSize: 14, marginTop: 6, fontWeight: 700 }}>
              {env.lobbyLine}
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
              style={{ color: '#666', fontSize: 13, marginTop: 24, lineHeight: 1.7, fontStyle: 'italic' }}>
              {env.ambience}
            </motion.p>

            {/* receptionist bubble */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 }}
              style={{
                marginTop: 36, background: '#0d1117', border: '1px solid #1e2a3a',
                borderRadius: 16, padding: '18px 22px', textAlign: 'left',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
              <div style={{ fontSize: 30 }}>💁</div>
              <div>
                <div style={{ color: env.wallColor, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  {env.receptionist} · Front Desk
                </div>
                <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6 }}>
                  Hi, welcome to {config.company}. You must be <strong style={{ color: '#fff' }}>{userName}</strong>, here
                  for the {timeStr} interview. I'll let them know you're here. Please take a seat.
                </div>
              </div>
            </motion.div>

            {/* visitor badge */}
            <motion.div
              initial={{ opacity: 0, rotate: -6, y: 30 }} animate={{ opacity: 1, rotate: -2, y: 0 }}
              transition={{ delay: 3.0, type: 'spring', stiffness: 120 }}
              style={{
                margin: '30px auto 0', width: 220, background: '#fff', color: '#111',
                borderRadius: 12, padding: '14px 16px', textAlign: 'left',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', color: env.wallColor }}>
                {env.badgeStyle}
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, marginTop: 6 }}>{userName}</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{dateStr}</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 8, borderTop: '1px solid #eee', paddingTop: 6 }}>
                {config.company} · Escort required
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── STAGE: WAITING ───────────────────────────────────────── */}
        {stage === 'waiting' && (
          <motion.div key="waiting"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            style={{ textAlign: 'center', maxWidth: 560, padding: 24 }}>

            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity }}
              style={{ fontSize: 40, marginBottom: 20 }}>
              🪑
            </motion.div>

            <div style={{ color: '#888', fontSize: 15, lineHeight: 1.8 }}>
              You take a seat. Somewhere down the hall, a door closes.<br />
              A keyboard clatters. Someone laughs in a meeting room.
            </div>

            {/* schedule card */}
            <div style={{
              margin: '30px auto 0', maxWidth: 420, background: '#0d1117',
              border: '1px solid #1e2a3a', borderRadius: 14, padding: 18, textAlign: 'left',
            }}>
              <div style={{ color: '#555', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
                Today's schedule
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #14141f' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    {interviewer.role.includes('Manager') ? 'Behavioral Round' : 'Technical Round'}
                  </div>
                  <div style={{ color: '#666', fontSize: 11 }}>{interviewer.name} · {interviewer.role}</div>
                </div>
                <div style={{ color: env.wallColor, fontSize: 11, fontWeight: 700 }}>{timeStr}</div>
              </div>
              <div style={{ color: '#444', fontSize: 11, marginTop: 10 }}>
                Waiting {waitSeconds}s · they'll come get you shortly
              </div>
            </div>

            {skippable && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => setStage('entrance')}
                style={{
                  marginTop: 24, background: 'transparent', border: '1px solid #1e2a3a',
                  borderRadius: 10, color: '#666', cursor: 'pointer', fontSize: 12, padding: '8px 18px',
                }}>
                I'm ready, skip the wait
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ── STAGE: ENTRANCE ──────────────────────────────────────── */}
        {stage === 'entrance' && (
          <motion.div key="entrance"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', maxWidth: 560, padding: 24 }}>

            <motion.div
              initial={{ x: -200, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 60, delay: 0.5 }}
              style={{ fontSize: 72, marginBottom: 16 }}>
              {interviewer.avatar}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 900 }}>{interviewer.name}</div>
              <div style={{ color: env.wallColor, fontSize: 13, fontWeight: 700, marginTop: 4 }}>{interviewer.role}</div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
              style={{
                marginTop: 26, background: '#0d1117', border: '1px solid #1e2a3a',
                borderRadius: 16, padding: '16px 22px', color: '#ddd', fontSize: 15, lineHeight: 1.6,
              }}>
              "{interviewer.entranceLine(userName)}"
            </motion.div>
          </motion.div>
        )}

        {/* ── STAGE: SMALL TALK ────────────────────────────────────── */}
        {stage === 'smalltalk' && (
          <motion.div key="smalltalk"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ width: '100%', maxWidth: 640, padding: 24 }}>

            {/* the room: interviewer across the table */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 56 }}>{interviewer.avatar}</div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 6 }}>{interviewer.name}</div>
              <div style={{ color: '#555', fontSize: 11 }}>{interviewer.role}</div>
            </div>

            {/* their current line */}
            <motion.div key={talkIdx}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#0d1117', border: `1px solid ${env.wallColor}33`,
                borderRadius: 16, padding: '16px 22px', color: '#ddd', fontSize: 15, lineHeight: 1.6,
              }}>
              "{interviewer.smallTalk[talkIdx]}"
            </motion.div>

            {/* previous exchanges */}
            {aiReplies.map((ex, i) => (
              <div key={i} style={{ marginTop: 12, fontSize: 13 }}>
                <div style={{ color: '#888', textAlign: 'right', marginBottom: 4 }}>You: {ex.user}</div>
                <div style={{ color: '#bbb' }}>{interviewer.name.split(' ')[0]}: {ex.ai}</div>
              </div>
            ))}

            {/* reply box: optional, user can also just continue */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <input
                value={userReply}
                onChange={e => setUserReply(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendReply()}
                placeholder="Say something back (optional)..."
                style={{
                  flex: 1, background: '#0d1117', border: '1px solid #1e2a3a',
                  borderRadius: 10, color: '#e8e8e8', fontSize: 13, padding: '10px 14px', outline: 'none',
                }}
              />
              <button onClick={sendReply} disabled={replyLoading || !userReply.trim()}
                style={{
                  background: '#1e2a3a', border: 'none', borderRadius: 10, color: '#ccc',
                  cursor: 'pointer', fontSize: 13, padding: '10px 16px',
                  opacity: replyLoading || !userReply.trim() ? 0.5 : 1,
                }}>
                {replyLoading ? '...' : 'Reply'}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 22 }}>
              <button onClick={advanceSmallTalk}
                style={{
                  background: `linear-gradient(135deg, ${env.wallColor}, ${env.wallColor}bb)`,
                  border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, padding: '11px 28px',
                  boxShadow: `0 6px 24px ${env.wallColor}44`,
                }}>
                {talkIdx < interviewer.smallTalk.length - 1 ? 'Continue' : "I'm ready, let's start"}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STAGE: TRANSITION ────────────────────────────────────── */}
        {stage === 'transition' && (
          <motion.div key="transition"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', maxWidth: 520, padding: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 18 }}>{interviewer.avatar}</div>
            <div style={{ color: '#ddd', fontSize: 17, fontStyle: 'italic', lineHeight: 1.6 }}>
              "{interviewer.transitionLine}"
            </div>
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ color: '#555', fontSize: 12, marginTop: 26 }}>
              They slide a laptop across the table toward you...
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}