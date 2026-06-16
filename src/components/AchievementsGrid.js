// src/components/AchievementsGrid.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { ACHIEVEMENTS } from '../hooks/useAchievements';

export default function AchievementsGrid({ unlocked = [] }) {
  const all = Object.values(ACHIEVEMENTS);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏅</span>
          <h2 className="text-white font-bold text-base tracking-wide">Badges</h2>
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {unlocked.length} / {all.length} unlocked
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(unlocked.length / all.length) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {all.map((badge, i) => {
          const isUnlocked = unlocked.includes(badge.id);
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1    }}
              transition={{ delay: i * 0.04 }}
              title={badge.desc}
              className={`relative flex flex-col items-center gap-1.5 p-3
                          rounded-xl border text-center transition-all
                          ${isUnlocked
                            ? 'bg-cyan-500/10 border-cyan-500/30'
                            : 'bg-white/5   border-white/5 opacity-40'
                          }`}
            >
              {/* Badge icon */}
              <span className={`text-2xl ${!isUnlocked && 'grayscale'}`}>
                {isUnlocked ? badge.icon : '🔒'}
              </span>

              {/* Badge name */}
              <p className={`text-[10px] font-semibold leading-tight
                             ${isUnlocked ? 'text-cyan-300' : 'text-gray-600'}`}>
                {badge.title}
              </p>

              {/* XP reward */}
              {isUnlocked && (
                <span className="text-[9px] text-yellow-400 font-mono">
                  +{badge.xp} XP
                </span>
              )}

              {/* Unlocked glow dot */}
              {isUnlocked && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5
                                 rounded-full bg-cyan-400" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

