import React, {
  useState,
  useEffect,
  lazy,
  Suspense,
  useCallback
} from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, analytics } from './firebase';
import { logEvent } from 'firebase/analytics';
import * as Sentry from '@sentry/react';
import axios from 'axios';
import API_BASE from './config';
import InstallBanner from './components/InstallBanner';
import MobileNav     from './components/MobileNav';
import FeedbackButton from './FeedbackButton';
const Login       = lazy(() => import('./Login'));
const World       = lazy(() => import('./World'));
const Profile     = lazy(() => import('./Profile'));
const Home        = lazy(() => import('./Home'));
const Lab         = lazy(() => import('./Lab'));
const Hub         = lazy(() => import('./Hub'));
const LifeStory   = lazy(() => import('./LifeStory'));
const Leaderboard = lazy(() => import('./Leaderboard'));
const Assessment  = lazy(() => import('./Assessment'));
const Results     = lazy(() => import('./Results'));
const Arena       = lazy(() => import('./Arena'));
const Office      = lazy(() => import('./Office'));
const Onboarding  = lazy(() => import('./Onboarding'));
function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    logEvent(analytics, 'page_view', {
      page_path: location.pathname,
      page_title: document.title,
    });
  }, [location]);

  return null;
}
// ─── Page Loader ──────────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-gray-950 flex flex-col items-center
                  justify-center gap-4">
    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent
                    rounded-full animate-spin" />
    <p className="text-gray-500 text-sm tracking-widest uppercase">Loading...</p>
  </div>
);

// ─── Auth Guard ───────────────────────────────────────────────────────────────
const Guard = ({ user, children }) => {
  if (!user) return <Navigate to="/" replace />;
  return children;
};

// ─── Onboarding Guard ─────────────────────────────────────────────────────────
const OnboardingGuard = ({ user, userData, children }) => {
  if (!user) return <Navigate to="/" replace />;
  if (userData && !userData.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};

// ─── App Shell ────────────────────────────────────────────────────────────────
const AppShell = () => {
  const navigate = useNavigate();

  const [user,      setUser]      = useState(undefined); // undefined = loading
  const [userData,  setUserData]  = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // ── Fetch or create user doc ──
  const createOrFetchUser = useCallback(async (firebaseUser) => {
    try {
      const res = await axios.post(`${API_BASE}/onboarding`, {
        uid:         firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email:       firebaseUser.email,
        photoURL:    firebaseUser.photoURL
      });
      return res.data.user || res.data;
    } catch (err) {
      console.error('❌ createOrFetchUser error:', err);
      return null;
    }
  }, []);

  // ── Auth listener ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const data = await createOrFetchUser(firebaseUser);
        setUser(firebaseUser);
        setUserData(data);
      } else {
        setUser(null);
        setUserData(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [createOrFetchUser]);

  // ── Login handler ──
  const handleLogin = useCallback(async (firebaseUser) => {
    const data = await createOrFetchUser(firebaseUser);
    setUser(firebaseUser);
    setUserData(data);
    logEvent(analytics, 'login', { method: 'Google' });

    if (data && !data.onboardingCompleted) {
      navigate('/onboarding', { replace: true });
    } else {
      navigate('/world', { replace: true });
    }
  }, [createOrFetchUser, navigate]);

  // ── Logout handler ──
  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
    navigate('/', { replace: true });
  }, [navigate]);

  // ── Onboarding complete handler ──
  const handleOnboardingComplete = useCallback((updatedUserData) => {
    setUserData(prev => ({
      ...prev,
      ...updatedUserData,
      onboardingCompleted: true
    }));
    logEvent(analytics, 'onboarding_complete', { userId: user.uid });
    navigate('/world', { replace: true });
  }, [navigate]);

  // ── Auth loading splash ──
  if (!authReady) return <PageLoader />;

  return (
    <>
    <RouteTracker />
     <FeedbackButton />
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Public: Login ── */}
          <Route
            path="/"
            element={
              user
                ? <Navigate to={
                    userData && !userData.onboardingCompleted
                      ? '/onboarding'
                      : '/world'
                  } replace />
                : <Login onLogin={handleLogin} />
            }
          />

          {/* ── Onboarding ── */}
          <Route
            path="/onboarding"
            element={
              !user
                ? <Navigate to="/" replace />
                : userData?.onboardingCompleted
                  ? <Navigate to="/world" replace />
                  : (
                    <Onboarding
                      user={user}
                      userData={userData}
                      onComplete={handleOnboardingComplete}
                    />
                  )
            }
          />

          {/* ── Protected: World ── */}
          <Route
            path="/world"
            element={
              <OnboardingGuard user={user} userData={userData}>
                <World
                  user={user}
                  userData={userData}
                  onLogout={handleLogout}
                />
              </OnboardingGuard>
            }
          />

          {/* ── Protected: Office ── */}
          <Route
            path="/office"
            element={
              <OnboardingGuard user={user} userData={userData}>
                <Office user={user} userData={userData} />
              </OnboardingGuard>
            }
          />

          {/* ── Protected: Profile ── */}
          <Route
            path="/profile"
            element={
              <Guard user={user}>
                <Profile
                  user={user}
                  userData={userData}
                  onLogout={handleLogout}
                />
              </Guard>
            }
          />

          {/* ── Protected: Home ── */}
          <Route
            path="/home"
            element={
              <Guard user={user}>
                <Home user={user} userData={userData} />
              </Guard>
            }
          />

          {/* ── Protected: Lab ── */}
          <Route
            path="/lab"
            element={
              <OnboardingGuard user={user} userData={userData}>
                <Lab user={user} userData={userData} />
              </OnboardingGuard>
            }
          />

          {/* ── Protected: Hub ── */}
          <Route
            path="/hub"
            element={
              <OnboardingGuard user={user} userData={userData}>
                <Hub user={user} userData={userData} />
              </OnboardingGuard>
            }
          />

          {/* ── Protected: Life Story ── */}
          <Route
            path="/story"
            element={
              <OnboardingGuard user={user} userData={userData}>
                <LifeStory user={user} userData={userData} />
              </OnboardingGuard>
            }
          />

          {/* ── Protected: Leaderboard ── */}
          <Route
            path="/leaderboard"
            element={
              <Guard user={user}>
                <Leaderboard user={user} userData={userData} />
              </Guard>
            }
          />

          {/* ── Protected: Assessment ── */}
          <Route
            path="/assessment/:topic"
            element={
              <Guard user={user}>
                <Assessment user={user} userData={userData} />
              </Guard>
            }
          />

          {/* ── Protected: Results ── */}
          <Route
            path="/results/*"
            element={
              <Guard user={user}>
                <Results user={user} userData={userData} />
              </Guard>
            }
          />

          {/* ── Protected: Arena ── */}
          <Route
            path="/arena"
            element={
              <OnboardingGuard user={user} userData={userData}>
                <Arena
                  user={user}
                  userData={userData}
                  setUserData={setUserData}
                />
              </OnboardingGuard>
            }
          />

          {/* ── Catch-all ── */}
          <Route
            path="*"
            element={<Navigate to={user ? '/world' : '/'} replace />}
          />

        </Routes>
      </Suspense>

      {/* ── Global UI — always rendered inside Router context ── */}
      {user && <MobileNav />}
      <InstallBanner />
    </>
  );
};

// ─── App Root ─────────────────────────────────────────────────────────────────
const App = () => (
  <Router>
    <AppShell />
    
  </Router>
);

export default App;


