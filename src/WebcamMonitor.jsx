import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { initializeApp, getApps } from 'firebase/app';
import axios from 'axios';
import API_BASE from './config';
// at top of file (replace with your project's config or use env vars)
const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'dsa-life-simulator.appspot.com',
};

// Reuse existing Firebase app or initialize one
function getStorageInstance() {
  const apps = getApps();
  let app = apps[0];
  if (!app) {
    // initialize with your config
    app = initializeApp(FIREBASE_CONFIG);
  }
  return getStorage(app);
}
// ══════════════════════════════════════════════════════════════════════════════
// WebcamMonitor
// Takes snapshots every 60 seconds during proctored assessments
// Uploads FULL images to Firebase Storage
// Saves download URL + metadata to Firestore via backend
// ══════════════════════════════════════════════════════════════════════════════

export default function WebcamMonitor({
  assessmentId,
  userId,
  enabled = true,
  snapshotInterval = 60,
  onSnapshot,
  onViolation,
  onError,
}) {
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const streamRef     = useRef(null);
  const intervalRef   = useRef(null);
  const countdownRef  = useRef(null);
  const snapshotCount = useRef(0);

  const [status,     setStatus]     = useState('idle');
  const [expanded,   setExpanded]   = useState(false);
  const [lastSnap,   setLastSnap]   = useState(null);
  const [snapCount,  setSnapCount]  = useState(0);
  const [nextSnapIn, setNextSnapIn] = useState(snapshotInterval);
  const [uploading,  setUploading]  = useState(false);

  // ── Start webcam ─────────────────────────────────────────────────────────────
  const startWebcam = useCallback(async () => {
    if (!enabled) return;
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('active');
    } catch (err) {
      console.error('Webcam error:', err);
      const isdenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setStatus(isdenied ? 'denied' : 'error');
      onError?.({ type: 'webcam_denied', message: err.message });
      onViolation?.({ type: 'webcam_denied', detail: err.message, timestamp: new Date().toISOString() });
    }
  }, [enabled, onError, onViolation]);

  // ── Upload to Firebase Storage ────────────────────────────────────────────────
  const uploadToStorage = useCallback(async (dataUrl, index) => {
    try {
      const storage = getStorageInstance();
      if (!storage) {
        console.warn('Firebase Storage not initialized');
        return null;
      }

      // Path: webcam/{assessmentId}/{userId}/snapshot_{index}_{timestamp}.jpg
      const timestamp = Date.now();
      const path      = `webcam/${assessmentId}/${userId}/snapshot_${index}_${timestamp}.jpg`;
      const storageRef = ref(storage, path);

      // Upload base64 image (remove data:image/jpeg;base64, prefix)
      const base64Data = dataUrl.split(',')[1];
      await uploadString(storageRef, base64Data, 'base64', {
        contentType: 'image/jpeg',
      });

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (err) {
      console.warn('Storage upload failed:', err.message);
      return null;
    }
  }, [assessmentId, userId]);

  // ── Take snapshot ─────────────────────────────────────────────────────────────
  const takeSnapshot = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || status !== 'active') return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    // Full quality 640×480
    canvas.width  = 640;
    canvas.height = 480;

    // Add timestamp watermark
    ctx.drawImage(video, 0, 0, 640, 480);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 450, 640, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font      = '12px monospace';
    ctx.fillText(
      `Assessment: ${assessmentId} | User: ${userId?.slice(0,8)} | ${new Date().toISOString()}`,
      8, 468
    );

    const dataUrl   = canvas.toDataURL('image/jpeg', 0.85);
    const timestamp = new Date().toISOString();
    snapshotCount.current++;
    const index = snapshotCount.current;

    setLastSnap(dataUrl);
    setSnapCount(index);
    setUploading(true);

    // Upload to Firebase Storage
    const imageUrl = await uploadToStorage(dataUrl, index);
    setUploading(false);

    const snapshot = {
      index,
      timestamp,
      imageUrl,
      thumbnail: dataUrl.slice(0, 3000), // small preview for Firestore
    };

    onSnapshot?.(snapshot);

    // Save to backend
    try {
      await axios.post(`${API_BASE}/webcam/snapshot`, {
        assessmentId,
        userId,
        snapshot: {
          index,
          timestamp,
          imageUrl:  imageUrl || '',
          thumbnail: dataUrl.slice(0, 3000),
          hasFullImage: !!imageUrl,
        },
      });
    } catch (err) {
      console.warn('Failed to save snapshot metadata:', err.message);
    }
  }, [status, assessmentId, userId, onSnapshot, uploadToStorage]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    startWebcam();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [enabled, startWebcam]);

  useEffect(() => {
    if (status !== 'active') return;

    // First snapshot after 3 seconds
    const firstSnap = setTimeout(takeSnapshot, 3000);

    // Then every snapshotInterval seconds
    intervalRef.current = setInterval(takeSnapshot, snapshotInterval * 1000);

    // Countdown
    countdownRef.current = setInterval(() => {
      setNextSnapIn(prev => prev <= 1 ? snapshotInterval : prev - 1);
    }, 1000);

    return () => {
      clearTimeout(firstSnap);
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [status, snapshotInterval, takeSnapshot]);

  if (!enabled) return null;

  const statusColor = status === 'active' ? '#ff4d4d'
                    : status === 'requesting' ? '#f5c542'
                    : '#555';

  const statusLabel = status === 'active'     ? `📷 Live · ${snapCount} snap${snapCount !== 1 ? 's' : ''}`
                    : status === 'requesting' ? '📷 Starting camera...'
                    : status === 'denied'     ? '📷 Camera denied ⚠️'
                    : '📷 Camera error';

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Pill indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setExpanded(e => !e)}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          7,
          background:   '#0d1117',
          border:       `1px solid ${statusColor}44`,
          borderRadius: 20,
          padding:      '5px 12px',
          cursor:       'pointer',
          userSelect:   'none',
          boxShadow:    status === 'active' ? `0 0 10px ${statusColor}22` : 'none',
        }}
      >
        <div style={{
          width:      7, height: 7, borderRadius: '50%',
          background: statusColor,
          animation:  status === 'active' ? 'wcpulse 1.5s infinite' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ color: '#e8e8e8', fontSize: 11, fontWeight: 600 }}>
          {statusLabel}
        </span>
        {status === 'active' && (
          <span style={{ color: '#555', fontSize: 10 }}>
            {uploading ? '⬆️' : `${nextSnapIn}s`}
          </span>
        )}
        <span style={{ color: '#444', fontSize: 10 }}>{expanded ? '▲' : '▼'}</span>
      </motion.div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            style={{
              position:     'absolute',
              top:          'calc(100% + 8px)',
              right:        0,
              background:   '#0d1117',
              border:       '1px solid #1e2a3a',
              borderRadius: 14,
              padding:      16,
              zIndex:       200,
              width:        300,
              boxShadow:    '0 8px 32px #00000099',
            }}
          >
            {status === 'denied' || status === 'error' ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🚫</div>
                <div style={{ color: '#ff6b6b', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  {status === 'denied' ? 'Camera Access Denied' : 'Camera Error'}
                </div>
                <div style={{ color: '#555', fontSize: 11, lineHeight: 1.5, marginBottom: 12 }}>
                  This assessment requires camera access for proctoring.
                  Please allow camera in browser settings and refresh.
                </div>
                <button
                  onClick={startWebcam}
                  style={{
                    background: '#1a73e822', border: '1px solid #1a73e844',
                    borderRadius: 8, color: '#1a73e8', cursor: 'pointer',
                    fontSize: 12, padding: '6px 16px',
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {/* Live feed */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <video
                    ref={videoRef}
                    autoPlay muted playsInline
                    style={{
                      width: '100%', borderRadius: 8,
                      background: '#060910', display: 'block',
                      transform: 'scaleX(-1)', // mirror effect
                    }}
                  />
                  {status === 'active' && (
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      background: '#ff4d4dcc', borderRadius: 20,
                      padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'wcpulse 1s infinite' }} />
                      <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>LIVE</span>
                    </div>
                  )}
                  {uploading && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#1a73e8cc', borderRadius: 20,
                      padding: '2px 8px',
                    }}>
                      <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>⬆️ Uploading...</span>
                    </div>
                  )}
                </div>

                {/* Last snapshot */}
                {lastSnap && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ color: '#555', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                      Last Snapshot #{snapCount} · Saved to Firebase
                    </div>
                    <img
                      src={lastSnap}
                      alt="Last snapshot"
                      style={{
                        width: '100%', borderRadius: 6,
                        opacity: 0.8, transform: 'scaleX(-1)',
                      }}
                    />
                  </div>
                )}

                {/* Info */}
                <div style={{
                  background: '#ff4d4d0a', border: '1px solid #ff4d4d22',
                  borderRadius: 8, padding: '8px 10px',
                  color: '#888', fontSize: 10, lineHeight: 1.5,
                }}>
                  📸 Full-quality snapshots saved to Firebase Storage every {snapshotInterval}s.
                  Reviewed by the hiring team after submission.
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes wcpulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}