import React from 'react';
import { useNavigate } from 'react-router-dom';

const topics = [
  { name: 'Array',               icon: '📦', color: 'border-blue-500',   hover: 'hover:shadow-blue-500/40'   },
  { name: 'Linked List',         icon: '🔗', color: 'border-red-500',    hover: 'hover:shadow-red-500/40'    },
  { name: 'Stack',               icon: '📚', color: 'border-purple-500', hover: 'hover:shadow-purple-500/40' },
  { name: 'Queue',               icon: '🚶', color: 'border-teal-500',   hover: 'hover:shadow-teal-500/40'   },
  { name: 'Tree',                icon: '🌳', color: 'border-green-500',  hover: 'hover:shadow-green-500/40'  },
  { name: 'Graph',               icon: '🕸️', color: 'border-orange-500', hover: 'hover:shadow-orange-500/40' },
  { name: 'Dynamic Programming', icon: '🧠', color: 'border-rose-500',   hover: 'hover:shadow-rose-500/40'   },
];

function Home({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans">

      {/* Navbar */}
      <nav className="w-full bg-[#1a1a2e] px-4 py-3 flex items-center justify-between
                      sticky top-0 z-50 shadow-lg shadow-black/40">
        <h1 className="text-base sm:text-lg font-bold tracking-wide truncate mr-2">
          🧬 DSA Life Simulator
        </h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <img
            src={user.photoURL}
            alt="avatar"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-blue-500 flex-shrink-0"
          />
          <span className="hidden sm:block text-sm text-gray-400 truncate max-w-[120px]">
            {user.displayName}
          </span>
          <button
            onClick={onLogout}
            className="bg-[#333] hover:bg-[#444] text-white text-xs sm:text-sm
                       px-3 py-1.5 rounded-lg font-semibold transition-colors duration-200
                       whitespace-nowrap"
          >
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex flex-col items-center px-4 pt-10 pb-6 text-center">
        <h2 className="text-2xl sm:text-4xl font-bold mb-3">
          👋 Welcome back, {user.displayName?.split(' ')[0]}!
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-md">
          Pick a DSA topic below to start your assessment 🚀
        </p>
      </div>

      {/* Topic Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4
                      px-4 pb-12 max-w-4xl mx-auto">
        {topics.map((t) => (
          <div
            key={t.name}
            onClick={() => navigate('/assessment/' + encodeURIComponent(t.name))}
            className={`
              bg-[#1a1a2e] border-2 ${t.color} rounded-2xl
              p-4 sm:p-6 text-center cursor-pointer
              transition-all duration-200
              hover:-translate-y-1 hover:shadow-xl ${t.hover}
              flex flex-col items-center justify-center
              min-h-[100px]
            `}
          >
            <div className="text-3xl sm:text-4xl mb-2">{t.icon}</div>
            {/* ✅ break-words prevents long names from overflowing */}
            <div className="font-bold text-xs sm:text-sm leading-tight
                            break-words w-full text-center">
              {t.name}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default Home;






