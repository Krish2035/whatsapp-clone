import React, { useState, useRef } from 'react';

export default function ChannelsView({ isMobile, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [channels, setChannels] = useState([
    {
      id: 'whatsapp-official',
      name: 'WhatsApp',
      snippet: 'Welcome to the official WhatsApp channel! Here you will find the latest updates and tips.',
      time: '8:00 am',
      unread: 1,
      avatar: '✅',
      color: '#25D366'
    }
  ]);
  const [activeChannel, setActiveChannel] = useState(null);

  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelIcon, setNewChannelIcon] = useState(null);
  const fileInputRef = useRef(null);

  const handleIconChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewChannelIcon(URL.createObjectURL(e.target.files[0]));
    }
  };

  const submitCreateChannel = () => {
    if (newChannelName && newChannelName.trim()) {
      const newChan = {
        id: Date.now(),
        name: newChannelName.trim(),
        snippet: newChannelDesc.trim() || "Welcome to my channel!",
        time: 'Just now',
        unread: 0,
        avatar: '📡',
        color: '#00a884'
      };
      setChannels((prev) => [newChan, ...prev]);
      setIsCreatingChannel(false);
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelIcon(null);
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
        {isCreatingChannel ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#111b21' }}>
            {/* Header */}
            <div style={{ height: '60px', backgroundColor: '#202c33', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '24px' }}>
              <button onClick={() => setIsCreatingChannel(false)} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer', display: 'flex' }}>
                <svg viewBox="0 0 24 24" height="24" width="24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
                </svg>
              </button>
              <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '500', margin: 0 }}>New channel</h2>
            </div>
            
            <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
               {/* Icon picker placeholder */}
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 style={{ width: '130px', height: '130px', borderRadius: '50%', backgroundColor: '#182229', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8696a0', cursor: 'pointer', marginBottom: '32px', position: 'relative' }}
               >
                 {newChannelIcon ? (
                   <img src={newChannelIcon} alt="Channel Icon" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                 ) : (
                   <>
                    <svg viewBox="0 0 24 24" height="32" width="32" fill="currentColor" style={{ marginBottom: '4px' }}>
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                    <span style={{ fontSize: '13px', textAlign: 'center', lineHeight: '1.2' }}>Add channel<br/>icon</span>
                   </>
                 )}
               </div>
               <input type="file" ref={fileInputRef} onChange={handleIconChange} accept="image/*" style={{ display: 'none' }} />
               
               {/* Name input */}
               <div style={{ width: '100%', borderBottom: '2px solid #00a884', marginBottom: '32px', paddingBottom: '4px', display: 'flex', alignItems: 'center' }}>
                 <input 
                   type="text"
                   placeholder="Channel name"
                   value={newChannelName}
                   onChange={(e) => setNewChannelName(e.target.value)}
                   style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '15px', flex: 1, outline: 'none' }}
                 />
                 <span style={{ color: '#8696a0', fontSize: '20px', marginLeft: '8px' }}>😊</span>
               </div>
               
               {/* Description input */}
               <div style={{ width: '100%', backgroundColor: '#202c33', borderRadius: '8px', padding: '12px 16px' }}>
                 <div style={{ color: '#8696a0', fontSize: '12px', marginBottom: '8px' }}>Channel description</div>
                 <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                   <textarea 
                     placeholder="Describe your channel. Include information to help people understand what your channel is about."
                     value={newChannelDesc}
                     onChange={(e) => setNewChannelDesc(e.target.value)}
                     style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '14px', flex: 1, minHeight: '80px', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: '1.5' }}
                   />
                   <span style={{ color: '#8696a0', fontSize: '20px', marginLeft: '8px' }}>😊</span>
                 </div>
               </div>
            </div>
            
            {/* Create Button */}
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
               <button 
                 onClick={submitCreateChannel}
                 disabled={!newChannelName.trim()}
                 style={{
                   backgroundColor: newChannelName.trim() ? '#00a884' : '#2a3942',
                   color: newChannelName.trim() ? '#111b21' : '#8696a0',
                   border: 'none',
                   borderRadius: '24px',
                   padding: '12px 24px',
                   fontSize: '15px',
                   fontWeight: '500',
                   cursor: newChannelName.trim() ? 'pointer' : 'default',
                   transition: 'all 0.2s'
                 }}
               >
                 Create channel
               </button>
            </div>
          </div>
        ) : (
          <>
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
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
              style={{ background: 'none', border: 'none', color: '#aebac1', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} 
              title="Add"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-18C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 5h-2v4H7v2h4v4h2v-4h4v-2h-4V7z"></path>
              </svg>
            </button>
            
            {isDropdownOpen && (
              <>
                {/* Invisible overlay to close dropdown when clicking outside */}
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                  onClick={() => setIsDropdownOpen(false)}
                ></div>
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '10px',
                  backgroundColor: '#233138',
                  borderRadius: '3px',
                  padding: '9px 0',
                  minWidth: '200px',
                  boxShadow: '0 2px 5px 0 rgba(11,20,26,.26),0 2px 10px 0 rgba(11,20,26,.16)',
                  zIndex: 100
                }}>
                  <div 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsCreatingChannel(true);
                      setNewChannelName('');
                      setNewChannelDesc('');
                      setNewChannelIcon(null);
                    }}
                    style={{
                      padding: '10px 24px',
                      color: '#d1d7db',
                      fontSize: '14.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#182229'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg viewBox="0 0 24 24" height="20" width="20" fill="currentColor">
                      <path d="M12 3a9 9 0 0 0-9 9c0 2.37.91 4.54 2.4 6.16l-1.35 4.05 4.19-1.1A8.96 8.96 0 0 0 12 21a9 9 0 0 0 9-9 9 9 0 0 0-9-9zm4 10h-3v3h-2v-3H8v-2h3V8h2v3h3v2z" />
                    </svg>
                    Create channel
                  </div>
                  <div 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      alert("Find channels functionality coming soon!");
                    }}
                    style={{
                      padding: '10px 24px',
                      color: '#d1d7db',
                      fontSize: '14.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#182229'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg viewBox="0 0 24 24" height="20" width="20" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    Find channels
                  </div>
                </div>
              </>
            )}
          </div>
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
                onClick={() => setActiveChannel(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(34, 45, 52, 0.4)',
                  backgroundColor: activeChannel?.id === item.id ? '#2a3942' : 'transparent'
                }}
              >
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  backgroundColor: item.color || '#202c33', display: 'flex', alignItems: 'center',
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
        </>
        )}
      </div>

      {/* Right Area Placeholder or Active Channel */}
      {activeChannel ? (
        <div 
          className="wa-chat-container hide-on-mobile"
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            backgroundColor: '#0b141a', height: '100%'
          }}
        >
          {/* Header */}
          <div style={{
            height: '60px',
            backgroundColor: '#202c33',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid #222d34'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: activeChannel.color || '#202c33', display: 'flex',
              alignItems: 'center', justifyContent: 'center', marginRight: '16px', fontSize: '20px'
            }}>
              {activeChannel.avatar}
            </div>
            <div style={{ color: '#e9edef', fontWeight: '600', fontSize: '16px' }}>{activeChannel.name}</div>
          </div>
          {/* Messages Area */}
          <div style={{
            flex: 1, padding: '20px', overflowY: 'auto',
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0)',
            backgroundSize: '24px 24px',
            backgroundColor: '#0b141a'
          }}>
            <div style={{
              backgroundColor: '#202c33',
              color: '#e9edef',
              padding: '10px 14px',
              borderRadius: '8px',
              borderTopLeftRadius: '0',
              maxWidth: '65%',
              marginBottom: '10px',
              boxShadow: '0 1px 0.5px rgba(11,20,26,.13)'
            }}>
              {activeChannel.snippet}
              <div style={{
                textAlign: 'right',
                fontSize: '11px',
                color: '#8696a0',
                marginTop: '4px'
              }}>{activeChannel.time}</div>
            </div>
          </div>
          {/* Channel Footer (Read-only) */}
          <div style={{
            height: '62px',
            backgroundColor: '#202c33',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8696a0',
            fontSize: '14px',
            borderTop: '1px solid #222d34'
          }}>
            This channel is read-only.
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
