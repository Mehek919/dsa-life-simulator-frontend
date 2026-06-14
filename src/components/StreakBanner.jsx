// src/components/StreakBanner.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreakBanner({ streak = 0, show = true }) {
  if (!show || streak === 0) return null;

  const getStreakEmoji = (days) => {
    if (days >= 30) return '🔥🔥🔥';
    if (days >= 14) return '🔥🔥';
    if (days >= 7)  return '🔥';
    if (days >= 3)  return '⚡';
    return '✨';
  };

  const getStreakColor = (days) => {
    if (days >= 30) return 'from-red-600 to-orange-400';
    if (days >= 14) return 'from-orange-500 to-yellow-400';
    if (days >= 7)  return 'from-yellow-500 to-amber-400';
    if (days >= 3)  return 'from-cyan-500 to-blue-400';
    return 'from-purple-500 to-pink-400';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`w-full bg-gradient-to-r ${getStreakColor(streak)}
                    px-4 py-2 flex items-center justify-center gap-2
                    text-white text-sm font-bold shadow-lg z-20`}
      >
        <span className="text-base">{getStreakEmoji(streak)}</span>
        <span>
          {streak} Day Streak!
        </span>
        <span className="text-xs font-normal opacity-80">
          — Keep it up! +{streak * 10} bonus XP today
        </span>
        <span className="text-base">{getStreakEmoji(streak)}</span>
      </motion.div>
    </AnimatePresence>
  );
}
