import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function StatusView({ isMobile, onBack }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState([]); // Dynamic status updates
  const [myStatus, setMyStatus] = useState(null);

  const handleAddStatus = () => {
    const text = window.prompt("Enter your status update text:");
    if (text && text.trim()) {
      setMyStatus({
        text: text.trim(),
        time: 'Just now'
      });
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#111b21' }}>
      {/* Left Sidebar Status Panel */}
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
            <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600' }}>Status</h2>
          </div>
          <div style={{ display: 'flex', gap: '16px', color: '#aebac1', fontSize: '18px', cursor: 'pointer' }}>
            <span onClick={handleAddStatus} title="Add Status">+</span>
            <span title="Menu">⋮</span>
          </div>
        </div>

        {/* Status List Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* My Status */}
          <div onClick={handleAddStatus} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', cursor: 'pointer' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '50%',
                backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: 'bold', overflow: 'hidden'
              }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.username?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div style={{
                position: 'absolute', bottom: '0', right: '0',
                backgroundColor: '#00a884', color: 'white', borderRadius: '50%',
                width: '18px', height: '18px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '12px', border: '2px solid #111b21'
              }}>
                +
              </div>
            </div>
            <div>
              <div style={{ color: '#e9edef', fontWeight: '600', fontSize: '15px' }}>My status</div>
              <div style={{ color: '#8696a0', fontSize: '13px', marginTop: '2px' }}>
                {myStatus ? `${myStatus.text} • ${myStatus.time}` : 'Click to add status update'}
              </div>
            </div>
          </div>

          <div style={{ color: '#00a884', fontSize: '13px', fontWeight: '600', padding: '16px 16px 8px 16px' }}>
            Recent
          </div>

          {/* Contact Status Updates */}
          {statuses.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#8696a0', fontSize: '13px', lineHeight: '1.6' }}>
              No recent status updates.<br />Share a status update to get started!
            </div>
          ) : (
            statuses.map(item => (
              <div 
                key={item.id} 
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.4)'
                }}
              >
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  border: '2px solid #00a884', padding: '2px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'white', fontWeight: 'bold'
                  }}>
                    {item.avatar}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>{item.name}</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>{item.time}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Area Placeholder */}
      <div 
        className="wa-chat-container hide-on-mobile"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#111b21', color: '#8696a0', gap: '16px', padding: '32px'
        }}
      >
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          border: '3px solid #202c33', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '36px'
        }}>
          ⭕
        </div>
        <h2 style={{ color: '#e9edef', fontWeight: '400', fontSize: '28px' }}>Share statuses</h2>
        <p style={{ color: '#667781', fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>
          Share photos, videos and text that disappear after 24 hours.
        </p>
      </div>
    </div>
  );
}
