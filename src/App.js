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
import ProblemSolver from './ProblemSolver';
import TeamSimulation from './TeamSimulation';
import CodeReviewBattle from './CodeReviewBattle';
import IncidentResponse from './IncidentResponse';
const Roadmap = lazy(() => import('./Roadmap').catch(() => ({ default: () => <div>Coming soon</div> })));
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
const SubmissionHistory = lazy(() => import('./Submissionhistory'));
const WeeklyContest     = lazy(() => import('./WeeklyContest'));
const AssessmentPortal  = lazy(() => import('./AssessmentPortal'));
const CompanyDashboard  = lazy(() => import('./CompanyDashboard'));
const MockInterview = lazy(() => import('./Mockinterview.jsx'));
const WebcamMonitor   = lazy(() => import('./WebcamMonitor'));
const SkillsProfile   = lazy(() => import('./SkillsProfile').catch(() => ({ default: () => <ComingSoon name="Skills Profile" /> })));
const LazySkillsProfile = SkillsProfile;
// ─── Safe Analytics Logger ────────────────────────────────────────────────────
const safeLog = (eventName, params) => {
  if (analytics) logEvent(analytics, eventName, params);
};

// ─── Coming Soon Placeholder ─────────────────────────────────────────────────────
const ComingSoon = ({ name = 'Feature' }) => (
  <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'Arial, sans-serif', color: '#e8e8e8' }}>
    <div style={{ fontSize: 48 }}>🚧</div>
    <h2 style={{ margin: 0, color: '#a855f7' }}>{name}</h2>
    <p style={{ color: '#555', margin: 0 }}>Coming soon — check back soon!</p>
  </div>
);

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

