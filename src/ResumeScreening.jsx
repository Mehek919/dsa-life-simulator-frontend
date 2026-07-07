import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

/**
 * ResumeScreening.jsx
 *
 * Standalone screen: paste/upload a resume, see the extracted profile,
 * then start a resume-aware interview session. On success it returns a
 * sessionId in the same shape your existing MockInterview flow expects,
 * so you can route straight into ArrivalSequence with it.
 *
 * Usage:
 *   <ResumeScreening
 *     user={user}
 *     onSessionStart={(session) => {
 *       // session = { sessionId, company, interviewType, duration, problems, resumeProfile }
 *       setCompany(session.company);
 *       setSession(session);
 *       setPhase('arrival');
 *     }}
 *   />
 */

const CONFIGS = {
  google:    { company:'Google',    logo:'🔍', color:'#4285f4' },
  amazon:    { company:'Amazon',    logo:'📦', color:'#ff9900' },
  meta:      { company:'Meta',      logo:'🌐', color:'#0081fb' },
  microsoft: { company:'Microsoft', logo:'🪟', color:'#00a4ef' },
  apple:     { company:'Apple',     logo:'🍎', color:'#a2aaad' },
  general:   { company:'General',   logo:'💻', color:'#a855f7' },
};

export default function ResumeScreening({ user, onSessionStart }) {
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [company, setCompany] = useState('general');
  const [parsing, setParsing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const config = CONFIGS[company] || CONFIGS.general;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError('');

    if (file.type === 'text/plain') {
      const text = await file.text();
      setResumeText(text);
    } else {
      setResumeText('');
      setError('PDF/DOC detected — please paste the resume text below instead of uploading, for best extraction accuracy.');
    }
  };

  const parseResume = async () => {
    if (resumeText.trim().length < 50) {
      setError('Paste more of the resume, at least a few sentences of real content.');
      return;
    }
    setError('');
    setParsing(true);
    setProfile(null);

    try {
      const res = await axios.post(`${API_BASE}/resume-screening/parse`, { resumeText });
      if (res.data.success) {
        setProfile(res.data.profile);
      } else {
        setError(res.data.error || 'Could not parse resume.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Resume parsing failed.');
    } finally {
      setParsing(false);
    }
  };

  const startInterview = async () => {
    if (!profile) return;
    setStarting(true);
    setError('');

    try {
      const res = await axios.post(`${API_BASE}/resume-screening/start`, {
        userId: user?.uid,
        company,
        profile,
      });
      if (res.data.success) {
        onSessionStart?.(res.data);
      } else {
        setError(res.data.error || 'Could not start interview.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to start interview.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8',
      fontFamily: 'Arial, sans-serif', padding: '40px 20px', display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{ maxWidth: 720, width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Resume Screening</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
            Paste your resume. The interviewer will ask about your actual projects, not generic questions.
          </p>
        </div>

        {/* Company picker */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          {Object.entries(CONFIGS).map(([key, c]) => (
            <button key={key} onClick={() => setCompany(key)}
              style={{
                background: company === key ? `${c.color}22` : '#0d1117',
                border: `1px solid ${company === key ? c.color + '66' : '#1e2a3a'}`,
                borderRadius: 10, color: company === key ? c.color : '#888',
                cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '8px 14px',
              }}>
              {c.logo} {c.company}
            </button>
          ))}
        </div>

        {/* Upload / paste area */}
        <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            background: '#060910', border: '1px dashed #2a3645', borderRadius: 10,
            padding: '12px 16px', marginBottom: 14,
          }}>
            <input type="file" accept=".txt,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleFile} />
            <span style={{ fontSize: 18 }}>📎</span>
            <span style={{ color: fileName ? '#e8e8e8' : '#666', fontSize: 13 }}>
              {fileName ? `✓ ${fileName}` : 'Upload a .txt file, or paste your resume below'}
            </span>
          </label>

          <textarea
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
            placeholder="Paste your full resume text here..."
            style={{
              width: '100%', minHeight: 180, resize: 'vertical', boxSizing: 'border-box',
              background: '#060910', border: '1px solid #1e2a3a', borderRadius: 10,
              padding: 14, color: '#e8e8e8', fontSize: 13, lineHeight: 1.6, outline: 'none',
            }}
          />

          {error && (
            <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 10, background: '#ff4d4d11', border: '1px solid #ff4d4d33', borderRadius: 8, padding: '8px 12px' }}>
              ⚠ {error}
            </div>
          )}

          <button
            onClick={parseResume}
            disabled={parsing || resumeText.trim().length < 50}
            style={{
              width: '100%', marginTop: 14, background: `linear-gradient(135deg, ${config.color}, ${config.color}bb)`,
              border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, padding: '12px 0',
              opacity: parsing || resumeText.trim().length < 50 ? 0.5 : 1,
            }}>
            {parsing ? '🔍 Reading resume...' : '🔍 Analyze Resume'}
          </button>
        </div>

        {/* Extracted profile */}
        <AnimatePresence>
          {profile && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: '#0d1117', border: `1px solid ${config.color}44`, borderRadius: 16, padding: 22 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 17, fontWeight: 900 }}>{profile.name || 'Candidate Profile'}</div>
                  <div style={{ color: config.color, fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                    {profile.seniorityLevel} · {profile.yearsExperience} years
                  </div>
                </div>
              </div>

              {profile.primarySkills?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: '#666', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Core Skills</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {profile.primarySkills.map(s => (
                      <span key={s} style={{ background: '#1e2a3a', borderRadius: 20, padding: '3px 10px', color: '#ccc', fontSize: 11 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.notableProjects?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: '#666', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Notable Projects</div>
                  {profile.notableProjects.map((p, i) => (
                    <div key={i} style={{ background: '#060910', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                      <div style={{ color: '#e8e8e8', fontSize: 12, fontWeight: 700 }}>{p.title}</div>
                      <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{p.summary}</div>
                    </div>
                  ))}
                </div>
              )}

              {profile.probeAreas?.length > 0 && (
                <div style={{ marginBottom: 18, background: `${config.color}08`, border: `1px solid ${config.color}22`, borderRadius: 10, padding: 12 }}>
                  <div style={{ color: config.color, fontSize: 10, fontWeight: 700, marginBottom: 6 }}>💡 THE INTERVIEWER WILL PROBE</div>
                  {profile.probeAreas.map((a, i) => (
                    <div key={i} style={{ color: '#999', fontSize: 11, marginBottom: 4, lineHeight: 1.5 }}>• {a}</div>
                  ))}
                </div>
              )}

              <button
                onClick={startInterview}
                disabled={starting}
                style={{
                  width: '100%', background: `linear-gradient(135deg, ${config.color}, ${config.color}bb)`,
                  border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer',
                  fontSize: 15, fontWeight: 800, padding: '14px 0',
                  opacity: starting ? 0.6 : 1,
                }}>
                {starting ? '⏳ Preparing interview room...' : `🚀 Start ${config.company} Interview from Resume`}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}