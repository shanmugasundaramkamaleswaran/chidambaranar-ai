import React from 'react';
import { X, Building2, UserCheck, Stethoscope, ArrowRight, ShieldCheck } from 'lucide-react';

interface PortalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPortal: (portal: 'user' | 'doctor' | 'company') => void;
    onQuickLogin: (userId: string, role: 'company' | 'user' | 'doctor') => void;
}

export const PortalModal: React.FC<PortalModalProps> = ({
    isOpen,
    onClose,
    onSelectPortal,
    onQuickLogin
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#0b1324] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 lg:p-8 shadow-2xl relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono mb-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        SECURE SENTINEL AUTHENTICATION
                    </div>
                    <h2 className="text-2xl font-black text-white">Select Your Access Portal</h2>
                    <p className="text-xs text-slate-400 mt-1">Role-based authentication gateway separating employee, doctor, and enterprise admin roles.</p>
                </div>

                {/* Three Portals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

                    {/* Company Portal */}
                    <div
                        onClick={() => { onSelectPortal('company'); onClose(); }}
                        className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 hover:bg-amber-950/20 cursor-pointer transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-700/60 flex items-center justify-center mb-3 text-amber-400">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">Company Portal</h3>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                                Organization admins, aggregated trend analytics, department risk heatmaps.
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-400 font-medium">
                            <span>Enter Portal</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* User / Officer Portal */}
                    <div
                        onClick={() => { onSelectPortal('user'); onClose(); }}
                        className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 hover:bg-cyan-950/20 cursor-pointer transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center mb-3 text-cyan-400">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">Officer Portal</h3>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                                Private user dashboard, check-ins, stress trends, AI assistant & doctor requests.
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-medium">
                            <span>Enter Portal</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Doctor Portal */}
                    <div
                        onClick={() => { onSelectPortal('doctor'); onClose(); }}
                        className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 hover:bg-emerald-950/20 cursor-pointer transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center mb-3 text-emerald-400">
                                <Stethoscope className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">Doctor Portal</h3>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                                Clinical medical portal, assigned patient longitudinal data, consultation queue.
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-medium">
                            <span>Enter Portal</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                </div>

                {/* Single Click Quick-Logins for Demo Evaluation */}
                <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
                    <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2.5 font-semibold text-center">
                        ⚡ Quick Demo Instant Logins
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button
                            onClick={() => { onQuickLogin('usr_1', 'user'); onClose(); }}
                            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-orange-900/50 text-left transition-colors"
                        >
                            <p className="text-xs font-bold text-slate-200">John Vance</p>
                            <p className="text-[10px] text-orange-400 font-mono mt-0.5">Officer (High Risk)</p>
                        </button>

                        <button
                            onClick={() => { onQuickLogin('usr_2', 'user'); onClose(); }}
                            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-900/50 text-left transition-colors"
                        >
                            <p className="text-xs font-bold text-slate-200">Maya Lin</p>
                            <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Officer (Stable)</p>
                        </button>

                        <button
                            onClick={() => { onQuickLogin('usr_doc1', 'doctor'); onClose(); }}
                            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-purple-900/50 text-left transition-colors"
                        >
                            <p className="text-xs font-bold text-slate-200">Dr. S. Connor</p>
                            <p className="text-[10px] text-purple-400 font-mono mt-0.5">Behavioral Doctor</p>
                        </button>

                        <button
                            onClick={() => { onQuickLogin('usr_3', 'company'); onClose(); }}
                            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-900/50 text-left transition-colors"
                        >
                            <p className="text-xs font-bold text-slate-200">Cmdr. Mercer</p>
                            <p className="text-[10px] text-amber-400 font-mono mt-0.5">Company Admin</p>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
