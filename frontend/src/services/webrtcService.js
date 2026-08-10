/**
 * Native WebRTC PeerConnection Service
 * Universal MediaStream acquisition (audio: true, video: true) for 100% Mobile & Desktop compatibility.
 */

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10,
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
    const hasLiveVideo = this.localStream?.getVideoTracks().some((t) => t.readyState === 'live');
    const hasLiveAudio = this.localStream?.getAudioTracks().some((t) => t.readyState === 'live');

    if (this.localStream && hasLiveAudio && (!isVideo || hasLiveVideo)) {
      this.localStream.getTracks().forEach((t) => (t.enabled = true));
      return this.localStream;
    }

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
        audio: true,
        video: isVideo ? true : false
      });
      console.log('WebRTC: Acquired voice & media stream (audio: true)');
      this.localStream.getTracks().forEach((t) => (t.enabled = true));
      return this.localStream;
    } catch (err) {
      console.warn('WebRTC: Full media capture warning, trying audio-only boolean:', err);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
        console.log('WebRTC: Acquired audio-only stream');
        this.localStream.getTracks().forEach((t) => (t.enabled = true));
        return this.localStream;
      } catch (audioErr) {
        console.warn('WebRTC: Microphone access denied or unsupported:', audioErr);
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

    // Explicitly add bidirectional audio transceiver for guaranteed SDP audio allocation
    try {
      this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
      if (this.localStream?.getVideoTracks().length > 0) {
        this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });
      }
    } catch (e) {
      console.warn('WebRTC transceiver warning:', e);
    }

    this.peerConnection.ontrack = (event) => {
      console.log('WebRTC: Remote track received:', event.track.kind, event.streams);
      event.track.enabled = true;
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      this.remoteStream = stream;

      const freshStream = new MediaStream(this.remoteStream.getTracks());
      if (onTrackCallback) onTrackCallback(freshStream, event.track);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && onIceCandidateCallback) {
        onIceCandidateCallback(event.candidate);
      }
    };

    if (this.localStream) {
      console.log('WebRTC: Adding local tracks to peerConnection:', this.localStream.getTracks().length);
      this.localStream.getTracks().forEach((track) => {
        track.enabled = true;
        try {
          this.peerConnection.addTrack(track, this.localStream);
        } catch (e) {
          console.warn('WebRTC addTrack warning:', e);
        }
      });
    }

    return this.peerConnection;
  }

  async createOffer() {
    if (!this.peerConnection) return null;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);
      console.log('WebRTC: Created and set local SDP offer successfully');
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
      console.log('WebRTC: Remote SDP answer set successfully');
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
      console.log('WebRTC: Remote SDP offer set successfully on callee');
      await this.flushPendingIceCandidates();

      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(answer);
      console.log('WebRTC: Created and set local SDP answer successfully');
      return answer;
    } catch (e) {
      console.error('WebRTC: Error handling offer and creating answer:', e);
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

    if (!this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
      this.pendingIceCandidates.push(candidateObj);
    } else {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateObj));
        console.log('WebRTC: Added ICE candidate successfully');
      } catch (e) {
        console.warn('WebRTC: Error adding ICE candidate:', e.message);
      }
    }
  }

  async flushPendingIceCandidates() {
    while (this.pendingIceCandidates.length > 0) {
      const candidateObj = this.pendingIceCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateObj));
        console.log('WebRTC: Flushed pending ICE candidate');
      } catch (e) {
        console.warn('WebRTC: Error flushing pending ICE candidate:', e.message);
      }
    }
  }

  cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.close();
      this.peerConnection = null;
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
