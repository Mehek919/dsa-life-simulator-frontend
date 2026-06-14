// src/components/AchievementToast.jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACHIEVEMENT_META = {
  first_solve: {
    icon: '🏆',
    title: 'First Solve!',
    desc: 'You solved your first challenge!',
    color: 'from-yellow-500 to-amber-400',
    glow: '#f59e0b',
  },
  streak_3: {
    icon: '⚡',
    title: '3-Day Streak!',
    desc: 'Logged in 3 days in a row!',
    color: 'from-cyan-500 to-blue-400',
    glow: '#06b6d4',
  },
  streak_7: {
    icon: '🔥',
    title: '7-Day Streak!',
    desc: 'One week strong! Keep going!',
    color: 'from-orange-500 to-yellow-400',
    glow: '#f97316',
  },
  streak_30: {
    icon: '🔥🔥🔥',
    title: '30-Day Streak!',
    desc: 'Legendary dedication!',
    color: 'from-red-500 to-orange-400',
    glow: '#ef4444',
  },
  arena_win: {
    icon: '⚔️',
    title: 'Arena Victor!',
    desc: 'You won your first Arena battle!',
    color: 'from-red-600 to-pink-500',
    glow: '#ef4444',
  },
  level_up: {
    icon: '🚀',
    title: 'Level Up!',
    desc: 'You reached a new level!',
    color: 'from-purple-500 to-indigo-400',
    glow: '#8b5cf6',
  },
  ten_solves: {
    icon: '💎',
    title: '10 Solves!',
    desc: 'You solved 10 challenges!',
    color: 'from-blue-500 to-cyan-400',
    glow: '#3b82f6',
  },
  default: {
    icon: '🎖️',
    title: 'Achievement Unlocked!',
    desc: 'You did something awesome!',
    color: 'from-green-500 to-teal-400',
    glow: '#10b981',
  },
};

export default function AchievementToast({ achievement, onClose }) {
  const meta = ACHIEVEMENT_META[achievement?.type] || ACHIEVEMENT_META.default;

  // Auto-close after 4 seconds
  useEffect(() => {
    if (!achievement) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [achievement, onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          key={achievement.type}
          initial={{ opacity: 0, y: 80, scale: 0.8 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{    opacity: 0, y: 80, scale: 0.8  }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                     w-[90vw] max-w-sm"
        >
          <div
            className={`bg-gradient-to-r ${meta.color} rounded-2xl p-0.5 shadow-2xl`}
            style={{ boxShadow: `0 0 30px ${meta.glow}66` }}
          >
            <div className="bg-[#0d0d1f]/90 backdrop-blur-xl rounded-2xl
                            px-5 py-4 flex items-center gap-4">

              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-full bg-gradient-to-br ${meta.color}
                            flex items-center justify-center text-2xl flex-shrink-0
                            shadow-lg`}
              >
                {meta.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                  Achievement Unlocked
                </p>
                <p className="text-white font-bold text-sm mt-0.5 leading-tight">
                  {achievement?.title || meta.title}
                </p>
                <p className="text-gray-300 text-xs mt-0.5 leading-snug">
                  {achievement?.desc || meta.desc}
                </p>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white text-lg flex-shrink-0
                           transition-colors leading-none self-start"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress bar auto-close indicator */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 4, ease: 'linear' }}
            className={`h-1 bg-gradient-to-r ${meta.color} rounded-full mt-1 opacity-60`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
