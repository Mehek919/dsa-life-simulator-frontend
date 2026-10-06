import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import './SubmissionHistory.css';

// ── Constants ──────────────────────────────────────────────────────────────────
const LANG_COLORS = {
  python3: '#35a3ff', python2: '#35a3ff', javascript: '#f7df1e', typescript: '#3178c6', java: '#ff9f43', cpp17: '#4c8dff', cpp14: '#4c8dff',
  c: '#9aa5ad', csharp: '#b18cff', go: '#00add8', rust: '#ff7a59', kotlin: '#a78bfa', swift: '#fa7343', ruby: '#ff5b6b',
};
const LANG_LABELS = {
  python3: 'Python 3', python2: 'Python 2', javascript: 'JavaScript', typescript: 'TypeScript', java: 'Java', cpp17: 'C++17', cpp14: 'C++14',
  c: 'C', csharp: 'C#', go: 'Go', rust: 'Rust', kotlin: 'Kotlin', swift: 'Swift', ruby: 'Ruby',
};
const DIFF_COLORS = { Easy: '#39ff88', Medium: '#f4b740', Hard: '#ff5b6b' };
const PER_PAGE = 20;
const DAY = 864e5;
const toDate = (ts) => (!ts ? null : ts._seconds != null ? new Date(ts._seconds * 1000) : ts.seconds != null ? new Date(ts.seconds * 1000) : new Date(ts));
// Local calendar day (the old heatmap used UTC, which put late-night submissions on the wrong day)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const level = (n) => (n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

function timeAgo(ts) {
  const date = toDate(ts); if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${Math.max(0, diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
const Stars = ({ count, max = 3 }) => <span className="stars" aria-label={`${count} of ${max} stars`}>{Array.from({ length: max }, (_, i) => <span key={i} className={i < count ? '' : 'off'}>★</span>)}</span>;
const Lang = ({ id }) => <span className="lang" style={{ '--lc': LANG_COLORS[id] || '#9fb0b6' }}>{LANG_LABELS[id] || id || 'Unknown'}</span>;

// ── Micro charts ──────────────────────────────────────────────────────────────
function Sparkline({ values, color }) {
  const max = Math.max(1, ...values), w = 132, h = 70, step = w / (values.length - 1);
  const pts = values.map((x, i) => `${(i * step).toFixed(1)},${(h - 6 - (x / max) * (h - 14)).toFixed(1)}`).join(' ');
  return <svg className="viz" viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}22`} stroke="none" /><polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 4px ${color})` }} /></svg>;
}
function Ring({ pct }) {
  const C = 2 * Math.PI * 34;
  return <svg className="ring" viewBox="0 0 86 86" aria-hidden="true"><circle className="bg" cx="43" cy="43" r="34" /><circle className="pg" cx="43" cy="43" r="34" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 43 43)" /><text x="43" y="43">{pct}%</text></svg>;
}

