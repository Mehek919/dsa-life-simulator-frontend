import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

const ADMIN_KEY = process.env.REACT_APP_ADMIN_KEY || '';

// ── Similarity Ring ────────────────────────────────────────────────────────────
function SimilarityRing({ pct, color, size = 60 }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={5} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <text
        x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
        fill={color} fontSize={11} fontWeight={900} fontFamily="Arial"
      >
        {pct}%
      </text>
    </svg>
  );
}

// ── Code Diff View ─────────────────────────────────────────────────────────────
function CodeDiffView({ pair, onClose }) {
  const [code1, setCode1] = useState('// Loading...');
  const [code2, setCode2] = useState('// Loading...');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        style={{
          background: '#0d1117', border: '1px solid #1e2a3a',
          borderRadius: 16, width: '100%', maxWidth: 900,
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1e2a3a',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ color: pair.riskColor, fontSize: 13, fontWeight: 700 }}>
              {pair.riskLabel}
            </div>
            <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>
              Problem: {pair.problemId} · Language: {pair.language}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SimilarityRing pct={pair.similarity} color={pair.riskColor} size={50} />
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        </div>

        {/* Side by side code */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
          {[
            { label: `Candidate: ${pair.user1}`, code: code1 },
            { label: `Candidate: ${pair.user2}`, code: code2 },
          ].map((side, i) => (
            <div key={i} style={{
              borderRight: i === 0 ? '1px solid #1e2a3a' : 'none',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{
                padding: '8px 14px', background: '#060910',
                borderBottom: '1px solid #1e2a3a', flexShrink: 0,
              }}>
                <span style={{ color: '#888', fontSize: 11 }}>{side.label}</span>
              </div>
              <pre style={{
                margin: 0, padding: '14px', overflow: 'auto', flex: 1,
                color: '#e8e8e8', fontSize: 12,
                fontFamily: '"Fira Code", monospace', lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {side.code}
              </pre>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main PlagiarismReport ──────────────────────────────────────────────────────
export default function PlagiarismReport({ assessmentId, onClose }) {
  const [running,  setRunning]  = useState(false);
  const [report,   setReport]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [error,    setError]    = useState('');

  const runCheck = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await axios.post(
        `${API_BASE}/plagiarism/check/${assessmentId}`,
        {},
        { headers: { 'x-admin-key': ADMIN_KEY } }
      );
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Plagiarism check failed.');
    } finally {
      setRunning(false);
    }
  };

  const riskCounts = report ? {
    HIGH:   report.pairs.filter(p => p.risk === 'HIGH').length,
    MEDIUM: report.pairs.filter(p => p.risk === 'MEDIUM').length,
    LOW:    report.pairs.filter(p => p.risk === 'LOW').length,
  } : {};

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{
          background: '#0d1117', border: '1px solid #1e2a3a',
          borderRadius: 20, padding: '28px',
          width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, color: '#e8e8e8', fontSize: 18, fontWeight: 800 }}>
              🔍 Plagiarism Detection
            </h2>
            <p style={{ margin: '4px 0 0', color: '#555', fontSize: 12 }}>
              Compares all submissions for structural and content similarity
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* How it works */}
        <div style={{
          background: '#1a73e811', border: '1px solid #1a73e822',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
        }}>
          {[
            { icon: '🔤', title: 'Token Analysis',    desc: 'Strips variable names, compares code structure' },
            { icon: '🔏', title: 'Fingerprinting',    desc: 'Detects copy-paste even with renames' },
            { icon: '📐', title: 'Edit Distance',     desc: 'Measures how different two solutions are' },
          ].map(m => (
            <div key={m.title} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
              <div style={{ color: '#c8c8c8', fontSize: 11, fontWeight: 600 }}>{m.title}</div>
              <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Run button */}
        {!report && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={runCheck}
            disabled={running}
            style={{
              width:        '100%',
              background:   running ? '#1e2a3a' : 'linear-gradient(135deg, #1a73e8, #0d47a1)',
              border:       'none', borderRadius: 10,
              color:        running ? '#444' : '#fff',
              cursor:       running ? 'not-allowed' : 'pointer',
              fontSize:     14, fontWeight: 700, padding: '12px 0',
              marginBottom: 16,
            }}
          >
            {running ? '🔍 Analyzing submissions...' : '🚀 Run Plagiarism Check'}
          </motion.button>
        )}

        {error && (
          <div style={{
            background: '#ff4d4d11', border: '1px solid #ff4d4d33',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            color: '#ff6b6b', fontSize: 12,
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {report && (
          <>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Checked',  value: report.totalChecked, color: '#1a73e8' },
                { label: '🚨 High',  value: riskCounts.HIGH,     color: '#ff4d4d' },
                { label: '⚠️ Medium',value: riskCounts.MEDIUM,   color: '#f5c542' },
                { label: '✅ Clean', value: report.totalChecked - report.flaggedPairs, color: '#00c896' },
              ].map(s => (
                <div key={s.label} style={{
                  background: '#060910', border: '1px solid #1e2a3a',
                  borderRadius: 10, padding: '10px', textAlign: 'center',
                }}>
                  <div style={{ color: s.color, fontSize: 20, fontWeight: 900 }}>{s.value}</div>
                  <div style={{ color: '#444', fontSize: 10, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {report.pairs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ color: '#00c896', fontSize: 16, fontWeight: 700 }}>No Plagiarism Detected</div>
                <div style={{ color: '#555', fontSize: 13, marginTop: 6 }}>
                  All {report.totalChecked} submissions appear to be original work.
                </div>
              </div>
            ) : (
              <>
                <div style={{ color: '#555', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Flagged Pairs ({report.pairs.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {report.pairs.map((pair, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelected(pair)}
                      style={{
                        display:      'flex',
                        alignItems:   'center',
                        gap:          12,
                        background:   '#060910',
                        border:       `1px solid ${pair.riskColor}33`,
                        borderRadius: 10,
                        padding:      '12px 16px',
                        cursor:       'pointer',
                        transition:   'all 0.2s',
                      }}
                    >
                      <SimilarityRing pct={pair.similarity} color={pair.riskColor} size={52} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: pair.riskColor, fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                          {pair.riskLabel}
                        </div>
                        <div style={{ color: '#888', fontSize: 11 }}>
                          {pair.user1.slice(0, 8)}... vs {pair.user2.slice(0, 8)}...
                        </div>
                        <div style={{ color: '#444', fontSize: 10, marginTop: 2 }}>
                          Problem: {pair.problemId} · {pair.language}
                        </div>
                      </div>

                      <span style={{ color: '#1a73e8', fontSize: 11, flexShrink: 0 }}>
                        View Code →
                      </span>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={runCheck}
              style={{
                marginTop:    16,
                width:        '100%',
                background:   'transparent',
                border:       '1px solid #1e2a3a',
                borderRadius: 8, color: '#555',
                cursor:       'pointer', fontSize: 12, padding: '8px 0',
              }}
            >
              🔄 Re-run Check
            </button>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {selected && (
          <CodeDiffView pair={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}