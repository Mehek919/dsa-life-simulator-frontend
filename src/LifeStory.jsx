import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE from './config';
import { useNavigate } from 'react-router-dom';
const API = `${API_BASE}/story`;
const LEVEL_NAMES = {
  1: 'Junior',
  2: 'Mid',
  3: 'Senior',
  4: 'Lead',
  5: 'Legend',
};

export default function LifeStory({ user, userData }) {
  const navigate = useNavigate();

  const [story,       setStory]       = useState(null);
  const [archive,     setArchive]     = useState([]);
  const [weekId,      setWeekId]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState('');
  const [showArchive, setShowArchive] = useState(false);

  // ── Stable uid string — prevents useCallback recreation ────────
  const uid = user?.uid || '';

  // ── Fetch current week story ────────────────────────────────────
  const fetchStory = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_BASE}/story/${uid}`);
      setStory(res.data.story   || null);
      setWeekId(res.data.weekId || '');
    } catch (err) {
      console.error('Story fetch failed:', err.message);
      setError('⚠️ Server not reachable. Make sure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  }, [uid]);   // ← only re-created when uid changes

  // ── Fetch archive ───────────────────────────────────────────────
  const fetchArchive = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await axios.get(`${API_BASE}/story/${uid}/archive`);
      setArchive(res.data.chapters || []);
    } catch (err) {
      console.error('Archive fetch failed:', err.message);
    }
  }, [uid]);   // ← only re-created when uid changes

  // ── Run ONCE on mount ───────────────────────────────────────────
  useEffect(() => {
    fetchStory();
    fetchArchive();
  }, [fetchStory, fetchArchive]);  // ← stable, won't loop

  // ── Generate / Regenerate story ─────────────────────────────────
  const handleGenerate = async () => {
    if (!uid) return;
    try {
      setGenerating(true);
      setError('');
      const res = await axios.post(`${API_BASE}/story/generate`, { userId: uid });
      setStory(res.data.story   || null);
      setWeekId(res.data.weekId || '');
      await fetchArchive();
    } catch (err) {
      console.error('Generate failed:', err.message);
      setError('⚠️ Failed to generate story. Is the backend running?');
    } finally {
      setGenerating(false);
    }
  };

  // ── Styles (reusable) ───────────────────────────────────────────
  const cardStyle = {
    background:   '#12122a',
    border:       '1px solid #1a73e8',
    borderRadius: 16,
    padding:      32,
    marginBottom: 24,
    boxShadow:    '0 0 30px rgba(26,115,232,0.15)',
  };

  const btnPrimary = (disabled) => ({
    background:   disabled
      ? '#333'
      : 'linear-gradient(135deg, #1a73e8, #9c27b0)',
    border:       'none',
    borderRadius: 10,
    color:        'white',
    padding:      '12px 28px',
    cursor:       disabled ? 'not-allowed' : 'pointer',
    fontSize:     15,
    fontWeight:   'bold',
    opacity:      disabled ? 0.6 : 1,
  });

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:  '100vh',
      background: '#0f0f1a',
      color:      'white',
      fontFamily: 'Arial, sans-serif',
      padding:    '40px 20px',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* ── Back button ── */}
        <button
          onClick={() => navigate('/world')}
          style={{
            background:   'transparent',
            border:       '1px solid #333',
            color:        '#aaa',
            padding:      '8px 18px',
            borderRadius: 8,
            cursor:       'pointer',
            marginBottom: 28,
            fontSize:     13,
          }}
        >
          ← Back to World
        </button>

        {/* ── Page title ── */}
        <h1 style={{ fontSize: 32, marginBottom: 4 }}>📖 Your Life Story</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>
          Week {weekId || '…'} &nbsp;•&nbsp;
          {userData?.name || user?.displayName} &nbsp;•&nbsp;
          Level {userData?.level || 1} — {LEVEL_NAMES[userData?.level] || 'Junior'}
        </p>

        {/* ── Error banner ── */}
        {error && (
          <div style={{
            background:   '#2a0a0a',
            border:       '1px solid #ff4444',
            borderRadius: 10,
            padding:      '12px 18px',
            marginBottom: 24,
            color:        '#ff7777',
            fontSize:     14,
          }}>
            {error}
          </div>
        )}

        {/* ── Story card ── */}
        <div style={cardStyle}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              Loading your story…
            </div>
          ) : story ? (
            <>
              <div style={{
                fontSize:     16,
                lineHeight:   1.95,
                color:        '#e0e0e0',
                whiteSpace:   'pre-wrap',
                marginBottom: 28,
              }}>
                {story}
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={btnPrimary(generating)}
              >
                {generating ? '⏳ Regenerating…' : '🔄 Regenerate Story'}
              </button>
            </>
          ) : (
            // No story yet this week
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🌟</div>
              <p style={{ color: '#888', marginBottom: 28, fontSize: 15 }}>
                Your story for this week hasn't been written yet.
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={btnPrimary(generating)}
              >
                {generating ? '⏳ Generating…' : '✨ Generate My Story'}
              </button>
            </div>
          )}
        </div>

        {/* ── Archive section ── */}
        {archive.length > 0 && (
          <div>
            <button
              onClick={() => setShowArchive(v => !v)}
              style={{
                background:   'transparent',
                border:       '1px solid #333',
                borderRadius: 10,
                color:        '#aaa',
                padding:      '10px 20px',
                cursor:       'pointer',
                marginBottom: 16,
                width:        '100%',
                fontSize:     14,
              }}
            >
              {showArchive
                ? '▲ Hide Archive'
                : `▼ Past Chapters (${archive.length})`}
            </button>

            {showArchive && archive.map((chapter, i) => (
              <div
                key={chapter.id || i}
                style={{
                  background:   '#0d0d1f',
                  border:       '1px solid #222',
                  borderRadius: 12,
                  padding:      20,
                  marginBottom: 12,
                }}
              >
                <div style={{
                  fontSize:     12,
                  color:        '#1a73e8',
                  marginBottom: 8,
                  fontWeight:   'bold',
                  letterSpacing: 1,
                }}>
                  📅 Week {chapter.weekId}
                </div>
                <div style={{
                  fontSize:   14,
                  lineHeight: 1.85,
                  color:      '#ccc',
                }}>
                  {chapter.story}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}


