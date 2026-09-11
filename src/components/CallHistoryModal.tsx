import React from 'react';
import { History, Calendar, Clock, CheckCircle, AlertCircle, X, Shield, FileText, UserCheck, Stethoscope } from 'lucide-react';
import { Consultation, User } from '../types';

interface CallHistoryModalProps {
    consultations: Consultation[];
    currentUser: User;
    onClose: () => void;
    onViewNotes?: (consultation: Consultation) => void;
}

export const CallHistoryModal: React.FC<CallHistoryModalProps> = ({
    consultations,
    currentUser,
    onClose,
    onViewNotes
}) => {
    const isDoctor = currentUser.role === 'doctor';

    const formatDuration = (seconds?: number | string | null) => {
        if (!seconds) return 'N/A';
        const numSec = Number(seconds);
        if (isNaN(numSec)) return String(seconds);
        const mins = Math.floor(numSec / 60);
        const secs = numSec % 60;
        return `${mins} min ${secs} sec`;
    };

    const formatDate = (isoStr?: string) => {
        if (!isoStr) return 'Recent';
        try {
            return new Date(isoStr).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return isoStr;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="bg-slate-950/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-100">Voice Consultation History</h3>
                            <p className="text-xs text-slate-400">
                                {isDoctor ? 'Past clinical voice sessions & notes' : 'Your private psychologist consultation records'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {consultations.length === 0 ? (
                        <div className="py-12 text-center">
                            <Stethoscope className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm font-medium">No voice consultations recorded yet.</p>
                            <p className="text-slate-500 text-xs mt-1">Completed voice sessions will appear here with duration and notes.</p>
                        </div>
                    ) : (
                        consultations.map((item) => {
                            const partnerName = isDoctor ? item.userName || 'Officer John Vance' : item.doctorName || 'Dr. Sarah Connor, MD';
                            const partnerTitle = isDoctor ? item.userTitle || 'Officer' : item.doctorTitle || 'Chief Occupational Psychiatrist';
                            const partnerAvatar = isDoctor
                                ? (item.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')
                                : (item.doctorAvatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80');

                            const isCompleted = item.status === 'COMPLETED';

                            return (
                                <div
                                    key={item.id}
                                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4 hover:border-slate-700/80 transition"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3.5">
                                            <img
                                                src={partnerAvatar}
                                                alt={partnerName}
                                                className="w-12 h-12 rounded-full object-cover border border-slate-700"
                                            />
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-100">{partnerName}</h4>
                                                <p className="text-xs text-slate-400">{partnerTitle}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{formatDate(item.created_at || item.requested_at || item.requestDate)}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${isCompleted
                                                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                                    : item.status === 'ACCEPTED' || item.status === 'IN_PROGRESS'
                                                        ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800'
                                                        : item.status === 'REQUESTED'
                                                            ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                                                            : 'bg-red-950/80 text-red-400 border-red-800'
                                                }`}>
                                                {item.status}
                                            </span>
                                            {item.duration && (
                                                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-emerald-400" />
                                                    <span>{formatDuration(item.duration)}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div className="text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 text-slate-300">
                                        <span className="font-semibold text-slate-400">Reason: </span>
                                        {item.reason}
                                    </div>

                                    {/* Follow Up & Notes */}
                                    {(item.doctorNotes || item.notes?.notes || item.followUpAction) && (
                                        <div className="text-xs bg-purple-950/20 p-3 rounded-xl border border-purple-900/40 text-purple-200/90 space-y-1">
                                            <p className="font-semibold text-purple-300 flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-purple-400" />
                                                <span>Psychologist Recommendations & Follow-up:</span>
                                            </p>
                                            <p className="text-slate-300 italic">
                                                {item.notes?.notes || item.doctorNotes || 'No notes entered.'}
                                            </p>
                                            {item.notes?.followUpRequired && (
                                                <p className="text-emerald-400 font-medium text-[11px] pt-1">
                                                    📅 Follow-up appointment scheduled: {item.notes.followUpDate || 'TBD'}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {isDoctor && onViewNotes && (
                                        <div className="flex justify-end pt-1">
                                            <button
                                                onClick={() => onViewNotes(item)}
                                                className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-300 text-xs font-semibold transition flex items-center gap-1.5"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>{item.notes ? 'Edit Clinical Notes' : 'Add Clinical Notes'}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Security Notice */}
                <div className="bg-slate-950/90 px-6 py-3 border-t border-slate-800 text-center text-xs text-slate-500">
                    🔒 Audio recordings are not saved. History contains only metadata and authorized notes.
                </div>
            </div>
        </div>
    );
};
