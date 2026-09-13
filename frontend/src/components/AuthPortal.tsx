import React, { useState, useEffect } from 'react';
import {
    Shield, Building2, UserCheck, Stethoscope, ArrowRight, Eye, EyeOff,
    AlertCircle, CheckCircle, Hash, Lock, Mail, Fingerprint, ChevronRight
} from 'lucide-react';
import { ROLES, RBACRole, AuthUser, AuthOrganization, saveSession } from '../auth';

interface PortalLoginProps {
    portal: RBACRole;
    onLoginSuccess: (user: AuthUser, role: RBACRole, organization: AuthOrganization, token: string) => void;
    onBack: () => void;
}

const PORTAL_CONFIG = {
    [ROLES.ORGANIZATION_OFFICER]: {
        label: 'Organization Officer',
        sublabel: 'Enterprise Administration Portal',
        icon: Building2,
        color: 'amber',
        gradient: 'from-amber-600 to-orange-500',
        bar: 'from-amber-500 via-orange-400 to-amber-600',
        accent: 'text-amber-400',
        border: 'border-amber-500',
        badge: 'bg-amber-950 text-amber-300 border border-amber-700',
        btn: 'from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 border-amber-400/40',
        glow: 'shadow-amber-950/60',
        endpoint: '/api/auth/organization/login',
        requiresOrg: false,
        hasSignup: false,
        demoNote: 'Organization Officers have fixed accounts. Contact your IT administrator.',
    },
    [ROLES.USER]: {
        label: 'Employee / User',
        sublabel: 'Personal Well-being Portal',
        icon: UserCheck,
        color: 'cyan',
        gradient: 'from-cyan-600 to-sky-500',
        bar: 'from-cyan-500 via-sky-400 to-cyan-600',
        accent: 'text-cyan-400',
        border: 'border-cyan-500',
        badge: 'bg-cyan-950 text-cyan-300 border border-cyan-700',
        btn: 'from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 border-cyan-400/40',
        glow: 'shadow-cyan-950/60',
        endpoint: '/api/auth/user/login',
        signupEndpoint: '/api/auth/user/signup',
        requiresOrg: true,
        hasSignup: true,
        demoNote: null,
    },
    [ROLES.PSYCHOLOGIST]: {
        label: 'Doctor / Psychologist',
        sublabel: 'Clinical Assessment Portal',
        icon: Stethoscope,
        color: 'emerald',
        gradient: 'from-emerald-600 to-teal-500',
        bar: 'from-emerald-500 via-teal-400 to-emerald-600',
        accent: 'text-emerald-400',
        border: 'border-emerald-500',
        badge: 'bg-emerald-950 text-emerald-300 border border-emerald-700',
        btn: 'from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border-emerald-400/40',
        glow: 'shadow-emerald-950/60',
        endpoint: '/api/auth/psychologist/login',
        requiresOrg: false,
        hasSignup: false,
        demoNote: 'Psychologist accounts are provisioned by the system administrator.',
    },
};

