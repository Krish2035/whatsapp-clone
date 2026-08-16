/**
 * Native WebRTC PeerConnection Service
 * Handles 1-to-1 Voice & Video WebRTC connections
 */

import { ringtoneService } from './ringtoneService';
import { getEnv } from '../utils/env';

let _remoteAudioEl = null;

function getRemoteAudioEl() {
  if (typeof document === 'undefined') return null;
  if (!_remoteAudioEl) {
    _remoteAudioEl = document.createElement('audio');
    _remoteAudioEl.autoplay = true;
    _remoteAudioEl.playsInline = true;
    _remoteAudioEl.volume = 1.0;
    document.body.appendChild(_remoteAudioEl);
  }
  return _remoteAudioEl;
}

function getIceServersConfig() {
  const customStun = getEnv('VITE_STUN_SERVER');
  const customTurn = getEnv('VITE_TURN_SERVER');
  const customTurnUsername = getEnv('VITE_TURN_USERNAME');
  const customTurnCredential = getEnv('VITE_TURN_CREDENTIAL');

  const stunUrls = customStun
    ? customStun.split(',').map((u) => u.trim())
    : [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:global.stun.twilio.com:3478',
      ];

  const servers = stunUrls.map((url) => ({ urls: url }));

  const turnUrls = customTurn
    ? (customTurn.includes(',') ? customTurn.split(',').map((u) => u.trim()) : [customTurn])
    : [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ];

  servers.push({
    urls: turnUrls,
    username: customTurnUsername || 'openrelayproject',
    credential: customTurnCredential || 'openrelayproject',
  });

  return {
    iceServers: servers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}

export class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.pendingIceCandidates = [];
    this.onConnectionStateChangeCallback = null;
  }

  setConnectionStateCallback(cb) {
    this.onConnectionStateChangeCallback = cb;
  }

  async getAvailableCameras() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch (e) {
      console.warn('WebRTC: Error enumerating video devices:', e);
      return [];
    }
  }

  async getLocalStream(isVideo = false) {
    const hasLiveAudio = this.localStream?.getAudioTracks().some((t) => t.readyState === 'live');
    const hasLiveVideo = this.localStream?.getVideoTracks().some((t) => t.readyState === 'live');

    // Return existing stream only if it satisfies the exact call type requirements
    if (this.localStream && hasLiveAudio && (!isVideo || hasLiveVideo)) {
      this.localStream.getTracks().forEach((t) => (t.enabled = true));
      return this.localStream;
    }

    // Stop any stale stream before acquiring new media
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const error = new Error('Browser does not support navigator.mediaDevices.getUserMedia');
      error.name = 'NotSupportedError';
      throw error;
    }

    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    // STRICT PERMISSION SCOPING: Request camera ONLY when callType is video
    const videoConstraints = isVideo ? { facingMode: 'user' } : false;

    console.log(`WebRTC: Requesting getUserMedia -> Audio: true, Video: ${Boolean(videoConstraints)}`);

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      });
      console.log('WebRTC: ✅ Acquired local MediaStream. Tracks:', this.localStream.getTracks().map((t) => t.kind));
      this.localStream.getTracks().forEach((t) => (t.enabled = true));
      return this.localStream;
    } catch (err) {
      console.error(`WebRTC: Media acquisition failed (${err.name}):`, err.message);

      // Clean up any partially acquired tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach((t) => t.stop());
        this.localStream = null;
      }
      throw err;
    }
  }

  async switchCamera(targetDeviceId) {
    if (!this.peerConnection || !this.localStream) {
      console.warn('WebRTC: Cannot switch camera without an active local stream and PeerConnection');
      return false;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: targetDeviceId } },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = this.localStream.getVideoTracks()[0];

      if (oldVideoTrack) {
        this.localStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      this.localStream.addTrack(newVideoTrack);

      // Use RTCRtpSender.replaceTrack to swap video track on active RTCPeerConnection
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(newVideoTrack);
        console.log('WebRTC: ✅ Camera track replaced via replaceTrack');
      }
      return true;
    } catch (err) {
      console.error('WebRTC: Failed to switch camera track:', err);
      return false;
    }
  }

  createPeerConnection(onTrackCallback, onIceCandidateCallback) {
    if (this.peerConnection) {
      this.cleanupPeerConnection();
    }

    console.log('WebRTC: Creating new RTCPeerConnection');
    this.peerConnection = new RTCPeerConnection(getIceServersConfig());
    this.pendingIceCandidates = [];

    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('WebRTC: connectionState ->', state);
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('WebRTC: iceConnectionState ->', this.peerConnection?.iceConnectionState);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('WebRTC: signalingState ->', this.peerConnection?.signalingState);
    };

    // On remote track arrival
    this.peerConnection.ontrack = (event) => {
      console.log('WebRTC: ✅ Remote track received:', event.track.kind, '| streams:', event.streams.length);
      event.track.enabled = true;

      const stream = (event.streams && event.streams[0])
        ? event.streams[0]
        : new MediaStream([event.track]);
      this.remoteStream = stream;

      if (event.track.kind === 'audio') {
        const audioEl = getRemoteAudioEl();
        audioEl.srcObject = stream;
        audioEl.volume = 1.0;
        audioEl.muted = false;
        audioEl.play().catch((e) => {
          console.warn('WebRTC: Audio autoplay blocked, unmuting listener added:', e.name);
          event.track.onunmute = () => {
            audioEl.play().catch(() => {});
          };
        });
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
      console.log('WebRTC: Adding local tracks:', this.localStream.getTracks().map((t) => t.kind));
      this.localStream.getTracks().forEach((track) => {
        track.enabled = true;
        try {
          this.peerConnection.addTrack(track, this.localStream);
        } catch (e) {
          console.warn('WebRTC addTrack warning:', e.message);
        }
      });
    } else {
      console.warn('WebRTC: No localStream tracks yet, adding fallback transceiver');
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
        voiceActivityDetection: false,
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
        voiceActivityDetection: false,
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
    if (_remoteAudioEl) {
      _remoteAudioEl.srcObject = null;
    }
    this.remoteStream = null;
    this.pendingIceCandidates = [];
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`WebRTC: Stopped track ${track.kind}`);
      });
      this.localStream = null;
    }
    this.cleanupPeerConnection();
  }
}

export const webrtcService = new WebRTCService();
