import { useState, useEffect } from 'react';
import './index.css';
import logoImg from './assets/logo.png';

const WEB_LOGIN_URL = 'http://localhost:5173/login'; 

const STREAMING_SERVICES = [
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com', url: 'https://www.netflix.com', color: '#E50914', short: 'N' },
  { id: 'youtube', name: 'YouTube', domain: 'youtube.com', url: 'https://www.youtube.com', color: '#FF0000', short: 'Y' },
  { id: 'prime', name: 'Prime', domain: 'primevideo.com', url: 'https://www.primevideo.com', color: '#00A8E1', short: 'P' },
  { id: 'disney', name: 'Disney+', domain: 'disneyplus.com', url: 'https://www.disneyplus.com', color: '#113CCF', short: 'D+' },
  { id: 'hbomax', name: 'HBO Max', domain: 'hbomax.com', url: 'https://www.max.com', color: '#5A2E90', short: 'M' }, 
  { id: 'hulu', name: 'Hulu', domain: 'hulu.com', url: 'https://www.hulu.com', color: '#1CE783', short: 'H' },
  { id: 'crunchyroll', name: 'Crunchyroll', domain: 'crunchyroll.com', url: 'https://www.crunchyroll.com', color: '#F47521', short: 'Cr' },
  { id: 'twitch', name: 'Twitch', domain: 'twitch.tv', url: 'https://www.twitch.tv', color: '#9146FF', short: 'Tw' },
  { id: 'appletv', name: 'Apple TV', domain: 'tv.apple.com', url: 'https://tv.apple.com', color: '#333333', short: '' },
];

function App() {
  const [view, setView] = useState('menu'); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOnSupportedSite, setIsOnSupportedSite] = useState(false);

  useEffect(() => {
    // Verifica se já está logada
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['jwtToken'], (res) => {
        if (res.jwtToken) setIsLoggedIn(true);
      });
    }

    // Verifica a aba atual
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentUrl = tabs[0]?.url || '';
        const isSupported = STREAMING_SERVICES.some(service => currentUrl.includes(service.domain));
        setIsOnSupportedSite(isSupported);
      });
    }
  }, []);

  const handleStartParty = () => {
    setView('party');
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "OPEN_CHAT" });
      });
    }
  };

  const handleRedirect = (url) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.update({ url: url });
      window.close();
    } else {
      window.open(url, '_blank');
    }
  };

  // Função que direciona pro site de Login
  const openLoginPage = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: WEB_LOGIN_URL });
    } else {
      window.open(WEB_LOGIN_URL, '_blank');
    }
  };

  return (
    <div className="app-container">
      
      <div className="header">
        
        {/* Placeholder da Logo. Basta colocar sua imagem na pasta public e mudar o src */}
        <div className="logo-container">
           <img 
              src={logoImg} 
              alt="Logo" 
              style={{ width: '50px', height: '50px', borderRadius: '6px' }} 
              // Fallback caso a imagem não seja encontrada, exibe o texto antigo
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} 
            />
           <span style={{ display: 'none', fontWeight: 'bold', color: '#ec4899', fontSize: '18px' }}>Tp</span>
        </div>

        {!isLoggedIn && (
          <button onClick={openLoginPage} className="btn-login">
            Log In
          </button>
        )}
      </div>

      <div className="content">
        
        {/* TELA INICIAL */}
        {view === 'menu' && (
          <div>
            {!isOnSupportedSite ? (
              <>
                <p className="subtitle">
                  Choose a streaming site to start a party.
                </p>
                <div className="services-grid">
                  {STREAMING_SERVICES.map(service => (
                    <button key={service.id} onClick={() => handleRedirect(service.url)} className="service-btn" title={service.name}>
                      <div className="service-icon" style={{ backgroundColor: service.color, color: service.color === '#FFFFFF' || service.color === '#F1EB1E' ? 'black' : 'white' }}>
                        {service.short}
                      </div>
                      <span className="service-name">
                        {service.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="active-site-container">
                <p className="subtitle" style={{ marginBottom: '15px' }}>Você está em um site compatível!</p>
                <button onClick={handleStartParty} className="btn-primary">
                  Start the Party
                </button>
              </div>
            )}
          </div>
        )}

        {/* TELA DE GERENCIAMENTO DA SALA */}
        {view === 'party' && (
          <div className="party-container">
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Party Management</h3>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 10px 0' }}>Share this link to invite friends:</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input type="text" readOnly value="https://ttddflix.com/join/12345" className="link-input" />
              <button className="btn-copy">Copy</button>
            </div>
            <button onClick={() => setView('menu')} className="btn-disconnect" style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}>
              Disconnect
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;