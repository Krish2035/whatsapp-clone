import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/useCall';
import { 
  fetchMessages, 
  sendMessage as apiSendMessage, 
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  addReaction as apiAddReaction, 
  markAsRead as apiMarkAsRead, 
  uploadMedia, 
  askMetaAi, 
  createChat,
  clearChat as apiClearChat,
  deleteChat as apiDeleteChat
} from '../services/api';
import { socketService } from '../services/socket';
import ContactInfoSidebar from './ContactInfoSidebar';
import { formatTimestamp } from '../utils/dateUtils';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatArea({ activeChat, onMessageSent, onMessagesRead, onBack }) {
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Header 3-Dots Menu & Confirmation Modal State
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [confirmModalType, setConfirmModalType] = useState(null); // 'clear' | 'delete' | null

  // Quoted Reply State
  const [replyingTo, setReplyingTo] = useState(null);

  // Edit Message State
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');

  // Dropdown Context Menu State
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);

  // Reaction Bar Floating State (per message ID)
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);

  // Touch Long-Press Timer Ref
  const touchTimerRef = useRef(null);

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Contact Info Sidebar State
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeChat && activeChat.id) {
      loadMessages(activeChat.id);
      setIsContactInfoOpen(false);
      setReplyingTo(null);
      setEditingMsgId(null);
      setActiveMenuMsgId(null);
      setActiveReactionMsgId(null);

      // Join Socket.IO Chat Room for Real-Time Updates
      const socket = socketService.getSocket() || socketService.connect(user?.id);
      if (socket && activeChat.id) {
        socket.emit('join_chat', activeChat.id);
        socket.emit('join_conversation', activeChat.id);
      }
    }
  }, [activeChat]);

  useEffect(() => {
    const socket = socketService.connect(user?.id);
    if (!socket) return;

    if (activeChat && activeChat.id) {
      socket.emit('join_chat', activeChat.id);
      socket.emit('join_conversation', activeChat.id);
    }

    // Listen to real-time incoming messages
    const handleReceiveMessage = (newMsg) => {
      const msgChatId = newMsg.chat_id || newMsg.chatId || newMsg.conversationId;
      if (activeChat && String(msgChatId) === String(activeChat.id)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(newMsg.id))) return prev;
          return [...prev, newMsg];
        });
        // Auto mark read if active
        const msgSenderId = newMsg.sender_id || newMsg.senderId || newMsg.sender?.id;
        if (String(msgSenderId) !== String(user?.id)) {
          apiMarkAsRead(activeChat.id);
          socket.emit('mark_read', { chatId: activeChat.id, userId: user?.id });
        }
      }
    };

    // Listen to message edit events
    const handleMessageEdited = (editedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (String(m.id) === String(editedMsg.id) ? { ...m, content: editedMsg.content, isEdited: true, is_edited: true } : m))
      );
    };

    // Listen to message deletion events
    const handleMessageDeleted = ({ messageId, content }) => {
      setMessages((prev) =>
        prev.map((m) => (String(m.id) === String(messageId) ? { ...m, content: content || 'This message was deleted', isDeleted: true, is_deleted: true, mediaUrl: null, media_url: null } : m))
      );
    };

    // Listen to typing events
    const handleTypingStart = ({ chatId, username }) => {
      if (activeChat && String(chatId) === String(activeChat.id) && username !== user?.username) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = ({ chatId }) => {
      if (activeChat && String(chatId) === String(activeChat.id)) {
        setIsTyping(false);
      }
    };

    // Listen to read updates
    const handleReadUpdate = ({ chatId, userId }) => {
      if (activeChat && String(chatId) === String(activeChat.id) && String(userId) !== String(user?.id)) {
        setMessages((prev) =>
          prev.map((m) => {
            const mSenderId = m.sender_id || m.senderId || m.sender?.id;
            return String(mSenderId) === String(user?.id) ? { ...m, status: 'read' } : m;
          })
        );
      }
    };

    // Listen to reaction updates
    const handleReactionUpdate = ({ messageId, userId, emoji, removed }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m.id) === String(messageId)) {
            const existing = m.reactions || [];
            const filtered = existing.filter((r) => String(r.user_id || r.userId) !== String(userId));
            const newReactions = removed || !emoji ? filtered : [...filtered, { user_id: userId, emoji }];
            return { ...m, reactions: newReactions };
          }
          return m;
        })
      );
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('messages_read_update', handleReadUpdate);
    socket.on('reaction_updated', handleReactionUpdate);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('messages_read_update', handleReadUpdate);
      socket.off('reaction_updated', handleReactionUpdate);
    };
  }, [activeChat, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const loadMessages = async (chatId) => {
    if (!chatId || String(chatId).startsWith('temp-')) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const msgs = await fetchMessages(chatId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    const socket = socketService.getSocket();
    if (!socket || !activeChat || activeChat.id === 'meta-ai-chat-id') return;

    socket.emit('typing_start', { chatId: activeChat.id, username: user?.username });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { chatId: activeChat.id });
    }, 2000);
  };

  const handleSend = async (e, mediaUrl = null, mediaType = null, originalName = null) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !mediaUrl) || !activeChat) return;

    const content = inputText.trim();
    const replyTarget = replyingTo;
    setInputText('');
    setReplyingTo(null);


    // Meta AI Mode Handling
    if (activeChat.id === 'meta-ai-chat-id') {
      const userMsg = {
        id: `user-${Date.now()}`,
        sender_id: user?.id,
        sender_name: user?.username || 'You',
        content,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const res = await askMetaAi(content);
        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender_id: 'meta-ai-id',
          sender_name: 'Meta AI ✨',
          content: res.reply,
          created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        console.error('Meta AI Error:', err);
        const errorMsg = {
          id: `ai-err-${Date.now()}`,
          sender_id: 'meta-ai-id',
          sender_name: 'Meta AI ✨',
          content: err.message || "Sorry, I couldn't process your request right now.",
          created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    const socket = socketService.getSocket();
    if (socket) socket.emit('typing_stop', { chatId: activeChat.id });

    try {
      let targetChatId = activeChat.id;

      if (String(targetChatId).startsWith('temp-')) {
        const otherParticipant = activeChat.participants?.find((p) => String(p.id) !== String(user?.id));
        if (otherParticipant) {
          const res = await createChat([otherParticipant.id], false);
          const realId = res?.id || res?.chat?.id || res?.conversation?.id || res?.chat_id;
          if (realId) {
            targetChatId = realId;
            activeChat.id = realId;
            if (socket) {
              socket.emit('join_chat', realId);
              socket.emit('join_conversation', realId);
            }
          }
        }
      }

      const newMsg = await apiSendMessage(
        targetChatId,
        content,
        replyTarget?.id || null,
        mediaUrl,
        mediaType
      );

      if (replyTarget && !newMsg.reply_to) {
        newMsg.reply_to = {
          id: replyTarget.id,
          content: replyTarget.content,
          sender_name: replyTarget.sender_name
        };
      }

      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(newMsg.id))) return prev;
        return [...prev, newMsg];
      });

      if (socket) socket.emit('send_message', newMsg);
      if (onMessageSent) onMessageSent();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSetReply = (msg) => {
    const senderName = msg.sender?.username || msg.sender_name || (String(msg.sender_id || msg.senderId) === String(user?.id) ? 'You' : getChatTitle());
    setReplyingTo({
      id: msg.id,
      content: msg.content || (msg.media_url ? '📎 Attachment' : ''),
      sender_name: senderName
    });
    setActiveMenuMsgId(null);
  };

  const handleStartEdit = (msg) => {
    setEditingMsgId(msg.id);
    setEditText(msg.content || '');
    setActiveMenuMsgId(null);
  };

  const handleSaveEdit = async (msgId) => {
    if (!editText.trim()) return;
    const newContent = editText.trim();
    setEditingMsgId(null);
    setEditText('');

    setMessages((prev) =>
      prev.map((m) => (String(m.id) === String(msgId) ? { ...m, content: newContent, isEdited: true, is_edited: true } : m))
    );

    try {
      await apiEditMessage(msgId, newContent);
      const socket = socketService.getSocket();
      if (socket && activeChat) {
        socket.emit('edit_message', { messageId: msgId, chatId: activeChat.id, content: newContent });
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDeleteMsg = async (msgId) => {
    setActiveMenuMsgId(null);

    setMessages((prev) =>
      prev.map((m) => (String(m.id) === String(msgId) ? { ...m, content: 'This message was deleted', isDeleted: true, is_edited: false, is_deleted: true, mediaUrl: null, media_url: null } : m))
    );

    try {
      await apiDeleteMessage(msgId);
      const socket = socketService.getSocket();
      if (socket && activeChat) {
        socket.emit('delete_message', { messageId: msgId, chatId: activeChat.id });
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleToggleReaction = async (msgId, emoji) => {
    try {
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m.id) === String(msgId)) {
            const existing = Array.isArray(m.reactions) ? m.reactions : [];
            const hasEmoji = existing.some((r) => String(r.user_id || r.userId) === String(user?.id) && r.emoji === emoji);
            const filtered = existing.filter((r) => String(r.user_id || r.userId) !== String(user?.id));
            const newReactions = hasEmoji ? filtered : [...filtered, { user_id: user?.id, emoji }];
            return { ...m, reactions: newReactions };
          }
          return m;
        })
      );

      const socket = socketService.getSocket();
      if (socket && activeChat && socket.connected) {
        socket.emit('send_reaction', {
          messageId: msgId,
          chatId: activeChat.id,
          emoji,
        });
      } else {
        await apiAddReaction(msgId, emoji);
      }
    } catch (err) {
      console.error('Failed to add reaction:', err);
    } finally {
      setActiveReactionMsgId(null);
    }
  };

  // Touch Long Press Handlers for Mobile
  const handleTouchStart = (msgId) => {
    touchTimerRef.current = setTimeout(() => {
      setActiveMenuMsgId(msgId);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset input so same file can be selected again
    e.target.value = '';

    setUploading(true);
    try {
      const uploaded = await uploadMedia(file);
      const mediaUrl = uploaded.mediaUrl || uploaded.url;
      const mediaType = uploaded.mediaType || uploaded.type;
      const originalName = uploaded.originalName || file.name;
      await handleSend(null, mediaUrl, mediaType, originalName);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleClearChat = async () => {
    if (!activeChat || !activeChat.id) return;
    setConfirmModalType(null);
    setIsHeaderMenuOpen(false);
    setIsContactInfoOpen(false);

    try {
      if (!String(activeChat.id).startsWith('temp-')) {
        await apiClearChat(activeChat.id);
      }
      setMessages([]);
      if (onMessageSent) onMessageSent();
    } catch (err) {
      console.error('Failed to clear chat:', err);
      alert('Failed to clear chat: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteChat = async () => {
    if (!activeChat || !activeChat.id) return;
    setConfirmModalType(null);
    setIsHeaderMenuOpen(false);
    setIsContactInfoOpen(false);

    try {
      if (!String(activeChat.id).startsWith('temp-')) {
        await apiDeleteChat(activeChat.id);
      }
      setMessages([]);
      if (onMessageSent) onMessageSent();
      if (onBack) onBack();
    } catch (err) {
      console.error('Failed to delete chat:', err);
      alert('Failed to delete chat: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDownloadMedia = async (e, url, fileName) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || url.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (err) {
      console.warn('Direct blob download failed, opening link:', err);
      window.open(url, '_blank');
    }
  };

  const startCall = (isVideo) => {
    if (!activeChat) return;

    let recipient = null;

    if (Array.isArray(activeChat.participants)) {
      const other = activeChat.participants.find((p) => {
        const pId = typeof p === 'object' ? p.id : p;
        return String(pId) !== String(user?.id);
      });
      if (other) {
        recipient = typeof other === 'object' ? other : { id: other, username: getChatTitle() };
      }
    }

    if (!recipient) {
      const recipientId = activeChat.receiver_id || activeChat.other_user_id || activeChat.userId;
      if (recipientId && String(recipientId) !== String(user?.id)) {
        recipient = { id: recipientId, username: getChatTitle() };
      }
    }

    if (!recipient && activeChat.user) {
      recipient = activeChat.user;
    }

    if (recipient && recipient.id) {
      initiateCall(recipient, isVideo);
    } else {
      console.error('ChatArea: Failed to resolve recipient user in activeChat:', activeChat);
    }
  };

  const getChatTitle = () => {
    if (!activeChat) return '';
    if (activeChat.is_group) return activeChat.group_name || 'Group Chat';
    const otherParticipant = activeChat.participants?.find(
      (p) => String(p.id) !== String(user?.id)
    );
    return otherParticipant ? otherParticipant.username : 'Chat';
  };

  const renderTick = (status) => {
    if (status === 'read') {
      return <span style={{ color: '#53bdeb', fontWeight: 'bold' }} title="Read">✓✓</span>;
    } else if (status === 'delivered') {
      return <span style={{ color: 'var(--wa-text-secondary)' }} title="Delivered">✓✓</span>;
    }
    return <span style={{ color: 'var(--wa-text-secondary)' }} title="Sent">✓</span>;
  };

  const renderStructuredMessage = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    return (
      <div style={{ fontSize: '14px', wordBreak: 'break-word', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
        {lines.map((line, idx) => {
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <div key={idx} style={{ minHeight: line.trim() === '' ? '8px' : 'auto', marginBottom: '2px' }}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} style={{ fontWeight: '700', color: '#e9edef' }}>
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  if (!activeChat) {
    return (
      <div 
        className="wa-chat-container hide-on-mobile"
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', backgroundColor: 'var(--wa-bg-app)',
          color: 'var(--wa-text-secondary)', gap: '16px', padding: '32px', textAlign: 'center'
        }}
      >
        <div style={{
          width: '96px', height: '96px', borderRadius: '50%',
          backgroundColor: 'var(--wa-bg-panel)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--wa-accent)">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l5.07-1.38C8.56 21.5 10.27 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.55 0-3.03-.43-4.32-1.2l-.31-.19-3.21.84.85-3.13-.2-.33A7.957 7.957 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        </div>
        <h2 style={{ color: 'var(--wa-text-primary)', fontWeight: '400' }}>WhatsApp Web Clone</h2>
        <p style={{ maxWidth: '400px', fontSize: '14px', lineHeight: '1.5', color: 'var(--wa-text-muted)' }}>
          Send and receive messages, media files, and calls in real-time. Select a chat from the sidebar or click <strong>+</strong> to start.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div 
        className="wa-chat-container"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          height: '100%', backgroundColor: 'var(--wa-bg-app)', position: 'relative'
        }}
      >
        {/* Active Chat Header */}
        <div 
          className="wa-chat-header"
          style={{
            height: '60px', backgroundColor: 'var(--wa-bg-header)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', borderBottom: '1px solid var(--wa-border)',
            flexShrink: 0, zIndex: 10
          }}
        >
          {/* Left Title & Avatar */}
          <div 
            onClick={() => setIsContactInfoOpen((prev) => !prev)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              className="show-on-mobile"
              style={{
                background: 'none', border: 'none', color: 'var(--wa-text-primary)',
                fontSize: '22px', cursor: 'pointer', padding: '4px 6px 4px 0',
                alignItems: 'center', justifyContent: 'center'
              }}
              title="Back to Chats"
            >
              ←
            </button>

            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: 'var(--wa-accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'white',
              fontWeight: 'bold', flexShrink: 0
            }}>
              {activeChat.is_group ? '👥' : getChatTitle()[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ color: 'var(--wa-text-primary)', fontWeight: '600', fontSize: '16px' }}>
                {getChatTitle()}
              </div>
              <div style={{ color: isTyping ? 'var(--wa-accent)' : 'var(--wa-text-muted)', fontSize: '12px', fontWeight: isTyping ? 'bold' : 'normal' }}>
                {isTyping ? 'typing...' : activeChat.is_group ? `${activeChat.participants?.length || 0} participants` : 'online'}
              </div>
            </div>
          </div>

          {/* Right Header Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!activeChat.is_group && (
              <>
                <button
                  onClick={() => startCall(false)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--wa-text-primary)',
                    fontSize: '20px', cursor: 'pointer', padding: '6px', borderRadius: '50%'
                  }}
                  title="Voice Call"
                >
                  📞
                </button>
                <button
                  onClick={() => startCall(true)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--wa-text-primary)',
                    fontSize: '20px', cursor: 'pointer', padding: '6px', borderRadius: '50%'
                  }}
                  title="Video Call"
                >
                  📹
                </button>
              </>
            )}

            <button
              onClick={() => setIsContactInfoOpen((prev) => !prev)}
              style={{
                background: 'none', border: 'none', color: 'var(--wa-text-primary)',
                fontSize: '18px', cursor: 'pointer', padding: '6px', borderRadius: '50%'
              }}
              title="Search in chat"
            >
              🔍
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                style={{
                  background: 'none', border: 'none', color: 'var(--wa-text-primary)',
                  fontSize: '20px', cursor: 'pointer', padding: '6px', borderRadius: '50%'
                }}
                title="Menu"
              >
                ⋮
              </button>

              {isHeaderMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  right: '0',
                  backgroundColor: '#233138',
                  borderRadius: '8px',
                  padding: '8px 0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 500,
                  width: '180px',
                  border: '1px solid var(--wa-border)'
                }}>
                  <div 
                    onClick={() => { setIsContactInfoOpen(true); setIsHeaderMenuOpen(false); }}
                    style={{ padding: '10px 16px', color: 'var(--wa-text-primary)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>ℹ️</span> Contact info
                  </div>
                  <div 
                    onClick={() => { setConfirmModalType('clear'); setIsHeaderMenuOpen(false); }}
                    style={{ padding: '10px 16px', color: 'var(--wa-text-primary)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>🧹</span> Clear chat
                  </div>
                  <div 
                    onClick={() => { setConfirmModalType('delete'); setIsHeaderMenuOpen(false); }}
                    style={{ padding: '10px 16px', color: '#ea4335', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>🗑️</span> Delete chat
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Messages Scroll Area */}
      <div 
        onClick={() => {
          setActiveMenuMsgId(null);
          setActiveReactionMsgId(null);
        }}
        style={{
          flex: 1, overflowY: 'auto', padding: '16px 24px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          backgroundImage: 'radial-gradient(var(--wa-border) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--wa-text-muted)', marginTop: '20px' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--wa-text-muted)', margin: 'auto' }}>
            No messages here yet. Say hello! 👋
          </div>
        ) : (
          messages.map((msg, idx) => {
            const senderId = typeof msg.sender === 'object' && msg.sender !== null
              ? msg.sender.id
              : (msg.sender_id ?? msg.senderId ?? msg.sender);
            const currentUserId = user?.id;
            const isMe = Boolean(senderId && currentUserId && String(senderId) === String(currentUserId));

            const rawDate = msg.created_at || msg.createdAt || msg.timestamp;
            const formattedTime = formatTimestamp(rawDate);

            const mediaUrl = msg.media_url || msg.mediaUrl;
            const mediaType = msg.media_type || msg.type || 'text';

            const isDeleted = Boolean(msg.is_deleted || msg.isDeleted);
            const isEdited = Boolean(msg.is_edited || msg.isEdited);
            const isEditingThis = editingMsgId === msg.id;
            const isMenuOpenThis = activeMenuMsgId === msg.id;
            const isReactionOpenThis = activeReactionMsgId === msg.id;

            const replyObj = msg.reply_to || msg.replyTo;

            return (
              <div
                key={msg.id || `msg-${idx}`}
                className="wa-message-bubble"
                onTouchStart={() => handleTouchStart(msg.id)}
                onTouchEnd={handleTouchEnd}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  minWidth: '150px',
                  backgroundColor: isMe ? '#005c4b' : '#202c33',
                  color: 'var(--wa-text-primary)',
                  padding: '8px 28px 6px 12px',
                  borderRadius: isMe ? '8px 0px 8px 8px' : '0px 8px 8px 8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  position: 'relative'
                }}
              >
                {/* Floating Quick Reaction Bar */}
                {isReactionOpenThis && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '-42px',
                      right: isMe ? '0' : 'auto',
                      left: isMe ? 'auto' : '0',
                      backgroundColor: '#233138',
                      borderRadius: '20px',
                      padding: '4px 8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      border: '1px solid #2a3942',
                      display: 'flex',
                      gap: '6px',
                      zIndex: 120
                    }}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReaction(msg.id, emoji);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '50%',
                          transition: 'transform 0.15s'
                        }}
                        onMouseEnter={(e) => (e.target.style.transform = 'scale(1.35)')}
                        onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Top-Right Always Visible Chevron Down Arrow (v) Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuMsgId(isMenuOpenThis ? null : msg.id);
                    setActiveReactionMsgId(null);
                  }}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: '#233138',
                    border: '1px solid #2a3942',
                    color: '#e9edef',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                    opacity: 1
                  }}
                  title="Message Options"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>

                {/* Context Action Menu Dropdown Window */}
                {isMenuOpenThis && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '26px',
                      right: '4px',
                      backgroundColor: '#233138',
                      border: '1px solid #2a3942',
                      borderRadius: '8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      minWidth: '150px',
                      padding: '4px 0'
                    }}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetReply(msg);
                      }}
                      style={{ padding: '8px 14px', fontSize: '13px', color: '#e9edef', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      ↩️ Reply
                    </div>

                    {!isDeleted && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReactionMsgId(msg.id);
                          setActiveMenuMsgId(null);
                        }}
                        style={{ padding: '8px 14px', fontSize: '13px', color: '#e9edef', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        😀 React
                      </div>
                    )}

                    {isMe && !isDeleted && (
                      <>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(msg);
                          }}
                          style={{ padding: '8px 14px', fontSize: '13px', color: '#e9edef', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #2a3942' }}
                        >
                          ✏️ Edit
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMsg(msg.id);
                          }}
                          style={{ padding: '8px 14px', fontSize: '13px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          🗑️ Delete
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Group Sender Badge */}
                {!isMe && activeChat.is_group && (
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--wa-accent)', marginBottom: '4px' }}>
                    {msg.sender_name || msg.sender?.username}
                  </div>
                )}

                {/* Quoted Message Preview inside bubble */}
                {replyObj && (
                  <div style={{
                    backgroundColor: 'rgba(0,0,0,0.25)', borderLeft: '3px solid var(--wa-accent)',
                    padding: '6px 10px', borderRadius: '4px', marginBottom: '6px', fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--wa-accent)' }}>
                      {replyObj.sender_name || replyObj.sender?.username || 'Replied Message'}
                    </div>
                    <div style={{ color: 'var(--wa-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {replyObj.content || '📎 Media Attachment'}
                    </div>
                  </div>
                )}

                {/* Media Content */}
                {!isDeleted && mediaUrl && (
                  <div style={{ marginBottom: '6px' }}>
                    {mediaType === 'image' ? (
                      <img src={mediaUrl} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '240px', objectFit: 'cover', display: 'block' }} />
                    ) : mediaType === 'video' ? (
                      <video controls src={mediaUrl} style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '240px', display: 'block' }} />
                    ) : mediaType === 'audio' ? (
                      <audio controls src={mediaUrl} style={{ width: '220px' }} />
                    ) : (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                        padding: '8px 12px', marginBottom: '4px'
                      }}>
                        <span style={{ fontSize: '22px' }}>
                          {mediaType === 'document' ? '📄' : '📎'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', color: '#e9edef', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.content && msg.content.startsWith('[file:') 
                              ? msg.content.replace('[file:', '').replace(']', '') 
                              : (mediaUrl.split('/').pop() || 'File')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8696a0' }}>{mediaType === 'document' ? 'Document' : 'File'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadMedia(e, mediaUrl, msg.content && msg.content.startsWith('[file:') ? msg.content.replace('[file:', '').replace(']', '') : (mediaUrl.split('/').pop() || 'Document'))}
                          style={{
                            backgroundColor: '#00a884', color: '#111b21',
                            border: 'none', borderRadius: '6px', padding: '5px 10px',
                            fontSize: '12px', fontWeight: 'bold',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            flexShrink: 0
                          }}
                        >
                          ⬇ Download
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Text Content / Edit Input Mode */}
                {isEditingThis ? (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}
                  >
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(msg.id);
                        } else if (e.key === 'Escape') {
                          setEditingMsgId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        backgroundColor: 'var(--wa-bg-input)', border: '1px solid var(--wa-accent)',
                        borderRadius: '4px', padding: '6px 10px', color: '#e9edef', fontSize: '14px', outline: 'none'
                      }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMsgId(null);
                        }}
                        style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit(msg.id);
                        }}
                        style={{ backgroundColor: '#00a884', border: 'none', borderRadius: '4px', color: '#111b21', fontWeight: 'bold', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {isDeleted ? (
                      <div style={{ fontStyle: 'italic', color: '#8696a0', paddingRight: '12px' }}>
                        🚫 This message was deleted
                      </div>
                    ) : (
                      Boolean(msg.content && !msg.content.startsWith('[file:') && !msg.content.startsWith('[image:') && !msg.content.startsWith('[video:') && !msg.content.startsWith('[audio:')) && (
                        <div style={{ fontStyle: 'normal', color: 'inherit', paddingRight: '12px' }}>
                          {renderStructuredMessage(msg.content)}
                        </div>
                      )
                    )}
                  </>
                )}

                {/* Timestamp, Edited Badge & Ticks */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                  marginTop: '4px', gap: '4px', fontSize: '10px', color: '#8696a0'
                }}>
                  {isEdited && !isDeleted && <span style={{ fontStyle: 'italic', marginRight: '2px' }}>(edited)</span>}
                  <span>{formattedTime}</span>
                  {isMe && renderTick(msg.status)}
                </div>

                {/* Emoji Reaction Badges (Positioned at bottom-left corner of message bubble) */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      bottom: '-14px',
                      left: '10px',
                      backgroundColor: '#233138',
                      border: '1px solid #2a3942',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                      zIndex: 20
                    }}
                  >
                    {Array.from(new Set(msg.reactions.map((r) => r.emoji))).join(' ')}
                    {msg.reactions.length > 1 && (
                      <span style={{ fontSize: '10px', color: '#8696a0', marginLeft: '2px', fontWeight: 'bold' }}>
                        {msg.reactions.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quoted Reply Banner */}
      {replyingTo && (
        <div style={{
          backgroundColor: 'var(--wa-bg-panel)', borderLeft: '4px solid var(--wa-accent)',
          padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid var(--wa-border)'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--wa-accent)' }}>
              Replying to {replyingTo.sender_name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--wa-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
              {replyingTo.content}
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setReplyingTo(null)} 
            style={{ background: 'none', border: 'none', color: 'var(--wa-text-muted)', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Message Input Bar */}
      <form 
        onSubmit={(e) => handleSend(e)} 
        className="wa-chat-footer"
        style={{
          height: '62px', backgroundColor: 'var(--wa-bg-panel)',
          padding: '0 16px', display: 'flex', alignItems: 'center',
          gap: '12px', borderTop: '1px solid var(--wa-border)',
          flexShrink: 0, zIndex: 10
        }}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: 'none', border: 'none', color: 'var(--wa-text-secondary)',
            fontSize: '20px', cursor: 'pointer', padding: '6px'
          }}
          title="Attach Media or File"
        >
          📎
        </button>

        <input
          type="text"
          placeholder={replyingTo ? `Replying to ${replyingTo.sender_name}...` : uploading ? 'Uploading media...' : 'Type a message'}
          value={inputText}
          onChange={handleInputChange}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: '8px',
            border: 'none', backgroundColor: 'var(--wa-bg-input)',
            color: 'var(--wa-text-primary)', fontSize: '14px', outline: 'none'
          }}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || uploading}
          style={{
            backgroundColor: 'var(--wa-accent)', border: 'none',
            borderRadius: '50%', width: '42px', height: '42px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: inputText.trim() ? 'pointer' : 'default',
            opacity: inputText.trim() ? 1 : 0.5, transition: 'all 0.2s'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    </div>

    {/* Right Side Contact Info Panel */}
    <ContactInfoSidebar
      isOpen={isContactInfoOpen}
      onClose={() => setIsContactInfoOpen(false)}
      activeChat={activeChat}
      messages={messages}
      user={user}
      onClearChat={() => setConfirmModalType('clear')}
      onDeleteChat={() => setConfirmModalType('delete')}
    />

    {/* Clear/Delete Chat Confirmation Modal */}
    {confirmModalType && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}>
        <div style={{
          backgroundColor: '#233138', padding: '24px', borderRadius: '12px',
          maxWidth: '380px', width: '90%', border: '1px solid var(--wa-border)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
        }}>
          <h3 style={{ color: 'var(--wa-text-primary)', margin: '0 0 12px 0', fontSize: '18px' }}>
            {confirmModalType === 'clear' ? 'Clear this chat?' : 'Delete this chat?'}
          </h3>
          <p style={{ color: 'var(--wa-text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: '0 0 24px 0' }}>
            {confirmModalType === 'clear' 
              ? 'Are you sure you want to clear all messages in this chat? Messages will be deleted permanently.'
              : 'Are you sure you want to delete this chat? This chat and all its messages will be deleted.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setConfirmModalType(null)}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--wa-border)',
                backgroundColor: 'transparent', color: 'var(--wa-text-primary)', cursor: 'pointer', fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmModalType === 'clear' ? handleClearChat : handleDeleteChat}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                backgroundColor: '#ea4335', color: 'white', cursor: 'pointer', fontWeight: '600'
              }}
            >
              {confirmModalType === 'clear' ? 'Clear chat' : 'Delete chat'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
