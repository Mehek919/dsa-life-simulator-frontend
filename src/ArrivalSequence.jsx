import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

/**
 * ArrivalSequence.jsx
 *
 * The full physical-arrival experience between "Start Interview" and the
 * actual interview phase. Stage order:
 *
 *   exterior -> lobby -> waiting -> walk -> entrance -> smalltalk -> transition
 *
 * IMPORTANT: every stage advances on a guaranteed setTimeout, never gated on
 * speech synthesis finishing. Speech plays alongside the visuals as a bonus
 * layer, if it fails silently (missing voices, browser blocks it, etc) the
 * sequence still progresses at a natural pace.
 */

const ENVIRONMENTS = {
  google: {
    buildingName: 'Googleplex, Building 43',
    lobbyLine: 'Mountain View, California',
    wallColor: '#4285f4',
    accentColor: '#fbbc05',
    ambience: 'Open atrium. Bikes parked inside. Someone rolls past on a scooter.',
    receptionist: 'Dana',
    badgeStyle: 'GUEST',
    floors: 8,
  },
  amazon: {
    buildingName: 'Amazon Day 1 Tower',
    lobbyLine: 'Seattle, Washington',
    wallColor: '#ff9900',
    accentColor: '#232f3e',
    ambience: 'Glass everywhere. The Spheres visible through the window. Dogs in the lobby.',
    receptionist: 'Marcus',
    badgeStyle: 'VISITOR',
    floors: 12,
  },
  meta: {
    buildingName: 'Meta MPK 21',
    lobbyLine: 'Menlo Park, California',
    wallColor: '#0081fb',
    accentColor: '#00c6ff',
    ambience: 'A living roof garden above. Murals on every wall. Very quiet keyboards.',
    receptionist: 'Sofia',
    badgeStyle: 'GUEST',
    floors: 4,
  },
  microsoft: {
    buildingName: 'Microsoft Building 92',
    lobbyLine: 'Redmond, Washington',
    wallColor: '#00a4ef',
    accentColor: '#7fba00',
    ambience: 'Rain on the windows. A wall of Xbox history behind reception.',
    receptionist: 'Priya',
    badgeStyle: 'VISITOR',
    floors: 6,
  },
  apple: {
    buildingName: 'Apple Park',
    lobbyLine: 'Cupertino, California',
    wallColor: '#a2aaad',
    accentColor: '#f5f5f7',
    ambience: 'Curved glass. Absolute silence. Everything is exactly aligned.',
    receptionist: 'James',
    badgeStyle: 'GUEST',
    floors: 4,
  },
  general: {
    buildingName: 'TechCorp HQ, Tower B',
    lobbyLine: 'Floor 14, Engineering',
    wallColor: '#a855f7',
    accentColor: '#22d3ee',
    ambience: 'Standard startup lobby. Cold brew on tap. A wall of team photos.',
    receptionist: 'Alex',
    badgeStyle: 'INTERVIEW',
    floors: 14,
  },
};

const INTERVIEWERS = {
  coding: {
    name: 'Priya Sharma',
    role: 'Senior Software Engineer',
    avatar: '👩🏽‍💻',
    floor: 6,
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
    floor: 9,
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
    floor: 3,
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
    floor: 5,
    entranceLine: (userName) =>
      `${userName}? Hey, I'm Sam. I'll be your interviewer today. Right this way.`,
    smallTalk: [
      `Did you come far to get here? Traffic's been rough all week.`,
      `We've got the room for the full hour, so no need to rush anything.`,
    ],
    transitionLine: `Alright, let's get into it.`,
  },
};

function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) u.voice = preferred;
    window.speechSynthesis.speak(u);
  } catch { /* speech is a bonus layer, never block on it */ }
}

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
    } catch { /* fine without it */ }
    return () => { ctxRef.current?.close?.(); };
  }, [enabled]);
}

// Footstep tick sound for the hallway-walk stage, generated, no audio files.
function playFootsteps(ctx, count = 6, gap = 420) {
  if (!ctx) return;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 90 + Math.random() * 20;
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } catch { /* skip */ }
    }, i * gap);
  }
}

