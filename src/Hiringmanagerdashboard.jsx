import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

/**
 * HiringManagerDashboard.jsx
 *
 * Gate behind your role check:
 *   {userData?.role === 'hiring-manager' && <HiringManagerDashboard user={user} userData={userData} />}
 */

const COMPANY_FILTERS = ['All', 'Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'General'];

export default function HiringManagerDashboard({ user, userData }) {
  const [queue, setQueue] = useState([]);
  const [companyFilter, setCompanyFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [startingFor, setStartingFor] = useState(null);
  const [startedMessage, setStartedMessage] = useState('');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = companyFilter !== 'All' ? { company: companyFilter } : {};
      const res = await axios.get(`${API_BASE}/hiring-manager/queue`, { params });
      if (res.data.success) setQueue(res.data.queue);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [companyFilter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const openCandidate = async (c) => {
    setSelected(c);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await axios.get(`${API_BASE}/hiring-manager/candidate/${c.userId}`, {
        params: { userId: user?.uid },
      });
      if (res.data.success) setDetail(res.data);
    } catch (e) {
      console.error('Candidate detail fetch failed:', e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const startManagementRound = async (c) => {
    setStartingFor(c.userId);
    setStartedMessage('');
    try {
      const res = await axios.post(`${API_BASE}/hiring-manager/start-management-round`, {
        userId: user?.uid,
        candidateUserId: c.userId,
        company: c.company,
        roundsCompleted: c.roundsCompleted,
      });
      if (res.data.success) {
        setStartedMessage(`Management round created (session ${res.data.sessionId.slice(0, 8)}...). The candidate can now start it from their end.`);
        fetchQueue();
      }
    } catch (e) {
      setStartedMessage(e.response?.data?.error || e.message);
    } finally {
      setStartingFor(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8', fontFamily: 'Arial, sans-serif', padding: '28px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Hiring Manager</h1>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: 13 }}>
            Technical evaluations and management rounds, {userData?.displayName || 'welcome'}
          </p>
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

        {startedMessage && (
          <div style={{ color: '#00c896', background: '#00c89611', border: '1px solid #00c89633', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {startedMessage}
          </div>
        )}

        {loading ? (
          <div style={{ color: '#555', textAlign: 'center', padding: 60 }}>Loading queue...</div>
        ) : queue.length === 0 ? (
          <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14, padding: 40, textAlign: 'center', color: '#333' }}>
            No candidates have completed technical rounds yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queue.map(c => (
              <div key={c.userId} style={{
                background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14, padding: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 200, cursor: 'pointer' }} onClick={() => openCandidate(c)}>
                  <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 700 }}>
                    {c.userId.slice(0, 14)}... <span style={{ color: '#555', fontWeight: 400 }}>{c.company}</span>
                  </div>
                  <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                    {c.onsiteSessionCount} technical round{c.onsiteSessionCount !== 1 ? 's' : ''} completed
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: c.avgTechnicalScore >= 60 ? '#00c896' : '#ff6b6b', fontSize: 20, fontWeight: 900 }}>
                    {c.avgTechnicalScore}%
                  </div>
                  <div style={{ color: '#444', fontSize: 9 }}>avg technical</div>
                </div>

                {c.alreadyHadManagementRound ? (
                  <span style={{ background: '#88888822', color: '#888', borderRadius: 20, padding: '6px 14px', fontSize: 11, fontWeight: 700 }}>
                    Management round done
                  </span>
                ) : (
                  <button
                    onClick={() => startManagementRound(c)}
                    disabled={startingFor === c.userId}
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #f97316bb)', border: 'none', borderRadius: 10,
                      color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '9px 16px',
                      opacity: startingFor === c.userId ? 0.6 : 1,
                    }}>
                    {startingFor === c.userId ? 'Creating...' : 'Start Management Round'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
              <motion.div
                initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
                onClick={e => e.stopPropagation()}
                style={{ width: 420, maxWidth: '90vw', background: '#0d1117', height: '100%', overflowY: 'auto', padding: 24, borderLeft: '1px solid #1e2a3a' }}>

                <button onClick={() => setSelected(null)}
                  style={{ background: 'transparent', border: '1px solid #1e2a3a', borderRadius: 8, color: '#666', cursor: 'pointer', fontSize: 12, padding: '6px 12px', marginBottom: 20 }}>
                  Close
                </button>

                <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
                  {detail?.userInfo?.displayName || 'Candidate'}
                </div>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 20 }}>
                  {detail?.userInfo?.email || selected.userId}
                </div>

                {detailLoading ? (
                  <div style={{ color: '#555', fontSize: 12 }}>Loading evaluation history...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(detail?.sessions || []).map(s => (
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
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}