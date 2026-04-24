import { useEffect, useMemo, useState } from 'react';
import './index.css';
import { signInWithPopup } from "firebase/auth/web-extension";
import { auth, googleProvider } from "./services/firebase";

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const STORAGE_KEY = 'ttdd-session';
const ICON_OPTIONS = [
  { id: 'quill', symbol: '✒️' },
  { id: 'candle', symbol: '🕯️' },
  { id: 'scroll', symbol: '📜' },
  { id: 'pen', symbol: '🖋️' },
  { id: 'key', symbol: '🔑' },
  { id: 'heart', symbol: '🖤' },
  { id: 'coffee', symbol: '☕' },
  { id: 'moon', symbol: '🌙' }
];
const DEFAULT_ICON_ID = 'quill';

const emptyProfile = {
  email: '',
  displayName: '',
  icon: DEFAULT_ICON_ID
};

function getStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function getIconSymbol(iconId) {
  return ICON_OPTIONS.find((option) => option.id === iconId)?.symbol || ICON_OPTIONS[0].symbol;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = [data.error, data.details].filter(Boolean).join(': ');
    throw new Error(message || 'Nao foi possivel concluir a solicitacao.');
  }

  return data;
}

export default function App() {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [session, setSession] = useState(() => getStoredSession());
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const user = session?.user || null;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setGoogleReady(false);
      return;
    }

    let cancelled = false;

    const initializeGoogle = () => {
      if (cancelled || !window.google?.accounts?.id) {
        return false;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          resetFeedback();
          setLoading(true);

          try {
            const data = await apiFetch('/auth/google', {
              method: 'POST',
              body: JSON.stringify({ credential: response.credential })
            });

            const nextSession = { token: data.token, user: data.user };
            setSession(nextSession);
            storeSession(nextSession);
            setView('account');
            setStatusMessage('Welcome in. Your Google account is now connected.');
          } catch (error) {
            setErrorMessage(error.message);
          } finally {
            setLoading(false);
          }
        }
      });

      setGoogleReady(true);
      return true;
    };

    if (initializeGoogle()) {
      return;
    }

    const timer = window.setInterval(() => {
      if (initializeGoogle()) {
        window.clearInterval(timer);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    let active = true;

    async function loadProfile() {
      try {
        const data = await apiFetch('/auth/me', {
          headers: {
            Authorization: `Bearer ${session.token}`
          }
        });

        if (!active) {
          return;
        }

        const nextSession = { token: session.token, user: data.user };
        setSession(nextSession);
        setProfileForm({
          email: data.user.email || '',
          displayName: data.user.displayName || '',
          icon: data.user.icon || DEFAULT_ICON_ID
        });
        setView('account');
        storeSession(nextSession);
      } catch {
        if (!active) {
          return;
        }

        clearSession();
        setSession(null);
        setView('login');
        setErrorMessage('Sua sessao expirou. Entre novamente.');
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [session?.token]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      email: user.email || '',
      displayName: user.displayName || '',
      icon: user.icon || DEFAULT_ICON_ID
    });
  }, [user]);

  const authHeading = useMemo(() => {
    if (view === 'signup') {
      return {
        title: 'Create Account',
        subtitle: 'Open your file, keep your details saved, and return to the department anytime.',
        buttonLabel: 'Create with Email',
        socialLabel: 'Sign up with Google'
      };
    }

    return {
      title: 'Join Now',
      subtitle: 'Sign in and continue from the exact account details you saved before.',
      buttonLabel: 'Sign in with Email',
      socialLabel: 'Sign in with Google'
    };
  }, [view]);

  const resetFeedback = () => {
    setErrorMessage('');
    setStatusMessage('');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    resetFeedback();
    setLoading(true);

    try {
      const path = view === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        view === 'login'
          ? { email, password }
          : {
              email,
              password,
              displayName: email.split('@')[0] || 'Reader',
              icon: DEFAULT_ICON_ID
            };

      const data = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const nextSession = { token: data.token, user: data.user };
      setSession(nextSession);
      storeSession(nextSession);
      setPassword('');
      setNewPassword('');
      setView('account');
      setStatusMessage(
        view === 'login'
          ? 'Welcome back! Your account is ready.'
          : 'Your account has been created. You can now personalize everything here.'
      );
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    resetFeedback();
    setStatusMessage(`${nickname}, your guest access is ready.`);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!session?.token) {
      return;
    }

    resetFeedback();
    setLoading(true);

    try {
      const payload = {
        email: profileForm.email,
        displayName: profileForm.displayName,
        icon: profileForm.icon,
        password: newPassword
      };

      const data = await apiFetch('/auth/me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(payload)
      });

      const nextSession = { token: data.token, user: data.user };
      setSession(nextSession);
      storeSession(nextSession);
      setNewPassword('');
      setStatusMessage('Your changes have been saved.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setProfileForm(emptyProfile);
    setPassword('');
    setNewPassword('');
    setEmail('');
    setView('login');
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleProfileChange = (field, value) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleGoogleLogin = () => {
    resetFeedback();

    if (!GOOGLE_CLIENT_ID) {
      setErrorMessage('Google login ainda nao esta configurado neste app.');
      return;
    }

    if (!window.google?.accounts?.id) {
      setErrorMessage('Google login ainda nao foi carregado. Tente novamente em alguns segundos.');
      return;
    }

    window.google.accounts.id.prompt();
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          {(view === 'login' || view === 'signup') && (
            <div className="auth-panel">
              <div className="auth-heading">
                <p className="auth-kicker">Department of Watch Parties</p>
                <img src="/title.png" alt="TTDD" className="auth-logo auth-logo--title" />
                <h1 className="auth-title">{authHeading.title}</h1>
                <p className="auth-subtitle">{authHeading.subtitle}</p>
              </div>

              <button type="button" className="btn-social" onClick={handleGoogleLogin} disabled={loading || !googleReady}>
                <GoogleIcon />
                {authHeading.socialLabel}
              </button>

              <div className="divider-container">
                <div className="divider-line"></div>
                <span className="divider-text">Or</span>
                <div className="divider-line"></div>
              </div>

              <form onSubmit={handleAuthSubmit} className="auth-form">
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Password</label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {errorMessage && <p className="feedback feedback--error">{errorMessage}</p>}
                {statusMessage && <p className="feedback feedback--success">{statusMessage}</p>}

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : authHeading.buttonLabel}
                </button>
              </form>

              <div className="auth-switch">
                {view === 'login' ? (
                  <>
                    <span>Don&apos;t have an account?</span>
                    <button type="button" onClick={() => { resetFeedback(); setView('signup'); }} className="auth-link">Sign up</button>
                    <button type="button" onClick={() => { resetFeedback(); setView('guest'); }} className="auth-link guest-link">Continue as Guest</button>
                  </>
                ) : (
                  <>
                    <span>Already have an account?</span>
                    <button type="button" onClick={() => { resetFeedback(); setView('login'); }} className="auth-link">Sign in</button>
                  </>
                )}
              </div>
            </div>
          )}

          {view === 'guest' && (
            <div className="auth-panel guest-panel">
              <p className="auth-kicker">Guest Entry Slip</p>
              <img src="/title.png" alt="Title" className="auth-logo auth-logo--title" />
              <h1 className="auth-title">Welcome!</h1>
              <p className="auth-subtitle">Enter a nickname to join the party.</p>

              <div className="guest-avatar">
                {nickname ? nickname.charAt(0).toUpperCase() : '?'}
              </div>

              <form onSubmit={handleGuestSubmit} className="auth-form">
                <div className="input-group">
                  <label className="input-label">Nickname</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Ex: LaraGuest"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={15}
                    required
                  />
                </div>

                {statusMessage && <p className="feedback feedback--success">{statusMessage}</p>}

                <button type="submit" className="btn-primary">Join Party</button>
              </form>

              <div className="auth-switch">
                <span>Already have an account?</span>
                <button type="button" onClick={() => { resetFeedback(); setView('login'); }} className="auth-link">
                  Log in instead
                </button>
              </div>
            </div>
          )}

          {view === 'account' && user && (
            <div className="auth-panel account-panel">
              <div className="auth-heading">
                <p className="auth-kicker">Manage Account</p>
                <img src="/title.png" alt="TTDD" className="auth-logo auth-logo--title" />
                <h1 className="auth-title">Your File</h1>
                <p className="auth-subtitle">
                  Update your details below. Everything saved here stays attached to your account for the next login.
                </p>
              </div>

              <div className="account-badge">
                <span className="account-badge__icon">{getIconSymbol(profileForm.icon)}</span>
                <div>
                  <p className="account-badge__label">Current display name</p>
                  <strong>{profileForm.displayName || 'Unnamed Reader'}</strong>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="auth-form">
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    className="auth-input"
                    value={profileForm.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Display name</label>
                  <input
                    type="text"
                    className="auth-input"
                    value={profileForm.displayName}
                    onChange={(e) => handleProfileChange('displayName', e.target.value)}
                    placeholder="How your name should appear"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">New password</label>
                  <input
                    type="password"
                    className="auth-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep the current one"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Profile icon</label>
                  <div className="icon-picker" role="list">
                    {ICON_OPTIONS.map((iconOption) => (
                      <button
                        key={iconOption.id}
                        type="button"
                        className={`icon-option ${profileForm.icon === iconOption.id ? 'icon-option--active' : ''}`}
                        onClick={() => handleProfileChange('icon', iconOption.id)}
                        aria-pressed={profileForm.icon === iconOption.id}
                      >
                        {iconOption.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                {errorMessage && <p className="feedback feedback--error">{errorMessage}</p>}
                {statusMessage && <p className="feedback feedback--success">{statusMessage}</p>}

                <div className="account-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleLogout}>
                    Log Out
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
