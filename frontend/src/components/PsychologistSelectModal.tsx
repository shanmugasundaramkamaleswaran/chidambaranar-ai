import React, { useEffect, useState } from 'react';
import { Stethoscope, CheckCircle2, AlertCircle, Send, X, Shield, Clock, UserCheck } from 'lucide-react';
import { Psychologist, User } from '../types';
import { getAuthHeader } from '../auth';

interface PsychologistSelectModalProps {
    currentUser: User;
    onClose: () => void;
    onRequestSent: (consultation: any) => void;
}

export const PsychologistSelectModal: React.FC<PsychologistSelectModalProps> = ({
    currentUser,
    onClose,
    onRequestSent
}) => {
    const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string>('');
    const [reason, setReason] = useState<string>('Persistent operational fatigue, sleep pattern disruption, and acute workload stress.');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPsychologists = async () => {
            try {
                const res = await fetch('/api/psychologists', {
                    headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPsychologists(data.psychologists || []);
                    const available = (data.psychologists || []).find((p: Psychologist) => p.availabilityStatus === 'AVAILABLE');
                    if (available) setSelectedDocId(available.id);
                    else if (data.psychologists?.length > 0) setSelectedDocId(data.psychologists[0].id);
                }
            } catch (err) {
                console.error('Failed to load psychologists:', err);
                setError('Failed to load available psychologists.');
            } finally {
                setLoading(false);
            }
        };
        fetchPsychologists();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDocId) {
            setError('Please select a psychologist.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/consultations/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    doctorId: selectedDocId,
                    reason,
                    consultationType: 'audio'
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                onRequestSent(data.consultation);
            } else {
                setError(data.error || 'Failed to submit consultation request.');
            }
        } catch (err) {
            console.error('Failed to send consultation request:', err);
            setError('Network error submitting consultation request.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-slate-950/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                            <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-100">Talk to a Psychologist</h3>
                            <p className="text-xs text-slate-400">Request a confidential, real-time voice-only consultation</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Available Psychologists List */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                            Select Available Psychologist
                        </label>
                        {loading ? (
                            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                                Loading authorized medical staff...
                            </div>
                        ) : psychologists.length === 0 ? (
                            <div className="p-4 rounded-xl bg-slate-800/50 text-slate-400 text-xs text-center">
                                No psychologists currently listed.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {psychologists.map((psych) => {
                                    const isAvailable = psych.availabilityStatus === 'AVAILABLE';
                                    const isSelected = selectedDocId === psych.id;
                                    return (
                                        <div
                                            key={psych.id}
                                            onClick={() => isAvailable && setSelectedDocId(psych.id)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${!isAvailable
                                                ? 'opacity-50 cursor-not-allowed bg-slate-900/50 border-slate-800/60'
                                                : isSelected
                                                    ? 'bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                                    : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800/80'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <img
                                                    src={psych.avatar}
                                                    alt={psych.name}
                                                    className="w-12 h-12 rounded-full object-cover border border-slate-700"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-semibold text-slate-100">{psych.name}</h4>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isAvailable
                                                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                                            : psych.availabilityStatus === 'BUSY'
                                                                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                                                                : 'bg-slate-800 text-slate-400 border-slate-700'
                                                            }`}>
                                                            {psych.availabilityStatus}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-0.5">{psych.title}</p>
                                                    <p className="text-[11px] text-cyan-400/90 font-mono mt-1">Specialty: {psych.specialty}</p>
                                                </div>
                                            </div>

                                            {isSelected && isAvailable && (
                                                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Consultation Reason Field */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Reason for Consultation
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            placeholder="Describe your current fatigue, stress, sleep issues, or operational workload concerns..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition resize-none"
                        />
                    </div>

                    {/* Security & Confidentiality Banner */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold text-slate-300">Strict Confidentiality Policy:</span> Your company administrator cannot access this consultation, audio stream, or doctor notes. AI stress models do not record or analyze audio.
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !selectedDocId}
                            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-cyan-950 transition flex items-center gap-2"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>{submitting ? 'Sending Request...' : 'Send Consultation Request'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
