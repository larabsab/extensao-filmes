export function bindVideoSync(videoElementRef, getSuppressUntil) {
  const videoElement = videoElementRef();

  if (!videoElement) {
    return;
  }

  videoElement.onplay = () => {
    if (Date.now() < getSuppressUntil()) return;
    chrome.runtime.sendMessage({ type: 'VIDEO_EVENT', action: 'play', time: videoElement.currentTime });
  };

  videoElement.onpause = () => {
    if (Date.now() < getSuppressUntil()) return;
    chrome.runtime.sendMessage({ type: 'VIDEO_EVENT', action: 'pause', time: videoElement.currentTime });
  };

  videoElement.onseeking = () => {
    if (Date.now() < getSuppressUntil()) return;
    chrome.runtime.sendMessage({ type: 'VIDEO_EVENT', action: 'seek', time: videoElement.currentTime });
  };
}
