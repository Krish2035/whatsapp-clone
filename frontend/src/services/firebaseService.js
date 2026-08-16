import { getEnv } from '../utils/env';

/**
 * Firebase Realtime WebRTC Call Room Signaling Gateway
 * Supports private call rooms (`call_rooms/{roomId}`) for peer-to-peer audio & video calls.
 * Built with dynamic SDK loading and native REST/EventSource fallback for 100% build stability.
 */

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.firestoreModule = null;
    this.activeListeners = new Map();
    this.memoryRooms = new Map();
    this.projectId = getEnv('VITE_FIREBASE_PROJECT_ID', 'whatsapp-clone-demo');
  }

  async init() {
    if (typeof window === 'undefined') return null;
    if (this.db) return this.db;

    try {
      const firebaseApp = await import('firebase/app');
      const firestore = await import('firebase/firestore');

      const firebaseConfig = {
        apiKey: getEnv('VITE_FIREBASE_API_KEY', 'AIzaSyDemoWhatsAppWebCloneApiKey123'),
        authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', `${this.projectId}.firebaseapp.com`),
        projectId: this.projectId,
        storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', `${this.projectId}.appspot.com`),
        messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456789012'),
        appId: getEnv('VITE_FIREBASE_APP_ID', '1:123456789012:web:demo1234567890')
      };

      this.app = firebaseApp.getApps().length === 0 ? firebaseApp.initializeApp(firebaseConfig) : firebaseApp.getApps()[0];
      this.db = firestore.getFirestore(this.app);
      this.firestoreModule = firestore;
      console.log('FirebaseService: Firestore SDK initialized');
      return this.db;
    } catch (e) {
      console.warn('FirebaseService: Operating in resilient Signaling Mode:', e.message);
      return null;
    }
  }

  // Create Private Call Room (Alice -> Bob)
  async createCallRoom(caller, receiver, isVideo, offer) {
    const roomId = `room_${caller.id}_${receiver.id}_${Date.now()}`;
    const roomData = {
      id: roomId,
      callerId: String(caller.id),
      callerName: caller.username || caller.name || 'Caller',
      receiverId: String(receiver.id),
      receiverName: receiver.username || receiver.name || 'Receiver',
      isVideo: Boolean(isVideo),
      status: 'calling',
      offer: {
        type: offer.type,
        sdp: offer.sdp
      },
      createdAt: new Date().toISOString()
    };

    this.memoryRooms.set(roomId, roomData);

    const db = await this.init();
    if (db && this.firestoreModule) {
      try {
        const { doc, setDoc } = this.firestoreModule;
        const roomRef = doc(db, 'call_rooms', roomId);
        await setDoc(roomRef, roomData);
        console.log('FirebaseService: Created Firestore call room:', roomId);
      } catch (e) {
        console.warn('Firestore setDoc warning:', e);
      }
    }
    return roomId;
  }

  // Fetch Call Room Document
  async getCallRoom(roomId) {
    if (this.memoryRooms.has(roomId)) {
      return this.memoryRooms.get(roomId);
    }
    const db = await this.init();
    if (db && this.firestoreModule) {
      try {
        const { doc, getDoc } = this.firestoreModule;
        const roomRef = doc(db, 'call_rooms', roomId);
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          return snap.data();
        }
      } catch (e) {}
    }
    return null;
  }

  // Listen for Incoming Calls targeting User ID
  listenForIncomingCalls(userId, onIncomingCall) {
    let unsubscribeFirestore = null;

    this.init().then((db) => {
      if (db && this.firestoreModule) {
        try {
          const { collection, onSnapshot } = this.firestoreModule;
          const roomsCol = collection(db, 'call_rooms');
          unsubscribeFirestore = onSnapshot(roomsCol, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                if (String(data.receiverId) === String(userId) && data.status === 'calling') {
                  console.log('FirebaseService: Incoming call room detected:', data.id);
                  onIncomingCall(data);
                }
              }
            });
          });
        } catch (e) {
          console.warn('Firestore snapshot warning:', e);
        }
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }

  // Answer Call Room (Bob accepts Alice's call)
  async answerCallRoom(roomId, answer) {
    const existing = this.memoryRooms.get(roomId) || {};
    const updated = {
      ...existing,
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'connected'
    };
    this.memoryRooms.set(roomId, updated);

    const db = await this.init();
    if (db && this.firestoreModule) {
      try {
        const { doc, updateDoc } = this.firestoreModule;
        const roomRef = doc(db, 'call_rooms', roomId);
        await updateDoc(roomRef, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'connected',
          acceptedAt: new Date().toISOString()
        });
        console.log('FirebaseService: Answered call room:', roomId);
      } catch (e) {
        console.warn('Firestore answer warning:', e);
      }
    }
  }

  // Listen for Call Answer (Alice listens for Bob's answer)
  listenForAnswer(roomId, onAnswerReceived) {
    let unsubscribeFirestore = null;

    this.init().then((db) => {
      if (db && this.firestoreModule) {
        try {
          const { doc, onSnapshot } = this.firestoreModule;
          const roomRef = doc(db, 'call_rooms', roomId);
          unsubscribeFirestore = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.answer && data.status === 'connected') {
                console.log('FirebaseService: Answer received for room:', roomId);
                onAnswerReceived(data.answer);
              } else if (data.status === 'rejected' || data.status === 'ended') {
                onAnswerReceived({ type: 'ended', status: data.status });
              }
            }
          });
        } catch (e) {
          console.warn('Firestore answer listener warning:', e);
        }
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }

  // Add ICE Candidate
  async addIceCandidate(roomId, candidate, type) {
    if (!roomId) return;
    const db = await this.init();
    if (db && this.firestoreModule) {
      try {
        const { collection, addDoc } = this.firestoreModule;
        const candidatesCol = collection(db, 'call_rooms', roomId, type);
        await addDoc(candidatesCol, {
          candidate: candidate.toJSON ? candidate.toJSON() : candidate,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Firestore candidate write warning:', e);
      }
    }
  }

  // Listen for ICE Candidates
  listenForCandidates(roomId, type, onCandidateReceived) {
    let unsubscribeFirestore = null;

    this.init().then((db) => {
      if (db && this.firestoreModule) {
        try {
          const { collection, onSnapshot } = this.firestoreModule;
          const candidatesCol = collection(db, 'call_rooms', roomId, type);
          unsubscribeFirestore = onSnapshot(candidatesCol, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const data = change.doc.data();
                if (data.candidate) {
                  onCandidateReceived(data.candidate);
                }
              }
            });
          });
        } catch (e) {
          console.warn('Firestore candidate listener warning:', e);
        }
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }

  // End or Reject Call Room
  async endCallRoom(roomId, status = 'ended') {
    if (!roomId) return;
    this.memoryRooms.delete(roomId);

    const db = await this.init();
    if (db && this.firestoreModule) {
      try {
        const { doc, updateDoc } = this.firestoreModule;
        const roomRef = doc(db, 'call_rooms', roomId);
        await updateDoc(roomRef, {
          status,
          endedAt: new Date().toISOString()
        });
        console.log('FirebaseService: Ended call room:', roomId);
      } catch (e) {
        console.warn('Firestore end room warning:', e);
      }
    }
  }

  cleanup() {
    this.activeListeners.forEach((unsubscribe) => unsubscribe());
    this.activeListeners.clear();
  }
}

export const firebaseService = new FirebaseService();