export const PortalLoginForm: React.FC<PortalLoginProps> = ({ portal, onLoginSuccess, onBack }) => {
    const config = PORTAL_CONFIG[portal];
    const Icon = config.icon;

    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [orgInput, setOrgInput] = useState('');
    const [orgVerified, setOrgVerified] = useState<AuthOrganization | null>(null);
    const [orgError, setOrgError] = useState('');
    const [isVerifyingOrg, setIsVerifyingOrg] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Org verification (debounced)
    useEffect(() => {
        if (!config.requiresOrg) return;
        setOrgVerified(null);
        setOrgError('');
        const trimmed = orgInput.trim();
        if (!trimmed) return;

        const t = setTimeout(async () => {
            setIsVerifyingOrg(true);
            try {
                const res = await fetch('/api/auth/organization/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orgId: trimmed }),
                });
                const data = await res.json();
                if (res.ok && data.success && data.organization) {
                    setOrgVerified(data.organization);
                    setOrgError('');
                } else {
                    setOrgVerified(null);
                    setOrgError('Invalid Organization ID or Code');
                }
            } catch {
                setOrgVerified(null);
                setOrgError('Unable to verify organization. Please try again.');
            } finally {
                setIsVerifyingOrg(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [orgInput, config.requiresOrg]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage('');

        if (config.requiresOrg && mode === 'login' && !orgVerified) {
            setErrorMessage('Please enter a valid Organization ID before signing in.');
            setIsSubmitting(false);
            return;
        }

        try {
            const endpoint = mode === 'signup' ? (config as any).signupEndpoint : config.endpoint;
            const body: Record<string, string> = { email, password };
            if (name && mode === 'signup') body.name = name;
            if (orgInput && config.requiresOrg) body.orgId = orgInput.trim();
            if (orgVerified && config.requiresOrg) body.orgId = orgVerified.id;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            let data: any = null;
            try {
                data = await res.json();
            } catch (err) {
                console.error('Failed to parse JSON response:', err);
            }

            if (data && data.success && data.user && data.token) {
                // Save session to localStorage
                saveSession({
                    token: data.token,
                    user: data.user as AuthUser,
                    organization: data.organization as AuthOrganization,
                    role: portal,
                });
                onLoginSuccess(data.user as AuthUser, portal, data.organization as AuthOrganization, data.token);
            } else if (data && data.error) {
                setErrorMessage(data.error);
            } else {
                setErrorMessage(`Authentication failed (${res.status || 'No Response'}). Please check your connection to the backend server.`);
            }
        } catch (err: any) {
            console.error('Authentication request error:', err);
            setErrorMessage(err?.message || 'Server connection error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">

                {/* Glow accent */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${config.bar}`} />

                {/* Back button */}
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors group"
                >
                    <span className="text-lg leading-none">←</span>
                    <span>Back to Portal Selection</span>
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr ${config.gradient} p-0.5 shadow-lg mb-4`}>
                        <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center">
                            <Icon className={`w-7 h-7 ${config.accent}`} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">{config.label}</h2>
                    <p className="text-xs text-slate-400 mt-1">{config.sublabel}</p>
                    <div className={`inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${config.badge}`}>
                        Role: {portal.replace('_', ' ')}
                    </div>
                </div>

                {/* Mode tabs (login/signup - only for USER) */}
                {config.hasSignup && (
                    <div className="flex rounded-xl bg-slate-950/80 p-1 gap-1 mb-6">
                        <button
                            onClick={() => { setMode('login'); setErrorMessage(''); }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? `${config.badge} shadow-sm` : 'text-slate-400 hover:text-white'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setMode('signup'); setErrorMessage(''); }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'signup' ? `${config.badge} shadow-sm` : 'text-slate-400 hover:text-white'}`}
                        >
                            Create Account
                        </button>
                    </div>
                )}

                {/* Demo note (for org officer / psychologist) */}
                {config.demoNote && (
                    <div className="mb-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2">
                        <Fingerprint className={`w-4 h-4 shrink-0 mt-0.5 ${config.accent}`} />
                        <p className="text-[11px] text-slate-400">{config.demoNote}</p>
                    </div>
                )}

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Name (signup only) */}
                    {mode === 'signup' && (
                        <div>
                            <label className="block text-slate-300 text-xs font-semibold mb-1.5">Full Name</label>
                            <input
                                type="text"
                                required
                                placeholder="Your full name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                            />
                        </div>
                    )}

                    {/* Organization ID (for USER portal) */}
                    {config.requiresOrg && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className={`flex items-center gap-1.5 text-slate-300 text-xs font-semibold`}>
                                    <Hash className={`w-3.5 h-3.5 ${config.accent}`} />
                                    Organization ID <span className="text-rose-400">*</span>
                                </label>
                                {isVerifyingOrg && <span className="text-[10px] font-mono text-slate-400 animate-pulse">Verifying...</span>}
                                {orgVerified && !isVerifyingOrg && (
                                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                                        <CheckCircle className="w-3 h-3" /> Verified
                                    </span>
                                )}
                                {orgError && !isVerifyingOrg && (
                                    <span className="flex items-center gap-1 text-[10px] font-mono text-rose-400">
                                        <AlertCircle className="w-3 h-3" /> {orgError}
                                    </span>
                                )}
                            </div>
                            <input
                                type="text"
                                required
                                placeholder="e.g. org_1  or  AEGIS"
                                value={orgInput}
                                onChange={e => setOrgInput(e.target.value)}
                                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-colors font-mono
                                    ${orgVerified ? 'border-emerald-500/70' : orgError ? 'border-rose-500/70' : 'border-slate-800 focus:border-cyan-500'}`}
                            />
                            {orgVerified && (
                                <div className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono ${config.badge}`}>
                                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>{orgVerified.name}</span>
                                    <span className="text-slate-400 ml-auto">{orgVerified.code} · {orgVerified.type}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Email */}
                    <div>
                        <label className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold mb-1.5">
                            <Mail className={`w-3.5 h-3.5 ${config.accent}`} />
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="your@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold mb-1.5">
                            <Lock className={`w-3.5 h-3.5 ${config.accent}`} />
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                placeholder="••••••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Error message */}
                    {errorMessage && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/30 border border-rose-800/50">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting || (config.requiresOrg && mode === 'login' && !orgVerified)}
                        className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all border flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${config.btn}`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            <>
                                <span>{mode === 'login' ? `Sign In to ${config.label} Portal` : `Create ${config.label} Account`}</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Security notice */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 text-[10px] text-slate-500">
                    <Shield className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                    <span>JWT-secured session · RBAC enforced · Role: <span className={`font-mono font-bold ${config.accent}`}>{portal}</span></span>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// PORTAL SELECTION (Landing/Home for unauthenticated users)
// ============================================================

interface PortalSelectorProps {
    onSelectPortal: (portal: RBACRole) => void;
}

export const PortalSelector: React.FC<PortalSelectorProps> = ({ onSelectPortal }) => {
    const portals = [
        {
            role: ROLES.ORGANIZATION_OFFICER as RBACRole,
            label: 'Organization Officer',
            sublabel: 'Enterprise aggregated analytics & administration',
            icon: Building2,
            color: 'amber',
            gradient: 'from-amber-600 to-orange-500',
            hover: 'hover:border-amber-500',
            accent: 'text-amber-400',
            bgAccent: 'bg-amber-950/50',
            badge: 'bg-amber-950/60 text-amber-300 border border-amber-800',
            features: ['Aggregated well-being analytics', 'Department risk overview', 'Organization alerts', 'Privacy-preserving reports'],
        },
        {
            role: ROLES.USER as RBACRole,
            label: 'Employee / User',
            sublabel: 'Personal well-being, AI check-ins & consultations',
            icon: UserCheck,
            color: 'cyan',
            gradient: 'from-cyan-600 to-sky-500',
            hover: 'hover:border-cyan-500',
            accent: 'text-cyan-400',
            bgAccent: 'bg-cyan-950/50',
            badge: 'bg-cyan-950/60 text-cyan-300 border border-cyan-800',
            features: ['Personal stress & mood tracking', 'ABIMANYUAI AI Philosopher', 'Request psychologist consultation', 'Private text conversations', 'Consent & privacy settings'],
        },
        {
            role: ROLES.PSYCHOLOGIST as RBACRole,
            label: 'Doctor / Psychologist',
            sublabel: 'Clinical assessment for assigned patients',
            icon: Stethoscope,
            color: 'emerald',
            gradient: 'from-emerald-600 to-teal-500',
            hover: 'hover:border-emerald-500',
            accent: 'text-emerald-400',
            bgAccent: 'bg-emerald-950/50',
            badge: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800',
            features: ['Authorized patient profiles', 'Consultation requests', 'Secure text conversations', 'Clinical notes & follow-up', 'AI clinical reports'],
        },
    ];

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 mb-5">
                    <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center">
                        <Shield className="w-8 h-8 text-cyan-400" />
                    </div>
                </div>
                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">
                    CHIDAMBARANAR AI
                </h1>
                <p className="text-slate-400 text-sm font-mono max-w-lg mx-auto">
                    Secure Role-Based Authentication · Select your designated portal to continue
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        JWT Secured
                    </span>
                    <span className="text-slate-700">•</span>
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        RBAC Enforced
                    </span>
                    <span className="text-slate-700">•</span>
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Data Isolated
                    </span>
                </div>
            </div>

            {/* Portal cards */}
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5">
                {portals.map(portal => {
                    const Icon = portal.icon;
                    return (
                        <button
                            key={portal.role}
                            onClick={() => onSelectPortal(portal.role)}
                            className={`group relative flex flex-col p-6 rounded-2xl bg-slate-900/80 border border-slate-800 ${portal.hover} transition-all duration-300 text-left overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1`}
                        >
                            {/* Glow */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${portal.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300 pointer-events-none`} />

                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl ${portal.bgAccent} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <Icon className={`w-6 h-6 ${portal.accent}`} />
                            </div>

                            {/* Role badge */}
                            <div className={`inline-block self-start mb-3 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${portal.badge}`}>
                                {portal.role.replace(/_/g, ' ')}
                            </div>

                            <h3 className="font-black text-white text-lg mb-1">{portal.label}</h3>
                            <p className="text-xs text-slate-400 mb-4">{portal.sublabel}</p>

                            {/* Feature list */}
                            <ul className="space-y-1.5 mb-5">
                                {portal.features.map((f, i) => (
                                    <li key={i} className={`flex items-center gap-2 text-[11px] font-mono text-slate-400 group-hover:text-slate-300 transition-colors`}>
                                        <div className={`w-1 h-1 rounded-full ${portal.accent} bg-current`} />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <div className={`mt-auto flex items-center gap-2 text-xs font-bold ${portal.accent} group-hover:gap-3 transition-all`}>
                                <span>Access Portal</span>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </button>
                    );
                })}
            </div>

            <p className="mt-8 text-[11px] text-slate-600 text-center font-mono max-w-md">
                Each portal is independently authenticated. No role switching is permitted after login.
                Access to another role&apos;s dashboard will result in a 403 Forbidden response.
            </p>
        </div>
    );
};
