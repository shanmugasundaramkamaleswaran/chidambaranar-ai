import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { User, Consultation, WellbeingCheckin, RiskEvaluation, Organization } from '../types';
import { Stethoscope, UserCheck, AlertTriangle, Calendar, Clock, CheckCircle2, FileText, Lock, ChevronRight, ShieldCheck, UserX, MessageSquare, Plus, Building2, PhoneCall, Mic, History, XCircle, Volume2, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { VoiceCallModal } from './VoiceCallModal';
import { PsychologistNotesModal } from './PsychologistNotesModal';
import { CallHistoryModal } from './CallHistoryModal';
import { getAuthHeader } from '../auth';

interface DoctorDashboardProps {
    doctor: User;
    organization?: Organization | null;
}

interface PatientDetail {
    id: string;
    name: string;
    title: string;
    avatar: string;
    latestCheckin: WellbeingCheckin;
    riskEval: RiskEvaluation;
    consentAuthorized: boolean;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ doctor, organization }) => {
    const [patients, setPatients] = useState<PatientDetail[]>([]);
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedPatientDetails, setSelectedPatientDetails] = useState<any>(null);

    // Doctor Availability & WebRTC Call Modal States
    const [availabilityStatus, setAvailabilityStatus] = useState<'AVAILABLE' | 'BUSY' | 'OFFLINE'>(
        (doctor as any).availabilityStatus || 'AVAILABLE'
    );
    const [activeCallConsultation, setActiveCallConsultation] = useState<Consultation | null>(null);
    const [activeNotesConsultation, setActiveNotesConsultation] = useState<Consultation | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [incomingCallRequest, setIncomingCallRequest] = useState<any | null>(null);

    // AI Report State
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [generatedReport, setGeneratedReport] = useState<any | null>(null);

    const handleGenerateReport = async (patientId: string) => {
        setIsGeneratingReport(true);
        setGeneratedReport(null);
        try {
            const res = await fetch('/api/doctor/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    patientId,
                    apiKey: 'AQ.Ab8RN6ICsngn6sM7h2F3MLYx76T6uHAti2EeifVdieiz5mYCTw'
                })
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedReport(data.report);
            }
        } catch (err) {
            console.error('Error generating report:', err);
        } finally {
            setIsGeneratingReport(false);
        }
    };

    // Fetch Doctor Portal data from API
    const fetchDoctorData = async () => {
        try {
            const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
            const [patRes, consRes] = await Promise.all([
                fetch('/api/doctor/users', { headers }),
                fetch('/api/consultations/psychologist', { headers })
            ]);

            const patData = await patRes.json();
            if (patData.patients) setPatients(patData.patients);

            if (consRes.ok) {
                const consData = await consRes.json();
                setConsultations(consData.consultations || []);
            }
        } catch (err) {
            console.error('Error fetching doctor dashboard data:', err);
        }
    };

    useEffect(() => {
        fetchDoctorData();

        // Socket.IO registration for incoming request notifications
        const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
            socket.emit('user:register', { userId: doctor.id });
        });

        socket.on('consultation:request', (data) => {
            setIncomingCallRequest(data);
            fetchDoctorData();
        });

        return () => {
            socket.disconnect();
        };
    }, [doctor.id]);

    // Handle updating availability status
    const handleAvailabilityChange = async (newStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE') => {
        setAvailabilityStatus(newStatus);
        try {
            await fetch('/api/psychologists/availability', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ availabilityStatus: newStatus })
            });
        } catch (err) {
            console.error('Failed to update availability:', err);
        }
    };

    // Inspect Patient Clinical Profile
    const handleInspectPatient = async (patientId: string) => {
        setSelectedPatientId(patientId);
        try {
            const res = await fetch(`/api/doctor/users/${patientId}`, {
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
            });
            const data = await res.json();
            setSelectedPatientDetails(data);
        } catch (err) {
            console.error('Error fetching patient profile:', err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

            {/* DOCTOR HEADER BANNER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <div className="flex items-center gap-4">
                    {doctor.avatar ? (
                        <img src={doctor.avatar} alt={doctor.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md" />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-xl font-bold text-emerald-300">
                            {doctor.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl lg:text-2xl font-black text-white">{doctor.name}</h1>
                            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                                DOCTOR CLINICAL PORTAL
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{doctor.title} • License: {doctor.licenseNumber || 'MD-883921-TACTICAL'}</p>
                        {organization && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-mono">
                                <Building2 className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300 font-bold">{organization.name}</span>
                                <span className="text-slate-500">·</span>
                                <span className="text-slate-400">{organization.id} / {organization.code}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Availability Selector */}
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                        {(['AVAILABLE', 'BUSY', 'OFFLINE'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => handleAvailabilityChange(status)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${availabilityStatus === status
                                    ? status === 'AVAILABLE' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950' :
                                        status === 'BUSY' ? 'bg-amber-600 text-white shadow-md shadow-amber-950' : 'bg-slate-700 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-slate-700 transition"
                    >
                        <History className="w-4 h-4 text-emerald-400" />
                        <span>Call History</span>
                    </button>
                </div>
            </div>

            {/* INCOMING CONSULTATION REQUEST REAL-TIME NOTIFICATION */}
            {incomingCallRequest && (
                <div className="p-5 rounded-3xl bg-amber-950/90 border border-amber-500/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-bold animate-bounce">
                            <PhoneCall className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">Incoming Audio Consultation</h4>
                            <p className="text-xs text-amber-200 mt-0.5">
                                Officer {incomingCallRequest.userName} requested a confidential audio consultation.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                            onClick={() => setIncomingCallRequest(null)}
                            className="px-3 py-2 rounded-xl bg-amber-900/60 hover:bg-amber-900 text-amber-300 text-xs font-semibold"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await fetch(`/api/consultations/${incomingCallRequest.consultationId}/accept`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                                        body: JSON.stringify({})
                                    });
                                    setIncomingCallRequest(null);
                                    fetchDoctorData();
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950 flex items-center gap-2"
                        >
                            <PhoneCall className="w-4 h-4" />
                            <span>Accept Call</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ASSIGNED PATIENTS ROSTER & CONSULTATION QUEUE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Assigned Patients Roster (Left 2 Cols) */}
                <div className="lg:col-span-2 p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white">Assigned Personnel & Officers Roster</h2>
                            <p className="text-xs text-slate-400">Monitoring real-time baseline shifts for assigned officers.</p>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-800">
                            {patients.length} ASSIGNED OFFICERS
                        </span>
                    </div>

                    <div className="space-y-3 mt-4">
                        {patients.map(p => {
                            const riskLevel = p.riskEval?.level || 'GREEN';
                            let badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                            if (riskLevel === 'YELLOW') badgeColor = 'bg-amber-950 text-amber-300 border-amber-800';
                            if (riskLevel === 'ORANGE') badgeColor = 'bg-orange-950 text-orange-300 border-orange-800';
                            if (riskLevel === 'RED') badgeColor = 'bg-rose-950 text-rose-300 border-rose-800 pulse-red';

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => handleInspectPatient(p.id)}
                                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <img src={p.avatar} alt={p.name} className="w-11 h-11 rounded-xl object-cover border border-slate-700" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">{p.name}</h3>
                                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                                                    {riskLevel} RISK ({p.riskEval?.score || 30}/100)
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">{p.title}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right text-xs">
                                            <p className="text-slate-300 font-mono">Sleep: <span className="text-sky-400 font-bold">{p.latestCheckin?.sleepHours || 7}h</span></p>
                                            <p className="text-slate-400 text-[11px]">Stress: {p.latestCheckin?.stressLevel || 3}/10</p>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                                            <span>Clinical Detail</span>
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Consultation Requests Queue (Right Col) */}
                <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white">Consultation Queue</h2>
                            <p className="text-xs text-slate-400">Real-time voice session requests.</p>
                        </div>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {consultations.length} ACTIVE
                        </span>
                    </div>

                    <div className="space-y-3">
                        {consultations.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-6">No active consultation requests.</p>
                        ) : (
                            consultations.map(c => (
                                <div key={c.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-xs">{c.userName || 'Officer'}</span>
                                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${c.status === 'ACCEPTED' || c.status === 'IN_PROGRESS'
                                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                            : c.status === 'REQUESTED'
                                                ? 'bg-amber-950 text-amber-400 border-amber-800'
                                                : 'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 italic">"{c.reason}"</p>

                                    <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                                        {c.status === 'REQUESTED' && (
                                            <>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await fetch(`/api/consultations/${c.id}/accept`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                                                                body: JSON.stringify({ doctorId: doctor.id, consultationType: 'audio' })
                                                            });
                                                            fetchDoctorData();
                                                        } catch (e) { console.error(e); }
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                                                >
                                                    Accept Call
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await fetch(`/api/consultations/${c.id}/reject`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                                                                body: JSON.stringify({ doctorId: doctor.id, reason: 'Rejected by psychologist' })
                                                            });
                                                            fetchDoctorData();
                                                        } catch (e) { console.error(e); }
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
                                                >
                                                    Reject Call
                                                </button>
                                            </>
                                        )}

                                        {(c.status === 'ACCEPTED' || c.status === 'IN_PROGRESS') && (
                                            <button
                                                onClick={() => setActiveCallConsultation(c)}
                                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-950 flex items-center gap-1.5"
                                            >
                                                <PhoneCall className="w-3.5 h-3.5" />
                                                <span>Join Voice Room</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setActiveNotesConsultation(c)}
                                            className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-300 text-xs font-semibold flex items-center gap-1"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>{c.notes ? 'Edit Notes' : 'Notes'}</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* PATIENT CLINICAL INSPECTOR DRAWER / MODAL */}
            {selectedPatientId && selectedPatientDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0b1324] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 lg:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">

                        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <img src={selectedPatientDetails.user.avatar} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
                                <div>
                                    <h3 className="text-lg font-bold text-white">{selectedPatientDetails.user.name}</h3>
                                    <p className="text-xs text-slate-400">{selectedPatientDetails.user.title}</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedPatientId(null); setGeneratedReport(null); }} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
                        </div>

                        {/* Consent Authorization Badge */}
                        <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${selectedPatientDetails.isAuthorized
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950/40 text-rose-300 border-rose-800'
                            }`}>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <span><strong>User Data Consent Status:</strong> {selectedPatientDetails.isAuthorized ? 'Authorized for Detailed Clinical View' : 'Restricted by User'}</span>
                            </div>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">HIPAA / DEFENSE PRIVACY SECURE</span>
                        </div>

                        {/* Longitudinal Trend Chart for Doctor */}
                        <div>
                            <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">14-Day Stress & Sleep Longitudinal Curve</h4>
                            <div className="h-56 w-full bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={selectedPatientDetails.checkins}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                                        <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                                        <Area type="monotone" dataKey="score" name="Stress Index" stroke="#0284c7" fill="#0284c7" fillOpacity={0.2} />
                                        <Area type="monotone" dataKey="sleepHours" name="Sleep (Hours)" stroke="#38bdf8" fill="none" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Check-in Logs & Confidential Journal */}
                        <div>
                            <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">Recent Self-Reported Check-Ins</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {selectedPatientDetails.checkins.slice(-5).map((chk: WellbeingCheckin) => (
                                    <div key={chk.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex justify-between gap-4">
                                        <div>
                                            <span className="font-mono text-cyan-400">{chk.date}</span>: Stress {chk.stressLevel}/10 | Fatigue {chk.fatigue}/10 | Sleep {chk.sleepHours}h
                                            <p className="text-[11px] text-slate-300 italic mt-1 font-sans">"{chk.journal || 'No journal text logged.'}"</p>
                                        </div>
                                        <span className="font-mono font-bold text-orange-400 shrink-0">Score: {chk.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Gemini Clinical Report Section */}
                        <div className="pt-4 border-t border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                    AI Structured Clinical Report
                                </h4>
                                <button
                                    onClick={() => handleGenerateReport(selectedPatientDetails.user.id)}
                                    disabled={isGeneratingReport}
                                    className="px-4 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs font-bold border border-purple-500/30 transition-all flex items-center gap-1.5"
                                >
                                    {isGeneratingReport ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                                            Generating...
                                        </>
                                    ) : (
                                        <>Generate Gemini Report</>
                                    )}
                                </button>
                            </div>

                            {generatedReport && (
                                <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-4 text-xs space-y-4">
                                    <div>
                                        <span className="text-purple-400 font-bold uppercase tracking-wider text-[10px]">Executive Summary</span>
                                        <p className="text-slate-300 mt-1">{generatedReport.executiveSummary}</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-purple-400 font-bold uppercase tracking-wider text-[10px]">Physiological Status</span>
                                            <p className="text-slate-300 mt-1">{generatedReport.physiologicalStatus}</p>
                                        </div>
                                        <div>
                                            <span className="text-purple-400 font-bold uppercase tracking-wider text-[10px]">Baseline Deviation Analysis</span>
                                            <p className="text-slate-300 mt-1">{generatedReport.baselineDeviationAnalysis}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-purple-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Recommended Clinical Directives</span>
                                        <ul className="list-disc pl-4 text-slate-300 space-y-1">
                                            {generatedReport.recommendedClinicalDirectives.map((directive: string, idx: number) => (
                                                <li key={idx}>{directive}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] text-slate-400 flex items-start gap-2">
                                        <Lock className="w-3 h-3 shrink-0 text-slate-500" />
                                        <span>{generatedReport.confidentialityNotice}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex justify-end">
                            <button onClick={() => { setSelectedPatientId(null); setGeneratedReport(null); }} className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs">Close Inspector</button>
                        </div>

                    </div>
                </div>
            )}

            {/* VOICE CALL MODAL */}
            {activeCallConsultation && (
                <VoiceCallModal
                    consultation={activeCallConsultation}
                    currentUser={doctor}
                    onClose={() => setActiveCallConsultation(null)}
                    onCallEnded={(duration) => {
                        setActiveCallConsultation(null);
                        fetchDoctorData();
                    }}
                />
            )}

            {/* PSYCHOLOGIST CLINICAL NOTES MODAL */}
            {activeNotesConsultation && (
                <PsychologistNotesModal
                    consultation={activeNotesConsultation}
                    currentUser={doctor}
                    onClose={() => setActiveNotesConsultation(null)}
                    onSaved={() => {
                        setActiveNotesConsultation(null);
                        fetchDoctorData();
                    }}
                />
            )}

            {/* CONSULTATION HISTORY MODAL */}
            {isHistoryModalOpen && (
                <CallHistoryModal
                    consultations={consultations}
                    currentUser={doctor}
                    onClose={() => setIsHistoryModalOpen(false)}
                />
            )}

        </div>
    );
};
