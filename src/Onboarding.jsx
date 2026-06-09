import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE from './config';
const Onboarding = ({ user, onComplete }) => {
  const navigate = useNavigate();
  const [stage, setStage] = useState('intro'); // intro → questions → role
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [roleData, setRoleData] = useState(null);

  // ===== STAGE 1: Generate Questions =====
  const handleStartOnboarding = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/onboard/generate-questions`,
        {
          name: user.displayName,
          email: user.email,
        }
      );
      setQuestions(response.data.questions);
      setStage('questions');
    } catch (error) {
      console.error('❌ Failed to generate questions:', error);
      alert('Error starting onboarding. Check backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // ===== STAGE 2: Handle Answer =====
  const handleAnswerChange = (e) => {
    setAnswers({
      ...answers,
      [currentQuestion]: e.target.value,
    });
  };

  const handleNextQuestion = () => {
    if (!answers[currentQuestion]) {
      alert('Please answer before continuing');
      return;
    }
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmitAnswers();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // ===== STAGE 3: Submit Answers & Get Role =====
  const handleSubmitAnswers = async () => {
    setLoading(true);
    try {
      const answerArray = questions.map((_, idx) => answers[idx] || '');

      const response = await axios.post(
        `${API_BASE}/onboard/analyze-answers`,
        {
          userId: user.uid,
          name: user.displayName,
          questions,
          answers: answerArray,
        }
      );

      setRoleData(response.data.roleAnalysis);
      setStage('role');
    } catch (error) {
      console.error('❌ Failed to analyze answers:', error);
      alert('Error processing your answers. Check backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterWorld = () => {
    onComplete();
    navigate('/world');
  };

  // ========== INTRO STAGE ==========
  if (stage === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] via-[#1a1a2e] to-[#0f0f1a] flex items-center justify-center p-4">
        {/* Glowing background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-blue-500 opacity-10 blur-3xl rounded-full -top-20 -left-20"></div>
          <div className="absolute w-96 h-96 bg-purple-500 opacity-10 blur-3xl rounded-full -bottom-20 -right-20"></div>
        </div>

        <div className="relative z-10 max-w-2xl w-full text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎭 Welcome to Your New Life
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Before you enter the world, let's discover who you really are as a
            developer.
          </p>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-8 mb-8">
            <p className="text-gray-200 mb-6">
              We'll ask you 5 questions about your approach to coding,
              challenges, and collaboration. Your answers will shape your unique
              Life Role in the simulator.
            </p>
            <p className="text-sm text-gray-400">
              ⏱️ This takes about 3 minutes
            </p>
          </div>

          <button
            onClick={handleStartOnboarding}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            {loading ? '⏳ Generating Questions...' : '🚀 Start Onboarding'}
          </button>
        </div>
      </div>
    );
  }

  // ========== QUESTIONS STAGE ==========
  if (stage === 'questions' && questions.length > 0) {
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] via-[#1a1a2e] to-[#0f0f1a] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-gray-400 text-sm mb-2">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {questions[currentQuestion].question}
            </h2>

            <textarea
              value={answers[currentQuestion] || ''}
              onChange={handleAnswerChange}
              placeholder="Share your thoughts..."
              className="w-full bg-white/5 border border-white/20 text-white rounded-lg p-4 mb-6 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 min-h-24"
            />

            <div className="flex gap-4">
              <button
                onClick={handlePrevQuestion}
                disabled={currentQuestion === 0}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                ← Back
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                {currentQuestion === questions.length - 1
                  ? loading
                    ? '⏳ Analyzing...'
                    : '✨ Reveal My Role'
                  : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== ROLE STAGE ==========
  if (stage === 'role' && roleData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] via-[#1a1a2e] to-[#0f0f1a] flex items-center justify-center p-4">
        {/* Animated background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-purple-500 opacity-20 blur-3xl rounded-full -top-20 -right-20 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-blue-500 opacity-20 blur-3xl rounded-full -bottom-20 -left-20 animate-pulse"></div>
        </div>

        <div className="relative z-10 max-w-2xl w-full">
          {/* Role Title */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
              {roleData.primaryRole}
            </h1>
            <p className="text-xl text-gray-300">
              {roleData.roleDescription}
            </p>
          </div>

          {/* Role Details Card */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-8 mb-8">
            {/* Traits */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-3">🎯 Your Traits</h3>
              <div className="flex flex-wrap gap-2">
                {roleData.traits.map((trait, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-500/20 border border-blue-400 text-blue-200 px-4 py-2 rounded-full text-sm"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            {/* Strengths */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-3">💪 Strengths</h3>
              <ul className="text-gray-300 space-y-2">
                {roleData.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-center">
                    <span className="text-green-400 mr-3">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Reasoning */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">
                🧠 Why This Role?
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {roleData.reasoning}
              </p>
            </div>
          </div>

          {/* Enter World Button */}
          <button
            onClick={handleEnterWorld}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition text-lg"
          >
            🌍 Enter the World →
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Onboarding;
