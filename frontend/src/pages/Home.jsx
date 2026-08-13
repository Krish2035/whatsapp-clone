import React, { useState, useEffect } from 'react';
import NavRail from '../components/NavRail';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import CallsView from '../components/CallsView';
import StatusView from '../components/StatusView';
import ChannelsView from '../components/ChannelsView';
import CommunitiesView from '../components/CommunitiesView';
import SettingsView from '../components/SettingsView';
import MediaGalleryModal from '../components/MediaGalleryModal';
import ProfileModal from '../components/ProfileModal';
import { fetchChats, markAsRead as apiMarkAsRead } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'calls' | 'status' | 'channels' | 'communities' | 'meta_ai' | 'settings'
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  
  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  // Real-time Socket Listener to update sidebar chats
  useEffect(() => {
    if (!user) return;
    const socket = socketService.connect(user.id);
    if (!socket) return;

    const handleUpdate = () => {
      loadChats();
    };

    socket.on('receive_message', handleUpdate);
    socket.on('messages_read_update', handleUpdate);

    return () => {
      socket.off('receive_message', handleUpdate);
      socket.off('messages_read_update', handleUpdate);
    };
  }, [user]);

  const loadChats = async (selectChatId = null, targetUser = null) => {
    try {
      const chatList = await fetchChats();
      const safeList = Array.isArray(chatList) ? chatList : [];
      setChats(safeList);
      
      if (selectChatId) {
        const found = safeList.find(c => String(c.id) === String(selectChatId));
        if (found) {
          setActiveChat(found);
          apiMarkAsRead(found.id).catch(() => {});
        } else if (targetUser) {
          const newChat = {
            id: selectChatId,
            is_group: false,
            group_name: null,
            created_at: new Date().toISOString(),
            participants: [
              { id: user?.id, username: user?.username, avatar_url: user?.avatar_url },
              { id: targetUser.id, username: targetUser.username, avatar_url: targetUser.avatar_url }
            ]
          };
          setActiveChat(newChat);
        }
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
      setChats([]);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'meta_ai') {
      const metaAiChat = {
        id: 'meta-ai-chat-id',
        is_group: false,
        group_name: null,
        participants: [
          { id: 'meta-ai-id', username: 'Meta AI ✨', avatar_url: null, status_message: 'Ask me anything!' }
        ]
      };
      setActiveChat(metaAiChat);
    } else if (tab !== 'chats') {
      setActiveChat(null);
    }
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    if (chat && chat.id && !String(chat.id).startsWith('temp-')) {
      apiMarkAsRead(chat.id).catch(() => {});
      setChats((prev) =>
        prev.map((c) => (String(c.id) === String(chat.id) ? { 
          ...c, 
          unread_count: 0, 
          unreadCount: 0,
          last_message: c.last_message ? { ...c.last_message, status: 'read' } : c.last_message 
        } : c))
      );
    }
  };

  const handleMessagesRead = (readChatId) => {
    setChats((prev) =>
      prev.map((c) => (String(c.id) === String(readChatId) ? { ...c, unread_count: 0, unreadCount: 0 } : c))
    );
  };

  return (
    <div className="wa-app-container" style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Far Left Navigation Dock */}
      <NavRail 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenMediaGallery={() => setIsMediaGalleryOpen(true)}
        isChatActive={!!activeChat}
      />

      {/* Main View Router */}
      {activeTab === 'chats' || activeTab === 'meta_ai' ? (
        <>
          <Sidebar 
            chats={chats} 
            activeChatId={activeChat?.id} 
            onSelectChat={handleSelectChat} 
            onChatCreated={(newId, targetUser) => loadChats(newId, targetUser)}
            isChatActive={!!activeChat}
          />
          <ChatArea 
            activeChat={activeChat} 
            onMessageSent={() => loadChats()} 
            onMessagesRead={handleMessagesRead}
            onBack={() => setActiveChat(null)}
          />
        </>
      ) : activeTab === 'calls' ? (
        <CallsView 
          isMobile={!!activeChat} 
          onBack={() => setActiveTab('chats')} 
        />
      ) : activeTab === 'status' ? (
        <StatusView 
          isMobile={!!activeChat} 
          onBack={() => setActiveTab('chats')} 
        />
      ) : activeTab === 'channels' ? (
        <ChannelsView 
          isMobile={!!activeChat} 
          onBack={() => setActiveTab('chats')} 
        />
      ) : activeTab === 'communities' ? (
        <CommunitiesView 
          isMobile={!!activeChat} 
          onBack={() => setActiveTab('chats')} 
        />
      ) : activeTab === 'settings' ? (
        <SettingsView 
          isMobile={!!activeChat} 
          onBack={() => setActiveTab('chats')} 
          onOpenMetaAi={() => handleTabChange('meta_ai')}
        />
      ) : null}

      {/* Profile Settings Modal */}
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />

      {/* Media Gallery Overlay Modal */}
      <MediaGalleryModal
        isOpen={isMediaGalleryOpen}
        onClose={() => setIsMediaGalleryOpen(false)}
      />
    </div>
  );
}
