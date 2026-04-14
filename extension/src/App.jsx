import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api';

function App() {
  const [view, setView] = useState('menu'); // 'menu', 'login', ou 'party'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Verifica se a usuária já logou antes
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['jwtToken'], (res) => {
        if (res.jwtToken) setIsLoggedIn(true);
      });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      // Salva o passe de acesso e volta pro menu principal
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ jwtToken: data.token, username: data.username });
      }
      setIsLoggedIn(true);
      setView('menu'); 
    } catch (err) {
      console.error(err);
      setError('Usuário ou senha incorretos');
    }
  };

  const handleStartParty = () => {
    // 1. Muda a telinha pro gerenciamento da sala
    setView('party');
    // 2. Manda um sinal pro YouTube abrir a aba do Chat Lateral
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "OPEN_CHAT" });
      });
    }
  };

  return (
    <div style={{ padding: '0' }}>
      
      {/* Cabeçalho */}
      <div style={{ padding: '15px', borderBottom: '1px solid #3f3f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#ec4899' }}>Tp</h2>
        {!isLoggedIn && view !== 'login' && (
          <button onClick={() => setView('login')} style={{ background: 'transparent', border: '1px solid #52525b', color: 'white', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer' }}>
            Log In
          </button>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        
        {/* TELA DE MENU */}
        {view === 'menu' && (
          <div>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>Para usar a extensão, abra um vídeo em um site compatível.</p>
            {isLoggedIn ? (
              <button onClick={handleStartParty} style={{ width: '100%', padding: '12px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                Start the Party
              </button>
            ) : (
              <button onClick={() => setView('login')} style={{ width: '100%', padding: '12px', backgroundColor: '#3f3f46', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Faça login para criar salas
              </button>
            )}
          </div>
        )}

        {/* TELA DE LOGIN */}
        {view === 'login' && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>Bem-vinda de volta!</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              <input type="text" placeholder="Username (ex: amiga1)" value={username} onChange={e => setUsername(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: 'none', backgroundColor: '#27272a', color: 'white' }} />
              <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: 'none', backgroundColor: '#27272a', color: 'white' }} />
              {error && <span style={{ color: '#ef4444', fontSize: '12px' }}>{error}</span>}
              <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '5px' }}>Login</button>
            </form>
            <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', color: '#aaa', textDecoration: 'underline', cursor: 'pointer', marginTop: '15px' }}>Voltar</button>
          </div>
        )}

        {/* TELA DA SALA */}
        {view === 'party' && (
          <div>
            <h3 style={{ marginTop: 0 }}>Party Management</h3>
            <p style={{ fontSize: '13px', color: '#aaa' }}>Compartilhe a URL para convidar as amigas:</p>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
              <input type="text" readOnly value="https://ttddflix.com/join/12345" style={{ flex: 1, padding: '8px', backgroundColor: '#27272a', border: 'none', color: 'white', borderRadius: '5px', fontSize: '11px' }} />
              <button style={{ padding: '8px 12px', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Copy</button>
            </div>
            <button onClick={() => setView('menu')} style={{ width: '100%', padding: '12px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', borderRadius: '5px', cursor: 'pointer' }}>
              Disconnect
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;