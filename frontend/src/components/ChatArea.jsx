import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/useCall';
import { 
  fetchMessages, 
  sendMessage as apiSendMessage, 
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  deleteMessageForMe as apiDeleteMessageForMe,
  deleteMessageForEveryone as apiDeleteMessageForEveryone,
  addReaction as apiAddReaction, 
  markAsRead as apiMarkAsRead, 
  uploadMedia, 
  askMetaAi, 
  createChat,
  searchUsers,
  clearChat as apiClearChat,
  deleteChat as apiDeleteChat
} from '../services/api';
import { socketService } from '../services/socket';
import ContactInfoSidebar from './ContactInfoSidebar';
import { formatTimestamp } from '../utils/dateUtils';
import { getEnv } from '../utils/env';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatArea({ activeChat, onMessageSent, onMessagesRead, onSelectChat, onBack }) {
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Header 3-Dots Menu & Confirmation Modal State
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [confirmModalType, setConfirmModalType] = useState(null); // 'clear' | 'delete' | null

  // Full Screen Media Preview Lightbox State
  const [previewMedia, setPreviewMedia] = useState(null); // { url, type, name, sender, time }
  const [zoomLevel, setZoomLevel] = useState(1);

  // Quoted Reply State
  const [replyingTo, setReplyingTo] = useState(null);

  // Edit Message State
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');

  // Dropdown Context Menu State
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);

  // Reaction Bar Floating State (per message ID)
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);

  // File Upload & Attachment Popover States
  const [uploading, setUploading] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const attachmentMenuRef = useRef(null);
  const touchTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const stickerInputRef = useRef(null);

  // Camera Live Feed & Snapshot States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraCaption, setCameraCaption] = useState('');
  const cameraVideoRef = useRef(null);

  // Send Contacts Modal States (Screenshots 3 & 4)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactsList, setContactsList] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [loadingContactsModal, setLoadingContactsModal] = useState(false);

  // Poll Modal & Voting States (Screenshots 4 & 5)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(true);

  // Event Modal States (Screenshots 1 & 2)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('11:00');
  const [eventIncludeEndTime, setEventIncludeEndTime] = useState(false);
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventEndTime, setEventEndTime] = useState('12:00');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCallLink, setEventCallLink] = useState(false);

  // Contact Info Sidebar State
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const headerMenuRef = useRef(null);

  // Stop camera tracks on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 1. Header 3-Dots Dropdown Menu
      if (isHeaderMenuOpen && headerMenuRef.current && !headerMenuRef.current.contains(event.target)) {
        setIsHeaderMenuOpen(false);
      }

      // 2. Attachment Popover Menu
      if (isAttachmentMenuOpen && attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        const isAttachmentBtn = event.target.closest('.wa-attachment-btn');
        if (!isAttachmentBtn) {
          setIsAttachmentMenuOpen(false);
        }
      }

      // 3. Message Options Dropdown Menu / Floating Reaction Bar
      if (activeMenuMsgId || activeReactionMsgId) {
        const isInsideMsgMenu = event.target.closest('.wa-msg-context-menu') || event.target.closest('.wa-msg-options-btn');
        if (!isInsideMsgMenu) {
          setActiveMenuMsgId(null);
          setActiveReactionMsgId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHeaderMenuOpen, isAttachmentMenuOpen, activeMenuMsgId, activeReactionMsgId]);

  // Camera Handlers
  const startCamera = async () => {
    setIsAttachmentMenuOpen(false);
    setCapturedPhoto(null);
    setCameraCaption('');
    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      alert('Camera access denied or unavailable: ' + (err.message || 'Please check browser permissions'));
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCapturedPhoto(null);
    setCameraCaption('');
  };

  const takeCameraPhoto = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(dataUrl);

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const retakeCameraPhoto = () => {
    startCamera();
  };

  const sendCameraPhoto = async () => {
    if (!capturedPhoto) return;
    setUploading(true);

    try {
      const res = await fetch(capturedPhoto);
      const blob = await res.blob();
      const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      const uploaded = await uploadMedia(file);
      const mediaUrl = uploaded.mediaUrl || uploaded.url;
      const mediaType = 'image';

      stopCamera();
      const captionText = cameraCaption.trim();
      await handleSend(null, mediaUrl, mediaType, file.name);
    } catch (err) {
      console.error('Failed to send camera photo:', err);
      alert('Failed to send photo: ' + (err.message || 'Error'));
    } finally {
      setUploading(false);
    }
  };

  // Contact Modal Handlers (Screenshots 3 & 4)
  const handleOpenContactModal = async () => {
    setIsAttachmentMenuOpen(false);
    setSelectedContacts([]);
    setContactSearchQuery('');
    setIsContactModalOpen(true);
    setLoadingContactsModal(true);

    try {
      const users = await searchUsers('');
      setContactsList(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error('Failed to search contacts:', err);
    } finally {
      setLoadingContactsModal(false);
    }
  };

  const handleSearchContactsModal = async (e) => {
    const q = e.target.value;
    setContactSearchQuery(q);
    setLoadingContactsModal(true);
    try {
      const users = await searchUsers(q);
      setContactsList(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error('Failed to search contacts:', err);
    } finally {
      setLoadingContactsModal(false);
    }
  };

  const toggleSelectContact = (u) => {
    setSelectedContacts((prev) => {
      const exists = prev.some((c) => String(c.id) === String(u.id));
      if (exists) {
        return prev.filter((c) => String(c.id) !== String(u.id));
      } else {
        return [...prev, u];
      }
    });
  };

  const handleSendSelectedContacts = async () => {
    if (selectedContacts.length === 0 || !activeChat) return;

    const contactsToSend = [...selectedContacts];
    setIsContactModalOpen(false);
    setSelectedContacts([]);

    const socket = socketService.getSocket() || socketService.connect(user?.id);

    for (const cUser of contactsToSend) {
      try {
        const contactData = {
          id: cUser.id,
          username: cUser.username,
          email: cUser.email,
          avatar_url: cUser.avatar_url,
          status_message: cUser.status_message
        };
        const contentStr = `[contact:${JSON.stringify(contactData)}]`;
        const newMsg = await apiSendMessage(activeChat.id, contentStr, null, null, 'contact');

        if (newMsg) {
          setMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(newMsg.id))) return prev;
            return [...prev, newMsg];
          });
          if (socket) socket.emit('send_message', newMsg);
        }
      } catch (err) {
        console.error('Failed to send contact card:', err);
      }
    }
    if (onMessageSent) onMessageSent();
  };

  const handleSelectContactCardUser = async (contactObj) => {
    if (!contactObj || !contactObj.id) return;
    try {
      const res = await createChat([contactObj.id], false);
      const newChatId = res?.id || res?.chat?.id || res?.conversation?.id || res?.chat_id;
      if (newChatId) {
        if (onSelectChat) {
          onSelectChat(newChatId, contactObj);
        } else if (onMessageSent) {
          onMessageSent();
        }
      }
    } catch (err) {
      console.error('Failed to start chat with contact card user:', err);
    }
  };

  // Poll Handlers (Screenshots 4 & 5)
  const handleOpenPollModal = () => {
    setIsAttachmentMenuOpen(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollAllowMultiple(true);
    setIsPollModalOpen(true);
  };

  const handlePollOptionChange = (index, value) => {
    setPollOptions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      if (index === updated.length - 1 && value.trim() !== '') {
        updated.push('');
      }
      return updated;
    });
  };

  const handleSendPoll = async () => {
    if (!pollQuestion.trim() || !activeChat) return;
    const validOptions = pollOptions.filter((opt) => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert('Please add at least 2 poll options');
      return;
    }

    const pollData = {
      id: `poll_${Date.now()}`,
      question: pollQuestion.trim(),
      options: validOptions.map((opt, i) => ({
        id: i + 1,
        text: opt.trim(),
        votes: []
      })),
      allow_multiple: pollAllowMultiple
    };

    setIsPollModalOpen(false);

    try {
      const contentStr = `[poll:${JSON.stringify(pollData)}]`;
      const newMsg = await apiSendMessage(activeChat.id, contentStr, null, null, 'poll');

      if (newMsg) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(newMsg.id))) return prev;
          return [...prev, newMsg];
        });
        const socket = socketService.getSocket() || socketService.connect(user?.id);
        if (socket) socket.emit('send_message', newMsg);
      }
      if (onMessageSent) onMessageSent();
    } catch (err) {
      console.error('Failed to send poll:', err);
      alert('Failed to send poll: ' + (err.message || 'Error'));
    }
  };

  const handleVotePollOption = async (msgId, pollData, optionId) => {
    if (!user || !activeChat) return;

    const currentUserId = user.id;
    const updatedOptions = pollData.options.map((opt) => {
      const currentVotes = Array.isArray(opt.votes) ? opt.votes : [];
      const hasVoted = currentVotes.some((uid) => String(uid) === String(currentUserId));

      if (opt.id === optionId) {
        const newVotes = hasVoted
          ? currentVotes.filter((uid) => String(uid) !== String(currentUserId))
          : [...currentVotes, currentUserId];
        return { ...opt, votes: newVotes };
      } else {
        if (!pollData.allow_multiple && !hasVoted) {
          const filtered = currentVotes.filter((uid) => String(uid) !== String(currentUserId));
          return { ...opt, votes: filtered };
        }
        return opt;
      }
    });

    const updatedPollData = { ...pollData, options: updatedOptions };
    const updatedContent = `[poll:${JSON.stringify(updatedPollData)}]`;

    setMessages((prevMsgs) =>
      prevMsgs.map((m) => (String(m.id) === String(msgId) ? { ...m, content: updatedContent } : m))
    );

    try {
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        socket.emit('send_message', {
          id: msgId,
          chatId: activeChat.id,
          content: updatedContent
        });
      }
      await apiEditMessage(msgId, updatedContent);
    } catch (err) {
      console.error('Failed to update poll vote:', err);
    }
  };

  // Event Handlers (Screenshots 1 & 2)
  const handleOpenEventModal = () => {
    setIsAttachmentMenuOpen(false);
    setEventName('');
    setEventDescription('');
    const today = new Date().toISOString().split('T')[0];
    setEventStartDate(today);
    setEventStartTime('11:00');
    setEventIncludeEndTime(false);
    setEventEndDate(today);
    setEventEndTime('12:00');
    setEventLocation('');
    setEventCallLink(false);
    setIsEventModalOpen(true);
  };

  const handleSendEvent = async () => {
    if (!eventName.trim() || !activeChat) return;

    const eventData = {
      id: `event_${Date.now()}`,
      name: eventName.trim(),
      description: eventDescription.trim(),
      start_date: eventStartDate,
      start_time: eventStartTime,
      include_end_time: eventIncludeEndTime,
      end_date: eventEndDate,
      end_time: eventEndTime,
      location: eventLocation.trim(),
      call_link: eventCallLink
    };

    setIsEventModalOpen(false);

    try {
      const contentStr = `[event:${JSON.stringify(eventData)}]`;
      const newMsg = await apiSendMessage(activeChat.id, contentStr, null, null, 'event');

      if (newMsg) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(newMsg.id))) return prev;
          return [...prev, newMsg];
        });
        const socket = socketService.getSocket() || socketService.connect(user?.id);
        if (socket) socket.emit('send_message', newMsg);
      }
      if (onMessageSent) onMessageSent();
    } catch (err) {
      console.error('Failed to send event:', err);
      alert('Failed to send event: ' + (err.message || 'Error'));
    }
  };

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

  const handleDeleteMsgForMe = async (msgId) => {
    setActiveMenuMsgId(null);

    setMessages((prev) => prev.filter((m) => String(m.id) !== String(msgId)));

    try {
      await apiDeleteMessageForMe(msgId);
    } catch (err) {
      console.error('Failed to delete message for me:', err);
    }
  };

  const handleDeleteMsgForEveryone = async (msgId) => {
    setActiveMenuMsgId(null);

    setMessages((prev) =>
      prev.map((m) => (String(m.id) === String(msgId) ? { ...m, content: 'This message was deleted', isDeleted: true, is_edited: false, is_deleted: true, mediaUrl: null, media_url: null } : m))
    );

    try {
      await apiDeleteMessageForEveryone(msgId);
      const socket = socketService.getSocket();
      if (socket && activeChat) {
        socket.emit('delete_message', { messageId: msgId, chatId: activeChat.id });
      }
    } catch (err) {
      console.error('Failed to delete message for everyone:', err);
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
      if (activeChat) {
        activeChat.last_message = null;
      }
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
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (!url) return;

    const resolveFileName = (rawName, mimeType) => {
      let ext = '';
      try {
        const cleanUrl = url.split('?')[0].split('#')[0];
        const lastDot = cleanUrl.lastIndexOf('.');
        if (lastDot !== -1 && lastDot > cleanUrl.lastIndexOf('/')) {
          const candidate = cleanUrl.slice(lastDot + 1).toLowerCase();
          if (candidate.length >= 2 && candidate.length <= 5) {
            ext = '.' + candidate;
          }
        }
      } catch (err) {}

      if (!ext && mimeType) {
        if (mimeType.includes('png')) ext = '.png';
        else if (mimeType.includes('gif')) ext = '.gif';
        else if (mimeType.includes('webp')) ext = '.webp';
        else if (mimeType.includes('svg')) ext = '.svg';
        else if (mimeType.includes('mp4')) ext = '.mp4';
        else if (mimeType.includes('pdf')) ext = '.pdf';
        else ext = '.jpg';
      }

      if (!ext) ext = '.jpg';

      let name = rawName || url.split('?')[0].split('/').pop() || 'photo';
      if (name.startsWith('[file:') || name.startsWith('[image:') || name.startsWith('[video:')) {
        name = name.replace(/^\[[a-z]+:/, '').replace(/\]$/, '');
      }

      name = name.replace(/\.(jpg|jpeg|png|gif|webp|mp4|pdf)$/i, '');
      return `${name}${ext}`;
    };

    const triggerBlobDownload = (blob, downloadName) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 10000);
    };

    // Build clean target URL & upgrade insecure http to https for remote domains
    let targetUrl = url;
    if (targetUrl.startsWith('/')) {
      const apiBase = getEnv('VITE_API_URL') || getEnv('NEXT_PUBLIC_API_URL') || '';
      targetUrl = apiBase ? `${apiBase.replace(/\/$/, '')}${url}` : `${window.location.origin}${url}`;
    } else if (targetUrl.startsWith('http://') && !targetUrl.includes('localhost') && !targetUrl.includes('127.0.0.1')) {
      targetUrl = targetUrl.replace('http://', 'https://');
    }

    // 1. Data URLs
    if (targetUrl.startsWith('data:')) {
      try {
        const mime = targetUrl.split(';')[0].slice(5);
        const name = resolveFileName(fileName, mime);
        const parts = targetUrl.split(',');
        const byteString = atob(parts[1]);
        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ia], { type: mime || 'image/jpeg' });
        triggerBlobDownload(blob, name);
        return;
      } catch (err) {}
    }

    // 2. Blob URLs
    if (targetUrl.startsWith('blob:')) {
      const name = resolveFileName(fileName, 'image/jpeg');
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 1000);
      return;
    }

    // 3. Direct Fetch as Blob (Same-Origin or CORS Enabled)
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0 && !blob.type.includes('html')) {
          const name = resolveFileName(fileName, blob.type);
          triggerBlobDownload(blob, name);
          return;
        }
      }
    } catch (err) {
      console.warn('Direct fetch failed, trying backend proxy:', err);
    }

    // 4. Backend Proxy Fetch as Blob (Bypasses CORS restrictions)
    try {
      let apiBase = getEnv('VITE_API_URL') || getEnv('NEXT_PUBLIC_API_URL');
      if (!apiBase && targetUrl.startsWith('http')) {
        try {
          apiBase = new URL(targetUrl).origin;
        } catch (e) {}
      }
      if (!apiBase) apiBase = 'https://whatsapp-backend-ea92.onrender.com';

      const cleanApiBase = apiBase.replace(/\/$/, '');
      const downloadName = resolveFileName(fileName, 'image/jpeg');
      const proxyUrl = `${cleanApiBase}/api/download?url=${encodeURIComponent(targetUrl)}&name=${encodeURIComponent(downloadName)}`;
      
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0 && !blob.type.includes('html')) {
          triggerBlobDownload(blob, downloadName);
          return;
        }
      }
    } catch (err) {
      console.warn('Proxy fetch failed, trying HTML5 Canvas extraction:', err);
    }

    // 5. HTML5 Canvas extraction to Blob
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
              const name = resolveFileName(fileName, 'image/jpeg');
              triggerBlobDownload(blob, name);
            }
          }, 'image/jpeg', 0.95);
        } catch (canvasErr) {}
      };
      img.src = targetUrl;
    } catch (err) {}
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
    if (!otherParticipant) {
      return `${user?.username || 'You'} (You)`;
    }
    return otherParticipant.username || 'Chat';
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

            <div ref={headerMenuRef} style={{ position: 'relative' }}>
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

            let contactObj = null;
            let pollObj = null;
            let eventObj = null;

            if (msg.content && msg.content.startsWith('[contact:')) {
              try {
                contactObj = JSON.parse(msg.content.slice(9, -1));
              } catch (e) {}
            } else if ((msg.media_type === 'contact' || msg.type === 'contact') && msg.content) {
              try {
                contactObj = JSON.parse(msg.content);
              } catch (e) {}
            }

            if (msg.content && msg.content.startsWith('[poll:')) {
              try {
                pollObj = JSON.parse(msg.content.slice(6, -1));
              } catch (e) {}
            } else if ((msg.media_type === 'poll' || msg.type === 'poll') && msg.content) {
              try {
                pollObj = JSON.parse(msg.content);
              } catch (e) {}
            }

            if (msg.content && msg.content.startsWith('[event:')) {
              try {
                eventObj = JSON.parse(msg.content.slice(7, -1));
              } catch (e) {}
            } else if ((msg.media_type === 'event' || msg.type === 'event') && msg.content) {
              try {
                eventObj = JSON.parse(msg.content);
              } catch (e) {}
            }

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
                {/* Contact Card Bubble (Matches Screenshot 5) */}
                {contactObj && !isDeleted && (
                  <div
                    style={{
                      backgroundColor: isMe ? '#004c3e' : '#1f2c34',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      minWidth: '230px',
                      marginBottom: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '50%',
                        backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'white', fontWeight: 'bold',
                        fontSize: '18px', overflow: 'hidden', flexShrink: 0
                      }}>
                        {contactObj.avatar_url ? (
                          <img src={contactObj.avatar_url} alt={contactObj.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (contactObj.username || 'C')[0]?.toUpperCase()
                        )}
                      </div>

                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ color: '#e9edef', fontWeight: '600', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {contactObj.username}
                        </div>
                        <div style={{ color: '#8696a0', fontSize: '12px' }}>
                          {contactObj.email || parseStatusMessage(contactObj.status_message) || 'WhatsApp Contact'}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.12)', margin: '0 0 8px 0' }} />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectContactCardUser(contactObj);
                      }}
                      style={{
                        width: '100%', padding: '6px 0', border: 'none',
                        backgroundColor: 'transparent', color: '#00a884',
                        fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                        textAlign: 'center', borderRadius: '6px'
                      }}
                    >
                      Message
                    </button>
                  </div>
                )}

                {/* Poll Bubble (Matches Screenshot 5) */}
                {pollObj && !isDeleted && (
                  <div
                    style={{
                      backgroundColor: isMe ? '#004c3e' : '#1f2c34',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      minWidth: '260px',
                      maxWidth: '340px',
                      marginBottom: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    {/* Question Title */}
                    <div style={{ color: '#e9edef', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px', wordBreak: 'break-word' }}>
                      {pollObj.question}
                    </div>

                    {/* Subtitle / Vote Type */}
                    <div style={{ color: '#8696a0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#8696a0">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      </svg>
                      {pollObj.allow_multiple ? 'Select one or more' : 'Select one'}
                    </div>

                    {/* Poll Options List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
                      {pollObj.options.map((opt) => {
                        const votes = Array.isArray(opt.votes) ? opt.votes : [];
                        const voteCount = votes.length;
                        const hasUserVoted = votes.some((uid) => String(uid) === String(user?.id));
                        const totalVotes = pollObj.options.reduce((sum, o) => sum + (Array.isArray(o.votes) ? o.votes.length : 0), 0);
                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                        return (
                          <div
                            key={opt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVotePollOption(msg.id, pollObj, opt.id);
                            }}
                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e9edef', fontSize: '14px' }}>
                                <div style={{
                                  width: '18px', height: '18px', borderRadius: '50%',
                                  border: hasUserVoted ? '2px solid #00a884' : '2px solid #8696a0',
                                  backgroundColor: hasUserVoted ? '#00a884' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0, transition: 'all 0.15s'
                                }}>
                                  {hasUserVoted && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />}
                                </div>
                                <span style={{ fontWeight: hasUserVoted ? '600' : 'normal' }}>{opt.text}</span>
                              </div>

                              <span style={{ color: '#8696a0', fontSize: '13px', fontWeight: '500' }}>
                                {voteCount}
                              </span>
                            </div>

                            <div style={{
                              height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              borderRadius: '4px', overflow: 'hidden', width: '100%', marginTop: '2px'
                            }}>
                              <div style={{
                                height: '100%', width: `${percentage}%`,
                                backgroundColor: '#00a884', borderRadius: '4px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '10px 0' }} />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Total Votes: ${pollObj.options.reduce((sum, o) => sum + (Array.isArray(o.votes) ? o.votes.length : 0), 0)}`);
                      }}
                      style={{
                        width: '100%', padding: '6px 0', border: 'none',
                        backgroundColor: 'transparent', color: '#00a884',
                        fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                        textAlign: 'center', borderRadius: '6px'
                      }}
                    >
                      View votes
                    </button>
                  </div>
                )}

                {/* Event Bubble (Matches Screenshot 2) */}
                {eventObj && !isDeleted && (
                  <div
                    style={{
                      backgroundColor: isMe ? '#004c3e' : '#1f2c34',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      minWidth: '260px',
                      maxWidth: '340px',
                      marginBottom: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        backgroundColor: '#02a699', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '20px', flexShrink: 0
                      }}>
                        📅
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ color: '#e9edef', fontWeight: 'bold', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {eventObj.name}
                        </div>
                        <div style={{ color: '#00a884', fontSize: '13px', fontWeight: '500' }}>
                          📅 {eventObj.start_date} at {eventObj.start_time}
                        </div>
                      </div>
                    </div>

                    {eventObj.description && (
                      <div style={{ color: '#8696a0', fontSize: '13px', marginBottom: '8px', wordBreak: 'break-word' }}>
                        {eventObj.description}
                      </div>
                    )}

                    {eventObj.location && (
                      <div style={{ color: '#8696a0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        📍 {eventObj.location}
                      </div>
                    )}

                    <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '10px 0' }} />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Event: ${eventObj.name}\nDate: ${eventObj.start_date} at ${eventObj.start_time}`);
                      }}
                      style={{
                        width: '100%', padding: '6px 0', border: 'none',
                        backgroundColor: 'transparent', color: '#00a884',
                        fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                        textAlign: 'center', borderRadius: '6px'
                      }}
                    >
                      View event details
                    </button>
                  </div>
                )}
                {/* Floating Quick Reaction Bar */}
                {isReactionOpenThis && (
                  <div
                    className="wa-msg-context-menu"
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
                  className="wa-msg-options-btn"
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
                    className="wa-msg-context-menu"
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

                    {!isDeleted && isMe && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(msg);
                        }}
                        style={{ padding: '8px 14px', fontSize: '13px', color: '#e9edef', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #2a3942' }}
                      >
                        ✏️ Edit
                      </div>
                    )}

                    {/* 🗑️ Delete for me option (available for all messages) */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMsgForMe(msg.id);
                      }}
                      style={{ padding: '8px 14px', fontSize: '13px', color: '#e9edef', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #2a3942' }}
                    >
                      🗑️ Delete for me
                    </div>

                    {/* 🚫 Delete for everyone option (available for own messages or admin) */}
                    {!isDeleted && (isMe || user?.is_admin) && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMsgForEveryone(msg.id);
                        }}
                        style={{ padding: '8px 14px', fontSize: '13px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        🚫 Delete for everyone
                      </div>
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
                    {mediaType === 'sticker' ? (
                      <img 
                        src={mediaUrl} 
                        alt="Sticker" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewMedia({
                            url: mediaUrl,
                            type: 'image',
                            name: 'Sticker',
                            sender: msg.sender_name || msg.sender?.username || (isMe ? 'You' : getChatTitle()),
                            time: formattedTime
                          });
                          setZoomLevel(1);
                        }}
                        style={{ maxWidth: '160px', maxHeight: '160px', objectFit: 'contain', display: 'block', cursor: 'pointer', margin: '2px 0' }} 
                      />
                    ) : mediaType === 'image' ? (
                      <img 
                        src={mediaUrl} 
                        alt="Attachment" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewMedia({
                            url: mediaUrl,
                            type: mediaType,
                            name: msg.content || 'Photo',
                            sender: msg.sender_name || msg.sender?.username || (isMe ? 'You' : getChatTitle()),
                            time: formattedTime
                          });
                          setZoomLevel(1);
                        }}
                        style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '240px', objectFit: 'cover', display: 'block', cursor: 'pointer' }} 
                      />
                    ) : mediaType === 'video' ? (
                      <video 
                        controls 
                        src={mediaUrl} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewMedia({
                            url: mediaUrl,
                            type: mediaType,
                            name: msg.content || 'Video',
                            sender: msg.sender_name || msg.sender?.username || (isMe ? 'You' : getChatTitle()),
                            time: formattedTime
                          });
                          setZoomLevel(1);
                        }}
                        style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '240px', display: 'block', cursor: 'pointer' }} 
                      />
                    ) : mediaType === 'audio' ? (
                      <audio controls src={mediaUrl} style={{ width: '220px' }} />
                    ) : (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (mediaUrl) {
                            window.open(mediaUrl, '_blank');
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                          padding: '8px 12px', marginBottom: '4px', cursor: 'pointer'
                        }}
                      >
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
                      Boolean(msg.content && !contactObj && !pollObj && !eventObj && !msg.content.startsWith('[file:') && !msg.content.startsWith('[image:') && !msg.content.startsWith('[video:') && !msg.content.startsWith('[audio:') && !msg.content.startsWith('[contact:') && !msg.content.startsWith('[poll:') && !msg.content.startsWith('[event:')) && (
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

      {/* Attachment Options Popover Menu (Matches Screenshot 2) */}
      {isAttachmentMenuOpen && (
        <div
          ref={attachmentMenuRef}
          className="wa-msg-context-menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '72px',
            left: '16px',
            backgroundColor: '#233138',
            borderRadius: '16px',
            padding: '8px 0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            border: '1px solid #2a3942',
            zIndex: 1000,
            width: '210px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* 📄 Document */}
          <div
            onClick={() => {
              setIsAttachmentMenuOpen(false);
              docInputRef.current?.click();
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 18px', cursor: 'pointer', color: '#e9edef',
              fontSize: '14px', transition: 'background 0.15s'
            }}
            className="wa-sidebar-item"
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#7f66ff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px'
            }}>
              📄
            </div>
            <span style={{ fontWeight: '500' }}>Document</span>
          </div>

          {/* 🖼️ Photos & videos */}
          <div
            onClick={() => {
              setIsAttachmentMenuOpen(false);
              mediaInputRef.current?.click();
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 18px', cursor: 'pointer', color: '#e9edef',
              fontSize: '14px', transition: 'background 0.15s'
            }}
            className="wa-sidebar-item"
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#007bfc', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px'
            }}>
              🖼️
            </div>
            <span style={{ fontWeight: '500' }}>Photos & videos</span>
          </div>

          {/* 📷 Camera */}
          <div
            onClick={startCamera}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 18px', cursor: 'pointer', color: '#e9edef',
              fontSize: '14px', transition: 'background 0.15s'
            }}
            className="wa-sidebar-item"
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#ff2e74', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px'
            }}>
              📷
            </div>
            <span style={{ fontWeight: '500' }}>Camera</span>
          </div>

          {/* 🎵 Audio */}
          <div
            onClick={() => {
              setIsAttachmentMenuOpen(false);
              audioInputRef.current?.click();
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 18px', cursor: 'pointer', color: '#e9edef',
              fontSize: '14px', transition: 'background 0.15s'
            }}
            className="wa-sidebar-item"
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#e6683c', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px'
            }}>
              🎵
            </div>
            <span style={{ fontWeight: '500' }}>Audio</span>
          </div>

          {/* 👤 Contact */}
          <div
            onClick={handleOpenContactModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 18px', cursor: 'pointer', color: '#e9edef',
              fontSize: '14px', transition: 'background 0.15s'
            }}
            className="wa-sidebar-item"
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px'
            }}>
              👤
            </div>
            <span style={{ fontWeight: '500' }}>Contact</span>
          </div>

          {/* 📊 Poll */}
          <div
            onClick={handleOpenPollModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 18px', cursor: 'pointer', color: '#e9edef',
              fontSize: '14px', transition: 'background 0.15s'
            }}
            className="wa-sidebar-item"
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#ffbc00', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px'
            }}>
              📊
            </div>
            <span style={{ fontWeight: '500' }}>Poll</span>
          </div>

          {/* 📅 Event */}
          <div
            onClick={handleOpenEventModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 18px', cursor: 'pointer', color: '#e9edef',
              fontSize: '14px', transition: 'background 0.15s'
            }}
            className="wa-sidebar-item"
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#02a699', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px'
            }}>
              📅
            </div>
            <span style={{ fontWeight: '500' }}>Event</span>
          </div>

          {/* 🎨 New sticker */}
          <div
            onClick={() => {
              setIsAttachmentMenuOpen(false);
              stickerInputRef.current?.click();
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '10px 18px', cursor: 'pointer', color: '#e9edef',
              fontSize: '14px', transition: 'background 0.15s'
            }}
            className="wa-sidebar-item"
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#00c2cb', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px'
            }}>
              🎨
            </div>
            <span style={{ fontWeight: '500' }}>New sticker</span>
          </div>
        </div>
      )}

      {/* Camera Full Window (Matches Screenshots 4 & 5) */}
      {isCameraOpen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#0b141a', zIndex: 1200, display: 'flex',
          flexDirection: 'column', overflow: 'hidden'
        }}>
          {!capturedPhoto ? (
            /* Live Camera Feed (Screenshot 4) */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                height: '56px', backgroundColor: '#111b21', display: 'flex',
                alignItems: 'center', padding: '0 20px', gap: '16px',
                borderBottom: '1px solid #222d34', flexShrink: 0
              }}>
                <button
                  onClick={stopCamera}
                  style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
                <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: '500', margin: 0 }}>
                  Take photo
                </h3>
              </div>

              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                
                {/* Green Circle Camera Button (Screenshot 4) */}
                <div style={{
                  position: 'absolute', bottom: '30px', left: '50%',
                  transform: 'translateX(-50%)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <button
                    type="button"
                    onClick={takeCameraPhoto}
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      backgroundColor: '#00a884', border: '3px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      transition: 'transform 0.15s'
                    }}
                    title="Take photo"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                      <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Captured Snapshot Preview (Screenshot 5) */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#111b21', height: '100%' }}>
              {/* Header Bar */}
              <div style={{
                height: '56px', backgroundColor: '#111b21', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
                borderBottom: '1px solid #222d34', flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    onClick={stopCamera}
                    style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                  <span style={{ color: '#e9edef', fontSize: '16px', fontWeight: '500' }}>Take photo</span>
                </div>

                <button
                  type="button"
                  onClick={retakeCameraPhoto}
                  style={{
                    background: 'none', border: 'none', color: '#00a884',
                    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  ↺ Retake
                </button>
              </div>

              {/* Photo Preview Canvas Area */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'hidden' }}>
                <img
                  src={capturedPhoto}
                  alt="Camera Snapshot"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
                />
              </div>

              {/* Bottom Caption & Green Send Button Bar (Screenshot 5) */}
              <div style={{
                padding: '14px 20px', backgroundColor: '#111b21',
                display: 'flex', alignItems: 'center', gap: '14px',
                borderTop: '1px solid #222d34', flexShrink: 0
              }}>
                <input
                  type="text"
                  placeholder="Type a message"
                  value={cameraCaption}
                  onChange={(e) => setCameraCaption(e.target.value)}
                  style={{
                    flex: 1, padding: '12px 18px', borderRadius: '8px',
                    border: 'none', backgroundColor: '#2a3942',
                    color: '#e9edef', fontSize: '14px', outline: 'none'
                  }}
                />

                <button
                  type="button"
                  onClick={sendCameraPhoto}
                  disabled={uploading}
                  style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    backgroundColor: '#00a884', border: 'none', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,168,132,0.4)',
                    transition: 'transform 0.15s'
                  }}
                  title="Send Photo"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
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
        {/* Hidden Inputs for Document, Photos/Videos, Audio */}
        <input
          type="file"
          ref={docInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          accept="*"
        />
        <input
          type="file"
          ref={mediaInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          accept="image/*,video/*"
        />
        <input
          type="file"
          ref={audioInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          accept="audio/*"
        />
        <input
          type="file"
          ref={stickerInputRef}
          onChange={(e) => handleFileUpload(e, 'sticker')}
          style={{ display: 'none' }}
          accept="image/*"
        />

        <button
          type="button"
          className="wa-attachment-btn"
          onClick={() => setIsAttachmentMenuOpen((prev) => !prev)}
          disabled={uploading}
          style={{
            background: 'none', border: 'none', color: 'var(--wa-text-secondary)',
            fontSize: '20px', cursor: 'pointer', padding: '6px'
          }}
          title="Attach File or Media"
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

    {/* Full Screen Media Preview Modal Overlay (Matches Screenshot 3) */}
    {previewMedia && (
      <div 
        onClick={() => setPreviewMedia(null)}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(11, 20, 26, 0.96)', display: 'flex',
          flexDirection: 'column', zIndex: 2500, backdropFilter: 'blur(10px)'
        }}
      >
        {/* Fullscreen Modal Header Bar */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            height: '60px', backgroundColor: '#111b21',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px', borderBottom: '1px solid #222d34',
            zIndex: 10
          }}
        >
          {/* Left Info: Sender & Timestamp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#e9edef', fontWeight: '600', fontSize: '16px' }}>
              {previewMedia.sender || 'Media Preview'}
            </div>
            {previewMedia.time && (
              <span style={{ color: '#8696a0', fontSize: '13px' }}>
                {previewMedia.time}
              </span>
            )}
          </div>

          {/* Right Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {previewMedia.type === 'image' && (
              <>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                  style={{
                    background: 'none', border: 'none', color: '#e9edef',
                    fontSize: '18px', cursor: 'pointer', padding: '6px'
                  }}
                  title="Zoom In"
                >
                  🔍+
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                  style={{
                    background: 'none', border: 'none', color: '#e9edef',
                    fontSize: '18px', cursor: 'pointer', padding: '6px'
                  }}
                  title="Zoom Out"
                >
                  🔍-
                </button>
              </>
            )}
            <button
              type="button"
              onClick={(e) => handleDownloadMedia(e, previewMedia.url, previewMedia.name)}
              style={{
                backgroundColor: '#00a884', border: 'none', color: '#111b21',
                padding: '6px 14px', borderRadius: '6px', fontWeight: '600',
                fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              title="Download File"
            >
              ⬇ Download
            </button>
            <button
              type="button"
              onClick={() => setPreviewMedia(null)}
              style={{
                background: 'none', border: 'none', color: '#e9edef',
                fontSize: '24px', cursor: 'pointer', padding: '4px'
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Fullscreen Media Viewer Workspace with Navigation Arrows */}
        <div 
          style={{
            flex: 1, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '20px', position: 'relative', overflow: 'hidden'
          }}
        >
          {/* Left Arrow Button */}
          {(() => {
            const chatMedia = messages.filter(m => !m.is_deleted && !m.isDeleted && (m.media_url || m.mediaUrl));
            const idx = chatMedia.findIndex(m => (m.media_url || m.mediaUrl) === previewMedia.url);
            if (idx > 0) {
              const prevItem = chatMedia[idx - 1];
              const prevUrl = prevItem.media_url || prevItem.mediaUrl;
              const prevType = prevItem.media_type || prevItem.type || 'image';
              const prevTime = formatTimestamp(prevItem.created_at || prevItem.createdAt);
              const prevSender = prevItem.sender_name || prevItem.sender?.username || (String(prevItem.sender_id || prevItem.senderId) === String(user?.id) ? 'You' : getChatTitle());
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewMedia({ url: prevUrl, type: prevType, name: prevItem.content || 'Media', sender: prevSender, time: prevTime });
                    setZoomLevel(1);
                  }}
                  style={{
                    backgroundColor: 'rgba(32, 44, 51, 0.7)', border: 'none', color: 'white',
                    width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}
                  title="Previous Media"
                >
                  ❮
                </button>
              );
            }
            return <div style={{ width: '44px' }} />;
          })()}

          {/* Main Displayed Media Element */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {previewMedia.type === 'image' ? (
              <img
                src={previewMedia.url}
                alt="Full Screen Preview"
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '85%', maxHeight: '85%', objectFit: 'contain',
                  borderRadius: '8px', transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.2s ease-out', boxShadow: '0 12px 40px rgba(0,0,0,0.8)'
                }}
              />
            ) : previewMedia.type === 'video' ? (
              <video
                controls
                autoPlay
                src={previewMedia.url}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '85%', maxHeight: '80%', borderRadius: '8px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.8)'
                }}
              />
            ) : (
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: '#202c33', padding: '32px', borderRadius: '12px',
                  textAlign: 'center', color: '#e9edef', maxWidth: '420px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.8)', border: '1px solid var(--wa-border)'
                }}
              >
                <div style={{ fontSize: '54px', marginBottom: '16px' }}>📄</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewMedia.name || 'Document'}
                </h3>
                <p style={{ color: '#8696a0', fontSize: '14px', marginBottom: '24px' }}>
                  Click below to open or download this document.
                </p>
                <button
                  type="button"
                  onClick={() => window.open(previewMedia.url, '_blank')}
                  style={{
                    backgroundColor: '#00a884', border: 'none', color: '#111b21',
                    padding: '10px 24px', borderRadius: '20px', fontWeight: 'bold',
                    fontSize: '14px', cursor: 'pointer'
                  }}
                >
                  📄 Open in New Tab
                </button>
              </div>
            )}
          </div>

          {/* Right Arrow Button */}
          {(() => {
            const chatMedia = messages.filter(m => !m.is_deleted && !m.isDeleted && (m.media_url || m.mediaUrl));
            const idx = chatMedia.findIndex(m => (m.media_url || m.mediaUrl) === previewMedia.url);
            if (idx >= 0 && idx < chatMedia.length - 1) {
              const nextItem = chatMedia[idx + 1];
              const nextUrl = nextItem.media_url || nextItem.mediaUrl;
              const nextType = nextItem.media_type || nextItem.type || 'image';
              const nextTime = formatTimestamp(nextItem.created_at || nextItem.createdAt);
              const nextSender = nextItem.sender_name || nextItem.sender?.username || (String(nextItem.sender_id || nextItem.senderId) === String(user?.id) ? 'You' : getChatTitle());
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewMedia({ url: nextUrl, type: nextType, name: nextItem.content || 'Media', sender: nextSender, time: nextTime });
                    setZoomLevel(1);
                  }}
                  style={{
                    backgroundColor: 'rgba(32, 44, 51, 0.7)', border: 'none', color: 'white',
                    width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}
                  title="Next Media"
                >
                  ❯
                </button>
              );
            }
            return <div style={{ width: '44px' }} />;
          })()}
        </div>

        {/* Bottom Thumbnail Strip Carousel (Matches Screenshot 3) */}
        {(() => {
          const chatMedia = messages.filter(m => !m.is_deleted && !m.isDeleted && (m.media_url || m.mediaUrl));
          if (chatMedia.length === 0) return null;
          return (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                height: '80px', backgroundColor: '#0b141a', display: 'flex',
                alignItems: 'center', gap: '10px', padding: '0 20px', overflowX: 'auto',
                borderTop: '1px solid #222d34', flexShrink: 0
              }}
            >
              {chatMedia.map((m, i) => {
                const url = m.media_url || m.mediaUrl;
                const type = m.media_type || m.type || 'image';
                const isSelected = url === previewMedia.url;
                const mTime = formatTimestamp(m.created_at || m.createdAt);
                const mSender = m.sender_name || m.sender?.username || (String(m.sender_id || m.senderId) === String(user?.id) ? 'You' : getChatTitle());

                return (
                  <div
                    key={m.id || i}
                    onClick={() => {
                      setPreviewMedia({ url, type, name: m.content || 'Media', sender: mSender, time: mTime });
                      setZoomLevel(1);
                    }}
                    style={{
                      width: '60px', height: '60px', borderRadius: '6px',
                      overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                      border: isSelected ? '3px solid #00a884' : '1px solid #222d34',
                      boxShadow: isSelected ? '0 0 10px rgba(0,168,132,0.6)' : 'none',
                      opacity: isSelected ? 1 : 0.6, transition: 'all 0.15s'
                    }}
                  >
                    {type === 'video' ? (
                      <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : type === 'image' ? (
                      <img src={url} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: '#202c33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        📄
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    )}

    {/* Send Contacts Modal (Matches Screenshots 3 & 4) */}
    {isContactModalOpen && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(11, 20, 26, 0.75)', zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{
          width: '460px', maxWidth: '92%', height: '580px', maxHeight: '90vh',
          backgroundColor: '#111b21', borderRadius: '16px', border: '1px solid #222d34',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)'
        }}>
          {/* Header Bar */}
          <div style={{
            height: '60px', backgroundColor: '#202c33', display: 'flex',
            alignItems: 'center', padding: '0 20px', gap: '16px', borderBottom: '1px solid #222d34',
            flexShrink: 0
          }}>
            <button
              onClick={() => setIsContactModalOpen(false)}
              style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}
            >
              ✕
            </button>
            <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: '500', margin: 0 }}>
              Send contacts
            </h3>
          </div>

          {/* Search Input Bar (Matching Screenshot 3 green border) */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #222d34', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Search name or number"
              value={contactSearchQuery}
              onChange={handleSearchContactsModal}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: '24px',
                border: '1.5px solid #00a884', backgroundColor: 'transparent',
                color: '#e9edef', fontSize: '14px', outline: 'none'
              }}
            />
          </div>

          {/* Contacts Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', paddingBottom: selectedContacts.length > 0 ? '70px' : '8px' }}>
            {/* Section: You */}
            {user && (
              <div>
                <div style={{ padding: '8px 20px', color: '#8696a0', fontSize: '13px', fontWeight: '600' }}>
                  You
                </div>
                <div
                  onClick={() => toggleSelectContact(user)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '10px 20px', cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  className="wa-sidebar-item"
                >
                  <input
                    type="checkbox"
                    checked={selectedContacts.some(c => String(c.id) === String(user.id))}
                    onChange={() => {}}
                    style={{ width: '18px', height: '18px', accentColor: '#00a884', cursor: 'pointer' }}
                  />
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'white', fontWeight: 'bold', overflow: 'hidden'
                  }}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="You" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (user.username || 'U')[0]?.toUpperCase()
                    )}
                  </div>
                  <span style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>
                    {user.username} <span style={{ color: '#8696a0', fontSize: '12px' }}>(You)</span>
                  </span>
                </div>
              </div>
            )}

            {/* Section: Contacts */}
            <div style={{ padding: '8px 20px', color: '#8696a0', fontSize: '13px', fontWeight: '600', marginTop: '8px' }}>
              Contacts
            </div>

            {loadingContactsModal ? (
              <div style={{ textAlign: 'center', color: '#8696a0', padding: '20px', fontSize: '13px' }}>
                Loading contacts...
              </div>
            ) : contactsList.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8696a0', padding: '20px', fontSize: '13px' }}>
                No contacts found
              </div>
            ) : (
              contactsList
                .filter((c) => String(c.id) !== String(user?.id))
                .map((cUser) => {
                  const isSelected = selectedContacts.some(c => String(c.id) === String(cUser.id));
                  return (
                    <div
                      key={cUser.id}
                      onClick={() => toggleSelectContact(cUser)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        padding: '10px 20px', cursor: 'pointer', transition: 'background 0.15s'
                      }}
                      className="wa-sidebar-item"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ width: '18px', height: '18px', accentColor: '#00a884', cursor: 'pointer' }}
                      />
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        backgroundColor: '#00a884', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'white', fontWeight: 'bold', overflow: 'hidden'
                      }}>
                        {cUser.avatar_url ? (
                          <img src={cUser.avatar_url} alt={cUser.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (cUser.username || 'C')[0]?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>
                          {cUser.username}
                        </div>
                        <div style={{ color: '#8696a0', fontSize: '12px' }}>
                          {cUser.email || parseStatusMessage(cUser.status_message) || '+91 95103 67620'}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Floating Bottom Bar when contacts are checked (Screenshot 4) */}
          {selectedContacts.length > 0 && (
            <div style={{
              padding: '14px 20px', backgroundColor: '#202c33', borderTop: '1px solid #222d34',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'absolute', bottom: 0, left: 0, right: 0, boxShadow: '0 -4px 16px rgba(0,0,0,0.4)',
              zIndex: 10
            }}>
              <div style={{ color: '#e9edef', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px' }}>
                {selectedContacts.map(c => c.username).join(', ')}
              </div>

              <button
                type="button"
                onClick={handleSendSelectedContacts}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  backgroundColor: '#00a884', border: 'none', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,168,132,0.4)',
                  flexShrink: 0
                }}
                title="Send Contacts"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Create Poll Modal (Matches Screenshot 4) */}
    {isPollModalOpen && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(11, 20, 26, 0.75)', zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{
          width: '460px', maxWidth: '92%', height: '580px', maxHeight: '90vh',
          backgroundColor: '#111b21', borderRadius: '16px', border: '1px solid #222d34',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)'
        }}>
          {/* Header Bar */}
          <div style={{
            height: '60px', backgroundColor: '#202c33', display: 'flex',
            alignItems: 'center', padding: '0 20px', gap: '16px', borderBottom: '1px solid #222d34',
            flexShrink: 0
          }}>
            <button
              onClick={() => setIsPollModalOpen(false)}
              style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}
            >
              ✕
            </button>
            <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: '500', margin: 0 }}>
              Create poll
            </h3>
          </div>

          {/* Poll Creation Workspace */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Question Field */}
            <div>
              <label style={{ display: 'block', color: '#8696a0', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                Question
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Ask a question"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 40px 12px 0', backgroundColor: 'transparent',
                    border: 'none', borderBottom: '2px solid #00a884', color: '#e9edef',
                    fontSize: '15px', outline: 'none'
                  }}
                  autoFocus
                />
                <span style={{ position: 'absolute', right: '4px', fontSize: '18px', cursor: 'pointer', opacity: 0.7 }}>
                  😀
                </span>
              </div>
            </div>

            {/* Options Section */}
            <div>
              <label style={{ display: 'block', color: '#8696a0', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
                Options
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pollOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={i === pollOptions.length - 1 ? 'Add text' : 'Option'}
                      value={opt}
                      onChange={(e) => handlePollOptionChange(i, e.target.value)}
                      style={{
                        flex: 1, padding: '10px 40px 10px 0', backgroundColor: 'transparent',
                        border: 'none', borderBottom: '1px solid #222d34', color: '#e9edef',
                        fontSize: '14px', outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'absolute', right: '4px' }}>
                      <span style={{ fontSize: '16px', cursor: 'pointer', opacity: 0.6 }}>😀</span>
                      <span style={{ color: '#8696a0', fontSize: '18px', cursor: 'grab' }}>≡</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Toggle: Allow multiple answers */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #222d34'
            }}>
              <span style={{ color: '#e9edef', fontSize: '14px', fontWeight: '500' }}>
                Allow multiple answers
              </span>
              <div
                onClick={() => setPollAllowMultiple(!pollAllowMultiple)}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px',
                  backgroundColor: pollAllowMultiple ? '#00a884' : '#374248',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: 'white', position: 'absolute', top: '3px',
                  left: pollAllowMultiple ? '23px' : '3px', transition: 'left 0.2s'
                }} />
              </div>
            </div>
          </div>

          {/* Floating Bottom Send Button Bar (Screenshot 4) */}
          <div style={{
            padding: '16px 24px', backgroundColor: '#111b21',
            display: 'flex', justifyContent: 'flex-end', flexShrink: 0
          }}>
            <button
              type="button"
              onClick={handleSendPoll}
              disabled={!pollQuestion.trim()}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: '#00a884', border: 'none', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: pollQuestion.trim() ? 'pointer' : 'default',
                opacity: pollQuestion.trim() ? 1 : 0.5,
                boxShadow: '0 4px 12px rgba(0,168,132,0.4)', transition: 'all 0.15s'
              }}
              title="Send Poll"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Create Event Modal (Matches Screenshot 2) */}
    {isEventModalOpen && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(11, 20, 26, 0.75)', zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{
          width: '460px', maxWidth: '92%', height: '620px', maxHeight: '90vh',
          backgroundColor: '#111b21', borderRadius: '16px', border: '1px solid #222d34',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)'
        }}>
          {/* Header Bar */}
          <div style={{
            height: '60px', backgroundColor: '#202c33', display: 'flex',
            alignItems: 'center', padding: '0 20px', gap: '16px', borderBottom: '1px solid #222d34',
            flexShrink: 0
          }}>
            <button
              onClick={() => setIsEventModalOpen(false)}
              style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}
            >
              ✕
            </button>
            <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: '500', margin: 0 }}>
              Create event
            </h3>
          </div>

          {/* Event Form Workspace */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name & Description Card Container */}
            <div style={{ backgroundColor: '#202c33', borderRadius: '12px', padding: '14px 16px' }}>
              <input
                type="text"
                placeholder="Add event name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                style={{
                  width: '100%', backgroundColor: 'transparent', border: 'none',
                  borderBottom: '2px solid #00a884', color: '#e9edef', fontSize: '16px',
                  fontWeight: '500', padding: '6px 0 8px 0', outline: 'none', marginBottom: '12px'
                }}
                autoFocus
              />
              <textarea
                rows="3"
                placeholder="Add description (optional)"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                style={{
                  width: '100%', backgroundColor: 'transparent', border: 'none',
                  color: '#e9edef', fontSize: '14px', outline: 'none', resize: 'none'
                }}
              />
            </div>

            {/* Starts Date & Time Card Container */}
            <div style={{ backgroundColor: '#202c33', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#e9edef', fontSize: '14px', fontWeight: '500' }}>Starts</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    style={{
                      backgroundColor: '#2a3942', border: 'none', borderRadius: '8px',
                      color: '#e9edef', padding: '6px 10px', fontSize: '13px', outline: 'none'
                    }}
                  />
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    style={{
                      backgroundColor: '#2a3942', border: 'none', borderRadius: '8px',
                      color: '#e9edef', padding: '6px 10px', fontSize: '13px', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Toggle: Include end time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #2a3942' }}>
                <span style={{ color: '#e9edef', fontSize: '14px' }}>Include end time</span>
                <div
                  onClick={() => setEventIncludeEndTime(!eventIncludeEndTime)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    backgroundColor: eventIncludeEndTime ? '#00a884' : '#374248',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    backgroundColor: 'white', position: 'absolute', top: '3px',
                    left: eventIncludeEndTime ? '23px' : '3px', transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            </div>

            {/* Location & Call Link Card Container */}
            <div style={{ backgroundColor: '#202c33', borderRadius: '12px', padding: '14px 16px' }}>
              <input
                type="text"
                placeholder="Add location (optional)"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                style={{
                  width: '100%', backgroundColor: 'transparent', border: 'none',
                  borderBottom: '1px solid #2a3942', color: '#e9edef', fontSize: '14px',
                  padding: '6px 0 10px 0', outline: 'none', marginBottom: '12px'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#e9edef', fontSize: '14px' }}>WhatsApp call link</span>
                <div
                  onClick={() => setEventCallLink(!eventCallLink)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    backgroundColor: eventCallLink ? '#00a884' : '#374248',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    backgroundColor: 'white', position: 'absolute', top: '3px',
                    left: eventCallLink ? '23px' : '3px', transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Floating Bottom Send Button Bar (Matches Screenshot 2) */}
          <div style={{
            padding: '16px 24px', backgroundColor: '#111b21',
            display: 'flex', justifyContent: 'flex-end', flexShrink: 0
          }}>
            <button
              type="button"
              onClick={handleSendEvent}
              disabled={!eventName.trim()}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: '#00a884', border: 'none', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: eventName.trim() ? 'pointer' : 'default',
                opacity: eventName.trim() ? 1 : 0.5,
                boxShadow: '0 4px 12px rgba(0,168,132,0.4)', transition: 'all 0.15s'
              }}
              title="Send Event"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
