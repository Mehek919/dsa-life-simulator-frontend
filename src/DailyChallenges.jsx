import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE  from './config';

const LEVEL_NAMES = {
  1: 'Junior',
  2: 'Mid',
  3: 'Senior',
  4: 'Lead',
  5: 'Legend',
};

const DailyChallenges = ({ user, userData, setUserData, onRewardsEarned }) => {
  const [topic, setTopic] = useState(userData?.topic || 'Array');
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [bonusAwarded, setBonusAwarded] = useState(false);

  const fetchChallenges = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_BASE}/daily-challenges/${user.uid}`, {
        params: { topic },
      });

      const data = res.data || {};
      setChallenges(Array.isArray(data.challenges) ? data.challenges : []);
      setCompletedCount(data.completedCount || 0);
      setBonusAwarded(Boolean(data.bonusAwarded));
    } catch (err) {
      console.error('Failed to fetch daily challenges:', err);
      setError('⚠️ Failed to load daily challenges.');
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, topic]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleAnswerChange = (challengeId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [challengeId]: value,
    }));
  };

  const handleSubmit = async (challenge) => {
    const answer = (answers[challenge.id] || '').trim();

    if (answer.length < 10) {
      setToast('Answer must be at least 10 characters.');
      setTimeout(() => setToast(''), 2500);
      return;
    }

    try {
      setSubmittingId(challenge.id);
      setError('');

      const res = await axios.post(
        `${API_BASE}/daily-challenges/${user.uid}/submit/${challenge.id}`,
        {
          userId: user.uid,
          challengeId: challenge.id,
          answer,
          topic,
          difficulty: challenge.difficulty,
        }
      );

      const data = res.data || {};

      setChallenges((prev) =>
        prev.map((item) =>
          item.id === challenge.id ? { ...item, completed: true } : item
        )
      );

      setCompletedCount(data.completedCount || 0);
      setBonusAwarded(Boolean(data.bonusAwarded));

      const updatedUserData = {
        ...(userData || {}),
        credits: data.newCredits ?? userData?.credits ?? 0,
        xp: data.newXp ?? userData?.xp ?? 0,
        level: data.newLevel ?? userData?.level ?? 1,
      };

      if (typeof setUserData === 'function') {
        setUserData(updatedUserData);
      }

      if (typeof onRewardsEarned === 'function') {
        onRewardsEarned({
          newCredits: data.newCredits,
          newXp: data.newXp,
          newLevel: data.newLevel,
        });
      }

      const creditsAwarded =
        data.creditsAwarded ?? challenge.creditsReward ?? challenge.credits ?? 0;
      const xpAwarded =
        data.xpAwarded ?? challenge.xpReward ?? challenge.xp ?? 0;

      setToast(`✅ Challenge completed! +${creditsAwarded} credits, +${xpAwarded} XP`);
      setAnswers((prev) => ({
        ...prev,
        [challenge.id]: '',
      }));

      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      console.error('Failed to submit challenge:', err);
      const message =
        err.response?.data?.error || '⚠️ Failed to submit challenge.';
      setError(message);
      setToast(message);
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSubmittingId(null);
    }
  };

  if (!user?.uid) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
        Please sign in to access daily challenges.
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl border border-cyan-400/20 bg-slate-950/70 p-6 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cyan-300">Daily Challenges</h2>
          <p className="mt-1 text-sm text-slate-300">
            Solve today&apos;s challenges to earn XP, credits, and level up your journey.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm">
            <span className="text-slate-300">Level:</span>{' '}
            <span className="font-semibold text-cyan-300">
              {LEVEL_NAMES[userData?.level || 1]}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm">
            <span className="text-slate-300">Completed:</span>{' '}
            <span className="font-semibold text-emerald-300">{completedCount}/3</span>
          </div>

          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
          >
            <option value="Array">Array</option>
            <option value="String">String</option>
            <option value="Linked List">Linked List</option>
            <option value="Tree">Tree</option>
            <option value="Graph">Graph</option>
            <option value="DP">DP</option>
          </select>

          <button
            onClick={fetchChallenges}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Refresh
          </button>
        </div>
      </div>

      {bonusAwarded && (
        <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          🎉 Daily bonus unlocked! You completed 3 challenges today.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center text-slate-300">
          Loading daily challenges...
        </div>
      ) : challenges.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
          No challenges available right now.
        </div>
      ) : (
        <div className="grid gap-5">
          {challenges.map((challenge) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{challenge.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{challenge.description}</p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-cyan-300">
                    {challenge.difficulty || 'medium'}
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">
                    +{challenge.xpReward ?? challenge.xp ?? 50} XP
                  </span>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-300">
                    +{challenge.creditsReward ?? challenge.credits ?? 20} Credits
                  </span>
                  {challenge.timeLimit ? (
                    <span className="rounded-full bg-fuchsia-500/15 px-3 py-1 text-fuchsia-300">
                      {challenge.timeLimit} min
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mb-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-300">
                <span className="font-medium text-slate-200">Expected format:</span>{' '}
                {challenge.expectedFormat || 'Explain your approach clearly.'}
              </div>

              <textarea
                value={answers[challenge.id] || ''}
                onChange={(e) => handleAnswerChange(challenge.id, e.target.value)}
                disabled={challenge.completed}
                rows={5}
                placeholder="Write your explanation and core logic here..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-400">
                  {(answers[challenge.id] || '').trim().length}/10 minimum characters
                </div>

                <button
                  onClick={() => handleSubmit(challenge)}
                  disabled={challenge.completed || submittingId === challenge.id}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    challenge.completed
                      ? 'cursor-not-allowed bg-emerald-500/20 text-emerald-300'
                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70'
                  }`}
                >
                  {challenge.completed
                    ? 'Completed'
                    : submittingId === challenge.id
                    ? 'Submitting...'
                    : 'Submit'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            className="fixed bottom-6 right-6 z-50 rounded-2xl border border-cyan-400/20 bg-slate-900/95 px-5 py-3 text-sm text-white shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default DailyChallenges;


