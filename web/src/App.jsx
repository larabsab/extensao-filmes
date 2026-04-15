import { useState } from 'react';
import './index.css';

export default function App() {
  const [view, setView] = useState('login'); // 'login', 'signup', ou 'guest'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (view === 'login') {
      console.log("Fazendo login com:", email, password);
    } else {
      console.log("Criando conta com:", email, password);
    }
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    console.log("Entrando como convidada:", nickname);
  };

  // Os ícones em SVG para os botões ficarem idênticos aos reais
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const AppleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74.74 0 1.95-.81 3.5-.66 2.15.18 3.54 1.14 4.3 2.68-3.69 2.1-2.92 6.64.48 8.01-.79 1.99-1.92 3.76-3.36 5.2zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.36 2.4-1.97 4.37-3.74 4.25z"/>
    </svg>
  );

  return (
    <div className="auth-card" style={{ maxWidth: '420px' }}>
      
      {view === 'guest' && <img src="/logo.png" alt="Logo" className="auth-logo" style={{ marginBottom: '10px' }} />}


      {/* ================= TELAS DE LOGIN & CADASTRO ================= */}
      {(view === 'login' || view === 'signup') && (
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h1 className="auth-title">{view === 'login' ? 'Sign in' : 'Create an account'}</h1>
            <p className="auth-subtitle" style={{ marginBottom: 0 }}>
              {view === 'login' ? 'Welcome back! Please enter your details.' : 'Enter your email below to create your account'}
            </p>
          </div>

          {/* Botões de OAuth (Visuais por enquanto) */}
          <button type="button" className="btn-social">
            <GoogleIcon /> {view === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
          </button>
          <button type="button" className="btn-social">
            <AppleIcon /> {view === 'login' ? 'Sign in with Apple' : 'Sign up with Apple'}
          </button>

          <div className="divider-container">
            <div className="divider-line"></div>
            <span className="divider-text">or</span>
            <div className="divider-line"></div>
          </div>

          <form onSubmit={handleAuthSubmit} style={{ width: '100%' }}>
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
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            <button type="submit" className="btn-primary">
              {view === 'login' ? 'Sign in with Email' : 'Sign up with Email'}
            </button>
          </form>

          {/* Links de navegação do rodapé */}
          <div className="auth-switch" style={{ marginTop: '20px' }}>
            {view === 'login' ? (
              <>
                Don't have an account? <button onClick={() => setView('signup')} className="auth-link">Sign up</button>
                <br/><br/>
                <button onClick={() => setView('guest')} className="auth-link" style={{ color: 'var(--text-muted)' }}>Continue as Guest</button>
              </>
            ) : (
              <>
                Already have an account? <button onClick={() => setView('login')} className="auth-link">Sign in</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= TELA DE GUEST ================= */}
      {view === 'guest' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 className="auth-title">Welcome!</h1>
          <p className="auth-subtitle">Enter a nickname to join the party.</p>

          <div className="guest-avatar">
            {nickname ? nickname.charAt(0).toUpperCase() : '?'}
          </div>

          <form onSubmit={handleGuestSubmit} style={{ width: '100%' }}>
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

            <button type="submit" className="btn-primary">Join Party</button>
          </form>

          <div className="auth-switch">
            Already have an account? 
            <button onClick={() => setView('login')} className="auth-link">
              Log in instead
            </button>
          </div>
        </div>
      )}

    </div>
  );
}