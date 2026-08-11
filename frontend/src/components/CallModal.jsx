import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../context/useCall';
import { ringtoneService } from '../services/ringtoneService';

export default function CallModal() {
  const {
    callStatus,
    peerInfo,
    isVideoCall,
    isMuted,
    isCamOff,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    availableCameras,
    activeCameraId,
    switchCameraDevice,
  } = useCall();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);

  // Bind local video stream to DOM element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((e) => console.warn('Local video play warning:', e));
    }
  }, [localStream, callStatus]);

  // Bind remote stream to DOM element
  useEffect(() => {
    if (remoteStream) {
      const audioTracks = remoteStream.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = true;
      });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((e) => console.warn('Remote video play warning:', e));
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch((e) => console.warn('Fallback audio play:', e.name));
      }
    }
  }, [remoteStream, callStatus]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
        remoteAudioRef.current.play().catch(() => {});
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Reset minimization state on new incoming or outgoing call
  useEffect(() => {
    if (callStatus === 'incoming' || callStatus === 'calling') {
      setIsMinimized(false);
    }
  }, [callStatus]);

  if (callStatus === 'idle') return null;

  const isIncoming = callStatus === 'incoming';
  const isCalling = callStatus === 'calling';
  const isConnected = callStatus === 'connected';

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Screen Share Toggle Handler
  const handleShareScreen = async () => {
    if (isSharing) {
      setIsSharing(false);
      return;
    }
    try {
      if (navigator.mediaDevices?.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsSharing(true);
        stream.getVideoTracks()[0].onended = () => setIsSharing(false);
      }
    } catch (err) {
      console.warn('Screen share cancelled or not supported:', err);
      setIsSharing(false);
    }
  };

  // Render Minimized Floating Call Bar
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          backgroundColor: '#00a884',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 99999,
          fontWeight: '600',
          fontSize: '14px',
          transition: 'all 0.2s ease',
        }}
        aria-label="Expand Call Window"
      >
        <span style={{ fontSize: '18px' }}>{isVideoCall ? '📹' : '📞'}</span>
        <span>{peerInfo?.name || 'WhatsApp Call'}</span>
        <span style={{ opacity: 0.8, fontSize: '13px' }}>
          {isConnected ? formatDuration(callDuration) : isCalling ? 'Ringing...' : 'Incoming...'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            marginLeft: '4px',
          }}
          aria-label="Maximize Call Window"
        >
          ⤢
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0b141a',
        backgroundImage: 'radial-gradient(circle at center, #111b21 0%, #0b141a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 99999,
        color: '#e9edef',
        fontFamily: 'Segoe UI, Helvetica Neue, Helvetica, Roboto, sans-serif',
        padding: '16px 20px 28px 20px',
        overflow: 'hidden',
      }}
    >
      {/* Persistent Audio Player for Remote Voice Output */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        controls={false}
        style={{ visibility: 'hidden', width: '1px', height: '1px', position: 'absolute', bottom: '0', left: '0', pointerEvents: 'none' }}
      />

      {/* 1. Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '800px',
          padding: '8px 16px',
        }}
      >
        {/* Minimize Button */}
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#e9edef',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
          title="Minimize Call"
          aria-label="Minimize Call"
        >
          ↙️
        </button>

        {/* Contact Info Header */}
        <div style={{ textAlign: 'center', flex: 1, margin: '0 16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e9edef', marginBottom: '2px', lineHeight: '1.2' }}>
            {peerInfo?.name || 'WhatsApp Call'}
          </h2>
          <p style={{ fontSize: '13px', color: '#8696a0', fontWeight: '400', margin: 0 }}>
            {isIncoming
              ? `Incoming ${isVideoCall ? 'Video' : 'Voice'} Call...`
              : isCalling
              ? 'Ringing...'
              : isConnected
              ? formatDuration(callDuration)
              : ''}
          </p>
        </div>

        {/* Camera Switcher Dropdown (If multiple cameras available) */}
        {isVideoCall && availableCameras.length > 1 ? (
          <select
            value={activeCameraId || ''}
            onChange={(e) => switchCameraDevice(e.target.value)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#e9edef',
              border: 'none',
              borderRadius: '12px',
              padding: '6px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              outline: 'none',
            }}
            aria-label="Select Camera Input Device"
          >
            {availableCameras.map((cam, idx) => (
              <option key={cam.deviceId || idx} value={cam.deviceId} style={{ backgroundColor: '#111b21', color: '#e9edef' }}>
                {cam.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ width: '44px' }} />
        )}
      </div>

      {/* 2. Main Center Body Display */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          position: 'relative',
          margin: '20px 0',
        }}
      >
        {isVideoCall && isConnected ? (
          /* Video Stream Display Container (WhatsApp Responsive Layout) */
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '680px',
              height: '100%',
              maxHeight: '440px',
              backgroundColor: '#1c272e',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Primary Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#111b21',
                display: remoteStream ? 'block' : 'none',
              }}
            />
            {!remoteStream && (
              <div style={{ textAlign: 'center', color: '#8696a0', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📹</div>
                <p>Establishing encrypted peer-to-peer video stream...</p>
              </div>
            )}

            {/* Floating PIP Local Video Stream */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                width: '140px',
                height: '100px',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: '#202c33',
                border: '2px solid #00a884',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                display: isCamOff ? 'none' : 'block',
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        ) : (
          /* Voice Call Circular Avatar Display */
          <div
            style={{
              position: 'relative',
              width: '210px',
              height: '210px',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: isCalling
                ? '0 0 0 16px rgba(0, 168, 132, 0.15), 0 0 0 32px rgba(0, 168, 132, 0.08)'
                : '0 16px 40px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.3s ease',
              border: '4px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: '#00a884',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {peerInfo?.avatar_url ? (
              <img
                src={peerInfo.avatar_url}
                alt={peerInfo.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '84px', fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase' }}>
                {peerInfo?.name ? peerInfo.name.charAt(0) : 'W'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Control Panel Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#1f2c34',
          borderRadius: '32px',
          padding: '24px 20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {isIncoming ? (
          /* Incoming Call Action Controls */
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            {/* Accept Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  ringtoneService.initContext();
                  if (remoteAudioRef.current) {
                    remoteAudioRef.current.play().catch(() => {});
                  }
                  acceptCall();
                }}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: 'white',
                  fontSize: '26px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0, 168, 132, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                  transition: 'transform 0.15s',
                }}
                title="Accept Call"
                aria-label="Accept Call"
              >
                📞
              </button>
              <span style={{ fontSize: '13px', color: '#8696a0' }}>Accept</span>
            </div>

            {/* Decline Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={rejectCall}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#ea4335',
                  border: 'none',
                  color: 'white',
                  fontSize: '26px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(234, 67, 53, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                  transition: 'transform 0.15s',
                }}
                title="Decline Call"
                aria-label="Decline Call"
              >
                📵
              </button>
              <span style={{ fontSize: '13px', color: '#8696a0' }}>Decline</span>
            </div>
          </div>
        ) : (
          /* Active Call Control Buttons Grid */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Row 1: Audio | Video | Mute */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px' }}>
              {/* Speaker / Audio Output Toggle */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isSpeakerOn ? '#ffffff' : '#2a3942',
                    color: isSpeakerOn ? '#111b21' : '#e9edef',
                    fontSize: '22px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s',
                  }}
                  title="Toggle Audio Speaker"
                  aria-label={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
                >
                  ᛒ
                </button>
                <span style={{ fontSize: '12px', color: '#8696a0' }}>{isSpeakerOn ? 'Speaker' : 'Audio'}</span>
              </div>

              {/* Video Camera Toggle */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={toggleCamera}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isVideoCall && !isCamOff ? '#ffffff' : '#2a3942',
                    color: isVideoCall && !isCamOff ? '#111b21' : '#e9edef',
                    fontSize: '22px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s',
                  }}
                  title={isCamOff ? 'Turn Camera On' : 'Turn Camera Off'}
                  aria-label={isCamOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  📹
                </button>
                <span style={{ fontSize: '12px', color: '#8696a0' }}>{isCamOff ? 'Cam Off' : 'Cam On'}</span>
              </div>

              {/* Mute Microphone */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={toggleMute}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isMuted ? '#ffffff' : '#2a3942',
                    color: isMuted ? '#111b21' : '#e9edef',
                    fontSize: '22px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s',
                  }}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? '🔇' : '🎙️'}
                </button>
                <span style={{ fontSize: '12px', color: '#8696a0' }}>{isMuted ? 'Muted' : 'Mute'}</span>
              </div>
            </div>

            {/* Row 2: Options | Share | End */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px' }}>
              {/* Options */}
              <div style={{ textAlign: 'center' }}>
                <button
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#2a3942',
                    color: '#e9edef',
                    fontSize: '22px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                  title="More Options"
                  aria-label="More Options"
                >
                  •••
                </button>
                <span style={{ fontSize: '12px', color: '#8696a0' }}>More</span>
              </div>

              {/* Share Screen */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleShareScreen}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isSharing ? '#00a884' : '#2a3942',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s',
                  }}
                  title="Share Screen"
                  aria-label="Share Screen"
                >
                  ⬆️
                </button>
                <span style={{ fontSize: '12px', color: '#8696a0' }}>{isSharing ? 'Sharing' : 'Share'}</span>
              </div>

              {/* End Call Button */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={endCall}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#ea4335',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '6px',
                    boxShadow: '0 8px 20px rgba(234, 67, 53, 0.4)',
                    transition: 'transform 0.15s',
                  }}
                  title="End Call"
                  aria-label="End Call"
                >
                  📞
                </button>
                <span style={{ fontSize: '12px', color: '#8696a0' }}>End</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