// ─── Skip Onboarding Button ───────────────────────────────────────────────────
// Sits on top of the onboarding screen. Skipping first shows what the player would miss,
// with "Take the quiz" as the main choice. Players coming back to retake just leave.
const ONBOARDING_REWARD = { xp: 200, credits: 50 }; // keep in sync with the backend route
const skipBtn = {
  minHeight: 44, padding: '0 18px', borderRadius: 999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
};
const SkipOnboarding = ({ onSkip, busy, retaking }) => {
  const [asking, setAsking] = useState(false);
  return (
    <div style={{ position: 'fixed', top: 'calc(16px + env(safe-area-inset-top, 0px))', right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
      {!asking && (
        <button
          type="button"
          onClick={() => (retaking ? onSkip() : setAsking(true))}
          disabled={busy}
          style={{ ...skipBtn, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(13,17,23,0.75)', color: '#d7dcea', backdropFilter: 'blur(8px)', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Skipping…' : retaking ? 'Back to the world' : 'Skip for now'}
        </button>
      )}
      {asking && (
        <div role="dialog" aria-labelledby="skip-title" style={{
          width: 'min(320px, calc(100vw - 32px))', padding: 18, borderRadius: 16, background: '#0f1522', color: '#eef1f8',
          border: '1px solid #2a3550', boxShadow: '0 18px 50px rgba(0,0,0,0.55)', fontFamily: 'inherit',
        }}>
          <div id="skip-title" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Skip and lose your bonus?</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: '#b7c0d4', marginBottom: 14 }}>
            Finishing the 5 questions gives you <b style={{ color: '#fff' }}>+{ONBOARDING_REWARD.xp} XP</b>,{' '}
            <b style={{ color: '#fff' }}>{ONBOARDING_REWARD.credits} credits</b> and your own Life Role.
            You can still earn them later from your profile.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setAsking(false)} autoFocus
              style={{ ...skipBtn, flex: 1, border: 0, background: 'linear-gradient(135deg, #a855f7, #2f7bf5)', color: '#fff', fontWeight: 700 }}>
              Take the quiz
            </button>
            <button type="button" onClick={() => { setAsking(false); onSkip(); }} disabled={busy}
              style={{ ...skipBtn, border: '1px solid #2a3550', background: 'transparent', color: '#9aa4b8' }}>
              Skip anyway
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── App Shell ────────────────────────────────────────────────────────────────
const AppShell = () => {
  const navigate = useNavigate();

  const [user,      setUser]      = useState(undefined);
  const [userData,  setUserData]  = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [skipping,  setSkipping]  = useState(false);

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
    safeLog('login', { method: firebaseUser.providerData?.[0]?.providerId || 'unknown' });

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
      onboardingSkipped: false,
    }));
    safeLog('onboarding_complete', { userId: user?.uid });
    navigate('/world', { replace: true });
    // Pull the saved profile again so the completion bonus (XP, credits, level) shows right away.
    if (user) createOrFetchUser(user).then((fresh) => { if (fresh) setUserData(fresh); });
  }, [navigate, user, createOrFetchUser]);

  // ── Onboarding skip handler ──
  // Saves the skip on the server so the player isn't sent back here on the next visit.
  // If the save fails, they still get in now; they'll just see onboarding next time.
  const handleOnboardingSkip = useCallback(async () => {
    if (!user) return;
    if (userData?.onboardingCompleted) { navigate('/world', { replace: true }); return; } // retaking: just leave
    setSkipping(true);
    let saved = null;
    try {
      const res = await axios.post(`${API_BASE}/onboarding/skip`, { uid: user.uid });
      saved = res.data?.user || null;
    } catch (err) {
      console.error('❌ Skip onboarding failed:', err);
    }
    setUserData(prev => ({
      ...prev,
      ...(saved || {}),
      onboardingCompleted: true,
      onboardingSkipped: true,
    }));
    safeLog('onboarding_skipped', { userId: user.uid });
    setSkipping(false);
    navigate('/world', { replace: true });
  }, [user, userData?.onboardingCompleted, navigate]);

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
          <Route
           path="/mock-interview"
           element={
            <Guard user={user}>
             <MockInterview user={user} userData={userData} setUserData={setUserData} />
            </Guard>
           }
         />

          {/* ── Onboarding ── */}
          {/* Players who skipped can come back here later (for example from their profile) to take the quiz. */}
          <Route
            path="/onboarding"
            element={
              !user
                ? <Navigate to="/" replace />
                : userData?.onboardingCompleted && !userData?.onboardingSkipped
                  ? <Navigate to="/world" replace />
                  : (
                    <>
                      <Onboarding
                        user={user}
                        userData={userData}
                        onComplete={handleOnboardingComplete}
                      />
                      <SkipOnboarding
                        onSkip={handleOnboardingSkip}
                        busy={skipping}
                        retaking={!!userData?.onboardingSkipped}
                      />
                    </>
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
          <Route
           path="/webcam-test"
           element={
            <Guard user={user}>
             <Suspense fallback={<PageLoader />}>
              <WebcamMonitor assessmentId="test-assessment" userId={user?.uid} enabled={true} />
             </Suspense>
            </Guard>
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
          <Route path="/roadmap" element={<Guard user={user}><Roadmap user={user} userData={userData} /></Guard>} />

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
          <Route path="/team-sim" element={<TeamSimulation user={user} userData={userData} setUserData={setUserData} />} />
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
          <Route path="/roadmap-solve/:problemId"
           element={
            <ProblemSolver
             user={user}
             userData={userData}
             setUserData={setUserData}
             mode="roadmap"
            />
           }
         />
         <Route path="/code-review" element={<CodeReviewBattle user={user} userData={userData} setUserData={setUserData} />} />
         <Route path="/incident"    element={<IncidentResponse user={user} userData={userData} setUserData={setUserData} />} />
          {/* ── Protected: Skills Profile ── */}
          <Route path="/skills" element={<Guard user={user}><LazySkillsProfile user={user} userData={userData} /></Guard>} />

          {/* ── Catch-all ── */}
          <Route
            path="*"
            element={<Navigate to={user ? '/world' : '/'} replace />}
          />
          <Route path="/submissions" element={<Guard user={user}><SubmissionHistory user={user} userData={userData} /></Guard>} />
          <Route path="/contest"     element={<Guard user={user}><WeeklyContest user={user} userData={userData} setUserData={setUserData} /></Guard>} />
          <Route path="/contest/:contestId" element={<Guard user={user}><WeeklyContest user={user} userData={userData} setUserData={setUserData} /></Guard>} />
          {/* Assessment Portal — both cases for URL safety */}
          <Route path="/Assessment/:assessmentId" element={<Guard user={user}><AssessmentPortal user={user} userData={userData} setUserData={setUserData} /></Guard>} />
          <Route path="/assessment-portal/:assessmentId" element={<Guard user={user}><AssessmentPortal user={user} userData={userData} setUserData={setUserData} /></Guard>} />
          <Route path="/company" element={<Guard user={user}><CompanyDashboard user={user} /></Guard>} />
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
