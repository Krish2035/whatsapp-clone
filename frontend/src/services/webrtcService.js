/**
 * Native WebRTC PeerConnection Service
 * Root cause fix: uses a module-level <audio> element to bypass React async
 * rendering, which prevented remoteAudioRef.current.play() from being
 * called inside a user gesture context (Chrome/Safari autoplay policy).
 */

import { ringtoneService } from './ringtoneService';

// Module-level audio element — exists outside React's render cycle
// so it can be assigned srcObject the exact moment ontrack fires,
// guaranteeing it's always within a user-activated audio context.
let _remoteAudioEl = null;

function getRemoteAudioEl() {
  if (!_remoteAudioEl) {
    _remoteAudioEl = document.createElement('audio');
    _remoteAudioEl.autoplay = true;
    _remoteAudioEl.playsInline = true;
    _remoteAudioEl.volume = 1.0;
    document.body.appendChild(_remoteAudioEl);
  }
  return _remoteAudioEl;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 0,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

export class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.pendingIceCandidates = [];
  }

  async getLocalStream(isVideo = true) {
    const hasLiveAudio = this.localStream?.getAudioTracks().some((t) => t.readyState === 'live');
    const hasLiveVideo = this.localStream?.getVideoTracks().some((t) => t.readyState === 'live');

    // Return existing stream only if it satisfies the exact requirements
    if (this.localStream && hasLiveAudio && (!isVideo || hasLiveVideo)) {
      this.localStream.getTracks().forEach((t) => (t.enabled = true));
      return this.localStream;
    }

    // Stop any stale stream before acquiring new one
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.warn('WebRTC: getUserMedia unsupported');
      this.localStream = new MediaStream();
      return this.localStream;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo ? { facingMode: 'user' } : false
      });
      console.log('WebRTC: ✅ Acquired media stream. Tracks:', this.localStream.getTracks().map(t => t.kind));
      this.localStream.getTracks().forEach((t) => (t.enabled = true));
      return this.localStream;
    } catch (err) {
      console.warn('WebRTC: Full media failed, trying audio-only:', err.name);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('WebRTC: ✅ Acquired audio-only stream');
        this.localStream.getTracks().forEach((t) => (t.enabled = true));
        return this.localStream;
      } catch (audioErr) {
        console.warn('WebRTC: Microphone access denied:', audioErr.name);
        this.localStream = new MediaStream();
        return this.localStream;
      }
    }
  }

  createPeerConnection(onTrackCallback, onIceCandidateCallback) {
    if (this.peerConnection) {
      this.cleanupPeerConnection();
    }

    console.log('WebRTC: Creating new RTCPeerConnection');
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.pendingIceCandidates = [];

    // Debug connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('WebRTC: connectionState ->', this.peerConnection?.connectionState);
    };
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('WebRTC: iceConnectionState ->', this.peerConnection?.iceConnectionState);
    };
    this.peerConnection.onsignalingstatechange = () => {
      console.log('WebRTC: signalingState ->', this.peerConnection?.signalingState);
    };

    // CRITICAL FIX: Assign audio stream directly to module-level audio element
    // the instant the remote track arrives — no React render cycle involved.
    this.peerConnection.ontrack = (event) => {
      console.log('WebRTC: ✅ Remote track received:', event.track.kind, '| streams:', event.streams.length);
      event.track.enabled = true;

      const stream = (event.streams && event.streams[0])
        ? event.streams[0]
        : new MediaStream([event.track]);
      this.remoteStream = stream;

      if (event.track.kind === 'audio') {
        // Direct DOM assignment — bypasses React state/render cycle entirely
        const audioEl = getRemoteAudioEl();
        audioEl.srcObject = stream;
        audioEl.volume = 1.0;
        audioEl.muted = false;
        audioEl.play().then(() => {
          console.log('WebRTC: ✅ Remote audio playing via module-level audio element!');
        }).catch((e) => {
          console.warn('WebRTC: Audio autoplay blocked, will retry on unmute:', e.name);
          event.track.onunmute = () => {
            audioEl.play().catch(() => {});
          };
        });
        // Also enable tracks
        ringtoneService.pipeRemoteAudioStream(stream);
      }

      const freshStream = new MediaStream(this.remoteStream.getTracks());
      if (onTrackCallback) onTrackCallback(freshStream, event.track);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && onIceCandidateCallback) {
        onIceCandidateCallback(event.candidate);
      }
    };

    // Add local tracks to peer connection
    if (this.localStream && this.localStream.getTracks().length > 0) {
      console.log('WebRTC: Adding local tracks:', this.localStream.getTracks().map(t => t.kind));
      this.localStream.getTracks().forEach((track) => {
        track.enabled = true;
        try {
          this.peerConnection.addTrack(track, this.localStream);
        } catch (e) {
          console.warn('WebRTC addTrack warning:', e.message);
        }
      });
    } else {
      // Fallback: add transceivers so the SDP offer includes audio
      console.warn('WebRTC: No localStream tracks yet, adding fallback transceivers');
      try {
        this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
      } catch (e) {
        console.warn('WebRTC fallback transceiver warning:', e.message);
      }
    }

    return this.peerConnection;
  }

  async createOffer() {
    if (!this.peerConnection) return null;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: false
      });
      await this.peerConnection.setLocalDescription(offer);
      console.log('WebRTC: ✅ SDP offer created and set');
      return offer;
    } catch (e) {
      console.error('WebRTC: Error creating offer:', e);
      return null;
    }
  }

  async handleAnswer(answer) {
    if (!this.peerConnection || !answer) return;
    try {
      const sdpAnswer = answer.sdp ? answer : { type: 'answer', sdp: answer };
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpAnswer));
      console.log('WebRTC: ✅ Remote SDP answer set');
      await this.flushPendingIceCandidates();
    } catch (e) {
      console.error('WebRTC: Error setting remote answer:', e);
    }
  }

  async handleOfferAndCreateAnswer(offer) {
    if (!this.peerConnection || !offer) return null;
    try {
      const sdpOffer = offer.sdp ? offer : { type: 'offer', sdp: offer };
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpOffer));
      console.log('WebRTC: ✅ Remote SDP offer set on callee');
      await this.flushPendingIceCandidates();

      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: false
      });
      await this.peerConnection.setLocalDescription(answer);
      console.log('WebRTC: ✅ SDP answer created and set');
      return answer;
    } catch (e) {
      console.error('WebRTC: Error handling offer:', e);
      return null;
    }
  }

  async addIceCandidate(candidateData) {
    if (!this.peerConnection || !candidateData) return;

    let candidateObj = candidateData;
    if (candidateData.candidate && typeof candidateData.candidate === 'object') {
      candidateObj = candidateData.candidate;
    }

    if (!candidateObj || (!candidateObj.candidate && !candidateObj.sdpCandidate)) return;

    if (!this.peerConnection.remoteDescription?.type) {
      this.pendingIceCandidates.push(candidateObj);
    } else {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateObj));
        console.log('WebRTC: ✅ ICE candidate added');
      } catch (e) {
        console.warn('WebRTC: ICE candidate error:', e.message);
      }
    }
  }

  async flushPendingIceCandidates() {
    while (this.pendingIceCandidates.length > 0) {
      const candidateObj = this.pendingIceCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateObj));
        console.log('WebRTC: ✅ Flushed pending ICE candidate');
      } catch (e) {
        console.warn('WebRTC: Pending ICE flush error:', e.message);
      }
    }
  }

  cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
    // Detach module-level audio element
    if (_remoteAudioEl) {
      _remoteAudioEl.srcObject = null;
    }
    this.remoteStream = null;
    this.pendingIceCandidates = [];
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.cleanupPeerConnection();
  }
}

export const webrtcService = new WebRTCService();
