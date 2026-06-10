const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const OpenAI = require('openai');
const { incrementWeeklyStat } = require('../utils/weeklyStats');

const db = admin.firestore();
const openai = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };

const challengeTemplates = {
  Array: [
    {
      id: 'arr_1',
      title: 'Two Sum',
      description: 'Find two numbers in an array that add up to a target sum.',
      difficulty: 'easy',
      xp: 50,
      credits: 10,
      timeLimit: 15,
      expectedFormat: 'Explain your approach and provide the core logic.',
    },
    {
      id: 'arr_2',
      title: 'Max Subarray',
      description: "Find the contiguous subarray with the largest sum using Kadane's Algorithm.",
      difficulty: 'medium',
      xp: 100,
      credits: 20,
      timeLimit: 20,
      expectedFormat: 'Describe the idea and why Kadane works.',
    },
    {
      id: 'arr_3',
      title: 'Rotate Array',
      description: 'Rotate an array to the right by k steps in-place.',
      difficulty: 'medium',
      xp: 100,
      credits: 20,
      timeLimit: 20,
      expectedFormat: 'Explain the in-place rotation method.',
    },
  ],
};

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userSnap.data() || {};
    const topic = userData.topic || req.query.topic || 'Array';
    const today = new Date().toISOString().split('T')[0];

    const completedToday = userData.completedChallenges?.[today] || [];
    const templates = challengeTemplates[topic] || challengeTemplates.Array;

    let challenges = [];

    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY missing');
      }

      const prompt = `You are a DSA challenge generator for a life simulator game.
Generate exactly 3 daily coding challenges for topic: ${topic}.
Return ONLY a valid JSON array of exactly 3 objects with fields:
"id" (string),
"title" (string),
"description" (string),
"difficulty" ("easy"|"medium"|"hard"),
"xp" (number),
"credits" (number),
"expectedFormat" (string),
"correctAnswer" (string).
No markdown. No explanation. Only raw JSON.`;

      const completion = await openai.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = completion?.choices?.[0]?.message?.content?.trim();

      if (!raw) {
        throw new Error('Empty AI response');
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        throw new Error('AI response is not an array');
      }

      challenges = parsed.slice(0, 3).map((c, index) => ({
        id: c.id || `ai_${index + 1}`,
        title: c.title || `Challenge ${index + 1}`,
        description: c.description || 'Solve this DSA challenge.',
        difficulty: c.difficulty || 'medium',
        xp: Number(c.xp) || 50,
        credits: Number(c.credits) || 20,
        expectedFormat: c.expectedFormat || 'Explain your approach clearly.',
        correctAnswer: c.correctAnswer || 'Provide a clear explanation of your solution.',
        completed: completedToday.includes(c.id),
        creditsReward: Number(c.credits) || 20,
        xpReward: Number(c.xp) || 50,
      }));
    } catch (aiErr) {
      console.warn('AI generation failed, using templates:', aiErr.message);

      challenges = templates.map((c) => ({
        ...c,
        expectedFormat: c.expectedFormat || 'Explain your approach clearly.',
        correctAnswer: c.correctAnswer || 'Provide a clear explanation of your solution.',
        completed: completedToday.includes(c.id),
        creditsReward: c.credits || 20,
        xpReward: c.xp || 50,
      }));
    }

    return res.json({
      success: true,
      dateKey: today,
      topic,
      challenges,
      completedCount: completedToday.length,
      bonusAwarded: userData.bonusAwarded?.[today] || false,
    });
  } catch (error) {
    console.error('GET /daily-challenges/:userId error:', error);
    return res.status(500).json({
      error: 'Failed to fetch daily challenges',
      details: error.message,
    });
  }
});

router.post('/:userId/submit/:challengeId', async (req, res) => {
  try {
    const { userId, challengeId } = req.params;
    const { answer, topic, difficulty } = req.body;

    if (!userId || !challengeId) {
      return res.status(400).json({ error: 'Missing userId or challengeId' });
    }

    if (!answer || answer.trim().length < 10) {
      return res.status(400).json({ error: 'Answer too short. Minimum 10 characters.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userSnap.data() || {};
    const completedToday = userData.completedChallenges?.[today] || [];

    if (completedToday.includes(challengeId)) {
      return res.status(400).json({ error: 'Challenge already completed today.' });
    }

    const creditsAwarded = 20;
    const xpAwarded = 50;

    const newCredits = (userData.credits || 0) + creditsAwarded;
    const newXp = (userData.xp || 0) + xpAwarded;

    const updatedCompleted = [...completedToday, challengeId];
    const completedCount = updatedCompleted.length;

    const bonusAwarded = completedCount >= 3 && !(userData.bonusAwarded?.[today]);
    const bonusCredits = bonusAwarded ? 50 : 0;
    const bonusXp = bonusAwarded ? 100 : 0;

    const finalCredits = newCredits + bonusCredits;
    const finalXp = newXp + bonusXp;
    const finalLevel = Math.min(5, Math.floor(finalXp / 500) + 1);
    const prevLevel = userData.level || 1;

    const updateData = {
      [`completedChallenges.${today}`]: admin.firestore.FieldValue.arrayUnion(challengeId),
      credits: finalCredits,
      xp: finalXp,
      level: finalLevel,
    };

    if (bonusAwarded) {
      updateData[`bonusAwarded.${today}`] = true;
    }

    await userRef.set(updateData, { merge: true });

    try {
      await logActivity({
        uid: userId,
        name: userData.name || 'Player',
        photoURL: userData.photoURL || '',
        type: 'challenge_solved',
        message: `🔥 ${userData.name || 'Player'} just solved a ${difficulty || 'Daily'} ${topic || userData.topic || 'DSA'} challenge`,
        meta: { topic: topic || userData.topic || 'Array', difficulty: difficulty || 'daily' },
      });
    } catch (logErr) {
      console.warn('logActivity failed:', logErr.message);
    }

    try {
      await incrementWeeklyStat(userId, 'solves');
      await incrementWeeklyStat(userId, 'creditsEarned', creditsAwarded + bonusCredits);
      await incrementWeeklyStat(userId, 'xpEarned', xpAwarded + bonusXp);

      if (bonusAwarded) {
        await incrementWeeklyStat(userId, 'streakDays');
        await incrementWeeklyStat(userId, 'bonusEarned', bonusCredits);
        await incrementWeeklyStat(userId, 'bonusXpEarned', bonusXp);
      }
    } catch (statsErr) {
      console.warn('weekly stat update failed:', statsErr.message);
    }

    if (finalLevel > prevLevel) {
      try {
        await logActivity({
          uid: userId,
          name: userData.name || 'Player',
          photoURL: userData.photoURL || '',
          type: 'level_up',
          message: `🚀 ${userData.name || 'Player'} just reached Level ${finalLevel} — ${LEVEL_NAMES[finalLevel]}!`,
          meta: { level: finalLevel },
        });
      } catch (levelErr) {
        console.warn('level up activity log failed:', levelErr.message);
      }
    }

    return res.json({
      success: true,
      completedCount,
      bonusAwarded,
      newCredits: finalCredits,
      newXp: finalXp,
      newLevel: finalLevel,
      creditsAwarded: creditsAwarded + bonusCredits,
      xpAwarded: xpAwarded + bonusXp,
    });
  } catch (error) {
    console.error('POST /daily-challenges/:userId/submit/:challengeId error:', error);
    return res.status(500).json({
      error: 'Failed to submit challenge',
      details: error.message,
    });
  }
});

module.exports = router;

