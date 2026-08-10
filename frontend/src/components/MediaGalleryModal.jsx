import React, { useState } from 'react';

export default function MediaGalleryModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'docs' | 'links'
  const [mediaItems, setMediaItems] = useState([]);
  const [docItems, setDocItems] = useState([]);
  const [linkItems, setLinkItems] = useState([]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(11, 20, 26, 0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1500, backdropFilter: 'blur(4px)'
    }}>
      <div 
        className="wa-modal-content"
        style={{
          width: '840px',
          maxWidth: '92vw',
          height: '560px',
          maxHeight: '85vh',
          backgroundColor: '#111b21',
          borderRadius: '16px',
          border: '1px solid #222d34',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden'
        }}
      >
        {/* Gallery Header */}
        <div style={{
          height: '64px',
          backgroundColor: '#202c33',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #222d34'
        }}>
          <div>
            <h3 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>Media</h3>
            <span style={{ color: '#8696a0', fontSize: '12px' }}>Media from all chats</span>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '24px' }}>
            <button
              onClick={() => setActiveTab('media')}
              style={{
                background: 'none', border: 'none',
                color: activeTab === 'media' ? '#00a884' : '#8696a0',
                borderBottom: activeTab === 'media' ? '3px solid #00a884' : 'none',
                padding: '16px 4px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
              }}
            >
              Media
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              style={{
                background: 'none', border: 'none',
                color: activeTab === 'docs' ? '#00a884' : '#8696a0',
                borderBottom: activeTab === 'docs' ? '3px solid #00a884' : 'none',
                padding: '16px 4px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
              }}
            >
              Docs
            </button>
            <button
              onClick={() => setActiveTab('links')}
              style={{
                background: 'none', border: 'none',
                color: activeTab === 'links' ? '#00a884' : '#8696a0',
                borderBottom: activeTab === 'links' ? '3px solid #00a884' : 'none',
                padding: '16px 4px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
              }}
            >
              Links
            </button>
          </div>

          {/* Actions & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#aebac1' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aebac1', fontSize: '20px', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Gallery Content Area */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {activeTab === 'media' && (
            mediaItems.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#8696a0', fontSize: '14px' }}>
                🖼️ No media found across chats.
              </div>
            ) : (
              <div>
                <div style={{ color: '#8696a0', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Today</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {mediaItems.map(item => (
                    <div key={item.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', height: '180px', backgroundColor: '#202c33' }}>
                      <img src={item.url} alt="Media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: '6px', left: '8px', color: 'white', fontSize: '12px', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                        {item.sender}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {activeTab === 'docs' && (
            docItems.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#8696a0', fontSize: '14px' }}>
                📄 No documents found across chats.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {docItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', backgroundColor: '#202c33', borderRadius: '8px' }}>
                    <span style={{ fontSize: '24px' }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e9edef', fontSize: '14px', fontWeight: '500' }}>{item.name}</div>
                      <div style={{ color: '#8696a0', fontSize: '12px' }}>{item.size} • {item.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'links' && (
            linkItems.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#8696a0', fontSize: '14px' }}>
                🔗 No links found across chats.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {linkItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', backgroundColor: '#202c33', borderRadius: '8px' }}>
                    <span style={{ fontSize: '24px' }}>🔗</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#00a884', fontSize: '14px', fontWeight: '500' }}>{item.title || item.name}</div>
                      <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#8696a0', fontSize: '12px', textDecoration: 'none' }}>{item.url}</a>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
