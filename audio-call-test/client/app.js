const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  timeout: 20000
});

const nameInput = document.getElementById('name-input');
const roomInput = document.getElementById('room-input');
const roleSelect = document.getElementById('role-select');
const joinBtn = document.getElementById('join-btn');
const statusBox = document.getElementById('status-box');
const micStatus = document.getElementById('mic-status');
const remoteStatus = document.getElementById('remote-status');
const muteBtn = document.getElementById('mute-btn');
const endBtn = document.getElementById('end-btn');
const errorBox = document.getElementById('error-box');
const remoteAudio = document.getElementById('remote-audio');

const state = {
  isJoined: false,
  isMuted: false,
  roomId: '',
  role: 'Employee',
  peerConnection: null,
  localStream: null,
  isOfferer: false,
  offerSent: false,
  answerSent: false,
  isConnecting: false,
  didUserInteractionEnableAudio: false
};

function setError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}

function updateStatus(message) {
  statusBox.textContent = message;
}

function setMicStatus(value) {
  micStatus.textContent = value;
}

function setRemoteStatus(value) {
  remoteStatus.textContent = value;
}

function updateConnectionStatus() {
  if (!state.peerConnection) {
    updateStatus('Waiting for another participant...');
    return;
  }

  const pc = state.peerConnection;
  console.log('[WEBRTC] Connection state:', pc.connectionState);
  console.log('[WEBRTC] ICE connection state:', pc.iceConnectionState);
  console.log('[WEBRTC] Signaling state:', pc.signalingState);

  if (pc.connectionState === 'connected') {
    updateStatus('CONNECTED');
    setRemoteStatus('Connected');
    return;
  }

  if (pc.connectionState === 'connecting' || pc.iceConnectionState === 'checking') {
    updateStatus('Connecting...');
    setRemoteStatus('Connecting');
    return;
  }

  if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
    updateStatus('WebRTC connection failed');
    setRemoteStatus('Failed');
    return;
  }

  updateStatus('Waiting for another participant...');
  setRemoteStatus('Waiting');
}

async function ensureMicrophone() {
  if (state.localStream) {
    return state.localStream;
  }

  console.log('[WEBRTC] Requesting microphone access');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });

    state.localStream = stream;
    setMicStatus('ON');
    console.log('[WEBRTC] Local microphone added');
    return stream;
  } catch (error) {
    console.error('[WEBRTC] Microphone access denied:', error);
    setError('Microphone permission denied. Please allow microphone access to join the call.');
    setMicStatus('OFF');
    throw error;
  }
}

function createPeerConnection() {
  if (state.peerConnection) {
    return state.peerConnection;
  }

  console.log('[WEBRTC] Creating peer connection');

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  state.peerConnection = pc;

  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    console.log('[WEBRTC] ICE candidate sent');
    socket.emit('signal-ice', {
      roomId: state.roomId,
      candidate: event.candidate
    });
  };

  pc.ontrack = (event) => {
    console.log('[WEBRTC] Remote audio track received');
    const [remoteStream] = event.streams;
    if (!remoteStream) return;

    remoteAudio.srcObject = remoteStream;
    remoteAudio.autoplay = true;
    remoteAudio.playsInline = true;
    remoteAudio.muted = false;
    remoteAudio.play().catch(() => {
      console.warn('[WEBRTC] Autoplay was blocked. User interaction is required to play remote audio.');
      updateStatus('Click Join Room to enable audio.');
    });

    console.log('[WEBRTC] Remote audio attached');
    setRemoteStatus('Connected');
    updateConnectionStatus();
  };

  pc.onconnectionstatechange = () => {
    console.log('[WEBRTC] Connection state:', pc.connectionState);
    updateConnectionStatus();
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[WEBRTC] ICE connection state:', pc.iceConnectionState);
  };

  pc.onsignalingstatechange = () => {
    console.log('[WEBRTC] Signaling state:', pc.signalingState);
  };

  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, state.localStream);
      console.log('[WEBRTC] Local microphone added to peer connection');
    });
  }

  return pc;
}

async function startOfferFlow() {
  if (!state.isJoined || !state.roomId) return;

  const pc = createPeerConnection();

  if (state.offerSent) {
    return;
  }

  state.offerSent = true;
  console.log('[WEBRTC] Creating offer');

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('[WEBRTC] Offer sent');
    socket.emit('signal-offer', {
      roomId: state.roomId,
      offer
    });
  } catch (error) {
    console.error('[WEBRTC] Offer creation error:', error);
  }
}

