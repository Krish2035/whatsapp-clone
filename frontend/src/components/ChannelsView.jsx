import React, { useState } from 'react';

export default function ChannelsView({ isMobile, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState([]); // Dynamic channel list

  const handleCreateChannel = () => {
    const name = window.prompt("Enter new channel name:");
    if (name && name.trim()) {
      const description = window.prompt("Enter channel description/topic:") || "Welcome to my channel!";
      const newChan = {
        id: Date.now(),
        name: name.trim(),
        snippet: description,
        time: 'Just now',
        unread: 0,
        avatar: '📡'
      };
      setChannels((prev) => [newChan, ...prev]);
    }
  };

  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#111b21' }}>
      {/* Left Sidebar Channels Panel */}
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
            <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600' }}>Channels</h2>
          </div>
          <button onClick={handleCreateChannel} style={{ background: 'none', border: 'none', color: '#00a884', fontSize: '22px', cursor: 'pointer' }} title="Create Channel">
            +
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '10px 12px' }}>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2a3942',
              color: '#e9edef',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        {/* Channels List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChannels.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#8696a0', fontSize: '13px', lineHeight: '1.6' }}>
              No channels followed yet.<br />Click <strong>+</strong> above to create or discover channels!
            </div>
          ) : (
            filteredChannels.map(item => (
              <div 
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(34, 45, 52, 0.4)'
                }}
              >
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  backgroundColor: '#202c33', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '22px', flexShrink: 0
                }}>
                  {item.avatar}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: '#e9edef', fontWeight: '600', fontSize: '15px' }}>{item.name}</span>
                    <span style={{ color: '#667781', fontSize: '11px' }}>{item.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ color: '#8696a0', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.snippet}
                    </span>
                    {item.unread > 0 && (
                      <span style={{
                        backgroundColor: '#00a884', color: '#111b21',
                        borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                        padding: '2px 6px', flexShrink: 0, marginLeft: '6px'
                      }}>
                        {item.unread}
                      </span>
                    )}
                  </div>
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
          backgroundColor: '#202c33', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '36px'
        }}>
          📡
        </div>
        <h2 style={{ color: '#e9edef', fontWeight: '400', fontSize: '28px' }}>Discover channels</h2>
        <p style={{ color: '#667781', fontSize: '14px', textAlign: 'center', maxWidth: '440px' }}>
          Entertainment, sports, news, lifestyle, people and more. Follow the channels that interest you.
        </p>
      </div>
    </div>
  );
}
