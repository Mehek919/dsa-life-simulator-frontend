import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import API_BASE from './config';
import { COMPANY_PERSONAS, getPersona } from './companyPersonas';
import { getExperience } from './companyExperience';
import { Sky, Building, Person } from './ArrivalScenes';
import './ArrivalSequence.css';

/**
 * ArrivalSequence.jsx
 *
 * What happens between "Start" and the interview itself. Each company gets the format its
 * interview really uses (see companyExperience.js):
 *
 *   onsite  arrive -> lobby -> walk -> meet -> talk -> start     (visit the campus)
 *   video   device -> waiting -> join -> talk -> start           (video call)
 *   pair    device -> waiting -> join -> talk -> start           (shared editor + call)
 *   campus  results -> device -> join -> talk -> start           (fresher drive: assessments cleared, then a panel)
 *
 * Every stage advances on a timer, never on speech finishing. Speech is a bonus layer.
 */

const FLOWS = {
  onsite: ['arrive', 'lobby', 'walk', 'meet', 'talk', 'start'],
  video: ['device', 'waiting', 'join', 'talk', 'start'],
  pair: ['device', 'waiting', 'join', 'talk', 'start'],
  campus: ['results', 'device', 'join', 'talk', 'start'],
};
const DURATIONS = { arrive: 4600, lobby: 7000, walk: 3600, meet: 3600, device: 4200, waiting: 6500, join: 3400, results: 5600 };
const SKIPPABLE = { lobby: 2500, waiting: 2500, results: 2500 };
const FORMAT_LABEL = { onsite: 'Onsite visit', video: 'Video interview', pair: 'Pair programming session', campus: 'Campus drive · virtual panel' };
const TYPE_LABEL = { coding: 'Coding', 'system-design': 'System design', behavioral: 'Behavioral' };
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

async function authHeaders() {
  try {
    const u = getAuth().currentUser;
    return u ? { Authorization: `Bearer ${await u.getIdToken()}` } : {};
  } catch { return {}; }
}

// Used only if the backend can't be reached: still answer the question, don't just say "Got it"
function offlineReply(text, x, roundLabel) {
  const t = text.toLowerCase();
  if (/\b(how long|time|minutes|duration)\b/.test(t)) return `This round is ${roundLabel}. I'll keep an eye on the clock for us.`;
  if (/\b(hint|question|problem)\b/.test(t)) return "You'll see the problem in just a moment, I'll share it when we start.";
  if (t.includes('?') || /\b(what|why|how|mean|meant|explain|clarify|which|who|when)\b/.test(t)) return `Good question. What I meant: ${x.lines.note || x.lines.greet}`;
  return ['Sounds good.', 'Great, thanks for sharing.', 'Nice, okay.'][text.length % 3];
}

function speak(text) {
  try {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.97;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang.startsWith('en') && x.name.includes('Natural')) || voices.find((x) => x.lang.startsWith('en'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch { /* speech is optional */ }
}

// Quiet room tone and footsteps, generated (no audio files)
function useAudio(enabled) {
  const ctxRef = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = ctx.createBuffer(1, 2 * ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 2.5; }
      const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
      const gain = ctx.createGain(); gain.gain.value = 0.01;
      src.connect(gain).connect(ctx.destination); src.start();
      ctxRef.current = ctx;
    } catch { /* fine without it */ }
    return () => { ctxRef.current?.close?.(); ctxRef.current = null; };
  }, [enabled]);
  return ctxRef;
}
function tone(ctx, freq, len = 0.15, vol = 0.05, delay = 0) {
  if (!ctx) return;
  setTimeout(() => {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + len);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + len + 0.01);
    } catch { /* skip */ }
  }, delay);
}

