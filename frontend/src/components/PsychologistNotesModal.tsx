import React, { useState } from 'react';
import { FileText, Calendar, CheckSquare, X, Shield, Save, AlertCircle } from 'lucide-react';
import { Consultation, User } from '../types';
import { getAuthHeader } from '../auth';

interface PsychologistNotesModalProps {
    consultation: Consultation;
    currentUser: User;
    onClose: () => void;
    onSaved: () => void;
}

export const PsychologistNotesModal: React.FC<PsychologistNotesModalProps> = ({
    consultation,
    currentUser,
    onClose,
    onSaved
}) => {
    const existingNotes = consultation.notes?.notes || consultation.doctorNotes || '';
    const existingFollowUp = consultation.notes?.followUpRequired || false;
    const existingDate = consultation.notes?.followUpDate || '';

    const [notes, setNotes] = useState(existingNotes);
    const [followUpRequired, setFollowUpRequired] = useState(existingFollowUp);
    const [followUpDate, setFollowUpDate] = useState(existingDate);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/consultations/${consultation.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    notes,
                    followUpRequired,
                    followUpDate: followUpRequired ? followUpDate : null
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                onSaved();
            } else {
                setError(data.error || 'Failed to save clinical notes.');
            }
        } catch (err) {
            console.error('Failed to save notes:', err);
            setError('Network error saving notes.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-slate-950/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-950 border border-purple-800 text-purple-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-100">Professional Clinical Notes</h3>
                            <p className="text-xs text-slate-400">Add assessment notes for Officer {consultation.userName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Patient Context Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
                        <img
                            src={consultation.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={consultation.userName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                            <h4 className="text-xs font-semibold text-slate-200">{consultation.userName || 'Officer John Vance'}</h4>
                            <p className="text-[11px] text-slate-400">{consultation.userTitle || 'Senior Cyber Defense Officer'}</p>
                        </div>
                    </div>

                    {/* Clinical Notes Field */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Confidential Assessment & Notes
                        </label>
                        <textarea
                            rows={5}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            required
                            placeholder="Enter professional clinical evaluation, sleep recommendations, coping strategies, and follow-up directives..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition resize-none"
                        />
                    </div>

                    {/* Follow-up Section */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-200">
                            <input
                                type="checkbox"
                                checked={followUpRequired}
                                onChange={(e) => setFollowUpRequired(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Follow-up Consultation Required</span>
                        </label>

                        {followUpRequired && (
                            <div className="pt-2 animate-in fade-in duration-150">
                                <label className="block text-[11px] text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Scheduled Follow-up Date</span>
                                </label>
                                <input
                                    type="date"
                                    value={followUpDate}
                                    onChange={(e) => setFollowUpDate(e.target.value)}
                                    required={followUpRequired}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Security Disclaimer */}
                    <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-200/90 flex items-start gap-2">
                        <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                            <strong>Confidential Medical Record:</strong> Notes are protected under CHIDAMBARANAR AI Doctor-Patient privacy layer and are strictly isolated from company administrators.
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
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-purple-950 transition flex items-center gap-2"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{submitting ? 'Saving Notes...' : 'Save Professional Notes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
