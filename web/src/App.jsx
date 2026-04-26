import { useEffect, useMemo, useState } from 'react';
import './index.css';
import {
  confirmFirebasePasswordReset,
  loginWithEmailPassword,
  loginWithGoogle,
  logoutFirebase,
  registerWithEmailPassword,
  requestPasswordReset,
  uploadCurrentUserAvatar,
  updateFirebaseUserPassword,
  verifyResetCode
} from './services/firebase';

function getApiBaseUrl() {
  const rawBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
  return rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;
}

const API_BASE_URL = getApiBaseUrl();
const STORAGE_KEY = 'ttdd-session';
const GUEST_PROFILE_KEY = 'ttdd-guest-profile';
const EXTENSION_ID = (import.meta.env.VITE_EXTENSION_ID || '').trim();
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
const VIEW_BY_PATH = {
  '/login': 'login',
  '/signup': 'signup',
  '/guest': 'guest',
  '/forgot-password': 'forgot-password',
  '/email-action': 'email-action',
  '/account': 'account'
};

const emptyProfile = {
  email: '',
  displayName: '',
  icon: DEFAULT_ICON_ID,
  avatarUrl: '',
  avatarPublicId: ''
};

function getStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getInitialView() {
  const pathnameView = VIEW_BY_PATH[window.location.pathname] || 'login';
  const params = new URLSearchParams(window.location.search);

  if (pathnameView === 'email-action' && params.get('mode') === 'resetPassword') {
    return 'email-action';
  }

  return pathnameView;
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

function isValidChromeExtensionId(extensionId) {
  return /^[a-p]{32}$/.test(extensionId);
}

function syncExtensionSession(type, session) {
  if (!window.chrome?.runtime?.sendMessage || !isValidChromeExtensionId(EXTENSION_ID)) {
    return;
  }

  window.chrome.runtime.sendMessage(EXTENSION_ID, {
    type,
    token: session?.token,
    user: session?.user || null
  });
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
  const [view, setView] = useState(() => getInitialView());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [guestIcon, setGuestIcon] = useState(DEFAULT_ICON_ID);
  const [session, setSession] = useState(() => getStoredSession());
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetActionCode, setResetActionCode] = useState('');
  const [resetActionEmail, setResetActionEmail] = useState('');
  const [resetActionPassword, setResetActionPassword] = useState('');
  const [resetActionPasswordConfirm, setResetActionPasswordConfirm] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const user = session?.user || null;

  useEffect(() => {
    if (view === 'email-action') {
      return;
    }

    const nextPath = view === 'login' ? '/login' : `/${view}`;

    if (window.location.pathname !== nextPath) {
      window.history.replaceState(null, '', nextPath);
    }
  }, [view]);

  useEffect(() => {
    const handlePopState = () => {
      setView(getInitialView());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!session?.token) {
      if (view === 'account') {
        setView('login');
      }
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
          icon: data.user.icon || DEFAULT_ICON_ID,
          avatarUrl: data.user.avatarUrl || '',
          avatarPublicId: data.user.avatarPublicId || ''
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
  }, [session?.token, view]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      email: user.email || '',
      displayName: user.displayName || '',
      icon: user.icon || DEFAULT_ICON_ID,
      avatarUrl: user.avatarUrl || '',
      avatarPublicId: user.avatarPublicId || ''
    });
    setAvatarFile(null);
    setAvatarPreviewUrl('');
  }, [user]);

  useEffect(() => {
    if (!session?.token || !session?.user) {
      return;
    }

    syncExtensionSession('LOGIN_SUCCESS', session);
  }, [session?.token, session?.user]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    if (view !== 'email-action') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const actionCode = params.get('oobCode') || '';

    if (!actionCode) {
      setErrorMessage('O link de redefinicao esta incompleto ou invalido.');
      return;
    }

    let active = true;

    async function loadResetAction() {
      resetFeedback();
      setLoading(true);

      try {
        const accountEmail = await verifyResetCode(actionCode);

        if (!active) {
          return;
        }

        setResetActionCode(actionCode);
        setResetActionEmail(accountEmail);
      } catch {
        if (!active) {
          return;
        }

        setErrorMessage('Esse link de redefinicao e invalido ou expirou.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadResetAction();

    return () => {
      active = false;
    };
  }, [view]);

  useEffect(() => {
    const handleExtensionLogout = async (event) => {
      if (event.source !== window || event.data?.type !== 'TTDDFLIX_EXTENSION_LOGOUT') {
        return;
      }

      await logoutFirebase().catch(() => {});
      clearSession();
      setSession(null);
      setProfileForm(emptyProfile);
      setAvatarFile(null);
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setAvatarPreviewUrl('');
      setPassword('');
      setCurrentPassword('');
      setNewPassword('');
      setResetActionCode('');
      setResetActionEmail('');
      setResetActionPassword('');
      setResetActionPasswordConfirm('');
      setEmail('');
      setStatusMessage('');
      setErrorMessage('');
      setView('login');
      window.history.replaceState(null, '', '/login');
    };

    window.addEventListener('message', handleExtensionLogout);
    return () => window.removeEventListener('message', handleExtensionLogout);
  }, [avatarPreviewUrl]);

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
      const data =
        view === 'login'
          ? await loginWithEmailPassword(email, password)
          : await registerWithEmailPassword({
              email,
              password,
              displayName: email.split('@')[0] || 'Reader',
              icon: DEFAULT_ICON_ID
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
    sessionStorage.setItem(
      GUEST_PROFILE_KEY,
      JSON.stringify({
        nickname: nickname.trim(),
        icon: guestIcon
      })
    );
    setStatusMessage(`${nickname}, your guest access is ready.`);
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    resetFeedback();
    setLoading(true);

    try {
      const data = await requestPasswordReset(email);
      setStatusMessage(data.message);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailActionReset = async (e) => {
    e.preventDefault();
    resetFeedback();

    if (!resetActionCode) {
      setErrorMessage('Esse link de redefinicao e invalido ou expirou.');
      return;
    }

    if (resetActionPassword !== resetActionPasswordConfirm) {
      setErrorMessage('A confirmacao da senha precisa ser igual a nova senha.');
      return;
    }

    setLoading(true);

    try {
      const data = await confirmFirebasePasswordReset(resetActionCode, resetActionPassword);
      setResetActionPassword('');
      setResetActionPasswordConfirm('');
      setStatusMessage(data.message);
    } catch (error) {
      setErrorMessage(error.message || 'Nao foi possivel redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!session?.token) {
      return;
    }

    resetFeedback();
    setLoading(true);

    try {
      if (newPassword) {
        await updateFirebaseUserPassword({
          email: profileForm.email,
          currentPassword,
          newPassword,
          hasPasswordProvider: user?.authProviders?.includes('password')
        });
      }

      let nextAvatarUrl = profileForm.avatarUrl || '';
      let nextAvatarPublicId = profileForm.avatarPublicId || '';

      if (avatarFile) {
        const upload = await uploadCurrentUserAvatar(avatarFile);
        nextAvatarUrl = upload.avatarUrl;
        nextAvatarPublicId = upload.avatarPublicId;
      }

      const payload = {
        email: profileForm.email,
        displayName: profileForm.displayName,
        icon: profileForm.icon,
        avatarUrl: nextAvatarUrl || null,
        avatarPublicId: nextAvatarPublicId || null
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
      setCurrentPassword('');
      setNewPassword('');
      setAvatarFile(null);
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setAvatarPreviewUrl('');
      setStatusMessage('Your changes have been saved.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutFirebase().catch(() => {});
    syncExtensionSession('LOGOUT_SUCCESS');
    clearSession();
    setSession(null);
    setProfileForm(emptyProfile);
    setAvatarFile(null);
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl('');
    setPassword('');
    setCurrentPassword('');
    setNewPassword('');
    setResetActionCode('');
    setResetActionEmail('');
    setResetActionPassword('');
    setResetActionPasswordConfirm('');
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

  const handleProfileIconSelect = (iconId) => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setProfileForm((current) => ({
      ...current,
      icon: iconId,
      avatarUrl: '',
      avatarPublicId: ''
    }));
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Escolha uma imagem valida para o avatar.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('A imagem precisa ter no maximo 5 MB.');
      event.target.value = '';
      return;
    }

    resetFeedback();

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreviewUrl(previewUrl);
    setProfileForm((current) => ({
      ...current,
      avatarUrl: previewUrl
    }));
    event.target.value = '';
  };

  const handleRemoveCustomAvatar = () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setProfileForm((current) => ({
      ...current,
      avatarUrl: '',
      avatarPublicId: ''
    }));
  };

  const handleGoogleLogin = async () => {
    resetFeedback();
    setLoading(true);

    try {
      const data = await loginWithGoogle();
      const nextSession = { token: data.token, user: data.user };

      setSession(nextSession);
      storeSession(nextSession);
      setPassword('');
      setNewPassword('');
      setView('account');
      setStatusMessage('Welcome in. Your Google account is now connected.');
    } catch (error) {
      setErrorMessage(error.message || 'Nao foi possivel entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const guestAvatarSymbol = getIconSymbol(guestIcon);
  const accountAvatarUrl = avatarPreviewUrl || profileForm.avatarUrl;

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

              <button type="button" className="btn-social" onClick={handleGoogleLogin} disabled={loading}>
                <GoogleIcon />
                {loading ? 'Connecting...' : authHeading.socialLabel}
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
                    <button
                      type="button"
                      onClick={() => {
                        resetFeedback();
                        setView('signup');
                      }}
                      className="auth-link"
                    >
                      Sign up
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetFeedback();
                        setView('guest');
                      }}
                      className="auth-link guest-link"
                    >
                      Continue as Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetFeedback();
                        setView('forgot-password');
                      }}
                      className="auth-link guest-link"
                    >
                      Forgot password?
                    </button>
                  </>
                ) : (
                  <>
                    <span>Already have an account?</span>
                    <button
                      type="button"
                      onClick={() => {
                        resetFeedback();
                        setView('login');
                      }}
                      className="auth-link"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {view === 'forgot-password' && (
            <div className="auth-panel">
              <div className="auth-heading">
                <p className="auth-kicker">Password Recovery</p>
                <img src="/title.png" alt="TTDD" className="auth-logo auth-logo--title" />
                <h1 className="auth-title">Reset Password</h1>
                <p className="auth-subtitle">
                  Enter your email and we will send a secure password reset link.
                </p>
              </div>

              <form onSubmit={handleForgotPasswordRequest} className="auth-form auth-form--section">
                <div className="form-section-copy">
                  <strong>Email reset</strong>
                  <span>We will send the reset instructions to the address linked to your account.</span>
                </div>

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

                <button type="submit" className="btn-secondary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                {errorMessage && <p className="feedback feedback--error">{errorMessage}</p>}
                {statusMessage && <p className="feedback feedback--success">{statusMessage}</p>}
              </form>

              <div className="auth-switch">
                <span>Remembered your password?</span>
                <button
                  type="button"
                  onClick={() => {
                    resetFeedback();
                    setView('login');
                  }}
                  className="auth-link"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}

          {view === 'email-action' && (
            <div className="auth-panel">
              <div className="auth-heading">
                <p className="auth-kicker">Password Recovery</p>
                <img src="/title.png" alt="TTDD" className="auth-logo auth-logo--title" />
                <h1 className="auth-title">Choose a New Password</h1>
                <p className="auth-subtitle">
                  Finish your password reset here and return to the app with the same account details.
                </p>
              </div>

              <div className="form-section form-section--password-reset">
                <div className="form-section-copy">
                  <strong>Reset linked to</strong>
                  <span>{resetActionEmail || 'Checking your reset link...'}</span>
                </div>

                <form onSubmit={handleEmailActionReset} className="auth-form">
                  <div className="input-group input-group--relaxed">
                    <label className="input-label">New password</label>
                    <input
                      type="password"
                      className="auth-input"
                      value={resetActionPassword}
                      onChange={(e) => setResetActionPassword(e.target.value)}
                      placeholder="Choose a secure new password"
                      required
                    />
                  </div>

                  <div className="input-group input-group--relaxed">
                    <label className="input-label">Confirm new password</label>
                    <input
                      type="password"
                      className="auth-input"
                      value={resetActionPasswordConfirm}
                      onChange={(e) => setResetActionPasswordConfirm(e.target.value)}
                      placeholder="Type the same password again"
                      required
                    />
                  </div>

                  {errorMessage && <p className="feedback feedback--error">{errorMessage}</p>}
                  {statusMessage && <p className="feedback feedback--success">{statusMessage}</p>}

                  <button type="submit" className="btn-primary" disabled={loading || !resetActionCode}>
                    {loading ? 'Updating...' : 'Save New Password'}
                  </button>
                </form>
              </div>

              <div className="auth-switch">
                <span>After resetting, you can return to the sign in page.</span>
                <button
                  type="button"
                  onClick={() => {
                    resetFeedback();
                    window.location.href = '/login';
                  }}
                  className="auth-link"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          )}

          {view === 'guest' && (
            <div className="auth-panel guest-panel">
              <p className="auth-kicker">Guest Entry Slip</p>
              <img src="/title.png" alt="Title" className="auth-logo auth-logo--title" />
              <h1 className="auth-title">Welcome!</h1>
              <p className="auth-subtitle">Enter a nickname to join the party.</p>

              <div className="guest-avatar" aria-hidden="true">
                {guestAvatarSymbol}
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

                <div className="input-group">
                  <label className="input-label">Guest icon</label>
                  <div className="icon-picker" role="list">
                    {ICON_OPTIONS.map((iconOption) => (
                      <button
                        key={iconOption.id}
                        type="button"
                        className={`icon-option ${guestIcon === iconOption.id ? 'icon-option--active' : ''}`}
                        onClick={() => setGuestIcon(iconOption.id)}
                        aria-pressed={guestIcon === iconOption.id}
                      >
                        {iconOption.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                {statusMessage && <p className="feedback feedback--success">{statusMessage}</p>}

                <button type="submit" className="btn-primary">Join Party</button>
              </form>

              <div className="auth-switch">
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    resetFeedback();
                    setView('login');
                  }}
                  className="auth-link"
                >
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
                {accountAvatarUrl ? (
                  <img src={accountAvatarUrl} alt="Current avatar" className="account-badge__avatar" />
                ) : (
                  <span className="account-badge__icon">{getIconSymbol(profileForm.icon)}</span>
                )}
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
                    readOnly
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

                <div className="form-section form-section--password">
                  <div className="form-section-copy">
                    <strong>Password update</strong>
                    <span>
                      {user?.authProviders?.includes('password')
                        ? 'Enter your current password first, then choose the new one.'
                        : 'Set your first password here if you want to sign in without Google later.'}
                    </span>
                  </div>

                  {user?.authProviders?.includes('password') && (
                    <div className="input-group input-group--relaxed">
                      <label className="input-label">Current password</label>
                      <input
                        type="password"
                        className="auth-input"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Required before changing the password"
                      />
                    </div>
                  )}

                  <div className="input-group input-group--relaxed">
                    <label className="input-label">New password</label>
                    <input
                      type="password"
                      className="auth-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep the current one"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Profile icon</label>
                  <div className="form-section-copy">
                    <strong>Preset icons</strong>
                    <span>Choose one of our department icons, or upload your own image right below.</span>
                  </div>
                  <div className="icon-picker" role="list">
                    {ICON_OPTIONS.map((iconOption) => (
                      <button
                        key={iconOption.id}
                        type="button"
                        className={`icon-option ${profileForm.icon === iconOption.id ? 'icon-option--active' : ''}`}
                        onClick={() => handleProfileIconSelect(iconOption.id)}
                        aria-pressed={profileForm.icon === iconOption.id}
                      >
                        {iconOption.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-copy">
                    <strong>Custom image</strong>
                    <span>Upload a square image for your profile. If you switch back to a preset, the uploaded avatar is removed.</span>
                  </div>

                  <div className="avatar-upload">
                    {accountAvatarUrl ? (
                      <img src={accountAvatarUrl} alt="Avatar preview" className="avatar-upload__preview" />
                    ) : (
                      <div className="avatar-upload__preview avatar-upload__preview--placeholder">
                        {getIconSymbol(profileForm.icon)}
                      </div>
                    )}

                    <div className="avatar-upload__controls">
                      <label className="btn-secondary avatar-upload__button">
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          className="avatar-upload__input"
                          onChange={handleAvatarUpload}
                        />
                      </label>

                      {accountAvatarUrl && (
                        <button
                          type="button"
                          className="btn-secondary avatar-upload__button"
                          onClick={handleRemoveCustomAvatar}
                        >
                          Use Preset Instead
                        </button>
                      )}
                    </div>
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
