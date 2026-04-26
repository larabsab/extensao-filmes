import { useMemo, useState } from 'react';

const MOCK_PARTICIPANTS = [
  { id: 'host', name: 'larinha', avatar: '🧚', accent: 'pink' },
  { id: 'guest', name: 'bea', avatar: '☕', accent: 'neutral' }
];

const MOCK_MESSAGES = [
  {
    id: 'activity-1',
    type: 'activity',
    author: MOCK_PARTICIPANTS[0],
    lines: ['created the party 🎉', 'started playing the video at 33:50']
  }
];

const REACTION_OPTIONS = ['🥰', '😡', '😭', '😂', '😲', '🔥'];

export default function Sidebar() {
  const [message, setMessage] = useState('');

  const participantCount = useMemo(() => MOCK_PARTICIPANTS.length, []);

  const closeSidebar = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SET_SIDEBAR_OPEN', isOpen: false }).catch(() => {});
    }
  };

  return (
    <aside className="watchparty-sidebar" aria-label="Party sidebar">
      <div className="watchparty-sidebar__shell">
        <header className="watchparty-sidebar__header">
          <div className="watchparty-sidebar__back" aria-hidden="true">
            ⟶
          </div>

          <div className="watchparty-sidebar__brand">
            <span className="watchparty-sidebar__brand-mark">Tp</span>
            <button type="button" className="watchparty-sidebar__upgrade">
              Upgrade
            </button>
          </div>

          <div className="watchparty-sidebar__tools">
            <button type="button" className="watchparty-sidebar__tool">
              <span>👥</span>
              <strong>{participantCount}</strong>
            </button>
            <button type="button" className="watchparty-sidebar__tool">🔗</button>
            <button type="button" className="watchparty-sidebar__tool">🪪</button>
            <button type="button" className="watchparty-sidebar__profile" onClick={closeSidebar}>
              {MOCK_PARTICIPANTS[0].avatar}
            </button>
          </div>
        </header>

        <div className="watchparty-sidebar__divider" />

        <section className="watchparty-sidebar__messages">
          {MOCK_MESSAGES.map((entry) => (
            <article key={entry.id} className="watchparty-message watchparty-message--activity">
              <div className="watchparty-message__avatar">{entry.author.avatar}</div>
              <div className="watchparty-message__content">
                <p className="watchparty-message__headline">
                  <strong>{entry.author.name}</strong> {entry.lines[0]}
                </p>
                <p className="watchparty-message__subline">{entry.lines[1]}</p>
              </div>
            </article>
          ))}
        </section>

        <footer className="watchparty-sidebar__composer">
          <div className="watchparty-sidebar__reactions">
            {REACTION_OPTIONS.map((emoji) => (
              <button key={emoji} type="button" className="watchparty-sidebar__reaction">
                {emoji}
              </button>
            ))}
          </div>

          <div className="watchparty-sidebar__input-shell">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="watchparty-sidebar__input"
              placeholder="Type a message..."
              rows={1}
            />

            <div className="watchparty-sidebar__composer-footer">
              <div className="watchparty-sidebar__composer-left">
                <button type="button" className="watchparty-sidebar__mini-button">📹</button>
                <button type="button" className="watchparty-sidebar__mini-button">🎙️</button>
              </div>

              <div className="watchparty-sidebar__composer-right">
                <button type="button" className="watchparty-sidebar__mini-button">😊</button>
                <button type="button" className="watchparty-sidebar__mini-button watchparty-sidebar__mini-button--tag">
                  GIF
                </button>
                <button type="button" className="watchparty-sidebar__mini-button">✨</button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </aside>
  );
}
