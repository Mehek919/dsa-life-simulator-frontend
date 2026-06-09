import { db } from '../firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

// ─────────────────────────────────────────
// 🏆 LEVEL THRESHOLDS
// ─────────────────────────────────────────
export const LEVEL_CONFIG = [
  { level: 1,  title: 'Junior',   minXP: 0     },
  { level: 2,  title: 'Mid',      minXP: 500   },
  { level: 3,  title: 'Senior',   minXP: 1500  },
  { level: 4,  title: 'Lead',     minXP: 3500  },
  { level: 5,  title: 'Legend',   minXP: 7000  },
];

// ─────────────────────────────────────────
// 💡 CREDIT/XP REWARD CONFIG
// ─────────────────────────────────────────
export const REWARDS = {
  SOLVE_EASY:          { credits: 10,  xp: 15  },
  SOLVE_MEDIUM:        { credits: 20,  xp: 30  },
  SOLVE_HARD:          { credits: 30,  xp: 50  },
  CREATE_CHALLENGE:    { credits: -50, xp: 20  }, // costs 50 credits
  DAILY_STREAK_BONUS:  { credits: 25,  xp: 40  },
  FIRST_LOGIN:         { credits: 100, xp: 0   },
  COMPLETE_ASSESSMENT: { credits: 15,  xp: 25  },
};

// ─────────────────────────────────────────
// 🔢 COMPUTE LEVEL FROM XP
// ─────────────────────────────────────────
export const computeLevel = (xp) => {
  let current = LEVEL_CONFIG[0];
  for (const tier of LEVEL_CONFIG) {
    if (xp >= tier.minXP) current = tier;
  }

  // Find next level for progress bar
  const nextTier = LEVEL_CONFIG.find((t) => t.minXP > xp) || null;
  const progressToNext = nextTier
    ? Math.floor(((xp - current.minXP) / (nextTier.minXP - current.minXP)) * 100)
    : 100;

  return {
    level: current.level,
    levelTitle: current.title,
    nextLevelTitle: nextTier?.title || 'MAX',
    nextLevelXP: nextTier?.minXP || xp,
    progressToNext,
  };
};

// ─────────────────────────────────────────
// 💰 AWARD CREDITS + XP
// ─────────────────────────────────────────
export const awardEconomy = async (userId, rewardKey) => {
  const reward = REWARDS[rewardKey];
  if (!reward) {
    console.error(`❌ Unknown reward key: ${rewardKey}`);
    return null;
  }

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const userData = userSnap.data();
  const newXP      = (userData.xp || 0) + reward.xp;
  const newCredits = (userData.credits || 0) + reward.credits;
  const levelInfo  = computeLevel(newXP);

  await updateDoc(userRef, {
    credits:    newCredits,
    xp:         newXP,
    level:      levelInfo.level,
    levelTitle: levelInfo.levelTitle,
  });

  console.log(`✅ [Economy] ${rewardKey} → +${reward.credits} credits, +${reward.xp} XP`);

  return {
    credits:    newCredits,
    xp:         newXP,
    ...levelInfo,
    reward,
  };
};

// ─────────────────────────────────────────
// 🔥 DAILY STREAK HANDLER
// ─────────────────────────────────────────
export const handleDailyStreak = async (userId) => {
  const userRef  = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const userData      = userSnap.data();
  const today         = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const lastLogin     = userData.lastLoginDate || null;
  const currentStreak = userData.streak || 0;

  // Already logged in today — no bonus
  if (lastLogin === today) {
    console.log('ℹ️ Already logged in today. No streak bonus.');
    return { streakUpdated: false, streak: currentStreak };
  }

  // Check if yesterday — continue streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const isConsecutive = lastLogin === yesterdayStr;
  const newStreak     = isConsecutive ? currentStreak + 1 : 1;

  // Update streak in Firestore
  await updateDoc(userRef, {
    streak:        newStreak,
    lastLoginDate: today,
  });

  // Award bonus if streak >= 2
  let bonusResult = null;
  if (newStreak >= 2) {
    bonusResult = await awardEconomy(userId, 'DAILY_STREAK_BONUS');
    console.log(`🔥 Streak bonus awarded! Day ${newStreak}`);
  }

  return {
    streakUpdated: true,
    streak:        newStreak,
    bonusAwarded:  newStreak >= 2,
    bonusResult,
  };
};

// ─────────────────────────────────────────
// 💳 FETCH LATEST WALLET DATA
// ─────────────────────────────────────────
export const fetchWallet = async (userId) => {
  const userRef  = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const data      = userSnap.data();
  const levelInfo = computeLevel(data.xp || 0);

  return {
    credits:    data.credits || 0,
    xp:         data.xp || 0,
    streak:     data.streak || 0,
    ...levelInfo,
  };
};
