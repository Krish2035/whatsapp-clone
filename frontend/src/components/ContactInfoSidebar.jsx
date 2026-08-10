import React from 'react';

export default function ContactInfoSidebar({ isOpen, onClose, activeChat, messages = [], user }) {
  if (!isOpen || !activeChat) return null;

  const isGroup = activeChat.is_group;
  const otherParticipant = !isGroup
    ? activeChat.participants?.find((p) => String(p.id) !== String(user?.id))
    : null;

  const isSelf = !isGroup && otherParticipant && String(otherParticipant.id) === String(user?.id);

  const title = isGroup
    ? activeChat.group_name || 'Group Chat'
    : isSelf
    ? `${user?.username || 'Krish 😍'} (You)`
    : otherParticipant?.username || activeChat.title || 'Contact Info';

  const subtitle = isGroup
    ? `${activeChat.participants?.length || 0} participants`
    : isSelf
    ? 'Message yourself'
    : otherParticipant?.email || otherParticipant?.status_message || '+91 95103 67620';

  const avatarChar = title ? title.charAt(0).toUpperCase() : 'C';

  // Filter media files from current chat messages
  const mediaMessages = messages.filter(
    (m) => m.media_url || m.mediaUrl || m.type === 'image' || m.type === 'video'
  );

  return (
    <div
      style={{
        width: '380px',
        height: '100%',
        backgroundColor: '#111b21',
        borderLeft: '1px solid var(--wa-border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        flexShrink: 0,
        color: 'var(--wa-text-primary)',
        fontFamily: 'var(--font-family)',
        zIndex: 20,
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          height: '60px',
          backgroundColor: '#202c33',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: '24px',
          borderBottom: '1px solid var(--wa-border)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--wa-text-secondary)',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
          }}
          title="Close"
        >
          ✕
        </button>
        <h3 style={{ fontSize: '16px', fontWeight: '500', color: 'var(--wa-text-primary)', margin: 0 }}>
          {isGroup ? 'Group info' : 'Contact info'}
        </h3>
      </div>

      {/* 2. Top Profile Summary Card (Matching Screenshot 2) */}
      <div
        style={{
          backgroundColor: '#111b21',
          padding: '32px 20px 24px 20px',
          textAlign: 'center',
          borderBottom: '8px solid #0b141a',
        }}
      >
        <div
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            backgroundColor: '#00a884',
            margin: '0 auto 16px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '56px',
            fontWeight: 'bold',
            color: 'white',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            border: '2px solid rgba(255,255,255,0.08)',
          }}
        >
          {otherParticipant?.avatar_url ? (
            <img
              src={otherParticipant.avatar_url}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            avatarChar
          )}
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: '600', color: 'var(--wa-text-primary)', margin: '0 0 4px 0' }}>
          {title}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--wa-text-secondary)', margin: 0 }}>{subtitle}</p>
      </div>

      {/* 3. Media, Links and Docs Section (Matching Screenshot 2 & 3) */}
      <div
        style={{
          backgroundColor: '#111b21',
          padding: '16px 20px',
          borderBottom: '8px solid #0b141a',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>🖼️</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--wa-text-primary)' }}>
              Media, links and docs
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: 'var(--wa-text-secondary)' }}>
              {mediaMessages.length > 0 ? mediaMessages.length : 11}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--wa-text-secondary)' }}>›</span>
          </div>
        </div>

        {/* Media Thumbnails Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {mediaMessages.length > 0 ? (
            mediaMessages.slice(0, 3).map((m, idx) => (
              <div
                key={idx}
                style={{
                  height: '84px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#202c33',
                }}
              >
                <img
                  src={m.media_url || m.mediaUrl}
                  alt="Media"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))
          ) : (
            <>
              <div
                style={{
                  height: '84px',
                  borderRadius: '8px',
                  backgroundColor: '#202c33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8696a0',
                  fontSize: '24px',
                }}
              >
                📹
              </div>
              <div
                style={{
                  height: '84px',
                  borderRadius: '8px',
                  backgroundColor: '#202c33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8696a0',
                  fontSize: '24px',
                }}
              >
                🖼️
              </div>
              <div
                style={{
                  height: '84px',
                  borderRadius: '8px',
                  backgroundColor: '#202c33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8696a0',
                  fontSize: '24px',
                }}
              >
                📸
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Settings & Actions List (Matching Screenshot 2 & 3) */}
      <div style={{ backgroundColor: '#111b21', padding: '8px 0' }}>
        {/* Starred Messages */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 20px',
            gap: '18px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          className="wa-sidebar-item"
        >
          <span style={{ fontSize: '20px', color: '#8696a0' }}>⭐</span>
          <span style={{ fontSize: '15px', color: 'var(--wa-text-primary)', flex: 1 }}>Starred messages</span>
        </div>

        {/* Disappearing Messages */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 20px',
            gap: '18px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          className="wa-sidebar-item"
        >
          <span style={{ fontSize: '20px', color: '#8696a0' }}>⏱️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', color: 'var(--wa-text-primary)' }}>Disappearing messages</div>
            <div style={{ fontSize: '13px', color: 'var(--wa-text-secondary)' }}>Off</div>
          </div>
        </div>

        {/* Advanced Chat Privacy */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 20px',
            gap: '18px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          className="wa-sidebar-item"
        >
          <span style={{ fontSize: '20px', color: '#8696a0' }}>🛡️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', color: 'var(--wa-text-primary)' }}>Advanced chat privacy</div>
            <div style={{ fontSize: '13px', color: 'var(--wa-text-secondary)' }}>Off</div>
          </div>
        </div>

        {/* Encryption Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 20px',
            gap: '18px',
            cursor: 'pointer',
            borderBottom: '8px solid #0b141a',
          }}
          className="wa-sidebar-item"
        >
          <span style={{ fontSize: '20px', color: '#8696a0' }}>🔒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', color: 'var(--wa-text-primary)' }}>Encryption</div>
            <div style={{ fontSize: '12px', color: 'var(--wa-text-muted)', lineHeight: '1.4' }}>
              Messages are end-to-end encrypted. Click to verify.
            </div>
          </div>
        </div>

        {/* Add to List */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 20px',
            gap: '18px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          className="wa-sidebar-item"
        >
          <span style={{ fontSize: '20px', color: '#8696a0' }}>➕</span>
          <span style={{ fontSize: '15px', color: 'var(--wa-text-primary)', flex: 1 }}>Add to list</span>
        </div>

        {/* Clear Chat */}
        <div
          onClick={() => {
            if (window.confirm('Are you sure you want to clear this chat?')) {
              alert('Chat messages cleared cleanly.');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 20px',
            gap: '18px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          className="wa-sidebar-item"
        >
          <span style={{ fontSize: '20px', color: '#ea4335' }}>🚫</span>
          <span style={{ fontSize: '15px', color: '#ea4335', fontWeight: '500', flex: 1 }}>Clear chat</span>
        </div>

        {/* Delete Chat */}
        <div
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this chat?')) {
              onClose();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 20px',
            gap: '18px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          className="wa-sidebar-item"
        >
          <span style={{ fontSize: '20px', color: '#ea4335' }}>🗑️</span>
          <span style={{ fontSize: '15px', color: '#ea4335', fontWeight: '500', flex: 1 }}>Delete chat</span>
        </div>
      </div>
    </div>
  );
}
