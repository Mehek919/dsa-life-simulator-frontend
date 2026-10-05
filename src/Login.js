import React, { useCallback, useEffect, useRef, useState } from 'react';
import { auth, provider as googleProvider } from './firebase';
import {
  signInWithPopup, signInWithRedirect, getRedirectResult,
  GoogleAuthProvider, GithubAuthProvider, OAuthProvider,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  linkWithCredential, updateProfile,
} from 'firebase/auth';
import './Login.css';

// ── Providers ───────────────────────────────────────────────────────────────
const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

const PROVIDERS = {
  google: { label: 'Google', provider: googleProvider, credentialFromError: (e) => GoogleAuthProvider.credentialFromError(e) },
  github: { label: 'GitHub', provider: githubProvider, credentialFromError: (e) => GithubAuthProvider.credentialFromError(e) },
  microsoft: { label: 'Microsoft', provider: microsoftProvider, credentialFromError: (e) => OAuthProvider.credentialFromError(e) },
};

const EMAIL_KEY = 'emailForSignIn';
const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);
const FRIENDLY = {
  'auth/operation-not-allowed': "This sign-in method isn't switched on yet. Try another one.",
  'auth/unauthorized-domain': "Sign-in isn't allowed from this web address yet.",
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/invalid-email': "That email address doesn't look right.",
  'auth/invalid-action-code': 'This sign-in link has expired or was already used. Send yourself a new one.',
  'auth/expired-action-code': 'This sign-in link has expired. Send yourself a new one.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
};

