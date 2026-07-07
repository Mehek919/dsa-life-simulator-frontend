import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
const STAGE_LABELS = {
  'recruiter-call': { label: 'Recruiter Call', color: '#38d9a9', icon: '📞' },
  'technical-screening': { label: 'Technical Screen', color: '#10b981', icon: '📋' },
  onsite: { label: 'Onsite Rounds', color: '#a855f7', icon: '🏢' },
  decision: { label: 'Decision', color: '#f5c542', icon: '⚖️' },
};
const COMPANY_FILTERS = ['All', 'Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'General'];
export default function RecruiterDashboard({ user, userData }) {
  const [pipeline, setPipeline] = useState(null);
  const [companyFilter, setCompanyFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scheduleModalFor, setScheduleModalFor] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [view, setView] = useState('pipeline');

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = companyFilter !== 'All' ? { company: companyFilter } : {};
      const res = await axios.get(`${API_BASE}/recruiter/pipelines`, { params });
      if (res.data.success) setPipeline(res.data.pipeline);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [companyFilter]);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/recruiter/schedule`, {
        params: { recruiterId: user?.uid },
      });
      if (res.data.success) setSchedule(res.data.schedule);
    } catch (e) {
      console.error('Schedule fetch failed:', e.message);
    }
  }, [user?.uid]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);
  useEffect(() => { if (view === 'schedule') fetchSchedule(); }, [view, fetchSchedule]);

  const openCandidate = async (candidate) => {
    setSelectedCandidate(candidate);
    setDetailLoading(true);
    setCandidateDetail(null);
    try {
      const res = await axios.get(`${API_BASE}/recruiter/candidate/${candidate.userId}`);
      if (res.data.success) setCandidateDetail(res.data);
    } catch (e) {
      console.error('Candidate detail fetch failed:', e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8', fontFamily: 'Arial, sans-serif', padding: '28px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Recruiter Dashboard</h1>
            <p style={{ margin: '6px 0 0', color: '#666', fontSize: 13 }}>
              Pipelines, scheduling, and report review for {userData?.displayName || 'your'} team
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setView('pipeline')}
              style={{
                background: view === 'pipeline' ? '#a855f722' : '#0d1117',
                border: `1px solid ${view === 'pipeline' ? '#a855f766' : '#1e2a3a'}`,
                borderRadius: 10, color: view === 'pipeline' ? '#a855f7' : '#888',
                cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '9px 16px',
              }}>
              Pipeline
            </button>
            <button onClick={() => setView('schedule')}
              style={{
                background: view === 'schedule' ? '#a855f722' : '#0d1117',
                border: `1px solid ${view === 'schedule' ? '#a855f766' : '#1e2a3a'}`,
                borderRadius: 10, color: view === 'schedule' ? '#a855f7' : '#888',
                cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '9px 16px',
              }}>
              Schedule
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {COMPANY_FILTERS.map(c => (
            <button key={c} onClick={() => setCompanyFilter(c)}
              style={{
                background: companyFilter === c ? '#1e2a3a' : '#0d1117',
                border: `1px solid ${companyFilter === c ? '#38455a' : '#1e2a3a'}`,
                borderRadius: 20, color: companyFilter === c ? '#e8e8e8' : '#666',
                cursor: 'pointer', fontSize: 12, padding: '6px 14px',
              }}>
              {c}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ color: '#ff6b6b', background: '#ff4d4d11', border: '1px solid #ff4d4d33', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {view === 'pipeline' && (
          loading ? (
            <div style={{ color: '#555', textAlign: 'center', padding: 60 }}>Loading pipeline...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {Object.entries(STAGE_LABELS).map(([stageKey, meta]) => {
                const candidates = pipeline?.[stageKey] || [];
                return (
                  <div key={stageKey} style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14, padding: 14, minHeight: 300 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 16 }}>{meta.icon}</span>
                      <span style={{ color: meta.color, fontSize: 12, fontWeight: 800 }}>{meta.label}</span>
                      <span style={{ marginLeft: 'auto', color: '#444', fontSize: 11 }}>{candidates.length}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {candidates.length === 0 && (
                        <div style={{ color: '#333', fontSize: 11, textAlign: 'center', padding: 20 }}>No candidates</div>
                      )}
                      {candidates.map(c => (
                        <motion.div key={c.userId}
                          whileHover={{ x: 2 }}
                          onClick={() => openCandidate(c)}
                          style={{
                            background: '#060910', border: '1px solid #1e2a3a', borderRadius: 10,
                            padding: '10px 12px', cursor: 'pointer',
                          }}>
                          <div style={{ color: '#e8e8e8', fontSize: 12, fontWeight: 700 }}>
                            {c.userId.slice(0, 10)}...
                          </div>
                          <div style={{ color: '#666', fontSize: 10, marginTop: 3 }}>
                            {c.company} - {c.lastInterviewType}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                            <span style={{ color: '#555', fontSize: 10 }}>{c.sessionCount} session{c.sessionCount !== 1 ? 's' : ''}</span>
                            {c.avgScore !== null && (
                              <span style={{ color: c.avgScore >= 60 ? '#00c896' : '#ff6b6b', fontSize: 10, fontWeight: 700 }}>
                                {c.avgScore}%
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setScheduleModalFor(c); }}
                            style={{
                              marginTop: 8, width: '100%', background: 'transparent',
                              border: `1px solid ${meta.color}44`, borderRadius: 6, color: meta.color,
                              cursor: 'pointer', fontSize: 10, padding: '5px 0', fontWeight: 700,
                            }}>
                            Schedule Next Round
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {view === 'schedule' && (
          <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14, padding: 20 }}>
            <div style={{ color: '#888', fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Upcoming Scheduled Interviews</div>
            {schedule.length === 0 ? (
              <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: 40 }}>Nothing scheduled yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {schedule.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#060910', border: '1px solid #1e2a3a', borderRadius: 10, padding: '12px 16px',
                  }}>
                    <div>
                      <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 700 }}>
                        {s.company} - {s.interviewType}
                      </div>
                      <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                        Candidate: {s.candidateUserId.slice(0, 12)}... - {new Date(s.scheduledAt).toLocaleString()}
                      </div>
                    </div>
                    <span style={{
                      background: s.status === 'scheduled' ? '#38d9a922' : s.status === 'completed' ? '#00c89622' : '#88888822',
                      color: s.status === 'scheduled' ? '#38d9a9' : s.status === 'completed' ? '#00c896' : '#888',
                      borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700,
                    }}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {selectedCandidate && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedCandidate(null)}
              style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
              <motion.div
                initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
                onClick={e => e.stopPropagation()}
                style={{ width: 420, maxWidth: '90vw', background: '#0d1117', height: '100%', overflowY: 'auto', padding: 24, borderLeft: '1px solid #1e2a3a' }}>

                <button onClick={() => setSelectedCandidate(null)}
                  style={{ background: 'transparent', border: '1px solid #1e2a3a', borderRadius: 8, color: '#666', cursor: 'pointer', fontSize: 12, padding: '6px 12px', marginBottom: 20 }}>
                  Close
                </button>

                <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
                  {candidateDetail?.userInfo?.displayName || 'Candidate'}
                </div>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 20 }}>
                  {candidateDetail?.userInfo?.email || selectedCandidate.userId}
                </div>

                {detailLoading ? (
                  <div style={{ color: '#555', fontSize: 12 }}>Loading history...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(candidateDetail?.sessions || []).map(s => (
                      <div key={s.id} style={{ background: '#060910', border: '1px solid #1e2a3a', borderRadius: 10, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ color: '#e8e8e8', fontSize: 12, fontWeight: 700 }}>{s.interviewType}</span>
                          <span style={{ color: '#555', fontSize: 10 }}>{s.company}</span>
                        </div>
                        {typeof s.totalScore === 'number' && (
                          <div style={{ color: s.totalScore >= 60 ? '#00c896' : '#ff6b6b', fontSize: 13, fontWeight: 800 }}>
                            {s.pct}% - {s.totalScore}/{s.maxScore}
                          </div>
                        )}
                        {s.feedback && (
                          <div style={{ color: '#888', fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>{s.feedback}</div>
                        )}
                      </div>
                    ))}
                    {(!candidateDetail?.sessions || candidateDetail.sessions.length === 0) && (
                      <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: 20 }}>No sessions found.</div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {scheduleModalFor && (
            <ScheduleModal
              candidate={scheduleModalFor}
              recruiterId={user?.uid}
              onClose={() => setScheduleModalFor(null)}
              onScheduled={() => { setScheduleModalFor(null); fetchPipeline(); }}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function ScheduleModal({ candidate, recruiterId, onClose, onScheduled }) {
  const [interviewType, setInterviewType] = useState('coding');
  const [dateTime, setDateTime] = useState('');
  const [assignedInterviewer, setAssignedInterviewer] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!dateTime) { setError('Pick a date and time.'); return; }
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/recruiter/schedule`, {
        recruiterId,
        candidateUserId: candidate.userId,
        company: candidate.company,
        interviewType,
        scheduledAt: new Date(dateTime).toISOString(),
        assignedInterviewer: assignedInterviewer || null,
        notes,
      });
      onScheduled?.();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16, padding: 24, width: 380, maxWidth: '90vw' }}>

        <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
          Schedule Next Round
        </div>

        <label style={{ color: '#666', fontSize: 11, fontWeight: 700 }}>Interview Type</label>
        <select value={interviewType} onChange={e => setInterviewType(e.target.value)}
          style={{ width: '100%', background: '#060910', border: '1px solid #1e2a3a', borderRadius: 8, color: '#e8e8e8', fontSize: 13, padding: '9px 10px', margin: '6px 0 14px' }}>
          <option value="coding">Coding</option>
          <option value="system-design">System Design</option>
          <option value="behavioral">Behavioral</option>
          <option value="technical-screening">Technical Screening</option>
        </select>

        <label style={{ color: '#666', fontSize: 11, fontWeight: 700 }}>Date and Time</label>
        <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', background: '#060910', border: '1px solid #1e2a3a', borderRadius: 8, color: '#e8e8e8', fontSize: 13, padding: '9px 10px', margin: '6px 0 14px' }} />

        <label style={{ color: '#666', fontSize: 11, fontWeight: 700 }}>Assigned Interviewer (optional)</label>
        <input value={assignedInterviewer} onChange={e => setAssignedInterviewer(e.target.value)}
          placeholder="Name or email"
          style={{ width: '100%', boxSizing: 'border-box', background: '#060910', border: '1px solid #1e2a3a', borderRadius: 8, color: '#e8e8e8', fontSize: 13, padding: '9px 10px', margin: '6px 0 14px' }} />

        <label style={{ color: '#666', fontSize: 11, fontWeight: 700 }}>Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 60, background: '#060910', border: '1px solid #1e2a3a', borderRadius: 8, color: '#e8e8e8', fontSize: 13, padding: '9px 10px', margin: '6px 0 16px', resize: 'vertical' }} />

        {error && <div style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, background: '#1e2a3a', border: 'none', borderRadius: 10, color: '#888', cursor: 'pointer', fontSize: 13, padding: '11px 0' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{ flex: 1, background: 'linear-gradient(135deg, #a855f7, #a855f7bb)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '11px 0', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Scheduling...' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}