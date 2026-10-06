import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
const CATS = { hiring: { label: 'HIRING', color: '#39ff88' }, skills: { label: 'SKILLS', color: '#b18cff' }, future: { label: 'FUTURE', color: '#35e0ff' }, companies: { label: 'COMPANIES', color: '#f4b740' } };
const ago = (iso) => { const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (!(m >= 0)) return ''; if (m < 60) return `${Math.max(1, m)}m ago`; if (m < 1440) return `${Math.floor(m / 60)}h ago`; return `${Math.floor(m / 1440)}d ago`; };
export default function IndustryFeed() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');          // loading | ready | error
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(null);                 // selected story
  const [insight, setInsight] = useState(null);
  const [iState, setIState] = useState('idle');           // idle | loading | ready | error
  const [iError, setIError] = useState('');
  const cache = useRef(new Map());
  const closeRef = useRef(null);

  const load = useCallback(async () => {
    setState('loading');
    try { const res = await axios.get(`${API_BASE}/industry/feed`); setItems(res.data.items || []); setState('ready'); }
    catch (e) { setState('error'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openStory = async (s) => {
    if (open?.id === s.id) { setOpen(null); return; }
    setOpen(s); setIError('');
    if (cache.current.has(s.id)) { setInsight(cache.current.get(s.id)); setIState('ready'); return; }
    setInsight(null); setIState('loading');
    try {
      const res = await axios.post(`${API_BASE}/industry/insight`, { id: s.id, title: s.title, source: s.source });
      cache.current.set(s.id, res.data.insight); setInsight(res.data.insight); setIState('ready');
    } catch (e) { setIError(e.response?.data?.error || 'Could not generate insights. Try again.'); setIState('error'); }
  };
  useEffect(() => {
    if (!open) return undefined;
    if (closeRef.current && window.matchMedia('(max-width: 900px)').matches) closeRef.current.focus();
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const shown = cat === 'all' ? items : items.filter((s) => s.cat === cat);
  const top = [...items].sort((a, b) => b.points - a.points).slice(0, 8);

  return (
    <section className="panel feed" aria-labelledby="of-feed">
      <div className="phd">
        <h2 id="of-feed"><i className="dot" />TECH INDUSTRY FEED</h2>
        <div className="ftabs" role="group" aria-label="Filter news">
          {[['all', 'All'], ['hiring', 'Hiring'], ['skills', 'Skills'], ['future', 'Future'], ['companies', 'Companies']].map(([k, l]) => (
            <button key={k} className="ftab" aria-pressed={cat === k} onClick={() => { setCat(k); setOpen(null); }}>{l}</button>
          ))}
        </div>
        <button className="btn" onClick={load} disabled={state === 'loading'}>↻ Refresh</button>
      </div>

      {top.length > 0 && (
        <div className="ticker" aria-hidden="true"><div className="ticker-in">
          {[...top, ...top].map((s, i) => <span key={i} className="tk"><b>▲ {s.points}</b>{s.title}</span>)}
        </div></div>
      )}

      {state === 'loading' && <div className="flist">{[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ minHeight: 64 }} />)}</div>}
      {state === 'error' && <div className="empty">Couldn't load industry news right now. <button className="btn" onClick={load} style={{ marginLeft: 8 }}>Try again</button></div>}
      {state === 'ready' && (
        <div className={`fbody${open ? ' open' : ''}`}>
          <div className="flist">
            {shown.length === 0 && <div className="empty">No recent stories in this category.</div>}
            {shown.map((s) => {
              const c = CATS[s.cat] || CATS.future;
              return (
                <button key={s.id} className="story" style={{ '--cc': c.color }} aria-pressed={open?.id === s.id} onClick={() => openStory(s)}>
                  <span className="cd" aria-hidden="true" />
                  <span>
                    <span className="smeta"><span className="cat">{c.label}</span><span>{s.source}</span><span>{ago(s.createdAt)}</span></span>
                    <h3>{s.title}</h3>
                    <span className="nums"><b>▲ {s.points}</b> points · {s.comments} comments · tap for prep insights</span>
                  </span>
                </button>
              );
            })}
          </div>

          {open && (
            <aside className="detail" aria-label="Prep insights for this story">
              <div className="dhd">
                <div className="row"><span className="cat" style={{ '--cc': (CATS[open.cat] || CATS.future).color }}>{(CATS[open.cat] || CATS.future).label}</span>
                  <button className="btn" ref={closeRef} onClick={() => setOpen(null)}>Close</button></div>
                <h3>{open.title}</h3>
                <div className="links"><a href={open.url} target="_blank" rel="noopener noreferrer">Read original ({open.source}) ↗</a><a href={open.discussionUrl} target="_blank" rel="noopener noreferrer">Discussion ↗</a></div>
              </div>
              <div className="dbody">
                <span className="aitag">✦ AI analysis of the headline · may be imperfect</span>
                {iState === 'loading' && <div aria-label="Generating insights">{[90, 70, 85, 60, 80, 50].map((w, i) => <div key={i} className="dskel" style={{ width: `${w}%` }} />)}</div>}
                {iState === 'error' && <div className="empty">{iError} <button className="btn" onClick={() => { const s = open; setOpen(null); setTimeout(() => openStory(s), 0); }}>Retry</button></div>}
                {iState === 'ready' && insight && (
                  <>
                    {insight.takeaway && <div className="take">{insight.takeaway}</div>}
                    <div className="sec"><small>KEY INSIGHTS FOR YOUR PREP</small>
                      {insight.insights.map((t, i) => <div key={i} className="ins"><b>{i + 1}.</b><span>{t}</span></div>)}</div>
                    {insight.tracks?.length > 0 && <div className="sec"><small>ROADMAP TRACKS TO FOCUS ON</small>
                      {insight.tracks.map((t) => <button key={t} className="trk" onClick={() => navigate('/roadmap')}>{t}</button>)}</div>}
                    {insight.actions?.length > 0 && <div className="sec"><small>DO IT IN EVOWORLD</small>
                      {insight.actions.map((a, i) => <button key={i} className="act" onClick={() => navigate(a.path)}><b>{a.title}</b>{a.body}</button>)}</div>}
                  </>
                )}
              </div>
            </aside>
          )}
        </div>
      )}
      <div className="fnote">Headlines: Hacker News, last 10 days, refreshed every 30 minutes.</div>
    </section>
  );
}
