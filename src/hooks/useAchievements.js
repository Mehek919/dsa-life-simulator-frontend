import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACHIEVEMENTS } from '../hooks/useAchievements';

export default function AchievementToast({ newBadges, onDismiss }) {
  // Auto-dismiss after 5s
  useEffect(() => {
    if (newBadges.length === 0) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [newBadges, onDismiss]);

  const badges = newBadges
    .map(id => ACHIEVEMENTS.find(a => a.id === id))
    .filter(Boolean);

  return (
    <AnimatePresence>
      {badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.9 }}
          animate={{ opacity: 1, y:  0, scale: 1   }}
          exit={{   opacity: 0, y: 80, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999]
                     w-full max-w-sm px-4"
        >
          <div className="bg-[#0d0d1f] border border-yellow-500/30
                          rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20
                            px-5 py-3 flex items-center justify-between
                            border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <p className="text-white font-black text-sm">
                  Achievement Unlocked!
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="text-gray-500 hover:text-white transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            {/* Badges */}
            <div className="px-5 py-4 space-y-3">
              {badges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x:   0  }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20
                                  border border-yellow-500/30 flex items-center
                                  justify-center text-xl flex-shrink-0">
                    {badge.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm leading-none">
                      {badge.label}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">{badge.desc}</p>
                  </div>
                  <span className="text-yellow-400 text-xs font-black flex-shrink-0">
                    +{badge.xp} XP
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
