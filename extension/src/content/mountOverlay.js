import React from 'react';
import ReactDOM from 'react-dom/client';
import Sidebar from '../Sidebar';
import sidebarStyles from '../Sidebar.css?inline';

export function createOverlayRoot() {
  const host = document.createElement('div');
  host.id = 'ttddflix-host';

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const styleTag = document.createElement('style');
  styleTag.textContent = sidebarStyles;
  shadowRoot.appendChild(styleTag);

  const reactMount = document.createElement('div');
  reactMount.id = 'ttddflix-root';
  shadowRoot.appendChild(reactMount);

  ReactDOM.createRoot(reactMount).render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(Sidebar)
    )
  );

  return host;
}
