// src/hooks/useAchievements.js
import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore';

// ── Exported ACHIEVEMENTS definition ──────────────────────────────────────────
export const ACHIEVEMENTS = {
  first_solve: {
    id:    'first_solve',
    icon:  '🏆',
    title: 'First Solve',
    desc:  'Solved your very first challenge!',
    xp:    100,
  },
  ten_solves: {
    id:    'ten_solves',
    icon:  '💎',
    title: '10 Solves',
    desc:  'Solved 10 challenges in total!',
    xp:    250,
  },
  fifty_solves: {
    id:    'fifty_solves',
    icon:  '🌟',
    title: '50 Solves',
    desc:  'Solved 50 challenges — unstoppable!',
    xp:    500,
  },
  streak_3: {
    id:    'streak_3',
    icon:  '⚡',
    title: '3-Day Streak',
    desc:  'Logged in 3 days in a row!',
    xp:    50,
  },
  streak_7: {
    id:    'streak_7',
    icon:  '🔥',
    title: '7-Day Streak',
    desc:  'One full week of consistency!',
    xp:    150,
  },
  streak_14: {
    id:    'streak_14',
    icon:  '🔥🔥',
    title: '14-Day Streak',
    desc:  'Two weeks strong!',
    xp:    300,
  },
  streak_30: {
    id:    'streak_30',
    icon:  '🔥🔥🔥',
    title: '30-Day Streak',
    desc:  'Legendary dedication — 30 days!',
    xp:    750,
  },
  arena_win: {
    id:    'arena_win',
    icon:  '⚔️',
    title: 'Arena Victor',
    desc:  'Won your first Arena battle!',
    xp:    200,
  },
  arena_wins_10: {
    id:    'arena_wins_10',
    icon:  '🛡️',
    title: 'Arena Veteran',
    desc:  'Won 10 Arena battles!',
    xp:    400,
  },
  level_up: {
    id:    'level_up',
    icon:  '🚀',
    title: 'Level Up',
    desc:  'Reached a new level!',
    xp:    50,
  },
  first_publish: {
    id:    'first_publish',
    icon:  '📢',
    title: 'First Publish',
    desc:  'Published your first challenge!',
    xp:    150,
  },
  story_unlocked: {
    id:    'story_unlocked',
    icon:  '📖',
    title: 'Story Begins',
    desc:  'Generated your first AI life story!',
    xp:    100,
  },
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useAchievements(user) {
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [toast,       setToast]       = useState(null); // { type, title, desc }

  // ── Load existing achievements from Firestore ──
  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, 'users', user.uid);
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUnlockedIds(data.achievements || []);
      }
    }).catch((err) => console.error('useAchievements load error:', err));
  }, [user?.uid]);

  // ── Unlock an achievement ──
  const unlock = useCallback(async (type) => {
    if (!user?.uid) return;
    if (unlockedIds.includes(type)) return; // already unlocked

    const meta = ACHIEVEMENTS[type];
    if (!meta) return;

    try {
      const ref = doc(db, 'users', user.uid);
      await updateDoc(ref, {
        achievements:      arrayUnion(type),
        lastAchievementAt: serverTimestamp(),
      });

      setUnlockedIds((prev) => [...prev, type]);
      setToast({ type, title: meta.title, desc: meta.desc });
    } catch (err) {
      // If doc doesn't exist yet, create it
      try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(ref, {
          achievements:      [type],
          lastAchievementAt: serverTimestamp(),
        }, { merge: true });
        setUnlockedIds((prev) => [...prev, type]);
        setToast({ type, title: meta.title, desc: meta.desc });
      } catch (e) {
        console.error('useAchievements unlock error:', e);
      }
    }
  }, [user?.uid, unlockedIds]);

  // ── Dismiss toast ──
  const dismissToast = useCallback(() => setToast(null), []);

  // ── Check multiple conditions at once ──
  const checkAchievements = useCallback(({ solveCount, streak, arenaWins, level }) => {
    if (solveCount  === 1)  unlock('first_solve');
    if (solveCount  === 10) unlock('ten_solves');
    if (solveCount  === 50) unlock('fifty_solves');
    if (streak      === 3)  unlock('streak_3');
    if (streak      === 7)  unlock('streak_7');
    if (streak      === 14) unlock('streak_14');
    if (streak      === 30) unlock('streak_30');
    if (arenaWins   === 1)  unlock('arena_win');
    if (arenaWins   === 10) unlock('arena_wins_10');
    if (level       >   1)  unlock('level_up');
  }, [unlock]);

  return { unlockedIds, toast, unlock, dismissToast, checkAchievements };
}

