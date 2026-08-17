import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchUsers, createChat, clearChat as apiClearChat, deleteChat as apiDeleteChat, parseStatusMessage } from '../services/api';
import ProfileModal from './ProfileModal';
import NewChatModal from './NewChatModal';
import { formatTimestamp } from '../utils/dateUtils';

export default function Sidebar({ chats = [], activeChatId, onSelectChat, onChatCreated, isChatActive }) {
  const { user, logout } = useAuth();
  
  // Navigation & View States
  const [panelView, setPanelView] = useState('main'); // 'main' | 'new_chat'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread'
  const [filterQuery, setFilterQuery] = useState('');
  
  // 3-Dots Dropdown State & Ref
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sidebarMenuRef = useRef(null);

  // Close sidebar 3-dots menu when clicking anywhere outside on screen
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event) => {
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // New Chat Panel States
  const [newChatSearch, setNewChatSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const safeChats = Array.isArray(chats) ? chats : [];

  // Long-press Action Sheet & Chat Management States (Pin, Favorite, Archive, Block)
  const storageKeyPrefix = `wa_${user?.id || 'guest'}_`;

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKeyPrefix + 'pinned') || '[]');
    } catch (e) { return []; }
  });

  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKeyPrefix + 'favorites') || '[]');
    } catch (e) { return []; }
  });

  const [archivedIds, setArchivedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKeyPrefix + 'archived') || '[]');
    } catch (e) { return []; }
  });

  const [blockedUserIds, setBlockedUserIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKeyPrefix + 'blocked') || '[]');
    } catch (e) { return []; }
  });

  const [selectedChatActionMenu, setSelectedChatActionMenu] = useState(null);
  const pressTimerRef = React.useRef(null);
  const isLongPressRef = React.useRef(false);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(storageKeyPrefix + 'pinned', JSON.stringify(pinnedIds));
      localStorage.setItem(storageKeyPrefix + 'favorites', JSON.stringify(favoriteIds));
      localStorage.setItem(storageKeyPrefix + 'archived', JSON.stringify(archivedIds));
      localStorage.setItem(storageKeyPrefix + 'blocked', JSON.stringify(blockedUserIds));
    }
  }, [pinnedIds, favoriteIds, archivedIds, blockedUserIds, user]);

  const handleTouchStart = (chat) => {
    isLongPressRef.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setSelectedChatActionMenu(chat);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(50); } catch (e) {}
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    setSelectedChatActionMenu(chat);
  };

  const handleChatClick = (chat) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    onSelectChat(chat);
  };

  const handleTogglePin = (chatId) => {
    setPinnedIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
    setSelectedChatActionMenu(null);
  };

  const handleToggleFavorite = (chatId) => {
    setFavoriteIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
    setSelectedChatActionMenu(null);
  };

  const handleToggleArchive = (chatId) => {
    setArchivedIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
    setSelectedChatActionMenu(null);
  };

  const handleToggleBlock = (otherUserId) => {
    setBlockedUserIds((prev) =>
      prev.includes(otherUserId) ? prev.filter((id) => id !== otherUserId) : [...prev, otherUserId]
    );
    setSelectedChatActionMenu(null);
  };

  const handleClearChatAction = async (chatId) => {
    try {
      if (!String(chatId).startsWith('temp-')) {
        await apiClearChat(chatId);
      }
      const targetChat = safeChats.find((c) => String(c.id) === String(chatId));
      if (targetChat) {
        targetChat.last_message = null;
      }
      setSelectedChatActionMenu(null);
      if (onChatCreated) onChatCreated(chatId);
    } catch (err) {
      console.error('Failed to clear chat:', err);
      alert('Failed to clear chat: ' + (err.message || 'Error'));
    }
  };

  const handleDeleteChatAction = async (chatId) => {
    try {
      if (!String(chatId).startsWith('temp-')) {
        await apiDeleteChat(chatId);
      }
      setSelectedChatActionMenu(null);
      if (onChatCreated) onChatCreated(chatId);
    } catch (err) {
      console.error('Failed to delete chat:', err);
      alert('Failed to delete chat: ' + (err.message || 'Error'));
    }
  };

  useEffect(() => {
    if (panelView === 'new_chat') {
      loadDefaultContacts();
    }
  }, [panelView]);

  const loadDefaultContacts = async () => {
    setLoadingContacts(true);
    try {
      const users = await searchUsers('a'); // default query or all users
      setContactResults(users || []);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSearchContacts = async (e) => {
    const q = e.target.value;
    setNewChatSearch(q);
    if (!q.trim()) {
      loadDefaultContacts();
      return;
    }
    setLoadingContacts(true);
    try {
      const users = await searchUsers(q);
      setContactResults(users || []);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleStartChatWithUser = async (targetUser) => {
    try {
      const res = await createChat([targetUser.id]);
      const newChatId = res.chat?.id || res.conversation?.id || res.id;
      if (onChatCreated) {
        onChatCreated(newChatId, targetUser);
      }
      setPanelView('main');
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  const handleSelectContact = async (targetUser) => {
    try {
      const targetIdStr = String(targetUser.id);
      const currentUserIdStr = String(user?.id);
      const isSelf = targetIdStr === currentUserIdStr;

      // 1. Check if a chat with targetUser already exists in user's chat list
      const existing = chats.find(c => {
        if (c.is_group) return false;
        const pIds = (c.participants || []).map(p => String(typeof p === 'object' ? p.id : p));
        if (isSelf) {
          return pIds.length > 0 && pIds.every(id => id === currentUserIdStr);
        }
        return pIds.includes(currentUserIdStr) && pIds.includes(targetIdStr) && pIds.length === 2;
      });

      if (existing) {
        onSelectChat(existing);
        setPanelView('main');
        return;
      }

      // Fetch or create official backend chat entry
      const res = await createChat([targetUser.id], false);
      const chatId = res?.id || res?.chat?.id || res?.conversation?.id || res?.chat_id;
      if (chatId) {
        const officialChat = res?.conversation || res?.chat || { ...res, id: chatId };
        onSelectChat(officialChat);
        if (onChatCreated) onChatCreated(chatId, targetUser);
      }
      setPanelView('main');
    } catch (err) {
      console.error('Failed to select contact:', err);
    }
  };

  const getOtherParticipant = (chat) => {
    if (!chat) return null;
    if (chat.is_group) return null;
    const other = chat.participants?.find((p) => String(typeof p === 'object' ? p.id : p) !== String(user?.id));
    return other || chat.participants?.find((p) => String(typeof p === 'object' ? p.id : p) === String(user?.id));
  };

  const getChatTitle = (chat) => {
    if (!chat) return 'Chat';
    if (chat.is_group) return chat.group_name || 'Group Chat';
    const other = getOtherParticipant(chat);
    if (!other || String(other.id) === String(user?.id)) {
      return `${user?.username || 'You'} (You)`;
    }
    return other.username || 'Chat';
  };

  const getChatAvatar = (chat) => {
    if (!chat) return '💬';
    if (chat.is_group) return '👥';
    const other = getOtherParticipant(chat);
    if (other?.avatar_url) {
      return <img src={other.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />;
    }
    return (other?.username || user?.username)?.[0]?.toUpperCase() || '💬';
  };

  const filteredChats = safeChats.filter(chat => {
    if (!chat) return false;
    const title = getChatTitle(chat);
    const matchesQuery = title.toLowerCase().includes((filterQuery || '').toLowerCase());
    const isArchived = archivedIds.includes(chat.id);
    if (isArchived && activeFilter !== 'archived') return false;
    if (activeFilter === 'unread') {
      const lastMsg = chat.last_message;
      return matchesQuery && (lastMsg && lastMsg.sender_id !== user?.id && lastMsg.status !== 'read');
    }
    return matchesQuery;
  }).sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <div 
      className={`wa-sidebar-container ${isChatActive ? 'hide-on-mobile' : ''}`}
      style={{
        width: '32%',
        minWidth: '340px',
        borderRight: '1px solid #222d34',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#111b21',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* ---------------- SLIDE-IN NEW CHAT PANEL (Matches Screenshot 2) ---------------- */}
      {panelView === 'new_chat' ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#111b21' }}>
          {/* New Chat Header */}
          <div style={{
            height: '60px',
            backgroundColor: '#202c33',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '0 16px',
            borderBottom: '1px solid #222d34'
          }}>
            <button
              onClick={() => setPanelView('main')}
              style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}
              title="Back"
            >
              ←
            </button>
            <h2 style={{ color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>New chat</h2>
          </div>

          {/* Search Box */}
          <div style={{ padding: '10px 12px' }}>
            <input
              type="text"
              placeholder="Search name or number"
              value={newChatSearch}
              onChange={handleSearchContacts}
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

          {/* Scrollable Action Options & Contact List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Quick Actions */}
            <div 
              onClick={() => setIsGroupModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', cursor: 'pointer' }}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontSize: '18px'
              }}>
                👥
              </div>
              <span style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>New group</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', cursor: 'pointer' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontSize: '18px'
              }}>
                👤+
              </div>
              <span style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>New contact</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', cursor: 'pointer' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontSize: '18px'
              }}>
                👥+
              </div>
              <span style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>New community</span>
            </div>

            {/* Message Yourself Note */}
            <div 
              onClick={() => user && handleSelectContact(user)}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', cursor: 'pointer' }}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: 'bold'
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>
                  {user?.username} <span style={{ color: '#8696a0', fontSize: '12px' }}>(You)</span>
                </div>
                <div style={{ color: '#8696a0', fontSize: '12px' }}>Message yourself</div>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#222d34', margin: '8px 0' }} />

            {/* Contact Group Header */}
            <div style={{ padding: '8px 16px', color: '#00a884', fontSize: '14px', fontWeight: '600' }}>
              CONTACTS ON WHATSAPP
            </div>

            {/* Contact Items */}
            {loadingContacts ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#8696a0', fontSize: '13px' }}>Loading...</div>
            ) : contactResults.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#8696a0', fontSize: '13px' }}>No contacts found</div>
            ) : (
              contactResults.map(u => (
                <div
                  key={u.id}
                  onClick={() => handleSelectContact(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'white', fontWeight: 'bold'
                  }}>
                    {u.username[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ color: '#e9edef', fontWeight: '500', fontSize: '15px' }}>{u.username}</div>
                    <div style={{ color: '#8696a0', fontSize: '12px' }}>{parseStatusMessage(u.status_message) || u.email}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ---------------- MAIN CHATS PANEL (Matches Screenshots 1, 3, 4) ---------------- */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            <h1 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '700' }}>WhatsApp</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
              {/* [+] New Chat Icon (Matches Screenshot 1) */}
              <button
                onClick={() => setPanelView('new_chat')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#aebac1',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="New Chat"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                </svg>
              </button>

              {/* ⋮ 3-Dots Menu Button (Matches Screenshot 1 & 3) */}
              <div ref={sidebarMenuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#aebac1',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>

              {/* 3-Dots Dropdown Menu Popover (Matches Screenshot 3) */}
              {isMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  right: '0',
                  backgroundColor: '#233138',
                  borderRadius: '8px',
                  padding: '8px 0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  zIndex: 500,
                  width: '190px',
                  border: '1px solid #222d34'
                }}>
                  <div 
                    onClick={() => { setIsGroupModalOpen(true); setIsMenuOpen(false); }}
                    style={{ padding: '10px 16px', color: '#e9edef', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>👥</span> New group
                  </div>
                  <div style={{ padding: '10px 16px', color: '#e9edef', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>⭐</span> Starred messages
                  </div>
                  <div style={{ padding: '10px 16px', color: '#e9edef', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>☑️</span> Select chats
                  </div>
                  <div style={{ padding: '10px 16px', color: '#e9edef', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>✉️</span> Mark all as read
                  </div>
                  <div style={{ padding: '10px 16px', color: '#e9edef', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>🔒</span> App lock
                  </div>
                  <div 
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    style={{ padding: '10px 16px', color: '#f87171', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #222d34' }}
                  >
                    <span>🚪</span> Log out
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Search Input Bar */}
          <div style={{ padding: '10px 12px' }}>
            <input 
              type="text" 
              placeholder="Search or start a new chat" 
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
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

          {/* Filter Pills (All / Unread) */}
          <div style={{ display: 'flex', gap: '8px', padding: '0 12px 10px 12px' }}>
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: activeFilter === 'all' ? '#00a884' : '#202c33',
                color: activeFilter === 'all' ? '#111b21' : '#8696a0',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: activeFilter === 'unread' ? '#00a884' : '#202c33',
                color: activeFilter === 'unread' ? '#111b21' : '#8696a0',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Unread
            </button>
          </div>

          {/* Chat List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredChats.length === 0 ? (
              <div style={{ color: '#8696a0', textAlign: 'center', marginTop: '30px', padding: '0 20px' }}>
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>No conversations yet</p>
                <p style={{ fontSize: '12px' }}>Click the <strong>[+]</strong> button above to search users and start chatting!</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isActive = Boolean(activeChatId && String(chat.id) === String(activeChatId));
                const title = getChatTitle(chat);
                const avatar = getChatAvatar(chat);
                const lastMsg = chat.last_message;

                const lastMsgTime = lastMsg?.createdAt || lastMsg?.created_at;
                const formattedTime = formatTimestamp(lastMsgTime);

                const lastSenderId = typeof lastMsg?.sender === 'object' && lastMsg?.sender !== null
                  ? lastMsg.sender.id
                  : (lastMsg?.senderId ?? lastMsg?.sender_id ?? lastMsg?.sender);
                const isLastMsgMine = Boolean(lastSenderId && user?.id && String(lastSenderId) === String(user?.id));

                const unreadCountRaw = parseInt(chat.unread_count ?? chat.unreadCount ?? 0, 10);
                const isUnreadStatus = Boolean(lastMsg && !isLastMsgMine && lastMsg.status !== 'read');
                const unreadCount = isActive ? 0 : (unreadCountRaw > 0 ? unreadCountRaw : (isUnreadStatus ? 1 : 0));
                const hasUnread = !isActive && unreadCount > 0;

                const isPinned = pinnedIds.includes(chat.id);
                const isFavorite = favoriteIds.includes(chat.id);

                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatClick(chat)}
                    onTouchStart={() => handleTouchStart(chat)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onContextMenu={(e) => handleContextMenu(e, chat)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: isActive ? '#2a3942' : 'transparent',
                      cursor: 'pointer',
                      borderBottom: '1px solid #222d34',
                      transition: 'background 0.15s',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                  >
                    <div style={{
                      position: 'relative',
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      backgroundColor: '#00a884',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {avatar}
                      {getOtherParticipant(chat)?.is_online && (
                        <div style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '2px',
                          width: '11px',
                          height: '11px',
                          borderRadius: '50%',
                          backgroundColor: '#22c55e',
                          border: '2px solid #202c33'
                        }} title="Online" />
                      )}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      {/* Top line: Name & Timestamp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ color: '#e9edef', fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {title}
                          {isFavorite && <span style={{ fontSize: '12px', color: '#f59e0b' }} title="Favorite">⭐</span>}
                          {isPinned && <span style={{ fontSize: '12px', color: '#00a884' }} title="Pinned">📌</span>}
                        </span>
                        {formattedTime && (
                          <span style={{ 
                            color: hasUnread ? '#00a884' : '#8696a0', 
                            fontSize: '12px',
                            fontWeight: hasUnread ? '600' : 'normal'
                          }}>
                            {formattedTime}
                          </span>
                        )}
                      </div>

                      {/* Bottom line: Last message preview & Unread badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                        <div style={{
                          color: hasUnread ? '#e9edef' : '#8696a0',
                          fontSize: '13px',
                          fontWeight: hasUnread ? '500' : 'normal',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                          marginRight: '8px'
                        }}>
                          {isLastMsgMine && (
                            <span style={{ marginRight: '4px', color: lastMsg?.status === 'read' ? '#53bdeb' : '#8696a0', fontWeight: 'bold' }}>
                              {lastMsg?.status === 'read' ? '✓✓' : lastMsg?.status === 'delivered' ? '✓✓' : '✓'}
                            </span>
                          )}
                          {(() => {
                            if (!lastMsg || (!lastMsg.id && !lastMsg.content && !lastMsg.media_url && !lastMsg.mediaUrl)) return 'No messages yet';
                            if (lastMsg.is_deleted || lastMsg.isDeleted) return '🚫 This message was deleted';
                            const hasText = lastMsg.content && !lastMsg.content.startsWith('[file:') && !lastMsg.content.startsWith('[image:') && !lastMsg.content.startsWith('[video:') && !lastMsg.content.startsWith('[audio:');
                            if (hasText) return lastMsg.content;
                            const mType = lastMsg.media_type || lastMsg.type || 'text';
                            if (mType === 'image') return '📷 Photo';
                            if (mType === 'video') return '🎥 Video';
                            if (mType === 'audio') return '🎵 Voice message';
                            if (mType === 'document' || mType === 'file') return '📄 Document';
                            if (lastMsg.media_url || lastMsg.mediaUrl) return '📎 Attachment';
                            return lastMsg.content || 'No messages yet';
                          })()}
                        </div>

                        {hasUnread && (
                          <div style={{
                            backgroundColor: '#00a884',
                            color: '#111b21',
                            borderRadius: '50%',
                            minWidth: '20px',
                            height: '20px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 5px',
                            flexShrink: 0
                          }}>
                            {unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Long-Press Chat Context Action Sheet Modal */}
      {selectedChatActionMenu && (
        <div 
          onClick={() => setSelectedChatActionMenu(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(11, 20, 26, 0.75)', zIndex: 3000,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '440px', backgroundColor: '#1f2c34',
              borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
              padding: '16px 0 24px 0', border: '1px solid #2a3942',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.6)'
            }}
          >
            {/* Action Bar Header */}
            <div style={{ padding: '8px 24px 16px 24px', borderBottom: '1px solid #2a3942', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#e9edef', fontWeight: 'bold', fontSize: '16px' }}>
                {getChatTitle(selectedChatActionMenu)}
              </span>
              <button 
                type="button"
                onClick={() => setSelectedChatActionMenu(null)}
                style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Menu Options */}
            <div style={{ padding: '8px 0' }}>
              {/* Pin Chat */}
              <div 
                onClick={() => handleTogglePin(selectedChatActionMenu.id)}
                style={{ padding: '12px 24px', color: '#e9edef', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '18px' }}>{pinnedIds.includes(selectedChatActionMenu.id) ? '📍' : '📌'}</span>
                <span>{pinnedIds.includes(selectedChatActionMenu.id) ? 'Unpin chat' : 'Pin chat'}</span>
              </div>

              {/* Favorite Chat */}
              <div 
                onClick={() => handleToggleFavorite(selectedChatActionMenu.id)}
                style={{ padding: '12px 24px', color: '#e9edef', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '18px' }}>{favoriteIds.includes(selectedChatActionMenu.id) ? '🌟' : '⭐'}</span>
                <span>{favoriteIds.includes(selectedChatActionMenu.id) ? 'Remove from favorites' : 'Add to favorites'}</span>
              </div>

              {/* Archive Chat */}
              <div 
                onClick={() => handleToggleArchive(selectedChatActionMenu.id)}
                style={{ padding: '12px 24px', color: '#e9edef', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '18px' }}>{archivedIds.includes(selectedChatActionMenu.id) ? '📤' : '📥'}</span>
                <span>{archivedIds.includes(selectedChatActionMenu.id) ? 'Unarchive chat' : 'Archive chat'}</span>
              </div>

              {/* Clear Chat */}
              <div 
                onClick={() => handleClearChatAction(selectedChatActionMenu.id)}
                style={{ padding: '12px 24px', color: '#e9edef', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '18px' }}>🧹</span>
                <span>Clear chat</span>
              </div>

              {/* Delete Chat */}
              <div 
                onClick={() => handleDeleteChatAction(selectedChatActionMenu.id)}
                style={{ padding: '12px 24px', color: '#f87171', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '18px' }}>🗑️</span>
                <span>Delete chat</span>
              </div>

              {/* Block Contact */}
              {(() => {
                const other = getOtherParticipant(selectedChatActionMenu);
                if (!other || String(other.id) === String(user?.id)) return null;
                const isBlocked = blockedUserIds.includes(other.id);
                return (
                  <div 
                    onClick={() => handleToggleBlock(other.id)}
                    style={{ padding: '12px 24px', color: isBlocked ? '#4ade80' : '#f87171', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '18px' }}>🚫</span>
                    <span>{isBlocked ? `Unblock ${other.username}` : `Block ${other.username}`}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <NewChatModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} onChatCreated={onChatCreated} />
    </div>
  );
}
