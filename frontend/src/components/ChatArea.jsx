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
  createChat 
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

  // Quoted Reply State
  const [replyingTo, setReplyingTo] = useState(null);

  // Edit Message State
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');

  // Dropdown Context Menu State
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);

  // Reaction Bar Floating State (per message ID)
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);

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
    setLoading(true);
    try {
      const msgs = await fetchMessages(chatId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
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

  const handleSend = async (e, mediaUrl = null, mediaType = null) => {
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

    // Optimistic UI update
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

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (String(m.id) === String(msgId) ? { ...m, content: 'This message was deleted', isDeleted: true, is_deleted: true, mediaUrl: null, media_url: null } : m))
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
            const existing = m.reactions || [];
            const hasEmoji = existing.some((r) => String(r.user_id || r.userId) === String(user?.id) && r.emoji === emoji);
            const filtered = existing.filter((r) => String(r.user_id || r.userId) !== String(user?.id));
            const newReactions = hasEmoji ? filtered : [...filtered, { user_id: user?.id, emoji }];
            return { ...m, reactions: newReactions };
          }
          return m;
        })
      );

      await apiAddReaction(msgId, emoji);
      const socket = socketService.getSocket();
      if (socket && activeChat) {
        socket.emit('send_reaction', {
          messageId: msgId,
          chatId: activeChat.id,
          emoji,
        });
      }
    } catch (err) {
      console.error('Failed to add reaction:', err);
    } finally {
      setActiveReactionMsgId(null);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const uploaded = await uploadMedia(reader.result, file.name, file.type);
        await handleSend(null, uploaded.url, uploaded.type);
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
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

            <button
              onClick={() => setIsContactInfoOpen((prev) => !prev)}
              style={{
                background: 'none', border: 'none', color: 'var(--wa-text-primary)',
                fontSize: '20px', cursor: 'pointer', padding: '6px', borderRadius: '50%'
              }}
              title="Contact Info"
            >
              ⋮
            </button>
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
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  minWidth: '140px',
                  backgroundColor: isMe ? '#005c4b' : '#202c33',
                  color: 'var(--wa-text-primary)',
                  padding: '8px 26px 6px 12px',
                  borderRadius: isMe ? '8px 0px 8px 8px' : '0px 8px 8px 8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  position: 'relative'
                }}
              >
                {/* Floating Quick Reaction Bar (Attached directly above the bubble) */}
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

                {/* Top-Right Small Chevron Down Triangle/Arrow (v) Button */}
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
                    background: 'none',
                    border: 'none',
                    color: '#aebac1',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 5
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
                      top: '24px',
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
                      <img src={mediaUrl} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '240px', objectFit: 'cover' }} />
                    ) : mediaType === 'video' ? (
                      <video controls src={mediaUrl} style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '240px' }} />
                    ) : mediaType === 'audio' ? (
                      <audio controls src={mediaUrl} style={{ width: '220px' }} />
                    ) : (
                      <a href={mediaUrl} download style={{ color: 'var(--wa-accent)', fontSize: '13px', textDecoration: 'underline' }}>
                        📎 Download Attachment
                      </a>
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
                  <div style={{ fontStyle: isDeleted ? 'italic' : 'normal', color: isDeleted ? '#8696a0' : 'inherit', paddingRight: '12px' }}>
                    {isDeleted ? '🚫 This message was deleted' : renderStructuredMessage(msg.content)}
                  </div>
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

                {/* Emoji Reaction Badges (Positioned cleanly at bottom-right corner) */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div style={{
                    position: 'absolute', bottom: '-10px', right: isMe ? 'auto' : '8px', left: isMe ? '8px' : 'auto',
                    backgroundColor: '#233138', border: '1px solid #2a3942',
                    borderRadius: '12px', padding: '1px 6px', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    display: 'flex', gap: '2px', alignItems: 'center'
                  }}>
                    {Array.from(new Set(msg.reactions.map((r) => r.emoji))).join(' ')}
                    {msg.reactions.length > 1 && (
                      <span style={{ fontSize: '10px', color: '#8696a0', marginLeft: '2px' }}>
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
    />
  </div>
  );
}
