import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './InterviewSetup.css';
import { getPersona, REVIEWED } from './companyPersonas';

// Same values as CONFIGS in MockInterview.jsx (kept in sync by hand: update both if you change one).
// `duration` is the default round; per-round lengths and their sources live in companyPersonas.js.
const CONFIGS = {
  google:    { company: 'Google',    tick: 'GOOGL', color: '#4c8dff', duration: 45, desc: 'Structured: how you reason through an unfamiliar problem' },
  amazon:    { company: 'Amazon',    tick: 'AMZN',  color: '#ff9f43', duration: 55, desc: 'Leadership Principles + scalable, well-tested code' },
  meta:      { company: 'Meta',      tick: 'META',  color: '#3f8cff', duration: 35, desc: 'Fast pace: two problems in a short screen' },
  microsoft: { company: 'Microsoft', tick: 'MSFT',  color: '#35c4e6', duration: 45, desc: 'Clean, tested, bug-free code + corner cases' },
  apple:     { company: 'Apple',     tick: 'AAPL',  color: '#d7dde6', duration: 45, desc: 'Project deep dives + attention to detail' },
  general:   { company: 'General',   tick: 'GEN',   color: '#b18cff', duration: 60, desc: 'Mixed difficulty fundamentals' },
  // Enterprise Empire
  oracle:     { company: 'Oracle',     tick: 'ORCL',  color: '#f2564b', duration: 60, desc: 'Medium coding + design, Java/SQL fundamentals' },
  adobe:      { company: 'Adobe',      tick: 'ADBE',  color: '#ff5a4f', duration: 60, desc: 'DSA first, then core CS and design' },
  salesforce: { company: 'Salesforce', tick: 'CRM',   color: '#2fa8f0', duration: 60, desc: 'Technical skill + quality + company values' },
  broadcom:   { company: 'Broadcom',   tick: 'AVGO',  color: '#e0313f', duration: 60, desc: 'C, pointers, bits, memory and OS' },
  // FinTech Frontier
  stripe:      { company: 'Stripe',    tick: 'STRP',  color: '#8f86ff', duration: 45, problems: 1, desc: 'One practical problem that grows new requirements' },
  paypal:      { company: 'PayPal',    tick: 'PYPL',  color: '#3b8ff0', duration: 60, desc: 'DSA + language fundamentals, explain as you go' },
  'ant group': { company: 'Ant Group', tick: 'ANT',   color: '#1fbf6a', duration: 60, desc: 'Java, concurrency, microservices, databases' },
  adyen:       { company: 'Adyen',     tick: 'ADYEN', color: '#2bd17e', duration: 60, desc: 'Practical engineering, not LeetCode puzzles' },
  wise:        { company: 'Wise',      tick: 'WISE',  color: '#9fe870', duration: 60, problems: 1, desc: 'Pair programming on one real-world problem' },
  // Consulting Kingdom
  accenture: { company: 'Accenture', tick: 'ACN',   color: '#b47cff', duration: 20, problems: 1, desc: 'Short interview: basics, projects, communication' },
  tcs:       { company: 'TCS',       tick: 'TCS',   color: '#4f86f7', duration: 45, desc: 'Technical, managerial, then HR' },
  infosys:   { company: 'Infosys',   tick: 'INFY',  color: '#3fa3e0', duration: 60, desc: 'DSA + core CS, interrupted to test your thinking' },
  capgemini: { company: 'Capgemini', tick: 'CAP',   color: '#2bb7e8', duration: 30, problems: 1, desc: 'Basics and your resume, after the assessments' },
  cognizant: { company: 'Cognizant', tick: 'CTSH',  color: '#3d7bf0', duration: 45, desc: 'Coding, SQL, OOP and your projects' },
  // Silicon Frontier
  tesla:     { company: 'Tesla',     tick: 'TSLA',  color: '#ff4b4b', duration: 60, desc: 'Defend your past decisions, then live coding' },
  nvidia:    { company: 'NVIDIA',    tick: 'NVDA',  color: '#86c440', duration: 45, desc: 'C/C++, OS, concurrency and memory' },
  qualcomm:  { company: 'Qualcomm',  tick: 'QCOM',  color: '#4a7cff', duration: 60, desc: 'Embedded C, OS/RTOS, then your resume' },
  bosch:     { company: 'Bosch',     tick: 'BOSCH', color: '#ff5a5a', duration: 60, desc: 'C, OOP and data structures + project depth' },
  'li auto': { company: 'Li Auto',   tick: 'LI',    color: '#4fd1c5', duration: 60, desc: 'Algorithms + design for connected vehicles' },
};
// Company tabs on the setup screen, matching the districts of the World
const COMPANY_WORLDS = [
  { id: 'bigtech',    label: 'Big Tech',          keys: ['google', 'amazon', 'meta', 'microsoft', 'apple', 'general'] },
  { id: 'enterprise', label: 'Enterprise',        keys: ['oracle', 'adobe', 'salesforce', 'broadcom'] },
  { id: 'fintech',    label: 'FinTech',           keys: ['stripe', 'paypal', 'ant group', 'adyen', 'wise'] },
  { id: 'consulting', label: 'Consulting',        keys: ['accenture', 'tcs', 'infosys', 'capgemini', 'cognizant'] },
  { id: 'silicon',    label: 'Silicon',           keys: ['tesla', 'nvidia', 'qualcomm', 'bosch', 'li auto'] },
];
const worldOf = (key) => (COMPANY_WORLDS.find((w) => w.keys.includes(key)) || COMPANY_WORLDS[0]).id;
const coId = (key) => `iv-co-${key.replace(/\s+/g, '-')}`;
const problemCount = (key, round) => (round && round.problems) || CONFIGS[key]?.problems || (key === 'microsoft' ? 3 : 2);
// Rounds a company offers for this interview type. Screens only exist for coding; Amazon's Bar Raiser fits any company round.
const roundsFor = (key, type) => {
  const rounds = getPersona(key).rounds || [];
  return type === 'coding' || key === 'amazon' ? rounds : rounds.slice(-1);
};
const BASIS = {
  official: { label: 'Official sources', tip: 'Built mainly from what the company itself publishes, plus candidate reports where a point says "reported".' },
  reported: { label: 'Candidate reports', tip: 'The company publishes little, so this follows public candidate reports and prep guides.' },
  inspired: { label: 'Inspired by', tip: 'Very few public reports exist, so this interviewer is our best estimate.' },
};
const fmtReviewed = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function BasedOn({ companyKey }) {
  const p = getPersona(companyKey);
  const b = BASIS[p.basis];
  if (!b) return null;
  return (
    <details className="based">
      <summary><span className={`basis ${p.basis}`} title={b.tip}>{b.label}</span>How this {p.name} interviewer is built</summary>
      <p className="tip">{b.tip}</p>
      <ul>{p.facts.map((f) => <li key={f}>{f}</li>)}</ul>
      <div className="src"><b>Sources</b>{p.sources.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer">{x.label} ↗</a>)}</div>
      <p className="fine">Last reviewed {fmtReviewed(REVIEWED)}. Questions are original, not real {p.name} questions. Not affiliated with or endorsed by {p.name}.</p>
    </details>
  );
}
const TOPICS = ['Array', 'String', 'Linked List', 'Tree', 'Graph', 'DP', 'Hash Table', 'Stack', 'Heap', 'Binary Search', 'Sorting', 'Sliding Window', 'Matrix', 'DFS', 'BFS'];

// Your 16 modes (same ids and tiers), grouped by what the round tests
const GROUPS = [
  { key: 'core', name: 'CORE ENGINEERING', icon: '</>', color: '#35e0ff', scene: 'code', modes: [
    ['coding', 'Coding', 'DSA + live editor', 'Core'], ['technical-screening', 'Tech Screen', 'CS + resume scan', 'Fast'], ['frontend', 'Frontend', 'React + UI systems', 'UI'],
    ['db-debug', 'DB Debug', 'SQL + schema issues', 'Backend'], ['api-integration', 'API Design', 'REST + auth + scale', 'Backend']] },
  { key: 'sys', name: 'SYSTEMS & ARCHITECTURE', icon: '▦', color: '#f4b740', scene: 'diagram', modes: [
    ['system-design', 'System Design', 'Architecture round', 'Senior'], ['distributed-systems', 'Distributed Sys', 'CAP + sharding', 'Staff'], ['cloud-arch', 'Cloud Arch', 'AWS/GCP/K8s', 'Cloud']] },
  { key: 'ai', name: 'AI & SPECIALIZED', icon: '✦', color: '#ff6bd6', scene: 'chat', modes: [
    ['ai-fluency', 'AI Fluency', 'AI workflow skill', 'Future'], ['ai-native', 'AI-Native', 'Agent + multi-file', 'Elite'], ['autonomous', 'Autonomous AI', 'Adaptive full report', 'Elite'],
    ['personalized', 'Personalized', 'JD-based questions', 'Custom'], ['voice', 'Voice', 'Speak with AI', 'Live']] },
  { key: 'talk', name: 'BEHAVIORAL & LEADERSHIP', icon: '◉', color: '#39ff88', scene: 'talk', modes: [
    ['recruiter-call', 'Recruiter Call', '15-20 min screen', 'First'], ['behavioral', 'Behavioral', 'STAR + HR pressure', 'HR'], ['management-round', 'Management Round', 'Team fit + growth', 'Late']] },
];
const MODES = Object.fromEntries(GROUPS.flatMap((g) => g.modes.map(([id, label, desc, tier]) => [id, { id, label, desc, tier, group: g }])));
// Rounds where the chosen company is sent to the backend (every other round sends its own type as the company)
const COMPANY_ROUNDS = ['coding', 'system-design', 'behavioral'];
const estMinutes = (type, companyKey) => (type === 'coding' ? CONFIGS[companyKey].duration : type === 'recruiter-call' ? 18 : (type.includes('cloud') || type.includes('distributed')) ? 60 : 45);
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Monitor scenes ────────────────────────────────────────────────────────────
const SNIPPETS = {
  python: [['c', '# two-sum: one pass with a hash map'], [null, '<k>def</k> <f>two_sum</f>(nums, target):'], [null, '    seen = {}'], [null, '    <k>for</k> i, x <k>in</k> <f>enumerate</f>(nums):'],
    [null, '        <k>if</k> target - x <k>in</k> seen:'], [null, '            <k>return</k> [seen[target - x], i]'], [null, '        seen[x] = i']],
  jsx: [['c', '// debounced search box'], [null, '<k>function</k> <f>Search</f>({ onQuery }) {'], [null, '  <k>const</k> [q, setQ] = <f>useState</f>(\'\');'], [null, '  <f>useEffect</f>(() => {'],
    [null, '    <k>const</k> id = <f>setTimeout</f>(() => <f>onQuery</f>(q), 300);'], [null, '    <k>return</k> () => <f>clearTimeout</f>(id);'], [null, '  }, [q]);']],
  sql: [['c', '-- slow dashboard query: find the missing index'], [null, '<k>EXPLAIN ANALYZE</k>'], [null, '<k>SELECT</k> o.id, o.total'], [null, '<k>FROM</k> orders o'],
    [null, '<k>WHERE</k> o.customer_id = 42'], [null, '  <k>AND</k> o.created_at > now() - interval \'7 days\';'], ['c', '-- Seq Scan on orders (cost=0..48211)']],
  http: [['c', '// idempotent payment endpoint'], [null, '<k>POST</k> /v1/payments'], [null, 'Idempotency-Key: 7f3c-…'], [null, '<f>if</f> (await store.<f>seen</f>(key))'],
    [null, '  <k>return</k> store.<f>replay</f>(key);'], [null, '<k>const</k> res = await psp.<f>charge</f>(body);'], [null, 'await store.<f>save</f>(key, res);']],
};
const snippetFor = (type) => (type === 'frontend' ? 'jsx' : type === 'db-debug' ? 'sql' : type === 'api-integration' ? 'http' : 'python');
const colorize = (s) => s.replace(/<k>/g, '<span class="k">').replace(/<f>/g, '<span class="f">').replace(/<\/k>|<\/f>/g, '</span>');

function CodeScene({ type }) {
  const lines = SNIPPETS[snippetFor(type)];
  const [n, setN] = useState(reduceMotion() ? lines.length : 1);
  useEffect(() => {
    setN(reduceMotion() ? lines.length : 1);
    if (reduceMotion()) return undefined;
    const id = setInterval(() => setN((v) => (v >= lines.length + 3 ? 1 : v + 1)), 650);
    return () => clearInterval(id);
  }, [type, lines.length]);
  const done = n >= lines.length;
  return (
    <>
      <div className="code" dangerouslySetInnerHTML={{ __html: lines.slice(0, n).map(([c, l]) => (c ? `<span class="c">${l}</span>` : colorize(l))).join('\n') + '<span class="caret"></span>' }} />
      <div className="tests">{['test 1 · sample input', 'test 2 · edge cases', 'test 3 · large input'].map((t) => <div key={t} className={done ? 'ok' : 'pend'}>{done ? '✓' : '○'} {t}</div>)}</div>
    </>
  );
}
function DiagramScene() {
  return (
    <svg viewBox="0 0 400 200" style={{ width: '100%', height: '100%' }}>
      <path d="M70 100 H140" /><path d="M220 100 H260 V50 H290" /><path d="M220 100 H260 V150 H290" /><path d="M180 120 V170" />
      <rect x="10" y="80" width="60" height="40" /><text x="40" y="104">Client</text><rect x="140" y="80" width="80" height="40" /><text x="180" y="104">Gateway</text>
      <rect x="290" y="30" width="90" height="40" /><text x="335" y="54">Service A</text><rect x="290" y="130" width="90" height="40" /><text x="335" y="154">Service B</text>
      <rect x="140" y="170" width="80" height="26" /><text x="180" y="187">Cache</text>
    </svg>
  );
}
function ChatScene({ type }) {
  const msgs = type === 'personalized' ? ['Your JD asks for Kafka experience. Walk me through a consumer you built.', 'I owned the order-events pipeline: partitioned by customer ID…', 'How did you handle replays after an outage?']
    : type === 'voice' ? ['(speaking) Tell me how you would design a rate limiter.', '(you) I would start with a token bucket per user…', '(speaking) What happens across multiple servers?']
    : ['Refactor the payment module across 3 files. Keep the API stable.', 'Plan: extract a PaymentProvider interface, then migrate callers file by file.', 'How will you verify nothing broke?'];
  return (
    <>
      <div className="chat">{msgs.map((m, i) => <div key={`${type}-${i}`} className={`msg${i % 2 ? ' ai' : ''}`} style={{ animationDelay: `${i * 0.4}s` }}>{m}</div>)}</div>
      <div className="meter">AI ASSISTANCE TRACKED<div className="bar"><i /></div></div>
    </>
  );
}
function TalkScene({ type }) {
  const q = type === 'recruiter-call' ? '"Walk me through your background, and what are you looking for in your next role?"'
    : type === 'management-round' ? '"Tell me about a time you had to push back on a deadline. How did you handle it?"'
    : '"Tell me about a time you disagreed with your manager. What happened?"';
  return (
    <div className="talk">
      <div className="face" aria-hidden="true">◉</div>
      <div><div className="q">{q}</div>
        <div className="wave">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 7) * 0.09}s`, height: `${30 + ((i * 37) % 70)}%` }} />)}</div>
        <div className="star"><span>Situation</span><span>Task</span><span>Action</span><span>Result</span></div></div>
    </div>
  );
}

// ── Setup screen ──────────────────────────────────────────────────────────────
export default function InterviewSetup({ onStart, error }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('general');
  const [interviewType, setInterviewType] = useState('coding');
  const [topics, setTopics] = useState([]);
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [jdLoading, setJdLoading] = useState(false);
  const [realWorld, setRealWorld] = useState(false);
  const [aiAssistEnabled, setAiAssistEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [charged, setCharged] = useState(false);
  const [roundId, setRoundId] = useState(null);
  const [world, setWorld] = useState('bigtech');
  const worldKeys = (COMPANY_WORLDS.find((w) => w.id === world) || COMPANY_WORLDS[0]).keys;

  const mode = MODES[interviewType], group = mode.group, config = CONFIGS[selected];
  const usesCompany = COMPANY_ROUNDS.includes(interviewType);
  const rounds = usesCompany && selected !== 'general' ? roundsFor(selected, interviewType) : [];
  const round = rounds.find((r) => r.id === roundId) || rounds[0] || null;
  const minutes = round ? round.minutes : estMinutes(interviewType, selected);
  const needsJd = interviewType === 'personalized' && jdText.length < 50;
  const disabledStart = starting || needsJd;

  const toggleTopic = (t) => setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const startInterview = async () => {
    if (disabledStart) return;
    setStarting(true);
    const companyToSend = usesCompany ? selected : interviewType;   // same rule as before
    await onStart(companyToSend, topics, interviewType, jdText, interviewType === 'coding' && realWorld, aiAssistEnabled,
      round ? { stage: round.id, duration: round.minutes } : {});
    setStarting(false);
  };

  // 3D monitor follows the mouse (desktop only)
  const monRef = useRef(null);
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const onMove = (e) => {
      const m = monRef.current; if (!m || window.innerWidth <= 1050) return;
      const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      m.style.transform = `rotateY(${(-7 + x * 8).toFixed(2)}deg) rotateX(${(4 - y * 6).toFixed(2)}deg)`;
    };
    window.addEventListener('pointermove', onMove); return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const onCompanyKey = (e) => {
    const keys = worldKeys, i = Math.max(0, keys.indexOf(selected)), d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return; e.preventDefault(); const next = keys[(i + d + keys.length) % keys.length]; setSelected(next);
    const el = document.getElementById(coId(next)); if (el) el.focus();
  };

  const boosters = [interviewType === 'coding' && realWorld && 'Real-world', aiAssistEnabled && 'AI IDE'].filter(Boolean);
  const passNo = 'EVO-' + String((interviewType + selected).split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9000, 7) + 1000);
  const SHORT = { 'technical-screening': 'SCRN', frontend: 'UI', 'db-debug': 'DB', 'api-integration': 'API', 'distributed-systems': 'DIST', 'cloud-arch': 'CLOUD',
    'ai-fluency': 'AI', 'ai-native': 'AGENT', autonomous: 'AUTO', personalized: 'JD', voice: 'VOICE', 'recruiter-call': 'CALL', 'management-round': 'MGMT' };
  const routeTo = usesCompany ? config.tick : (SHORT[interviewType] || 'AI');
  const startLabel = starting ? 'BUILDING ROOM…' : needsJd ? 'PASTE JD FIRST' : `START ${mode.label.toUpperCase()}`;
  let step = 2;

  return (
    <div className="iv">
      <div className="crt" aria-hidden="true" />
      <div className="page">
        <div className="top"><button className="btn" onClick={() => navigate('/world')}>&larr; World</button><div className="path"><b>candidate</b>@<i>dsalifesimulator</i>:~/interview$</div></div>
        <span className="kicker"><i />AI INTERVIEW CHAMBER</span>
        <h1>Crack the <span>{mode.label}</span> round.</h1>
        <p className="lede">A cinematic mock interview with company-specific pressure, AI observation, real-world mode, tracked AI assistance, voice rounds and hiring-report style feedback.</p>

        <div className="split">
          <div>
            <section className="card" aria-labelledby="iv-s1">
              <div className="step"><h2 id="iv-s1"><b>01</b>CHOOSE YOUR ARENA</h2><span>{Object.keys(MODES).length} modes unlocked</span></div>
              {GROUPS.map((g) => (
                <div key={g.key} className="group" style={{ '--gc': g.color }}>
                  <div className="ghd" id={`iv-g-${g.key}`}><i aria-hidden="true">{g.icon}</i>{g.name}</div>
                  <div className="modes" role="group" aria-labelledby={`iv-g-${g.key}`}>
                    {g.modes.map(([id, label, desc, tier]) => (
                      <button key={id} className="mode" aria-pressed={interviewType === id} onClick={() => setInterviewType(id)}><span className="t">{tier.toUpperCase()}</span><b>{label}</b><small>{desc}</small></button>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {usesCompany && (
              <section className="card" aria-labelledby="iv-s2">
                <div className="step"><h2 id="iv-s2"><b>0{step++}</b>SELECT COMPANY</h2><span>{config.company} selected · {Object.keys(CONFIGS).length - 1} companies</span></div>
                <div className="worlds" role="tablist" aria-label="Company groups">
                  {COMPANY_WORLDS.map((w) => (
                    <button key={w.id} role="tab" className="world" aria-selected={world === w.id} onClick={() => setWorld(w.id)}>
                      {w.label}<i>{w.keys.filter((k) => k !== 'general').length}</i>{worldOf(selected) === w.id && world !== w.id && <span className="dot" aria-label="selected company is here" />}
                    </button>
                  ))}
                </div>
                <div className="cos" role="radiogroup" aria-labelledby="iv-s2" onKeyDown={onCompanyKey}>
                  {worldKeys.map((key) => [key, CONFIGS[key]]).map(([key, c]) => (
                    <button key={key} id={coId(key)} className="co" role="radio" aria-checked={selected === key} tabIndex={selected === key || (!worldKeys.includes(selected) && key === worldKeys[0]) ? 0 : -1} style={{ '--bc': c.color }} onClick={() => setSelected(key)}>
                      <span className="tick" aria-hidden="true">{c.tick}</span><b>{c.company}</b>
                      <small>{interviewType === 'coding' ? `${(roundsFor(key, 'coding')[0] || c).minutes || c.duration} min · ${problemCount(key, roundsFor(key, 'coding')[0])} problem${problemCount(key, roundsFor(key, 'coding')[0]) > 1 ? 's' : ''}` : 'Company-style round'}</small>
                      <span className="focus">{c.desc}</span>
                    </button>
                  ))}
                </div>
                {rounds.length > 1 && (
                  <div className="rounds" role="radiogroup" aria-label={`${config.company} round`}>
                    {rounds.map((r) => (
                      <button key={r.id} className="round" role="radio" aria-checked={round.id === r.id} onClick={() => setRoundId(r.id)}>
                        <b>{r.label}</b><span>{r.minutes} min{r.problems ? ` · ${r.problems} problems` : ''}</span>{r.note && <small>{r.note}</small>}
                      </button>
                    ))}
                  </div>
                )}
                {rounds.length === 1 && rounds[0].note && <p className="roundnote">{rounds[0].label}: {rounds[0].minutes} min{rounds[0].estimate ? ' (estimate)' : ''}. {rounds[0].note}.</p>}
                <BasedOn companyKey={selected} />
              </section>
            )}

            {interviewType === 'coding' && (
              <section className="card" aria-labelledby="iv-s3">
                <div className="step"><h2 id="iv-s3"><b>0{step++}</b>FOCUS TOPICS</h2><span>{topics.length ? `${topics.length} selected` : 'Optional · mixed if none'}</span></div>
                <div className="chips" role="group" aria-labelledby="iv-s3">{TOPICS.map((t) => <button key={t} className="chip" aria-pressed={topics.includes(t)} onClick={() => toggleTopic(t)}>{t}</button>)}</div>
              </section>
            )}

            {interviewType === 'personalized' && (
              <section className="card" aria-labelledby="iv-s3j">
                <div className="step"><h2 id="iv-s3j"><b>0{step++}</b>JOB DESCRIPTION</h2><span>Required</span></div>
                <label htmlFor="iv-jd" className="info" style={{ display: 'block', marginBottom: 10 }}>Paste a job description. The AI turns it into a role-specific interview with targeted questions.</label>
                <textarea id="iv-jd" className="jd" value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the full job description here…" />
                <div className="jdmeta"><span className={jdText.length >= 50 ? 'ok' : ''}>{jdText.length >= 50 ? '✓ Ready' : `${Math.max(0, 50 - jdText.length)} more characters needed`}</span><span>{jdText.length} characters</span></div>
                <label className="upload">
                  <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={async (e) => {
                    const file = e.target.files[0]; if (!file) return;
                    setJdFile(file); setJdLoading(true);
                    try { if (file.type === 'text/plain') setJdText(await file.text()); else setJdText(`[File: ${file.name}] Please paste the JD text here for best results.`); }
                    finally { setJdLoading(false); }
                  }} />
                  {jdLoading ? 'Reading file…' : jdFile ? `✓ ${jdFile.name}` : '📎 Upload JD file (TXT reads directly; paste PDF/DOC text)'}
                </label>
              </section>
            )}

            {interviewType !== 'coding' && interviewType !== 'personalized' && (
              <section className="card"><div className="info"><b>{mode.label} interview.</b> A focused simulation with adaptive AI probing, timed pressure, live notes, and a final hiring-style performance report.</div></section>
            )}

            <section className="card" aria-labelledby="iv-s4">
              <div className="step"><h2 id="iv-s4"><b>0{step++}</b>INTERVIEW BOOSTERS</h2><span>Optional</span></div>
              {interviewType === 'coding' && (
                <button className="boost" role="switch" aria-checked={realWorld} onClick={() => setRealWorld((r) => !r)}><span><b>Real-World Mode</b><small>Fresh company-style problems generated on demand.</small></span><span className="sw" /></button>
              )}
              <button className="boost" role="switch" aria-checked={aiAssistEnabled} onClick={() => setAiAssistEnabled((a) => !a)}><span><b>AI-Assisted IDE</b><small>AI usage gets tracked in the final report.</small></span><span className="sw" /></button>
              {error && <div className="err" role="alert">⚠ {error}</div>}
            </section>
          </div>

          <aside className="right" aria-label="Live simulator preview and your interview pass">
            <div className="stage">
              <div className="monitor" ref={monRef}>
                <div className="mhd"><span>LIVE SIMULATOR · PREVIEW</span><span className="rec">AI OBSERVER</span></div>
                <div className="screen" aria-hidden="true" style={{ '--sc': group.color }}>
                  <div className="hud"><span><b>{mode.label.toUpperCase()}</b> · {usesCompany ? config.company.toUpperCase() : 'ADAPTIVE'}</span><span>T-{minutes}:00</span></div>
                  <div className={`scene${group.scene === 'diagram' ? ' diagram' : ''}`}>
                    {group.scene === 'code' && <CodeScene type={interviewType} />}
                    {group.scene === 'diagram' && <DiagramScene />}
                    {group.scene === 'chat' && <ChatScene type={interviewType} />}
                    {group.scene === 'talk' && <TalkScene type={interviewType} />}
                  </div>
                </div>
              </div>
            </div>

            <div className={`pass${charged && !disabledStart ? ' charged' : ''}`} aria-label="Your interview pass">
              <div className="pmain">
                <div className="phd"><span>INTERVIEW PASS</span><b>{passNo}</b></div>
                <div className="route"><b>YOU</b><i /><b>{routeTo}</b></div>
                <div className="fields">
                  <div>MODE<b>{mode.label}</b></div><div>{round ? 'ROUND' : 'GATE'}<b>{round ? round.label : mode.tier}</b></div><div>TIMER<b>{interviewType === 'coding' ? `${minutes} min` : `~${minutes} min`}</b></div>
                  <div>PROBLEMS<b>{interviewType === 'coding' ? problemCount(selected, round) : 'AI-generated'}</b></div>
                  <div>TOPICS<b>{interviewType === 'coding' && topics.length ? topics.slice(0, 2).join(', ') + (topics.length > 2 ? ` +${topics.length - 2}` : '') : 'Mixed'}</b></div>
                  <div>BOOSTERS<b>{boosters.length ? boosters.join(' + ') : 'None'}</b></div>
                </div>
                <div className="barcode" aria-hidden="true" />
              </div>
              <div className="stub">
                <small>BOARDING</small>
                <button className="start" disabled={disabledStart} onClick={startInterview}
                  onPointerEnter={() => setCharged(true)} onPointerLeave={() => setCharged(false)} onFocus={() => setCharged(true)} onBlur={() => setCharged(false)}>
                  {startLabel.split(' ').length > 1 ? <>{startLabel.split(' ')[0]}<br />{startLabel.split(' ').slice(1).join(' ')}</> : startLabel}
                </button>
                <small>{interviewType === 'coding' ? `${minutes} MIN` : `~${minutes} MIN`}</small>
              </div>
            </div>
            <p className="proto">Your session tracks the timer, answers, AI usage, problem progress and a final hiring-readiness score.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
