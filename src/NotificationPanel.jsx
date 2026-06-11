import React from 'react';
import { markAsRead, markAllAsRead } from './utils/notificationHelpers';
import { motion, AnimatePresence } from 'framer-motion';
// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_META = {
  arena_result:        { icon: '⚔️',  color: 'text-red-400',    bg: 'bg-red-900/20    border-red-800/40'    },
  challenge_attempted: { icon: '🎯',  color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800/40' },
  level_up:            { icon: '🚀',  color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/40' },
  story_ready:         { icon: '📖',  color: 'text-blue-400',   bg: 'bg-blue-900/20   border-blue-800/40'   },
  default:             { icon: '🔔',  color: 'text-gray-400',   bg: 'bg-white/5       border-white/10'      },
};

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getMeta(type) {
  return TYPE_META[type] || TYPE_META.default;
}

// ─── NotificationPanel ────────────────────────────────────────────────────────
export default function NotificationPanel({ uid, notifications, onClose }) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClickNotif = (notif) => {
    if (!notif.read) markAsRead(uid, notif.id);
  };

  const handleMarkAll = () => {
    markAllAsRead(uid, notifications);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
       key="notif-backdrop"
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       onClick={onClose}
       className="fixed inset-0 z-[999] bg-black/40"   // ← z-[999]
    />

      {/* Panel */}
      <motion.div
       key="notif-panel"
       initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{   opacity: 0, y: -12, scale: 0.96  }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className="fixed top-16 right-4 z-[1000] w-80 md:w-96   
                bg-[#0d0d1f]/96 backdrop-blur-2xl
                border border-white/10 rounded-2xl shadow-2xl
                flex flex-col overflow-hidden"
      style={{ maxHeight: '80vh' }}
    />

      
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <span className="font-bold text-white">Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-cyan-500 text-black text-xs font-bold
                               px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 py-3">
          {notifications.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🔕</p>
              <p className="text-gray-400 text-sm">No notifications yet.</p>
              <p className="text-gray-600 text-xs mt-1">
                Battle in the Arena, solve challenges,<br />or level up to see updates here.
              </p>
            </div>
          )}

          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {notifications.map((notif) => {
                const meta = getMeta(notif.type);
                return (
                  <motion.li
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0  }}
                    exit={{   opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleClickNotif(notif)}
                    className={`relative flex items-start gap-3 p-3 rounded-xl border
                                cursor-pointer transition-all
                                ${meta.bg}
                                ${!notif.read
                                  ? 'ring-1 ring-cyan-500/30'
                                  : 'opacity-60 hover:opacity-80'
                                }`}
                  >
                    {/* Unread dot */}
                    {!notif.read && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full
                                       bg-cyan-400 animate-pulse" />
                    )}

                    {/* Icon */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10
                                    flex items-center justify-center text-lg">
                      {notif.icon || meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-3">
                      <p className={`text-sm font-semibold ${meta.color}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-5 py-3 border-t border-white/10 text-center">
            <p className="text-xs text-gray-600">
              Showing last {notifications.length} notifications
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
}
