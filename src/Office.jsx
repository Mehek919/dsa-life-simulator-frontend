import React from 'react';
const Office = ({ user, userData }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-300 mb-6">Office</h1>
        <p className="text-slate-300">Welcome to your office, {userData?.name || 'Developer'}!</p>
        
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Your Stats</h2>
            <div className="space-y-2">
              <p>Level: {userData?.level || 1}</p>
              <p>XP: {userData?.xp || 0}</p>
              <p>Credits: {userData?.credits || 0}</p>
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="block w-full text-left p-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition">
                View Progress
              </button>
              <button className="block w-full text-left p-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition">
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Office;
