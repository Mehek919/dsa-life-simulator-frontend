
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const topicOrder = [
  'Array','LinkedList','Stack',
  'Queue','Tree','Graph','DynamicProgramming'
];

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `$${s} sec` : `$${m} min $${s} sec`;
};

function Results({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const result   = location.state || {};

  const { score, totalScore, answers = [], timeTaken, topic } = result;

  if (!score && score !== 0) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">⚠️ No result data found.</h2>
        <button onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-colors">
          🏠 Go to Home
        </button>
      </div>
    );
  }

  const totalQuestions = answers.length;
  const correctCount   = answers.filter(a => a.isRight).length;
  const wrongCount     = totalQuestions - correctCount;

  const scoreColor =
    correctCount === totalQuestions ? 'text-green-400' :
    correctCount >= totalQuestions / 2 ? 'text-orange-400' : 'text-red-400';

  const scoreLabel =
    correctCount === totalQuestions ? '🏆 Perfect Score!' :
    correctCount >= totalQuestions / 2 ? '👍 Good Effort!' : '💪 Keep Practicing!';

  const nextTopic = topicOrder[topicOrder.indexOf(topic) + 1] || null;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans flex flex-col items-center px-4 py-10">

      {/* Title */}
      <h2 className="text-2xl font-bold mb-1 animate-fade-slide-in">
        🧪 DSA Assessment — Results
      </h2>
      <p className="text-blue-400 text-sm mb-6">📌 Topic: {topic}</p>

      {/* Score Card */}
      <div className="w-full max-w-2xl bg-[#1a1a2e] rounded-2xl p-6 sm:p-8 mb-6 animate-pop-in">
        <p className="text-center text-xl mb-1">{scoreLabel}</p>
        <div className={`text-6xl sm:text-7xl font-bold text-center my-3 $${scoreColor}`}>
          {score} <span className="text-3xl text-gray-400">/ {totalScore}</span>
        </div>
        <p className="text-center text-gray-400 text-sm">Total Points Scored</p>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-[#0f0f1a] rounded-xl p-4 text-center border-t-2 border-green-500">
            <div className="text-3xl font-bold text-green-400">{correctCount}</div>
            <div className="text-gray-400 text-xs mt-1">✅ Correct</div>
          </div>
          <div className="bg-[#0f0f1a] rounded-xl p-4 text-center border-t-2 border-red-500">
            <div className="text-3xl font-bold text-red-400">{wrongCount}</div>
            <div className="text-gray-400 text-xs mt-1">❌ Wrong</div>
          </div>
          <div className="bg-[#0f0f1a] rounded-xl p-4 text-center border-t-2 border-blue-500">
            <div className="text-3xl font-bold text-blue-400">{totalQuestions}</div>
            <div className="text-gray-400 text-xs mt-1">📋 Total</div>
          </div>
          <div className="bg-[#0f0f1a] rounded-xl p-4 text-center border-t-2 border-orange-500">
            <div className="text-xl font-bold text-orange-400">{formatTime(timeTaken)}</div>
            <div className="text-gray-400 text-xs mt-1">⏱️ Time Taken</div>
          </div>
        </div>
      </div>

      {/* Answer Breakdown */}
      <div className="w-full max-w-2xl bg-[#1a1a2e] rounded-2xl p-6 sm:p-8 mb-6">
        <p className="text-gray-400 font-bold text-lg mb-4">📋 Answer Breakdown</p>
        {answers.map((a, index) => (
          <div key={index} className={`rounded-xl p-4 mb-3 border
            $${a.isRight ? 'bg-green-900/30 border-green-600' : 'bg-red-900/30 border-red-600'}`}>
            <div className="flex justify-between mb-2">
              <span className="font-bold">Q{index + 1}</span>
              <span className={`font-bold $${a.isRight ? 'text-green-400' : 'text-red-400'}`}>
                {a.isRight ? '✅ Correct' : '❌ Wrong'} — {a.points} pts
              </span>
            </div>
            <div className="text-sm text-gray-300 mb-1">
              Your Answer:{' '}
              <strong className={a.isRight ? 'text-green-400' : 'text-red-400'}>
                Option {a.selected + 1}
              </strong>
            </div>
            {!a.isRight && (
              <div className="text-sm text-gray-300">
                Correct Answer:{' '}
                <strong className="text-green-400">Option {a.correct + 1}</strong>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Next Topic */}
      {nextTopic && (
        <div className="w-full max-w-2xl bg-[#1a1a2e] border-t-4 border-blue-500 rounded-2xl p-6 mb-6">
          <p className="text-gray-400 text-sm mb-2">🎯 Up Next</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xl font-bold">{nextTopic}</p>
              <p className="text-gray-400 text-sm mt-1">Ready to level up?</p>
            </div>
            <button onClick={() => navigate(`/assessment/$${nextTopic}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors">
              Start →
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        <button onClick={() => navigate(`/assessment/$${topic}`)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors">
          🔁 Try Again
        </button>
        <button onClick={() => navigate('/')}
          className="flex-1 bg-[#333] hover:bg-[#444] text-white py-3 rounded-xl font-bold transition-colors">
          🏠 Go to Home
        </button>
      </div>

    </div>
  );
}

export default Results;


