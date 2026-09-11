import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, PhoneOff, Shield, Activity, Lock, AlertCircle, Clock, Volume2, UserCheck, ChevronRight, X, FileText, HeartPulse } from 'lucide-react';
import { Consultation, User } from '../types';
import { getAuthHeader } from '../auth';

const AUDIO_CALL_URL = import.meta.env.VITE_AUDIO_CALL_URL || 'https://chidambaranar-ai-call-support.onrender.com';

interface VoiceCallModalProps {
    consultation: Consultation;
    currentUser: User;
    onClose: () => void;
    onCallEnded: (durationSeconds: number) => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
    consultation,
    currentUser,
    onClose,
    onCallEnded
}) => {
    const [callState, setCallState] = useState<'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'FAILED' | 'CLOSED'>('CONNECTING');
    const [isMuted, setIsMuted] = useState(false);
    const [peerIsMuted, setPeerIsMuted] = useState(false);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [showConfirmEnd, setShowConfirmEnd] = useState(false);
    const [showClinicalPanel, setShowClinicalPanel] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<'Excellent' | 'Good' | 'Fair'>('Excellent');
    const [micPermissionDenied, setMicPermissionDenied] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const isDoctor = currentUser.role === 'doctor';
    const peerName = isDoctor ? consultation.userName || 'Officer John Vance' : consultation.doctorName || 'Dr. Sarah Connor, MD';
    const peerTitle = isDoctor ? consultation.userTitle || 'Officer' : consultation.doctorTitle || 'Chief Occupational Psychiatrist';
    const peerAvatar = isDoctor
        ? (consultation.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')
        : (consultation.doctorAvatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80');

    // Initialize WebRTC & Socket.IO signaling
    useEffect(() => {
        let isSubscribed = true;

        const initializeCall = async () => {
            try {
                // 1. Fetch authorized session room and STUN configuration from backend
                const authRes = await fetch(`/api/calls/${consultation.id}/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                    body: JSON.stringify({
                        role: currentUser.role
                    })
                });

                if (!authRes.ok) {
                    throw new Error('Call authorization failed.');
                }

                const authData = await authRes.json();
                const iceServers = authData.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];

                // 2. Request microphone permission ONLY on call join
                let localStream: MediaStream;
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    localStreamRef.current = localStream;
                } catch (micErr) {
                    console.error('Microphone permission denied:', micErr);
                    if (isSubscribed) {
                        setMicPermissionDenied(true);
                        setCallState('FAILED');
                    }
                    return;
                }

                // 3. Connect to Socket.IO signaling server
                const socket = io(AUDIO_CALL_URL, {
                    transports: ['websocket', 'polling'],
                    autoConnect: true
                });
                socketRef.current = socket;

                // 4. Create RTCPeerConnection
                const pc = new RTCPeerConnection({ iceServers });
                pcRef.current = pc;

                // Add local audio track to PeerConnection
                localStream.getTracks().forEach(track => {
                    pc.addTrack(track, localStream);
                });

                // Listen for remote audio track
                pc.ontrack = (event) => {
                    if (remoteAudioRef.current && event.streams[0]) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                        setCallState('CONNECTED');
                    }
                };

                // ICE Candidates handling
                pc.onicecandidate = (event) => {
                    if (event.candidate && socketRef.current) {
                        socketRef.current.emit('call:ice-candidate', {
                            candidate: event.candidate,
                            consultationId: consultation.id
                        });
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (!isSubscribed) return;
                    console.log('RTCPeerConnection state:', pc.connectionState);
                    if (pc.connectionState === 'connected') {
                        setCallState('CONNECTED');
                    } else if (pc.connectionState === 'connecting') {
                        setCallState('CONNECTING');
                    } else if (pc.connectionState === 'disconnected') {
                        setCallState('RECONNECTING');
                    } else if (pc.connectionState === 'failed') {
                        setCallState('FAILED');
                    } else if (pc.connectionState === 'closed') {
                        setCallState('CLOSED');
                    }
                };

                // Socket Event Handlers
                const joinPayload = {
                    consultationId: consultation.id,
                    userId: currentUser.role === 'user_employee' ? currentUser.id : undefined,
                    doctorId: currentUser.role === 'doctor' ? currentUser.id : undefined,
                    role: currentUser.role
                };

                if (socket.connected) {
                    socket.emit('call:join', joinPayload);
                }

                socket.on('connect', () => {
                    socket.emit('call:join', joinPayload);
                });

                socket.on('call:ready', async () => {
                    // Start offer if initiator
                    if (isDoctor && pc.signalingState === 'stable') {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            socket.emit('call:offer', { sdp: offer, consultationId: consultation.id });
                        } catch (e) {
                            console.error('Error creating SDP offer:', e);
                        }
                    }
                });

                let iceCandidatesQueue: RTCIceCandidateInit[] = [];

                socket.on('call:offer', async ({ sdp }) => {
                    if (!pc) return;
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socket.emit('call:answer', { sdp: answer, consultationId: consultation.id });
                        setCallState('CONNECTED');

                        // Process queued ICE candidates
                        for (const candidate of iceCandidatesQueue) {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                        iceCandidatesQueue = [];
                    } catch (e) {
                        console.error('Error handling SDP offer:', e);
                    }
                });

                socket.on('call:answer', async ({ sdp }) => {
                    if (!pc) return;
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                        setCallState('CONNECTED');

                        // Process queued ICE candidates
                        for (const candidate of iceCandidatesQueue) {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                        iceCandidatesQueue = [];
                    } catch (e) {
                        console.error('Error setting remote answer:', e);
                    }
                });

                socket.on('call:ice-candidate', async ({ candidate }) => {
                    if (!pc) return;
                    try {
                        if (pc.remoteDescription) {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        } else {
                            iceCandidatesQueue.push(candidate);
                        }
                    } catch (e) {
                        console.error('Error adding ICE candidate:', e);
                    }
                });

                socket.on('call:peer_mute_changed', ({ isMuted: peerMuted }) => {
                    setPeerIsMuted(peerMuted);
                });

                socket.on('call:peer_reconnecting', () => {
                    setCallState('RECONNECTING');
                });

                socket.on('call:ended', () => {
                    cleanupCall();
                    setCallState('CLOSED');
                });

                // Trigger start status API call
                fetch(`/api/consultations/${consultation.id}/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                    body: JSON.stringify({})
                }).catch(err => console.error('Failed to mark start:', err));

            } catch (err) {
                console.error('Failed to initialize voice call session:', err);
                if (isSubscribed) setCallState('FAILED');
            }
        };

        initializeCall();

        return () => {
            isSubscribed = false;
            cleanupCall();
        };
    }, [consultation.id]);

    // Timer logic
    useEffect(() => {
        if (callState === 'CONNECTED') {
            timerRef.current = setInterval(() => {
                setDurationSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callState]);

    const cleanupCall = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                if (socketRef.current) {
                    socketRef.current.emit('call:mute_state', {
                        consultationId: consultation.id,
                        isMuted: !audioTrack.enabled,
                        role: currentUser.role
                    });
                }
            }
        }
    };

    const handleEndCallConfirmed = async () => {
        setShowConfirmEnd(false);
        cleanupCall();
        setCallState('CLOSED');

        try {
            await fetch(`/api/consultations/${consultation.id}/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    duration: durationSeconds
                })
            });
        } catch (err) {
            console.error('Failed to complete consultation API call:', err);
        }

        onCallEnded(durationSeconds);
    };

    const formatTimer = (totalSec: number) => {
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            {/* Remote Audio element */}
            <audio ref={remoteAudioRef} autoPlay playsInline />

            <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header Security Status Bar */}
                <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        <span>CONFIDENTIAL VOICE SESSION</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-slate-400">
                            <Shield className="w-3.5 h-3.5 text-cyan-400" /> WebRTC P2P
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-400 font-medium">No Video / No Recording</span>
                    </div>
                </div>

                {/* Main Call View */}
                <div className="p-8 flex flex-col items-center justify-center text-center">
                    {/* Call Status Badge */}
                    <div className="mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800/80 border border-slate-700">
                        <span className={`w-2.5 h-2.5 rounded-full ${callState === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' :
                            callState === 'CONNECTING' ? 'bg-amber-500 animate-ping' :
                                callState === 'RECONNECTING' ? 'bg-orange-500 animate-bounce' : 'bg-red-500'
                            }`} />
                        <span className={
                            callState === 'CONNECTED' ? 'text-emerald-400' :
                                callState === 'CONNECTING' ? 'text-amber-400' :
                                    callState === 'RECONNECTING' ? 'text-orange-400' : 'text-red-400'
                        }>
                            {callState === 'CONNECTED' ? 'Connected & Secure' :
                                callState === 'CONNECTING' ? 'Establishing P2P Audio Connection...' :
                                    callState === 'RECONNECTING' ? 'Reconnecting Session...' :
                                        callState === 'FAILED' ? 'Connection Failed' : 'Call Session Ended'}
                        </span>
                    </div>

                    {/* Microphone Permission Warning */}
                    {micPermissionDenied && (
                        <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm max-w-md flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-200">Microphone Access Denied</p>
                                <p className="text-xs text-red-300/90 mt-1">
                                    Please allow microphone permissions in your browser address bar to participate in the continuous voice consultation.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Peer Profile Card */}
                    <div className="relative mb-6">
                        <div className={`w-32 h-32 rounded-full border-4 p-1 transition-all duration-500 ${callState === 'CONNECTED' ? 'border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-slate-700'
                            }`}>
                            <img
                                src={peerAvatar}
                                alt={peerName}
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>

                        {/* Mute Indicator Badge */}
                        {peerIsMuted && (
                            <div className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full border-2 border-slate-900 shadow-md">
                                <MicOff className="w-4 h-4" />
                            </div>
                        )}
                    </div>

                    <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{peerName}</h3>
                    <p className="text-sm text-slate-400 mt-1 font-medium">{peerTitle}</p>
                    {isDoctor && (
                        <span className="mt-2 text-xs px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                            {consultation.reason}
                        </span>
                    )}

                    {/* Continuous Call Timer */}
                    <div className="mt-6 flex items-center gap-2 font-mono text-3xl font-bold text-emerald-400 tracking-wider">
                        <Clock className="w-6 h-6 text-emerald-500" />
                        <span>{formatTimer(durationSeconds)}</span>
                    </div>

                    {/* Network & Audio Quality Bar */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span>Connection: <strong className="text-slate-200">{connectionQuality}</strong></span>
                        </div>
                        <span className="text-slate-700">•</span>
                        <div className="flex items-center gap-1.5">
                            <Volume2 className="w-4 h-4 text-cyan-400" />
                            <span>Audio: 2-Way P2P</span>
                        </div>
                    </div>

                    {/* Doctor Clinical Context Drawer Trigger */}
                    {isDoctor && (
                        <button
                            onClick={() => setShowClinicalPanel(!showClinicalPanel)}
                            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                        >
                            <HeartPulse className="w-4 h-4 text-rose-400" />
                            <span>{showClinicalPanel ? 'Hide Patient Clinical Data' : 'View Patient Well-Being Profile'}</span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showClinicalPanel ? 'rotate-90' : ''}`} />
                        </button>
                    )}

                    {/* Controls Bar */}
                    <div className="mt-8 flex items-center gap-6">
                        {/* Mute Button */}
                        <button
                            onClick={toggleMute}
                            disabled={callState !== 'CONNECTED'}
                            className={`p-4 rounded-full border shadow-lg transition-all transform active:scale-95 ${isMuted
                                ? 'bg-red-600/90 hover:bg-red-600 border-red-500 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400 hover:text-emerald-300'
                                }`}
                            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                        >
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        {/* End Call Button */}
                        <button
                            onClick={() => setShowConfirmEnd(true)}
                            className="p-4 rounded-full bg-red-600 hover:bg-red-500 border border-red-400 text-white shadow-lg shadow-red-950/50 transition-all transform active:scale-95 flex items-center justify-center"
                            title="End Call Session"
                        >
                            <PhoneOff className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Footer Security Notice */}
                <div className="bg-slate-950/90 px-6 py-3 border-t border-slate-800/80 text-center text-xs text-slate-500">
                    🛡️ CHIDAMBARANAR AI Privacy Protocol: AI is not listening. Audio stream is ephemeral and unrecorded.
                </div>
            </div>

            {/* Doctor Clinical Context Panel */}
            {isDoctor && showClinicalPanel && (
                <div className="absolute right-6 top-6 bottom-6 w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-y-auto z-50 text-left">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                            <HeartPulse className="w-4 h-4" />
                            <span>Patient Well-being Summary</span>
                        </div>
                        <button onClick={() => setShowClinicalPanel(false)} className="text-slate-400 hover:text-slate-200">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-4 text-xs text-slate-300">
                        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                            <p className="font-semibold text-slate-200 mb-1">Consultation Reason:</p>
                            <p className="text-slate-300 italic">{consultation.reason}</p>
                        </div>

                        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-2">
                            <p className="font-semibold text-slate-200">Authorized Longitudinal Baseline:</p>
                            <div className="grid grid-cols-2 gap-2 text-slate-400">
                                <div>Normal Stress: <span className="text-slate-200 font-mono">3.5 / 10</span></div>
                                <div>Normal Workload: <span className="text-slate-200 font-mono">5.8 hrs</span></div>
                                <div>Sleep Baseline: <span className="text-slate-200 font-mono">7.2 hrs</span></div>
                                <div>Fatigue Index: <span className="text-slate-200 font-mono">3.0 / 10</span></div>
                            </div>
                        </div>

                        <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-800/50 text-amber-200">
                            <p className="font-semibold flex items-center gap-1.5 mb-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                14-Day Risk Indicator:
                            </p>
                            <p className="text-slate-300">
                                Elevated fatigue trends over past 10 days due to late tactical ops deployments.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* End Call Confirmation Modal */}
            {showConfirmEnd && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
                        <h4 className="text-lg font-bold text-slate-100">End consultation?</h4>
                        <p className="text-xs text-slate-400 mt-2">
                            Are you sure you want to end this private voice session with {peerName}?
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <button
                                onClick={() => setShowConfirmEnd(false)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEndCallConfirmed}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition shadow-md shadow-red-950"
                            >
                                End Call
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
