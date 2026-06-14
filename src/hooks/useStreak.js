


import { useState, useEffect, useCallback } from 'react';
import {
  doc, getDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export default function useStreak(user) {
  const [streak,      setStreak]      = useState(0);
  const [bestStreak,  setBestStreak]  = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const [loading,     setLoading]     = useState(true);

  const uid = user?.uid;

  // ── Check & update streak on mount ──────────────────────────────────────
  const checkStreak = useCallback(async () => {
    if (!uid) return;
    setLoading(true);

    try {
      const ref  = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data        = snap.data();
      const now         = new Date();
      const todayStr    = now.toISOString().slice(0, 10);          // "2025-01-15"
      const lastLoginStr = data.lastLoginDate || '';

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      let newStreak = data.currentStreak || 0;
      let claimed   = false;

      if (lastLoginStr === todayStr) {
        // Already claimed today
        claimed = true;
      } else if (lastLoginStr === yesterdayStr) {
        // Consecutive day — increment
        newStreak += 1;
        await updateDoc(ref, {
          currentStreak: newStreak,
          bestStreak:    Math.max(newStreak, data.bestStreak || 0),
          lastLoginDate: todayStr,
          lastLoginAt:   serverTimestamp(),
          xp:            (data.xp || 0) + getStreakXP(newStreak),
        });
        claimed = true;
      } else if (lastLoginStr < yesterdayStr || !lastLoginStr) {
        // Streak broken or first login
        newStreak = 1;
        await updateDoc(ref, {
          currentStreak: 1,
          bestStreak:    Math.max(1, data.bestStreak || 0),
          lastLoginDate: todayStr,
          lastLoginAt:   serverTimestamp(),
          xp:            (data.xp || 0) + 10,
        });
        claimed = true;
      }

      setStreak(newStreak);
      setBestStreak(Math.max(newStreak, data.bestStreak || 0));
      setClaimedToday(claimed);
    } catch (err) {
      console.error('[useStreak]', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { checkStreak(); }, [checkStreak]);

  return { streak, bestStreak, claimedToday, loading };
}

// XP reward scales with streak
function getStreakXP(streak) {
  if (streak >= 30) return 100;
  if (streak >= 14) return 60;
  if (streak >= 7)  return 40;
  if (streak >= 3)  return 25;
  return 10;
}
