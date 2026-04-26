const SIDEBAR_WIDTH = 360;

function getYouTubeWatchFlexy() {
  return document.querySelector('ytd-watch-flexy');
}

function getYouTubeTheaterButton() {
  return (
    document.querySelector('button.ytp-size-button') ||
    document.querySelector('.ytp-size-button')
  );
}

function applyGenericPageShift() {
  document.documentElement.dataset.ttddflixSidebar = 'generic';
  document.documentElement.style.setProperty('--ttddflix-sidebar-width', `${SIDEBAR_WIDTH}px`);
}

function cleanupGenericPageShift() {
  delete document.documentElement.dataset.ttddflixSidebar;
  document.documentElement.style.removeProperty('--ttddflix-sidebar-width');
}

function createGenericAdapter() {
  return {
    id: 'generic',
    getOverlayLayout() {
      return 'floating';
    },
    getMountTarget(fullscreenElement) {
      return fullscreenElement || document.documentElement;
    },
    findVideo() {
      return document.querySelector('video');
    },
    onSidebarOpen() {
      applyGenericPageShift();
    },
    onSidebarClose() {
      cleanupGenericPageShift();
    }
  };
}

function createYouTubeAdapter() {
  let shouldRestoreTheaterMode = false;
  let theaterButtonRef = null;

  return {
    id: 'youtube',
    getOverlayLayout() {
      return 'embedded';
    },
    getMountTarget(fullscreenElement) {
      if (fullscreenElement) {
        return fullscreenElement;
      }

      return (
        document.querySelector('#secondary-inner') ||
        document.querySelector('#secondary') ||
        document.documentElement
      );
    },
    findVideo() {
      return document.querySelector('video');
    },
    onSidebarOpen() {
      const watchFlexy = getYouTubeWatchFlexy();
      const isTheater = watchFlexy?.hasAttribute('theater');
      const theaterButton = getYouTubeTheaterButton();

      theaterButtonRef = theaterButton || null;

      if (!isTheater && theaterButton) {
        theaterButton.click();
        shouldRestoreTheaterMode = true;
      }

      document.documentElement.dataset.ttddflixSidebar = 'youtube';
      document.documentElement.style.setProperty('--ttddflix-sidebar-width', `${SIDEBAR_WIDTH}px`);
    },
    onSidebarClose() {
      delete document.documentElement.dataset.ttddflixSidebar;
      document.documentElement.style.removeProperty('--ttddflix-sidebar-width');

      if (!shouldRestoreTheaterMode || !theaterButtonRef) {
        shouldRestoreTheaterMode = false;
        theaterButtonRef = null;
        return;
      }

      const watchFlexy = getYouTubeWatchFlexy();

      if (watchFlexy?.hasAttribute('theater')) {
        theaterButtonRef.click();
      }

      shouldRestoreTheaterMode = false;
      theaterButtonRef = null;
    }
  };
}

export function getAdapterForLocation() {
  const hostname = window.location.hostname;
  const isYouTubeWatchPage = hostname.includes('youtube.com') && window.location.pathname === '/watch';

  if (isYouTubeWatchPage) {
    return createYouTubeAdapter();
  }

  return createGenericAdapter();
}
