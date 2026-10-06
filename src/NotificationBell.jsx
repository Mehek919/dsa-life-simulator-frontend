// src/NotificationBell.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM                        from 'react-dom';
import { AnimatePresence, motion }     from 'framer-motion';
import { subscribeToNotifications }    from './utils/notificationHelpers';
import NotificationPanel               from './NotificationPanel';

// variant="terminal" matches the World page buttons (styles live in World.css).
// Without it the bell looks exactly as it did before.
export default function NotificationBell({ user, variant }) {
  const [notifications, setNotifications] = useState([]);
  const [open,          setOpen]          = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsub();
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const countLabel  = unreadCount > 9 ? '9+' : unreadCount;

  // ✅ Portal — renders OUTSIDE World DOM tree, always on top
  const panel = ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <NotificationPanel
          uid={user?.uid}
          notifications={notifications}
          onClose={() => setOpen(false)}
        />
      )}
    </AnimatePresence>,
    document.body
  );

  if (variant === 'terminal') {
    return (
      <>
        <button
          type="button"
          className="wt-ibtn"
          onClick={() => setOpen((p) => !p)}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Notifications"
        >
          <svg className={unreadCount > 0 ? 'wt-ring' : undefined} width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unreadCount > 0 && <span className="wt-count">{countLabel}</span>}
        </button>
        {panel}
      </>
    );
  }

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
        <motion.span
          animate={unreadCount > 0
            ? { rotate: [0, -15, 15, -10, 10, 0] }
            : { rotate: 0 }
          }
          transition={{
            duration: 0.6,
            repeat: unreadCount > 0 ? Infinity : 0,
            repeatDelay: 4
          }}
          className="text-xl block"
        >
          🔔
        </motion.span>

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
              {countLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {panel}
    </>
  );
}
