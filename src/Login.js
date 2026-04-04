import React from 'react';
import { auth, provider } from './firebase';
import { signInWithPopup } from 'firebase/auth';

function Login({ onLogin }) {

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user   = result.user;
      console.log("✅ Logged in:", user.displayName);
      onLogin(user); // pass user up to App.js
    } catch (error) {
      console.error("❌ Login failed:", error.message);
      alert("Login failed! Try again.");
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0f0f1a', color: 'white',
      fontFamily: 'Arial'
    }}>
      {/* Logo / Title */}
      <h1 style={{ fontSize: '48px', marginBottom: '8px' }}>
        🎮 DSA Life Simulator
      </h1>
      <p style={{ color: '#aaa', fontSize: '18px', marginBottom: '48px' }}>
        Compete. Code. Climb the Ranks.
      </p>

      {/* Feature Highlights */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '48px' }}>
        {[
          { icon: '⚔️', text: '1v1 Battles'   },
          { icon: '🏆', text: 'Leaderboard'   },
          { icon: '📈', text: 'ELO Ranking'   },
          { icon: '🧠', text: 'DSA Problems'  }
        ].map((item, i) => (
          <div key={i} style={{
            background: '#1a1a2e', padding: '16px 24px',
            borderRadius: '12px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px' }}>{item.icon}</div>
            <div style={{ color: '#ccc', marginTop: '8px' }}>{item.text}</div>
          </div>
        ))}
      </div>

      {/* Login Button */}
      <button onClick={handleGoogleLogin}
        style={{
          padding: '16px 40px', fontSize: '18px',
          background: '#4285F4', color: 'white',
          border: 'none', borderRadius: '12px',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: '12px'
        }}>
        🔐 Login with Google
      </button>

      <p style={{ color: '#666', marginTop: '24px', fontSize: '14px' }}>
        Free to play • No credit card required
      </p>
    </div>
  );
}

export default Login;
