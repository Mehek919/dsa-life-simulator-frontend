import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * InterviewScene.jsx
 *
 * Drop-in replacement for ChatPanel. Same props, same call sites, but no
 * chat bubble UI at all, continues the arrival sequence's visual language:
 * a persistent interviewer presence, their current line shown as spoken
 * text, and a quiet transcript log instead of message bubbles.
 *
 * Usage: identical to ChatPanel, just swap the component name.
 *
 *   <InterviewScene
 *     color={activeColor}
 *     icon="💻"
 *     title="Priya Sharma"
 *     subtitle="Senior Software Engineer"
 *     placeholder="Type your answer..."
 *     chatMsgs={chatMsgs}
 *     chatLoading={chatLoading}
 *     chatEndRef={chatEndRef}
 *     chatInput={chatInput}
 *     setChatInput={setChatInput}
 *     sendChatMsg={sendChatMsg}
 *   />
 */
export default function InterviewScene({
  color,
  icon,
  title,
  subtitle,
  placeholder,
  chatMsgs,
  chatLoading,
  chatEndRef,
  chatInput,
  setChatInput,
  sendChatMsg,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMsgs, chatLoading]);

  const lastInterviewerMsg = [...chatMsgs].reverse().find(m => m.role === 'interviewer');
  const currentLine = lastInterviewerMsg?.text || null;
  const stillWaitingForFirstToken = chatLoading && !currentLine;

  const transcript = chatMsgs.slice(0, -1);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0a12' }}>

      {/* Persistent interviewer presence */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid #1e2a3a',
        background: `linear-gradient(180deg, ${color}0a, transparent)`,
        flexShrink: 0,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>{icon}</div>
        <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 800 }}>{title}</div>
        <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{subtitle}</div>
      </div>

      {/* Body: current spoken line + quiet transcript above it */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {chatMsgs.length === 0 && !chatLoading && (
          <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: 40 }}>
            {icon} The interviewer is ready. Begin when you are.
          </div>
        )}

        {/* Quiet transcript log, no bubbles, just alternating alignment and muted tone */}
        {transcript.map((m, i) => (
          <div key={i} style={{
            fontSize: 12.5,
            lineHeight: 1.6,
            color: m.role === 'candidate' ? '#8a8a8a' : '#6a6a78',
            textAlign: m.role === 'candidate' ? 'right' : 'left',
            fontStyle: m.role === 'interviewer' ? 'italic' : 'normal',
          }}>
            {m.role === 'interviewer' ? `"${m.text}"` : m.text}
          </div>
        ))}

        {/* Current spoken line, the focal point, no bubble, just presence */}
        <AnimatePresence mode="wait">
          {currentLine && (
            <motion.div key={currentLine}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                marginTop: 6,
                padding: '18px 22px',
                background: `${color}08`,
                borderLeft: `2px solid ${color}66`,
                borderRadius: '2px 12px 12px 2px',
                color: '#e8e8e8',
                fontSize: 15,
                lineHeight: 1.7,
                fontStyle: 'italic',
              }}>
              "{currentLine}"{chatLoading && currentLine && (
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>▍</motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Candidate's most recent answer, shown as quiet acknowledgment, not a bubble */}
        {!chatLoading && chatMsgs.length > 0 && chatMsgs[chatMsgs.length - 1]?.role === 'candidate' && (
          <div style={{ textAlign: 'right', color: '#999', fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>
            {chatMsgs[chatMsgs.length - 1].text}
          </div>
        )}

        {stillWaitingForFirstToken && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555', fontSize: 12, fontStyle: 'italic' }}>
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }}>
              considering your answer
            </motion.span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input, plain, not styled as a message bubble input */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #1e2a3a',
        display: 'flex',
        gap: 10,
        background: '#0a0a12',
        flexShrink: 0,
      }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendChatMsg(); }}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: '#0d1117',
            border: '1px solid #1e2a3a',
            borderRadius: 10,
            padding: '11px 16px',
            color: '#e8e8e8',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          onClick={sendChatMsg}
          disabled={chatLoading || !chatInput.trim()}
          style={{
            background: color,
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            padding: '11px 20px',
            opacity: chatLoading || !chatInput.trim() ? 0.4 : 1,
          }}
        >
          Answer
        </button>
      </div>
    </div>
  );
}