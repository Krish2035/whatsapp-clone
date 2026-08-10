import React, { useState } from 'react';
import { useCall } from '../context/useCall';

export default function CallsView({ isMobile, onBack }) {
  const { callLogs, initiateCall } = useCall();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCallPrompt, setShowCallPrompt] = useState(false);
  const [targetUser, setTargetUser] = useState('');

  const filteredLogs = callLogs.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleStartDirectCall = (isVideo = true) => {
    if (!targetUser.trim()) {
      alert('Please enter a username or contact name to call.');
      return;
    }
    initiateCall({ id: targetUser.toLowerCase().trim(), username: targetUser.trim() }, isVideo);
    setShowCallPrompt(false);
    setTargetUser('');
  };

  const handleReCall = (log) => {
    initiateCall({ id: log.name.toLowerCase(), username: log.name }, log.isVideo);
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#111b21' }}>
      {/* Left Calls List Sidebar */}
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
        {/* Calls Header */}
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
              <button
                onClick={onBack}
                style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}
              >
                ←
              </button>
            )}
            <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600' }}>Calls</h2>
          </div>
          <button 
            onClick={() => setShowCallPrompt(true)}
            style={{ background: 'none', border: 'none', color: '#00a884', fontSize: '20px', cursor: 'pointer' }} 
            title="New call"
          >
            📞+
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '10px 12px' }}>
          <input
            type="text"
            placeholder="Search name or number"
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

        {/* Call Logs Container */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Favourites Section */}
          <div style={{ padding: '12px 16px' }}>
            <div style={{ color: '#8696a0', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Favourites
            </div>
            <div 
              onClick={() => setShowCallPrompt(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '6px 0' }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: 'bold'
              }}>
                +
              </div>
              <div style={{ color: '#e9edef', fontSize: '14px', fontWeight: '500' }}>
                Add favourite / New Call
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#222d34', margin: '4px 0' }} />

          {/* Recent Section */}
          <div style={{ padding: '8px 16px' }}>
            <div style={{ color: '#8696a0', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Recent
            </div>

            {filteredLogs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#8696a0', fontSize: '13px', lineHeight: '1.6' }}>
                No recent call history.<br />Start a voice or video call from any chat!
              </div>
            ) : (
              filteredLogs.map(log => (
                <div 
                  key={log.id}
                  onClick={() => handleReCall(log)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(34, 45, 52, 0.5)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white', fontWeight: 'bold'
                    }}>
                      {log.avatar || log.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ color: log.type === 'missed' ? '#f87171' : '#e9edef', fontWeight: '500', fontSize: '15px' }}>
                        {log.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#8696a0', marginTop: '2px' }}>
                        {log.type === 'missed' ? (
                          <span style={{ color: '#f87171' }}>↙ Missed</span>
                        ) : log.type === 'outgoing' ? (
                          <span style={{ color: '#22c55e' }}>↗ Outgoing</span>
                        ) : (
                          <span style={{ color: '#22c55e' }}>↙ Incoming</span>
                        )}
                        <span>• {log.time}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ color: '#00a884', fontSize: '18px', padding: '6px' }} title="Call back">
                    {log.isVideo ? '📹' : '📞'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Action Placeholder */}
      <div 
        className="wa-chat-container hide-on-mobile"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111b21',
          gap: '32px',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div 
            onClick={() => setShowCallPrompt(true)}
            style={{
              width: '130px', height: '130px', backgroundColor: '#202c33',
              borderRadius: '16px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '10px',
              color: '#8696a0', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <span style={{ fontSize: '32px' }}>📹</span>
            <span style={{ fontSize: '14px', color: '#e9edef', fontWeight: '500' }}>Start call</span>
          </div>

          <div 
            onClick={() => {
              const callUrl = `${window.location.origin}/#call-${Date.now()}`;
              navigator.clipboard.writeText(callUrl);
              alert(`Call link copied to clipboard!\n${callUrl}`);
            }}
            style={{
              width: '130px', height: '130px', backgroundColor: '#202c33',
              borderRadius: '16px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '10px',
              color: '#8696a0', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <span style={{ fontSize: '32px' }}>🔗</span>
            <span style={{ fontSize: '14px', color: '#e9edef', fontWeight: '500' }}>New call link</span>
          </div>

          <div 
            onClick={() => setShowCallPrompt(true)}
            style={{
              width: '130px', height: '130px', backgroundColor: '#202c33',
              borderRadius: '16px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '10px',
              color: '#8696a0', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <span style={{ fontSize: '32px' }}>🔢</span>
            <span style={{ fontSize: '14px', color: '#e9edef', fontWeight: '500' }}>Call a number</span>
          </div>
        </div>

        <div style={{ color: '#667781', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔒 Your personal calls are end-to-end encrypted with Agora RTC
        </div>
      </div>

      {/* Start Call Quick Modal */}
      {showCallPrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 3000
        }}>
          <div style={{
            width: '380px', backgroundColor: '#222d34', borderRadius: '12px',
            padding: '24px', color: '#e9edef', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600' }}>Start Agora Call</h3>
            <p style={{ color: '#8696a0', fontSize: '13px', marginBottom: '16px' }}>
              Enter contact name or user ID to initiate a call:
            </p>
            <input
              type="text"
              placeholder="Username or contact name"
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: 'none', backgroundColor: '#111b21', color: '#e9edef',
                marginBottom: '20px', outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCallPrompt(false)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: 'transparent', color: '#8696a0', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleStartDirectCall(false)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#202c33', color: '#00a884', cursor: 'pointer', fontWeight: '600'
                }}
              >
                📞 Voice
              </button>
              <button
                onClick={() => handleStartDirectCall(true)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#00a884', color: 'white', cursor: 'pointer', fontWeight: '600'
                }}
              >
                📹 Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
