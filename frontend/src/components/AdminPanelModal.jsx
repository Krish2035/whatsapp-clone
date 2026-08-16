'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchAdminStats,
  fetchAdminUsers,
  toggleAdminRole,
  fetchAdminConversations,
  fetchAdminConversationMessages,
  fetchAdminActiveCalls,
} from '../services/api';
import { socketService } from '../services/socket';
import { useCall } from '../context/useCall';

export default function AdminPanelModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const { startCall } = useCall() || {};

  // Load Admin Data on Open
  useEffect(() => {
    if (isOpen) {
      loadAllAdminData();
    }
  }, [isOpen]);

  // Listen for real-time call updates via Socket.IO
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleAdminCallEvent = () => {
      loadActiveCalls();
      loadStats();
    };

    socket.on('ADMIN_CALL_EVENT', handleAdminCallEvent);
    socket.on('CALL_INITIATE', handleAdminCallEvent);
    socket.on('CALL_ACCEPT', handleAdminCallEvent);
    socket.on('CALL_END', handleAdminCallEvent);

    return () => {
      socket.off('ADMIN_CALL_EVENT', handleAdminCallEvent);
      socket.off('CALL_INITIATE', handleAdminCallEvent);
      socket.off('CALL_ACCEPT', handleAdminCallEvent);
      socket.off('CALL_END', handleAdminCallEvent);
    };
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadUsers(), loadConversations(), loadActiveCalls()]);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (e) {}
  };

  const loadUsers = async () => {
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (e) {}
  };

  const loadConversations = async () => {
    try {
      const data = await fetchAdminConversations();
      setConversations(data);
    } catch (e) {}
  };

  const loadActiveCalls = async () => {
    try {
      const data = await fetchAdminActiveCalls();
      setActiveCalls(data);
    } catch (e) {}
  };

  const handleSelectConversation = async (chat) => {
    setSelectedConversation(chat);
    try {
      const msgs = await fetchAdminConversationMessages(chat.id);
      setConversationMessages(msgs);
    } catch (err) {
      console.error('Error loading conversation messages:', err);
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const updatedUser = await toggleAdminRole(userId);
      setActionMessage(`Role updated for ${updatedUser.username} (Admin: ${updatedUser.is_admin})`);
      await loadUsers();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to toggle admin role');
    }
  };

  const handleJoinCall = (callRecord) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('ADMIN_JOIN_CALL', { callId: callRecord.id });
    }

    if (startCall) {
      // Connect Admin into the target call room
      startCall(
        callRecord.caller_id === socketService.userId ? callRecord.receiver_id : callRecord.caller_id,
        callRecord.call_type === 'video'
      );
    }

    setActionMessage(`Joining live ${callRecord.call_type} call between User ${callRecord.caller_name} and User ${callRecord.receiver_name}...`);
    setTimeout(() => setActionMessage(''), 4000);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        width: '95%',
        maxWidth: '1200px',
        height: '88vh',
        backgroundColor: '#111b21',
        borderRadius: '12px',
        border: '1px solid #222d34',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#e9edef',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#202c33',
          borderBottom: '1px solid #222d34',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#00a884',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '18px',
              color: '#111b21'
            }}>
              🛡️
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#e9edef' }}>
                WhatsApp Web Admin Control Center
              </h2>
              <span style={{ fontSize: '12px', color: '#8696a0' }}>
                Real-Time Surveillance, Deleted Message Vault & Call Interceptor
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={loadAllAdminData}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#2a3942',
                color: '#e9edef',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🔄 Refresh Data
            </button>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                color: '#8696a0',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {actionMessage && (
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#005c4b',
            color: '#00a884',
            fontSize: '14px',
            fontWeight: '500',
            borderBottom: '1px solid #00a884'
          }}>
            ✅ {actionMessage}
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#111b21',
          borderBottom: '1px solid #222d34',
          padding: '0 20px',
        }}>
          {[
            { id: 'overview', label: '📊 Overview Dashboard' },
            { id: 'conversations', label: '💬 Conversations & Deleted Vault' },
            { id: 'calls', label: `📞 Active Calls (${activeCalls.length})` },
            { id: 'users', label: `👥 User Management (${users.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 20px',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#00a884' : '#8696a0',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #00a884' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body Container */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ fontSize: '16px', color: '#e9edef', marginBottom: '16px' }}>System Overview & Activity</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '28px',
              }}>
                {[
                  { title: 'Total Registered Users', value: stats?.totalUsers || 0, icon: '👥', color: '#00a884' },
                  { title: 'Total Messages Transmitted', value: stats?.totalMessages || 0, icon: '💬', color: '#34b7f1' },
                  { title: 'Deleted Messages (Audit Vault)', value: stats?.totalDeletedMessages || 0, icon: '🗑️', color: '#ea4335' },
                  { title: 'Active Conversations', value: stats?.totalConversations || 0, icon: '📱', color: '#fbbc05' },
                  { title: 'Live Ongoing Calls', value: stats?.activeCallsCount || activeCalls.length, icon: '📞', color: '#25d366' },
                ].map((card, idx) => (
                  <div key={idx} style={{
                    backgroundColor: '#202c33',
                    padding: '20px',
                    borderRadius: '10px',
                    border: '1px solid #222d34',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#8696a0', fontWeight: '500' }}>{card.title}</span>
                      <span style={{ fontSize: '22px' }}>{card.icon}</span>
                    </div>
                    <span style={{ fontSize: '28px', fontWeight: 'bold', color: card.color }}>
                      {card.value}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                backgroundColor: '#202c33',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #222d34',
              }}>
                <h4 style={{ fontSize: '15px', color: '#e9edef', marginBottom: '10px' }}>⚡ System Status & Capabilities</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#8696a0' }}>
                  <div>🟢 Real-time Socket.IO WebSocket Engine: <strong>Active</strong></div>
                  <div>🟢 WebRTC & Agora Peer-to-Peer Interception Gateway: <strong>Active</strong></div>
                  <div>🟢 PostgreSQL / SQLite Database Audit Vault: <strong>Connected</strong></div>
                  <div>🛡️ Admin Privileges Granted for: <strong>{socketService.userId ? `User ID ${socketService.userId}` : 'Admin'}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONVERSATIONS & DELETED MESSAGES VAULT */}
          {activeTab === 'conversations' && (
            <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
              {/* Conversation List */}
              <div style={{
                width: '340px',
                backgroundColor: '#202c33',
                borderRadius: '10px',
                border: '1px solid #222d34',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '12px', borderBottom: '1px solid #222d34' }}>
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#111b21',
                      border: '1px solid #2a3942',
                      borderRadius: '6px',
                      color: '#e9edef',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {conversations
                    .filter((c) => {
                      const nameStr = c.group_name || c.participants?.map((p) => p.username).join(', ') || '';
                      return nameStr.toLowerCase().includes(searchTerm.toLowerCase());
                    })
                    .map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => handleSelectConversation(chat)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #111b21',
                          cursor: 'pointer',
                          backgroundColor: selectedConversation?.id === chat.id ? '#2a3942' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#e9edef' }}>
                            {chat.is_group ? `👥 ${chat.group_name}` : chat.participants?.map((p) => p.username).join(' & ') || `Chat #${chat.id}`}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8696a0', marginTop: '4px' }}>
                            {chat.total_messages} messages ({chat.deleted_messages_count} deleted)
                          </div>
                        </div>
                        {chat.deleted_messages_count > 0 && (
                          <span style={{
                            backgroundColor: '#ea4335',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '10px',
                          }}>
                            {chat.deleted_messages_count} Deleted
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Chat Inspector Transcript */}
              <div style={{
                flex: 1,
                backgroundColor: '#0b141a',
                borderRadius: '10px',
                border: '1px solid #222d34',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {selectedConversation ? (
                  <>
                    <div style={{ padding: '12px 20px', backgroundColor: '#202c33', borderBottom: '1px solid #222d34' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#e9edef' }}>
                        Transcript: {selectedConversation.is_group ? selectedConversation.group_name : selectedConversation.participants?.map((p) => p.username).join(' ↔ ')}
                      </h4>
                      <span style={{ fontSize: '12px', color: '#8696a0' }}>
                        Includes live messages and <strong>Vault Deleted Messages</strong>
                      </span>
                    </div>

                    <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {conversationMessages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            maxWidth: '75%',
                            alignSelf: msg.senderId === socketService.userId ? 'flex-end' : 'flex-start',
                            backgroundColor: msg.isDeleted ? '#3b1c1c' : '#202c33',
                            border: msg.isDeleted ? '1px solid #ea4335' : '1px solid #2a3942',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00a884' }}>
                              {msg.sender?.username || `User ${msg.senderId}`}
                            </span>
                            {msg.isDeleted && (
                              <span style={{
                                backgroundColor: '#ea4335',
                                color: '#fff',
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                              }}>
                                ⚠️ DELETED BY USER
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '14px', color: msg.isDeleted ? '#ffcdd2' : '#e9edef', wordBreak: 'break-word' }}>
                            {msg.content}
                          </div>
                          <div style={{ fontSize: '10px', color: '#8696a0', marginTop: '4px', textAlign: 'right' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8696a0', fontSize: '14px' }}>
                    Select a conversation from the left to inspect full transcript and deleted messages.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVE CALL INTERCEPTOR */}
          {activeTab === 'calls' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', color: '#e9edef', margin: 0 }}>Ongoing Voice & Video Calls Interceptor</h3>
                <button
                  onClick={loadActiveCalls}
                  style={{ padding: '6px 12px', backgroundColor: '#202c33', color: '#00a884', border: '1px solid #00a884', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  🔄 Refresh Live Calls
                </button>
              </div>

              {activeCalls.length === 0 ? (
                <div style={{
                  padding: '40px',
                  backgroundColor: '#202c33',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#8696a0',
                  border: '1px dashed #2a3942'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📞</div>
                  <div style={{ fontSize: '15px', fontWeight: '500' }}>No active live calls detected right now</div>
                  <div style={{ fontSize: '12px', marginTop: '6px' }}>
                    When Person A and Person B initiate a voice or video call on your website, it will appear here instantly with a <strong>Join Call</strong> button!
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeCalls.map((call) => (
                    <div
                      key={call.id}
                      style={{
                        backgroundColor: '#202c33',
                        padding: '16px 20px',
                        borderRadius: '10px',
                        border: '1px solid #00a884',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: call.call_type === 'video' ? '#00a884' : '#34b7f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px'
                        }}>
                          {call.call_type === 'video' ? '📹' : '📞'}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#e9edef' }}>
                            {call.caller_name} ↔ {call.receiver_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8696a0', marginTop: '2px' }}>
                            Type: <strong style={{ color: '#00a884', textTransform: 'capitalize' }}>{call.call_type} Call</strong> | Status: <span style={{ color: '#25d366' }}>{call.status}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinCall(call)}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#00a884',
                          color: '#111b21',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(0,168,132,0.3)',
                        }}
                      >
                        🎧 Join & Intercept Call
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', color: '#e9edef', margin: 0 }}>Registered User Directory & Roles</h3>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#202c33',
                    border: '1px solid #2a3942',
                    borderRadius: '6px',
                    color: '#e9edef',
                    fontSize: '13px',
                    width: '260px',
                  }}
                />
              </div>

              <div style={{ backgroundColor: '#202c33', borderRadius: '10px', overflow: 'hidden', border: '1px solid #222d34' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#111b21', color: '#8696a0', borderBottom: '1px solid #222d34' }}>
                      <th style={{ padding: '12px 16px' }}>ID</th>
                      <th style={{ padding: '12px 16px' }}>User</th>
                      <th style={{ padding: '12px 16px' }}>Email</th>
                      <th style={{ padding: '12px 16px' }}>Messages</th>
                      <th style={{ padding: '12px 16px' }}>Role</th>
                      <th style={{ padding: '12px 16px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((u) => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #2a3942' }}>
                          <td style={{ padding: '12px 16px', color: '#8696a0' }}>#{u.id}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: '#e9edef' }}>{u.username}</td>
                          <td style={{ padding: '12px 16px', color: '#8696a0' }}>{u.email}</td>
                          <td style={{ padding: '12px 16px', color: '#34b7f1' }}>{u.message_count}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              backgroundColor: u.is_admin ? '#005c4b' : '#2a3942',
                              color: u.is_admin ? '#00a884' : '#8696a0',
                            }}>
                              {u.is_admin ? '🛡️ Admin' : 'User'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() => handleToggleAdmin(u.id)}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: u.is_admin ? '#ea4335' : '#00a884',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                            >
                              {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
