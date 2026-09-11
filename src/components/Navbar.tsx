import React from 'react';
import { Shield, LogOut, UserCheck, Building2, Stethoscope } from 'lucide-react';
import { ROLES, RBACRole, AuthUser } from '../auth';

interface NavbarProps {
    currentUser: AuthUser | null;
    isAuthenticated: boolean;
    userRole: RBACRole | null;
    onLogout: () => void;
}

const ROLE_CONFIG: Record<RBACRole, { label: string; shortLabel: string; icon: React.ReactNode; badge: string; accent: string }> = {
    [ROLES.ORGANIZATION_OFFICER]: {
        label: 'Organization Officer Portal',
        shortLabel: 'ORG OFFICER',
        icon: <Building2 className="w-3.5 h-3.5 text-amber-400" />,
        badge: 'bg-amber-950 text-amber-300 border border-amber-700',
        accent: 'text-amber-400',
    },
    [ROLES.USER]: {
        label: 'Employee Portal',
        shortLabel: 'EMPLOYEE',
        icon: <UserCheck className="w-3.5 h-3.5 text-cyan-400" />,
        badge: 'bg-cyan-950 text-cyan-300 border border-cyan-700',
        accent: 'text-cyan-400',
    },
    [ROLES.PSYCHOLOGIST]: {
        label: 'Psychologist Portal',
        shortLabel: 'PSYCHOLOGIST',
        icon: <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />,
        badge: 'bg-emerald-950 text-emerald-300 border border-emerald-700',
        accent: 'text-emerald-400',
    },
};

export const Navbar: React.FC<NavbarProps> = ({
    currentUser,
    isAuthenticated,
    userRole,
    onLogout,
}) => {
    const roleInfo = userRole ? ROLE_CONFIG[userRole] : null;

    return (
        <header className="sticky top-0 z-40 bg-[#080d1a]/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 transition-all">
            <div className="max-w-7xl mx-auto flex items-center justify-between">

                {/* Brand Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20">
                        <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                            <Shield className="w-5 h-5 text-cyan-400" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xl tracking-wider text-white">
                                CHIDAMBARANAR AI
                            </span>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                                v1.0 DEFENSE
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                            {roleInfo ? roleInfo.label : 'AI Well-being & Early Warning System'}
                        </p>
                    </div>
                </div>

                {/* Right: User info + Logout */}
                <div className="flex items-center gap-3">
                    {isAuthenticated && roleInfo && currentUser ? (
                        <>
                            {/* Role badge */}
                            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider ${roleInfo.badge}`}>
                                {roleInfo.icon}
                                {roleInfo.shortLabel}
                            </div>

                            {/* User avatar + name */}
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                                {currentUser.avatar ? (
                                    <img src={currentUser.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-600/50" />
                                ) : (
                                    <div className={`w-6 h-6 rounded-full bg-slate-800 ${roleInfo.accent} text-[10px] font-bold flex items-center justify-center`}>
                                        {currentUser.name?.charAt(0) || '?'}
                                    </div>
                                )}
                                <div className="hidden sm:block text-left text-xs">
                                    <p className="font-bold text-white leading-tight">{currentUser.name}</p>
                                    <span className={`text-[9px] font-mono ${roleInfo.accent}`}>
                                        {currentUser.title || roleInfo.shortLabel}
                                    </span>
                                </div>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-rose-400 text-xs font-bold transition-colors"
                                title="Sign Out"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </>
                    ) : (
                        <div className="text-xs text-slate-500 font-mono">
                            Select your portal to sign in
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
