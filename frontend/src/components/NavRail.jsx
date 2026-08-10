import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function NavRail({ activeTab, onTabChange, unreadCount = 0, onOpenProfile, onOpenMediaGallery, isChatActive }) {
  const { user, logout } = useAuth();

  return (
    <div 
      className={`wa-nav-rail ${isChatActive ? 'hide-on-mobile' : ''}`}
      style={{
        width: '64px',
        height: '100%',
        backgroundColor: '#202c33',
        borderRight: '1px solid #222d34',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        flexShrink: 0,
        zIndex: 20
      }}
    >
      {/* Top Navigation Icons */}
      <div className="wa-nav-rail-top" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', width: '100%' }}>
        {/* Chats Tab Button */}
        <button
          onClick={() => onTabChange('chats')}
          style={{
            position: 'relative',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: activeTab === 'chats' ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
            color: activeTab === 'chats' ? '#00a884' : '#8696a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Chats"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5.025L2 22l5.093-1.336A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.478 0-2.882-.397-4.096-1.091l-.294-.17-3.036.796.81-2.96-.187-.298A7.953 7.953 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '4px', right: '4px',
              backgroundColor: '#25d366', color: '#111b21',
              borderRadius: '50%', fontSize: '10px', fontWeight: 'bold',
              width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        {/* Calls Tab Button */}
        <button
          onClick={() => onTabChange('calls')}
          style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            backgroundColor: activeTab === 'calls' ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
            color: activeTab === 'calls' ? '#00a884' : '#8696a0',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Calls"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
        </button>

        {/* Status Tab Button */}
        <button
          onClick={() => onTabChange('status')}
          style={{
            position: 'relative', width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            backgroundColor: activeTab === 'status' ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
            color: activeTab === 'status' ? '#00a884' : '#8696a0',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}
          title="Status"
        >
          ⭕
          <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#25d366' }} />
        </button>

        {/* Channels Tab Button */}
        <button
          onClick={() => onTabChange('channels')}
          style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            backgroundColor: activeTab === 'channels' ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
            color: activeTab === 'channels' ? '#00a884' : '#8696a0',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}
          title="Channels"
        >
          📡
        </button>

        {/* Communities Tab Button */}
        <button
          onClick={() => onTabChange('communities')}
          style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            backgroundColor: activeTab === 'communities' ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
            color: activeTab === 'communities' ? '#00a884' : '#8696a0',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}
          title="Communities"
        >
          👥
        </button>

        {/* Meta AI Tab Button */}
        <button
          onClick={() => onTabChange('meta_ai')}
          style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            backgroundColor: activeTab === 'meta_ai' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
            color: activeTab === 'meta_ai' ? '#c084fc' : '#a855f7',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}
          title="Meta AI Assistant"
        >
          ✨
        </button>

        {/* Profile Button (Mobile Nav) */}
        <button
          onClick={() => onTabChange('settings')}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: activeTab === 'settings' ? '2px solid #00a884' : 'none',
            backgroundColor: '#00a884', color: 'white', fontWeight: 'bold',
            cursor: 'pointer', overflow: 'hidden', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '14px'
          }}
          className="show-on-mobile"
          title="Settings & Profile"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user?.username?.[0]?.toUpperCase() || 'U'
          )}
        </button>
      </div>

      {/* Bottom Icons (Desktop) */}
      <div className="wa-nav-rail-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', width: '100%' }}>
        {/* Media Gallery Button */}
        <button
          onClick={onOpenMediaGallery}
          style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            backgroundColor: 'transparent', color: '#8696a0',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}
          title="Media Gallery (All Chats)"
        >
          🖼️
        </button>

        {/* Profile Button (Desktop) */}
        <button
          onClick={() => onTabChange('settings')}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: activeTab === 'settings' ? '2px solid #00a884' : 'none',
            backgroundColor: '#00a884', color: 'white', fontWeight: 'bold',
            cursor: 'pointer', overflow: 'hidden', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '14px'
          }}
          title="Settings & Profile"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user?.username?.[0]?.toUpperCase() || 'U'
          )}
        </button>
      </div>
    </div>
  );
}
