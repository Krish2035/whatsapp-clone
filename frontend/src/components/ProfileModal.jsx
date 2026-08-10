import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile } = useAuth();
  const [statusMessage, setStatusMessage] = useState(user?.status_message || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      await updateUserProfile(statusMessage, avatarUrl);
      setMsg('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setMsg('Failed to update profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div 
        className="wa-modal-content"
        style={{
          width: '92%',
          maxWidth: '400px',
          backgroundColor: 'var(--wa-bg-panel)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          border: '1px solid var(--wa-border)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--wa-text-primary)' }}>Profile Info</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--wa-text-secondary)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        {msg && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px',
            backgroundColor: msg.includes('success') ? 'rgba(0,168,132,0.2)' : 'rgba(239,68,68,0.2)',
            color: msg.includes('success') ? '#00a884' : '#f87171'
          }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--wa-bg-input)',
              margin: '0 auto 12px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid var(--wa-accent)'
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '32px', color: 'var(--wa-text-secondary)' }}>
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--wa-text-secondary)', fontSize: '12px', marginBottom: '4px' }}>Username</label>
            <input
              type="text"
              disabled
              value={user?.username || ''}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--wa-border)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'var(--wa-text-muted)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--wa-text-secondary)', fontSize: '12px', marginBottom: '4px' }}>Avatar Image URL</label>
            <input
              type="text"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--wa-border)',
                backgroundColor: 'var(--wa-bg-input)',
                color: 'var(--wa-text-primary)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--wa-text-secondary)', fontSize: '12px', marginBottom: '4px' }}>About / Status</label>
            <input
              type="text"
              placeholder="Hey there! I am using WhatsApp."
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--wa-border)',
                backgroundColor: 'var(--wa-bg-input)',
                color: 'var(--wa-text-primary)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--wa-border)',
                backgroundColor: 'transparent',
                color: 'var(--wa-text-primary)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--wa-accent)',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
