import { useEffect, useState } from 'react';
import './App.css';

import waveImg from './assets/wave.png';
import snoopyImg from './assets/snoopy.png';
import titleImg from './assets/title.png';
import netflixImg from './assets/netflix.png';
import hboImg from './assets/hbo.png';
import disneyImg from './assets/disney.png';
import primevideoImg from './assets/primevideo.png';
import globoplayImg from './assets/globoplay.png';
import appletvImg from './assets/appletv.png';
import youtubeImg from './assets/youtube.png';
import driveImg from './assets/drive.png';
import paramountImg from './assets/paramount.png';
import twitchImg from './assets/twitch.png';
import huluImg from './assets/hulu.png';
import stremioImg from './assets/stremio.png';
import crunchyrollImg from './assets/crunchyroll.png';
import peacocktvImg from './assets/peacock.png';
import plutoImg from './assets/plutotv.png';
import tubiImg from './assets/tubi.png';
import mubiImg from './assets/mubi.png';
import spotifyImg from './assets/spotify.png';
import telegramImg from './assets/telegram.png';
import twitterImg from './assets/twitter.png';

const WEB_LOGIN_URL = 'http://localhost:5173/login';

const BOTOES_SERVICOS = [
  { id: 'netflix', nome: 'Netflix', logo: netflixImg, link: 'https://www.netflix.com' },
  { id: 'hbo', nome: 'HBO Max', logo: hboImg, link: 'https://www.hbomax.com' },
  { id: 'disney', nome: 'Disney+', logo: disneyImg, link: 'https://www.disneyplus.com' },
  { id: 'primevideo', nome: 'Prime Video', logo: primevideoImg, link: 'https://www.primevideo.com' },
  { id: 'globoplay', nome: 'Globoplay', logo: globoplayImg, link: 'https://globoplay.globo.com' },
  { id: 'appletv', nome: 'Apple Tv', logo: appletvImg, link: 'https://tv.apple.com' },
  { id: 'youtube', nome: 'YouTube', logo: youtubeImg, link: 'https://www.youtube.com' },
  { id: 'drive', nome: 'Drive', logo: driveImg, link: 'https://drive.google.com' },
  { id: 'paramount', nome: 'Paramount+', logo: paramountImg, link: 'https://www.paramountplus.com' },
  { id: 'twitch', nome: 'Twitch', logo: twitchImg, link: 'https://www.twitch.tv' },
  { id: 'hulu', nome: 'Hulu', logo: huluImg, link: 'https://www.hulu.com' },
  { id: 'stremio', nome: 'Stremio', logo: stremioImg, link: 'https://web.strem.io' },
  { id: 'crunchyroll', nome: 'Crunchyroll', logo: crunchyrollImg, link: 'https://www.crunchyroll.com' },
  { id: 'peacocktv', nome: 'Peacock TV', logo: peacocktvImg, link: 'https://www.peacocktv.com' },
  { id: 'plutotv', nome: 'Pluto TV', logo: plutoImg, link: 'https://pluto.tv' },
  { id: 'tubi', nome: 'Tubi', logo: tubiImg, link: 'https://www.tubitv.com' },
  { id: 'mubi', nome: 'Mubi', logo: mubiImg, link: 'https://www.mubi.com' },
  { id: 'spotify', nome: 'Spotify', logo: spotifyImg, link: 'https://open.spotify.com' },
  { id: 'telegram', nome: 'Telegram', logo: telegramImg, link: 'https://web.telegram.org' },
  { id: 'twitter', nome: 'Twitter', logo: twitterImg, link: 'https://x.com' },
];

const HOSTS_SUPORTADOS = [
  'netflix.com',
  'youtube.com',
  'primevideo.com',
  'disneyplus.com',
  'twitch.tv',
  'hbomax.com',
  'max.com',
  'globoplay.globo.com',
  'tv.apple.com',
  'drive.google.com',
  'open.spotify.com',
  'hulu.com',
  'paramountplus.com',
  'crunchyroll.com',
  'peacocktv.com',
  'web.strem.io',
  'pluto.tv',
  'tubitv.com',
  'mubi.com',
  'x.com',
  'web.telegram.org',
];

function abrirLinkExterno(url) {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, '_blank');
  }
}

function App() {
  const [siteSuportado, setSiteSuportado] = useState(null);
  const [temVideoNaPagina, setTemVideoNaPagina] = useState(false);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setSiteSuportado(false);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabAtiva = tabs[0];
      const urlAtual = tabAtiva?.url || '';
      const hostAtual = (() => {
        try {
          return new URL(urlAtual).hostname.toLowerCase();
        } catch {
          return '';
        }
      })();

      const ehSuportado = HOSTS_SUPORTADOS.some(
        (site) => hostAtual === site || hostAtual.endsWith(`.${site}`)
      );

      setSiteSuportado(ehSuportado);

      if (!ehSuportado || !tabAtiva?.id || !chrome.scripting) {
        setTemVideoNaPagina(false);
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tabAtiva.id },
          func: () => Boolean(document.querySelector('video')),
        },
        (results) => {
          setTemVideoNaPagina(Boolean(results?.[0]?.result));
        }
      );
    });
  }, []);

  if (siteSuportado === null) {
    return null;
  }

  if (siteSuportado) {
    return <PopupPrincipal temVideoNaPagina={temVideoNaPagina} />;
  }

  return <PopupNaoSuportado />;
}

