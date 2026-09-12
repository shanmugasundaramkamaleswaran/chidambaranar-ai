import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, TokenSource, Track } from 'livekit-client';
import { Mic, MicOff, PhoneOff, Shield, Activity, Lock, AlertCircle, Clock, Volume2, ChevronRight, X, HeartPulse } from 'lucide-react';
import { Consultation, User } from '../types';
import { getAuthHeader } from '../auth';

const LIVEKIT_URL = (import.meta.env.VITE_LIVEKIT_URL ?? '').trim();
const LIVEKIT_TOKEN_SERVER_ID = (import.meta.env.VITE_LIVEKIT_TOKEN_SERVER_ID ?? '').trim();

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
    const [callState, setCallState] = useState<'CONNECTING' | 'CONNECTED' | 'FAILED' | 'CLOSED'>('CONNECTING');
    const [isMuted, setIsMuted] = useState(false);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [showConfirmEnd, setShowConfirmEnd] = useState(false);
    const [showClinicalPanel, setShowClinicalPanel] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<'Excellent' | 'Good' | 'Fair'>('Excellent');
    const [micPermissionDenied, setMicPermissionDenied] = useState(false);
    const [participantStatus, setParticipantStatus] = useState('Waiting for participant...');
    const [statusMessage, setStatusMessage] = useState('Connecting to LiveKit room...');
    const [errorMessage, setErrorMessage] = useState('');

    const roomRef = useRef<Room | null>(null);
    const timerRef = useRef<number | null>(null);

    const isDoctor = currentUser.role === 'doctor';
    const peerName = isDoctor ? consultation.userName || 'Officer John Vance' : consultation.doctorName || 'Dr. Sarah Connor, MD';
    const peerTitle = isDoctor ? consultation.userTitle || 'Officer' : consultation.doctorTitle || 'Chief Occupational Psychiatrist';
    const peerAvatar = isDoctor
        ? (consultation.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')
        : (consultation.doctorAvatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80');
    const roomName = consultation.roomId || `consult-${consultation.id}`;
    const participantIdentity = `${currentUser.role}:${currentUser.id || 'participant'}`;

    const cleanupCall = useCallback(() => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (roomRef.current) {
            const room = roomRef.current;
            room.disconnect().catch(() => undefined);
            roomRef.current = null;
        }
    }, []);

    useEffect(() => {
        let isActive = true;

        const initializeLiveKitCall = async () => {
            if (!LIVEKIT_URL || !LIVEKIT_TOKEN_SERVER_ID) {
                if (!isActive) return;
                setErrorMessage('Missing LiveKit configuration. Add VITE_LIVEKIT_URL and VITE_LIVEKIT_TOKEN_SERVER_ID to your frontend .env file.');
                setCallState('FAILED');
                setStatusMessage('Configuration required');
                return;
            }

            try {
                const room = new Room({
                    adaptiveStream: true,
                    dynacast: false,
                    publishDefaults: { simulcast: false },
                });

                roomRef.current = room;

                room.on(RoomEvent.ConnectionStateChanged, (state) => {
                    if (!isActive) return;
                    console.log('[LIVEKIT] state change:', state);
                    if (state === 'connected') {
                        setCallState('CONNECTED');
                        setStatusMessage('Connected to LiveKit room');
                        setConnectionQuality('Excellent');
                    } else if (state === 'connecting') {
                        setCallState('CONNECTING');
                        setStatusMessage('Connecting to LiveKit room...');
                    } else if (state === 'reconnecting') {
                        setStatusMessage('Reconnecting to LiveKit room...');
                    }
                });

                room.on(RoomEvent.ParticipantConnected, (participant) => {
                    if (!isActive) return;
                    setParticipantStatus(`${participant.identity} joined the room`);
                });

                room.on(RoomEvent.ParticipantDisconnected, (participant) => {
                    if (!isActive) return;
                    setParticipantStatus(`${participant.identity} left the room`);
                });

                room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
                    if (!isActive) return;
                    if (speakers.length > 0) {
                        setParticipantStatus(`${speakers.length} participant(s) speaking`);
                    }
                });

                room.on(RoomEvent.Disconnected, () => {
                    if (!isActive) return;
                    setCallState('CLOSED');
                    setStatusMessage('LiveKit call disconnected');
                });

                try {
                    const tokenSource = TokenSource.developmentTokenServer(LIVEKIT_TOKEN_SERVER_ID);
                    const tokenResponse = await tokenSource.fetch({
                        roomName,
                        participantIdentity,
                        participantName: currentUser.name,
                    });

                    await room.connect(LIVEKIT_URL, tokenResponse.participantToken, { autoSubscribe: true });
                    await room.localParticipant.setMicrophoneEnabled(true);
                    await room.localParticipant.setCameraEnabled(false);

                    setCallState('CONNECTED');
                    setStatusMessage('Microphone live · audio-only room');
                    setParticipantStatus('Connected to consultation room');
                } catch (err) {
                    console.error('[LIVEKIT] connection error:', err);
                    if (!isActive) return;
                    setMicPermissionDenied(true);
                    setErrorMessage('Unable to connect to LiveKit. Please allow microphone access and confirm your token server is valid.');
                    setCallState('FAILED');
                    setStatusMessage('Connection failed');
                    return;
                }

                const roomState = room.state;
                if (roomState === 'connected' && isActive) {
                    setCallState('CONNECTED');
                }

            } catch (err) {
                console.error('[LIVEKIT] initialization failed:', err);
                if (isActive) {
                    setErrorMessage('LiveKit audio room failed to initialize.');
                    setCallState('FAILED');
                    setStatusMessage('Initialization failed');
                }
            }
        };

        void initializeLiveKitCall();

        return () => {
            isActive = false;
            cleanupCall();
        };
    }, [cleanupCall, currentUser.id, currentUser.name, participantIdentity, roomName]);

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

    const toggleMute = async () => {
        const room = roomRef.current;
        if (!room) return;

        const nextMuted = !isMuted;
        await room.localParticipant.setMicrophoneEnabled(!nextMuted);
        setIsMuted(nextMuted);
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
                body: JSON.stringify({ duration: durationSeconds })
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
                        <span>CONFIDENTIAL LIVEKIT VOICE SESSION</span>
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
                                <p className="font-semibold text-red-200">LiveKit Session Error</p>
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
                            onClick={() => void toggleMute()}
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
