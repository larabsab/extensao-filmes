import { getAdapterForLocation } from './content/adapters';
import { createOverlayRoot } from './content/mountOverlay';
import { pageStyles } from './content/pageStyles';
import { bindVideoSync } from './content/videoSync';

console.log('Watch Party: content script active.');

const overlayHost = createOverlayRoot();
const pageStyleTag = document.createElement('style');
pageStyleTag.id = 'ttddflix-page-styles';
pageStyleTag.textContent = pageStyles;
let adapter = getAdapterForLocation();
let videoElement = null;
let suppressSyncUntil = 0;
let isSidebarOpen = false;

function getOverlayContainer() {
  return adapter.getMountTarget(document.fullscreenElement);
}

function mountOverlayHost() {
  const container = getOverlayContainer();

  if (!container || overlayHost.parentElement === container) {
    return;
  }

  overlayHost.dataset.layout = adapter.getOverlayLayout();
  container.appendChild(overlayHost);
}

function unmountOverlayHost() {
  if (overlayHost.parentElement) {
    overlayHost.parentElement.removeChild(overlayHost);
  }
}

function ensurePageStyles() {
  if (!document.head || document.getElementById(pageStyleTag.id)) {
    return;
  }

  document.head.appendChild(pageStyleTag);
}

function refreshAdapter() {
  adapter = getAdapterForLocation();
}

function syncSidebarLayout() {
  ensurePageStyles();

  if (isSidebarOpen) {
    overlayHost.dataset.layout = adapter.getOverlayLayout();
    mountOverlayHost();
    adapter.onSidebarOpen();
    return;
  }

  adapter.onSidebarClose();
  unmountOverlayHost();
}

function findVideo() {
  refreshAdapter();

  if (isSidebarOpen) {
    overlayHost.dataset.layout = adapter.getOverlayLayout();
    mountOverlayHost();
  }

  const nextVideo = adapter.findVideo();

  if (nextVideo && nextVideo !== videoElement) {
    videoElement = nextVideo;
    bindVideoSync(() => videoElement, () => suppressSyncUntil);
  }
}

function openPartyLayout() {
  isSidebarOpen = true;
  document.documentElement.classList.add('ttddflix-sidebar-open');
  syncSidebarLayout();
}

function closePartyLayout() {
  isSidebarOpen = false;
  document.documentElement.classList.remove('ttddflix-sidebar-open');
  syncSidebarLayout();
}

function handleFullscreenChange() {
  if (isSidebarOpen) {
    mountOverlayHost();
  }
}

ensurePageStyles();
document.addEventListener('fullscreenchange', handleFullscreenChange);
window.addEventListener('resize', handleFullscreenChange);
setInterval(findVideo, 1200);

chrome.runtime.sendMessage({ type: 'GET_ROOM_STATE' }).then(({ roomState }) => {
  if (roomState?.sidebarOpen) {
    openPartyLayout();
  }
}).catch(() => {});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'OPEN_CHAT_SIDEBAR') {
    openPartyLayout();
    return;
  }

  if (message?.type === 'CLOSE_CHAT_SIDEBAR') {
    closePartyLayout();
    return;
  }

  if (!videoElement) {
    return;
  }

  suppressSyncUntil = Date.now() + 800;

  if (message.action === 'play') videoElement.play();
  if (message.action === 'pause') videoElement.pause();
  if (message.action === 'seek') videoElement.currentTime = message.time;
});
