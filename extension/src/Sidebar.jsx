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
    <div style={sidebarStyle}>
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #2f3341',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Party Chat</h2>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#c7cede',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '18px 16px', flex: 1, overflowY: 'auto' }}>
        <p style={{ color: '#9ca3b5', fontSize: '12px', lineHeight: 1.45 }}>
          🍪 created the party 🎉
          <br />
          started playing the video at 14:55
        </p>
      </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #2f3341' }}>
          <div style={reactionRowStyle}>
          {['🥰', '😡', '😭', '😂', '😲', '🔥'].map((emoji) => (
            <button key={emoji} style={emojiButtonStyle}>
              {emoji}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Digite uma mensagem..."
          style={messageInputStyle}
        />
      </div>
    </div>
  );
}

const sidebarStyle = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '340px',
  height: '100vh',
  background: '#181a20',
  color: '#f4f6fc',
  zIndex: 2147483647,
  boxShadow: '-6px 0 20px rgba(0,0,0,0.65)',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'Poppins, sans-serif',
};

const reactionRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '6px',
  marginBottom: '10px',
  border: '1px solid #2e3240',
  borderRadius: '8px',
  padding: '6px',
};

const emojiButtonStyle = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '22px',
  lineHeight: 1,
};

const messageInputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #2e3240',
  backgroundColor: '#20242f',
  color: '#f7f7f8',
  outline: 'none',
};