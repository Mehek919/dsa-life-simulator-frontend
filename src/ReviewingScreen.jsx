import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * ReviewingScreen.jsx
 *
 * The deliberate beat between finishing an interview and seeing results.
 * Real interviews don't grade you the second you stop talking, this holds
 * for a few seconds with a "your interview is being reviewed" framing
 * before handing off to the result screen.
 *
 * Usage in Mockinterview.jsx:
 *   1. Add 'reviewing' as a phase value
 *   2. In completeInterview(), after setting `result`, do setPhase('reviewing')
 *      instead of setPhase('result') directly
 *   3. Render:
 *      {phase === 'reviewing' && (
 *        <ReviewingScreen
 *          company={company}
 *          onDone={() => setPhase('result')}
 *        />
 *      )}
 */

const STEPS = [
  'Wrapping up the conversation',
  'Reviewing your responses',
  'Cross-checking against the transcript',
  'Finalizing feedback',
];

export default function ReviewingScreen({ company, onDone, durationMs = 5200 }) {
  const [reliefDone, setReliefDone] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const reliefTimer = setTimeout(() => setReliefDone(true), 1800);
    return () => clearTimeout(reliefTimer);
  }, []);

  useEffect(() => {
    if (!reliefDone) return;
    const perStep = durationMs / STEPS.length;
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setStepIdx(i), i * perStep)
    );
    const doneTimer = setTimeout(() => onDone?.(), durationMs);
    return () => { timers.forEach(clearTimeout); clearTimeout(doneTimer); };
  }, [reliefDone, durationMs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!reliefDone) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Arial, sans-serif', gap: 14,
      }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}
          style={{ fontSize: 40 }}>
          🙌
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
          You made it through.
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ color: '#555', fontSize: 12 }}>
          Take a breath, that's the hard part done.
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif', gap: 24,
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ width: 44, height: 44, border: '3px solid #1e2a3a', borderTop: '3px solid #a855f7', borderRadius: '50%' }}
      />

      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Your interview is being reviewed
        </div>
        <div style={{ color: '#555', fontSize: 12 }}>
          {company ? `The ${company} team is putting together your feedback.` : 'Putting together your feedback.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {STEPS.map((step, i) => (
          <div key={step} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            color: i < stepIdx ? '#00c896' : i === stepIdx ? '#e8e8e8' : '#333',
            fontSize: 12, transition: 'color 0.3s',
          }}>
            <span style={{ width: 14, textAlign: 'center' }}>
              {i < stepIdx ? '✓' : i === stepIdx ? '●' : '○'}
            </span>
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}