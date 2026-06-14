import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 🔁 Replace this with your actual Google Form or Typeform URL
const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScXMQrgXMBA5FikOvo7YY5n_0UE0XPXv9w3CgJ7YYkprVLrFQ/viewform?usp=dialog';

export default function FeedbackButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-cyan-500/30 whitespace-nowrap"
          >
            💬 Share your feedback!
          </motion.div>
        )}
      </AnimatePresence>

      <motion.a
        href={FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-colors"
        aria-label="Give Feedback"
      >
        💬 <span className="hidden sm:inline">Feedback</span>
      </motion.a>
    </div>
  );
}
