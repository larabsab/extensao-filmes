import { useState, useEffect } from 'react';
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


// Array com os botões
const BOTOES_SERVICOS = [
  { id: 'netflix', nome: 'Netflix', logo: netflixImg, link: 'https://www.netflix.com' },
  { id: 'hbo', nome: 'HBO Max', logo: hboImg, link: 'https://www.hbomax.com' },
  { id: 'disney', nome: 'Disney+', logo: disneyImg, link: 'https://www.disneyplus.com' },
  { id: 'primevideo', nome: 'Prime Video', logo: primevideoImg, link: 'https://www.primevideo.com' },
  { id: 'globoplay', nome: 'Globoplay', logo: globoplayImg, link: 'https://globoplay.globo.com' },
  { id: 'appletv', nome: 'Apple Tv', logo: appletvImg, link: 'https://tv.apple.com' },
  { id: 'youtube', nome: 'YouTube', logo: youtubeImg, link: 'https://www.youtube.com' },
  { id: 'drive', nome: 'Drive', logo: driveImg, link: 'https://www.drive.google.com' },
  { id: 'paramount', nome: 'Paramount+', logo: paramountImg, link: 'https://www.paramountplus.com' },
  { id: 'twitch', nome: 'Twitch', logo: twitchImg, link: 'https://www.twitch.tv' },
  { id: 'hulu', nome: 'Hulu', logo: huluImg, link: 'https://www.hulu.com' },
  { id: 'stremio', nome: 'Stremio', logo: stremioImg, link: 'https://www.stremio.com' },
  { id: 'crunchyroll', nome: 'Crunchyroll', logo: crunchyrollImg, link: 'https://www.crunchyroll.com' },
  { id: 'peacocktv', nome: 'Peacock TV', logo: peacocktvImg, link: 'https://www.peacocktv.com' },
  { id: 'plutotv', nome: 'Pluto TV', logo: plutoImg, link: 'https://www.pluto.tv.com' },
  { id: 'tubi', nome: 'Tubi', logo: tubiImg, link: 'https://www.tubitv.com' },
  { id: 'mubi', nome: 'Mubi', logo: mubiImg, link: 'https://www.mubi.com' },
  { id: 'spotify', nome: 'Spotify', logo: spotifyImg, link: 'https://open.spotify.com' },
  { id: 'telegram', nome: 'Telegram', logo: telegramImg, link: 'https://web.telegram.org' },
  { id: 'twitter', nome: 'Twitter', logo: twitterImg, link: 'https://www.x.com' },
];


function App() {
  const [siteSuportado, setSiteSuportado] = useState(true);

  // Verifica a URL atual quando o popup abre
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const urlAtual = tabs[0]?.url || '';
        // Lista rápida para checagem
        const urlsSuportadas = ['netflix.com', 'max.com', 'disneyplus.com'];
        const ehSuportado = urlsSuportadas.some(site => urlAtual.includes(site));
        setSiteSuportado(ehSuportado);
      });
    }
  }, []);

  if (siteSuportado) {
    return <PopupPrincipal />; // Tela para sites que a extensão alcança
  }

  return <PopupNaoSuportado />; // Tela para sites que a extensão NÃO alcança
}

// === TELA: SITE NÃO SUPORTADO ===
function PopupNaoSuportado() {
  
  // Função para abrir links em nova guia
  const abrirLink = (url) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="popup-container">
      {/* HEADER: Snoopy + Título na esquerda, Log In na direita */}
      <div className="header">
        <div className="header-left">
          <img src={snoopyImg} alt="Snoopy" className="snoopy-img" />
          <img src={titleImg} alt="Título" className="title-img" />
        </div>
        <button 
          className="login-btn" 
          onClick={() => abrirLink(WEB_LOGIN_URL)}
        >
          Log In
        </button>
      </div>

      {/* DIVISOR DE ONDA */}
      <img src={waveImg} alt="Onda decorativa" className="wave-divider" />

      {/* TEXTO DESCRITIVO */}
      <p className="description-text">
        To use the extension, please select one of the following services below.
      </p>

      {/* GRID DE BOTÕES (2 linhas x 3 colunas) */}
      <div className="services-grid">
        {BOTOES_SERVICOS.map((servico) => (
          <button 
            key={servico.id} 
            className="service-btn"
            onClick={() => abrirLink(servico.link)}
          >
            <img src={servico.logo} alt={`Logo ${servico.nome}`} className="service-logo" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Componente da tela principal (pode manter o seu atual aqui)
function PopupPrincipal() {
  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h1>A extensão está ativa!</h1>
    </div>
  );
}

export default App;