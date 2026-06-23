import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

const EVENT_META = {
  webcam_snapshot: { icon: '📸', label: 'Webcam Snapshot', color: '#a855f7' },
  burst_event:     { icon: '⚡', label: 'Burst Typing',    color: '#f59e0b' },
  keystroke_stats: { icon: '⌨️', label: 'Keystroke Stats', color: '#1a73e8' },
  screen_blur:     { icon: '👁️', label: 'Left Screen',     color: '#ff4d4d' },
};

function fmtTime(ts) {
  if (!ts) return '--:--';
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return isNaN(d) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function InterviewReplay({ sessionId, displayColor = '#a855f7' }) {
  const [open,    setOpen]    = useState(false);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('chat');
  const [bigSnap, setBigSnap] = useState(null);

  const load = async () => {
    if (data || loading) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/mock-interview/${sessionId}/replay`);
      setData(res.data);
    } catch {
      setError('Replay data not available for this session.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  if (!sessionId) return null;

  const snapshots   = (data?.events || []).filter(e => e.type === 'webcam_snapshot');
  const intEvents   = (data?.events || []).filter(e => e.type !== 'webcam_snapshot');
  const chatLog     = data?.chatLog     || [];
  const submissions = data?.submissions || [];

  const TABS = [
    { id: 'chat',   label: '💬 Chat',        count: chatLog.length },
    { id: 'code',   label: '📝 Submissions', count: submissions.length },
    { id: 'webcam', label: '📸 Webcam',      count: snapshots.length },
    { id: 'events', label: '🔍 Integrity',   count: intEvents.length },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Toggle */}
      <button
        onClick={handleOpen}
        style={{ width: '100%', background: open ? `${displayColor}11` : '#060910', border: `1px solid ${open ? displayColor + '44' : '#1e2a3a'}`, borderRadius: open ? '12px 12px 0 0' : 12, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>▶</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: open ? displayColor : '#e8e8e8', fontSize: 13, fontWeight: 700 }}>Session Replay</div>
            <div style={{ color: '#555', fontSize: 10, marginTop: 1 }}>Chat transcript · Code submissions · Webcam · Integrity timeline</div>
          </div>
        </div>
        <span style={{ color: '#555', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ border: `1px solid ${displayColor}33`, borderTop: 'none', borderRadius: '0 0 12px 12px', background: '#060910', overflow: 'hidden' }}
          >
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1e2a3a' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex: 1, padding: '10px 0', background: tab === t.id ? `${displayColor}11` : 'transparent', border: 'none', borderBottom: tab === t.id ? `2px solid ${displayColor}` : '2px solid transparent', color: tab === t.id ? displayColor : '#555', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s' }}
                >
                  {t.label}
                  {t.count > 0 && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.6 }}>({t.count})</span>}
                </button>
              ))}
            </div>

            {/* States */}
            {loading && (
              <div style={{ padding: 32, textAlign: 'center', color: '#444', fontSize: 13 }}>⏳ Loading replay...</div>
            )}
            {error && (
              <div style={{ padding: 24, textAlign: 'center', color: '#ff6b6b', fontSize: 12 }}>{error}</div>
            )}

            {!loading && !error && data && (
              <div style={{ maxHeight: 440, overflowY: 'auto', padding: '14px 16px' }}>

                {/* ── Chat Tab ── */}
                {tab === 'chat' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {chatLog.length === 0 && (
                      <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: 24 }}>No chat transcript stored for this session.</div>
                    )}
                    {chatLog.map((m, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ color: '#2a3a4a', fontSize: 9, textAlign: m.role === 'candidate' ? 'right' : 'left', padding: '0 6px' }}>
                          {fmtTime(m.timestamp)} · {m.role === 'interviewer' ? '🤖 AI Interviewer' : '👤 You'}
                        </div>
                        <div style={{ alignSelf: m.role === 'candidate' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: m.role === 'candidate' ? `${displayColor}11` : '#1e2a3a', border: `1px solid ${m.role === 'candidate' ? displayColor + '33' : '#2a3645'}`, borderRadius: m.role === 'candidate' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 12px', color: m.role === 'candidate' ? '#e8e8e8' : '#c8c8c8', fontSize: 12, lineHeight: 1.65 }}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Code Submissions Tab ── */}
                {tab === 'code' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {submissions.length === 0 && (
                      <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: 24 }}>No code submissions found.</div>
                    )}
                    {submissions.map((s, i) => {
                      const passColor = s.allPassed ? '#00c896' : s.passed > 0 ? '#f5c542' : '#ff4d4d';
                      return (
                        <div key={i} style={{ background: '#0d1117', border: `1px solid ${passColor}33`, borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e2a3a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: passColor, fontSize: 14, fontWeight: 900 }}>{s.allPassed ? '✓' : '✗'}</span>
                              <span style={{ color: '#e8e8e8', fontSize: 12, fontWeight: 700 }}>{s.problemTitle || `Submission ${i + 1}`}</span>
                              <span style={{ background: '#1e2a3a', borderRadius: 6, padding: '1px 8px', color: '#888', fontSize: 10 }}>{s.language || 'python3'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ color: passColor, fontSize: 11, fontWeight: 700 }}>{s.passed}/{s.total} tests</span>
                              <span style={{ color: '#333', fontSize: 9 }}>{fmtTime(s.timestamp)}</span>
                            </div>
                          </div>
                          <pre style={{ margin: 0, padding: '12px 14px', color: '#88ffaa', fontSize: 11, fontFamily: '"Fira Code", "Courier New", monospace', lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 220, overflowY: 'auto', background: '#060910' }}>
                            {s.code || '// Code not stored'}
                          </pre>
                          {(s.tabSwitches > 0 || s.pasteCount > 0) && (
                            <div style={{ padding: '6px 14px', borderTop: '1px solid #1e2a3a', display: 'flex', gap: 8 }}>
                              {s.tabSwitches > 0 && <span style={{ color: '#f5c542', fontSize: 10 }}>🔀 {s.tabSwitches} tab switches</span>}
                              {s.pasteCount  > 0 && <span style={{ color: '#f5c542', fontSize: 10 }}>📋 {s.pasteCount} pastes</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Webcam Tab ── */}
                {tab === 'webcam' && (
                  <div>
                    {snapshots.length === 0 && (
                      <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: 24 }}>No webcam snapshots captured (camera may have been denied).</div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                      {snapshots.map((s, i) => {
                        const face = s.data?.faceDetected;
                        const isExpanded = bigSnap === i;
                        return (
                          <div key={i}
                            onClick={() => setBigSnap(isExpanded ? null : i)}
                            style={{ cursor: 'pointer', border: `2px solid ${isExpanded ? displayColor : face ? '#00c89644' : '#ff4d4d44'}`, borderRadius: 8, overflow: 'hidden', background: '#0d1117', transition: 'border-color 0.15s' }}
                          >
                            {s.data?.img
                              ? <img src={s.data.img} alt={`Snapshot ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                              : <div style={{ paddingBottom: '75%', background: '#1e2a3a', position: 'relative' }}><span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📷</span></div>
                            }
                            <div style={{ padding: '3px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: face ? '#00c896' : '#ff4d4d', fontSize: 8, fontWeight: 700 }}>{face ? '👤 Face' : '❌ No face'}</span>
                              <span style={{ color: '#333', fontSize: 8 }}>{fmtTime(s.timestamp)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {bigSnap !== null && snapshots[bigSnap]?.data?.img && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        style={{ background: '#0d1117', border: `1px solid ${displayColor}33`, borderRadius: 10, padding: 12, textAlign: 'center' }}
                      >
                        <div style={{ color: '#555', fontSize: 10, marginBottom: 8 }}>Snapshot #{bigSnap + 1} · {fmtTime(snapshots[bigSnap].timestamp)}</div>
                        <img src={snapshots[bigSnap].data.img} alt="Expanded snapshot" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #2a3645' }} />
                        {snapshots[bigSnap].data?.faceDetected !== undefined && (
                          <div style={{ marginTop: 8, color: snapshots[bigSnap].data.faceDetected ? '#00c896' : '#ff4d4d', fontSize: 11, fontWeight: 700 }}>
                            {snapshots[bigSnap].data.faceDetected ? '✓ Face detected' : '✗ Face not detected'}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ── Integrity Events Tab ── */}
                {tab === 'events' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {intEvents.length === 0 && (
                      <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: 24 }}>No integrity events logged.</div>
                    )}
                    {/* Summary counts */}
                    {intEvents.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
                        {Object.entries(EVENT_META).filter(([k]) => k !== 'webcam_snapshot').map(([type, meta]) => {
                          const count = intEvents.filter(e => e.type === type).length;
                          return (
                            <div key={type} style={{ background: '#0d1117', border: `1px solid ${meta.color}22`, borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                              <div style={{ fontSize: 16, marginBottom: 2 }}>{meta.icon}</div>
                              <div style={{ color: meta.color, fontSize: 14, fontWeight: 900 }}>{count}</div>
                              <div style={{ color: '#333', fontSize: 8, marginTop: 1 }}>{meta.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Event list */}
                    {intEvents.map((e, i) => {
                      const meta = EVENT_META[e.type] || { icon: '📌', label: e.type, color: '#888' };
                      return (
                        <div key={i} style={{ background: '#0d1117', border: `1px solid ${meta.color}22`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{meta.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                              <span style={{ color: meta.color, fontSize: 11, fontWeight: 700 }}>{meta.label}</span>
                              <span style={{ color: '#333', fontSize: 9 }}>{fmtTime(e.timestamp)}</span>
                            </div>
                            {e.type === 'screen_blur'     && <div style={{ color: '#666', fontSize: 10 }}>Away for {e.data?.duration}s</div>}
                            {e.type === 'burst_event'     && <div style={{ color: '#666', fontSize: 10 }}>Burst #{e.data?.burstCount} — rapid keystrokes detected</div>}
                            {e.type === 'keystroke_stats' && (
                              <div style={{ color: '#666', fontSize: 10 }}>
                                Avg interval: {e.data?.avgInterval}ms · Bursts: {e.data?.burstCount} · Idle bursts: {e.data?.idleBursts} · Sample: {e.data?.sampleSize}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}