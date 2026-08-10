import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { CallContext } from './CallContextInstance';
import { socketService } from '../services/socket';
import { agoraService } from '../services/agoraService';
import { webrtcService } from '../services/webrtcService';
import { ringtoneService } from '../services/ringtoneService';
import { firebaseService } from '../services/firebaseService';

export { CallContext };

const INITIAL_LOGS = [
  { id: 'log-1', name: 'HM HR Infotech', type: 'incoming', isVideo: false, time: '4:14 pm', avatar: 'HM' },
  { id: 'log-2', name: 'Padashala Parivar', type: 'missed', isVideo: true, time: 'Wednesday', avatar: '😍' },
  { id: 'log-3', name: 'Priyanshi', type: 'missed', isVideo: false, time: '23/7/2026', avatar: 'P' },
  { id: 'log-4', name: 'Priyanshi', type: 'outgoing', isVideo: false, time: '8/7/2026', avatar: 'P' },
];

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
  const [peerInfo, setPeerInfo] = useState(null); // { id, name, isVideo }
  const [isVideoCall, setIsVideoCall] = useState(true);
  
  // Audio/Video control states
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  
  // MediaStreams for audio & video
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);

  // Call Logs History
  const [callLogs, setCallLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('wa_call_logs');
      return saved ? JSON.parse(saved) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  const activePeerIdRef = useRef(null);
  const roomIdRef = useRef(null);
  const callStatusRef = useRef(callStatus);
  const incomingOfferRef = useRef(null);

  // Sync callStatusRef continuously for closure safety
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // Incoming Call Ringtone Lifecycle (Receiver Device Only)
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

  // Save logs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wa_call_logs', JSON.stringify(callLogs));
    } catch (e) {
      console.error('Failed to save call logs', e);
    }
  }, [callLogs]);

  // Ensure socket connection & online mapping whenever user state resolves
  useEffect(() => {
    const activeUser = getUser();
    if (activeUser?.id) {
      socketService.connect(activeUser.id);
    }
  }, [user?.id]);

  // Firebase Realtime Incoming Call Room Listener
  useEffect(() => {
    const activeUser = getUser();
    if (!activeUser?.id) return;
    const unsubscribeFirebase = firebaseService.listenForIncomingCalls(activeUser.id, (callRoom) => {
      console.log('CallContext: Raw Firebase incoming call room:', callRoom);
      if (String(callRoom.callerId) === String(activeUser.id)) return;

      if (callStatusRef.current === 'incoming' && activePeerIdRef.current === String(callRoom.callerId)) {
        console.log('CallContext: Duplicate Firebase incoming call room ignored.');
        return;
      }

      console.log('CallContext: ✅ FIREBASE INCOMING CALL ACCEPTED! Setting callStatus to incoming for:', callRoom.callerName);

      setChannelName(callRoom.id);
      setPeerInfo({ id: callRoom.callerId, name: callRoom.callerName });
      setIsVideoCall(callRoom.isVideo);
      if (callRoom.offer) {
        setIncomingOffer(callRoom.offer);
        incomingOfferRef.current = callRoom.offer;
      }
      setCallStatus('incoming');
      activePeerIdRef.current = String(callRoom.callerId);

      firebaseService.listenForCandidates(callRoom.id, 'callerCandidates', async (candidate) => {
        await webrtcService.addIceCandidate(candidate);
      });
    });

    return () => {
      if (unsubscribeFirebase) unsubscribeFirebase();
    };
  }, [user?.id]);

  // Socket Signaling Listener
  useEffect(() => {
    const activeUser = getUser();
    if (!activeUser?.id) return;
    const socket = socketService.connect(activeUser.id);
    if (!socket) return;

    // 1. Handle Incoming Call with robust ID & Username matching and closure safety
    const handleIncomingCall = (data) => {
      console.log('CallContext: Raw socket call_user signal received:', data);
      const { userToCall, channelName: channel, signal, from, fromName, isVideo } = data || {};
      const currentUser = getUser();
      
      // Do not process self loopback calls
      if (currentUser?.id && String(from) === String(currentUser.id)) {
        console.log('CallContext: Ignored self loopback call');
        return;
      }

      // Target recipient match logic (supports numeric ID, string ID, and username)
      if (userToCall) {
        const myId = String(currentUser?.id || '').trim();
        const myName = String(currentUser?.username || '').toLowerCase().trim();
        const myEmail = String(currentUser?.email || '').toLowerCase().trim();
        const targetVal = String(userToCall || '').toLowerCase().trim();

        const isIdMatch = Boolean(myId && (targetVal === myId || parseInt(targetVal, 10) === parseInt(myId, 10)));
        const isNameMatch = Boolean(myName && targetVal === myName);
        const isEmailMatch = Boolean(myEmail && targetVal === myEmail);

        console.log(`CallContext: Target Match Check -> TargetVal: "${targetVal}", MyId: "${myId}", MyName: "${myName}" -> isIdMatch: ${isIdMatch}, isNameMatch: ${isNameMatch}`);

        if (!isIdMatch && !isNameMatch && !isEmailMatch) {
          console.warn('CallContext: Signal target user mismatch, skipping call modal.');
          return;
        }
      }

      // Deduplicate if already ringing for this exact caller
      if (callStatusRef.current === 'incoming' && activePeerIdRef.current === String(from)) {
        if (signal && (signal.sdp || signal.type)) {
          console.log('CallContext: Updating SDP offer for active incoming call.');
          setIncomingOffer(signal);
          incomingOfferRef.current = signal;
        }
        return;
      }

      console.log('CallContext: ✅ INCOMING CALL ACCEPTED! Setting callStatus to incoming for caller:', fromName || from);

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

    // 2. Handle Call Accepted by Callee
    const handleCallAccepted = async (data) => {
      const answerSignal = data?.signal || data;
      const targetUser = data?.to;
      const currentUser = getUser();

      if (targetUser) {
        const myId = String(currentUser?.id || '');
        const targetId = String(targetUser);
        const myName = String(currentUser?.username || '').toLowerCase().trim();
        const targetName = targetId.toLowerCase().trim();
        const isMatch = targetId === myId || parseInt(targetId, 10) === parseInt(myId, 10) || (myName && targetName === myName);
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

      addCallLog({
        name: peerInfo?.name || 'WhatsApp Contact',
        type: 'outgoing',
        isVideo: isVideoCall,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: peerInfo?.name ? peerInfo.name.charAt(0).toUpperCase() : 'U'
      });
    };

    // 3. Handle ICE Candidates
    const handleIceCandidate = async (data) => {
      const candidate = data?.candidate || data;
      const targetUser = data?.to;
      const currentUser = getUser();

      if (targetUser) {
        const myId = String(currentUser?.id || '');
        const targetId = String(targetUser);
        const myName = String(currentUser?.username || '').toLowerCase().trim();
        const targetName = targetId.toLowerCase().trim();
        const isMatch = targetId === myId || parseInt(targetId, 10) === parseInt(myId, 10) || (myName && targetName === myName);
        if (!isMatch) return;
      }

      if (candidate) {
        await webrtcService.addIceCandidate(candidate);
      }
    };

    // 4. Handle Call Rejected / Declined
    const handleCallRejected = (data) => {
      const targetUser = data?.to;
      const currentUser = getUser();
      if (targetUser) {
        const myId = String(currentUser?.id || '');
        const targetId = String(targetUser);
        const myName = String(currentUser?.username || '').toLowerCase().trim();
        const targetName = targetId.toLowerCase().trim();
        const isMatch = targetId === myId || parseInt(targetId, 10) === parseInt(myId, 10) || (myName && targetName === myName);
        if (!isMatch) return;
      }
      console.log('Call Rejected event received');
      cleanupCall();
    };

    // 5. Handle Call Ended
    const handleCallEnded = (data) => {
      const targetUser = data?.to;
      const currentUser = getUser();
      if (targetUser) {
        const myId = String(currentUser?.id || '');
        const targetId = String(targetUser);
        const myName = String(currentUser?.username || '').toLowerCase().trim();
        const targetName = targetId.toLowerCase().trim();
        const isMatch = targetId === myId || parseInt(targetId, 10) === parseInt(myId, 10) || (myName && targetName === myName);
        if (!isMatch) return;
      }
      console.log('Call Ended event received');
      cleanupCall();
    };

    socket.on('call_user', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('call_user', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
    };
  }, [user?.id]);

  const addCallLog = (logEntry) => {
    const newLog = {
      id: `log-${Date.now()}`,
      ...logEntry
    };
    setCallLogs((prev) => [newLog, ...prev]);
  };

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

    // Ensure socket is active and connected
    const socket = socketService.connect(activeUser.id);

    // Synchronous media acquisition trigger in current click gesture loop
    const streamPromise = webrtcService.getLocalStream(isVideo);

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

    console.log(`CallContext: Initiating call to target user ID: ${targetUserId} (${recipient.username || recipient.name})`);

    const peerName = recipient.group_name || recipient.username || recipient.name || 'WhatsApp Contact';
    const roomId = `room_${activeUser.id}_${targetUserId}_${Date.now()}`;

    setPeerInfo({ id: targetUserId, name: peerName });
    setIsVideoCall(isVideo);
    setCallStatus('calling');
    activePeerIdRef.current = String(targetUserId);
    roomIdRef.current = roomId;
    setChannelName(roomId);
    setIsMuted(false);
    setIsCamOff(!isVideo);

    // ⚡ INSTANT SIGNALING EMISSION: Notify callee immediately so incoming call popup opens with zero latency!
    if (socket) {
      console.log(`CallContext: Instant call_user signal emitted to ${targetUserId}`);
      socket.emit('call_user', {
        userToCall: targetUserId,
        channelName: roomId,
        signalData: null,
        from: activeUser.id,
        fromName: activeUser.username || 'Friend',
        isVideo,
      });
    }

    try {
      // 1. Await Local MediaStream
      const stream = await streamPromise;
      setLocalStream(stream);

      // 🎙️ Publish Stream to Agora RTC Cloud Engine cleanly without hardware locks
      try {
        await agoraService.joinChannel(roomId, activeUser.id);
        await agoraService.createLocalTracksFromStream(stream, isVideo);
        await agoraService.publishLocalTracks();
        agoraService.onRemoteUserPublished((remoteUser, mediaType) => {
          console.log('CallContext: Agora remote user audio/video active:', remoteUser.uid, mediaType);
          setCallStatus('connected');
        });
      } catch (agoraErr) {
        console.warn('Agora RTC initiate call warning:', agoraErr);
      }

      // 2. Create RTCPeerConnection FIRST (bind local tracks & candidate callbacks)
      webrtcService.createPeerConnection(
        (remStream) => {
          console.log('CallContext: Remote Stream attached on caller side -> Setting callStatus to connected!');
          setRemoteStream(remStream);
          setCallStatus('connected');
        },
        (candidate) => {
          if (candidate) {
            if (socket) socket.emit('ice_candidate', { candidate, to: targetUserId });
            if (roomIdRef.current) {
              firebaseService.addIceCandidate(roomIdRef.current, candidate, 'callerCandidates');
            }
          }
        }
      );

      // 3. Create SDP Offer SECOND
      const offer = await webrtcService.createOffer();

      if (!offer) {
        console.error('CallContext: Failed to generate SDP offer!');
        return;
      }

      // 4. Create Firebase Call Room
      await firebaseService.createCallRoom(activeUser, { id: targetUserId, name: peerName }, isVideo, offer);

      // 5. Listen for Callee Answer in Firebase
      firebaseService.listenForAnswer(roomId, async (answer) => {
        if (answer.type === 'answer' || answer.sdp) {
          console.log('CallContext: Firebase call answer received -> Setting callStatus to connected!');
          setCallStatus('connected');
          await webrtcService.handleAnswer(answer);
        } else if (answer.type === 'ended' || answer.status === 'ended' || answer.status === 'rejected') {
          cleanupCall();
        }
      });

      // 6. Listen for Callee ICE Candidates in Firebase
      firebaseService.listenForCandidates(roomId, 'calleeCandidates', async (candidate) => {
        await webrtcService.addIceCandidate(candidate);
      });

      // 7. Emit Socket.IO fallback signal with VALID SDP offer
      if (socket) {
        console.log(`CallContext: Emitting call_user socket signal with valid SDP offer to ${targetUserId}`);
        socket.emit('call_user', {
          userToCall: targetUserId,
          channelName: roomId,
          signalData: offer,
          from: activeUser.id,
          fromName: activeUser.username || 'Friend',
          isVideo,
        });
      }
    } catch (err) {
      console.warn('Initiate call warning:', err);
    }
  };

  // Accept Incoming Call
  const acceptCall = async () => {
    const activeUser = getUser();
    if (!activeUser || !activePeerIdRef.current) return;

    const socket = socketService.connect(activeUser.id);

    ringtoneService.stopRingtone();
    unlockAudioContext();

    setCallStatus('connected');
    setIsMuted(false);
    setIsCamOff(!isVideoCall);

    // ⚡ INSTANT ACCEPT SIGNAL: Notify caller immediately so caller transitions callStatus to 'connected'!
    if (socket && activePeerIdRef.current) {
      console.log('CallContext: Emitting instant answer_call signal to target:', activePeerIdRef.current);
      socket.emit('answer_call', { to: activePeerIdRef.current, signal: null });
    }

    // Synchronous media acquisition trigger in current click gesture loop
    const streamPromise = webrtcService.getLocalStream(isVideoCall);

    try {
      // 1. Await Local MediaStream
      const stream = await streamPromise;
      setLocalStream(stream);

      // 🎙️ Publish Stream to Agora RTC Cloud Engine on Accept Side
      try {
        const roomToJoin = channelName || `room_${activePeerIdRef.current}_${activeUser.id}`;
        await agoraService.joinChannel(roomToJoin, activeUser.id);
        await agoraService.createLocalTracksFromStream(stream, isVideoCall);
        await agoraService.publishLocalTracks();
        agoraService.onRemoteUserPublished((remoteUser, mediaType) => {
          console.log('CallContext: Agora remote user audio/video active on accept side:', remoteUser.uid, mediaType);
          setCallStatus('connected');
        });
      } catch (agoraErr) {
        console.warn('Agora RTC accept call warning:', agoraErr);
      }

      // 2. Create RTCPeerConnection and bind candidates
      webrtcService.createPeerConnection(
        (remStream) => {
          console.log('CallContext: Remote Stream attached on accept side -> Setting callStatus to connected!');
          setRemoteStream(remStream);
          setCallStatus('connected');
        },
        (candidate) => {
          if (candidate) {
            if (socket && activePeerIdRef.current) {
              socket.emit('ice_candidate', { candidate, to: activePeerIdRef.current });
            }
            if (channelName && channelName.startsWith('room_')) {
              firebaseService.addIceCandidate(channelName, candidate, 'calleeCandidates');
            }
          }
        }
      );

      // 3. Resolve valid SDP offer (from state ref or Firebase call room document)
      let offerToUse = incomingOffer || incomingOfferRef.current;
      if ((!offerToUse || !offerToUse.sdp) && channelName && channelName.startsWith('room_')) {
        const roomData = await firebaseService.getCallRoom(channelName);
        if (roomData && roomData.offer) {
          offerToUse = roomData.offer;
        }
      }

      if (offerToUse) {
        console.log('CallContext: Processing valid SDP offer to create WebRTC answer:', offerToUse);
        const answer = await webrtcService.handleOfferAndCreateAnswer(offerToUse);

        // 4. Update Firebase Call Room Answer
        if (channelName && channelName.startsWith('room_')) {
          await firebaseService.answerCallRoom(channelName, answer);
        }

        // 5. Emit Socket.IO fallback signal
        if (socket && activePeerIdRef.current) {
          socket.emit('answer_call', { to: activePeerIdRef.current, signal: answer });
        }
      } else {
        console.warn('CallContext: No valid SDP offer available during accept call!');
      }

      addCallLog({
        name: peerInfo?.name || 'WhatsApp Contact',
        type: 'incoming',
        isVideo: isVideoCall,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: peerInfo?.name ? peerInfo.name.charAt(0).toUpperCase() : 'U'
      });
    } catch (err) {
      console.warn('Accept call warning:', err);
    }
  };

  // Decline / Reject Incoming Call
  const rejectCall = () => {
    ringtoneService.stopRingtone();
    if (channelName && channelName.startsWith('room_')) {
      firebaseService.endCallRoom(channelName, 'rejected');
    }
    const socket = socketService.getSocket();
    if (socket && activePeerIdRef.current) {
      socket.emit('reject_call', { to: activePeerIdRef.current });
    }
    
    addCallLog({
      name: peerInfo?.name || 'WhatsApp Contact',
      type: 'missed',
      isVideo: isVideoCall,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: peerInfo?.name ? peerInfo.name.charAt(0).toUpperCase() : 'U'
    });

    cleanupCall();
  };

  // End Ongoing Call
  const endCall = () => {
    ringtoneService.stopRingtone();
    if (channelName && channelName.startsWith('room_')) {
      firebaseService.endCallRoom(channelName, 'ended');
    }
    const socket = socketService.getSocket();
    if (socket && activePeerIdRef.current) {
      socket.emit('end_call', { to: activePeerIdRef.current });
    }
    cleanupCall();
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    agoraService.setMuted(nextMuted);
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    const nextCam = !isCamOff;
    setIsCamOff(nextCam);
    agoraService.setCameraOff(nextCam);
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !nextCam));
    }
  };

  // Cleanup helper
  const cleanupCall = () => {
    ringtoneService.stopRingtone();
    if (channelName && channelName.startsWith('room_')) {
      firebaseService.endCallRoom(channelName, 'ended');
    }
    webrtcService.cleanup();
    agoraService.leave();
    setCallStatus('idle');
    setChannelName(null);
    setPeerInfo(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingOffer(null);
    incomingOfferRef.current = null;
    activePeerIdRef.current = null;
    roomIdRef.current = null;
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
        localStream,
        remoteStream,
        incomingOffer,
        callLogs,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        addCallLog,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
