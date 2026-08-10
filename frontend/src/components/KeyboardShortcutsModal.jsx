import React from 'react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const mainShortcuts = [
    { label: 'Mark as unread', keys: ['Ctrl', 'Alt', 'Shift', 'U'] },
    { label: 'Mute', keys: ['Ctrl', 'Alt', 'Shift', 'M'] },
    { label: 'Archive chat', keys: ['Ctrl', 'Alt', 'Shift', 'E'] },
    { label: 'Pin chat', keys: ['Ctrl', 'Alt', 'Shift', 'P'] },
    { label: 'Search', keys: ['Ctrl', 'Alt', '/'] },
    { label: 'Search chat', keys: ['Ctrl', 'Shift', 'F'] },
    { label: 'New chat', keys: ['Ctrl', 'Alt', 'N'] },
    { label: 'Next chat', keys: ['Ctrl', 'Alt', 'Shift', ']'] },
    { label: 'Previous chat', keys: ['Ctrl', 'Alt', 'Shift', '['] },
    { label: 'Label chat', keys: ['Ctrl', 'Alt', 'Shift', 'L'] },
    { label: 'Close chat', keys: ['Escape'] },
    { label: 'New group', keys: ['Ctrl', 'Alt', 'Shift', 'N'] },
    { label: 'Profile and About', keys: ['Ctrl', 'Alt', 'P'] },
    { label: 'Increase speed of selected voice message', keys: ['Shift', '.'] },
    { label: 'Decrease speed of selected voice message', keys: ['Shift', ','] },
    { label: 'Settings', keys: ['Ctrl', 'Alt', ','] },
    { label: 'Emoji panel', keys: ['Ctrl', 'Alt', 'E'] },
    { label: 'GIF panel', keys: ['Ctrl', 'Alt', 'G'] },
    { label: 'Sticker panel', keys: ['Ctrl', 'Alt', 'S'] },
    { label: 'Extended search', keys: ['Alt', 'K'] },
    { label: 'Lock app', keys: ['Ctrl', 'Alt', 'L'] },
    { label: 'Open chat info', keys: ['Alt', 'I'] },
    { label: 'Block chat', keys: ['Ctrl', 'Shift', 'B'] },
    { label: 'Reply', keys: ['Alt', 'R'] },
    { label: 'Reply privately', keys: ['Ctrl', 'Alt', 'R'] },
    { label: 'Forward', keys: ['Ctrl', 'Alt', 'D'] },
    { label: 'Star message', keys: ['Alt', '8'] },
    { label: 'Open attachment dropdown', keys: ['Alt', 'A'] },
    { label: 'Start PTT recording', keys: ['Ctrl', 'Alt', 'Shift', 'R'] },
    { label: 'Pause PTT recording', keys: ['Alt', 'P'] },
    { label: 'Send PTT', keys: ['Ctrl', 'Enter'] },
    { label: 'Edit last message', keys: ['Cmd', 'ArrowUp'] },
  ];

  const callShortcuts = [
    { label: 'Toggle camera', keys: ['Ctrl', 'Alt', 'V'] },
    { label: 'Toggle mute', keys: ['Ctrl', 'Alt', 'M'] },
    { label: 'Reactions', keys: ['Ctrl', 'Alt', 'R'] },
    { label: 'Raise hand', keys: ['Ctrl', 'Alt', 'H'] },
    { label: 'Screen share', keys: ['Ctrl', 'Alt', 'S'] },
    { label: 'End call', keys: ['Ctrl', 'Alt', 'W'] },
  ];

  const renderKeyBadges = (keys) => (
    <div style={{ display: 'flex', gap: '4px' }}>
      {keys.map((k, idx) => (
        <span
          key={idx}
          style={{
            backgroundColor: '#2a3942',
            color: '#e9edef',
            borderRadius: '4px',
            padding: '3px 7px',
            fontSize: '11px',
            fontWeight: '600',
            border: '1px solid #3b4a54'
          }}
        >
          {k}
        </span>
      ))}
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(11, 20, 26, 0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(4px)'
    }}>
      <div 
        className="wa-modal-content"
        style={{
          width: '780px',
          maxWidth: '92vw',
          height: '580px',
          maxHeight: '85vh',
          backgroundColor: '#1f2c34',
          borderRadius: '16px',
          border: '1px solid #222d34',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          padding: '24px 28px'
        }}
      >
        {/* Header */}
        <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          Keyboard shortcuts
        </h2>

        {/* Scrollable 2-Column Grid Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            {mainShortcuts.map((sc, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#e9edef', fontSize: '13px', fontWeight: '500' }}>{sc.label}</span>
                {renderKeyBadges(sc.keys)}
              </div>
            ))}
          </div>

          <div style={{ color: '#00a884', fontSize: '16px', fontWeight: '600', marginTop: '24px', marginBottom: '16px' }}>
            Calls
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', marginBottom: '16px' }}>
            {callShortcuts.map((sc, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#e9edef', fontSize: '13px', fontWeight: '500' }}>{sc.label}</span>
                {renderKeyBadges(sc.keys)}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom OK Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#00a884',
              color: '#111b21',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
