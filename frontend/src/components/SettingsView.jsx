import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, parseStatusMessage } from '../services/api';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

export default function SettingsView({ isMobile, onBack, onOpenMetaAi }) {
  const { user, logout, updateUser } = useAuth();
  const [subView, setSubView] = useState('main'); // 'main' | 'profile_edit' | 'account' | 'privacy' | 'chats_settings' | 'notifications' | 'help_feedback'
  const [searchQuery, setSearchQuery] = useState('');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Inline editing states for Edit Profile
  const [editingField, setEditingField] = useState(null); // 'name' | 'about' | null
  const [username, setUsername] = useState(user?.username || '');
  const [statusMsg, setStatusMsg] = useState(user?.status_message || 'Share a thought');
  const [phone] = useState(user?.phone || '+91 95103 67620');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Privacy Settings Toggles
  const [readReceipts, setReadReceipts] = useState(true);
  const [blockUnknown, setBlockUnknown] = useState(false);
  const [protectIp, setProtectIp] = useState(false);
  const [turnOffLinkPreviews, setTurnOffLinkPreviews] = useState(false);

  // Chats Settings Toggles
  const [spellCheck, setSpellCheck] = useState(true);
  const [replaceEmoji, setReplaceEmoji] = useState(true);
  const [enterIsSend, setEnterIsSend] = useState(true);

  // Notifications Toggles
  const [showPreviews, setShowPreviews] = useState(true);
  const [playSound, setPlaySound] = useState(false);
  const [bgSync, setBgSync] = useState(false);

  // Help & Feedback State
  const [joinBeta, setJoinBeta] = useState(false);

  const handleSaveField = async (field, val) => {
    setSaving(true);
    try {
      const payload = field === 'name' ? { username: val } : { status_message: val };
      const updated = await updateProfile(payload);
      updateUser(updated);
      setEditingField(null);
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const settingsItems = [
    { id: 'profile', icon: '👤', title: 'Profile', subtitle: 'Name, profile picture, username', action: () => setSubView('profile_edit') },
    { id: 'account', icon: '🔑', title: 'Account', subtitle: 'Security notifications, account info', action: () => setSubView('account') },
    { id: 'privacy', icon: '🔒', title: 'Privacy', subtitle: 'Blocked contacts, disappearing messages', action: () => setSubView('privacy') },
    { id: 'chats', icon: '💬', title: 'Chats', subtitle: 'Theme, wallpaper, chat settings', action: () => setSubView('chats_settings') },
    { id: 'notifications', icon: '🔔', title: 'Notifications', subtitle: 'Messages, groups, sounds', action: () => setSubView('notifications') },
    { id: 'shortcuts', icon: '⌨️', title: 'Keyboard shortcuts', subtitle: 'Quick actions', action: () => setIsShortcutsOpen(true) },
    { id: 'help', icon: '❓', title: 'Help and feedback', subtitle: 'Help centre, contact us, privacy policy', action: () => setSubView('help_feedback') },
  ];

  const filteredItems = settingsItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderToggle = (checked, onChange) => (
    <div
      onClick={onChange}
      style={{
        width: '38px', height: '20px', borderRadius: '12px',
        backgroundColor: checked ? '#00a884' : '#2a3942',
        display: 'flex', alignItems: 'center',
        padding: '2px', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0
      }}
    >
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%',
        backgroundColor: checked ? '#111b21' : '#8696a0',
        transform: checked ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 0.2s'
      }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#111b21' }}>
      {/* Left Sidebar Settings Panel */}
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
        {/* ---------------- EDIT PROFILE SUBVIEW ---------------- */}
        {subView === 'profile_edit' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              height: '60px', backgroundColor: '#202c33',
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '0 16px', borderBottom: '1px solid #222d34'
            }}>
              <button onClick={() => setSubView('main')} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}>
                ←
              </button>
              <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>Edit profile</h2>
            </div>

            <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: '150px', height: '150px', borderRadius: '50%',
                  backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white', fontSize: '56px',
                  fontWeight: 'bold', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                }}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user?.username?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
              </div>

              <div>
                <div style={{ color: '#8696a0', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>About</div>
                {editingField === 'about' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={statusMsg}
                      onChange={(e) => setStatusMsg(e.target.value)}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: '6px',
                        border: 'none', backgroundColor: '#2a3942', color: '#e9edef', fontSize: '14px'
                      }}
                    />
                    <button onClick={() => handleSaveField('about', statusMsg)} style={{ backgroundColor: '#00a884', border: 'none', color: '#111b21', borderRadius: '6px', padding: '0 12px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {saving ? '...' : '✓'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>
                      <span>😃</span>
                      <span>{statusMsg}</span>
                    </div>
                    <button onClick={() => setEditingField('about')} style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '16px', cursor: 'pointer' }}>
                      ✏️
                    </button>
                  </div>
                )}
                <div style={{ color: '#667781', fontSize: '12px', marginTop: '6px' }}>Until I change it</div>
              </div>

              <div>
                <div style={{ color: '#8696a0', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Name</div>
                {editingField === 'name' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: '6px',
                        border: 'none', backgroundColor: '#2a3942', color: '#e9edef', fontSize: '14px'
                      }}
                    />
                    <button onClick={() => handleSaveField('name', username)} style={{ backgroundColor: '#00a884', border: 'none', color: '#111b21', borderRadius: '6px', padding: '0 12px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {saving ? '...' : '✓'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>{username}</span>
                    <button onClick={() => setEditingField('name')} style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '16px', cursor: 'pointer' }}>
                      ✏️
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div style={{ color: '#8696a0', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Phone</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>
                    <span>📞</span>
                    <span>{phone}</span>
                  </div>
                  <button onClick={handleCopyPhone} style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '16px', cursor: 'pointer' }}>
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : subView === 'account' ? (
          /* ---------------- ACCOUNT SUBVIEW ---------------- */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              height: '60px', backgroundColor: '#202c33',
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '0 16px', borderBottom: '1px solid #222d34'
            }}>
              <button onClick={() => setSubView('main')} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}>
                ←
              </button>
              <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>Account</h2>
            </div>

            <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)' }}>
                <span style={{ fontSize: '20px', color: '#8696a0' }}>🛡️</span>
                <span style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>Security notifications</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)' }}>
                <span style={{ fontSize: '20px', color: '#8696a0' }}>📄</span>
                <span style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>Request account info</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', cursor: 'pointer' }}>
                <span style={{ fontSize: '20px', color: '#8696a0' }}>ℹ️</span>
                <span style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>How to delete my account</span>
              </div>
            </div>
          </div>
        ) : subView === 'privacy' ? (
          /* ---------------- PRIVACY SUBVIEW ---------------- */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              height: '60px', backgroundColor: '#202c33',
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '0 16px', borderBottom: '1px solid #222d34'
            }}>
              <button onClick={() => setSubView('main')} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}>
                ←
              </button>
              <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>Privacy</h2>
            </div>

            <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
              <div style={{ padding: '8px 20px', color: '#00a884', fontSize: '13px', fontWeight: '600' }}>
                Who can see my personal info
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Last seen and online</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Nobody</div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Profile picture</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Everyone</div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>About</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Nobody</div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Status</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>My contacts</div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ paddingRight: '12px' }}>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Read receipts</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '4px', lineHeight: '1.4' }}>
                    If turned off, you won't send or receive read receipts. Read receipts are always sent for group chats.
                  </div>
                </div>
                {renderToggle(readReceipts, () => setReadReceipts(!readReceipts))}
              </div>

              <div style={{ padding: '16px 20px 8px 20px', color: '#00a884', fontSize: '13px', fontWeight: '600' }}>
                Disappearing messages
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Default message timer</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Off</div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Groups</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Everyone</div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Blocked contacts</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>7</div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>App lock</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Require password to unlock WhatsApp</div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '16px 20px 8px 20px', color: '#00a884', fontSize: '13px', fontWeight: '600' }}>
                Advanced
              </div>

              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ paddingRight: '12px' }}>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Block unknown account messages</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '4px', lineHeight: '1.4' }}>
                    To protect your account and improve device performance, WhatsApp will block messages from unknown accounts... <span style={{ color: '#00a884', cursor: 'pointer' }}>Learn more</span>
                  </div>
                </div>
                {renderToggle(blockUnknown, () => setBlockUnknown(!blockUnknown))}
              </div>

              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ paddingRight: '12px' }}>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Protect IP address in calls</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '4px', lineHeight: '1.4' }}>
                    To make it harder for people to infer your location, calls on this device will be securely relayed through WhatsApp servers... <span style={{ color: '#00a884', cursor: 'pointer' }}>Learn more</span>
                  </div>
                </div>
                {renderToggle(protectIp, () => setProtectIp(!protectIp))}
              </div>

              <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ paddingRight: '12px' }}>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Turn off link previews</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '4px', lineHeight: '1.4' }}>
                    To help protect your IP address from being inferred by third-party websites, previews for the links you share in chats will no longer be generated. <span style={{ color: '#00a884', cursor: 'pointer' }}>Learn more</span>
                  </div>
                </div>
                {renderToggle(turnOffLinkPreviews, () => setTurnOffLinkPreviews(!turnOffLinkPreviews))}
              </div>
            </div>
          </div>
        ) : subView === 'chats_settings' ? (
          /* ---------------- CHATS SUBVIEW ---------------- */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              height: '60px', backgroundColor: '#202c33',
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '0 16px', borderBottom: '1px solid #222d34'
            }}>
              <button onClick={() => setSubView('main')} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}>
                ←
              </button>
              <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>Chats</h2>
            </div>

            <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
              <div style={{ padding: '8px 20px', color: '#00a884', fontSize: '13px', fontWeight: '600' }}>
                Display
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Theme</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>System default</div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Wallpaper</div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '16px 20px 8px 20px', color: '#00a884', fontSize: '13px', fontWeight: '600' }}>
                Chat settings
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Media upload quality</div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Media auto-download</div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Spell check</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Check spelling while typing</div>
                </div>
                {renderToggle(spellCheck, () => setSpellCheck(!spellCheck))}
              </div>

              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Replace text with emoji</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Emoji will replace specific text as you type</div>
                </div>
                {renderToggle(replaceEmoji, () => setReplaceEmoji(!replaceEmoji))}
              </div>

              <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Enter is send</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Enter key will send your message</div>
                </div>
                {renderToggle(enterIsSend, () => setEnterIsSend(!enterIsSend))}
              </div>
            </div>
          </div>
        ) : subView === 'notifications' ? (
          /* ---------------- NOTIFICATIONS SUBVIEW ---------------- */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              height: '60px', backgroundColor: '#202c33',
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '0 16px', borderBottom: '1px solid #222d34'
            }}>
              <button onClick={() => setSubView('main')} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}>
                ←
              </button>
              <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>Notifications</h2>
            </div>

            <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '18px', color: '#8696a0' }}>💬</span>
                  <div>
                    <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Messages</div>
                    <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Off</div>
                  </div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '18px', color: '#8696a0' }}>👥</span>
                  <div>
                    <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Groups</div>
                    <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Off</div>
                  </div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '18px', color: '#8696a0' }}>⭕</span>
                  <div>
                    <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Status</div>
                    <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Off</div>
                  </div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '18px', color: '#8696a0' }}>📞</span>
                  <div>
                    <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Calls</div>
                    <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>On</div>
                  </div>
                </div>
                <span style={{ color: '#8696a0' }}>›</span>
              </div>

              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
                <div style={{ paddingRight: '12px' }}>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Show previews</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '4px' }}>Preview message text inside message notifications.</div>
                </div>
                {renderToggle(showPreviews, () => setShowPreviews(!showPreviews))}
              </div>

              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Play sound for outgoing messages</div>
                {renderToggle(playSound, () => setPlaySound(!playSound))}
              </div>

              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ paddingRight: '12px' }}>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Background sync</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '4px' }}>Get faster performance by syncing messages in the background.</div>
                </div>
                {renderToggle(bgSync, () => setBgSync(!bgSync))}
              </div>

              <div style={{ color: '#667781', fontSize: '12px', padding: '16px 20px', lineHeight: '1.4' }}>
                To get notifications, make sure they're turned on in your browser and device settings.
              </div>
            </div>
          </div>
        ) : subView === 'help_feedback' ? (
          /* ---------------- HELP AND FEEDBACK SUBVIEW (Matches Screenshot 2) ---------------- */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              height: '60px', backgroundColor: '#202c33',
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '0 16px', borderBottom: '1px solid #222d34'
            }}>
              <button onClick={() => setSubView('main')} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}>
                ←
              </button>
              <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>Help and feedback</h2>
            </div>

            <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '18px', color: '#8696a0' }}>❓</span>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Help Centre</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Frequently asked questions</div>
                </div>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '18px', color: '#8696a0' }}>💬</span>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Contact us</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Chat with support to get answers</div>
                </div>
              </div>

              <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '18px', color: '#8696a0' }}>💡</span>
                <div>
                  <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Send feedback</div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Technical issues, suggestions</div>
                </div>
              </div>

              <div style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '18px', color: '#8696a0' }}>📄</span>
                <span style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Terms and Privacy Policy</span>
              </div>

              <div style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '18px', color: '#8696a0' }}>⚠️</span>
                <span style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Channels reports</span>
              </div>

              {/* Join the beta */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(34, 45, 52, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '12px' }}>
                <div style={{ paddingRight: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px', color: '#8696a0' }}>🧪</span>
                    <span style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>Join the beta</span>
                  </div>
                  <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '4px', lineHeight: '1.4' }}>
                    Get new features before they are released. Report bugs using the Contact us form above.
                  </div>
                </div>
                {renderToggle(joinBeta, () => setJoinBeta(!joinBeta))}
              </div>

              <div style={{ color: '#667781', fontSize: '12px', padding: '24px 20px 16px 20px', textAlign: 'center' }}>
                Version 2.3000.1044785524
              </div>
            </div>
          </div>
        ) : (
          /* ---------------- MAIN SETTINGS LIST VIEW ---------------- */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              height: '60px', backgroundColor: '#202c33',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 16px', borderBottom: '1px solid #222d34'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                  <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}>
                    ←
                  </button>
                )}
                <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600' }}>
                  {user?.username || 'Settings'}
                </h2>
              </div>
            </div>

            <div style={{ padding: '12px 16px' }}>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '9px 16px', borderRadius: '8px',
                  border: 'none', backgroundColor: '#2a3942', color: '#e9edef',
                  fontSize: '14px', outline: 'none'
                }}
              />
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid #222d34', position: 'relative'
            }}>
              <div style={{
                backgroundColor: '#202c33', color: '#e9edef', borderRadius: '20px',
                padding: '8px 20px', fontSize: '13px', marginBottom: '14px',
                maxWidth: '92%', textAlign: 'center', wordBreak: 'break-word',
                border: '1px solid rgba(0, 168, 132, 0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                lineHeight: '1.4'
              }}>
                {parseStatusMessage(user?.status_message)}
              </div>

              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontSize: '32px',
                fontWeight: 'bold', overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
              }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.username?.[0]?.toUpperCase() || 'U'
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '14px 20px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(34, 45, 52, 0.3)',
                    transition: 'background 0.15s'
                  }}
                >
                  <span style={{ fontSize: '20px', color: '#8696a0' }}>{item.icon}</span>
                  <div>
                    <div style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>{item.title}</div>
                    <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>{item.subtitle}</div>
                  </div>
                </div>
              ))}

              <div
                onClick={logout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '14px 20px', cursor: 'pointer', color: '#f87171',
                  borderTop: '1px solid #222d34', marginTop: '8px'
                }}
              >
                <span style={{ fontSize: '20px' }}>🚪</span>
                <span style={{ fontWeight: '600', fontSize: '15px' }}>Log out</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Showcase Area */}
      <div 
        className="wa-chat-container hide-on-mobile"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#111b21', color: '#8696a0', gap: '32px', padding: '32px'
        }}
      >
        <div style={{
          width: '380px', backgroundColor: '#202c33', borderRadius: '16px',
          padding: '32px 24px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', gap: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)', border: '1px solid #222d34'
        }}>
          <div style={{
            width: '80px', height: '60px', backgroundColor: '#2a3942',
            borderRadius: '8px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '32px'
          }}>
            💻
          </div>
          <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600' }}>
            Download WhatsApp for Windows
          </h2>
          <p style={{ color: '#8696a0', fontSize: '13px', lineHeight: '1.5' }}>
            Get extra features like voice and video calling, screen sharing and more.
          </p>
          <button style={{
            padding: '10px 24px', borderRadius: '20px', border: 'none',
            backgroundColor: '#00a884', color: '#111b21', fontWeight: '600',
            fontSize: '14px', cursor: 'pointer', marginTop: '8px'
          }}>
            Download
          </button>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: '#202c33', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#e9edef', fontSize: '20px'
            }}>
              📄
            </div>
            <span style={{ color: '#8696a0', fontSize: '12px' }}>Send document</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: '#202c33', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#e9edef', fontSize: '20px'
            }}>
              👤+
            </div>
            <span style={{ color: '#8696a0', fontSize: '12px' }}>Add contact</span>
          </div>

          <div 
            onClick={onOpenMetaAi}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: '#202c33', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#c084fc', fontSize: '20px'
            }}>
              ✨
            </div>
            <span style={{ color: '#8696a0', fontSize: '12px' }}>Ask Meta AI</span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal Overlay */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
