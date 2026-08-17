import { io } from 'socket.io-client';
import { getEnv } from '../utils/env';

const getSocketUrl = () => {
  const url = getEnv('VITE_SOCKET_URL') || getEnv('NEXT_PUBLIC_SOCKET_URL') || 'https://whatsapp-backend.onrender.com';
  return url;
};

const SOCKET_URL = getSocketUrl();

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.lastEmittedUserId = null;
  }

  connect(userId) {
    if (userId) {
      this.userId = userId;
    }

    if (!this.socket) {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      console.log('SocketService: Connecting to socket origin:', SOCKET_URL || window.location.origin);
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 50,
        reconnectionDelay: 500,
      });

      this.socket.on('connect', () => {
        console.log('SocketService: Connected with socket ID:', this.socket.id, 'user:', this.userId);
        if (this.userId) {
          this.socket.emit('user_connected', this.userId);
          this.lastEmittedUserId = this.userId;
        }
      });

      this.socket.on('connect_error', (err) => {
        console.warn('SocketService: Connection error:', err.message);
      });
    } else {
      if (this.socket.connected && this.userId && this.lastEmittedUserId !== this.userId) {
        console.log('SocketService: Emitting user_connected for connected socket:', this.userId);
        this.socket.emit('user_connected', this.userId);
        this.lastEmittedUserId = this.userId;
      }
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.lastEmittedUserId = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // =========================================================================
  // Call Signaling & WebRTC Transport Helpers
  // =========================================================================

  initiateCall({ receiverId, callType = 'voice', conversationId = null, channelName = null, signalData = null }) {
    if (this.socket) {
      this.socket.emit('CALL_INITIATE', {
        receiverId,
        userToCall: receiverId,
        callType,
        conversationId,
        channelName,
        signalData,
        signal: signalData,
        from: this.userId,
      });
    }
  }

  acceptCall({ callId, callerId, signal = null }) {
    if (this.socket) {
      this.socket.emit('CALL_ACCEPT', {
        callId,
        to: callerId,
        callerId,
        signal,
      });
    }
  }

  rejectCall({ callId, callerId, reason = 'rejected' }) {
    if (this.socket) {
      this.socket.emit('CALL_REJECT', {
        callId,
        to: callerId,
        callerId,
        reason,
      });
    }
  }

  cancelCall({ callId, receiverId, reason = 'cancelled' }) {
    if (this.socket) {
      this.socket.emit('CALL_CANCEL', {
        callId,
        to: receiverId,
        receiverId,
        reason,
      });
    }
  }

  endCall({ callId, targetUserId, durationSeconds = 0 }) {
    if (this.socket) {
      this.socket.emit('CALL_END', {
        callId,
        to: targetUserId,
        targetUserId,
        durationSeconds,
      });
    }
  }

  sendWebRtcOffer({ callId, targetUserId, offer }) {
    if (this.socket) {
      this.socket.emit('WEBRTC_OFFER', {
        callId,
        targetUserId,
        offer,
      });
    }
  }

  sendWebRtcAnswer({ callId, targetUserId, answer }) {
    if (this.socket) {
      this.socket.emit('WEBRTC_ANSWER', {
        callId,
        targetUserId,
        answer,
      });
    }
  }

  sendWebRtcIceCandidate({ callId, targetUserId, candidate }) {
    if (this.socket) {
      this.socket.emit('WEBRTC_ICE_CANDIDATE', {
        callId,
        targetUserId,
        to: targetUserId,
        candidate,
      });
    }
  }
}

export const socketService = new SocketService();
