import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { User, WellbeingCheckin, RiskEvaluation, Organization, Consultation } from '../types';
import { saveCheckinToCloudStorage } from '../firebase';
import { ShieldAlert, Heart, Plus, Sparkles, CheckCircle2, Lock, Send, Building2, PhoneCall, Stethoscope, History, Phone } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { VoiceCallModal } from './VoiceCallModal';
import { PsychologistSelectModal } from './PsychologistSelectModal';
import { CallHistoryModal } from './CallHistoryModal';
import { getAuthHeader } from '../auth';

interface UserDashboardProps {
    user: User;
    organization?: Organization | null;
    onRefreshData: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, organization, onRefreshData }) => {
    const [checkins, setCheckins] = useState<WellbeingCheckin[]>([]);
    const [latestEval, setLatestEval] = useState<RiskEvaluation | null>(null);

    // Consultation & WebRTC Voice Call States
    const [userConsultations, setUserConsultations] = useState<Consultation[]>([]);
    const [activeCallConsultation, setActiveCallConsultation] = useState<Consultation | null>(null);
    const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [incomingNotification, setIncomingNotification] = useState<{ consultationId: string; doctorName: string } | null>(null);

    // Daily Check-in Modal State
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [stressLevel, setStressLevel] = useState(4);
    const [fatigue, setFatigue] = useState(3);
    const [sleepHours, setSleepHours] = useState(7);
    const [journal, setJournal] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Chatbot Drawer State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string; time: string; mood?: string; sentiment?: string }[]>([
        { sender: 'ai', text: `Hello Officer ${user.name.split(' ')[0]}. I am ABIMANYU — your AI psychological support system. How are you feeling after your shift today?`, time: '18:00' }
    ]);
    const [chatInput, setChatInput] = useState('');

    // Consultation Request State
    const [consultReason, setConsultReason] = useState('');
    const [consultSuccess, setConsultSuccess] = useState(false);
    const [isRequestingDoctor, setIsRequestingDoctor] = useState(false);

    // Privacy Consent Toggle
    const [shareDetailedWithDoctor, setShareDetailedWithDoctor] = useState(user.shareWithDoctor ?? true);

    // Fetch longitudinal data & consultations from server
    const fetchDashboardData = async () => {
        try {
            const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
            const [checkinRes, consultRes] = await Promise.all([
                fetch('/api/checkins', { headers }),
                fetch('/api/consultations/user', { headers })
            ]);

            const checkinData = await checkinRes.json();
            if (checkinData.checkins) setCheckins(checkinData.checkins);
            if (checkinData.riskEval) setLatestEval(checkinData.riskEval);

            if (consultRes.ok) {
                const consultData = await consultRes.json();
                setUserConsultations(consultData.consultations || []);
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        }
    };

    useEffect(() => {
        fetchDashboardData();

        // Socket.IO real-time notification listener
        const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
            socket.emit('user:register', { userId: user.id });
        });

        socket.on('consultation:accepted', ({ consultationId, doctorName, roomId }) => {
            setIncomingNotification({ consultationId, doctorName });
            const matchingConsultation = userConsultations.find(c => c.id === consultationId);
            if (matchingConsultation) {
                setActiveCallConsultation({ ...matchingConsultation, status: 'ACCEPTED' } as Consultation);
            }
            fetchDashboardData();
        });

        socket.on('consultation:ready', ({ consultationId }) => {
            fetchDashboardData();
        });

        return () => {
            socket.disconnect();
        };
    }, [user.id]);

    // Submit New Daily Check-In
    const handleCheckinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const newCheckinPayload = {
            userId: user.id,
            stressLevel,
            fatigue,
            sleepHours,
            journal
        };

        try {
            // 1. Submit to API server
            const res = await fetch('/api/checkins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify(newCheckinPayload)
            });
            const data = await res.json();

            // 2. Backup check-in record to Firebase Cloud Storage Bucket
            await saveCheckinToCloudStorage(user.id, newCheckinPayload);

            if (data.success) {
                setIsCheckinModalOpen(false);
                setJournal('');
                fetchDashboardData();
                onRefreshData();
            }
        } catch (err) {
            console.error('Error submitting checkin:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Send Message to AI Assistant Chatbot (powered by ABIMANYU AI)
    const handleSendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { sender: 'user', text: userMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ message: userMsg })
            });
            const data = await res.json();
            const replyText = data.reply || data.response || "I'm here to help. Please try again.";
            const moodTag = data.mood ? ` [${data.mood}]` : '';
            setChatMessages(prev => [...prev, { sender: 'ai', text: replyText, mood: data.mood, sentiment: data.sentiment, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } catch (err) {
            console.error('Chat error:', err);
            setChatMessages(prev => [...prev, { sender: 'ai', text: "Connection to ABIMANYU AI lost. Please try again shortly.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        }
    };

    // Submit Consultation Request to Doctor
    const handleRequestConsultation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consultReason.trim()) return;

        setIsRequestingDoctor(true);
        try {
            const res = await fetch('/api/consultations/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    doctorId: 'usr_doc1',
                    reason: consultReason,
                    consultationType: 'audio'
                })
            });
            const data = await res.json();
            if (data.success) {
                setConsultSuccess(true);
                setConsultReason('');
                setTimeout(() => setConsultSuccess(false), 5000);
                fetchDashboardData();
            }
        } catch (err) {
            console.error('Consultation request error:', err);
        } finally {
            setIsRequestingDoctor(false);
        }
    };

    // Toggle Doctor Data Access Consent
    const handleToggleConsent = async () => {
        const nextVal = !shareDetailedWithDoctor;
        setShareDetailedWithDoctor(nextVal);
        try {
            await fetch('/api/user/consent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ shareWithAssignedDoctorDetailed: nextVal })
            });
        } catch (err) {
            console.error('Error saving consent setting:', err);
        }
    };

    const riskLevel = latestEval?.level || 'GREEN';
    const riskScore = latestEval?.score || 25;

    let riskColor = 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40';
    let riskBadge = 'bg-emerald-950 text-emerald-300 border-emerald-800';

    if (riskLevel === 'YELLOW') {
        riskColor = 'text-amber-400 border-amber-500/50 bg-amber-950/40';
        riskBadge = 'bg-amber-950 text-amber-300 border-amber-800';
    } else if (riskLevel === 'ORANGE') {
        riskColor = 'text-orange-400 border-orange-500/50 bg-orange-950/40';
        riskBadge = 'bg-orange-950 text-orange-300 border-orange-800';
    } else if (riskLevel === 'RED') {
        riskColor = 'text-rose-400 border-rose-500/50 bg-rose-950/40 pulse-red';
        riskBadge = 'bg-rose-950 text-rose-300 border-rose-800';
    }

    // Radar Data for Personal Baseline Metrics
    const radarData = [
        { metric: 'Stress Level', current: (checkins[checkins.length - 1]?.stressLevel || 4) * 10, baseline: 35 },
        { metric: 'Fatigue', current: (checkins[checkins.length - 1]?.fatigue || 3) * 10, baseline: 30 },
        { metric: 'Sleep Deficit', current: (10 - (checkins[checkins.length - 1]?.sleepHours || 7)) * 10, baseline: 25 },
        { metric: 'Workload Pressure', current: 60, baseline: 40 },
        { metric: 'Emotional Tension', current: (checkins[checkins.length - 1]?.stressLevel || 4) * 9, baseline: 30 }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

            {/* HEADER BAR & QUICK ACTIONS */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <div className="flex items-center gap-4">
                    {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/50 shadow-md" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-2xl font-bold text-cyan-300">
                            {user.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl lg:text-2xl font-black text-white">{user.name}</h1>
                            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800">
                                ACTIVE PERSONNEL
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{user.title}</p>
                        {organization && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-mono">
                                <Building2 className="w-3 h-3 text-cyan-400" />
                                <span className="text-cyan-300 font-bold">{organization.name}</span>
                                <span className="text-slate-500">·</span>
                                <span className="text-slate-400">{organization.id} / {organization.code}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsSelectModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 border border-emerald-400/30 transition-all hover:scale-[1.02]"
                    >
                        <PhoneCall className="w-4 h-4" />
                        <span>Talk to Psychologist</span>
                    </button>

                    <button
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-slate-700 transition-all"
                    >
                        <History className="w-4 h-4 text-emerald-400" />
                        <span>Call History</span>
                    </button>

                    <button
                        onClick={() => setIsCheckinModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-bold text-xs border border-cyan-800 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Daily Check-In</span>
                    </button>

                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-slate-700 transition-all"
                    >
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>AI Wellness Assistant</span>
                    </button>
                </div>
            </div>

            {/* REAL-TIME CALL ACCEPTED NOTIFICATION TOAST BANNER */}
            {incomingNotification && (
                <div className="p-5 rounded-3xl bg-emerald-950/90 border border-emerald-500/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold animate-bounce">
                            <Phone className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">Psychologist Consultation Ready!</h4>
                            <p className="text-xs text-emerald-200 mt-0.5">
                                {incomingNotification.doctorName} accepted your voice consultation request.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                            onClick={() => setIncomingNotification(null)}
                            className="px-3 py-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={() => {
                                const cons = userConsultations.find(c => c.id === incomingNotification.consultationId) || {
                                    id: incomingNotification.consultationId,
                                    userId: user.id,
                                    doctorId: 'usr_doc1',
                                    status: 'ACCEPTED',
                                    reason: 'Real-time Voice Consultation',
                                    doctorName: incomingNotification.doctorName
                                };
                                setActiveCallConsultation(cons as Consultation);
                                setIncomingNotification(null);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950 flex items-center gap-2"
                        >
                            <PhoneCall className="w-4 h-4" />
                            <span>Join Voice Call Now</span>
                        </button>
                    </div>
                </div>
            )}

            {/* RISK ESCALATION WARNING BANNER */}
            {latestEval && (
                <div className={`p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${riskColor}`}>
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 shrink-0">
                            <ShieldAlert className="w-8 h-8 text-current" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border uppercase ${riskBadge}`}>
                                    {riskLevel} RISK TIER
                                </span>
                                <span className="text-xs font-mono font-bold text-white">Score: {riskScore} / 100</span>
                            </div>
                            <p className="text-sm font-semibold text-white mt-1.5">{latestEval.recommendations?.[0] || 'Maintain baseline resilience routine.'}</p>
                            <p className="text-xs text-slate-300 mt-1">Factors: {latestEval.contributingFactors?.join(' • ') || 'Normal Shift'}</p>
                        </div>
                    </div>

                    {(riskLevel === 'ORANGE' || riskLevel === 'RED') && (
                        <button
                            onClick={() => {
                                const el = document.getElementById('doctor-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs shadow-lg hover:bg-slate-100 shrink-0"
                        >
                            Request Confidential Doctor Consult
                        </button>
                    )}
                </div>
            )}

            {/* LONGITUDINAL TREND CHART & PERSONAL BASELINE RADAR GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 14-Day Stress & Fatigue Longitudinal Trend (Left 2 Cols) */}
                <div className="lg:col-span-2 p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white">14-Day Stress & Well-being Longitudinal Curve</h2>
                            <p className="text-xs text-slate-400">Tracking personal baseline shifts over time.</p>
                        </div>
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-md border border-cyan-800">
                            AI BASELINE ACTIVE
                        </span>
                    </div>

                    <div className="h-64 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={checkins}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="score" name="Stress Risk Score" stroke="#06b6d4" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
                                <Area type="monotone" dataKey="sleepHours" name="Sleep (Hours)" stroke="#38bdf8" fillOpacity={1} fill="url(#colorSleep)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Personal Baseline Deviation Radar (Right Col) */}
                <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-1">Personal Baseline Radar</h2>
                        <p className="text-xs text-slate-400">Current metrics vs 7-day normal baseline.</p>

                        <div className="h-56 w-full my-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#334155" />
                                    <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={10} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                                    <Radar name="Current Shift" dataKey="current" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
                                    <Radar name="Normal Baseline" dataKey="baseline" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>AI Notice: Sleep deficit is currently contributing +14% to stress elevation.</span>
                    </div>
                </div>

            </div>

            {/* DOCTOR CONSULTATION & PRIVACY MATRIX GRID */}
            <div id="doctor-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Confidential Doctor Consultation Request */}
                <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                            <Heart className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Confidential Doctor Consultation</h3>
                            <p className="text-xs text-slate-400">Request support from assigned clinical specialist (Dr. Sarah Connor, MD).</p>
                        </div>
                    </div>

                    <form onSubmit={handleRequestConsultation} className="space-y-3">
                        <textarea
                            rows={3}
                            value={consultReason}
                            onChange={e => setConsultReason(e.target.value)}
                            placeholder="Describe any persistent operational fatigue, sleep disruption, or stress concerns..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />

                        {consultSuccess && (
                            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-300 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Calling Psychologist... Waiting for Psychologist to accept</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isRequestingDoctor || !consultReason.trim()}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
                        >
                            {isRequestingDoctor ? 'Submitting Request...' : 'Send Consultation Request'}
                        </button>
                    </form>
                </div>

                {/* Privacy & Consent Preferences Matrix */}
                <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Privacy & Consent Matrix</h3>
                            <p className="text-xs text-slate-400">You retain 100% control over who views your clinical details.</p>
                        </div>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-white">Share Detailed Check-Ins with Doctor</p>
                                <p className="text-[11px] text-slate-400">Allows Dr. Sarah Connor to view your 14-day sleep & stress graphs.</p>
                            </div>
                            <button
                                onClick={handleToggleConsent}
                                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${shareDetailedWithDoctor ? 'bg-cyan-600' : 'bg-slate-800'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${shareDetailedWithDoctor ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-white">Company Admin Access Status</p>
                                <p className="text-[11px] text-slate-400">Admins ONLY view aggregated, anonymized department metrics.</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-800">
                                RESTRICTED / ANONYMIZED
                            </span>
                        </div>
                    </div>
                </div>

            </div>

            {/* DAILY CHECK-IN MODAL */}
            {isCheckinModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#0b1324] border border-slate-800 rounded-3xl max-w-lg w-full p-6 lg:p-8 shadow-2xl space-y-6 relative">
                        <button onClick={() => setIsCheckinModalOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-sm">✕</button>

                        <div>
                            <h3 className="text-xl font-bold text-white">Daily Well-Being Check-In</h3>
                            <p className="text-xs text-slate-400">Takes under 60 seconds. Confidential and non-clinical.</p>
                        </div>

                        <form onSubmit={handleCheckinSubmit} className="space-y-5">

                            {/* Stress Level */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                                    <span>Current Stress Level (1 - 10)</span>
                                    <span className="text-cyan-400 font-mono font-bold">{stressLevel} / 10</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" value={stressLevel}
                                    onChange={e => setStressLevel(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>

                            {/* Fatigue */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                                    <span>Physical & Mental Fatigue (1 - 10)</span>
                                    <span className="text-amber-400 font-mono font-bold">{fatigue} / 10</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" value={fatigue}
                                    onChange={e => setFatigue(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                            </div>

                            {/* Sleep Hours */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                                    <span>Last Night's Sleep (Hours)</span>
                                    <span className="text-sky-400 font-mono font-bold">{sleepHours} Hours</span>
                                </div>
                                <input
                                    type="range" min="3" max="11" step="0.5" value={sleepHours}
                                    onChange={e => setSleepHours(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                                />
                            </div>

                            {/* Confidential Journal */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Confidential Journal (Optional)</label>
                                <textarea
                                    rows={2}
                                    value={journal}
                                    onChange={e => setJournal(e.target.value)}
                                    placeholder="Record any personal thoughts or operational context..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsCheckinModalOpen(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 text-white font-bold text-xs shadow-md">
                                    {isSubmitting ? 'Saving to Cloud Storage...' : 'Submit Check-In'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* AI ASSISTANT CHATBOT DRAWER */}
            {isChatOpen && (
                <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#080e1c] border-l border-slate-800 shadow-2xl p-6 flex flex-col justify-between animate-slideIn">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                <div>
                                    <h3 className="font-bold text-white text-sm">ABIMANYU AI Psychologist</h3>
                                    <p className="text-[10px] text-purple-400 font-mono">AI-powered psychological support</p>
                                </div>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
                        </div>

                        <div className="space-y-3 h-[68vh] overflow-y-auto pr-1">
                            {chatMessages.map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-3 rounded-2xl text-xs max-w-[85%] ${m.sender === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'}`}>
                                        {m.text}
                                        {m.sender === 'ai' && m.mood && (
                                            <div className="mt-2 flex gap-1.5 flex-wrap">
                                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                                                    🧠 {m.mood}
                                                </span>
                                                {m.sentiment && (
                                                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${m.sentiment === 'positive' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                                                            m.sentiment === 'negative' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                                                                'bg-slate-800 text-slate-400 border-slate-700'
                                                        }`}>
                                                        {m.sentiment}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[9px] text-slate-500 mt-1 font-mono">{m.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSendChatMessage} className="pt-3 border-t border-slate-800 flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Talk to ABIMANYU AI..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                        <button type="submit" className="p-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs transition-colors">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* VOICE CALL MODAL */}
            {activeCallConsultation && (
                <VoiceCallModal
                    consultation={activeCallConsultation}
                    currentUser={user}
                    onClose={() => setActiveCallConsultation(null)}
                    onCallEnded={(duration) => {
                        setActiveCallConsultation(null);
                        fetchDashboardData();
                    }}
                />
            )}

            {/* SELECT PSYCHOLOGIST MODAL */}
            {isSelectModalOpen && (
                <PsychologistSelectModal
                    currentUser={user}
                    onClose={() => setIsSelectModalOpen(false)}
                    onRequestSent={(newConsultation) => {
                        setIsSelectModalOpen(false);
                        fetchDashboardData();
                    }}
                />
            )}

            {/* CONSULTATION HISTORY MODAL */}
            {isHistoryModalOpen && (
                <CallHistoryModal
                    consultations={userConsultations}
                    currentUser={user}
                    onClose={() => setIsHistoryModalOpen(false)}
                />
            )}

        </div>
    );
};
