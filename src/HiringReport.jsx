import React, { useRef } from 'react';

const RECOMMENDATION_COLORS = {
  'Strong Hire': '#00c896',
  'Hire':        '#4285f4',
  'Lean Hire':   '#f5c542',
  'No Hire':     '#ff4d4d',
};

function ScoreRing({ score, label, color, size = 70 }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition:'stroke-dasharray 1s ease' }} />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
          style={{ fill:color, fontSize:size*0.22, fontWeight:900, transform:'rotate(90deg)', transformOrigin:`${size/2}px ${size/2}px` }}>
          {score}
        </text>
      </svg>
      <span style={{ color:'#666', fontSize:9, textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'center', maxWidth:70 }}>{label}</span>
    </div>
  );
}

export function HiringReportPanel({ report, company, interviewType, sessionId }) {
  if (!report) return null;

  const recColor = RECOMMENDATION_COLORS[report.hiringRecommendation] || '#a855f7';
  const scores = [
    { label:'Communication',   value:report.communicationScore,   color:'#4285f4' },
    { label:'Problem Solving', value:report.problemSolvingScore,  color:'#a855f7' },
    { label:'Behavioral',      value:report.behavioralScore,      color:'#f59e0b' },
    { label:'Technical Depth', value:report.technicalDepthScore,  color:'#ec4899' },
    { label:'AI Collab',       value:report.aiCollaborationScore, color:'#1a73e8' },
  ];

  return (
    <div style={{ background:'#060910', border:`1px solid ${recColor}33`, borderRadius:14, overflow:'hidden', marginBottom:24 }}>
      {/* Recommendation header */}
      <div style={{ background:`linear-gradient(135deg, ${recColor}22, ${recColor}08)`, borderBottom:`1px solid ${recColor}33`, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ color:'#666', fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>🧠 AI Hiring Report</div>
          <div style={{ color:recColor, fontSize:20, fontWeight:900 }}>{report.hiringRecommendation}</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ color:recColor, fontSize:36, fontWeight:900, lineHeight:1 }}>{report.overallScore}</div>
          <div style={{ color:'#555', fontSize:9, textTransform:'uppercase' }}>Overall Score</div>
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* Executive summary */}
        <div style={{ background:'#0d1117', borderRadius:10, padding:'12px 14px', marginBottom:16, borderLeft:`3px solid ${recColor}` }}>
          <div style={{ color:'#444', fontSize:9, textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Executive Summary</div>
          <div style={{ color:'#c8c8c8', fontSize:12, lineHeight:1.7 }}>{report.executiveSummary}</div>
        </div>

        {/* Score rings */}
        <div style={{ display:'flex', justifyContent:'space-around', flexWrap:'wrap', gap:12, marginBottom:16, padding:'12px 0' }}>
          {scores.map(s => s.value != null && (
            <ScoreRing key={s.label} score={s.value} label={s.label} color={s.color} />
          ))}
        </div>

        {/* Strengths */}
        {(report.strengths||[]).length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ color:'#00c896', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>✓ Strengths</div>
            {report.strengths.map((s,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:6, padding:'6px 10px', background:'#00c89608', borderRadius:7, border:'1px solid #00c89622' }}>
                <span style={{ color:'#00c896', flexShrink:0, fontSize:11 }}>✓</span>
                <span style={{ color:'#c8c8c8', fontSize:11 }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Improvements */}
        {(report.improvements||[]).length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ color:'#f5c542', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>⚠ Areas to Improve</div>
            {report.improvements.map((s,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:6, padding:'6px 10px', background:'#f5c54208', borderRadius:7, border:'1px solid #f5c54222' }}>
                <span style={{ color:'#f5c542', flexShrink:0, fontSize:11 }}>→</span>
                <span style={{ color:'#c8c8c8', fontSize:11 }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Evidence notes */}
        {(report.evidenceNotes||[]).length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ color:'#4285f4', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>📋 Evidence Notes</div>
            {report.evidenceNotes.map((note,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:5, padding:'5px 10px', background:'#4285f408', borderRadius:6, border:'1px solid #4285f422' }}>
                <span style={{ color:'#4285f4', flexShrink:0, fontSize:10 }}>•</span>
                <span style={{ color:'#888', fontSize:10, lineHeight:1.5 }}>{note}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next steps */}
        {report.nextSteps && (
          <div style={{ background:'#a855f711', border:'1px solid #a855f733', borderRadius:10, padding:'10px 14px' }}>
            <div style={{ color:'#a855f7', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>🎯 Next Steps</div>
            <div style={{ color:'#888', fontSize:11, lineHeight:1.6 }}>{report.nextSteps}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function downloadHiringReportPDF({ report, company, interviewType, result }) {
  if (!report) return;
  const recColor = RECOMMENDATION_COLORS[report.hiringRecommendation] || '#a855f7';
  const scores = [
    { label:'Overall',         value:report.overallScore,         color:recColor  },
    { label:'Communication',   value:report.communicationScore,   color:'#4285f4' },
    { label:'Problem Solving', value:report.problemSolvingScore,  color:'#a855f7' },
    { label:'Behavioral',      value:report.behavioralScore,      color:'#f59e0b' },
    { label:'Technical Depth', value:report.technicalDepthScore,  color:'#ec4899' },
    { label:'AI Collaboration',value:report.aiCollaborationScore, color:'#1a73e8' },
  ];

  const scoreRows = scores.filter(s => s.value != null).map(s => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin-bottom:6px;background:#f8f9fa;border-radius:6px;border-left:3px solid ${s.color}">
      <span style="font-size:13px;color:#333">${s.label}</span>
      <span style="font-size:16px;font-weight:900;color:${s.color}">${s.value}/100</span>
    </div>`).join('');

  const strengthRows = (report.strengths||[]).map(s => `<li style="margin-bottom:4px;color:#2d6a4f">${s}</li>`).join('');
  const improvRows   = (report.improvements||[]).map(s => `<li style="margin-bottom:4px;color:#b45309">${s}</li>`).join('');
  const evidRows     = (report.evidenceNotes||[]).map(s => `<li style="margin-bottom:4px;color:#555">${s}</li>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Hiring Report — ${company}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #222; background: #fff; max-width: 820px; margin: 0 auto; }
    h1 { font-size: 24px; color: #111; margin-bottom: 4px; }
    .subtitle { color: #888; font-size: 13px; margin-bottom: 32px; }
    .rec-badge { display: inline-block; padding: 6px 18px; border-radius: 20px; font-weight: 900; font-size: 15px; background: ${recColor}22; color: ${recColor}; border: 2px solid ${recColor}; margin-bottom: 12px; }
    .summary-box { background: #f8f9fa; border-left: 4px solid ${recColor}; padding: 14px 18px; border-radius: 6px; margin-bottom: 28px; font-size: 13px; line-height: 1.7; color: #333; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin: 20px 0 10px; }
    ul { padding-left: 18px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; color: #aaa; font-size: 10px; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>AI Hiring Report</h1>
  <div class="subtitle">${company} • ${interviewType || 'Mock Interview'} • ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</div>

  <div class="rec-badge">${report.hiringRecommendation}</div>
  <div class="summary-box">${report.executiveSummary}</div>

  <div class="section-title">Score Breakdown</div>
  ${scoreRows}

  ${strengthRows ? `<div class="section-title">✓ Strengths</div><ul>${strengthRows}</ul>` : ''}
  ${improvRows   ? `<div class="section-title">⚠ Areas to Improve</div><ul>${improvRows}</ul>` : ''}
  ${evidRows     ? `<div class="section-title">📋 Evidence Notes</div><ul>${evidRows}</ul>` : ''}
  ${report.nextSteps ? `<div class="section-title">🎯 Next Steps</div><p style="font-size:13px;color:#555;line-height:1.7">${report.nextSteps}</p>` : ''}
  ${report.feedback  ? `<div class="section-title">💬 Detailed Feedback</div><p style="font-size:13px;color:#555;line-height:1.7">${report.feedback}</p>` : ''}

  <div class="footer">Generated by EvoWorld AI Interview Platform • ${new Date().toISOString()}</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}