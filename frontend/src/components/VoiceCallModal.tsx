import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, PhoneOff, Activity, Lock, AlertCircle, Clock, Volume2, ChevronRight, X, HeartPulse } from 'lucide-react';
import { Consultation, User } from '../types';
import { getAuthHeader } from '../auth';

const AUDIO_CALL_URL = (import.meta.env.VITE_AUDIO_CALL_URL ?? 'https://chidambaranar-ai-call-support.onrender.com').trim().replace(/\/$/, '');

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
    onCallEnded,
}) => {
    const [callState, setCallState] = useState<'CONNECTING' | 'CONNECTED' | 'FAILED' | 'CLOSED'>('CONNECTING');
    const [isMuted, setIsMuted] = useState(false);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [showConfirmEnd, setShowConfirmEnd] = useState(false);
    const [showClinicalPanel, setShowClinicalPanel] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<'Excellent' | 'Good' | 'Fair'>('Excellent');
    const [micPermissionDenied, setMicPermissionDenied] = useState(false);
    const [participantStatus, setParticipantStatus] = useState('Waiting for participant...');
    const [statusMessage, setStatusMessage] = useState('Connecting to audio consultation room...');
    const [errorMessage, setErrorMessage] = useState('');

    const socketRef = useRef<Socket | null>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);
    const offerCreatedRef = useRef(false);
    const roomId = consultation.roomId || `room_${consultation.id}`;

    const isDoctor = currentUser.role === 'doctor';
    const peerName = isDoctor ? consultation.userName || 'Officer John Vance' : consultation.doctorName || 'Dr. Sarah Connor, MD';
    const peerTitle = isDoctor ? consultation.userTitle || 'Officer' : consultation.doctorTitle || 'Chief Occupational Psychiatrist';
    const peerAvatar = isDoctor
        ? (consultation.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')
        : (consultation.doctorAvatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80');

    const cleanupCall = useCallback(() => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        if (socketRef.current) {
            socketRef.current.emit('call:end', { consultationId: consultation.id, roomId });
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, [consultation.id, roomId]);

    useEffect(() => {
        let isActive = true;

        const initializeCall = async () => {
            try {
                const socket = io(AUDIO_CALL_URL, {
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    timeout: 20000,
                    auth: { token: getAuthHeader().Authorization?.replace('Bearer ', '') || '' },
                });
                socketRef.current = socket;

                socket.on('connect', async () => {
                    if (!isActive) return;
                    socket.emit('user:register', {
                        userId: currentUser.id,
                        name: currentUser.name,
                        role: isDoctor ? 'PSYCHOLOGIST' : 'USER',
                    });

                    try {
                        const res = await fetch(`/api/calls/${consultation.id}/join`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                        });
                        const data = await res.json();

                        if (!res.ok || !data?.success) {
                            throw new Error(data?.error || 'Not authorized to join this consultation.');
                        }

                        const joinedRoomId = data.roomId || roomId;
                        const stream = await navigator.mediaDevices.getUserMedia({
                            audio: true,
                            video: false,
                        });
                        localStreamRef.current = stream;

                        const pc = new RTCPeerConnection({
                            iceServers: data.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }],
                        });
                        peerRef.current = pc;

                        stream.getTracks().forEach(track => pc.addTrack(track, stream));

                        pc.onicecandidate = (event) => {
                            if (!event.candidate) return;
                            socket.emit('call:ice-candidate', {
                                consultationId: consultation.id,
                                roomId: joinedRoomId,
                                candidate: event.candidate,
                            });
                        };

                        pc.ontrack = (event) => {
                            const [remoteStream] = event.streams;
                            if (!remoteStream) return;

                            const remoteAudio = new Audio();
                            remoteAudio.srcObject = remoteStream;
                            remoteAudio.autoplay = true;
                            remoteAudio.setAttribute('playsinline', 'true');
                            remoteAudio.muted = false;
                            remoteAudio.play().catch(() => undefined);
                            setParticipantStatus('Connected to consultation room');
                            setCallState('CONNECTED');
                            setStatusMessage('Connected · two-way audio live');
                            setConnectionQuality('Excellent');
                        };

                        pc.onconnectionstatechange = () => {
                            if (!isActive) return;
                            if (pc.connectionState === 'connected') {
                                setCallState('CONNECTED');
                                setStatusMessage('Connected · two-way audio live');
                                setConnectionQuality('Excellent');
                            } else if (pc.connectionState === 'connecting') {
                                setCallState('CONNECTING');
                                setStatusMessage('Connecting to audio consultation room...');
                            } else if (pc.connectionState === 'failed') {
                                setCallState('FAILED');
                                setStatusMessage('Audio connection failed');
                            }
                        };

                        socket.emit('call:join', {
                            consultationId: consultation.id,
                            roomId: joinedRoomId,
                            participantId: currentUser.id,
                            userId: currentUser.id,
                            doctorId: consultation.doctorId,
                            role: isDoctor ? 'PSYCHOLOGIST' : 'USER',
                        });

                        socket.on('call:ready', ({ roomId: readyRoomId }) => {
                            if (!isActive || !peerRef.current || readyRoomId !== joinedRoomId || offerCreatedRef.current) return;
                            offerCreatedRef.current = true;
                            void (async () => {
                                const offer = await peerRef.current!.createOffer();
                                await peerRef.current!.setLocalDescription(offer);
                                socket.emit('call:offer', {
                                    consultationId: consultation.id,
                                    roomId: joinedRoomId,
                                    sdp: offer,
                                });
                            })();
                        });

                        socket.on('call:offer', async ({ sdp, senderId }) => {
                            if (!peerRef.current || senderId === socket.id) return;
                            await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
                            const answer = await peerRef.current.createAnswer();
                            await peerRef.current.setLocalDescription(answer);
                            socket.emit('call:answer', {
                                consultationId: consultation.id,
                                roomId: joinedRoomId,
                                sdp: answer,
                            });
                        });

                        socket.on('call:answer', async ({ sdp, senderId }) => {
                            if (!peerRef.current || senderId === socket.id) return;
                            await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
                        });

                        socket.on('call:ice-candidate', async ({ candidate, senderId }) => {
                            if (!peerRef.current || senderId === socket.id || !candidate) return;
                            try {
                                await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (err) {
                                console.warn('ICE add failed', err);
                            }
                        });

                        socket.on('call:ended', () => {
                            setCallState('CLOSED');
                            setStatusMessage('Consultation ended');
                            cleanupCall();
                            onCallEnded(durationSeconds);
                        });

                        socket.on('call:peer_disconnected', () => {
                            setParticipantStatus('Remote participant disconnected');
                        });
                    } catch (error) {
                        console.error('Join call failed', error);
                        setMicPermissionDenied(true);
                        setErrorMessage(error instanceof Error ? error.message : 'Unable to start microphone and join consultation.');
                        setCallState('FAILED');
                        setStatusMessage('Could not join consultation');
                    }
                });

                socket.on('connect_error', (err) => {
                    console.error('Socket connect error', err);
                    setErrorMessage('Unable to reach the audio call server.');
                    setCallState('FAILED');
                    setStatusMessage('Connection failed');
                });

                socket.on('disconnect', () => {
                    if (!isActive) return;
                    setParticipantStatus('Signal connection lost');
                });
            } catch (error) {
                console.error('Failed to initialize audio call', error);
                setErrorMessage('Unable to initialize the secure audio consultation.');
                setCallState('FAILED');
                setStatusMessage('Initialization failed');
            }
        };

        void initializeCall();

        return () => {
            isActive = false;
            cleanupCall();
        };
    }, [cleanupCall, consultation.doctorId, consultation.id, currentUser.id, currentUser.name, durationSeconds, isDoctor, onCallEnded, roomId]);

    useEffect(() => {
        if (callState === 'CONNECTED') {
            timerRef.current = window.setInterval(() => {
                setDurationSeconds(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }

        return () => {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [callState]);

    const toggleMute = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) return;
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
    };

    const handleEndCallConfirmed = async () => {
        setShowConfirmEnd(false);
        cleanupCall();
        setCallState('CLOSED');
        setStatusMessage('Consultation ended');

        try {
            await fetch(`/api/consultations/${consultation.id}/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ duration: durationSeconds }),
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
            <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        <span>CONFIDENTIAL AUDIO SESSION</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">Close</button>
                    </div>
                </div>

                <div className="p-8 flex flex-col items-center justify-center text-center">
                    <div className="mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800/80 border border-slate-700">
                        <span className={`w-2.5 h-2.5 rounded-full ${callState === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : callState === 'CONNECTING' ? 'bg-amber-500 animate-ping' : 'bg-red-500'}`} />
                        <span className={callState === 'CONNECTED' ? 'text-emerald-400' : callState === 'CONNECTING' ? 'text-amber-400' : 'text-red-400'}>{statusMessage}</span>
                    </div>

                    {errorMessage && (
                        <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm max-w-md flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-200">Audio Session Error</p>
                                <p className="text-xs text-red-300/90 mt-1">{errorMessage}</p>
                            </div>
                        </div>
                    )}

                    {micPermissionDenied && (
                        <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm max-w-md flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-200">Microphone Access Required</p>
                                <p className="text-xs text-red-300/90 mt-1">Please allow microphone access in the browser to join the confidential audio consultation.</p>
                            </div>
                        </div>
                    )}

                    <div className="relative mb-6">
                        <div className={`w-32 h-32 rounded-full border-4 p-1 transition-all duration-500 ${callState === 'CONNECTED' ? 'border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-slate-700'}`}>
                            <img src={peerAvatar} alt={peerName} className="w-full h-full rounded-full object-cover" />
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{peerName}</h3>
                    <p className="text-sm text-slate-400 mt-1 font-medium">{peerTitle}</p>
                    <p className="mt-3 text-xs text-slate-300 font-mono">{participantStatus}</p>

                    {isDoctor && (
                        <span className="mt-2 text-xs px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                            {consultation.reason}
                        </span>
                    )}

                    <div className="mt-6 flex items-center gap-2 font-mono text-3xl font-bold text-emerald-400 tracking-wider">
                        <Clock className="w-6 h-6 text-emerald-500" />
                        <span>{formatTimer(durationSeconds)}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span>Connection: <strong className="text-slate-200">{connectionQuality}</strong></span>
                        </div>
                        <span className="text-slate-700">•</span>
                        <div className="flex items-center gap-1.5">
                            <Volume2 className="w-4 h-4 text-cyan-400" />
                            <span>Audio-only</span>
                        </div>
                    </div>

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

                    <div className="mt-8 flex items-center gap-6">
                        <button
                            onClick={() => toggleMute()}
                            disabled={callState !== 'CONNECTED'}
                            className={`p-4 rounded-full border shadow-lg transition-all transform active:scale-95 ${isMuted ? 'bg-red-600/90 hover:bg-red-600 border-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400 hover:text-emerald-300'}`}
                            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                        >
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        <button
                            onClick={() => setShowConfirmEnd(true)}
                            className="p-4 rounded-full bg-red-600 hover:bg-red-500 border border-red-400 text-white shadow-lg shadow-red-950/50 transition-all transform active:scale-95 flex items-center justify-center"
                            title="End Call Session"
                        >
                            <PhoneOff className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-950/90 px-6 py-3 border-t border-slate-800/80 text-center text-xs text-slate-500">
                    🛡️ CHIDAMBARANAR AI Privacy Protocol: live audio only, no camera, no video streams.
                </div>
            </div>

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
                            <p className="text-slate-300">Elevated fatigue trends over past 10 days due to late tactical ops deployments.</p>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmEnd && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
                        <h4 className="text-lg font-bold text-slate-100">End consultation?</h4>
                        <p className="text-xs text-slate-400 mt-2">Are you sure you want to end this private voice session with {peerName}?</p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <button onClick={() => setShowConfirmEnd(false)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">Cancel</button>
                            <button onClick={() => void handleEndCallConfirmed()} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition shadow-md shadow-red-950">End Call</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
