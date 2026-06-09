import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import allQuestions from './questions';

function Assessment({ user }) {
  const { topic } = useParams();
  const navigate = useNavigate();
  const questions = allQuestions.filter(q => q.topic === topic);

  const [current,   setCurrent]   = useState(0);
  const [score,     setScore]     = useState(0);
  const [selected,  setSelected]  = useState(null);
  const [answered,  setAnswered]  = useState(false);
  const [timeLeft,  setTimeLeft]  = useState(900);
  const [answers,   setAnswers]   = useState([]);
  const [animating, setAnimating] = useState(false);

  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const q        = questions[current];
  const mins     = Math.floor(timeLeft / 60);
  const secs     = timeLeft % 60;
  const progress = (current / questions.length) * 100;

  // ---- handleSubmit wrapped in useCallback ----
  const handleSubmit = useCallback(async (finalScore) => {
    const timeTaken     = 900 - timeLeft;
    const totalScore    = questions.reduce((sum, q) => sum + q.points, 0);
    const latestAnswers = answersRef.current;

    try {
      const res = await axios.post(`${API_BASE}/assess`, {
        userId:     user.uid,
        name:       user.displayName,
        email:      user.email,
        topic,
        score:      finalScore,
        totalScore,
        timeTaken,
        answers:    latestAnswers
      });
      navigate('/results/' + res.data.assessmentId, {
        state: { score: finalScore, totalScore, timeTaken, answers: latestAnswers, topic }
      });
    } catch (err) {
      navigate('/results/local_' + Date.now(), {
        state: { score: finalScore, totalScore, timeTaken, answers: latestAnswers, topic }
      });
    }
  }, [timeLeft, questions, user, topic, navigate]);

  // ---- Countdown Timer ----
  useEffect(() => {
    if (timeLeft <= 0) { handleSubmit(score); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, handleSubmit, score]);

  const handleSelect = (index) => {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
  };

  const handleNext = () => {
    let newScore = score;
    if (selected === q.correct) newScore += q.points;

    setAnswers(prev => [...prev, {
      questionId: q.id,
      selected,
      correct:  q.correct,
      isRight:  selected === q.correct,
      points:   selected === q.correct ? q.points : 0
    }]);

    setScore(newScore);

    if (current + 1 < questions.length) {
      setAnimating(true);
      setTimeout(() => {
        setCurrent(c => c + 1);
        setSelected(null);
        setAnswered(false);
        setAnimating(false);
      }, 250);
    } else {
      handleSubmit(newScore);
    }
  };

  const getOptionClasses = (index) => {
    const base = 'w-full px-4 py-3 my-2 rounded-xl border-2 text-left text-sm sm:text-base font-medium transition-all duration-200 ';
    if (!answered) {
      return base + (selected === index
        ? 'bg-blue-600 border-blue-500 text-white'
        : 'bg-[#1e1e2e] border-[#333] text-white hover:border-blue-500 hover:bg-[#252540] cursor-pointer'
      );
    }
    if (index === q.correct)
      return base + 'bg-green-900/60 border-green-500 text-green-400 cursor-default';
    if (index === selected && selected !== q.correct)
      return base + 'bg-red-900/60 border-red-500 text-red-400 cursor-default';
    return base + 'bg-[#1e1e2e] border-[#333] text-gray-600 cursor-default';
  };

  const difficultyClass =
    q?.difficulty === 'easy'   ? 'bg-green-900/60 text-green-400'   :
    q?.difficulty === 'medium' ? 'bg-yellow-900/60 text-yellow-400' :
                                  'bg-red-900/60 text-red-400';

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold mb-2">⚠️ No questions found</h2>
        <p className="text-gray-400">Topic: <strong>{topic}</strong></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans flex flex-col items-center px-4 py-8">

      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">🧪 DSA Assessment</h2>
          <p className="text-blue-400 text-sm mt-1">📌 Topic: {topic}</p>
        </div>
        <div className={'px-5 py-2 rounded-xl text-xl font-bold transition-colors duration-500 ' + (timeLeft < 60 ? 'bg-red-900/60 text-red-400' : 'bg-green-900/40 text-green-400')}>
          ⏱️ {mins}:{secs < 10 ? '0' + secs : secs}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-2xl bg-[#1e1e2e] rounded-full h-2 mb-2">
        <div
          className="h-2 bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: progress + '%' }}
        />
      </div>

      {/* Counter */}
      <div className="w-full max-w-2xl flex justify-between text-gray-400 text-sm mb-6">
        <span>Question {current + 1} of {questions.length}</span>
        <span>Score: {score} pts</span>
      </div>

      {/* Question Card */}
      <div className={'w-full max-w-2xl bg-[#1a1a2e] rounded-2xl p-6 sm:p-8 ' + (animating ? 'animate-fade-slide-out' : 'animate-fade-slide-in')}>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={'px-3 py-1 rounded-full text-xs font-bold ' + difficultyClass}>
            {q.difficulty.toUpperCase()}
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-blue-900/50 text-blue-300">
            📌 {q.topic}
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-purple-900/50 text-purple-300">
            ⭐ {q.points} pts
          </span>
        </div>

        {/* Question */}
        <h3 className="text-base sm:text-lg leading-relaxed mb-6">{q.question}</h3>

        {/* Options */}
        {q.options.map((option, index) => (
          <button
            key={index}
            className={getOptionClasses(index)}
            onClick={() => handleSelect(index)}
            disabled={answered}
          >
            {option}
          </button>
        ))}

        {/* Next / Submit Button */}
        <button
          onClick={handleNext}
          disabled={!answered}
          className={'mt-6 px-6 py-3 rounded-xl text-base font-bold transition-all duration-200 ' + (answered ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' : 'bg-[#333] text-gray-500 cursor-not-allowed opacity-50')}
        >
          {current + 1 < questions.length ? 'Next ➡️' : '✅ Submit'}
        </button>
      </div>
    </div>
  );
}

export default Assessment;
