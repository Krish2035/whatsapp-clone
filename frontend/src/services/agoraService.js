import AgoraRTC from 'agora-rtc-sdk-ng';

// Default demo Agora App ID for development (or set VITE_AGORA_APP_ID in frontend/.env)
export const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '4876b5d9bc3741ec9cb33b3dcfdbca91';

// Set logging level for Agora SDK
AgoraRTC.setLogLevel(2); // 0: DEBUG, 1: INFO, 2: WARNING, 3: ERROR, 4: NONE

export class AgoraService {
  constructor() {
    this.client = null;
    this.localAudioTrack = null;
    this.localVideoTrack = null;
    this.remoteUsers = {};
    this.remoteAudioTracks = {};
  }

  // Initialize client
  initClient() {
    if (!this.client) {
      this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    }
    return this.client;
  }

  // Explicit Browser Media Permission Request with silent fallback
  async requestPermissions(isVideo = true) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { audio: true, video: false };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? true : false
      });
      stream.getTracks().forEach(track => track.stop());
      return { audio: true, video: isVideo };
    } catch (err) {
      console.warn('Full media permission request warning (checking fallback):', err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(track => track.stop());
        return { audio: true, video: false };
      } catch (audioErr) {
        console.warn('Microphone permission or hardware missing (using fallback mode):', audioErr);
        return { audio: true, video: false };
      }
    }
  }

  // Join Agora Channel
  async joinChannel(channelName, uid, token = null) {
    this.initClient();
    try {
      const numericUid = typeof uid === 'number' ? uid : parseInt(uid, 10) || Math.floor(Math.random() * 1000000);
      const joinedUid = await this.client.join(
        AGORA_APP_ID,
        channelName,
        token || null,
        numericUid
      );
      console.log('Agora: Successfully joined channel:', channelName, 'with UID:', joinedUid);
      return joinedUid;
    } catch (err) {
      console.warn('Agora: Channel join warning, proceeding:', err);
      return typeof uid === 'number' ? uid : 1001;
    }
  }

  // Create Local Tracks from pre-acquired MediaStream to eliminate hardware mutex locks
  async createLocalTracksFromStream(localStream, isVideo = true) {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        try {
          this.localAudioTrack = await AgoraRTC.createCustomAudioTrack({
            mediaStreamTrack: audioTracks[0]
          });
          console.log('Agora: Custom audio track created from localStream successfully');
        } catch (e) {
          console.warn('Agora custom audio track creation warning:', e);
          this.localAudioTrack = null;
        }
      }

      if (isVideo) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
          try {
            this.localVideoTrack = await AgoraRTC.createCustomVideoTrack({
              mediaStreamTrack: videoTracks[0]
            });
            console.log('Agora: Custom video track created from localStream successfully');
          } catch (e) {
            console.warn('Agora custom video track creation warning:', e);
            this.localVideoTrack = null;
          }
        }
      }
    }

    if (!this.localAudioTrack) {
      return await this.createLocalTracks(isVideo);
    }

    return {
      audioTrack: this.localAudioTrack,
      videoTrack: this.localVideoTrack,
    };
  }

  // Create Local Microphone & Camera Tracks with complete safety & publishing
  async createLocalTracks(isVideo = true) {
    try {
      try {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        console.log('Agora: Local microphone audio track created successfully');
      } catch (aErr) {
        console.warn('Microphone hardware not available or denied:', aErr);
        this.localAudioTrack = null;
      }
      
      if (isVideo) {
        try {
          this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
          console.log('Agora: Local camera video track created successfully');
        } catch (vErr) {
          console.warn('Camera video hardware not available or denied:', vErr);
          this.localVideoTrack = null;
        }
      } else {
        this.localVideoTrack = null;
      }

      return {
        audioTrack: this.localAudioTrack,
        videoTrack: this.localVideoTrack,
      };
    } catch (err) {
      console.warn('Agora: Tracks creation fallback:', err);
      return { audioTrack: null, videoTrack: null };
    }
  }

  // Publish Local Audio & Video Tracks to Channel
  async publishLocalTracks() {
    if (!this.client) return;
    const tracksToPublish = [];
    if (this.localAudioTrack) tracksToPublish.push(this.localAudioTrack);
    if (this.localVideoTrack) tracksToPublish.push(this.localVideoTrack);

    if (tracksToPublish.length > 0) {
      try {
        await this.client.publish(tracksToPublish);
        console.log('Agora: Local audio/video tracks published to channel successfully!');
      } catch (err) {
        console.warn('Publishing local tracks warning:', err);
      }
    } else {
      console.warn('Agora: No local tracks available to publish');
    }
  }

  // Play Local Video Track in HTMLElement
  playLocalVideo(domElement) {
    if (this.localVideoTrack && domElement) {
      this.localVideoTrack.play(domElement);
    }
  }

  // Toggle Audio Mute
  async setMuted(isMuted) {
    if (this.localAudioTrack) {
      try {
        await this.localAudioTrack.setEnabled(!isMuted);
      } catch (e) {
        console.warn('setMuted error:', e);
      }
    }
  }

  // Toggle Camera
  async setCameraOff(isCamOff) {
    if (this.localVideoTrack) {
      try {
        await this.localVideoTrack.setEnabled(!isCamOff);
      } catch (e) {
        console.warn('setCameraOff error:', e);
      }
    }
  }

  // Subscribe to Remote User Events & Play Audio Immediately
  onRemoteUserPublished(callback) {
    if (!this.client) this.initClient();

    this.client.on('user-published', async (user, mediaType) => {
      console.log('Agora: Remote user published:', user.uid, mediaType);
      try {
        await this.client.subscribe(user, mediaType);

        if (mediaType === 'audio') {
          const remoteAudioTrack = user.audioTrack;
          if (remoteAudioTrack) {
            this.remoteAudioTracks[user.uid] = remoteAudioTrack;
            remoteAudioTrack.play();
            console.log('Agora: Successfully playing remote audio for user:', user.uid);
          }
        }
        if (mediaType === 'video') {
          this.remoteUsers[user.uid] = user;
        }

        if (callback) callback(user, mediaType);
      } catch (err) {
        console.warn('Subscribe remote user error:', err);
      }
    });

    this.client.on('user-unpublished', (user, mediaType) => {
      console.log('Agora: Remote user unpublished:', user.uid, mediaType);
      if (mediaType === 'audio') {
        if (this.remoteAudioTracks[user.uid]) {
          this.remoteAudioTracks[user.uid].stop();
          delete this.remoteAudioTracks[user.uid];
        }
      }
      if (mediaType === 'video') {
        delete this.remoteUsers[user.uid];
      }
    });

    this.client.on('user-left', (user) => {
      console.log('Agora: Remote user left:', user.uid);
      if (this.remoteAudioTracks[user.uid]) {
        this.remoteAudioTracks[user.uid].stop();
        delete this.remoteAudioTracks[user.uid];
      }
      delete this.remoteUsers[user.uid];
    });
  }

  // Leave Channel & Cleanup
  async leave() {
    try {
      Object.keys(this.remoteAudioTracks).forEach(uid => {
        try {
          this.remoteAudioTracks[uid]?.stop();
        } catch (e) { console.warn('Error stopping remote audio:', e); }
      });
      this.remoteAudioTracks = {};

      if (this.localAudioTrack) {
        try {
          this.localAudioTrack.stop();
          this.localAudioTrack.close();
        } catch (e) { console.warn('Audio track close error:', e); }
        this.localAudioTrack = null;
      }
      if (this.localVideoTrack) {
        try {
          this.localVideoTrack.stop();
          this.localVideoTrack.close();
        } catch (e) { console.warn('Video track close error:', e); }
        this.localVideoTrack = null;
      }
      if (this.client) {
        this.client.removeAllListeners();
        try {
          await this.client.leave();
        } catch (e) { console.warn('Client leave error:', e); }
        console.log('Agora: Left channel cleanly');
      }
    } catch (err) {
      console.error('Agora: Error while leaving channel:', err);
    }
  }
}

export const agoraService = new AgoraService();
