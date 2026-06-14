import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ACHIEVEMENTS } from '../hooks/useAchievements';

const CATEGORIES = [
  { id:'all',       label:'All',        icon:'🏅' },
  { id:'challenge', label:'Challenges', icon:'🧩' },
  { id:'streak',    label:'Streaks',    icon:'🔥' },
  { id:'arena',     label:'Arena',      icon:'⚔️' },
  { id:'community', label:'Community',  icon:'🌍' },
  { id:'story',     label:'Stories',    icon:'📖' },
  { id:'level',     label:'Levels',     icon:'🚀' },
];

const CATEGORY_MAP = {
  first_solve:'challenge', solve_10:'challenge', solve_50:'challenge', solve_100:'challenge',
  streak_3:'streak',       streak_7:'streak',    streak_14:'streak',   streak_30:'streak',
  first_arena_win:'arena', arena_10_wins:'arena',arena_elo_1200:'arena',arena_elo_1500:'arena',
  first_challenge:'community', challenge_rated:'community',
  first_story:'story',    story_5:'story',
  reach_mid:'level',      reach_senior:'level', reach_legend:'level',
};

export default function AchievementsGrid({ unlocked = [] }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const unlockedSet = new Set(unlocked);

  const filtered = ACHIEVEMENTS.filter(a =>
    activeCategory === 'all' || CATEGORY_MAP[a.id] === activeCategory
  );

  const unlockedCount = ACHIEVEMENTS.filter(a => unlockedSet.has(a.id)).length;
  const pct = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);

  return (
    <div className="space-y-5">

      {/* Progress header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-black text-lg">
              {unlockedCount} / {ACHIEVEMENTS.length} Unlocked
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {pct}% complete
            </p>
          </div>
          <span className="text-3xl">🏅</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 rounded-full"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                        text-xs font-semibold whitespace-nowrap flex-shrink-0
                        transition-all
                        ${activeCategory === cat.id
                          ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                        }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((badge, i) => {
          const isUnlocked = unlockedSet.has(badge.id);
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y:  0  }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 p-4 rounded-xl border
                          transition-all
                          ${isUnlocked
                            ? 'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-white/3 border-white/5 opacity-50 grayscale'
                          }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                               text-2xl flex-shrink-0 border
                               ${isUnlocked
                                 ? 'bg-yellow-500/20 border-yellow-500/30'
                                 : 'bg-white/5 border-white/10'
                               }`}>
                {badge.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm leading-none
                               ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                  {badge.label}
                </p>
                <p className="text-gray-500 text-xs mt-1 leading-snug">
                  {badge.desc}
                </p>
              </div>
              <span className={`text-xs font-black flex-shrink-0
                                ${isUnlocked ? 'text-yellow-400' : 'text-gray-700'}`}>
                +{badge.xp}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
