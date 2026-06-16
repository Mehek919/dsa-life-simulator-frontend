// src/components/AchievementToast.jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = {
  first_solve:    { color: 'from-yellow-500 to-amber-400',   glow: '#f59e0b' },
  ten_solves:     { color: 'from-blue-500   to-cyan-400',    glow: '#3b82f6' },
  fifty_solves:   { color: 'from-indigo-500 to-purple-400',  glow: '#6366f1' },
  streak_3:       { color: 'from-cyan-500   to-blue-400',    glow: '#06b6d4' },
  streak_7:       { color: 'from-orange-500 to-yellow-400',  glow: '#f97316' },
  streak_14:      { color: 'from-orange-600 to-red-400',     glow: '#ea580c' },
  streak_30:      { color: 'from-red-500    to-orange-400',  glow: '#ef4444' },
  arena_win:      { color: 'from-red-600    to-pink-500',    glow: '#ef4444' },
  arena_wins_10:  { color: 'from-rose-500   to-red-400',     glow: '#f43f5e' },
  level_up:       { color: 'from-purple-500 to-indigo-400',  glow: '#8b5cf6' },
  first_publish:  { color: 'from-teal-500   to-green-400',   glow: '#14b8a6' },
  story_unlocked: { color: 'from-cyan-500   to-blue-400',    glow: '#06b6d4' },
  default:        { color: 'from-green-500  to-teal-400',    glow: '#10b981' },
};

// Shows one badge at a time — the first in the queue
export default function AchievementToast({ newBadges = [], onDismiss }) {
  const badge = newBadges[0] || null;
  const meta  = COLORS[badge?.type] || COLORS.default;

  // Auto-dismiss after 4 s
  useEffect(() => {
    if (!badge) return;
    const t = setTimeout(() => { if (onDismiss) onDismiss(); }, 4000);
    return () => clearTimeout(t);
  }, [badge, onDismiss]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          key={badge.type}
          initial={{ opacity: 0, y: 80, scale: 0.85 }}
          animate={{ opacity: 1, y:  0, scale: 1    }}
          exit={{    opacity: 0, y: 80, scale: 0.85 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                     w-[90vw] max-w-sm"
        >
          {/* Glowing border wrapper */}
          <div
            className={`bg-gradient-to-r ${meta.color} rounded-2xl p-0.5 shadow-2xl`}
            style={{ boxShadow: `0 0 30px ${meta.glow}55` }}
          >
            <div className="bg-[#0d0d1f]/90 backdrop-blur-xl rounded-2xl
                            px-5 py-4 flex items-center gap-4">
              {/* Icon */}
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${meta.color}
                               flex items-center justify-center text-2xl flex-shrink-0`}>
                {badge.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                  Achievement Unlocked
                </p>
                <p className="text-white font-bold text-sm mt-0.5">{badge.title}</p>
                <p className="text-gray-300 text-xs mt-0.5 leading-snug">{badge.desc}</p>
              </div>

              {/* Close */}
              <button
                onClick={onDismiss}
                className="text-gray-500 hover:text-white transition-colors
                           text-lg self-start flex-shrink-0"
              >✕</button>
            </div>
          </div>

          {/* Auto-close progress bar */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 4, ease: 'linear' }}
            className={`h-1 bg-gradient-to-r ${meta.color} rounded-full mt-1 opacity-50`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