function Login({ onLogin }) {
  const stageRef = useRef(null);
  const pendingCred = useRef(null);   // credential waiting to be linked after an account-exists error
  const linkHandled = useRef(false);  // guards against React StrictMode running the effect twice
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [confirmingLink, setConfirmingLink] = useState(false);

  // Links any waiting credential, then hands the user to App.js (same contract as before).
  const finish = useCallback(async (user) => {
    if (pendingCred.current) {
      try { await linkWithCredential(user, pendingCred.current); }
      catch (e) { console.warn('Could not link accounts:', e.code); }
      pendingCred.current = null;
    }
    onLogin(user);
  }, [onLogin]);

  const fail = useCallback((err, providerKey) => {
    if (!err || SILENT.has(err.code)) return;
    if (err.code === 'auth/account-exists-with-different-credential') {
      const p = PROVIDERS[providerKey];
      pendingCred.current = p ? p.credentialFromError(err) : null;
      const addr = err.customData && err.customData.email;
      setError((addr || 'This email') + ' is already registered with another sign-in method. Sign in that way once and we will link '
        + (p ? p.label : 'this account') + ' to it.');
      return;
    }
    console.error('Sign-in failed:', err.code, err.message);
    setError(FRIENDLY[err.code] || 'Sign-in failed. Please try again.');
  }, []);

  // 3D scene: loaded after the page appears so first paint stays fast.
  useEffect(() => {
    let cleanup = null; let cancelled = false;
    import('./RankClimbScene')
      .then((m) => { if (!cancelled && stageRef.current) cleanup = m.default(stageRef.current); })
      .catch((e) => console.warn('3D scene unavailable:', e));
    return () => { cancelled = true; if (cleanup) cleanup(); };
  }, []);

  // Finishes a redirect sign-in (only used when a popup was blocked).
  useEffect(() => {
    getRedirectResult(auth).then((res) => { if (res && res.user) finish(res.user); }).catch((e) => fail(e));
  }, [finish, fail]);

  const completeEmailLink = useCallback(async (addr) => {
    setBusy('email'); setError('');
    try {
      const res = await signInWithEmailLink(auth, addr, window.location.href);
      try { window.localStorage.removeItem(EMAIL_KEY); } catch (e) { /* storage unavailable */ }
      window.history.replaceState(null, '', window.location.pathname);
      if (!res.user.displayName) {
        try { await updateProfile(res.user, { displayName: addr.split('@')[0] }); } catch (e) { /* name is optional */ }
      }
      setConfirmingLink(false);
      await finish(res.user);
    } catch (e) { fail(e); }
    finally { setBusy(null); }
  }, [finish, fail]);

  // Finishes an email-link sign-in when the user comes back from their inbox.
  useEffect(() => {
    if (linkHandled.current || !isSignInWithEmailLink(auth, window.location.href)) return;
    linkHandled.current = true;
    let stored = null;
    try { stored = window.localStorage.getItem(EMAIL_KEY); } catch (e) { /* storage unavailable */ }
    if (stored) completeEmailLink(stored);
    else { setConfirmingLink(true); setNotice('Enter the email you used to finish signing in.'); }
  }, [completeEmailLink]);

  const signInWith = async (key) => {
    setError(''); setNotice(''); setBusy(key);
    try {
      const res = await signInWithPopup(auth, PROVIDERS[key].provider);
      await finish(res.user);
    } catch (e) {
      if (e.code === 'auth/popup-blocked') { await signInWithRedirect(auth, PROVIDERS[key].provider); return; }
      fail(e, key);
    } finally { setBusy(null); }
  };

  const onEmailSubmit = async (e) => {
    e.preventDefault();
    const addr = email.trim(); if (!addr) return;
    if (confirmingLink) { completeEmailLink(addr); return; }
    setBusy('email'); setError(''); setNotice('');
    try {
      await sendSignInLinkToEmail(auth, addr, { url: window.location.origin + window.location.pathname, handleCodeInApp: true });
      try { window.localStorage.setItem(EMAIL_KEY, addr); } catch (err) { /* storage unavailable */ }
      setNotice('Magic link sent to ' + addr + '. Open it on this device to sign in.');
    } catch (err) { fail(err); }
    finally { setBusy(null); }
  };

  const ssoLabel = (key, label) => (busy === key ? 'Opening ' + label + '…' : 'Continue with ' + label);

  return (
    <div className="lg-page">
      <div className="lg-brand">
        <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
          <rect x="2" y="18" width="8" height="10" rx="2" fill="#c98a52" />
          <rect x="11" y="11" width="8" height="17" rx="2" fill="#f2c14e" />
          <rect x="20" y="3" width="8" height="25" rx="2" fill="#35c4e6" />
        </svg>
        DSA Life Simulator
      </div>

      <section className="lg-stage" ref={stageRef}
        aria-label="Animation: a player climbs from Bronze to Legend while an interviewer heckles, then gets hired" />

      <main className="lg-copy">
        <h1>Interview prep, but it fights back.</h1>
        <p className="lg-lede">Battle real coders 1v1, climb from Bronze to Legend, and survive AI interviewers who grill you like Google and Amazon do.</p>
        <ul className="lg-perks">
          <li><b>40+</b> battle modes</li>
          <li><b>15+</b> AI interviewer types</li>
          <li>Bosses from FAANG to fintech</li>
        </ul>

        <section className="lg-signin" aria-labelledby="lg-signin-title">
          <h2 id="lg-signin-title">Pick your weapon</h2>

          <button className="lg-sso" onClick={() => signInWith('google')} disabled={!!busy}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.87 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
            </svg>
            {ssoLabel('google', 'Google')}
          </button>

          <button className="lg-sso" onClick={() => signInWith('github')} disabled={!!busy}>
            <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
              <path fill="#121826" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {ssoLabel('github', 'GitHub')}
          </button>

          <button className="lg-sso" onClick={() => signInWith('microsoft')} disabled={!!busy}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <rect x="1" y="1" width="7.5" height="7.5" fill="#F25022" />
              <rect x="9.5" y="1" width="7.5" height="7.5" fill="#7FBA00" />
              <rect x="1" y="9.5" width="7.5" height="7.5" fill="#00A4EF" />
              <rect x="9.5" y="9.5" width="7.5" height="7.5" fill="#FFB900" />
            </svg>
            {ssoLabel('microsoft', 'Microsoft')}
          </button>

          <div className="lg-or">or</div>

          <form className="lg-email" onSubmit={onEmailSubmit}>
            <label className="lg-sr" htmlFor="lg-email-input">Email address</label>
            <input id="lg-email-input" type="email" placeholder="you@college.edu" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy === 'email'} />
            <button type="submit" disabled={!!busy}>
              {busy === 'email' ? 'Sending…' : confirmingLink ? 'Finish signing in' : 'Send magic link'}
            </button>
          </form>

          {notice && <p className="lg-notice" role="status">{notice}</p>}
          {error && <p className="lg-error" role="alert">{error}</p>}

          <p className="lg-fine">
            Free to play, no credit card. Side effects may include enjoying dynamic programming.
            By continuing you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
export default Login;
