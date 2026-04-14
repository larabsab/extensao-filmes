import React from 'react';
import ReactDOM from 'react-dom/client';
import Sidebar from './Sidebar';

console.log("🎬 Watch Party: Script de conteúdo ativado!");

const rootElement = document.createElement('div');
rootElement.id = 'ttddflix-root';
document.body.appendChild(rootElement);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Sidebar />
  </React.StrictMode>
);

let videoElement = null;

// Função para encontrar o vídeo na página
const findVideo = () => {
  const video = document.querySelector('video');
  if (video && video !== videoElement) {
    videoElement = video;
    setupVideoListeners();
  }
};

// Ouve os eventos do player (Play, Pause, Seek)
const setupVideoListeners = () => {
  videoElement.onplay = () => {
    chrome.runtime.sendMessage({ type: "VIDEO_EVENT", action: "play", time: videoElement.currentTime });
  };

  videoElement.onpause = () => {
    chrome.runtime.sendMessage({ type: "VIDEO_EVENT", action: "pause", time: videoElement.currentTime });
  };

  videoElement.onseeking = () => {
    chrome.runtime.sendMessage({ type: "VIDEO_EVENT", action: "seek", time: videoElement.currentTime });
  };
};

// Procura por vídeos a cada 2 segundos (caso o site carregue o player depois)
setInterval(findVideo, 2000);

// Ouve ordens vindas das amigas (via background script)
chrome.runtime.onMessage.addListener((message) => {
  if (!videoElement) return;

  if (message.action === "play") videoElement.play();
  if (message.action === "pause") videoElement.pause();
  if (message.action === "seek") videoElement.currentTime = message.time;
});