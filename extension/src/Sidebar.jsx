import { useEffect, useState } from 'react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    const handler = (message) => {
      if (message?.type === 'OPEN_CHAT_SIDEBAR') setIsOpen(true);
      if (message?.type === 'CLOSE_CHAT_SIDEBAR') setIsOpen(false);
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '350px',
        height: '100vh',
        backgroundColor: '#18181b',
        color: 'white',
        zIndex: 2147483647,
        boxShadow: '-5px 0 15px rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          padding: '15px',
          borderBottom: '1px solid #3f3f46',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>TTDDFLIX Chat</h2>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}
        >
          x
        </button>
      </div>

      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        <p style={{ color: '#aaa', fontSize: '12px', textAlign: 'center' }}>Voce entrou na sala.</p>
      </div>

      <div style={{ padding: '15px', borderTop: '1px solid #3f3f46' }}>
        <input
          type="text"
          placeholder="Digite uma mensagem..."
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: '#27272a',
            color: 'white',
          }}
        />
      </div>
    </div>
  );
}
