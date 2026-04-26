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
const API_BASE_URL = 'http://localhost:3000/api';

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

async function fetchExtensionApi(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.details || 'Could not complete the request.');
  }

  return data;
}

function sendRuntimeMessage(message) {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return Promise.resolve({});
  }

  return chrome.runtime.sendMessage(message);
}

function getActiveTabDetails() {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return Promise.resolve({ tabId: null, tabUrl: '', siteSuportado: false, temVideo: false });
  }

  return new Promise((resolve) => {
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

      if (!ehSuportado || !tabAtiva?.id || !chrome.scripting) {
        resolve({
          tabId: tabAtiva?.id || null,
          tabUrl: urlAtual,
          siteSuportado: ehSuportado,
          temVideo: false
        });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tabAtiva.id },
          func: () => Boolean(document.querySelector('video'))
        },
        (results) => {
          resolve({
            tabId: tabAtiva.id,
            tabUrl: urlAtual,
            siteSuportado: ehSuportado,
            temVideo: Boolean(results?.[0]?.result)
          });
        }
      );
    });
  });
}

function App() {
  const [siteSuportado, setSiteSuportado] = useState(null);
  const [temVideoNaPagina, setTemVideoNaPagina] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState({ tabId: null, tabUrl: '' });
  const [appSession, setAppSession] = useState(null);

  useEffect(() => {
    let active = true;

    getActiveTabDetails().then((details) => {
      if (!active) {
        return;
      }

      setAbaAtiva({ tabId: details.tabId, tabUrl: details.tabUrl });
      setSiteSuportado(details.siteSuportado);
      setTemVideoNaPagina(details.temVideo);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    sendRuntimeMessage({ type: 'GET_APP_SESSION' }).then(({ appSession: nextAppSession }) => {
      if (active) {
        setAppSession(nextAppSession || null);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (siteSuportado === null) {
    return null;
  }

  if (siteSuportado) {
    return (
      <PopupPrincipal
        temVideoNaPagina={temVideoNaPagina}
        abaAtiva={abaAtiva}
        appSession={appSession}
        setAppSession={setAppSession}
      />
    );
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

function PopupPrincipal({ temVideoNaPagina, abaAtiva, appSession, setAppSession }) {
  const [etapa, setEtapa] = useState('auth');
  const [painelAberto, setPainelAberto] = useState(false);
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
  const [apenasHostControla, setApenasHostControla] = useState(false);
  const [desativarReacoes, setDesativarReacoes] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [feedbackCopy, setFeedbackCopy] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomError, setRoomError] = useState('');
  const [roomStatus, setRoomStatus] = useState('');
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const isLoggedIn = Boolean(appSession?.token);
  const sessionUser = appSession?.user || null;

  useEffect(() => {
    let active = true;

    sendRuntimeMessage({ type: 'GET_ROOM_STATE' }).then(({ roomState: nextRoomState }) => {
      if (!active) {
        return;
      }

      if (nextRoomState?.roomId) {
        setRoomState(nextRoomState);
        setEtapa('management');
        setShowChatSidebar(Boolean(nextRoomState.sidebarOpen));

        if (abaAtiva.tabId) {
          sendRuntimeMessage({
            type: 'ATTACH_ROOM_TAB',
            tabId: abaAtiva.tabId,
            tabUrl: abaAtiva.tabUrl,
            openSidebar: nextRoomState.sidebarOpen
          }).then(({ roomState: attachedRoomState }) => {
            if (active && attachedRoomState) {
              setRoomState(attachedRoomState);
            }
          });
        }
      } else {
        setEtapa(isLoggedIn ? 'create' : 'auth');
      }
    });

    return () => {
      active = false;
    };
  }, [abaAtiva.tabId, abaAtiva.tabUrl, isLoggedIn]);

  const roomInviteCode = roomState?.roomCode || '';

  useEffect(() => {
    if (roomState?.roomId) {
      return;
    }

    setEtapa(isLoggedIn ? 'create' : 'auth');
  }, [isLoggedIn, roomState?.roomId]);

  useEffect(() => {
    setMenuPerfilAberto(false);
  }, [etapa]);

  const iniciarParty = async () => {
    if (!temVideoNaPagina || !appSession?.token) return;

    setRoomLoading(true);
    setRoomError('');
    setRoomStatus('');

    try {
      const createdRoom = await fetchExtensionApi('/rooms', appSession.token, {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await sendRuntimeMessage({
        type: 'START_ROOM',
        roomId: createdRoom.roomId,
        roomCode: createdRoom.roomCode,
        tabId: abaAtiva.tabId,
        tabUrl: abaAtiva.tabUrl,
        onlyHostControls: apenasHostControla,
        reactionsDisabled: desativarReacoes
      });

      if (response?.roomState) {
        setRoomState(response.roomState);
        setShowChatSidebar(Boolean(response.roomState.sidebarOpen));
        setEtapa('management');
        setRoomStatus('Your room is active and will stay connected until you disconnect.');
      }
    } catch (error) {
      setRoomError(error.message || 'Could not create the room right now.');
    } finally {
      setRoomLoading(false);
    }
  };

  const entrarNaSala = async () => {
    if (!appSession?.token) {
      return;
    }

    const normalizedCode = joinCode.trim().toUpperCase();

    if (!normalizedCode) {
      setRoomError('Enter a room code first.');
      return;
    }

    setRoomLoading(true);
    setRoomError('');
    setRoomStatus('');

    try {
      const room = await fetchExtensionApi(`/rooms/code/${normalizedCode}`, appSession.token);
      const response = await sendRuntimeMessage({
        type: 'START_ROOM',
        roomId: room.roomId,
        roomCode: room.roomCode,
        tabId: abaAtiva.tabId,
        tabUrl: abaAtiva.tabUrl,
        onlyHostControls: false,
        reactionsDisabled: false
      });

      if (response?.roomState) {
        setRoomState(response.roomState);
        setShowChatSidebar(Boolean(response.roomState.sidebarOpen));
        setEtapa('management');
        setRoomStatus('You joined the room successfully.');
      }
    } catch (error) {
      setRoomError(error.message || 'Could not join this room.');
    } finally {
      setRoomLoading(false);
    }
  };

  const toggleSidebar = async () => {
    const nextValue = !showChatSidebar;
    setShowChatSidebar(nextValue);

    const response = await sendRuntimeMessage({
      type: 'SET_SIDEBAR_OPEN',
      isOpen: nextValue
    });

    if (response?.roomState) {
      setRoomState(response.roomState);
    }
  };

  const handleExtensionLogout = async () => {
    await sendRuntimeMessage({ type: 'LOGOUT_EXTENSION_SESSION' });
    setAppSession(null);
    setRoomState(null);
    setShowChatSidebar(true);
    setJoinCode('');
    setRoomError('');
    setRoomStatus('');
    setEtapa('auth');
  };

  const abrirManageAccount = () => {
    setMenuPerfilAberto(false);
    abrirLinkExterno('http://localhost:5173/account');
  };

  const copiarLinkDaSala = async () => {
    try {
      await navigator.clipboard.writeText(roomInviteCode);
      setFeedbackCopy('Copied!');
      setTimeout(() => setFeedbackCopy(''), 1200);
    } catch {
      setFeedbackCopy('Could not copy');
      setTimeout(() => setFeedbackCopy(''), 1200);
    }
  };

  const sessionAvatar = sessionUser?.avatarUrl || null;
  const sessionLabel = sessionUser?.displayName || sessionUser?.email || 'Logged in';

  return (
    <div className="popup-container">
      <div className="supported-card">
        <div className="supported-header">
          <div className="supported-brand">
            <img src={snoopyImg} alt="Snoopy" className="supported-brand-icon" />
            <img src={titleImg} alt="TTDDFLIX" className="supported-brand-title" />
          </div>

          {isLoggedIn ? (
            <div className="supported-session-wrap">
              <button
                type="button"
                className="supported-session"
                onClick={() => setMenuPerfilAberto((value) => !value)}
                aria-expanded={menuPerfilAberto}
              >
                {sessionAvatar ? (
                  <img src={sessionAvatar} alt={sessionLabel} className="supported-session-avatar" />
                ) : (
                  <div className="supported-session-avatar supported-session-avatar--fallback">
                    {(sessionLabel || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="supported-session-copy">
                  <span>Logged in</span>
                  <strong>{sessionLabel}</strong>
                </div>
                <span className={`supported-session-caret ${menuPerfilAberto ? 'open' : ''}`} aria-hidden="true" />
              </button>

              {menuPerfilAberto ? (
                <div className="supported-session-menu">
                  <button type="button" onClick={abrirManageAccount}>
                    Manage account
                  </button>
                  <button type="button" onClick={handleExtensionLogout}>
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button className="supported-login-btn" onClick={() => abrirLinkExterno(WEB_LOGIN_URL)}>
              Log In
            </button>
          )}
        </div>

        <img src={waveImg} alt="Onda decorativa" className="supported-wave-divider" />

        {!isLoggedIn && etapa === 'auth' ? (
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
              <p>Create a room after opening a playable video in the current tab, or join one with a code below.</p>
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
              disabled={!temVideoNaPagina || roomLoading}
              onClick={iniciarParty}
            >
              {roomLoading ? 'Starting...' : temVideoNaPagina ? 'Start the party' : 'Select a video first'}
            </button>

            <p className="supported-help">
              {temVideoNaPagina
                ? 'Invite your friends after the room is created.'
                : 'Open a video first, then activate the extension to start a party.'}
            </p>

            <div className="supported-join-panel">
              <label className="supported-join-label">Join an existing room</label>
              <div className="supported-invite-row supported-invite-row--join">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="Enter room code"
                />
                <button onClick={entrarNaSala} disabled={roomLoading}>
                  Join
                </button>
              </div>
            </div>

            {roomError ? <p className="supported-error-text">{roomError}</p> : null}
            {roomStatus ? <p className="supported-copy-feedback">{roomStatus}</p> : null}
          </div>
        ) : (
          <div className="supported-body">
            <div className="supported-body-intro">
              <span className="supported-eyebrow">Room active</span>
              <h2>Party Management</h2>
              <p>Keep this room open while you switch videos or streaming tabs. Only disconnect when you truly want to end the session.</p>
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
              <input readOnly value={roomInviteCode} />
              <button onClick={copiarLinkDaSala}>Copy</button>
            </div>

            <p className="supported-help">Share this room code with your friends to bring them into the same session.</p>

            {feedbackCopy ? <p className="supported-copy-feedback">{feedbackCopy}</p> : null}

            <button
              className="supported-disconnect-btn"
              onClick={async () => {
                await sendRuntimeMessage({ type: 'STOP_ROOM' });
                setRoomState(null);
                setShowChatSidebar(true);
                setJoinCode('');
                setRoomStatus('');
                setRoomError('');
                setEtapa('create');
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