async function handleIncomingOffer(offer) {
  const pc = createPeerConnection();
  console.log('[WEBRTC] Offer received');

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('[WEBRTC] Answer created');
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('[WEBRTC] Answer sent');
    socket.emit('signal-answer', {
      roomId: state.roomId,
      answer
    });
  } catch (error) {
    console.error('[WEBRTC] Answer creation error:', error);
  }
}

async function handleIncomingAnswer(answer) {
  if (!state.peerConnection) return;

  console.log('[WEBRTC] Answer received');

  try {
    await state.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (error) {
    console.error('[WEBRTC] Set remote answer error:', error);
  }
}

async function handleIncomingIce(candidate) {
  if (!state.peerConnection) return;

  console.log('[WEBRTC] ICE candidate received');

  try {
    await state.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('[WEBRTC] ICE candidate add error:', error);
  }
}

async function joinRoom() {
  clearError();
  const name = nameInput.value.trim();
  const roomId = roomInput.value.trim();
  const role = roleSelect.value;

  if (!name || !roomId) {
    setError('Please fill in both the name and room ID.');
    return;
  }

  state.roomId = roomId;
  state.role = role;

  try {
    await ensureMicrophone();
    socket.emit('join-room', { name, roomId, role });
    state.isJoined = true;
    updateStatus('Waiting for another participant...');
  } catch (error) {
    console.error('[WEBRTC] Join flow failed:', error);
  }
}

function endCall() {
  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => track.stop());
  }

  if (state.peerConnection) {
    state.peerConnection.close();
    state.peerConnection = null;
  }

  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
  }

  state.localStream = null;
  state.isJoined = false;
  state.isOfferer = false;
  state.offerSent = false;
  state.answerSent = false;
  state.isConnecting = false;

  setMicStatus('OFF');
  setRemoteStatus('Waiting');
  updateStatus('Call ended.');

  if (state.roomId) {
    socket.emit('leave-room');
  }

  state.roomId = '';
  roomInput.value = '';
}

socket.on('connect', () => {
  console.log('[SERVER] Socket connected');
  updateStatus('Connected to signaling server. Ready to join a room.');
});

socket.on('connect_error', (error) => {
  console.error('[SERVER] Socket connection error:', error.message);
  setError('Could not connect to the signaling server.');
});

socket.on('disconnect', () => {
  console.log('[SERVER] Socket disconnected');
  updateStatus('Socket disconnected. Reconnecting...');
});

socket.on('join-error', ({ message }) => {
  console.error('[SERVER] Join error:', message);
  setError(message);
});

socket.on('joined-room', ({ roomId, role, participantCount }) => {
  console.log('[SERVER] Joined room:', roomId, 'role:', role, 'participants:', participantCount);
  updateStatus('Waiting for another participant...');
});

socket.on('room-ready', ({ message }) => {
  console.log('[SERVER] Room ready:', message);
  updateStatus(message);
});

socket.on('call-role', ({ role }) => {
  state.isOfferer = role === 'offerer';
  console.log('[WEBRTC] Assigned role:', role);

  if (state.isOfferer) {
    updateStatus('You are the offerer. Starting negotiation...');
    startOfferFlow();
  } else {
    updateStatus('You are the answerer. Waiting for offer...');
  }
});

socket.on('signal-offer', async ({ offer }) => {
  await handleIncomingOffer(offer);
});

socket.on('signal-answer', async ({ answer }) => {
  await handleIncomingAnswer(answer);
});

socket.on('signal-ice', async ({ candidate }) => {
  await handleIncomingIce(candidate);
});

socket.on('call-ended', ({ message }) => {
  setError(message);
  endCall();
});

joinBtn.addEventListener('click', () => {
  joinRoom();
});

muteBtn.addEventListener('click', () => {
  if (!state.localStream) return;

  const audioTrack = state.localStream.getAudioTracks()[0];
  if (!audioTrack) return;

  state.isMuted = !state.isMuted;
  audioTrack.enabled = !state.isMuted;
  muteBtn.textContent = state.isMuted ? '🎤 Unmute' : '🎤 Mute';
  setMicStatus(state.isMuted ? 'OFF' : 'ON');
});

endBtn.addEventListener('click', () => {
  endCall();
});

window.addEventListener('beforeunload', () => {
  if (state.roomId) {
    socket.emit('leave-room');
  }
});

window.addEventListener('click', () => {
  if (remoteAudio && !state.didUserInteractionEnableAudio) {
    remoteAudio.play().catch(() => {});
    state.didUserInteractionEnableAudio = true;
  }
});

updateStatus('Waiting for room connection...');
setMicStatus('OFF');
setRemoteStatus('Waiting');
