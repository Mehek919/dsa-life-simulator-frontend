// src/components/MobileNav.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion }                   from 'framer-motion';

const NAV_ITEMS = [
  { path: '/world',       icon: '🗺️',  label: 'World'    },
  { path: '/home',        icon: '📅',  label: 'Daily'    },
  { path: '/arena',       icon: '⚔️',  label: 'Arena'    },
  { path: '/leaderboard', icon: '🏆',  label: 'Ranks'    },
  { path: '/profile',     icon: '👤',  label: 'Profile'  },
];

export default function MobileNav() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[500]
                    flex sm:hidden                     
                    bg-[#0a0a1a]/95 backdrop-blur-2xl
                    border-t border-white/10
                    safe-bottom pb-safe">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.path);
        return (
          <motion.button
            key={item.path}
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(item.path)}
            className={`flex-1 flex flex-col items-center justify-center
                        py-2 gap-0.5 transition-colors
                        ${active ? 'text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] font-semibold tracking-wide">
              {item.label}
            </span>
            {active && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute top-0 w-8 h-0.5 bg-cyan-400 rounded-full"
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}
