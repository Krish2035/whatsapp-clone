import React, { useState, useRef } from 'react';

export default function CommunitiesView({ isMobile, onBack }) {
  const [createStep, setCreateStep] = useState(0); // 0 = main, 1 = intro, 2 = form
  const [communityName, setCommunityName] = useState('');
  const [communityDesc, setCommunityDesc] = useState('');
  const [communityIcon, setCommunityIcon] = useState(null);
  const fileInputRef = useRef(null);

  const handleIconChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCommunityIcon(URL.createObjectURL(e.target.files[0]));
    }
  };

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
        {createStep === 0 ? (
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
                <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600', margin: 0 }}>Communities</h2>
              </div>
              <button onClick={() => setCreateStep(1)} style={{ background: 'none', border: 'none', color: '#aebac1', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }} title="New Community">
                <svg viewBox="0 0 24 24" height="24" width="24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
              </button>
            </div>

            {/* Community Welcome Content */}
            <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px', overflowY: 'auto' }}>
              <div style={{
                width: '160px', height: '120px', borderRadius: '24px',
                backgroundColor: '#d9fdd3', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '54px'
              }}>
                {/* Mocking the graphic from screenshot 1 */}
                <div style={{ display: 'flex', gap: '4px' }}>
                   <div style={{ backgroundColor: '#00a884', width: '30px', height: '30px', borderRadius: '50%' }}></div>
                   <div style={{ backgroundColor: '#00a884', width: '30px', height: '30px', borderRadius: '50%' }}></div>
                   <div style={{ backgroundColor: '#00a884', width: '30px', height: '30px', borderRadius: '50%' }}></div>
                </div>
              </div>

              <h3 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600', lineHeight: '1.3', marginTop: '10px' }}>
                Stay connected with a community
              </h3>

              <p style={{ color: '#8696a0', fontSize: '13px', lineHeight: '1.5' }}>
                Communities bring members together in topic-based groups, and make it easy to get admin announcements. Any community you're added to will appear here.
              </p>

              <a href="#" style={{ color: '#00a884', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
                See example communities
              </a>

              <button 
                onClick={() => setCreateStep(1)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '24px',
                  border: 'none', backgroundColor: '#00a884', color: '#111b21',
                  fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '12px'
                }}
              >
                Start your community
              </button>
            </div>
          </>
        ) : createStep === 1 ? (
          <>
            {/* Header for Step 1 */}
            <div style={{ height: '60px', backgroundColor: '#202c33', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '24px', borderBottom: '1px solid #222d34' }}>
              <button onClick={() => setCreateStep(0)} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer', display: 'flex' }}>
                <svg viewBox="0 0 24 24" height="24" width="24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
                </svg>
              </button>
              <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '500', margin: 0 }}>New community</h2>
            </div>
            
            {/* Content for Step 1 (Intro) */}
            <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', overflowY: 'auto' }}>
              {/* Graphic */}
              <div style={{ width: '130px', height: '130px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', marginTop: '40px' }}>
                👥
              </div>
              <h3 style={{ color: '#e9edef', fontSize: '22px', fontWeight: '400', marginTop: '24px' }}>Create a new community</h3>
              <p style={{ color: '#8696a0', fontSize: '14px', lineHeight: '1.5', marginTop: '12px', marginBottom: '16px' }}>
                Bring together a neighbourhood, school or more. Create topic-based groups for members, and easily send them admin announcements.
              </p>
              <a href="#" style={{ color: '#00a884', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>
                See example communities
              </a>
              
              <div style={{ marginTop: 'auto', width: '100%', paddingTop: '40px' }}>
                <button 
                  onClick={() => setCreateStep(2)}
                  style={{
                    padding: '10px 32px', borderRadius: '24px', border: 'none',
                    backgroundColor: '#00a884', color: '#111b21', fontWeight: '600',
                    fontSize: '15px', cursor: 'pointer'
                  }}
                >
                  Get started
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header for Step 2 */}
            <div style={{ height: '60px', backgroundColor: '#202c33', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '24px', borderBottom: '1px solid #222d34' }}>
              <button onClick={() => setCreateStep(1)} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer', display: 'flex' }}>
                <svg viewBox="0 0 24 24" height="24" width="24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
                </svg>
              </button>
              <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '500', margin: 0 }}>New community</h2>
            </div>
            
            {/* Content for Step 2 (Form) */}
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
              
              {/* Alert banner */}
              <div style={{ width: '100%', backgroundColor: '#182229', padding: '14px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '32px', borderLeft: '4px solid #00a884' }}>
                <svg viewBox="0 0 24 24" height="20" width="20" fill="#8696a0" style={{ flexShrink: 0, marginTop: '2px' }}>
                   <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-1.3l-.85-.6C7.8 13.06 7 11.13 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.13-.8 4.06-2.15 5.1z" />
                </svg>
                <div style={{ color: '#e9edef', fontSize: '14px', lineHeight: '1.4' }}>
                  See examples of different communities. <a href="#" style={{ color: '#00a884', textDecoration: 'none' }}>Learn more</a>
                </div>
              </div>

              {/* Avatar Picker */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '140px', height: '140px', borderRadius: '40px', backgroundColor: '#182229', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8696a0', cursor: 'pointer', marginBottom: '40px', position: 'relative' }}
              >
                  {communityIcon ? (
                    <img src={communityIcon} alt="Community Icon" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '40px' }} />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" height="42" width="42" fill="currentColor" style={{ marginBottom: '6px' }}>
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                      </svg>
                      <span style={{ fontSize: '13px', textAlign: 'center', lineHeight: '1.2' }}>Add<br/>community<br/>icon</span>
                    </>
                  )}
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#00a884', borderRadius: '50%', padding: '6px', display: 'flex', color: '#111b21', zIndex: 2 }}>
                    <svg viewBox="0 0 24 24" height="24" width="24" fill="currentColor">
                       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                    </svg>
                  </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleIconChange} accept="image/*" style={{ display: 'none' }} />
              
              {/* Name input */}
              <div style={{ width: '100%', borderBottom: '2px solid #00a884', marginBottom: '32px', paddingBottom: '6px', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="text"
                  placeholder="Community name"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '16px', flex: 1, outline: 'none' }}
                />
                <span style={{ color: '#8696a0', fontSize: '20px', marginLeft: '8px' }}>😊</span>
              </div>
              
              {/* Description input */}
              <div style={{ width: '100%', backgroundColor: '#202c33', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ color: '#8696a0', fontSize: '12px', marginBottom: '10px' }}>Community description</div>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <textarea 
                    placeholder="Hi everyone! This community is for members to chat in topic-based groups and get important announcements."
                    value={communityDesc}
                    onChange={(e) => setCommunityDesc(e.target.value)}
                    style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '14.5px', flex: 1, minHeight: '90px', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: '1.5' }}
                  />
                  <span style={{ color: '#8696a0', fontSize: '20px', marginLeft: '8px' }}>😊</span>
                </div>
              </div>

              {/* Create Button */}
              <div style={{ marginTop: 'auto', paddingTop: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={() => {
                    alert("Community created (Mock)!");
                    setCreateStep(0);
                    setCommunityName('');
                    setCommunityDesc('');
                    setCommunityIcon(null);
                  }}
                  disabled={!communityName.trim()}
                  style={{
                    width: '100%',
                    backgroundColor: communityName.trim() ? '#00a884' : '#2a3942',
                    color: communityName.trim() ? '#111b21' : '#8696a0',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: communityName.trim() ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </>
        )}
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
