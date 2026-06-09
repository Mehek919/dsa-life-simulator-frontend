import React from 'react';
import { computeLevel } from './utils/economyService';

const CreditsWallet = ({ userData }) => {
  if (!userData) return null;

  const { credits, xp, streak, levelTitle, progressToNext, nextLevelTitle } =
    userData.xp !== undefined ? { ...userData, ...computeLevel(userData.xp) } : userData;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '10px 18px',
      backdropFilter: 'blur(10px)',
      fontFamily: 'Arial, sans-serif',
    }}>
      {/* 💰 Credits */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px' }}>CREDITS</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#facc15' }}>
          💰 {credits?.toLocaleString()}
        </div>
      </div>

      <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.15)' }} />

      {/* ⚡ XP + Level */}
      <div style={{ textAlign: 'center', minWidth: '90px' }}>
        <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px' }}>
          {levelTitle?.toUpperCase()} • {xp?.toLocaleString()} XP
        </div>
        <div style={{
          width: '90px',
          height: '6px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '99px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressToNext}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
            borderRadius: '99px',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
          → {nextLevelTitle}
        </div>
      </div>

      <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.15)' }} />

      {/* 🔥 Streak */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px' }}>STREAK</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316' }}>
          🔥 {streak || 0}
        </div>
      </div>
    </div>
  );
};

export default CreditsWallet;
