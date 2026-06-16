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
import axios from 'axios';
import API_BASE from './config';
import InstallBanner  from './components/InstallBanner';
import MobileNav      from './components/MobileNav';
import FeedbackButton from './FeedbackButton';

// ─── Lazy Routes ──────────────────────────────────────────────────────────────
const Login                  = lazy(() => import('./Login'));
const World                  = lazy(() => import('./World'));
const Profile                = lazy(() => import('./Profile'));
const Home                   = lazy(() => import('./Home'));
const Lab                    = lazy(() => import('./Lab'));
const Hub                    = lazy(() => import('./Hub'));
const LifeStory              = lazy(() => import('./LifeStory'));
const Leaderboard            = lazy(() => import('./Leaderboard'));
const Assessment             = lazy(() => import('./Assessment'));
const Results                = lazy(() => import('./Results'));
const Arena                  = lazy(() => import('./Arena'));
const Office                 = lazy(() => import('./Office'));
const Onboarding             = lazy(() => import('./Onboarding'));
const Visualizer             = lazy(() => import('./Visualizer'));
const GameMap                = lazy(() => import('./GameMap'));
const CinematicProblemSolver = lazy(() => import('./CinematicProblemSolver'));
const SubmissionHistory = lazy(() => import('../../backend/src/routes/Submissionhistory'));
const WeeklyContest     = lazy(() => import('./WeeklyContest'));
// ─── Safe Analytics Logger ────────────────────────────────────────────────────
const safeLog = (eventName, params) => {
  if (analytics) logEvent(analytics, eventName, params);
};

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          color: 'white', padding: 40,
          background: '#0f0f1a', minHeight: '100vh'
        }}>
          <h2>⚠️ Something went wrong</h2>
          <pre style={{ color: '#ff6b6b', fontSize: 12 }}>
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Route Tracker ────────────────────────────────────────────────────────────
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    safeLog('page_view', {
      page_path:  location.pathname,
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

  const [user,      setUser]      = useState(undefined);
  const [userData,  setUserData]  = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // ── Fetch or create user doc ──
  const createOrFetchUser = useCallback(async (firebaseUser) => {
    try {
      const res = await axios.post(`${API_BASE}/onboarding`, {
        uid:         firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email:       firebaseUser.email,
        photoURL:    firebaseUser.photoURL,
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
    safeLog('login', { method: 'Google' });

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
      onboardingCompleted: true,
    }));
    safeLog('onboarding_complete', { userId: user?.uid });
    navigate('/world', { replace: true });
  }, [navigate, user?.uid]);

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

          {/* ── Protected: Hub (MCQ challenges) ── */}
          <Route
            path="/hub"
            element={
              <OnboardingGuard user={user} userData={userData}>
                <Hub
                  user={user}
                  userData={userData}
                  setUserData={setUserData}
                />
              </OnboardingGuard>
            }
          />

          {/* ── Protected: Game Map (Engineer's Odyssey) ── */}
          <Route
            path="/game"
            element={
              <OnboardingGuard user={user} userData={userData}>
                <GameMap
                  user={user}
                  userData={userData}
                  setUserData={setUserData}
                />
              </OnboardingGuard>
            }
          />

          {/* ── Protected: Cinematic Problem Solver ── */}
          <Route
            path="/solve/:problemId"
            element={
              <Guard user={user}>
                <CinematicProblemSolver
                  user={user}
                  userData={userData}
                  setUserData={setUserData}
                />
              </Guard>
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

          {/* ── Protected: Visualizer ── */}
          <Route
            path="/visualizer"
            element={
              <Guard user={user}>
                <Visualizer />
              </Guard>
            }
          />

          {/* ── Catch-all ── */}
          <Route
            path="*"
            element={<Navigate to={user ? '/world' : '/'} replace />}
          />
          <Route path="/submissions" element={<Guard user={user}><SubmissionHistory user={user} userData={userData} /></Guard>} />
          <Route path="/contest"     element={<Guard user={user}><WeeklyContest user={user} userData={userData} setUserData={setUserData} /></Guard>} />
          <Route path="/contest/:contestId" element={<Guard user={user}><WeeklyContest user={user} userData={userData} setUserData={setUserData} /></Guard>} />

        </Routes>
      </Suspense>

      {/* ── Global UI ── */}
      {user && <MobileNav />}
      <InstallBanner />
    </>
  );
};

// ─── App Root ─────────────────────────────────────────────────────────────────
const App = () => (
  <ErrorBoundary>
    <Router>
      <AppShell />
    </Router>
  </ErrorBoundary>
);
export default App;




