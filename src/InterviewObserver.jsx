import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import API_BASE from './config';

// ── Live Observation Panel (during interview) ─────────────────────────────────
export function LiveObserverPanel({ sessionId, config, onClose }) {
  const [live,     setLive]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const intervalRef = useRef(null);
  const color = config?.color || '#a855f7';

  const fetchLive = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await axios.get(`${API_BASE}/mock-interview/${sessionId}/live`);
      setLive(res.data);
    } catch (e) { console.error('Live poll failed:', e); }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(fetchLive, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchLive]);

  if (loading) return (
    <div style={{ padding:20, color:'#555', fontSize:12, textAlign:'center' }}>Loading live data...</div>
  );
  if (!live) return null;

  const tabSw   = live.tabSwitches || 0;
  const paste   = live.pasteCount  || 0;
  const bursts  = (live.burstEvents || []).length;
  const blurs   = (live.screenBlurEvents || []).length;
  const snaps   = live.webcamSnapshots || [];
  const lastSnap = snaps[snaps.length - 1];
  const solved  = (live.submissions || []).filter(s => s.allPassed).length;

  const riskScore = Math.max(0, 100 - tabSw*5 - paste*4 - bursts*3 - blurs*3);
  const riskColor = riskScore >= 80 ? '#00c896' : riskScore >= 60 ? '#f5c542' : riskScore >= 40 ? '#ff9900' : '#ff4d4d';
  const riskLabel = riskScore >= 80 ? 'LOW' : riskScore >= 60 ? 'MEDIUM' : riskScore >= 40 ? 'HIGH' : 'CRITICAL';

  return (
    <div style={{ background:'#0d1117', border:`1px solid ${color}44`, borderRadius:16, overflow:'hidden', width:340 }}>
      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e2a3a', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#00c896', display:'inline-block', animation:'pulse 1.5s infinite' }} />
          <span style={{ color:color, fontSize:12, fontWeight:900 }}>LIVE OBSERVATION</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:'#555', fontSize:10 }}>auto-refresh 5s</span>
          {onClose && <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:16, padding:0 }}>✕</button>}
        </div>
      </div>

      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Integrity score */}
        <div style={{ background:'#060910', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ color:'#555', fontSize:9, textTransform:'uppercase', marginBottom:3 }}>Integrity Score</div>
            <div style={{ color:riskColor, fontSize:22, fontWeight:900 }}>{riskScore}</div>
          </div>
          <span style={{ background:riskColor+'22', border:`1px solid ${riskColor}44`, borderRadius:8, padding:'4px 10px', color:riskColor, fontSize:11, fontWeight:700 }}>{riskLabel} RISK</span>
        </div>

        {/* Progress */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {[
            { label:'Solved',   value:`${solved}/${live.problems?.length||0}`, color:'#00c896' },
            { label:'Score',    value:live.score||0,                            color:color      },
            { label:'AI Uses',  value:(live.aiUsageLog||[]).length,             color:'#1a73e8'  },
            { label:'Status',   value:live.status||'active',                    color:'#f5c542'  },
          ].map(s => (
            <div key={s.label} style={{ background:'#060910', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
              <div style={{ color:s.color, fontSize:15, fontWeight:900 }}>{s.value}</div>
              <div style={{ color:'#444', fontSize:9, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Integrity flags */}
        <div>
          <div style={{ color:'#444', fontSize:9, textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Integrity Signals</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {[
              { label:'Tab Switches',  value:tabSw,  warn:tabSw>3,   icon:'⇄' },
              { label:'Paste Events',  value:paste,  warn:paste>2,   icon:'📋' },
              { label:'Burst Typing',  value:bursts, warn:bursts>2,  icon:'⚡' },
              { label:'Screen Exits',  value:blurs,  warn:blurs>2,   icon:'👁' },
            ].map(f => (
              <div key={f.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 8px', background: f.warn ? '#ff4d4d08' : '#060910', borderRadius:6, border:`1px solid ${f.warn?'#ff4d4d22':'#1e2a3a'}` }}>
                <span style={{ color:f.warn?'#ff6b6b':'#555', fontSize:11 }}>{f.icon} {f.label}</span>
                <span style={{ color:f.warn?'#ff4d4d':'#444', fontSize:12, fontWeight:700 }}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Webcam latest */}
        {lastSnap && (
          <div>
            <div style={{ color:'#444', fontSize:9, textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Latest Webcam Snapshot</div>
            <div style={{ position:'relative', borderRadius:8, overflow:'hidden', border:'1px solid #1e2a3a' }}>
              <img src={lastSnap.img} alt="webcam" style={{ width:'100%', display:'block' }} />
              <div style={{ position:'absolute', bottom:4, left:6, background:'#00000088', borderRadius:4, padding:'2px 6px', display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:lastSnap.faceDetected?'#00c896':'#ff4d4d', display:'inline-block' }} />
                <span style={{ color:'#fff', fontSize:9 }}>{lastSnap.faceDetected ? 'Face detected' : 'No face'} • {new Date(lastSnap.ts).toLocaleTimeString()}</span>
              </div>
            </div>
            <div style={{ color:'#333', fontSize:9, marginTop:4, textAlign:'center' }}>
              {snaps.filter(s => !s.faceDetected).length} of {snaps.length} snapshots had no face
            </div>
          </div>
        )}
        {!lastSnap && (
          <div style={{ background:'#060910', borderRadius:8, padding:'12px', textAlign:'center', color:'#333', fontSize:11 }}>
            📷 No webcam snapshots yet
          </div>
        )}

        {/* Problems live */}
        {(live.problems||[]).length > 0 && (
          <div>
            <div style={{ color:'#444', fontSize:9, textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Problems</div>
            {live.problems.map(p => {
              const sub = (live.submissions||[]).find(s => s.problemId === p.id);
              const dc  = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' }[p.difficulty]||'#888';
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 8px', background:'#060910', borderRadius:6, marginBottom:4 }}>
                  <div>
                    <span style={{ color:'#e8e8e8', fontSize:11 }}>{p.title}</span>
                    <span style={{ color:dc, fontSize:9, marginLeft:6 }}>{p.difficulty}</span>
                  </div>
                  <span style={{ color:sub?.allPassed?'#00c896':sub?'#f5c542':'#333', fontSize:10, fontWeight:700 }}>
                    {sub?.allPassed ? '✓ Solved' : sub ? `${sub.passed}/${sub.total}` : 'Not started'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Full Integrity Report (result screen) ─────────────────────────────────────
export function IntegrityReport({ sessionId, displayColor }) {
  const [report,  setReport]  = useState(null);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapIdx, setSnapIdx] = useState(0);

  const fetchReport = async () => {
    if (report || !sessionId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/mock-interview/${sessionId}/integrity-report`);
      setReport(res.data);
    } catch (e) { console.error('Integrity report fetch failed:', e); }
    finally { setLoading(false); }
  };

  const toggle = () => {
    if (!open) fetchReport();
    setOpen(o => !o);
  };

  const color = displayColor || '#a855f7';
  const snaps = report?.webcamSnapshots || [];

  return (
    <div style={{ marginBottom:24 }}>
      <button onClick={toggle}
        style={{ width:'100%', background:open?'#ff4d4d11':'#060910', border:`1px solid ${open?'#ff4d4d44':'#1e2a3a'}`, borderRadius:12, padding:'12px 16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all 0.2s' }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🔍</span>
          <div style={{ textAlign:'left' }}>
            <div style={{ color:open?'#ff6b6b':'#e8e8e8', fontSize:13, fontWeight:700 }}>AI Integrity Report</div>
            <div style={{ color:'#555', fontSize:10, marginTop:1 }}>Tab switching • Paste • Webcam • Keystroke patterns • Screen monitoring</div>
          </div>
        </div>
        <span style={{ color:'#555', fontSize:12 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ border:'1px solid #ff4d4d33', borderTop:'none', borderRadius:'0 0 12px 12px', background:'#060910', overflow:'hidden' }}>
          {loading && <div style={{ padding:24, textAlign:'center', color:'#555', fontSize:12 }}>Loading integrity report...</div>}

          {report && (
            <div style={{ padding:'16px' }}>
              {/* Score header */}
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16, padding:'14px', background:'#0d1117', borderRadius:10 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ color:report.riskColor, fontSize:32, fontWeight:900 }}>{report.integrityScore}</div>
                  <div style={{ color:'#555', fontSize:9, textTransform:'uppercase' }}>Integrity Score</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ background:report.riskColor+'22', border:`1px solid ${report.riskColor}44`, borderRadius:8, padding:'3px 10px', color:report.riskColor, fontSize:12, fontWeight:700 }}>{report.riskLevel} RISK</span>
                    {report.plagiarismFlag && <span style={{ background:'#ff4d4d22', border:'1px solid #ff4d4d44', borderRadius:8, padding:'3px 10px', color:'#ff4d4d', fontSize:11, fontWeight:700 }}>🚩 PLAGIARISM</span>}
                  </div>
                  <div style={{ width:'100%', height:6, background:'#1e2a3a', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${report.integrityScore}%`, height:'100%', background:report.riskColor, borderRadius:3, transition:'width 0.8s ease' }} />
                  </div>
                </div>
              </div>

              {/* Signal grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:14 }}>
                {[
                  { label:'Tab Switches',  value:report.tabSwitches,             icon:'⇄',  warn:report.tabSwitches>3  },
                  { label:'Paste Events',  value:report.pasteCount,              icon:'📋', warn:report.pasteCount>2   },
                  { label:'Burst Typing',  value:(report.burstEvents||[]).length, icon:'⚡', warn:(report.burstEvents||[]).length>2 },
                  { label:'Screen Exits',  value:(report.screenBlurs||[]).length, icon:'👁', warn:(report.screenBlurs||[]).length>2 },
                  { label:'No-Face Snaps', value:(report.webcamSnapshots||[]).filter(s=>!s.faceDetected).length, icon:'📷', warn:(report.webcamSnapshots||[]).filter(s=>!s.faceDetected).length>2 },
                  { label:'AI Requests',   value:(report.aiUsage||[]).length,     icon:'✨', warn:(report.aiUsage||[]).length>5 },
                ].map(s => (
                  <div key={s.label} style={{ background:s.warn?'#ff4d4d08':'#0d1117', border:`1px solid ${s.warn?'#ff4d4d22':'#1e2a3a'}`, borderRadius:8, padding:'8px', textAlign:'center' }}>
                    <div style={{ color:s.warn?'#ff6b6b':'#e8e8e8', fontSize:16, fontWeight:900 }}>{s.icon} {s.value}</div>
                    <div style={{ color:'#444', fontSize:8, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Flags */}
              {(report.flags||[]).length > 0 && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ color:'#ff4d4d', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>⚠ Flags</div>
                  {report.flags.map((f,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', background:'#0d1117', borderRadius:7, marginBottom:4, border:`1px solid ${f.severity==='high'?'#ff4d4d33':f.severity==='medium'?'#f5c54233':'#1e2a3a'}` }}>
                      <span style={{ color:f.severity==='high'?'#ff4d4d':f.severity==='medium'?'#f5c542':'#888', fontSize:10, fontWeight:700, flexShrink:0 }}>{f.type}</span>
                      <span style={{ color:'#666', fontSize:10, flex:1 }}>{f.desc}</span>
                      <span style={{ background:f.severity==='high'?'#ff4d4d22':f.severity==='medium'?'#f5c54222':'#1e2a3a', color:f.severity==='high'?'#ff4d4d':f.severity==='medium'?'#f5c542':'#555', borderRadius:4, padding:'1px 6px', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>{f.severity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Webcam snapshots strip */}
              {snaps.length > 0 && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ color:'#444', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>📷 Webcam Snapshots ({snaps.length})</div>
                  <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
                    {snaps.map((s,i) => (
                      <div key={i} onClick={() => setSnapIdx(i)}
                        style={{ position:'relative', flexShrink:0, width:80, height:60, borderRadius:6, overflow:'hidden', border:`2px solid ${snapIdx===i?'#a855f7':s.faceDetected?'#1e2a3a':'#ff4d4d44'}`, cursor:'pointer' }}
                      >
                        <img src={s.img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        {!s.faceDetected && <div style={{ position:'absolute', inset:0, background:'#ff4d4d22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>👤</div>}
                      </div>
                    ))}
                  </div>
                  {snaps[snapIdx] && (
                    <div style={{ marginTop:8, background:'#0d1117', borderRadius:8, overflow:'hidden', position:'relative' }}>
                      <img src={snaps[snapIdx].img} alt="" style={{ width:'100%', display:'block' }} />
                      <div style={{ position:'absolute', bottom:6, left:8, background:'#00000088', borderRadius:4, padding:'2px 8px', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:snaps[snapIdx].faceDetected?'#00c896':'#ff4d4d', display:'inline-block' }} />
                        <span style={{ color:'#fff', fontSize:9 }}>{snaps[snapIdx].faceDetected ? 'Face detected' : 'No face'} • {new Date(snaps[snapIdx].ts).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Keystroke stats */}
              {report.keystrokeStats && (
                <div style={{ background:'#0d1117', borderRadius:8, padding:'10px 12px', marginBottom:14 }}>
                  <div style={{ color:'#444', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>⌨ Keystroke Analysis</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                    {[
                      { label:'Avg Interval', value:`${report.keystrokeStats.avgInterval||0}ms` },
                      { label:'Burst Count',  value:report.keystrokeStats.burstCount||0 },
                      { label:'Idle-Bursts',  value:report.keystrokeStats.idleBursts||0 },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign:'center' }}>
                        <div style={{ color:'#e8e8e8', fontSize:13, fontWeight:700 }}>{s.value}</div>
                        <div style={{ color:'#444', fontSize:8, marginTop:1 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.flags?.length === 0 && (
                <div style={{ textAlign:'center', color:'#00c896', fontSize:12, padding:'8px 0' }}>
                  ✓ No integrity concerns detected
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}