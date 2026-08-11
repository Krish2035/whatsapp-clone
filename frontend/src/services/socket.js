import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  // Use relative origin so Vite proxy handles /socket.io correctly for localhost, IP, and ngrok HTTPS
  return undefined;
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
      console.log('SocketService: Connecting to socket origin:', SOCKET_URL || window.location.origin);
      this.socket = io(SOCKET_URL, {
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
}

export const socketService = new SocketService();
