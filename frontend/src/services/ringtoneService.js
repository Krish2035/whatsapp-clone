/**
 * Studio-Quality WhatsApp Chime Ringtone Synthesizer & WebAudio Voice Engine
 * 1. Plays modern polyphonic chime sequence exclusively on incoming calls for the receiver.
 * 2. Instant termination of scheduled oscillator notes upon answering or rejecting calls.
 * 3. Clean WebAudio synthesizer isolated from native HTML5 WebRTC audio stream playback.
 */

class RingtoneService {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.timerId = null;
    this.activeOscillators = [];
    this.activeGains = [];
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Play Premium WhatsApp Chime Ringtone (Polyphonic Bell Harmonics)
  startRingtone() {
    this.stopRingtone();
    this.initContext();
    if (!this.audioCtx) return;

    this.isPlaying = true;

    // Studio Polyphonic Bell Chime Sequence (Frequencies in Hz)
    const chords = [
      { f1: 440.00, f2: 659.25, duration: 0.15 }, // A4 + E5
      { f1: 554.37, f2: 880.00, duration: 0.15 }, // C#5 + A5
      { f1: 659.25, f2: 987.77, duration: 0.18 }, // E5 + B5
      { f1: 880.00, f2: 1108.73, duration: 0.35 } // A5 + C#6 (decay chime)
    ];

    const playPattern = () => {
      if (!this.isPlaying || !this.audioCtx) return;

      let currentTime = this.audioCtx.currentTime + 0.05;

      chords.forEach((chord) => {
        if (!this.isPlaying) return;
        try {
          const osc1 = this.audioCtx.createOscillator();
          const osc2 = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(chord.f1, currentTime);
          osc2.frequency.setValueAtTime(chord.f2, currentTime);

          gain.gain.setValueAtTime(0.15, currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, currentTime + chord.duration + 0.12);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.audioCtx.destination);

          this.activeOscillators.push(osc1, osc2);
          this.activeGains.push(gain);

          osc1.start(currentTime);
          osc2.start(currentTime);
          osc1.stop(currentTime + chord.duration + 0.14);
          osc2.stop(currentTime + chord.duration + 0.14);
        } catch (e) {
          console.warn('Chime note error:', e);
        }

        currentTime += chord.duration + 0.06;
      });

      if (this.isPlaying) {
        this.timerId = setTimeout(playPattern, 2000);
      }
    };

    playPattern();
  }

  // Instant ringtone kill-switch upon accepting/rejecting/connecting call
  stopRingtone() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.activeGains && this.activeGains.length > 0) {
      this.activeGains.forEach((g) => {
        try {
          g.gain.cancelScheduledValues(0);
          g.gain.setValueAtTime(0, 0);
          g.disconnect();
        } catch (e) {}
      });
      this.activeGains = [];
    }
    if (this.activeOscillators && this.activeOscillators.length > 0) {
      this.activeOscillators.forEach((osc) => {
        try {
          osc.stop(0);
          osc.disconnect();
        } catch (e) {}
      });
      this.activeOscillators = [];
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.suspend().catch(() => {});
      } catch (e) {}
    }
  }

  async pipeRemoteAudioStream(remoteStream) {
    if (!remoteStream) return;
    const audioTracks = remoteStream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks.forEach((t) => {
        t.enabled = true;
      });
      console.log('RingtoneService: Activated remote audio tracks:', audioTracks.length);
    }
  }

  cleanupRemoteAudio() {
    if (this.remoteSourceNode) {
      try {
        this.remoteSourceNode.disconnect();
      } catch (e) {}
      this.remoteSourceNode = null;
    }
  }
}

export const ringtoneService = new RingtoneService();
