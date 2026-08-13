import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { CallContext } from './CallContextInstance';
import { socketService } from '../services/socket';
import { webrtcService } from '../services/webrtcService';
import { ringtoneService } from '../services/ringtoneService';
import { fetchCalls, createCallRecord, updateCallStatus as apiUpdateCallStatus } from '../services/api';

export { CallContext };

export function CallProvider({ children }) {
  const { user: authUser } = useAuth();

  // Active user resolver with localStorage fallback for instantaneous session access
  const getUser = () => {
    if (authUser && authUser.id) return authUser;
    try {
      const saved = localStorage.getItem('user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return authUser;
  };

  const user = getUser();

  // Call status: 'idle' | 'calling' | 'incoming' | 'connected'
  const [callStatus, setCallStatus] = useState('idle');
  const [channelName, setChannelName] = useState(null);
  const [peerInfo, setPeerInfo] = useState(null); // { id, name, avatar, isVideo }
  const [isVideoCall, setIsVideoCall] = useState(true);

  // Audio/Video control states
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // Available camera input devices
  const [availableCameras, setAvailableCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);

  // MediaStreams for audio & video
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);

  // Ready flags
  const [isLocalVideoReady, setIsLocalVideoReady] = useState(false);
  const [isRemoteVideoReady, setIsRemoteVideoReady] = useState(false);

  // Call Timer & Call History Logs
  const [callDuration, setCallDuration] = useState(0);
  const [callLogs, setCallLogs] = useState([]);

  const activePeerIdRef = useRef(null);
  const activeCallIdRef = useRef(null);
  const callStatusRef = useRef(callStatus);
  const incomingOfferRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Sync callStatusRef continuously for closure safety
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // Load call history from backend API on mount / login
  useEffect(() => {
    if (user?.id) {
      loadCallHistory();
    }
  }, [user?.id]);

  // Connection state callback handling
  useEffect(() => {
    webrtcService.setConnectionStateCallback((state) => {
      console.log(`CallContext: WebRTC connection state -> ${state}`);
      if (state === 'failed') {
        console.warn('CallContext: WebRTC connection permanently failed. Terminating call...');
        endCall();
      }
    });
  }, []);

  const loadCallHistory = async () => {
    try {
      const dbCalls = await fetchCalls();
      if (Array.isArray(dbCalls)) {
        const formatted = dbCalls.map((c) => {
          const isOutgoing = String(c.caller_id) === String(user?.id);
          const otherName = isOutgoing ? c.receiver_name : c.caller_name;
          const otherAvatar = isOutgoing ? c.receiver_avatar : c.caller_avatar;
          let logType = isOutgoing ? 'outgoing' : 'incoming';
          if (c.status === 'missed' || c.status === 'rejected') {
            logType = isOutgoing ? 'outgoing' : 'missed';
          }
          return {
            id: `call-${c.id}`,
            dbId: c.id,
            name: otherName || 'WhatsApp Contact',
            type: logType,
            status: c.status,
            isVideo: c.call_type === 'video',
            time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(c.created_at).toLocaleDateString(),
            durationSeconds: c.duration_seconds || 0,
            avatar: otherAvatar || (otherName ? otherName.charAt(0).toUpperCase() : 'U'),
          };
        });
        setCallLogs(formatted);
      }
    } catch (err) {
      console.warn('Failed to load call history from database:', err.message);
    }
  };

  // Enumerate cameras when call is active
  useEffect(() => {
    if (isVideoCall && (callStatus === 'calling' || callStatus === 'connected')) {
      webrtcService.getAvailableCameras().then((cams) => {
        setAvailableCameras(cams);
        if (cams.length > 0 && !activeCameraId) {
          setActiveCameraId(cams[0].deviceId);
        }
      });
    }
  }, [isVideoCall, callStatus]);

  // Update track ready flags
  useEffect(() => {
    if (localStream) {
      const hasVideo = localStream.getVideoTracks().some((t) => t.readyState === 'live');
      setIsLocalVideoReady(hasVideo);
    } else {
      setIsLocalVideoReady(false);
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      const hasVideo = remoteStream.getVideoTracks().some((t) => t.readyState === 'live');
      setIsRemoteVideoReady(hasVideo);
    } else {
      setIsRemoteVideoReady(false);
    }
  }, [remoteStream]);

  // Call Timer Lifecycle - Starts strictly when call reaches connected state
  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [callStatus]);

  // Ringtone Lifecycle
  useEffect(() => {
    if (callStatus === 'incoming') {
      console.log('CallContext: Incoming status active -> Triggering ringtone');
      ringtoneService.startRingtone();
    } else {
      ringtoneService.stopRingtone();
    }
    return () => {
      ringtoneService.stopRingtone();
    };
  }, [callStatus]);

  // WebAudio Voice Stream Piping
  useEffect(() => {
    if (remoteStream) {
      ringtoneService.pipeRemoteAudioStream(remoteStream);
    }
  }, [remoteStream]);

  // Ensure socket connection whenever user resolves
  useEffect(() => {
    const activeUser = getUser();
    if (activeUser?.id) {
      socketService.connect(activeUser.id);
    }
  }, [user?.id]);

  // Socket Signaling Listener
  useEffect(() => {
    const activeUser = getUser();
    if (!activeUser?.id) return;
    const socket = socketService.connect(activeUser.id);
    if (!socket) return;

    // 1. Handle Incoming Call Signal
    const handleIncomingCall = (data) => {
      console.log('CallContext: Raw socket call_user signal received:', data);
      const { userToCall, channelName: channel, signal, from, fromName, isVideo, callId } = data || {};
      const currentUser = getUser();

      if (currentUser?.id && String(from) === String(currentUser.id)) {
        return;
      }

      if (userToCall) {
        const myId = String(currentUser?.id || '').trim();
        const targetVal = String(userToCall || '').toLowerCase().trim();
        const isMatch = myId && (targetVal === myId || parseInt(targetVal, 10) === parseInt(myId, 10));
        if (!isMatch) return;
      }

      if (callStatusRef.current === 'incoming' && activePeerIdRef.current === String(from)) {
        if (signal && (signal.sdp || signal.type)) {
          setIncomingOffer(signal);
          incomingOfferRef.current = signal;
        }
        return;
      }

      console.log('CallContext: ✅ INCOMING CALL RECEIVED from:', fromName || from);

      if (callId) {
        activeCallIdRef.current = callId;
      }

      setChannelName(channel);
      setPeerInfo({ id: from, name: fromName || 'WhatsApp Contact' });
      setIsVideoCall(Boolean(isVideo));
      if (signal && (signal.sdp || signal.type)) {
        setIncomingOffer(signal);
        incomingOfferRef.current = signal;
      }
      setCallStatus('incoming');
      activePeerIdRef.current = String(from);
    };

    // 2. Handle Call Accepted Signal
    const handleCallAccepted = async (data) => {
      const answerSignal = data?.signal || data;
      const targetUser = data?.to;
      const currentUser = getUser();

      if (targetUser) {
        const myId = String(currentUser?.id || '');
        const targetId = String(targetUser);
        const isMatch = targetId === myId || parseInt(targetId, 10) === parseInt(myId, 10);
        if (!isMatch) return;
      }

      console.log('Call Accepted event received -> Setting callStatus to connected!');
      setCallStatus('connected');

      try {
        if (answerSignal && (answerSignal.sdp || answerSignal.type)) {
          await webrtcService.handleAnswer(answerSignal);
        }
      } catch (err) {
        console.error('Error setting remote answer:', err);
      }
    };

    // 3. Handle ICE Candidates
    const handleIceCandidate = async (data) => {
      const candidate = data?.candidate || data;
      const targetUser = data?.to;
      const currentUser = getUser();

      if (targetUser) {
        const myId = String(currentUser?.id || '');
        const targetId = String(targetUser);
        const isMatch = targetId === myId || parseInt(targetId, 10) === parseInt(myId, 10);
        if (!isMatch) return;
      }

      if (candidate) {
        await webrtcService.addIceCandidate(candidate);
      }
    };

    // 4. Handle Call Rejected Signal
    const handleCallRejected = (data) => {
      const reason = data?.reason || '';
      console.log('Call Rejected event received, reason:', reason);
      if (reason === 'offline') {
        // User is offline - show brief status message but keep call active briefly
        console.warn('CallContext: Callee is offline. Ending call...');
      }
      cleanupCall();
      loadCallHistory();
    };

    // 4b. Handle Call Missed
    const handleCallMissed = (data) => {
      console.log('Call Missed event received:', data?.reason);
      cleanupCall();
      loadCallHistory();
    };

    // 5. Handle Call Ended Signal
    const handleCallEnded = (data) => {
      console.log('Call Ended event received');
      cleanupCall();
      loadCallHistory();
    };

    // 6. Handle Media Toggle Sync
    const handleMediaToggle = (data) => {
      const { isMuted: peerMuted, isCamOff: peerCamOff } = data || {};
      console.log(`Peer media toggle: muted=${peerMuted}, camOff=${peerCamOff}`);
    };

    socket.on('call_user', handleIncomingCall);
    socket.on('CALL_INCOMING', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('CALL_ACCEPTED', handleCallAccepted);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('WEBRTC_ICE_CANDIDATE', handleIceCandidate);
    socket.on('call_rejected', handleCallRejected);
    socket.on('CALL_REJECTED', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('CALL_ENDED', handleCallEnded);
    socket.on('call_media_toggle', handleMediaToggle);
    socket.on('CALL_MISSED', handleCallMissed);


    return () => {
      socket.off('call_user', handleIncomingCall);
      socket.off('CALL_INCOMING', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('CALL_ACCEPTED', handleCallAccepted);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('WEBRTC_ICE_CANDIDATE', handleIceCandidate);
      socket.off('call_rejected', handleCallRejected);
      socket.off('CALL_REJECTED', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('CALL_ENDED', handleCallEnded);
      socket.off('call_media_toggle', handleMediaToggle);
      socket.off('CALL_MISSED', handleCallMissed);
    };

  }, [user?.id]);

  const unlockAudioContext = () => {
    try {
      ringtoneService.initContext();
    } catch (e) {
      console.warn('AudioContext unlock warning:', e);
    }
  };

  // Initiate Outgoing Voice or Video Call
  const initiateCall = async (recipient, isVideo = true) => {
    const activeUser = getUser();
    if (!activeUser || !recipient) return;

    const socket = socketService.connect(activeUser.id);

    // Request MediaStream according to exact callType (voice -> audio only, video -> audio + video)
    let stream = null;
    try {
      stream = await webrtcService.getLocalStream(isVideo);
    } catch (mediaErr) {
      console.error('Initiate call media error:', mediaErr);
      alert(`Could not start ${isVideo ? 'video' : 'voice'} call: ${mediaErr.message || 'Permission denied'}`);
      cleanupCall();
      return;
    }

    unlockAudioContext();

    let targetUserId = null;
    if (recipient.participants && Array.isArray(recipient.participants)) {
      const other = recipient.participants.find((p) => {
        const pId = typeof p === 'object' ? p.id : p;
        return String(pId) !== String(activeUser.id);
      });
      if (other) targetUserId = typeof other === 'object' ? other.id : other;
    }
    if (!targetUserId) {
      targetUserId = recipient.user_id || recipient.other_user_id || recipient.receiver_id || recipient.id;
    }

    if (!targetUserId || String(targetUserId) === String(activeUser.id)) {
      console.warn('CallContext: Cannot initiate call to self or invalid recipient:', recipient);
      return;
    }

    const peerName = recipient.group_name || recipient.username || recipient.name || 'WhatsApp Contact';
    const peerAvatar = recipient.avatar_url || (peerName ? peerName.charAt(0).toUpperCase() : 'U');
    const roomId = `room_${activeUser.id}_${targetUserId}_${Date.now()}`;

    setPeerInfo({ id: targetUserId, name: peerName, avatar: peerAvatar });
    setIsVideoCall(isVideo);
    setCallStatus('calling');
    activePeerIdRef.current = String(targetUserId);
    setChannelName(roomId);
    setIsMuted(false);
    setIsCamOff(!isVideo);

    let dbCall = null;
    try {
      dbCall = await createCallRecord(targetUserId, recipient.id && !String(recipient.id).startsWith('temp-') ? recipient.id : null, isVideo ? 'video' : 'voice');
      if (dbCall && dbCall.id) {
        activeCallIdRef.current = dbCall.id;
      }
    } catch (err) {
      console.warn('Failed to record call creation in DB:', err.message);
    }

    try {
      setLocalStream(stream);

      webrtcService.createPeerConnection(
        (remStream) => {
          console.log('CallContext: Remote Stream attached on caller side!');
          setRemoteStream(remStream);
          setCallStatus('connected');
        },
        (candidate) => {
          if (candidate) {
            socketService.sendWebRtcIceCandidate({ callId: activeCallIdRef.current, targetUserId, candidate });
          }
        }
      );

      const offer = await webrtcService.createOffer();

      console.log(`CallContext: Emitting CALL_INITIATE signal with SDP offer to ${targetUserId}`);
      socketService.initiateCall({
        receiverId: targetUserId,
        callType: isVideo ? 'video' : 'voice',
        conversationId: recipient.id && !String(recipient.id).startsWith('temp-') ? recipient.id : null,
        channelName: roomId,
        signalData: offer,
      });
    } catch (err) {
      console.warn('Initiate call error:', err);
      if (activeCallIdRef.current) {
        apiUpdateCallStatus(activeCallIdRef.current, 'failed', 0).catch(() => {});
      }
      cleanupCall();
    }
  };

  // Accept Incoming Call
  const acceptCall = async () => {
    const activeUser = getUser();
    if (!activeUser || !activePeerIdRef.current) return;

    socketService.connect(activeUser.id);

    ringtoneService.stopRingtone();
    unlockAudioContext();

    // Request MediaStream according to incoming call type
    let stream = null;
    try {
      stream = await webrtcService.getLocalStream(isVideoCall);
    } catch (mediaErr) {
      console.error('Accept call media error:', mediaErr);
      alert(`Could not access ${isVideoCall ? 'camera/microphone' : 'microphone'}: ${mediaErr.message || 'Permission denied'}`);
      rejectCall();
      return;
    }

    setCallStatus('connected');
    setIsMuted(false);
    setIsCamOff(!isVideoCall);

    if (activeCallIdRef.current) {
      try {
        await apiUpdateCallStatus(activeCallIdRef.current, 'accepted');
      } catch (e) {}
    }

    try {
      setLocalStream(stream);

      webrtcService.createPeerConnection(
        (remStream) => {
          console.log('CallContext: Remote Stream attached on accept side!');
          setRemoteStream(remStream);
          setCallStatus('connected');
        },
        (candidate) => {
          if (candidate && activePeerIdRef.current) {
            socketService.sendWebRtcIceCandidate({ callId: activeCallIdRef.current, targetUserId: activePeerIdRef.current, candidate });
          }
        }
      );

      let offerToUse = incomingOffer || incomingOfferRef.current;
      if (offerToUse) {
        console.log('CallContext: Creating WebRTC answer for offer');
        const answer = await webrtcService.handleOfferAndCreateAnswer(offerToUse);

        if (activePeerIdRef.current) {
          socketService.acceptCall({ callId: activeCallIdRef.current, callerId: activePeerIdRef.current, signal: answer });
        }
      }
    } catch (err) {
      console.warn('Accept call warning:', err);
    }
  };

  // Decline / Reject Incoming Call
  const rejectCall = async () => {
    ringtoneService.stopRingtone();

    if (activeCallIdRef.current) {
      try {
        await apiUpdateCallStatus(activeCallIdRef.current, 'rejected', 0);
      } catch (e) {}
    }

    if (activePeerIdRef.current) {
      socketService.rejectCall({ callId: activeCallIdRef.current, callerId: activePeerIdRef.current });
    }

    cleanupCall();
    loadCallHistory();
  };

  // End Ongoing Call
  const endCall = async () => {
    ringtoneService.stopRingtone();
    const finalDuration = callDuration;

    if (activeCallIdRef.current) {
      try {
        await apiUpdateCallStatus(activeCallIdRef.current, 'ended', finalDuration);
      } catch (e) {}
    }

    if (activePeerIdRef.current) {
      socketService.endCall({ callId: activeCallIdRef.current, targetUserId: activePeerIdRef.current, durationSeconds: finalDuration });
    }

    cleanupCall();
    loadCallHistory();
  };

  // Toggle Mute Audio (Independent Control)
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
    }
    const socket = socketService.getSocket();
    if (socket && activePeerIdRef.current) {
      socket.emit('call_media_toggle', { to: activePeerIdRef.current, isMuted: nextMuted, isCamOff });
    }
  };

  // Toggle Camera (Independent Control)
  const toggleCamera = () => {
    const nextCamOff = !isCamOff;
    setIsCamOff(nextCamOff);
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !nextCamOff));
    }
    const socket = socketService.getSocket();
    if (socket && activePeerIdRef.current) {
      socket.emit('call_media_toggle', { to: activePeerIdRef.current, isMuted, isCamOff: nextCamOff });
    }
  };

  // Switch Camera Device
  const switchCameraDevice = async (deviceId) => {
    setActiveCameraId(deviceId);
    const ok = await webrtcService.switchCamera(deviceId);
    if (ok && webrtcService.localStream) {
      setLocalStream(new MediaStream(webrtcService.localStream.getTracks()));
    }
  };

  // Cleanup helper
  const cleanupCall = () => {
    if (activeCallIdRef.current && (callStatusRef.current === 'calling' || callStatusRef.current === 'incoming')) {
      apiUpdateCallStatus(activeCallIdRef.current, 'cancelled', 0).catch(() => {});
    }
    ringtoneService.stopRingtone();
    ringtoneService.cleanupRemoteAudio();
    webrtcService.cleanup();
    setCallStatus('idle');
    setChannelName(null);
    setPeerInfo(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingOffer(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsCamOff(false);
    setIsLocalVideoReady(false);
    setIsRemoteVideoReady(false);
    incomingOfferRef.current = null;
    activePeerIdRef.current = null;
    activeCallIdRef.current = null;
  };

  return (
    <CallContext.Provider
      value={{
        callStatus,
        channelName,
        peerInfo,
        isVideoCall,
        isMuted,
        isCamOff,
        isCameraEnabled: !isCamOff,
        localStream,
        remoteStream,
        incomingOffer,
        isLocalVideoReady,
        isRemoteVideoReady,
        callDuration,
        callLogs,
        availableCameras,
        activeCameraId,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        switchCameraDevice,
        loadCallHistory,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