// ── Small building blocks ────────────────────────────────────────────────────
function DayTimeline({ x, title = 'Your interview day' }) {
  return (
    <div className="arr-day">
      <div className="arr-label">{title}</div>
      <ol>
        {x.day.map((step, i) => (
          <li key={step} className={i < x.dayCurrent ? 'done' : i === x.dayCurrent ? 'now' : ''}>
            <i aria-hidden="true">{i < x.dayCurrent ? '✓' : i + 1}</i><span>{step}</span>{i === x.dayCurrent && <b>You are here</b>}
          </li>
        ))}
      </ol>
      {x.loopSlots && (
        <div className="arr-slots" aria-label="Loop interviews">
          {x.loopSlots.map((s, i) => {
            const here = x.round === 'bar-raiser' ? s === 'Bar Raiser' : i === 0;
            return <span key={i} className={here ? 'here' : ''}><small>Interview {i + 1}</small>{s}<em>55 min</em></span>;
          })}
        </div>
      )}
    </div>
  );
}

function Bubble({ who, children, accent }) {
  return (
    <motion.div className="arr-bubble" style={{ '--acc': accent }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {who && <div className="who">{who}</div>}
      <p>{children}</p>
    </motion.div>
  );
}

// A video-call window: interviewer tile, your tile and call controls
function CallWindow({ x, companyName, userName, joined, speaking, roundLabel, children, compact }) {
  const [c1] = x.palette;
  return (
    <div className={`arr-call${compact ? ' compact' : ''}`}>
      <div className="arr-call-bar"><span className="rec" />{FORMAT_LABEL[x.format]} · {companyName}<span className="sp" />{roundLabel}</div>
      <div className="arr-tiles">
        <div className={`arr-tile them${joined ? ' joined' : ''}`}>
          {joined ? (
            <motion.div className="arr-tile-in" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
              <Person name={x.interviewer.name} color={c1} size={compact ? 92 : 130} speaking={speaking} />
            </motion.div>
          ) : (
            <div className="arr-tile-wait"><span className="dots"><i /><i /><i /></span>Waiting for the interviewer</div>
          )}
          <div className="arr-name">{joined ? `${x.interviewer.name} · ${x.interviewer.role}` : x.interviewer.name}</div>
        </div>
        <div className="arr-tile you">
          <div className="arr-you">{(userName || 'C').trim()[0]?.toUpperCase()}</div>
          <div className="arr-name">{userName} (you)</div>
        </div>
      </div>
      {children}
      <div className="arr-controls" aria-hidden="true"><span>🎙</span><span>📷</span><span>🖥</span><span className="leave">✕</span></div>
    </div>
  );
}

// Shared editor for pair programming sessions
function PairEditor({ x }) {
  const lines = ['# problem.md', '', 'Build a small service that', 'handles the requests below.', '', '- start simple, then extend', '- explain your choices'];
  return (
    <div className="arr-editor">
      <div className="arr-editor-bar"><span>problem.md</span><span>solution.py</span><span className="who" style={{ '--acc': x.palette[0] }}>{x.interviewer.name.split(' ')[0]} is viewing</span></div>
      <pre>{lines.map((l, i) => <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 * i }}>{l || ' '}{'\n'}</motion.span>)}<span className="caret" style={{ background: x.palette[0] }} /></pre>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ArrivalSequence({
  company = 'general',
  config = {},
  interviewType = 'coding',
  stage: round = null,
  userName = 'Candidate',
  sessionId = null,
  onEnterInterview,
}) {
  const x = useMemo(() => getExperience(company, round, interviewType), [company, round, interviewType]);
  const persona = getPersona(company, round);
  const companyName = getPersona(company).name;
  const personaRound = (persona.rounds || []).find((r) => r.id === round) || (persona.rounds || [])[0];
  const roundLabel = `${personaRound ? personaRound.label : TYPE_LABEL[interviewType] || 'Interview'}${personaRound ? ` · ${personaRound.minutes} min` : ''}`;
  const flow = FLOWS[x.format] || FLOWS.onsite;
  const [c1, c2] = x.palette;

  const [step, setStep] = useState(flow[0]);
  const [talkIdx, setTalkIdx] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reply, setReply] = useState('');
  const [replies, setReplies] = useState([]);
  const [replying, setReplying] = useState(false);
  const audioRef = useAudio(!muted && step !== 'start');
  const firstName = x.interviewer.name.split(' ')[0];
  const talk = [x.lines.greet, x.lines.note].filter(Boolean);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const next = () => { const i = flow.indexOf(step); if (i < flow.length - 1) setStep(flow[i + 1]); };

  // Timed progression, decoupled from speech
  useEffect(() => {
    setCanSkip(false);
    const timers = [];
    const say = (t, d = 700) => timers.push(setTimeout(() => { if (!muted) speak(t); }, d));
    if (SKIPPABLE[step]) timers.push(setTimeout(() => setCanSkip(true), SKIPPABLE[step]));
    if (DURATIONS[step]) timers.push(setTimeout(next, reduceMotion() ? Math.min(DURATIONS[step], 2500) : DURATIONS[step]));
    if (step === 'lobby') say(`Hi, welcome to ${companyName}. You must be ${userName}. I'll let ${firstName} know you're here.`, 900);
    if (step === 'walk') for (let i = 0; i < 7; i++) tone(audioRef.current, 90 + Math.random() * 20, 0.14, 0.05, i * 420);
    if (step === 'join') { tone(audioRef.current, 660, 0.18, 0.04); tone(audioRef.current, 880, 0.22, 0.04, 180); }
    if (step === 'meet' || step === 'join') say(`Hi ${userName}, I'm ${firstName}. Thanks for making the time.`, 900);
    if (step === 'talk') say(talk[talkIdx], 300);
    if (step === 'start') { say(x.lines.start, 200); timers.push(setTimeout(() => onEnterInterview?.(), 3400)); }
    return () => timers.forEach(clearTimeout);
  }, [step, talkIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipAll = () => { window.speechSynthesis?.cancel?.(); onEnterInterview?.(); };
  // The candidate can talk back: the interviewer answers in character (backend /smalltalk)
  const sendReply = async () => {
    const t = reply.trim(); if (!t || replying) return;
    setReply('');
    setReplies((r) => [...r, { you: t, them: null }]);
    setReplying(true);
    const history = [
      ...talk.slice(0, talkIdx + 1).map((line) => ({ role: 'interviewer', text: line })),
      ...replies.flatMap((r) => [{ role: 'candidate', text: r.you }, ...(r.them ? [{ role: 'interviewer', text: r.them }] : [])]),
    ];
    let answer = null;
    if (sessionId) {
      try {
        const res = await axios.post(`${API_BASE}/mock-interview/${sessionId}/smalltalk`, {
          message: t, interviewerName: x.interviewer.name, interviewerRole: x.interviewer.role, history,
        }, { headers: await authHeaders(), timeout: 15000 });
        answer = res.data?.reply || null;
      } catch { /* fall back below */ }
    }
    answer = answer || offlineReply(t, x, roundLabel);
    setReplies((r) => r.map((e, i) => (i === r.length - 1 ? { ...e, them: answer } : e)));
    setReplying(false);
    if (!muted) speak(answer);
  };
  const advanceTalk = () => (talkIdx < talk.length - 1 ? setTalkIdx((i) => i + 1) : setStep('start'));
  const isCall = x.format !== 'onsite';
  const basisText = { official: 'Format based on what the company publishes', reported: 'Format based on public candidate reports', inspired: 'Inspired by limited public reports' }[COMPANY_PERSONAS[company]?.basis || persona.basis];

  return (
    <div className={`arr arr--${x.format}`} style={{ '--c1': c1, '--c2': c2 }}>
      {x.format === 'onsite' ? <Sky sky={x.sky} palette={x.palette} /> : (
        <div className="arr-room" aria-hidden="true">
          <div className="arr-backdrop"><Building arch={x.arch} palette={x.palette} palms={x.palms} label="" /></div>
        </div>
      )}

      <header className="arr-top">
        <div className="arr-brand"><span className="chip" />{companyName}<span className="muted"> · {roundLabel}</span></div>
        <ol className="arr-steps" aria-label="Progress">{flow.map((s) => <li key={s} className={s === step ? 'on' : flow.indexOf(s) < flow.indexOf(step) ? 'done' : ''} />)}</ol>
        <div className="arr-actions">
          <button onClick={() => { setMuted((m) => !m); window.speechSynthesis?.cancel?.(); }}>{muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
          <button onClick={skipAll}>Skip to interview →</button>
        </div>
      </header>

      <main className="arr-stage">
        <AnimatePresence mode="wait">
          {/* ── ONSITE ───────────────────────────────────────────── */}
          {step === 'arrive' && (
            <motion.section key="arrive" className="arr-arrive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <div className="arr-kicker">{dateStr} · {timeStr} · {FORMAT_LABEL.onsite}</div>
              <motion.div initial={{ scale: 1.12, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ duration: 2.4, ease: 'easeOut' }}>
                <Building arch={x.arch} palette={x.palette} palms={x.palms} label={`${x.place}, ${x.city}`} />
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>{x.place}</motion.h1>
              <motion.div className="arr-city" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>{x.city}</motion.div>
              {x.ambience && <motion.p className="arr-amb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>{x.ambience}</motion.p>}
            </motion.section>
          )}

          {step === 'lobby' && (
            <motion.section key="lobby" className="arr-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.7 }}>
              <div>
                <Bubble who={`${x.receptionist} · Front desk`} accent={c1}>
                  Hi, welcome to {companyName}. You must be <strong>{userName}</strong>, here for the {timeStr} {TYPE_LABEL[interviewType]?.toLowerCase() || ''} interview. I'll let {firstName} know you're here.
                </Bubble>
                <motion.div className="arr-badge" initial={{ opacity: 0, rotate: -8, y: 30 }} animate={{ opacity: 1, rotate: -2, y: 0 }} transition={{ delay: 1.2, type: 'spring', stiffness: 110 }}>
                  <div className="band" /><small>VISITOR</small><b>{userName}</b><span>{dateStr}</span><em>Host: {x.interviewer.name}</em><div className="code" />
                </motion.div>
              </div>
              <DayTimeline x={x} />
              {canSkip && <button className="arr-ghost" onClick={next}>I'm ready, continue</button>}
            </motion.section>
          )}

          {step === 'walk' && (
            <motion.section key="walk" className="arr-walk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p>{x.receptionist} walks you to {firstName}'s room…</p>
              <div className="arr-hall" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => <motion.span key={i} initial={{ scale: 0.15, opacity: 0 }} animate={{ scale: 2, opacity: [0, 0.6, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.26, ease: 'easeIn' }} />)}
                <div className="door">{firstName}'s room</div>
              </div>
            </motion.section>
          )}

          {step === 'meet' && (
            <motion.section key="meet" className="arr-meet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 70 }}>
                <Person name={x.interviewer.name} color={c1} size={150} speaking />
              </motion.div>
              <h2>{x.interviewer.name}</h2><div className="arr-role">{x.interviewer.role}</div>
              <Bubble accent={c1}>Hi {userName}, I'm {firstName}. Thanks for making the time. Come on in.</Bubble>
            </motion.section>
          )}

          {/* ── VIDEO / PAIR / CAMPUS ───────────────────────────── */}
          {step === 'results' && (
            <motion.section key="results" className="arr-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="arr-kicker">{companyName} · {FORMAT_LABEL.campus}</div>
              <h1>You're through to the interview</h1>
              <div className="arr-cards">
                {(x.cleared || []).map((c, i) => (
                  <motion.div key={c} className="arr-cleared" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.45 }}>
                    <span>{c}</span>
                    <motion.b initial={{ scale: 2.2, opacity: 0, rotate: -18 }} animate={{ scale: 1, opacity: 1, rotate: -8 }} transition={{ delay: 0.75 + i * 0.45, type: 'spring', stiffness: 220 }}>CLEARED</motion.b>
                  </motion.div>
                ))}
              </div>
              <DayTimeline x={x} title="Selection process" />
              {canSkip && <button className="arr-ghost" onClick={next}>Join the interview</button>}
            </motion.section>
          )}

          {step === 'device' && (
            <motion.section key="device" className="arr-device" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="arr-kicker">{dateStr} · {timeStr} · {FORMAT_LABEL[x.format]}</div>
              <h1>Getting you ready to join</h1>
              <div className="arr-preview">
                <div className="arr-you big">{(userName || 'C').trim()[0]?.toUpperCase()}</div>
                <div className="arr-meter" aria-hidden="true">{Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ animationDelay: `${(i % 7) * 0.08}s` }} />)}</div>
              </div>
              <ul className="arr-checks">
                {['Camera', 'Microphone', 'Connection', x.format === 'pair' ? 'Shared editor' : 'Screen share'].map((c, i) => (
                  <motion.li key={c} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.6 }}><b>✓</b>{c}</motion.li>
                ))}
              </ul>
            </motion.section>
          )}

          {step === 'waiting' && (
            <motion.section key="waiting" className="arr-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CallWindow x={x} companyName={companyName} userName={userName} joined={false} roundLabel={roundLabel}>
                <div className="arr-waitmsg">You're in the waiting room. {firstName} will let you in shortly.</div>
              </CallWindow>
              <div>
                <DayTimeline x={x} />
                {x.tools && <div className="arr-tools">{x.tools.map((t) => <span key={t}>{t}</span>)}</div>}
              </div>
              {canSkip && <button className="arr-ghost" onClick={next}>I'm ready</button>}
            </motion.section>
          )}

          {step === 'join' && (
            <motion.section key="join" className={x.format === 'pair' ? 'arr-pair' : 'arr-solo'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {x.format === 'pair' && <PairEditor x={x} />}
              <CallWindow x={x} companyName={companyName} userName={userName} joined speaking roundLabel={roundLabel} compact={x.format === 'pair'}>
                <Bubble who={firstName} accent={c1}>Hi {userName}, I'm {firstName}. Thanks for making the time. Can you hear me okay?</Bubble>
              </CallWindow>
            </motion.section>
          )}

          {/* ── SHARED: TALK + START ────────────────────────────── */}
          {step === 'talk' && (
            <motion.section key="talk" className={isCall ? (x.format === 'pair' ? 'arr-pair' : 'arr-solo') : 'arr-meet'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {x.format === 'pair' && <PairEditor x={x} />}
              {(() => {
                const inner = (
                  <div className="arr-talk">
                    <Bubble key={talkIdx} who={`${firstName} · ${x.interviewer.role}`} accent={c1}>{talk[talkIdx]}</Bubble>
                    {replies.map((r, i) => (
                      <div key={i} className="arr-ex">
                        <div className="you"><span>{r.you}</span></div>
                        {r.them ? <Bubble who={firstName} accent={c1}>{r.them}</Bubble> : <div className="arr-typing">{firstName} is typing <span className="dots"><i /><i /><i /></span></div>}
                      </div>
                    ))}
                    <div className="arr-reply">
                      <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()} placeholder="Say something back (optional)…" aria-label="Your reply" />
                      <button onClick={sendReply} disabled={!reply.trim() || replying}>Reply</button>
                    </div>
                    <button className="arr-go" onClick={advanceTalk}>{talkIdx < talk.length - 1 ? 'Continue' : "I'm ready, let's start"}</button>
                    {basisText && <div className="arr-basis">{basisText}. Interviewer and questions are fictional; not affiliated with {companyName}.</div>}
                  </div>
                );
                return isCall ? (
                  <CallWindow x={x} companyName={companyName} userName={userName} joined speaking roundLabel={roundLabel} compact={x.format === 'pair'}>{inner}</CallWindow>
                ) : (
                  <>
                    <Person name={x.interviewer.name} color={c1} size={120} speaking />
                    <h2>{x.interviewer.name}</h2><div className="arr-role">{x.interviewer.role}</div>
                    {inner}
                  </>
                );
              })()}
            </motion.section>
          )}

          {step === 'start' && (
            <motion.section key="start" className="arr-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Person name={x.interviewer.name} color={c1} size={110} speaking />
              <Bubble who={firstName} accent={c1}>{x.lines.start}</Bubble>
              <motion.div className="arr-hint" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.4, repeat: Infinity }}>
                {x.format === 'onsite' ? `${firstName} turns the laptop toward you…` : x.format === 'pair' ? 'Opening the shared editor…' : `${firstName} is sharing the problem…`}
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