// Timed durations per stage (ms). This is the actual pacing contract, stages
// advance on these timers no matter what speech/animation does internally.
const DURATIONS = {
  exterior: 4200,
  lobby: 6500,
  waiting: 9000,   // can be skipped early by user after SKIP_UNLOCK_AT
  walk: 4600,
  entrance: 4200,
};
const SKIP_UNLOCK_AT = 4000;

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

  const [stage, setStage] = useState('exterior');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [skippable, setSkippable] = useState(false);
  const [talkIdx, setTalkIdx] = useState(0);
  const [userReply, setUserReply] = useState('');
  const [aiReplies, setAiReplies] = useState([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef(null);

  useAmbience(!muted && stage !== 'transition');

  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch { /* skip */ }
    return () => { audioCtxRef.current?.close?.(); };
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  // ── Guaranteed stage progression, decoupled from speech ──────────────────
  useEffect(() => {
    if (stage === 'exterior') {
      const t = setTimeout(() => setStage('lobby'), DURATIONS.exterior);
      return () => clearTimeout(t);
    }
    if (stage === 'lobby') {
      const speakT = setTimeout(() => {
        if (!muted) speak(`Hi, welcome to ${config.company || 'the office'}. You must be ${userName}, here for the ${timeStr} interview. I'll let them know you're here. Please take a seat.`);
      }, 900);
      const advT = setTimeout(() => setStage('waiting'), DURATIONS.lobby);
      return () => { clearTimeout(speakT); clearTimeout(advT); };
    }
    if (stage === 'waiting') {
      const iv = setInterval(() => setWaitSeconds(s => s + 1), 1000);
      const skipT = setTimeout(() => setSkippable(true), SKIP_UNLOCK_AT);
      const advT = setTimeout(() => setStage('walk'), DURATIONS.waiting);
      return () => { clearInterval(iv); clearTimeout(skipT); clearTimeout(advT); };
    }
    if (stage === 'walk') {
      playFootsteps(audioCtxRef.current, 8, DURATIONS.walk / 9);
      const advT = setTimeout(() => setStage('entrance'), DURATIONS.walk);
      return () => clearTimeout(advT);
    }
    if (stage === 'entrance') {
      const speakT = setTimeout(() => {
        if (!muted) speak(interviewer.entranceLine(userName));
      }, 900);
      const advT = setTimeout(() => setStage('smalltalk'), DURATIONS.entrance);
      return () => { clearTimeout(speakT); clearTimeout(advT); };
    }
    if (stage === 'smalltalk') {
      const line = interviewer.smallTalk[talkIdx];
      if (line && !muted) speak(line);
      return;
    }
    if (stage === 'transition') {
      if (!muted) speak(interviewer.transitionLine);
      const t = setTimeout(() => onEnterInterview?.(), 2600);
      return () => clearTimeout(t);
    }
  }, [stage, talkIdx]); // eslint-disable-line react-hooks/exhaustive-deps

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
          persona: `${interviewer.name}, ${interviewer.role}`,
          userMessage: text,
        });
        response = res.data?.reply || res.data?.question || null;
      } catch { /* fall through */ }
    }
    if (!response) {
      const canned = [`Ha, fair enough. Alright.`, `Good to hear, thanks for making the time.`, `Nice, okay, I think we're all set here.`];
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

  const skipAll = () => {
    window.speechSynthesis?.cancel?.();
    onEnterInterview?.();
  };

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
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '15%', top: '10%', width: 500, height: 500, borderRadius: '50%', background: env.wallColor, filter: 'blur(160px)', opacity: 0.07 }} />
        <div style={{ position: 'absolute', right: '10%', bottom: '15%', width: 400, height: 400, borderRadius: '50%', background: env.accentColor, filter: 'blur(140px)', opacity: 0.05 }} />
      </div>

      {/* progress dots so it never feels stuck/broken */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
        {['exterior','lobby','waiting','walk','entrance','smalltalk','transition'].map(s => (
          <div key={s} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: s === stage ? env.wallColor : '#1e2a3a',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

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

        {/* ── STAGE: EXTERIOR ──────────────────────────────────────── */}
        {stage === 'exterior' && (
          <motion.div key="exterior"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ textAlign: 'center', width: '100%', maxWidth: 720, padding: 24 }}>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ color: '#555', fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 18 }}>
              {dateStr} · {timeStr} · Arriving now
            </motion.div>

            {/* building silhouette made of animated windows */}
            <motion.div
              initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              style={{
                margin: '0 auto', width: 260, height: 220, position: 'relative',
                background: `linear-gradient(180deg, #0d1117, #06060d)`,
                border: `1px solid ${env.wallColor}55`, borderRadius: '4px 4px 0 0',
                boxShadow: `0 0 60px ${env.wallColor}22`,
                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: `repeat(${env.floors}, 1fr)`,
                gap: 3, padding: 8,
              }}>
              {Array.from({ length: env.floors * 5 }).map((_, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: Math.random() > 0.4 ? [0, 0.8, 0.6] : 0 }}
                  transition={{ delay: 0.8 + Math.random() * 1.8, duration: 0.6 }}
                  style={{ background: env.accentColor, borderRadius: 1 }}
                />
              ))}
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}
              style={{ margin: '22px 0 0', fontSize: 30, fontWeight: 900, color: '#fff' }}>
              {config.logo} {env.buildingName}
            </motion.h1>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}
              style={{ color: env.wallColor, fontSize: 13, marginTop: 6, fontWeight: 700 }}>
              {env.lobbyLine}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0.6] }} transition={{ delay: 2.8, duration: 1.4 }}
              style={{ color: '#444', fontSize: 12, marginTop: 22 }}>
              You walk toward the entrance...
            </motion.div>
          </motion.div>
        )}

        {/* ── STAGE: LOBBY ─────────────────────────────────────────── */}
        {stage === 'lobby' && (
          <motion.div key="lobby"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 1.1 }}
            style={{ textAlign: 'center', maxWidth: 640, padding: 24 }}>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ color: '#666', fontSize: 13, marginTop: 4, lineHeight: 1.7, fontStyle: 'italic' }}>
              {env.ambience}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}
              style={{
                marginTop: 30, background: '#0d1117', border: '1px solid #1e2a3a',
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

            <motion.div
              initial={{ opacity: 0, rotate: -6, y: 30 }} animate={{ opacity: 1, rotate: -2, y: 0 }}
              transition={{ delay: 2.2, type: 'spring', stiffness: 120 }}
              style={{
                margin: '26px auto 0', width: 220, background: '#fff', color: '#111',
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
                  <div style={{ color: '#666', fontSize: 11 }}>{interviewer.name} · {interviewer.role} · Floor {interviewer.floor}</div>
                </div>
                <div style={{ color: env.wallColor, fontSize: 11, fontWeight: 700 }}>{timeStr}</div>
              </div>
              <div style={{ color: '#444', fontSize: 11, marginTop: 10 }}>
                Waiting {waitSeconds}s · they'll come get you shortly
              </div>
            </div>

            {skippable && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => setStage('walk')}
                style={{
                  marginTop: 24, background: 'transparent', border: '1px solid #1e2a3a',
                  borderRadius: 10, color: '#666', cursor: 'pointer', fontSize: 12, padding: '8px 18px',
                }}>
                I'm ready, skip the wait
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ── STAGE: WALK (hallway / elevator to the room) ────────── */}
        {stage === 'walk' && (
          <motion.div key="walk"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', width: '100%', maxWidth: 640, padding: 24 }}>

            <div style={{ color: '#666', fontSize: 13, marginBottom: 18 }}>
              {env.receptionist} leads you down the hall to Floor {interviewer.floor}...
            </div>

            {/* receding hallway lines, an actual walking-forward illusion */}
            <div style={{ position: 'relative', height: 200, overflow: 'hidden', borderRadius: 16, background: '#0a0a12', border: '1px solid #1e2a3a' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div key={i}
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: 1.8, opacity: [0, 0.5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.27, ease: 'easeOut' }}
                  style={{
                    position: 'absolute', top: '50%', left: '50%', width: 40, height: 70,
                    border: `1px solid ${env.wallColor}66`, borderRadius: 6,
                    transform: 'translate(-50%,-50%)',
                  }}
                />
              ))}
              <div style={{
                position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                fontSize: 11, color: '#555',
              }}>
                🚪 Floor {interviewer.floor} · {interviewer.name}'s room
              </div>
            </div>

            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ color: '#555', fontSize: 12, marginTop: 18 }}>
              Almost there...
            </motion.div>
          </motion.div>
        )}

        {/* ── STAGE: ENTRANCE ──────────────────────────────────────── */}
        {stage === 'entrance' && (
          <motion.div key="entrance"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', maxWidth: 560, padding: 24 }}>

            <motion.div
              initial={{ x: -200, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 60, delay: 0.3 }}
              style={{ fontSize: 72, marginBottom: 16 }}>
              {interviewer.avatar}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 900 }}>{interviewer.name}</div>
              <div style={{ color: env.wallColor, fontSize: 13, fontWeight: 700, marginTop: 4 }}>{interviewer.role}</div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
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

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 56 }}>{interviewer.avatar}</div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 6 }}>{interviewer.name}</div>
              <div style={{ color: '#555', fontSize: 11 }}>{interviewer.role}</div>
            </div>

            <motion.div key={talkIdx}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#0d1117', border: `1px solid ${env.wallColor}33`,
                borderRadius: 16, padding: '16px 22px', color: '#ddd', fontSize: 15, lineHeight: 1.6,
              }}>
              "{interviewer.smallTalk[talkIdx]}"
            </motion.div>

            {aiReplies.map((ex, i) => (
              <div key={i} style={{ marginTop: 12, fontSize: 13 }}>
                <div style={{ color: '#888', textAlign: 'right', marginBottom: 4 }}>You: {ex.user}</div>
                <div style={{ color: '#bbb' }}>{interviewer.name.split(' ')[0]}: {ex.ai}</div>
              </div>
            ))}

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