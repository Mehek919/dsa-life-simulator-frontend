// src/NotificationBell.jsx
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { subscribeToNotifications } from './utils/notificationHelpers';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open,          setOpen]          = useState(false);

  // ── real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsub();
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20
                   border border-white/10 hover:border-white/20
                   transition-all duration-200"
        aria-label="Notifications"
      >
        {/* Bell icon */}
        <motion.span
          animate={unreadCount > 0
            ? { rotate: [0, -15, 15, -10, 10, 0] }
            : { rotate: 0 }
          }
          transition={{ duration: 0.6, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 4 }}
          className="text-xl block"
        >
          🔔
        </motion.span>

        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
                         rounded-full bg-red-500 text-white text-[10px]
                         font-bold flex items-center justify-center px-1
                         border-2 border-[#060612]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <NotificationPanel
            uid={user?.uid}
            notifications={notifications}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
