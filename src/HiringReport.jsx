import React, { useState, useRef, useEffect } from 'react';

const REC_COLORS = {
  'Strong Hire': '#00c896',
  'Hire':        '#4285f4',
  'Lean Hire':   '#f5c542',
  'No Hire':     '#ff4d4d',
};

const BENCHMARKS = {
  communicationScore:   72,
  problemSolvingScore:  68,
  behavioralScore:      74,
  technicalDepthScore:  65,
  aiCollaborationScore: 60,
};

// ─── Animated number counter ────────────────────────────────────────────────
function AnimNum({ val, color }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(val / 40);
    const t = setInterval(() => {
      start = Math.min(start + step, val);
      setCur(start);
      if (start >= val) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [val]);
  return <span style={{ color }}>{cur}</span>;
}

// ─── SVG Radar / Spider Chart ────────────────────────────────────────────────
function RadarChart({ scores, size = 200 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const dims = [
    { key:'communicationScore',   label:'Comms',     color:'#4285f4' },
    { key:'problemSolvingScore',  label:'Problem\nSolving', color:'#a855f7' },
    { key:'technicalDepthScore',  label:'Technical', color:'#ec4899' },
    { key:'aiCollaborationScore', label:'AI Collab', color:'#06b6d4' },
    { key:'behavioralScore',      label:'Behavior',  color:'#f59e0b' },
  ];
  const n = dims.length;
  const angleStep = (Math.PI * 2) / n;
  const angle = (i) => -Math.PI / 2 + i * angleStep;

  const pt = (i, pct) => ({
    x: cx + Math.cos(angle(i)) * r * (pct / 100),
    y: cy + Math.sin(angle(i)) * r * (pct / 100),
  });

  const labelPt = (i) => ({
    x: cx + Math.cos(angle(i)) * (r + 22),
    y: cy + Math.sin(angle(i)) * (r + 22),
  });

  // Polygon for candidate scores
  const candPts = dims.map((d, i) => pt(i, scores[d.key] ?? 0));
  const candPath = candPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Polygon for benchmark
  const benchPts = dims.map((d, i) => pt(i, BENCHMARKS[d.key] ?? 65));
  const benchPath = benchPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Grid rings
  const rings = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {/* Grid rings */}
      {rings.map(pct => {
        const gridPts = dims.map((_, i) => pt(i, pct));
        const gridPath = gridPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
        return <path key={pct} d={gridPath} fill="none" stroke="#1e2a3a" strokeWidth={0.8} />;
      })}

      {/* Axis lines */}
      {dims.map((_, i) => {
        const end = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#1e2a3a" strokeWidth={0.8} />;
      })}

      {/* Benchmark polygon */}
      <path d={benchPath} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeDasharray="4 3" />

      {/* Candidate polygon */}
      <path d={candPath} fill="rgba(66,133,244,0.15)" stroke="#4285f4" strokeWidth={2} />

      {/* Candidate dots */}
      {candPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={dims[i].color} stroke="#060912" strokeWidth={1.5} />
      ))}

      {/* Labels */}
      {dims.map((d, i) => {
        const lp = labelPt(i);
        const lines = d.label.split('\n');
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle">
            {lines.map((line, li) => (
              <tspan key={li} x={lp.x} dy={li === 0 ? (lines.length > 1 ? -6 : 0) : 12}
                style={{ fill: '#666', fontSize: 8, fontWeight: 600 }}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2} fill="#1e2a3a" />
    </svg>
  );
}

// ─── Score Bar (candidate vs benchmark) ──────────────────────────────────────
function ScoreBar({ label, value, color }) {
  const bench = BENCHMARKS[Object.keys(BENCHMARKS).find(k =>
    label.toLowerCase().replace(/\s/g,'').includes(k.replace('Score','').toLowerCase())
  )] ?? 68;
  const diff = value - bench;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: diff >= 0 ? '#00c896' : '#ff4d4d', fontWeight: 700 }}>
            {diff >= 0 ? '+' : ''}{diff}
          </span>
          <span style={{ fontSize: 13, fontWeight: 900, color }}>{value}</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 6, background: '#1e2a3a', borderRadius: 99 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${value}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
        <div style={{ position: 'absolute', top: -2, width: 2, height: 10, background: 'rgba(255,255,255,0.3)', borderRadius: 1, left: `${bench}%` }} />
      </div>
    </div>
  );
}

// ─── Action Bar ───────────────────────────────────────────────────────────────
function ActionBar({ report, sessionId }) {
  const [action, setAction] = useState(null);
  const recColor = REC_COLORS[report.hiringRecommendation] || '#a855f7';

  const actions = [
    { id: 'hire',    icon: '✅', label: 'Schedule next round', color: '#00c896', bg: '#00c89614' },
    { id: 'reject',  icon: '❌', label: 'Pass this candidate', color: '#ff4d4d', bg: '#ff4d4d14' },
    { id: 'hold',    icon: '⏸', label: 'Hold for review',     color: '#f5c542', bg: '#f5c54214' },
    { id: 'share',   icon: '📤', label: 'Share report',        color: '#4285f4', bg: '#4285f414' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 20 }}>
      {actions.map(a => (
        <button key={a.id} onClick={() => setAction(a.id)}
          style={{
            background: action === a.id ? a.bg : 'rgba(255,255,255,0.03)',
            border: `1px solid ${action === a.id ? a.color + '60' : '#1e2a3a'}`,
            borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all .2s',
          }}>
          <span style={{ fontSize: 14 }}>{a.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: action === a.id ? a.color : '#888' }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Confidence Meter ─────────────────────────────────────────────────────────
function ConfidenceMeter({ report }) {
  const scores = [
    report.communicationScore, report.problemSolvingScore,
    report.behavioralScore, report.technicalDepthScore, report.aiCollaborationScore,
  ].filter(Boolean);
  const variance = scores.length > 1
    ? Math.sqrt(scores.reduce((s, v) => s + Math.pow(v - (scores.reduce((a,b)=>a+b,0)/scores.length), 2), 0) / scores.length)
    : 0;
  const confidence = Math.max(30, Math.min(99, Math.round(95 - variance * 0.6)));
  const color = confidence >= 80 ? '#00c896' : confidence >= 60 ? '#f5c542' : '#ff4d4d';

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2a3a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: color + '18', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color }}>{confidence}%</span>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', marginBottom: 2 }}>AI Confidence Level</div>
        <div style={{ fontSize: 10, color: '#555', lineHeight: 1.4 }}>
          {confidence >= 80
            ? 'High confidence — consistent performance across all dimensions'
            : confidence >= 60
            ? 'Moderate confidence — some variance across dimensions'
            : 'Lower confidence — inconsistent signals, recommend human review'}
        </div>
      </div>
    </div>
  );
}

// ─── Red Flags ────────────────────────────────────────────────────────────────
function RedFlagPanel({ report }) {
  const flags = [];
  if (report.communicationScore   < 50) flags.push('Communication below acceptable threshold');
  if (report.technicalDepthScore  < 50) flags.push('Technical depth insufficient for role');
  if (report.problemSolvingScore  < 45) flags.push('Problem solving score critically low');
  if (report.aiCollaborationScore < 40) flags.push('Limited AI collaboration awareness');
  if (flags.length === 0) return null;

  return (
    <div style={{ background: '#ff4d4d08', border: '1px solid #ff4d4d33', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ color: '#ff4d4d', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        🚩 Red Flags
      </div>
      {flags.map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, color: '#ff6b6b', fontSize: 11 }}>
          <span style={{ flexShrink: 0 }}>→</span>{f}
        </div>
      ))}
    </div>
  );
}

