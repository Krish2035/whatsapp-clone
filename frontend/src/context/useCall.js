import { useContext } from 'react';
import { CallContext } from './CallContextInstance';

const DEFAULT_CALL_CONTEXT = {
  callStatus: 'idle',
  channelName: null,
  peerInfo: null,
  isVideoCall: true,
  isMuted: false,
  isCamOff: false,
  localStream: null,
  remoteStream: null,
  incomingOffer: null,
  callLogs: [],
  initiateCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleCamera: () => {},
  addCallLog: () => {},
};

export function useCall() {
  const context = useContext(CallContext);
  return context || DEFAULT_CALL_CONTEXT;
}
