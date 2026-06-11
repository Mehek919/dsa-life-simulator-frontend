import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { createOrFetchUser } from './utils/userService';
const Arena = lazy(() => import('./Arena'));
// ✅ Lazy loaded components
const Login       = lazy(() => import('./Login'));
const World = lazy(() => import('./World')); // ✅ capital W
const Profile     = lazy(() => import('./Profile'));
const Home        = lazy(() => import('./Home'));
const Lab         = lazy(() => import('./Lab'));
const Hub         = lazy(() => import('./Hub'));
const LifeStory   = lazy(() => import('./LifeStory'));
const Leaderboard = lazy(() => import('./Leaderboard'));
const Assessment  = lazy(() => import('./Assessment'));
const Results     = lazy(() => import('./Results'));
const Office = React.lazy(() => import('./Office'));

// ── Loading Fallback ───────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '100vh',
      background:     '#0f0f1a',
      color:          '#1a73e8',
      fontSize:       '20px',
      fontFamily:     'Arial, sans-serif',
      gap:            '12px',
    }}>
      <div style={{
        width:        '28px',
        height:       '28px',
        border:       '3px solid #1e2a3a',
        borderTop:    '3px solid #1a73e8',
        borderRadius: '50%',
        animation:    'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Loading...
    </div>
  );
}

// ── Auth Guard ─────────────────────────────────────────────────────────────────
function Guard({ user, children }) {
  return user ? children : <Navigate to="/" replace />;
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,     setUser]     = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const data = await createOrFetchUser(firebaseUser);
          setUserData(data);
        } catch (err) {
          console.error('❌ createOrFetchUser error:', err.message);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleLogin(u) {
    setUser(u);
    try {
      const data = await createOrFetchUser(u);
      setUserData(data);
    } catch (err) {
      console.error('❌ handleLogin error:', err.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  }

  if (loading) return <PageLoader />;

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          <Route
            path="/"
            element={user ? <Navigate to="/world" replace /> : <Login onLogin={handleLogin} />}
          />

          <Route path="/world" element={
            <Guard user={user}>
              <World user={user} userData={userData} setUserData={setUserData} onLogout={handleLogout} />
            </Guard>
          } />

          <Route path="/profile" element={
            <Guard user={user}>
              <Profile user={user} userData={userData} />
            </Guard>
          } />

          <Route path="/home" element={
            <Guard user={user}>
              <Home user={user} onLogout={handleLogout} />
            </Guard>
          } />

          <Route path="/lab" element={
            <Guard user={user}>
              <Lab user={user} userData={userData} setUserData={setUserData} />
            </Guard>
          } />

          <Route path="/hub" element={
            <Guard user={user}>
              <Hub user={user} userData={userData} setUserData={setUserData} />
            </Guard>
          } />

          <Route path="/story" element={
            <Guard user={user}>
              <LifeStory user={user} userData={userData} />
            </Guard>
          } />

          <Route path="/leaderboard" element={
            <Guard user={user}>
              <Leaderboard user={user} userData={userData} />
            </Guard>
          } />

          <Route path="/assessment/:topic" element={
            <Guard user={user}>
              <Assessment user={user} />
            </Guard>
          } />

          <Route path="/results/*" element={
            <Guard user={user}>
              <Results user={user} userData={userData} />
            </Guard>
          } />
          <Route path="/arena" element={
           <Guard user={user}>
            <Arena user={user} userData={userData} setUserData={setUserData} />
          </Guard>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

