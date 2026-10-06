import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import './Lab.css';

// ── Constants (same values the backend already uses) ──────────────────────────
const TOPICS = ['Array', 'LinkedList', 'Stack', 'Queue', 'Tree', 'Graph', 'DynamicProgramming'];
const TOPIC_LABEL = { LinkedList: 'Linked List', DynamicProgramming: 'Dynamic Programming' };
const DIFFICULTIES = [['easy', '#39ff88'], ['medium', '#f4b740'], ['hard', '#ff5b5b']];
const PUBLISH_COST = 50;
const L = ['A', 'B', 'C', 'D'];
const label = (t) => TOPIC_LABEL[t] || t;
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Forge sounds, synthesized in the browser (no audio files) ─────────────────
let audioCtx = null;
function getCtx() {
  const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
  if (!audioCtx) audioCtx = new A(); if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx;
}
function noise(a, t, dur, freq, q, gain) {
  const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const s = a.createBufferSource(); s.buffer = buf; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.value = gain; s.connect(f).connect(g).connect(a.destination); s.start(t);
}
function tone(a, t, f0, f1, dur, type, gain) {
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  click: (a, t) => { noise(a, t, 0.05, 3200, 6, 0.5); tone(a, t, 1800, 900, 0.04, 'square', 0.04); },
  latch: (a, t) => { noise(a, t, 0.06, 2200, 5, 0.6); noise(a, t + 0.07, 0.07, 1400, 4, 0.5); tone(a, t + 0.07, 520, 260, 0.08, 'triangle', 0.08); },
  apply: (a, t) => { [0, 0.06, 0.12].forEach((d, i) => tone(a, t + d, 700 + i * 260, 900 + i * 260, 0.07, 'sine', 0.06)); },
  forge: (a, t) => {
    [0, 0.32, 0.64].forEach((d) => { noise(a, t + d, 0.22, 2600, 3, 0.9); tone(a, t + d, 1900, 1200, 0.5, 'triangle', 0.12); tone(a, t + d, 140, 60, 0.18, 'sine', 0.35); });
    noise(a, t + 0.95, 0.6, 600, 0.6, 0.5); tone(a, t + 1.0, 330, 660, 0.35, 'sine', 0.08); tone(a, t + 1.12, 495, 990, 0.45, 'sine', 0.07);
  },
};