// ─── Main Hiring Report Panel ─────────────────────────────────────────────────
export function HiringReportPanel({ report, company, interviewType, sessionId }) {
  const [tab, setTab] = useState('overview');

  if (!report) return null;
  const recColor = REC_COLORS[report.hiringRecommendation] || '#a855f7';

  const scoreDims = [
    { label: 'Communication',   key: 'communicationScore',   color: '#4285f4' },
    { label: 'Problem Solving', key: 'problemSolvingScore',  color: '#a855f7' },
    { label: 'Behavioral',      key: 'behavioralScore',      color: '#f59e0b' },
    { label: 'Technical Depth', key: 'technicalDepthScore',  color: '#ec4899' },
    { label: 'AI Collab',       key: 'aiCollaborationScore', color: '#06b6d4' },
  ];

  const TABS = ['overview', 'scores', 'feedback', 'actions'];

  return (
    <div style={{ background: '#060912', border: `1px solid ${recColor}40`, borderRadius: 16, overflow: 'hidden', marginBottom: 24, position: 'relative' }}>

      {/* Top gradient line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${recColor}, transparent)` }} />

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${recColor}18, ${recColor}06)`,
        borderBottom: `1px solid ${recColor}25`,
        padding: '18px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#444', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4, fontWeight: 700 }}>🧠 AI HIRING REPORT</div>
          <div style={{ color: recColor, fontSize: 22, fontWeight: 900, letterSpacing: '.02em' }}>{report.hiringRecommendation}</div>
          <div style={{ color: '#555', fontSize: 10, marginTop: 3 }}>{company} · {interviewType || 'Mock Interview'}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `${recColor}18`, border: `3px solid ${recColor}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${recColor}30`,
          }}>
            <span style={{ color: recColor, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>
              <AnimNum val={report.overallScore ?? 0} color={recColor} />
            </span>
            <span style={{ color: recColor, fontSize: 8, opacity: .7 }}>/ 100</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e2a3a', background: '#060912' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
              color: tab === t ? recColor : '#444',
              borderBottom: `2px solid ${tab === t ? recColor : 'transparent'}`,
              transition: 'all .2s',
            }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: '18px 20px' }}>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <>
            <ConfidenceMeter report={report} />
            <RedFlagPanel report={report} />

            {/* Executive summary */}
            <div style={{ background: '#0d1117', borderRadius: 10, padding: '13px 16px', marginBottom: 18, borderLeft: `3px solid ${recColor}` }}>
              <div style={{ color: '#333', fontSize: 9, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.1em', marginBottom: 6 }}>Executive Summary</div>
              <div style={{ color: '#bbb', fontSize: 12, lineHeight: 1.8 }}>{report.executiveSummary}</div>
            </div>

            {/* Radar + score bars side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <RadarChart scores={report} size={180} />
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 20, height: 2, background: '#4285f4' }} />
                    <span style={{ fontSize: 8, color: '#555' }}>Candidate</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.3)', borderTop: '1px dashed rgba(255,255,255,0.3)' }} />
                    <span style={{ fontSize: 8, color: '#555' }}>Avg pool</span>
                  </div>
                </div>
              </div>
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 9, color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>vs. Average Candidate</div>
                {scoreDims.map(d => report[d.key] != null && (
                  <ScoreBar key={d.key} label={d.label} value={report[d.key]} color={d.color} />
                ))}
              </div>
            </div>

            {/* Next steps */}
            {report.nextSteps && (
              <div style={{ background: '#a855f711', border: '1px solid #a855f730', borderRadius: 10, padding: '11px 14px' }}>
                <div style={{ color: '#a855f7', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>🎯 Recommended Next Steps</div>
                <div style={{ color: '#888', fontSize: 11, lineHeight: 1.7 }}>{report.nextSteps}</div>
              </div>
            )}
          </>
        )}

        {/* ── SCORES TAB ── */}
        {tab === 'scores' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 20 }}>
              {scoreDims.map(d => report[d.key] != null && (
                <div key={d.key} style={{ background: '#0d1117', border: `1px solid ${d.color}30`, borderRadius: 10, padding: '12px 8px', textAlign: 'center', borderTop: `3px solid ${d.color}` }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: d.color, lineHeight: 1, marginBottom: 4 }}>
                    <AnimNum val={report[d.key]} color={d.color} />
                  </div>
                  <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', lineHeight: 1.3 }}>{d.label}</div>
                  <div style={{ marginTop: 6, fontSize: 8, color: report[d.key] >= BENCHMARKS[d.key] ? '#00c896' : '#ff4d4d', fontWeight: 700 }}>
                    {report[d.key] >= BENCHMARKS[d.key] ? '↑' : '↓'} avg {BENCHMARKS[d.key]}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              {scoreDims.map(d => report[d.key] != null && (
                <ScoreBar key={d.key} label={d.label} value={report[d.key]} color={d.color} />
              ))}
            </div>
            <div style={{ background: '#0d1117', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#666' }}>Overall score vs benchmark</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: recColor }}>{report.overallScore}</div>
                  <div style={{ fontSize: 8, color: '#444' }}>Candidate</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#555' }}>68</div>
                  <div style={{ fontSize: 8, color: '#444' }}>Avg pool</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── FEEDBACK TAB ── */}
        {tab === 'feedback' && (
          <>
            {(report.strengths || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#00c896', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>✓ Strengths</div>
                {(report.strengths || []).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, padding: '8px 12px', background: '#00c89608', borderRadius: 8, border: '1px solid #00c89620' }}>
                    <span style={{ color: '#00c896', flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ color: '#bbb', fontSize: 12, lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {(report.improvements || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#f5c542', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>⚠ Areas to Improve</div>
                {(report.improvements || []).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, padding: '8px 12px', background: '#f5c54208', borderRadius: 8, border: '1px solid #f5c54220' }}>
                    <span style={{ color: '#f5c542', flexShrink: 0 }}>→</span>
                    <span style={{ color: '#bbb', fontSize: 12, lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {(report.evidenceNotes || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#4285f4', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>📋 Evidence Notes</div>
                {(report.evidenceNotes || []).map((note, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, padding: '7px 12px', background: '#4285f408', borderRadius: 8, border: '1px solid #4285f420' }}>
                    <span style={{ color: '#4285f4', flexShrink: 0, fontSize: 10, marginTop: 1 }}>•</span>
                    <span style={{ color: '#888', fontSize: 11, lineHeight: 1.6 }}>{note}</span>
                  </div>
                ))}
              </div>
            )}

            {report.feedback && (
              <div style={{ background: '#1a73e811', border: '1px solid #1a73e830', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ color: '#1a73e8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>💬 Detailed Feedback</div>
                <div style={{ color: '#aaa', fontSize: 12, lineHeight: 1.8 }}>{report.feedback}</div>
              </div>
            )}
          </>
        )}

        {/* ── ACTIONS TAB ── */}
        {tab === 'actions' && (
          <>
            <ActionBar report={report} sessionId={sessionId} />

            {/* Quick stats for decision */}
            <div style={{ background: '#0d1117', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 12 }}>Decision Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { icon: '🎯', label: 'Recommendation', val: report.hiringRecommendation, color: recColor },
                  { icon: '📊', label: 'Overall Score',  val: `${report.overallScore}/100`, color: recColor },
                  { icon: '✅', label: 'Pass Threshold', val: report.overallScore >= 70 ? 'Met' : 'Not Met', color: report.overallScore >= 70 ? '#00c896' : '#ff4d4d' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px', background: '#060912', borderRadius: 8, border: '1px solid #1e2a3a' }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: s.color, marginBottom: 2 }}>{s.val}</div>
                    <div style={{ fontSize: 8, color: '#444', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes box */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 6 }}>Recruiter Notes</div>
              <textarea
                placeholder="Add private notes about this candidate (not shared with candidate)..."
                style={{
                  width: '100%', boxSizing: 'border-box', height: 80,
                  background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 8,
                  padding: '10px 12px', color: '#e8e8e8', fontSize: 12, resize: 'vertical',
                  fontFamily: 'Arial, sans-serif', lineHeight: 1.6, outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => downloadHiringReportPDF({ report, company, interviewType, result: {} })}
              style={{
                width: '100%', padding: '12px 0',
                background: `linear-gradient(135deg, ${recColor}, ${recColor}80)`,
                border: 'none', borderRadius: 10, color: '#fff',
                cursor: 'pointer', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: `0 0 20px ${recColor}30`,
              }}
            >
              📄 Download Full PDF Report
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Download PDF (enhanced) ──────────────────────────────────────────────────
export function downloadHiringReportPDF({ report, company, interviewType, result }) {
  if (!report) return;
  const recColor = REC_COLORS[report.hiringRecommendation] || '#a855f7';

  const scoreRows = [
    { label: 'Overall',          val: report.overallScore,         color: recColor  },
    { label: 'Communication',    val: report.communicationScore,   color: '#4285f4' },
    { label: 'Problem Solving',  val: report.problemSolvingScore,  color: '#a855f7' },
    { label: 'Behavioral',       val: report.behavioralScore,      color: '#f59e0b' },
    { label: 'Technical Depth',  val: report.technicalDepthScore,  color: '#ec4899' },
    { label: 'AI Collaboration', val: report.aiCollaborationScore, color: '#06b6d4' },
  ].filter(s => s.val != null);

  const scoreHTML = scoreRows.map(s => {
    const bench = BENCHMARKS[Object.keys(BENCHMARKS).find(k => k.toLowerCase().includes(s.label.toLowerCase().replace(/\s/g,'').slice(0,6))) ?? ''] ?? 68;
    const diff = s.val - bench;
    return `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;color:#444;font-weight:600">${s.label}</span>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:10px;color:${diff>=0?'#059669':'#dc2626'};font-weight:700">${diff>=0?'+':''}${diff} vs avg</span>
          <span style="font-size:15px;font-weight:900;color:${s.color}">${s.val}</span>
        </div>
      </div>
      <div style="height:6px;background:#e5e7eb;border-radius:99px;position:relative;overflow:hidden">
        <div style="height:100%;width:${s.val}%;background:${s.color};border-radius:99px"></div>
      </div>
    </div>`;
  }).join('');

  const mkList = (arr, col) => (arr || []).map(s =>
    `<div style="display:flex;gap:8px;margin-bottom:6px;padding:7px 12px;background:${col}10;border-radius:6px;border-left:3px solid ${col}">
      <span style="color:${col};flex-shrink:0;font-weight:700">•</span>
      <span style="color:#333;font-size:12px;line-height:1.5">${s}</span>
    </div>`
  ).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Hiring Report — ${company}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,Arial,sans-serif;padding:48px;color:#111;background:#fff;max-width:800px;margin:0 auto}
    .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid ${recColor}}
    .rec{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:99px;font-weight:900;font-size:16px;background:${recColor}15;color:${recColor};border:2px solid ${recColor}}
    .score-circle{width:80px;height:80px;border-radius:50%;background:${recColor}15;border:3px solid ${recColor};display:flex;flex-direction:column;align-items:center;justify-content:center}
    .score-num{font-size:28px;font-weight:900;color:${recColor};line-height:1}
    .score-lbl{font-size:9px;color:${recColor};opacity:.7}
    .summary-box{background:#f9fafb;border-left:4px solid ${recColor};padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;font-size:13px;line-height:1.8;color:#374151}
    .sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin:24px 0 12px}
    .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:10px;display:flex;justify-content:space-between}
    @media print{body{padding:24px}@page{margin:1.5cm}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:22px;font-weight:700;color:#111;margin-bottom:4px">AI Hiring Report</div>
      <div style="font-size:13px;color:#6b7280">${company} · ${interviewType || 'Mock Interview'} · ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
      <div style="margin-top:12px"><span class="rec">${report.hiringRecommendation}</span></div>
    </div>
    <div class="score-circle"><span class="score-num">${report.overallScore}</span><span class="score-lbl">/100</span></div>
  </div>

  <div class="summary-box">${report.executiveSummary || ''}</div>

  <div class="sec-title">Score Breakdown</div>
  ${scoreHTML}

  ${(report.strengths||[]).length > 0 ? `<div class="sec-title">✓ Strengths</div>${mkList(report.strengths,'#059669')}` : ''}
  ${(report.improvements||[]).length > 0 ? `<div class="sec-title">⚠ Areas to Improve</div>${mkList(report.improvements,'#d97706')}` : ''}
  ${(report.evidenceNotes||[]).length > 0 ? `<div class="sec-title">📋 Evidence Notes</div>${mkList(report.evidenceNotes,'#2563eb')}` : ''}

  ${report.nextSteps ? `<div class="sec-title">🎯 Next Steps</div><p style="font-size:13px;color:#374151;line-height:1.8;padding:12px 16px;background:#f9fafb;border-radius:8px">${report.nextSteps}</p>` : ''}
  ${report.feedback  ? `<div class="sec-title">💬 Detailed Feedback</div><p style="font-size:13px;color:#374151;line-height:1.8">${report.feedback}</p>` : ''}

  <div class="footer">
    <span>EvoWorld AI Interview Platform</span>
    <span>Generated ${new Date().toISOString()}</span>
  </div>
  <script>window.onload=()=>window.print()</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}