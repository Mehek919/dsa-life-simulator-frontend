import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';

// ─── Event Config ─────────────────────────────────────────────────────────────

const EVENT_CONFIG = {
  challenge_solved: {
    icon:  '⚔️',
    color: '#22c55e',
    glow:  'rgba(34,197,94,0.4)',
    label: 'Solved'
  },
  challenge_published: {
    icon:  '📤',
    color: '#3b82f6',
    glow:  'rgba(59,130,246,0.4)',
    label: 'Published'
  },
  challenge_attempted: {
    icon:  '🎯',
    color: '#f97316',
    glow:  'rgba(249,115,22,0.4)',
    label: 'Attempted'
  },
  level_up: {
    icon:  '🚀',
    color: '#a855f7',
    glow:  'rgba(168,85,247,0.4)',
    label: 'Leveled Up'
  },
  arena_win: {
    icon:  '🏆',
    color: '#ef4444',
    glow:  'rgba(239,68,68,0.4)',
    label: 'Arena Win'
  },
  arena_loss: {
    icon:  '💀',
    color: '#6b7280',
    glow:  'rgba(107,114,128,0.4)',
    label: 'Arena Loss'
  },
  daily_completed: {
    icon:  '✅',
    color: '#22c55e',
    glow:  'rgba(34,197,94,0.4)',
    label: 'Daily Done'
  },
  bonus_earned: {
    icon:  '🎁',
    color: '#f59e0b',
    glow:  'rgba(245,158,11,0.4)',
    label: 'Bonus'
  },
  story_generated: {
    icon:  '📖',
    color: '#06b6d4',
    glow:  'rgba(6,182,212,0.4)',
    label: 'New Story'
  },
  default: {
    icon:  '📡',
    color: '#6b7280',
    glow:  'rgba(107,114,128,0.4)',
    label: 'Activity'
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getConfig = (type) =>
  EVENT_CONFIG[type] || EVENT_CONFIG.default;

const timeAgo = (ts) => {
  if (!ts) return '';
  const date  = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff  = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ─── Single Feed Item ─────────────────────────────────────────────────────────

const FeedItem = ({ item, isNew }) => {
  const cfg = getConfig(item.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0,   scale: 1    }}
      exit={{   opacity: 0, x:  20,  scale: 0.97 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-start gap-3 p-3 rounded-xl relative
                 overflow-hidden group"
      style={{
        background:  isNew
          ? `linear-gradient(135deg, ${cfg.color}18, transparent)`
          : 'rgba(255,255,255,0.02)',
        border:      `1px solid ${isNew ? cfg.color + '44' : 'rgba(255,255,255,0.06)'}`,
        transition:  'background 0.4s ease, border 0.4s ease'
      }}
    >
      {/* Glow accent bar */}
      <div
        style={{
          position:  'absolute',
          left:      0,
          top:       0,
          bottom:    0,
          width:     3,
          background: cfg.color,
          boxShadow: `0 0 8px ${cfg.glow}`,
          borderRadius: '4px 0 0 4px'
        }}
      />

      {/* Avatar or Icon */}
      <div className="flex-shrink-0 relative">
        {item.photoURL ? (
          <img
            src={item.photoURL}
            alt={item.name}
            className="w-8 h-8 rounded-full object-cover"
            style={{ border: `2px solid ${cfg.color}66` }}
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center
                       justify-center text-sm font-bold"
            style={{
              background:  cfg.color + '22',
              border:      `2px solid ${cfg.color}66`,
              color:       cfg.color
            }}
          >
            {item.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        {/* Event type badge */}
        <div
          className="absolute -bottom-1 -right-1 text-xs rounded-full
                     w-4 h-4 flex items-center justify-center"
          style={{ background: '#0a0a0f', fontSize: 10 }}
        >
          {cfg.icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-200 text-xs leading-snug">
          <span className="font-bold" style={{ color: cfg.color }}>
            {item.name || 'Anonymous'}
          </span>{' '}
          {item.message || cfg.label}
        </p>
        {item.meta?.topic && (
          <span
            className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
            style={{
              background: cfg.color + '22',
              color:      cfg.color,
              fontSize:   10
            }}
          >
            {item.meta.topic}
          </span>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-gray-600 text-xs flex-shrink-0 mt-0.5">
        {timeAgo(item.createdAt)}
      </span>

      {/* NEW flash */}
      {isNew && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5
                     rounded-full"
          style={{
            background: cfg.color + '33',
            color:      cfg.color,
            fontSize:   9
          }}
        >
          NEW
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',       label: '🌐 All'      },
  { key: 'challenge', label: '⚔️ Challenges' },
  { key: 'arena',     label: '🏟️ Arena'     },
  { key: 'level',     label: '🚀 Level Ups' },
  { key: 'story',     label: '📖 Stories'   }
];

const TYPE_FILTER_MAP = {
  challenge: ['challenge_solved','challenge_published','challenge_attempted',
              'daily_completed','bonus_earned'],
  arena:     ['arena_win','arena_loss'],
  level:     ['level_up'],
  story:     ['story_generated']
};

// ─── Main ActivityFeed Component ──────────────────────────────────────────────

const ActivityFeed = ({
  maxItems   = 30,
  compact    = false,   // true = sidebar panel, false = full page
  className  = ''
}) => {
  const [events,      setEvents]      = useState([]);
  const [newIds,      setNewIds]      = useState(new Set());
  const [filter,      setFilter]      = useState('all');
  const [connected,   setConnected]   = useState(false);
  const [liveCount,   setLiveCount]   = useState(0);
  const isFirst                       = useRef(true);
  const prevIds                       = useRef(new Set());

  // ── Firestore real-time listener ──
  useEffect(() => {
    const q = query(
      collection(db, 'activityFeed'),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setConnected(true);

        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // On first load — just set, no "new" flash
        if (isFirst.current) {
          isFirst.current = false;
          prevIds.current = new Set(docs.map(d => d.id));
          setEvents(docs);
          setLiveCount(docs.length);
          return;
        }

        // Detect truly new items
        const freshIds = docs
          .map(d => d.id)
          .filter(id => !prevIds.current.has(id));

        if (freshIds.length > 0) {
          setNewIds(prev => {
            const next = new Set(prev);
            freshIds.forEach(id => next.add(id));
            return next;
          });

          // Auto-clear "NEW" badge after 4s
          setTimeout(() => {
            setNewIds(prev => {
              const next = new Set(prev);
              freshIds.forEach(id => next.delete(id));
              return next;
            });
          }, 4000);
        }

        prevIds.current = new Set(docs.map(d => d.id));
        setEvents(docs);
        setLiveCount(docs.length);
      },
      (err) => {
        console.error('❌ ActivityFeed snapshot error:', err);
        setConnected(false);
      }
    );

    return () => unsub();
  }, [maxItems]);

  // ── Filter events ──
  const filtered = filter === 'all'
    ? events
    : events.filter(e =>
        (TYPE_FILTER_MAP[filter] || []).includes(e.type)
      );

  // ── Compact sidebar mode ──
  if (compact) {
    return (
      <div
        className={`flex flex-col h-full ${className}`}
        style={{ minWidth: 280, maxWidth: 320 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3
                        border-b border-gray-800">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: connected ? [1, 0.3, 1] : 0.3 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: connected ? '#22c55e' : '#6b7280' }}
            />
            <span className="text-white text-sm font-bold">Live Feed</span>
          </div>
          <span className="text-gray-500 text-xs">{liveCount} events</span>
        </div>

        {/* Feed list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2
                        scrollbar-thin scrollbar-track-transparent
                        scrollbar-thumb-gray-700">
          <AnimatePresence initial={false}>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-600 text-xs py-8"
              >
                No activity yet
              </motion.div>
            ) : (
              filtered.map(item => (
                <FeedItem
                  key={item.id}
                  item={item}
                  isNew={newIds.has(item.id)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Full page mode ──
  return (
    <div className={`flex flex-col h-full ${className}`}>

      {/* Header */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3
                      border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ opacity: connected ? [1, 0.3, 1] : 0.3 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: connected ? '#22c55e' : '#6b7280' }}
            />
            <h2 className="text-white font-black text-lg tracking-wide">
              Community Feed
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{
                background: connected
                  ? 'rgba(34,197,94,0.15)'
                  : 'rgba(107,114,128,0.15)',
                color: connected ? '#22c55e' : '#6b7280'
              }}
            >
              {connected ? '● LIVE' : '○ OFFLINE'}
            </span>
          </div>
          <span className="text-gray-500 text-sm">{liveCount} events</span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1
                        scrollbar-thin scrollbar-track-transparent
                        scrollbar-thumb-gray-700">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs
                         font-semibold transition-all duration-200"
              style={{
                background: filter === f.key
                  ? 'rgba(168,85,247,0.25)'
                  : 'rgba(255,255,255,0.04)',
                color:      filter === f.key ? '#a855f7' : '#6b7280',
                border:     `1px solid ${
                  filter === f.key
                    ? 'rgba(168,85,247,0.5)'
                    : 'rgba(255,255,255,0.08)'
                }`
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2
                      scrollbar-thin scrollbar-track-transparent
                      scrollbar-thumb-gray-700">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center
                         py-16 gap-3 text-center"
            >
              <span className="text-4xl">📡</span>
              <p className="text-gray-500 text-sm">
                {connected
                  ? 'No activity for this filter yet'
                  : 'Connecting to feed...'}
              </p>
            </motion.div>
          ) : (
            filtered.map(item => (
              <FeedItem
                key={item.id}
                item={item}
                isNew={newIds.has(item.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default ActivityFeed;