// ── Code viewer ───────────────────────────────────────────────────────────────
function CodeViewer({ sub, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement; if (closeRef.current) closeRef.current.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);
  return (
    <>
      <div className="shade" onClick={onClose} />
      <aside className="viewer" role="dialog" aria-modal="true" aria-labelledby="sh-vt">
        <header>
          <div><h2 id="sh-vt">{sub.problemTitle || 'Unknown problem'}</h2>
            <div className="meta"><Lang id={sub.language} /><span className={sub.allPassed ? 'ok' : 'bad'}>{sub.allPassed ? '✓ Accepted' : '✗ Failed'} · {sub.passed}/{sub.total} tests</span>{sub.allPassed && <Stars count={sub.stars || 0} />}</div></div>
          <button className="btn" ref={closeRef} onClick={onClose}>Close</button>
        </header>
        <div className="kv"><div>SUBMITTED<b style={{ fontSize: 14 }}>{timeAgo(sub.createdAt)}</b></div><div>HINTS USED<b style={{ fontSize: 14 }}>{sub.hintsUsed || 0}</b></div><div>DIFFICULTY<b style={{ fontSize: 14, color: DIFF_COLORS[sub.difficulty] || '#fff' }}>{sub.difficulty || '—'}</b></div></div>
        <pre>{sub.code || '// No code saved'}</pre>
      </aside>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SubmissionHistory({ user, userData }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');        // all | accepted | failed
  const [langFilter, setLangFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState('grid');           // grid | sky
  const [tip, setTip] = useState(null);               // { text, x, y }

  const fetchSubmissions = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    setLoading(true);
    try { const res = await axios.get(`${API_BASE}/submissions/${user.uid}`); setSubmissions(res.data.submissions || []); }
    catch (err) { console.error('Failed to fetch submissions:', err); }
    finally { setLoading(false); }
  }, [user?.uid]);
  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  // ── Stats ──
  const S = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const byDay = {}; submissions.forEach((s) => { const d = toDate(s.createdAt); if (d && !isNaN(d)) { const k = dayKey(d); byDay[k] = (byDay[k] || 0) + 1; } });
    const acc = submissions.filter((s) => s.allPassed);
    const solved = new Map(); acc.forEach((s) => solved.set(s.problemId, s.difficulty));
    const diff = { Easy: 0, Medium: 0, Hard: 0 }; solved.forEach((d) => { if (diff[d] != null) diff[d]++; });
    // Submission streak: consecutive days with a submission, ending today (or yesterday if nothing yet today)
    let streak = 0; const cur = new Date(today); if (!byDay[dayKey(cur)]) cur.setDate(cur.getDate() - 1);
    while (byDay[dayKey(cur)] && streak < 2000) { streak++; cur.setDate(cur.getDate() - 1); }
    const back = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
    const spark = Array.from({ length: 14 }, (_, i) => byDay[dayKey(back(13 - i))] || 0);
    const week = Array.from({ length: 7 }, (_, i) => ({ on: !!byDay[dayKey(back(6 - i))], label: back(6 - i).toLocaleDateString(undefined, { weekday: 'narrow' }) }));
    const langs = {}; submissions.forEach((s) => { const k = s.language || 'unknown'; langs[k] = (langs[k] || 0) + 1; });
    const best = Math.max(0, ...Object.values(byDay));
    const total = submissions.length;
    return { today, byDay, total, accepted: acc.length, rate: total ? Math.round((acc.length / total) * 100) : 0, solved: solved.size, diff, streak, spark, week, langs, best,
      tries: solved.size ? (total / solved.size).toFixed(1) : '—', activeDays: Object.keys(byDay).length };
  }, [submissions]);

  // ── Activity cells: 53 weeks, Monday first, local days ──
  const cells = useMemo(() => {
    const start = new Date(S.today); start.setDate(start.getDate() - 52 * 7); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const out = [];
    for (let w = 0; w < 53; w++) for (let r = 0; r < 7; r++) {
      const d = new Date(start); d.setDate(start.getDate() + w * 7 + r);
      const n = S.byDay[dayKey(d)] || 0;
      out.push({ d, n, w, r, fut: d > S.today, label: `${n} submission${n === 1 ? '' : 's'} · ${fmtDay.format(d)}` });
    }
    return out;
  }, [S]);
  const months = useMemo(() => { const m = []; let last = -1; for (let w = 0; w < 53; w++) { const mo = cells[w * 7].d.getMonth(); m.push(mo !== last ? cells[w * 7].d.toLocaleDateString(undefined, { month: 'short' }) : ''); last = mo; } return m; }, [cells]);
  const todayIdx = cells.findIndex((c) => dayKey(c.d) === dayKey(S.today));
  const [focusIdx, setFocusIdx] = useState(-1);
  const rovingIdx = focusIdx >= 0 ? focusIdx : todayIdx;
  const gridRef = useRef(null);
  const showTipFor = (el, c) => { const r = el.getBoundingClientRect(); setTip({ text: c.label, x: r.left + r.width / 2, y: r.top }); };
  const onGridKey = (e) => {
    const d = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key]; if (e.key === 'Escape') { setTip(null); return; } if (d == null) return;
    e.preventDefault(); const n = rovingIdx + d; if (!cells[n] || cells[n].fut) return; setFocusIdx(n);
    const el = gridRef.current && gridRef.current.querySelector(`[data-i="${n}"]`); if (el) el.focus();
  };
  useEffect(() => { const hide = () => setTip(null); window.addEventListener('scroll', hide, { passive: true }); return () => window.removeEventListener('scroll', hide); }, []);

  // ── 3D skyline (loaded only when asked for) ──
  const skyHost = useRef(null);
  useEffect(() => {
    if (view !== 'sky') return undefined;
    let sky = null, dead = false;
    import('./HistoryScene').then((m) => {
      if (dead || !skyHost.current) return;
      sky = m.mountSkyline(skyHost.current, cells.filter((c) => !c.fut), (c, x, y) => setTip(c ? { text: c.label, x, y: y - 6 } : null));
    }).catch(() => {});
    return () => { dead = true; if (sky) sky.destroy(); setTip(null); };
  }, [view, cells]);

  // ── Filtering + pagination ──
  const languages = [...new Set(submissions.map((s) => s.language).filter(Boolean))];
  const filtered = submissions.filter((s) => {
    if (filter === 'accepted' && !s.allPassed) return false;
    if (filter === 'failed' && s.allPassed) return false;
    if (langFilter !== 'all' && s.language !== langFilter) return false;
    if (search && !s.problemTitle?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const closeViewer = useCallback(() => setSelected(null), []);
  const handle = ((user?.displayName || 'dev').split(' ')[0] || 'dev').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev';
  const langMax = Math.max(1, ...Object.values(S.langs));

  return (
    <div className="sh">
      <div className="crt" aria-hidden="true" />
      <div className="page">
        <div className="top"><button className="btn" onClick={() => navigate(-1)}>&larr; Back</button><div className="path"><b>{handle}</b>@<i>evoworld</i>:~/history$</div></div>
        <span className="kicker"><i />SUBMISSION HISTORY</span>
        <h1>Every attempt, <span>on the record</span></h1>
        <p className="lede">Accepted, failed, and everything in between.</p>

        <div className="bento">
          {/* ── Analytics cards ── */}
          <div className="metrics">
            <section className="card m" style={{ '--c': '#35e0ff' }} aria-label={`Total submissions ${S.total}`}>
              <div><small>TOTAL SUBMISSIONS</small><b>{S.total}</b><span className="sub">{S.spark.reduce((a, b) => a + b, 0)} in the last 14 days</span></div><Sparkline values={S.spark} color="#35e0ff" />
            </section>
            <section className="card m" style={{ '--c': '#39ff88' }} aria-label={`Accepted ${S.accepted}, ${S.rate} percent acceptance rate`}>
              <div><small>ACCEPTED</small><b>{S.accepted}</b><span className="sub">{S.rate}% acceptance rate</span></div><Ring pct={S.rate} />
            </section>
            <section className="card m" style={{ '--c': '#b18cff' }} aria-label={`Problems solved ${S.solved}`}>
              <div><small>PROBLEMS SOLVED</small><b>{S.solved}</b><span className="sub">unique problems</span></div>
              <div aria-hidden="true"><div className="split">{S.solved ? ['Easy', 'Medium', 'Hard'].map((d) => <i key={d} style={{ width: `${(S.diff[d] / S.solved) * 100}%`, background: DIFF_COLORS[d] }} />) : <i style={{ width: '100%', background: 'rgba(255,255,255,.08)' }} />}</div>
                <div className="splitlab"><span>E {S.diff.Easy}</span><span>M {S.diff.Medium}</span><span>H {S.diff.Hard}</span></div></div>
            </section>
            <section className="card m" style={{ '--c': '#f4b740' }} aria-label={`Submission streak ${S.streak} days`}>
              <div><small>SUBMISSION STREAK</small><b>{S.streak}d</b><span className="sub">days in a row with a submission</span></div>
              <div aria-hidden="true"><div className="dots">{S.week.map((d, i) => <i key={i} className={d.on ? 'on' : ''} />)}</div><div className="dotlab">{S.week.map((d, i) => <span key={i}>{d.label}</span>)}</div></div>
            </section>
          </div>

          {/* ── Secondary column ── */}
          <div className="side">
            <section className="card s" aria-labelledby="sh-l"><h2 id="sh-l">languages</h2>
              <div className="bars">{Object.keys(S.langs).length ? Object.entries(S.langs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, n]) => (
                <div key={l}><span>{LANG_LABELS[l] || l}</span><span className="t"><i style={{ width: `${(n / langMax) * 100}%`, '--bc': LANG_COLORS[l] || '#35e0ff' }} /></span><span>{n}</span></div>
              )) : <div style={{ color: 'var(--muted)', display: 'block' }}>No submissions yet</div>}</div></section>
            <section className="card s" aria-labelledby="sh-k"><h2 id="sh-k">at a glance</h2>
              <div className="kv"><div>DAILY STREAK<b>{userData?.streak || 0}d</b></div><div>ACTIVE DAYS<b>{S.activeDays}</b></div><div>BEST DAY<b>{S.best}</b></div><div>TRIES / SOLVE<b>{S.tries}</b></div></div></section>
            <section className="card s" aria-labelledby="sh-r"><h2 id="sh-r">latest verdicts</h2>
              <ul className="recent">{submissions.length ? submissions.slice(0, 4).map((s) => <li key={s.id}><span>{s.problemTitle || 'Unknown problem'}</span><span className={s.allPassed ? 'ok' : 'bad'}>{s.allPassed ? '✓ Accepted' : '✗ Failed'}</span></li>) : <li style={{ color: 'var(--muted)' }}>Nothing yet</li>}</ul></section>
          </div>

          {/* ── Activity ── */}
          <section className="act" aria-labelledby="sh-act">
            <div className="acthd"><h2 id="sh-act">SUBMISSION ACTIVITY<span>{S.total} submissions on {S.activeDays} days in the last year</span></h2>
              <div className="seg" role="group" aria-label="Activity view"><button aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grid</button><button aria-pressed={view === 'sky'} onClick={() => setView('sky')}>3D skyline</button></div></div>
            {view === 'grid' ? (
              <div className="heat">
                <div className="months" aria-hidden="true"><span />{months.map((m, i) => <span key={i}>{m}</span>)}</div>
                <div className="grid" role="grid" aria-label="Submissions per day over the last year" ref={gridRef} onKeyDown={onGridKey} onPointerLeave={() => setTip(null)}>
                  {['Mon', '', 'Wed', '', 'Fri', '', ''].map((l, r) => <span key={`l${r}`} className="dlab" style={{ gridColumn: 1, gridRow: r + 1 }}>{l}</span>)}
                  {cells.map((c, i) => (
                    <button key={i} data-i={i} role="gridcell" className={`day l${level(c.n)}${c.fut ? ' future' : ''}`} style={{ gridColumn: c.w + 2, gridRow: c.r + 1 }}
                      tabIndex={i === rovingIdx ? 0 : -1} disabled={c.fut} aria-hidden={c.fut || undefined} aria-label={c.label}
                      onPointerEnter={(e) => showTipFor(e.currentTarget, c)} onFocus={(e) => { setFocusIdx(i); showTipFor(e.currentTarget, c); }} onBlur={() => setTip(null)}
                      onClick={(e) => { e.currentTarget.focus(); showTipFor(e.currentTarget, c); }} />
                  ))}
                </div>
              </div>
            ) : <div className="sky" ref={skyHost} style={{ height: 340 }} aria-label="3D view of submissions per day" />}
            <div className="legend"><span>Hover, tap or use arrow keys on a day for exact counts</span>
              <span>Less<span className="sw">{['rgba(255,255,255,.06)', '#0b4d33', '#11804f', '#22c271', '#39ff88'].map((c) => <i key={c} style={{ background: c }} />)}</span>More</span></div>
          </section>

          {/* ── List or portal ── */}
          <section className="listwrap" aria-label="Submissions">
            {loading ? <div className="rows">{[...Array(6)].map((_, i) => <div key={i} className="skel" />)}</div>
              : S.total === 0 ? (
                <div className="portal">
                  <svg viewBox="0 0 240 220" aria-hidden="true">
                    <defs><radialGradient id="sh-pg"><stop offset="0" stopColor="#a6f6ff" /><stop offset=".45" stopColor="#35e0ff" stopOpacity=".55" /><stop offset="1" stopColor="#35e0ff" stopOpacity="0" /></radialGradient></defs>
                    <ellipse cx="120" cy="200" rx="90" ry="12" fill="#35e0ff" opacity=".18" /><circle cx="120" cy="110" r="78" fill="url(#sh-pg)" />
                    <g className="ring1"><circle cx="120" cy="110" r="70" fill="none" stroke="#35e0ff" strokeWidth="2" strokeDasharray="10 8" /></g>
                    <g className="ring2"><circle cx="120" cy="110" r="54" fill="none" stroke="#39ff88" strokeWidth="2" strokeDasharray="4 10" /></g>
                    <text x="120" y="118" textAnchor="middle" fontFamily="monospace" fontSize="26" fontWeight="800" fill="#031014">&lt;/&gt;</text>
                  </svg>
                  <div><span className="kicker"><i />NO SUBMISSIONS YET</span><h3>Your record starts with one solve</h3>
                    <p>Every run and submit you make shows up here: verdicts, languages, streaks and a year of activity. Jump in with a problem you haven't solved yet.</p>
                    <button className="cta" onClick={() => navigate('/game')}>Browse unsolved problems</button><button className="btn" onClick={() => navigate('/roadmap')}>Open the Roadmap</button></div>
                </div>
              ) : (
                <>
                  <div className="filters" role="group" aria-label="Filter submissions">
                    {[['all', 'All'], ['accepted', '✓ Accepted'], ['failed', '✗ Failed']].map(([k, l]) => <button key={k} className="chip" aria-pressed={filter === k} onClick={() => { setFilter(k); setPage(1); }}>{l}</button>)}
                    {languages.length > 0 && <select className="langsel community-select" aria-label="Language" value={langFilter} onChange={(e) => { setLangFilter(e.target.value); setPage(1); }}>
                      <option value="all">All languages</option>{languages.map((l) => <option key={l} value={l}>{LANG_LABELS[l] || l}</option>)}</select>}
                    <input className="search" placeholder="Search problems" aria-label="Search problems" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    <span className="count">{filtered.length} submission{filtered.length === 1 ? '' : 's'}</span>
                  </div>
                  {filtered.length === 0 ? <div className="empty">No submissions match your filters.</div> : (
                    <>
                      <div className="rows">
                        {paginated.map((s) => (
                          <button key={s.id} className="row" onClick={() => setSelected(s)}>
                            <span className={`v ${s.allPassed ? 'ok' : 'bad'}`} aria-label={s.allPassed ? 'Accepted' : 'Failed'}>{s.allPassed ? '✓' : '✗'}</span>
                            <span>{s.problemTitle || 'Unknown problem'}<br /><small style={{ color: DIFF_COLORS[s.difficulty] || 'var(--muted)' }}>{s.difficulty || ''}</small>{s.allPassed && <> <Stars count={s.stars || 0} /></>}</span>
                            <span className="hide"><Lang id={s.language} /></span>
                            <span className="hide"><small className={s.allPassed ? 'ok' : 'bad'}>{s.passed}/{s.total} tests</small></span>
                            <span><small>{timeAgo(s.createdAt)}</small></span>
                          </button>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className="pager"><button className="btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>&larr; Prev</button>
                          <span>Page {page} of {totalPages}</span><button className="btn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next &rarr;</button></div>
                      )}
                    </>
                  )}
                </>
              )}
          </section>
        </div>
      </div>
      {tip && <div className="sh-tip" role="status" style={{ display: 'block', left: tip.x, top: tip.y }}>{tip.text}</div>}
      {selected && <CodeViewer sub={selected} onClose={closeViewer} />}
    </div>
  );
}
