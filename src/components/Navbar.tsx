import React from 'react';
import { Shield, UserCheck, Building2, Stethoscope, LogOut, ChevronDown, Activity, Sparkles } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
    activeTab: 'landing' | 'login' | 'user' | 'doctor' | 'company';
    setActiveTab: (tab: 'landing' | 'login' | 'user' | 'doctor' | 'company') => void;
    currentUser: User | null;
    isAuthenticated: boolean;
    onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
    activeTab,
    setActiveTab,
    currentUser,
    isAuthenticated,
    onLogout
}) => {
    return (
        <header className="sticky top-0 z-40 bg-[#080d1a]/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 transition-all">
            <div className="max-w-7xl mx-auto flex items-center justify-between">

                {/* Brand Logo */}
                <div
                    onClick={() => setActiveTab(isAuthenticated ? activeTab : 'landing')}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                        <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                            <Shield className="w-5 h-5 text-cyan-400" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xl tracking-wider text-white">
                                SENTINEL
                            </span>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                                v1.0 DEFENSE
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                            AI Well-being & Early Warning System
                        </p>
                    </div>
                </div>

                {/* Center Portal Nav Tabs */}
                <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                    {!isAuthenticated ? (
                        <>
                            <button
                                onClick={() => setActiveTab('landing')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'landing' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('login')}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'login' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-400 hover:bg-cyan-950'
                                    }`}
                            >
                                Sign In Portals
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setActiveTab('user')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'user' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                                Officer Portal
                            </button>
                            <button
                                onClick={() => setActiveTab('doctor')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'doctor' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                                Doctor Portal
                            </button>
                            <button
                                onClick={() => setActiveTab('company')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'company' ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                                Organization Portal
                            </button>
                        </>
                    )}
                </nav>

                {/* Right Tools / Auth Action */}
                <div className="flex items-center gap-3">
                    {!isAuthenticated ? (
                        <button
                            onClick={() => setActiveTab('login')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 text-white font-bold text-xs shadow-md border border-cyan-400/30 transition-all"
                        >
                            Sign In to Portal
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            {/* User Profile Badge */}
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                                {currentUser?.avatar ? (
                                    <img src={currentUser.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-cyan-500/50" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-cyan-900 text-cyan-300 text-[10px] font-bold flex items-center justify-center">
                                        {currentUser?.name.charAt(0)}
                                    </div>
                                )}
                                <div className="hidden sm:block text-left text-xs">
                                    <p className="font-bold text-white leading-tight">{currentUser?.name}</p>
                                    <span className="text-[9px] font-mono text-cyan-400">
                                        {currentUser?.role === 'user_employee' ? 'OFFICER' : currentUser?.role === 'doctor' ? 'DOCTOR' : 'ORG ADMIN'}
                                    </span>
                                </div>
                            </div>

                            {/* Logout / Switch Account Button */}
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-rose-400 text-xs font-bold transition-colors"
                                title="Sign Out / Switch Portal"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
};
