import React, { useState } from 'react';
import { searchUsers, createChat } from '../services/api';

export default function NewChatModal({ isOpen, onClose, onChatCreated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setError('');

    if (query.trim().length > 0) {
      try {
        const users = await searchUsers(query);
        setSearchResults(users);
      } catch (err) {
        console.error('Search failed:', err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleStartDirectChat = async (user) => {
    setLoading(true);
    try {
      const res = await createChat([user.id], false);
      onChatCreated(res.chat_id || res.chat.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Select at least one member for the group');
      return;
    }

    setLoading(true);
    try {
      const res = await createChat(selectedUserIds, true, groupName);
      onChatCreated(res.chat.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div 
        className="wa-modal-content"
        style={{
          width: '92%', maxWidth: '440px',
          backgroundColor: 'var(--wa-bg-panel)',
          borderRadius: '12px', padding: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          border: '1px solid var(--wa-border)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: 'var(--wa-text-primary)' }}>
            {isGroupMode ? 'Create New Group' : 'New Chat'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--wa-text-secondary)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => { setIsGroupMode(false); setSelectedUserIds([]); setError(''); }}
            style={{
              flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
              backgroundColor: !isGroupMode ? 'var(--wa-accent)' : 'var(--wa-bg-input)',
              color: !isGroupMode ? 'white' : 'var(--wa-text-secondary)',
              cursor: 'pointer', fontWeight: '500'
            }}
          >
            Direct Message
          </button>
          <button
            onClick={() => { setIsGroupMode(true); setError(''); }}
            style={{
              flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
              backgroundColor: isGroupMode ? 'var(--wa-accent)' : 'var(--wa-bg-input)',
              color: isGroupMode ? 'white' : 'var(--wa-text-secondary)',
              cursor: 'pointer', fontWeight: '500'
            }}
          >
            New Group
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {isGroupMode && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--wa-text-secondary)', fontSize: '12px', marginBottom: '4px' }}>Group Subject / Name</label>
            <input
              type="text"
              placeholder="e.g. Project Developers"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '6px',
                border: '1px solid var(--wa-border)', backgroundColor: 'var(--wa-bg-input)',
                color: 'var(--wa-text-primary)', outline: 'none'
              }}
            />
          </div>
        )}

        {/* User Search Input */}
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={handleSearch}
            style={{
              width: '100%', padding: '10px', borderRadius: '6px',
              border: '1px solid var(--wa-border)', backgroundColor: 'var(--wa-bg-input)',
              color: 'var(--wa-text-primary)', outline: 'none'
            }}
          />
        </div>

        {/* Search Results List */}
        <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {searchResults.length === 0 ? (
            <p style={{ color: 'var(--wa-text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
              {searchQuery ? 'No users found.' : 'Type a name or email to search users.'}
            </p>
          ) : (
            searchResults.map((u) => {
              const isSelected = selectedUserIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => isGroupMode ? toggleUserSelection(u.id) : handleStartDirectChat(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px', borderRadius: '8px',
                    backgroundColor: isSelected ? 'var(--wa-bg-hover)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: 'var(--wa-accent)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
                  }}>
                    {u.username[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--wa-text-primary)', fontWeight: '500' }}>{u.username}</div>
                    <div style={{ color: 'var(--wa-text-secondary)', fontSize: '12px' }}>{u.email}</div>
                  </div>
                  {isGroupMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ accentColor: 'var(--wa-accent)', width: '18px', height: '18px' }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {isGroupMode && (
          <button
            onClick={handleCreateGroup}
            disabled={loading}
            style={{
              width: '100%', marginTop: '16px', padding: '10px', borderRadius: '6px',
              border: 'none', backgroundColor: 'var(--wa-accent)', color: 'white',
              fontWeight: '600', cursor: 'pointer'
            }}
          >
            {loading ? 'Creating...' : `Create Group (${selectedUserIds.length} selected)`}
          </button>
        )}
      </div>
    </div>
  );
}
