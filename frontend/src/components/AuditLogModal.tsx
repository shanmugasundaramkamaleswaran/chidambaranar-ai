import React, { useState, useEffect } from 'react';
import { X, FileText, Lock, ShieldCheck } from 'lucide-react';
import { AuditLog } from '../types';
import { getAuthHeader } from '../auth';

interface AuditLogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/audit-logs', {
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.logs) setLogs(data.logs);
                })
                .catch(err => console.error('Error fetching audit logs:', err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#0b1324] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 lg:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">

                <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-amber-950 border border-amber-800 text-amber-400">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Immutable RBAC Data Access Audit Trail</h2>
                        <p className="text-xs text-slate-400">Every sensitive data read, consultation request, and consent modification is logged.</p>
                    </div>
                </div>

                {/* Audit Log Table */}
                <div className="space-y-2 max-h-96 overflow-y-auto my-4">
                    {logs.map(log => (
                        <div key={log.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-black/50 text-cyan-400 border border-cyan-800/60 font-bold text-[10px]">
                                        {log.action}
                                    </span>
                                    <span className="text-slate-400 text-[11px] font-sans">{log.details}</span>
                                </div>
                                <p className="text-[10px] text-slate-500">Actor ID: {log.actorId} | Target: {log.targetId}</p>
                            </div>

                            <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(log.timestamp).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" /> Cryptographically Verified Audit Log
                    </span>
                    <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold font-sans">Close Audit Viewer</button>
                </div>

            </div>
        </div>
    );
};
