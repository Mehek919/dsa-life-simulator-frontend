import React, { useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
// ── icon map per event type ──────────────────
const TYPE_ICON = {
  challenge_solved:    '🔥',
  challenge_published: '🧪',
  battle_started:      '⚔️',
  battle_won:          '🏆',
  level_up:            '🚀',
  default:             '📰',
};

const TYPE_COLOR = {
  challenge_solved:    '#f59e0b',
  challenge_published: '#6366f1',
  battle_started:      '#ef4444',
  battle_won:          '#10b981',
  level_up:            '#f472b6',
  default:             '#94a3b8',
};

export default function ActivityFeed({ currentUser, followedUids = [] }) {
  const [events, setEvents]       = useState([]);
  const [filter, setFilter]       = useState('global'); // 'global' | 'following'
  const bottomRef                 = useRef(null);

  useEffect(() => {
    let q;

    if (filter === 'following' && followedUids.length > 0) {
      // Show only followed users' activity
      q = query(
        collection(db, 'activityFeed'),
        where('uid', 'in', followedUids.slice(0, 10)), // Firestore 'in' limit = 10
        orderBy('createdAt', 'desc'),
        limit(30)
      );
    } else {
      // Global feed
      q = query(
        collection(db, 'activityFeed'),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setEvents(items);
    });

    return () => unsub();
  }, [filter, followedUids]);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const formatTime = (date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)  return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div style={{
      width:           '100%',
      background:      'rgba(255,255,255,0.03)',
      border:          '1px solid rgba(255,255,255,0.08)',
      borderRadius:    16,
      overflow:        'hidden',
      display:         'flex',
      flexDirection:   'column',
      maxHeight:       480,
    }}>

      {/* ── Header ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '14px 18px',
        borderBottom:   '1px solid rgba(255,255,255,0.07)',
        background:     'rgba(255,255,255,0.02)',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
          ⚡ Live Feed
        </span>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['global', 'following'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding:      '4px 12px',
                borderRadius: 20,
                border:       'none',
                cursor:       'pointer',
                fontSize:     12,
                fontWeight:   600,
                background:   filter === f ? '#1a73e8' : 'rgba(255,255,255,0.08)',
                color:        filter === f ? '#fff'    : '#94a3b8',
                transition:   'all 0.2s',
              }}
            >
              {f === 'global' ? '🌍 Global' : '👥 Following'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Events List ── */}
      <div style={{
        overflowY:  'auto',
        flex:       1,
        padding:    '8px 0',
      }}>
        {events.length === 0 && (
          <div style={{
            textAlign: 'center',
            color:     '#4b5563',
            padding:   40,
            fontSize:  14,
          }}>
            {filter === 'following'
              ? '👥 Follow users to see their activity here'
              : '⏳ No activity yet. Be the first!'}
          </div>
        )}

        <AnimatePresence initial={false}>
          {[...events].reverse().map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0  }}
              exit={{    opacity: 0, x:  20 }}
              transition={{ duration: 0.3 }}
              style={{
                display:    'flex',
                alignItems: 'flex-start',
                gap:        12,
                padding:    '10px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor:     'default',
              }}
            >
              {/* Avatar */}
              {event.photoURL ? (
                <img
                  src={event.photoURL}
                  alt={event.name}
                  style={{
                    width:        34,
                    height:       34,
                    borderRadius: '50%',
                    objectFit:    'cover',
                    flexShrink:   0,
                    border:       `2px solid ${TYPE_COLOR[event.type] || TYPE_COLOR.default}`,
                  }}
                />
              ) : (
                <div style={{
                  width:           34,
                  height:          34,
                  borderRadius:    '50%',
                  background:      TYPE_COLOR[event.type] || TYPE_COLOR.default,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  fontSize:        16,
                  flexShrink:      0,
                }}>
                  {TYPE_ICON[event.type] || TYPE_ICON.default}
                </div>
              )}

              {/* Message */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin:     0,
                  color:      '#e2e8f0',
                  fontSize:   13,
                  lineHeight: 1.4,
                  wordBreak:  'break-word',
                }}>
                  {event.message}
                </p>
                <span style={{ fontSize: 11, color: '#4b5563', marginTop: 3, display: 'block' }}>
                  {formatTime(event.createdAt)}
                </span>
              </div>

              {/* Type badge */}
              <span style={{
                fontSize:     10,
                fontWeight:   700,
                color:        TYPE_COLOR[event.type] || TYPE_COLOR.default,
                whiteSpace:   'nowrap',
                paddingTop:   2,
                flexShrink:   0,
              }}>
                {TYPE_ICON[event.type] || TYPE_ICON.default}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
