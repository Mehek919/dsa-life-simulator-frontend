import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// ── Constants ──────────────────────────────────────────────────────────────────
var TOPICS = [
  'Array', 'LinkedList', 'Stack', 'Queue',
  'Tree', 'Graph', 'DynamicProgramming',
];
var DIFFICULTIES = ['easy', 'medium', 'hard'];
var DIFFICULTY_COLORS = {
  easy:   '#00ff88',
  medium: '#f5a623',
  hard:   '#ff4d4d',
};
var PUBLISH_COST = 50;
var ORBS = [
  { color: '#a855f7', left: '10%', top: '20%', size: 300 },
  { color: '#1a73e8', left: '75%', top: '55%', size: 250 },
  { color: '#00c896', left: '45%', top: '75%', size: 180 },
];

// ── Animated Background ────────────────────────────────────────────────────────
function AnimatedBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: '#0f0f1a',
        overflow: 'hidden',
      }}
    >
      {ORBS.map(function(orb, i) {
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              width: orb.size + 'px',
              height: orb.size + 'px',
              background: orb.color,
              left: orb.left,
              top: orb.top,
              transform: 'translate(-50%, -50%)',
              filter: 'blur(80px)',
              opacity: 0.07,
              animation: 'pulse ' + (4 + i) + 's ease-in-out infinite alternate',
            }}
          />
        );
      })}
      <style>{`
        @keyframes pulse {
          from { opacity: 0.05; transform: translate(-50%,-50%) scale(1); }
          to   { opacity: 0.12; transform: translate(-50%,-50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Lab(props) {
  var user        = props.user;
  var userData    = props.userData;
  var setUserData = props.setUserData;

  var navigate = useNavigate();

  // form state
  var questionState      = useState('');
  var question           = questionState[0];
  var setQuestion        = questionState[1];

  var optionsState       = useState(['', '', '', '']);
  var options            = optionsState[0];
  var setOptions         = optionsState[1];

  var correctAnswerState = useState('');
  var correctAnswer      = correctAnswerState[0];
  var setCorrectAnswer   = correctAnswerState[1];

  var topicState         = useState('Array');
  var topic              = topicState[0];
  var setTopic           = topicState[1];

  var difficultyState    = useState('medium');
  var difficulty         = difficultyState[0];
  var setDifficulty      = difficultyState[1];

  // ui state
  var stepState          = useState('form');
  var step               = stepState[0];
  var setStep            = stepState[1];

  var reviewingState     = useState(false);
  var reviewing          = reviewingState[0];
  var setReviewing       = reviewingState[1];

  var publishingState    = useState(false);
  var publishing         = publishingState[0];
  var setPublishing      = publishingState[1];

  var improvedState      = useState(null);
  var improved           = improvedState[0];
  var setImproved        = improvedState[1];

  var toastState         = useState(null);
  var toast              = toastState[0];
  var setToast           = toastState[1];

  var publishedIdState   = useState(null);
  var publishedId        = publishedIdState[0];
  var setPublishedId     = publishedIdState[1];

  var credits = userData ? (userData.credits || 0) : 0;

  // ── ──────────────────────────────────────────────────────────────────
  function handleOptionChange(index, value) {
    setOptions(function(prev) {
      var next = prev.slice();
      next[index] = value;
      return next;
    });
  }

  function showToast(msg, type) {
    var t = type || 'success';
    setToast({ msg: msg, type: t });
    setTimeout(function() { setToast(null); }, 4000);
  }

  function validate() {
    if (question.trim().length < 20) {
      return 'Question must be at least 20 characters.';
    }
    var badOption = false;
    for (var i = 0; i < options.length; i++) {
      if (options[i].trim().length < 2) { badOption = true; break; }
    }
    if (badOption) { return 'All 4 options must be filled in.'; }
    if (!correctAnswer.trim()) { return 'Please select the correct answer.'; }
    if (options.indexOf(correctAnswer) === -1) {
      return 'Correct answer must match one of the 4 options exactly.';
    }
    return null;
  }

  // ── AI Review ────────────────────────────────────────────────────────────────
  async function handleAIReview() {
    var err = validate();
    if (err) {
      showToast('Warning: ' + err, 'warn');
      return;
    }
    setReviewing(true);
    try {
      var res = await axios.post(`${API_BASE}/challenges/ai-review`, {
        question:      question,
        options:       options,
        correctAnswer: correctAnswer,
        topic:         topic,
        difficulty:    difficulty,
      });
      setImproved(res.data.improved);
      setStep('review');
    } catch (e) {
      var msg = (e.response && e.response.data && e.response.data.error)
        ? e.response.data.error
        : 'AI review failed. Try again.';
      showToast('Error: ' + msg, 'error');
    }
    setReviewing(false);
  }

  // ── Accept AI Suggestion ─────────────────────────────────────────────────────
  function handleAcceptImproved() {
    setQuestion(improved.question);
    setOptions(improved.options);
    setCorrectAnswer(improved.correctAnswer);
    setStep('form');
    showToast('AI improvements applied!', 'success');
  }

  // ── Publish ──────────────────────────────────────────────────────────────────
  async function handlePublish() {
    if (credits < PUBLISH_COST) {
      showToast('Not enough credits. You need ' + PUBLISH_COST + ' credits.', 'error');
      return;
    }
    setPublishing(true);

    var q  = improved ? improved.question      : question;
    var o  = improved ? improved.options        : options;
    var ca = improved ? improved.correctAnswer  : correctAnswer;
    var ex = improved ? (improved.explanation || '') : '';

    try {
      var res = await axios.post(`${API_BASE}/challenges/publish`, {
        creatorName:   user.displayName,
        question:      q,
        options:       o,
        correctAnswer: ca,
        explanation:   ex,
        topic:         topic,
        difficulty:    difficulty,
      });

      setPublishedId(res.data.challengeId);

      if (setUserData) {
        setUserData(function(prev) {
          return Object.assign({}, prev, { credits: res.data.newCredits });
        });
      }

      setStep('success');
      showToast('Challenge published!', 'success');
    } catch (e) {
      var errMsg = (e.response && e.response.data && e.response.data.error)
        ? e.response.data.error
        : 'Publish failed.';
      showToast('Error: ' + errMsg, 'error');
    }
    setPublishing(false);
  }

  // ── Reset ────────────────────────────────────────────────────────────────────
  function handleReset() {
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setTopic('Array');
    setDifficulty('medium');
    setImproved(null);
    setPublishedId(null);
    setStep('form');
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 24px 60px',
          maxWidth: '720px',
          margin: '0 auto',
        }}
      >
        {/* ── Top Nav ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 0 28px',
            borderBottom: '1px solid #1e2a3a',
            marginBottom: '36px',
          }}
        >
          <button
            onClick={function() { navigate('/world'); }}
            style={S.backBtn}
          >
            Back to World
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#1a1a2e',
              border: '1px solid #f5c54244',
              borderRadius: '10px',
              padding: '6px 14px',
            }}
          >
            <span style={{ color: '#f5c542', fontWeight: 700 }}>{credits}</span>
            <span style={{ color: '#888', fontSize: '12px' }}>Credits</span>
          </div>
        </div>

        {/* ── Page Title ── <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '36px' }}
        >
          <h1 style={{ color: '#a855f7', fontSize: '32px', fontWeight: 700, margin: 0 }}>
            The Lab
          </h1>
          <p style={{ color: '#888', fontSize: '15px', marginTop: '8px' }}>
            Build a challenge. AI refines it. Earn credits every time someone attempts it.
          </p>
          <div
            style={{
              display: 'inline-flex',
              gap: '20px',
              marginTop: '16px',
              background: '#1a1a2e',
              borderRadius: '12px',
              padding: '10px 24px',
              border: '1px solid #a855f722',
            }}
          >
            <span style={{ color: '#888', fontSize: '13px' }}>
              Costs{' '}
              <strong style={{ color: '#f5c542' }}>{PUBLISH_COST} Credits</strong>
              {' '}to publish
            </span>
            <span style={{ color: '#888', fontSize: '13px' }}>
              Earn credits every attempt
            </span>
          </div>
        </motion.div>

        {/* ── Steps ── */}
        <AnimatePresence mode="wait">

          {/* ═══════════════════════ FORM ═══════════════════════ */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={S.card}
            >
              <h2 style={S.sectionTitle}>Write Your Challenge</h2>

              {/* Topic + Difficulty Row */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Topic */}
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <label style={S.label}>Topic</label>
                  <select
                    value={topic}
                    onChange={function(e) { setTopic(e.target.value); }}
                    style={S.select}
                  >
                    {TOPICS.map(function(t) {
                      return <option key={t} value={t}>{t}</option>;
                    })}
                  </select>
                </div>

                {/* Difficulty */}
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <label style={S.label}>Difficulty</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {DIFFICULTIES.map(function(d) {
                      var isActive = difficulty === d;
                      var col = DIFFICULTY_COLORS[d];
                      return (
                        <button
                          key={d}
                          onClick={function() { setDifficulty(d); }}
                          style={{
                            flex: 1,
                            padding: '8px 0',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s',
                            border: isActive ? ('1px solid ' + col) : '1px solid #1e2a3a',
                            color: isActive ? col : '#555',
                            background: isActive ? (col + '15') : 'transparent',
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Question */}
              <label style={S.label}>Question</label>
              <textarea
                value={question}
                onChange={function(e) { setQuestion(e.target.value); }}
                placeholder="e.g. What is the time complexity of binary search?"
                rows={3}
                style={Object.assign({}, S.textarea, { marginBottom: '20px' })}
              />

              {/* Options */}
              <label style={S.label}>Answer Options (4 choices)</label>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  margin: '8px 0 20px',
                }}
              >
                {options.map(function(opt, i) {
                  var letter    = ['A', 'B', 'C', 'D'][i];
                  var isCorrect = correctAnswer === opt && opt.trim() !== '';
                  return (
                    <div
                      key={i}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <span
                        style={{
                          color: '#555',
                          fontSize: '13px',
                          width: '22px',
                          textAlign: 'center',
                        }}
                      >
                        {letter}
                      </span>
                      <input
                        value={opt}
                        onChange={function(e) { handleOptionChange(i, e.target.value); }}
                        placeholder={'Option ' + letter}
                        style={Object.assign({}, S.input, {
                          border: isCorrect ? '1px solid #00ff88' : '1px solid #1e2a3a',
                        })}
                      />
                      {opt.trim() !== '' && (
                        <button
                          onClick={function() { setCorrectAnswer(opt); }}
                          style={Object.assign({}, S.markCorrectBtn, {
                            background: isCorrect ? '#00ff8822' : 'transparent',
                            color:      isCorrect ? '#00ff88'   : '#555',
                            border:     '1px solid ' + (isCorrect ? '#00ff88' : '#1e2a3a'),
                          })}
                        >
                          {isCorrect ? 'Correct' : 'Set Correct'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Correct Answer Badge */}
              {correctAnswer !== '' && (
                <div
                  style={{
                    background: '#00ff8811',
                    border: '1px solid #00ff8844',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '24px',
                    fontSize: '13px',
                  }}
                >
                  Correct Answer: <strong>{correctAnswer}</strong>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAIReview}
                  disabled={reviewing}
                  style={S.aiBtn}
                >
                  {reviewing ? 'Reviewing...' : 'AI Review and Improve'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePublish}
                  disabled={publishing || credits < PUBLISH_COST}
                  style={Object.assign({}, S.publishBtn, {
                    opacity: credits < PUBLISH_COST ? 0.5 : 1,
                    cursor:  credits < PUBLISH_COST ? 'not-allowed' : 'pointer',
                  })}
                >
                  {publishing ? 'Publishing...' : 'Publish (' + PUBLISH_COST + ' Credits)'}
                </motion.button>
              </div>

              {credits < PUBLISH_COST && (
                <p style={{ color: '#ff4d4d', fontSize: '12px', marginTop: '10px' }}>
                  You need {PUBLISH_COST} credits to publish.
                  Complete daily challenges to earn more!
                </p>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════ AI REVIEW ═══════════════════════ */}
          {step === 'review' && improved && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={S.card}
            >
              <h2 style={S.sectionTitle}>AI-Improved Version</h2>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px' }}>
                The AI has reviewed and improved your challenge.
                Accept the changes or go back and edit manually.
              </p>

              {/* Improved Question */}
              <div style={{ marginBottom: '18px' }}>
                <label style={S.reviewLabel}>Question</label>
                <p style={S.reviewText}>{improved.question}</p>
              </div>

              {/* Improved Options */}
              <div style={{ marginBottom: '18px' }}>
                <label style={S.reviewLabel}>Options</label>
                {improved.options.map(function(opt, i) {
                  var isCorrect = opt === improved.correctAnswer;
                  return (
                    <div
                      key={i}
                      style={{
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '14px',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        border: isCorrect ? '1px solid #00ff8866' : '1px solid #1e2a3a',
                        background: isCorrect ? '#00ff8811' : '#0d1117',
                        color: isCorrect ? '#00ff88' : '#bbb',
                      }}
                    >
                      <span style={{ color: '#555', marginRight: '10px' }}>
                        {['A', 'B', 'C', 'D'][i]}
                      </span>
                      {opt}
                      {isCorrect && (
                        <span style={{ marginLeft: '8px' }}>( correct )</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {improved.explanation && (
                <div
                  style={{
                    background: '#1a1a2e',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '20px',
                  }}
                >
                  <label style={S.reviewLabel}>Explanation</label>
                  <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>
                    {improved.explanation}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAcceptImproved}
                  style={S.acceptBtn}
                >
                  Accept and Edit Further
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePublish}
                  disabled={publishing || credits < PUBLISH_COST}
                  style={Object.assign({}, S.publishBtn, {
                    opacity: credits < PUBLISH_COST ? 0.5 : 1,
                    cursor:  credits < PUBLISH_COST ? 'not-allowed' : 'pointer',
                  })}
                >
                  {publishing
                    ? 'Publishing...'
                    : 'Publish Improved (' + PUBLISH_COST + ' Credits)'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setStep('form'); }}
                  style={S.backBtnSmall}
                >
                  Back to Edit
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════ SUCCESS ═══════════════════════ */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              style={Object.assign({}, S.card, {
                textAlign: 'center',
                padding: '48px 32px',
              })}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ fontSize: '56px', marginBottom: '12px' }}
              >
                ★
              </motion.div>

              <h2
                style={{
                  color: '#00ff88',
                  fontSize: '26px',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                Challenge Published!
              </h2>

              <p style={{ color: '#888', fontSize: '14px', marginBottom: '6px' }}>
                Your challenge is now live for the world to attempt.
              </p>

              <p
                style={{
                  color: '#555',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  marginBottom: '28px',
                }}
              >
                ID: {publishedId}
              </p>

              <p style={{ color: '#f5c542', fontSize: '14px', marginBottom: '28px' }}>
                You earn credits every time someone attempts your challenge!
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleReset}
                  style={S.aiBtn}
                >
                  Create Another
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { navigate('/world'); }}
                  style={S.backBtnSmall}
                >
                  Back to World
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            style={{
              position: 'fixed',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              borderRadius: '10px',
              padding: '12px 24px',
              color: '#fff',
              fontSize: '14px',
              zIndex: 9999,
              whiteSpace: 'nowrap',
              border: '1px solid ' + (
                toast.type === 'success' ? '#00ff88' :
                toast.type === 'warn'    ? '#f5a623' :
                '#ff4d4d'
              ),
              background:
                toast.type === 'success' ? '#1a3a2a' :
                toast.type === 'warn'    ? '#3a2a00' :
                '#3a1a1a',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
var S = {
  card: {
    background: '#0d1117',
    border: '1px solid #a855f733',
    borderRadius: '18px',
    padding: '32px',
    boxShadow: '0 0 40px #a855f711',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '24px',
    marginTop: 0,
  },
  label: {
    color: '#888',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '6px',
  },
  select: {
    width: '100%',
    background: '#111827',
    border: '1px solid #1e2a3a',
    borderRadius: '8px',
    color: '#e8e8e8',
    fontSize: '14px',
    padding: '10px 12px',
    outline: 'none',
    marginTop: '6px',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    background: '#111827',
    border: '1px solid #1e2a3a',
    borderRadius: '8px',
    color: '#e8e8e8',
    fontSize: '14px',
    padding: '12px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    display: 'block',
  },
  input: {
    flex: 1,
    background: '#111827',
    borderRadius: '8px',
    color: '#e8e8e8',
    fontSize: '14px',
    padding: '10px 12px',
    outline: 'none',
    fontFamily: 'Arial, sans-serif',
  },
  markCorrectBtn: {
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  aiBtn: {
    background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
  publishBtn: {
    background: 'linear-gradient(135deg,#1a73e8,#0d47a1)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    fontWeight: 600,
    fontSize: '14px',
  },
  acceptBtn: {
    background: 'linear-gradient(135deg,#00c896,#007a5e)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid #1e2a3a',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '8px 16px',
  },
  backBtnSmall: {
    background: 'transparent',
    border: '1px solid #1e2a3a',
    borderRadius: '10px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '12px 20px',
    fontWeight: 600,
  },
  reviewLabel: {
    color: '#555',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '8px',
  },
  reviewText: {
    color: '#e8e8e8',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: 0,
    background: '#111827',
    borderRadius: '8px',
    padding: '12px 14px',
  },
};