// ── Text helpers ──────────────────────────────────────────────────────────────
// Renders `code` spans as inline code, everything else as plain text.
function Rich({ text }) {
  return <>{String(text).split(/(`[^`]+`)/g).map((part, i) => (part.startsWith('`') && part.endsWith('`') && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code> : <React.Fragment key={i}>{part}</React.Fragment>))}</>;
}
const CODEISH = /(\b[A-Za-z_]\w*\[[^\]\s]*\]|\b[A-Za-z_]\w*\.[A-Za-z_]\w*(?:\(\))?|\b[a-z_]\w*\([^)]{0,20}\)|\bO\([^)]{1,12}\)|\b\w+\s*(?:==|!=|<=|>=)\s*\w+)/g;
const formatFix = (s) => s.replace(/`[^`]*`|[^`]+/g, (chunk) => (chunk.startsWith('`') ? chunk : chunk.replace(CODEISH, '`$1`'))).replace(/[ \t]{2,}/g, ' ').replace(/\s+([?.,])/g, '$1');

function quickDistractors(question, topic, options) {
  const q = question.toLowerCase(), have = new Set(options.map((o) => o.trim().toLowerCase()).filter(Boolean));
  let pool;
  if (/complexit|big.?o|how (fast|long)|runtime|time to/.test(q)) pool = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'];
  else if (/space|memory/.test(q)) pool = ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'];
  else if (/data structure|which structure|best (to )?use/.test(q)) pool = ['Hash map', 'Min-heap', 'Stack', 'Queue', 'Balanced BST', 'Trie'];
  else if (/true|false|always|never/.test(q)) pool = ['Always true', 'Never true', 'Only for sorted input', 'Only when n is even'];
  else pool = { DynamicProgramming: ['Greedy choice at each step', 'Plain recursion without memo', 'Sort then scan'], Graph: ['Plain DFS without visited set', 'Sort the edges then scan', 'Greedy nearest neighbour'] }[topic]
    || ['Sort first, then scan once', 'Use a hash set', 'Brute force every pair', 'Recursion without memoization'];
  return pool.filter((p) => !have.has(p.toLowerCase()));
}

// Same rules as before (20-char question, 4 options of 2+ chars, a marked answer), plus no duplicates.
function validate(question, options, correctIdx) {
  if (question.trim().length < 20) return 'Question must be at least 20 characters.';
  if (options.some((o) => o.trim().length < 2)) return 'All 4 options must be filled in.';
  const low = options.map((o) => o.trim().toLowerCase()); if (new Set(low).size !== 4) return 'Two options are the same.';
  if (correctIdx == null) return 'Click a letter to mark the correct answer.';
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Lab({ user, userData, setUserData }) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('Array');
  const [difficulty, setDifficulty] = useState('medium');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTab, setAiTab] = useState('sug');
  const [improved, setImproved] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(null);   // { id, topic }
  const [stamped, setStamped] = useState(false);
  const [toast, setToast] = useState(null);
  const [soundOn, setSoundOn] = useState(() => { try { return localStorage.getItem('forge:sound') !== 'off'; } catch (e) { return true; } });
  const [snapIdx, setSnapIdx] = useState(null);
  const [focusTick, setFocusTick] = useState(0);
  const qRef = useRef(null);
  useEffect(() => { if (focusTick && qRef.current) qRef.current.focus(); }, [focusTick]);
  const credits = userData ? (userData.credits || 0) : 0;
  const correctAnswer = correctIdx != null ? options[correctIdx] : '';

  const play = useCallback((name) => { if (!soundOn) return; const a = getCtx(); if (a) SFX[name](a, a.currentTime); }, [soundOn]);
  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => { setToast({ msg, type }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 4000); }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const toggleSound = () => { const next = !soundOn; setSoundOn(next); try { localStorage.setItem('forge:sound', next ? 'on' : 'off'); } catch (e) { /* ignore */ } if (next) { const a = getCtx(); if (a) SFX.click(a, a.currentTime); } };

  const setOption = (i, v) => setOptions((prev) => prev.map((o, k) => (k === i ? v : o)));
  const markCorrect = (i) => { setCorrectIdx(i); setSnapIdx(i); play('latch'); };

  // ── 3D forge platform behind the preview ──
  const forgeHost = useRef(null), forgeRef = useRef(null);
  useEffect(() => {
    let dead = false;
    import('./ForgeScene').then((m) => { if (!dead && forgeHost.current) forgeRef.current = m.mountForge(forgeHost.current); }).catch(() => {});
    return () => { dead = true; if (forgeRef.current) forgeRef.current.destroy(); forgeRef.current = null; };
  }, []);

  // ── 3D tilt of the preview card ──
  const cardRef = useRef(null);
  const tilt = (e) => {
    if (reduceMotion() || !cardRef.current) return;
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    cardRef.current.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
  };
  const untilt = () => { if (cardRef.current) cardRef.current.style.transform = reduceMotion() ? 'none' : 'rotateX(6deg) rotateY(-8deg)'; };
  useEffect(untilt, []);

  // ── AI review (your existing endpoint) ──
  async function runAIReview() {
    const err = validate(question, options, correctIdx);
    if (err) { showToast(err, 'warn'); return; }
    setReviewing(true); setImproved(null);
    try {
      const res = await axios.post(`${API_BASE}/challenges/ai-review`, { question, options, correctAnswer, topic, difficulty });
      setImproved(res.data.improved);
    } catch (e) {
      showToast('Error: ' + (e.response?.data?.error || 'AI review failed. Try again.'), 'error');
    }
    setReviewing(false);
  }
  function acceptImproved() {
    if (!improved) return;
    const opts = (improved.options || options).slice(0, 4);
    setQuestion(improved.question || question); setOptions(opts);
    const idx = opts.indexOf(improved.correctAnswer); setCorrectIdx(idx >= 0 ? idx : correctIdx);
    if (improved.explanation) setExplanation(improved.explanation);
    setImproved(null); play('apply'); showToast('AI improvements applied. Keep editing or forge it.');
  }

  // ── Publish (your existing endpoint) with the forge sequence ──
  async function handlePublish() {
    const err = validate(question, options, correctIdx);
    if (err) { showToast(err, 'warn'); return; }
    if (credits < PUBLISH_COST) { showToast(`Not enough credits. You need ${PUBLISH_COST} credits.`, 'error'); return; }
    setPublishing(true);
    try {
      const res = await axios.post(`${API_BASE}/challenges/publish`, {
        userId: user?.uid, creatorName: user?.displayName,
        question, options, correctAnswer, explanation, topic, difficulty,
      });
      play('forge');
      const hits = reduceMotion() ? [0] : [0, 320, 640];
      hits.forEach((d) => setTimeout(() => {
        const c = cardRef.current; if (c) { c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); }
        const f = document.querySelector('.lb .flash'); if (f) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
        if (forgeRef.current) forgeRef.current.strike();
      }, d));
      setTimeout(() => {
        setStamped(true); setPublished({ id: res.data.challengeId, topic });
        if (setUserData && res.data.newCredits != null) setUserData((prev) => ({ ...prev, credits: res.data.newCredits }));
        const cr = document.querySelector('.lb .credits'); if (cr) { cr.classList.remove('spend'); void cr.offsetWidth; cr.classList.add('spend'); }
        showToast('Trap set! Your challenge is published.');
      }, reduceMotion() ? 0 : 950);
    } catch (e) {
      showToast('Error: ' + (e.response?.data?.error || 'Publish failed.'), 'error');
    }
    setPublishing(false);
  }

  function handleReset() {
    setQuestion(''); setOptions(['', '', '', '']); setCorrectIdx(null); setExplanation(''); setImproved(null);
    setPublished(null); setStamped(false); setSnapIdx(null); setFocusTick((n) => n + 1);
  }

  // ── Suggestions (instant, rule-based) ──
  function suggestions() {
    const out = [], q = question.trim(), o = options.map((x) => x.trim());
    if (q.length < 20) out.push(['err', 'The question is too short', 'At least 20 characters, with enough context to solve in 90 seconds.']);
    else if (!/[?.]$/.test(q)) out.push(['warn', 'End the question with a question mark', 'Small, but it reads cleaner in the duel.', () => setQuestion(q + '?')]);
    if (correctIdx == null) out.push(['err', 'No correct answer marked', 'Click a letter bubble to mark it.']);
    const low = o.filter(Boolean).map((x) => x.toLowerCase()); if (new Set(low).size !== low.length) out.push(['err', 'Two options are identical', 'Every option must be different.']);
    const empty = o.filter((x) => !x).length; if (empty) out.push(['warn', `${empty} option${empty > 1 ? 's are' : ' is'} empty`, 'The Distractors tab can fill them.', () => setAiTab('dis')]);
    const lens = o.filter(Boolean).map((x) => x.length);
    if (correctIdx != null && o[correctIdx] && lens.length === 4) { const avg = lens.reduce((a, b) => a + b, 0) / 4; if (o[correctIdx].length > avg * 1.8) out.push(['warn', 'Your correct answer is a giveaway', 'It is much longer than the others. Rivals notice that.']); }
    if (/all of the above|none of the above/i.test(o.join(' '))) out.push(['warn', 'Avoid "all/none of the above"', 'They make questions easier to guess.']);
    if (formatFix(question) !== question) out.push(['warn', 'Formatting can be tidied', 'Extra spaces, or code that should be shown as inline code.', () => setAiTab('fmt')]);
    if (!out.length) out.push(['ok', 'This trap looks solid', 'Clear question, four distinct options, and a marked answer. Ready to forge.']);
    return out;
  }

  const problem = validate(question, options, correctIdx) || (credits < PUBLISH_COST ? `You need ${PUBLISH_COST} credits to publish. Complete daily challenges to earn more.` : null);
  const handle = ((user?.displayName || 'dev').split(' ')[0] || 'dev').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev';
  const fixedQ = formatFix(question), fixedO = options.map(formatFix), fmtChanged = fixedQ !== question || fixedO.some((x, i) => x !== options[i]);
  const empties = options.map((o, i) => (o.trim() || i === correctIdx ? -1 : i)).filter((i) => i >= 0), pool = quickDistractors(question, topic, options);

  const tabs = [['sug', 'Suggestions'], ['fmt', 'Fix formatting'], ['dis', 'Distractors'], ['ai', 'AI review']];
  const onTabKey = (e) => {
    const i = tabs.findIndex((t) => t[0] === aiTab), n = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length }[e.key];
    if (n == null) return; e.preventDefault(); setAiTab(tabs[n][0]); play('click'); const el = document.getElementById(`lb-tab-${tabs[n][0]}`); if (el) el.focus();
  };

  return (
    <div className="lb">
      <div className="crt" aria-hidden="true" />
      <div className="page">
        <div className="top">
          <button className="btn" onClick={() => navigate('/world')}>&larr; Back to World</button>
          <div className="path"><b>{handle}</b>@<i>evoworld</i>:~/lab/forge$</div>
          <button className="btn sound" aria-pressed={soundOn} onClick={toggleSound} title="Forge sounds">{soundOn ? '🔊 Sound' : '🔇 Muted'}</button>
          <div className="credits" aria-live="polite"><b>{credits}</b> credits</div>
        </div>

        <div className="split">
          {/* ── The forge (inputs) ── */}
          <section className="card forge" aria-labelledby="lb-h1">
            <span className="kicker"><i />THE LAB · TRAP WORKSHOP</span>
            <h1 id="lb-h1">Craft a <span>trap</span></h1>
            <p>Build a question for other players to face. Mark the right answer, make the wrong ones convincing, then forge it into the pool. Publishing costs {PUBLISH_COST} credits.</p>
            <div className="row2">
              <div><label className="lab" htmlFor="lb-topic">TOPIC</label>
                <select id="lb-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>{TOPICS.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></div>
              <div><span className="lab" id="lb-dlab">DIFFICULTY</span>
                <div className="diff" role="radiogroup" aria-labelledby="lb-dlab">
                  {DIFFICULTIES.map(([d, c]) => <button key={d} role="radio" aria-checked={difficulty === d} aria-pressed={difficulty === d} style={{ '--c': c, textTransform: 'capitalize' }} onClick={() => { setDifficulty(d); play('click'); }}>{d}</button>)}
                </div></div>
            </div>
            <label className="lab" htmlFor="lb-q">QUESTION <span className={`count${question.length > 260 ? ' warn' : ''}`}>{question.length} / 300</span></label>
            <textarea id="lb-q" ref={qRef} maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. What is the time complexity of binary search on a sorted array?" />
            <span className="lab" id="lb-olab">ANSWER OPTIONS · <b>click a letter to mark the correct one</b></span>
            <div className="opts" role="radiogroup" aria-labelledby="lb-olab"
              onKeyDown={(e) => { const b = e.target.closest('.bubble'); if (!b) return; const i = +b.dataset.i; const n = { ArrowDown: (i + 1) % 4, ArrowRight: (i + 1) % 4, ArrowUp: (i + 3) % 4, ArrowLeft: (i + 3) % 4 }[e.key]; if (n == null) return; e.preventDefault(); markCorrect(n); const nb = e.currentTarget.querySelectorAll('.bubble')[n]; if (nb) nb.focus(); }}>
              {options.map((opt, i) => (
                <div key={i} className={`opt${correctIdx === i ? ' correct' : ''}`}>
                  <button className={`bubble${snapIdx === i && !reduceMotion() ? ' snap' : ''}`} role="radio" aria-checked={correctIdx === i} aria-label={`Mark option ${L[i]} as the correct answer`} data-i={i}
                    tabIndex={correctIdx === i || (correctIdx == null && i === 0) ? 0 : -1} onClick={() => markCorrect(i)} onAnimationEnd={() => setSnapIdx(null)}>{L[i]}</button>
                  <input maxLength={120} value={opt} placeholder={`Option ${L[i]}`} aria-label={`Option ${L[i]}`} onChange={(e) => setOption(i, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="keyhint">{correctIdx == null ? 'No correct answer marked yet.' : <>Correct answer: <b>{L[correctIdx]}</b>{correctAnswer.trim() ? ` · ${correctAnswer.trim()}` : ''}</>}</div>
            <label className="lab" htmlFor="lb-ex">EXPLANATION <span style={{ fontWeight: 400, letterSpacing: 0 }}>· optional, shown after the duel</span></label>
            <textarea id="lb-ex" className="expl" maxLength={500} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Why the correct answer is right. AI review can write this for you." />
            <div className="tools">
              <button className="ai" aria-expanded={aiOpen} aria-controls="lb-aip" onClick={() => { setAiOpen((o) => !o); play('click'); }}>✦ AI Assistant</button>
              <button className="publish" disabled={!!problem || publishing || !!published} onClick={handlePublish}>{publishing ? 'FORGING…' : `⚒ FORGE & PUBLISH · ${PUBLISH_COST} CR`}</button>
            </div>
            <div className="why" role="status">{published ? '' : problem ? `To publish: ${problem.charAt(0).toLowerCase()}${problem.slice(1)}` : 'Ready to forge.'}</div>

            {aiOpen && (
              <div className="aip" id="lb-aip">
                <div className="tabs" role="tablist" aria-label="AI assistant tools" onKeyDown={onTabKey}>
                  {tabs.map(([id, name]) => <button key={id} id={`lb-tab-${id}`} role="tab" aria-selected={aiTab === id} tabIndex={aiTab === id ? 0 : -1} aria-controls="lb-aibody" onClick={() => { setAiTab(id); play('click'); }}>{name}</button>)}
                </div>
                <div className="body" id="lb-aibody" role="tabpanel" aria-labelledby={`lb-tab-${aiTab}`} aria-live="polite">
                  {aiTab === 'sug' && suggestions().map(([k, t, d, fix], i) => (
                    <div key={i} className={`sug ${k}`}><span className="ic">{k === 'ok' ? '✓' : k === 'warn' ? '!' : '✕'}</span><span><b>{t}</b><small>{d}</small></span>
                      {fix ? <button className="apply" onClick={() => { fix(); play('apply'); }}>Apply</button> : <span />}</div>
                  ))}
                  {aiTab === 'fmt' && (!question.trim()
                    ? <>Write a question first. I tidy spacing and wrap code like <code>arr[i]</code>, <code>nums.length</code> and <code>O(n log n)</code> as inline code.</>
                    : fmtChanged
                      ? <><div>Tidied spacing, and code wrapped as inline code:</div>
                          <div className="diffview"><del>{question}</del>{'\n'}<ins><Rich text={fixedQ} /></ins></div>
                          <button className="apply" onClick={() => { setQuestion(fixedQ); setOptions(fixedO); play('apply'); showToast('Formatting applied'); }}>Apply formatting</button></>
                      : <div className="sug ok"><span className="ic">✓</span><span><b>Formatting looks clean</b><small>No extra spaces or unformatted code found.</small></span><span /></div>)}
                  {aiTab === 'dis' && <>
                    <div>Believable wrong answers for this {label(topic)} question:</div>
                    <div className="diffview">{pool.slice(0, 4).map((p, i) => <div key={i}>• <Rich text={p} /></div>)}</div>
                    {empties.length
                      ? <button className="apply" onClick={() => { setOptions((prev) => { const next = prev.slice(); empties.forEach((i, k) => { if (pool[k]) next[i] = pool[k]; }); return next; }); play('apply'); showToast('Distractors added'); }}>Fill {empties.length} empty option{empties.length > 1 ? 's' : ''}</button>
                      : <small style={{ color: 'var(--muted)' }}>All options are filled. Clear one to auto-fill it, or use AI review to sharpen all of them.</small>}
                  </>}
                  {aiTab === 'ai' && <>
                    {!improved && !reviewing && <div>AI review checks your question for accuracy, sharpens the wording and wrong answers, and writes an explanation. Fill in all four options and mark the correct one first.</div>}
                    {reviewing && <span className="thinking">The AI is reviewing your trap</span>}
                    {improved && <>
                      <div className="diffview"><b>Question</b>{'\n'}<Rich text={improved.question || ''} />{'\n\n'}<b>Options</b>{'\n'}{(improved.options || []).map((o, i) => <div key={i} style={o === improved.correctAnswer ? { color: 'var(--green)' } : undefined}>{L[i]}. <Rich text={o} />{o === improved.correctAnswer ? '  ✓ correct' : ''}</div>)}
                        {improved.explanation && <>{'\n'}<b>Explanation</b>{'\n'}{improved.explanation}</>}</div>
                      <button className="apply" onClick={acceptImproved}>Use this version</button>{' '}
                      <button className="apply" onClick={() => setImproved(null)}>Keep mine</button>
                    </>}
                    {!improved && !reviewing && <button className="ai aiwide" onClick={runAIReview}>Run AI review</button>}
                  </>}
                </div>
              </div>
            )}
          </section>

          {/* ── Live preview: what the opponent sees ── */}
          <div className="previewcol">
            <section className="card preview" aria-label="Live preview: what your opponent sees">
              <div className="forge3d" ref={forgeHost} aria-hidden="true" />
              <div className="hd"><span className="kicker"><i />LIVE PREVIEW · OPPONENT VIEW</span>
                <button className="switch" role="switch" aria-checked={showKey} onClick={() => { setShowKey((s) => !s); play('click'); }}><i />Show answer key</button></div>
              <div className="stage" onPointerMove={tilt} onPointerLeave={untilt}>
                <div className="oppcard" ref={cardRef}>
                  <div className="bar"><span>YOU<br /><b>Opponent</b></span><span className="timer">1:30</span><span className="r">CREATOR<br /><b>{handle}</b></span></div>
                  <div className="q"><span className="chip">{label(topic).toUpperCase()} · {difficulty.toUpperCase()}</span>
                    <h2 className={question.trim() ? '' : 'ph'}>{question.trim() ? <Rich text={question} /> : 'Your question appears here…'}</h2></div>
                  <div className="oppopts">
                    {options.map((o, i) => <div key={i} className={`oppopt${o.trim() ? '' : ' ph'}${showKey && correctIdx === i ? ' key' : ''}`}><b>{L[i]}.</b>{o.trim() ? <Rich text={o} /> : `Option ${L[i]}`}</div>)}
                  </div>
                  <div className="lock">⚡ LOCK ANSWER</div>
                </div>
                <div className={`stamp${stamped ? ' on' : ''}`} aria-hidden={!stamped}>TRAP SET</div>
              </div>
              <div className="flash" />
              {!published && <div className="viewtag">{showKey ? 'Answer key shown. Rivals never see this.' : 'This is exactly what a rival sees'}</div>}
              {published && (
                <div className="done on" role="status">
                  <b>Forged and published.</b> Your trap is live in the {label(published.topic)} pool. You earn credits every time someone attempts it.
                  {published.id && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>ID: {published.id}</div>}
                  <div className="acts"><button className="btn" onClick={handleReset}>Forge another</button><button className="btn" onClick={() => navigate('/world')}>Back to World</button></div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      {toast && <div className={`toast${toast.type === 'error' ? ' error' : toast.type === 'warn' ? ' warn' : ''}`} role="status">{toast.msg}</div>}
    </div>
  );
}
