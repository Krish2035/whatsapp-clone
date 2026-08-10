import React from 'react';

export default function CommunitiesView({ isMobile, onBack }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#111b21' }}>
      {/* Left Sidebar Communities Panel */}
      <div 
        className="wa-sidebar-container"
        style={{
          width: '360px',
          minWidth: '320px',
          borderRight: '1px solid #222d34',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#111b21'
        }}
      >
        {/* Header */}
        <div style={{
          height: '60px',
          backgroundColor: '#202c33',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid #222d34'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile && (
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}>
                ←
              </button>
            )}
            <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600' }}>Communities</h2>
          </div>
          <button style={{ background: 'none', border: 'none', color: '#aebac1', fontSize: '20px', cursor: 'pointer' }} title="New Community">
            +
          </button>
        </div>

        {/* Community Welcome Content */}
        <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '24px',
            backgroundColor: '#202c33', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '54px', border: '2px dashed #00a884'
          }}>
            👥
          </div>

          <h3 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600', lineHeight: '1.3' }}>
            Stay connected with a community
          </h3>

          <p style={{ color: '#8696a0', fontSize: '13px', lineHeight: '1.5' }}>
            Communities bring members together in topic-based groups, and make it easy to get admin announcements. Any community you're added to will appear here.
          </p>

          <a href="#" style={{ color: '#00a884', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
            See example communities
          </a>

          <button style={{
            width: '100%', padding: '12px', borderRadius: '24px',
            border: 'none', backgroundColor: '#00a884', color: '#111b21',
            fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '12px'
          }}>
            Start your community
          </button>
        </div>
      </div>

      {/* Right Area Placeholder (Matches Screenshot 3) */}
      <div 
        className="wa-chat-container hide-on-mobile"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#111b21', color: '#8696a0', gap: '16px', padding: '32px'
        }}
      >
        <div style={{ fontSize: '48px' }}>👥</div>
        <h2 style={{ color: '#e9edef', fontWeight: '400', fontSize: '28px' }}>Create communities</h2>
        <p style={{ color: '#667781', fontSize: '14px', textAlign: 'center', maxWidth: '440px' }}>
          Bring members together in topic-based groups and easily send them admin announcements.
        </p>

        <div style={{ color: '#667781', fontSize: '12px', marginTop: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔒 Your personal messages in communities are end-to-end encrypted
        </div>
      </div>
    </div>
  );
}
