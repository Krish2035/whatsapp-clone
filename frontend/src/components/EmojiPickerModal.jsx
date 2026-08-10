import React from 'react';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '💯'];

export default function EmojiPickerModal({ position, onSelectEmoji, onClose }) {
  if (!position) return null;

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        backgroundColor: 'var(--wa-bg-panel)',
        borderRadius: '24px',
        padding: '6px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        border: '1px solid var(--wa-border)',
        display: 'flex',
        gap: '8px',
        zIndex: 100
      }}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelectEmoji(emoji);
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '50%',
            transition: 'transform 0.15s'
          }}
          onMouseEnter={(e) => (e.target.style.transform = 'scale(1.3)')}
          onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
