// src/components/InstallBanner.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWA } from '../hooks/usePWA';

export default function InstallBanner() {
  const { installPrompt, isInstalled, isOnline, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  const showBanner = installPrompt && !isInstalled && !dismissed;

  return (
    <>
      {/* ── Offline toast ── */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y:   0  }}
            exit={{   opacity: 0, y: -40  }}
            className="fixed top-0 inset-x-0 z-[2000] flex justify-center pt-3 px-4"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                            bg-red-500/90 backdrop-blur-sm text-white text-sm
                            font-semibold shadow-2xl border border-red-400/30">
              <span>📡</span>
              You are offline — some features may not work
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Install banner ── */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 80  }}
            animate={{ opacity: 1, y:  0  }}
            exit={{   opacity: 0, y: 80  }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="fixed bottom-4 inset-x-4 z-[2000] max-w-sm mx-auto"
          >
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl
                            bg-[#0d0d1f]/95 backdrop-blur-2xl
                            border border-cyan-500/30 shadow-2xl
                            shadow-cyan-500/10">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br
                              from-cyan-500 to-purple-600 flex items-center
                              justify-center text-2xl flex-shrink-0 shadow-lg">
                ⚡
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">
                  Install DSA Life
                </p>
                <p className="text-gray-400 text-xs mt-0.5 leading-snug">
                  Play offline, get notifications, faster loads
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={promptInstall}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400
                             text-white text-xs font-bold transition-colors"
                >
                  Install
                </motion.button>
                <button
                  onClick={() => setDismissed(true)}
                  className="px-3 py-1 rounded-lg text-gray-500 hover:text-gray-300
                             text-xs transition-colors text-center"
                >
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}