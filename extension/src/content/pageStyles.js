export const pageStyles = `
  html[data-ttddflix-sidebar='generic'] {
    width: calc(100% - var(--ttddflix-sidebar-width, 360px)) !important;
    max-width: calc(100% - var(--ttddflix-sidebar-width, 360px)) !important;
  }

  html[data-ttddflix-sidebar='generic'] body {
    width: calc(100% - var(--ttddflix-sidebar-width, 360px)) !important;
    max-width: calc(100% - var(--ttddflix-sidebar-width, 360px)) !important;
    overflow-x: hidden !important;
  }

  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[theater] #columns,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[is-two-columns_] #columns {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) var(--ttddflix-sidebar-width, 360px) !important;
    gap: 16px !important;
    align-items: start !important;
  }

  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[theater] #primary,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[theater] #primary-inner,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[theater] #player,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[theater] #player-container-outer,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[is-two-columns_] #primary,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[is-two-columns_] #primary-inner,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[is-two-columns_] #player,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[is-two-columns_] #player-container-outer {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  html[data-ttddflix-sidebar='youtube'] #secondary,
  html[data-ttddflix-sidebar='youtube'] #secondary-inner {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }

  html[data-ttddflix-sidebar='youtube'] #secondary-inner {
    position: sticky !important;
    top: 56px !important;
  }

  html[data-ttddflix-sidebar='youtube'] #secondary-inner > :not(#ttddflix-host) {
    display: none !important;
  }

  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[theater] #movie_player,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[theater] #player-container-outer,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[theater] #columns,
  html[data-ttddflix-sidebar='youtube'] ytd-watch-flexy[theater] #full-bleed-container {
    width: 100% !important;
    max-width: 100% !important;
  }

  html.ttddflix-sidebar-open body {
    padding-right: 360px !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }

  html.ttddflix-sidebar-open ytd-app {
    width: calc(100vw - 360px) !important;
    max-width: calc(100vw - 360px) !important;
  }
`;
