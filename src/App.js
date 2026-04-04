import React, { useState, useEffect } from 'react';
import { auth }         from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Login            from './Login';

function App() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe(); // cleanup
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
        background: '#0f0f1a', color: 'white', fontSize: '24px'
      }}>
        ⏳ Loading...
      </div>
    );
  }

  return (
    <div>
      {!user
        ? <Login onLogin={setUser} />
        : <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', height: '100vh',
            background: '#0f0f1a', color: 'white',
            fontFamily: 'Arial', flexDirection: 'column'
          }}>
            <img src={user.photoURL} alt="avatar"
                 style={{ borderRadius: '50%', width: '80px', marginBottom: '16px' }} />
            <h2>👋 Welcome, {user.displayName}!</h2>
            <p style={{ color: '#aaa' }}>✅ Login working! Day 1 Complete 🎉</p>
          </div>
      }
    </div>
  );
}

export default App;