function PopupNaoSuportado() {
  return (
    <div className="popup-container">
      <div className="header">
        <div className="header-left">
          <img src={snoopyImg} alt="Snoopy" className="snoopy-img" />
          <img src={titleImg} alt="Titulo" className="title-img" />
        </div>
        <button className="login-btn" onClick={() => abrirLinkExterno(WEB_LOGIN_URL)}>
          Log In
        </button>
      </div>

      <img src={waveImg} alt="Onda decorativa" className="wave-divider" />

      <p className="description-text">
        To use the extension, please select one of the following services below.
      </p>

      <div className="services-grid">
        {BOTOES_SERVICOS.map((servico) => (
          <button
            key={servico.id}
            className="service-btn"
            onClick={() => abrirLinkExterno(servico.link)}
          >
            <img src={servico.logo} alt={`Logo ${servico.nome}`} className="service-logo" />
          </button>
        ))}
      </div>
    </div>
  );
}

function PopupPrincipal({ temVideoNaPagina }) {
  const [etapa, setEtapa] = useState('auth');
  const [painelAberto, setPainelAberto] = useState(false);
  const [apenasHostControla, setApenasHostControla] = useState(false);
  const [desativarReacoes, setDesativarReacoes] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [feedbackCopy, setFeedbackCopy] = useState('');

  const roomUrl = 'https://www.teleparty.com/join/6ca0f';

  const enviarMensagemAbaAtiva = (message) => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  };

  const iniciarParty = () => {
    if (!temVideoNaPagina) return;
    setEtapa('management');
    enviarMensagemAbaAtiva({ type: 'OPEN_CHAT_SIDEBAR' });
  };

  const toggleSidebar = () => {
    setShowChatSidebar((value) => {
      const nextValue = !value;
      enviarMensagemAbaAtiva({
        type: nextValue ? 'OPEN_CHAT_SIDEBAR' : 'CLOSE_CHAT_SIDEBAR',
      });
      return nextValue;
    });
  };

  const copiarLinkDaSala = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setFeedbackCopy('Copied!');
      setTimeout(() => setFeedbackCopy(''), 1200);
    } catch {
      setFeedbackCopy('Could not copy');
      setTimeout(() => setFeedbackCopy(''), 1200);
    }
  };

  return (
    <div className="popup-container">
      <div className="supported-card">
        <div className="supported-header">
          <div className="supported-brand">
            <img src={snoopyImg} alt="Snoopy" className="supported-brand-icon" />
            <img src={titleImg} alt="TTDDFLIX" className="supported-brand-title" />
          </div>

          <button className="supported-login-btn" onClick={() => abrirLinkExterno(WEB_LOGIN_URL)}>
            Log In
          </button>
        </div>

        <img src={waveImg} alt="Onda decorativa" className="supported-wave-divider" />

        {etapa === 'auth' ? (
          <div className="supported-body">
            <div className="supported-body-intro">
              <span className="supported-eyebrow">Supported site detected</span>
              <h2>Sign Up For Ttddflix</h2>
              <p>Welcome to Ttddflix! Please sign in to start watching with friends.</p>
            </div>

            <button className="supported-primary-btn" onClick={() => abrirLinkExterno(WEB_LOGIN_URL)}>
              Sign Up
            </button>

            <button className="supported-secondary-btn" onClick={() => setEtapa('create')}>
              Continue as Guest
            </button>
          </div>
        ) : etapa === 'create' ? (
          <div className="supported-body">
            <div className="supported-body-intro">
              <span className="supported-eyebrow">Start a session</span>
              <h2>Create a Ttddflix Room</h2>
              <p>Create a room after opening a playable video in the current tab.</p>
            </div>

            <div className="supported-settings-panel">
              <button
                className="supported-settings-title-row"
                onClick={() => setPainelAberto((value) => !value)}
                aria-expanded={painelAberto}
              >
                <span>Party Settings</span>
                <span className={`supported-caret ${painelAberto ? 'open' : ''}`} aria-hidden="true" />
              </button>

              {painelAberto ? (
                <div className="supported-settings-list">
                  <div className="supported-setting-item">
                    <span>Only I have control</span>
                    <button
                      className={`supported-switch ${apenasHostControla ? 'on' : ''}`}
                      onClick={() => setApenasHostControla((value) => !value)}
                    >
                      <span />
                    </button>
                  </div>

                  <div className="supported-setting-item">
                    <span>Disable reactions for party</span>
                    <button
                      className={`supported-switch ${desativarReacoes ? 'on' : ''}`}
                      onClick={() => setDesativarReacoes((value) => !value)}
                    >
                      <span />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              className={`supported-primary-btn ${!temVideoNaPagina ? 'disabled' : ''}`}
              disabled={!temVideoNaPagina}
              onClick={iniciarParty}
            >
              {temVideoNaPagina ? 'Start the party' : 'Select a video first'}
            </button>

            <p className="supported-help">
              {temVideoNaPagina
                ? 'Invite your friends after the room is created.'
                : 'Open a video first, then activate the extension to start a party.'}
            </p>
          </div>
        ) : (
          <div className="supported-body">
            <div className="supported-body-intro">
              <span className="supported-eyebrow">Room active</span>
              <h2>Party Management</h2>
              <p>Share the invite link below so other people can join your session.</p>
            </div>

            <div className="supported-setting-item supported-setting-inline">
              <span>Show chat sidebar</span>
              <button
                className={`supported-switch ${showChatSidebar ? 'on' : ''}`}
                onClick={toggleSidebar}
              >
                <span />
              </button>
            </div>

            <div className="supported-invite-row">
              <input readOnly value={roomUrl} />
              <button onClick={copiarLinkDaSala}>Copy</button>
            </div>

            {feedbackCopy ? <p className="supported-copy-feedback">{feedbackCopy}</p> : null}

            <button
              className="supported-disconnect-btn"
              onClick={() => {
                setEtapa('create');
                enviarMensagemAbaAtiva({ type: 'CLOSE_CHAT_SIDEBAR' });
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
