import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, Stethoscope, Building2, ArrowRight, CheckCircle, AlertCircle, Hash, Plus, ChevronLeft } from 'lucide-react';
import { User, Organization } from '../types';
import { signInWithGoogle } from '../firebase';

interface LoginPageProps {
    onLoginSuccess: (user: User, role: 'user' | 'doctor' | 'company', organization?: Organization) => void;
    allUsers: User[];
}

// Demo org quick-fill chips
const DEMO_ORGS: { id: string; code: string; name: string; color: string }[] = [
    { id: 'org_1', code: 'AEGIS', name: 'Aegis Defense', color: 'cyan' },
    { id: 'org_2', code: 'VANGUARD', name: 'Vanguard Cyber', color: 'violet' },
    { id: 'org_3', code: 'HORIZON', name: 'Horizon Logistics', color: 'emerald' },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, allUsers }) => {
    // Multi-step Flow State
    const [loginStage, setLoginStage] = useState<'AUTH_TYPE' | 'ROLE_SELECT' | 'CREDENTIALS'>('AUTH_TYPE');
    const [authType, setAuthType] = useState<'SIGN_IN' | 'CREATE_ACCOUNT' | null>(null);
    const [activePanel, setActivePanel] = useState<'user' | 'doctor' | 'company'>('user');

    // Form fields
    const [email, setEmail] = useState('john.vance@aegis-defense.com');
    const [password, setPassword] = useState('••••••••••••');
    const [orgInput, setOrgInput] = useState('org_1');
    const [orgVerified, setOrgVerified] = useState<Organization | null>(null);
    const [orgError, setOrgError] = useState('');
    const [isVerifyingOrg, setIsVerifyingOrg] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Verify org on input change (debounced)
    useEffect(() => {
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
                    const localMatch = DEMO_ORGS.find(
                        o => o.id.toLowerCase() === trimmed.toLowerCase() || o.code.toLowerCase() === trimmed.toLowerCase()
                    );
                    if (localMatch) {
                        setOrgVerified({
                            id: localMatch.id,
                            name: localMatch.name,
                            code: localMatch.code,
                            type: 'Enterprise Unit',
                            employeeCount: 1000
                        });
                        setOrgError('');
                    } else {
                        setOrgVerified(null);
                        setOrgError('Invalid Organization ID or Code');
                    }
                }
            } catch {
                const localMatch = DEMO_ORGS.find(
                    o => o.id.toLowerCase() === trimmed.toLowerCase() || o.code.toLowerCase() === trimmed.toLowerCase()
                );
                if (localMatch) {
                    setOrgVerified({
                        id: localMatch.id,
                        name: localMatch.name,
                        code: localMatch.code,
                        type: 'Enterprise Unit',
                        employeeCount: 1000
                    });
                    setOrgError('');
                } else {
                    setOrgVerified(null);
                    setOrgError('Invalid Organization ID or Code');
                }
            } finally {
                setIsVerifyingOrg(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [orgInput]);

    // Handle Auth Type Select
    const handleSelectAuthType = (type: 'SIGN_IN' | 'CREATE_ACCOUNT') => {
        setAuthType(type);
        setLoginStage('ROLE_SELECT');
    };

    // Handle Role Select
    const handleSelectRole = (panel: 'user' | 'doctor' | 'company') => {
        setActivePanel(panel);
        setErrorMessage('');
        setOrgVerified(null);
        setOrgError('');
        if (panel === 'user') {
            setEmail(authType === 'SIGN_IN' ? 'john.vance@aegis-defense.com' : '');
            setOrgInput('org_1');
        } else if (panel === 'doctor') {
            setEmail(authType === 'SIGN_IN' ? 'dr.connor@sentinel-medical.org' : '');
            setOrgInput('org_1');
        } else if (panel === 'company') {
            setEmail(authType === 'SIGN_IN' ? 'alex.mercer@aegis-defense.com' : '');
            setOrgInput('org_1');
        }
        setLoginStage('CREDENTIALS');
    };

    const handleBack = () => {
        if (loginStage === 'CREDENTIALS') setLoginStage('ROLE_SELECT');
        else if (loginStage === 'ROLE_SELECT') setLoginStage('AUTH_TYPE');
    };

    // Whether org ID is required for this panel
    const requiresOrg = activePanel === 'user' || activePanel === 'doctor';

    // Handle Email/Password Form Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage('');

        // Validate org for user/doctor panels
        if (requiresOrg && !orgVerified) {
            setErrorMessage('Please enter a valid Organization ID or Code before signing in.');
            setIsSubmitting(false);
            return;
        }

        try {
            let endpoint = '';
            let body: Record<string, string> = {};

            if (activePanel === 'user') {
                endpoint = '/api/auth/user/login';
                body = { email, orgId: orgInput.trim() };
            } else if (activePanel === 'doctor') {
                endpoint = '/api/auth/doctor/login';
                body = { email, orgId: orgInput.trim() };
            } else {
                endpoint = '/api/auth/company/login';
                body = { orgId: orgInput.trim() };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            setIsSubmitting(false);
            if (data.success && data.user) {
                onLoginSuccess(data.user as User, activePanel, data.organization as Organization);
            } else {
                setErrorMessage(data.error || 'Invalid credentials for selected portal.');
            }
        } catch {
            setIsSubmitting(false);
            setErrorMessage('Server error. Please try again.');
        }
    };

    // Handle Firebase Google Account Sign-In
    const handleGoogleLogin = async () => {
        if (requiresOrg && !orgVerified) {
            setErrorMessage('Please enter a valid Organization ID or Code before signing in with Google.');
            return;
        }
        setIsSubmitting(true);
        setErrorMessage('');
        try {
            const res = await signInWithGoogle();
            setIsSubmitting(false);
            if (res.success && res.user) {
                let matchedUser = allUsers.find(u => u.id === 'usr_1') || res.user as User;
                if (activePanel === 'doctor') {
                    matchedUser = allUsers.find(u => u.role === 'doctor') || res.user as User;
                } else if (activePanel === 'company') {
                    matchedUser = allUsers.find(u => u.role === 'company_admin') || res.user as User;
                }
                // Map to verified org
                if (orgVerified) {
                    matchedUser = { ...matchedUser, orgId: orgVerified.id };
                }
                onLoginSuccess(matchedUser, activePanel, orgVerified || undefined);
            }
        } catch (err) {
            console.error('Google Sign In Error:', err);
            setIsSubmitting(false);
        }
    };

    const accentClass = {
        user: { bar: 'from-cyan-500 via-sky-400 to-cyan-600', tab: 'bg-cyan-950 text-cyan-300 border-cyan-700/80', btn: 'from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 border-cyan-400/40 shadow-cyan-950/50', icon: 'text-cyan-400', orgBorder: 'border-cyan-500', badge: 'bg-cyan-950 text-cyan-300 border border-cyan-700' },
        doctor: { bar: 'from-emerald-500 via-teal-400 to-emerald-600', tab: 'bg-emerald-950 text-emerald-300 border-emerald-700/80', btn: 'from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border-emerald-400/40 shadow-emerald-950/50', icon: 'text-emerald-400', orgBorder: 'border-emerald-500', badge: 'bg-emerald-950 text-emerald-300 border border-emerald-700' },
        company: { bar: 'from-amber-500 via-orange-400 to-amber-600', tab: 'bg-amber-950 text-amber-300 border-amber-700/80', btn: 'from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 border-amber-400/40 shadow-amber-950/50', icon: 'text-amber-400', orgBorder: 'border-amber-500', badge: 'bg-amber-950 text-amber-300 border border-amber-700' },
    }[activePanel];

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">

                {/* Top Glow Accent */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors bg-gradient-to-r ${accentClass.bar}`} />

                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#090d16] border border-slate-800 shadow-inner mb-3">
                        <Shield className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">CHIDAMBARANAR AI AUTHENTICATION</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        {loginStage === 'AUTH_TYPE' && 'Welcome to the Secure Defense Portal.'}
                        {loginStage === 'ROLE_SELECT' && 'Select your designated professional role to proceed.'}
                        {loginStage === 'CREDENTIALS' && 'Enter your credentials and assigned Organization ID.'}
                    </p>
                </div>

                {/* STAGE: AUTH TYPE SELECTION */}
                {loginStage === 'AUTH_TYPE' && (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <button
                            onClick={() => handleSelectAuthType('SIGN_IN')}
                            className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/80 transition-all group shadow-lg"
                        >
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors">Sign In</span>
                                <span className="text-[11px] text-slate-400 mt-0.5">Access your existing authenticated profile</span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => handleSelectAuthType('CREATE_ACCOUNT')}
                            className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-900/80 transition-all group shadow-lg"
                        >
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">Create Account</span>
                                <span className="text-[11px] text-slate-400 mt-0.5">Register a new verified defense profile</span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>
                )}

                {/* STAGE: ROLE SELECTION */}
                {loginStage === 'ROLE_SELECT' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <button onClick={handleBack} className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                onClick={() => handleSelectRole('user')}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500 hover:bg-slate-900 transition-all group shadow-md"
                            >
                                <div className="w-12 h-12 rounded-xl bg-cyan-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <UserCheck className="w-6 h-6 text-cyan-400" />
                                </div>
                                <span className="font-bold text-slate-200 group-hover:text-cyan-400">User Portal</span>
                            </button>

                            <button
                                onClick={() => handleSelectRole('doctor')}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500 hover:bg-slate-900 transition-all group shadow-md"
                            >
                                <div className="w-12 h-12 rounded-xl bg-emerald-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Stethoscope className="w-6 h-6 text-emerald-400" />
                                </div>
                                <span className="font-bold text-slate-200 group-hover:text-emerald-400">Doctor Portal</span>
                            </button>

                            <button
                                onClick={() => handleSelectRole('company')}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-amber-500 hover:bg-slate-900 transition-all group shadow-md"
                            >
                                <div className="w-12 h-12 rounded-xl bg-amber-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Building2 className="w-6 h-6 text-amber-400" />
                                </div>
                                <span className="font-bold text-slate-200 group-hover:text-amber-400">Org Portal</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* STAGE: CREDENTIALS INPUT */}
                {loginStage === 'CREDENTIALS' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${accentClass.badge}`}>
                                {activePanel} Authorization
                            </span>
                        </div>

                        {/* ORGANIZATION ID FIELD */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold">
                                    <Hash className={`w-3.5 h-3.5 ${accentClass.icon}`} />
                                    Organization Unique ID
                                    <span className="text-rose-400">*</span>
                                </label>
                                {isVerifyingOrg && (
                                    <span className="text-[10px] font-mono text-slate-400 animate-pulse">Verifying...</span>
                                )}
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
                                placeholder="e.g. org_1  or  AEGIS  or  VANGUARD"
                                value={orgInput}
                                onChange={e => setOrgInput(e.target.value)}
                                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-colors font-mono
                                    ${orgVerified ? 'border-emerald-500/70' : orgError ? 'border-rose-500/70' : `focus:${accentClass.orgBorder} border-slate-800`}`}
                            />

                            {/* Quick-fill chips */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {DEMO_ORGS.map(org => (
                                    <button
                                        key={org.id}
                                        type="button"
                                        onClick={() => setOrgInput(org.id)}
                                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all
                                            ${orgInput === org.id || orgInput.toLowerCase() === org.code.toLowerCase()
                                                ? `${accentClass.badge} shadow-sm`
                                                : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                                    >
                                        {org.id} / {org.code}
                                    </button>
                                ))}
                            </div>

                            {/* Show verified org name */}
                            {orgVerified && (
                                <div className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono ${accentClass.badge}`}>
                                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>{orgVerified.name}</span>
                                    <span className="text-slate-400 ml-auto">{orgVerified.code} · {orgVerified.type}</span>
                                </div>
                            )}
                        </div>

                        {/* FIREBASE GOOGLE SIGN IN BUTTON */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 transition-all shadow-md group"
                        >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>{authType === 'SIGN_IN' ? 'Continue with Google' : 'Register with Google'}</span>
                        </button>

                        {/* DIVIDER */}
                        <div className="relative my-6 text-center">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                            <span className="relative bg-slate-900 px-3 text-[11px] font-mono text-slate-500 uppercase">
                                OR {authType === 'SIGN_IN' ? 'SIGN IN' : 'REGISTER'} WITH EMAIL
                            </span>
                        </div>

                        {/* EMAIL & PASSWORD LOGIN FORM */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                                />
                            </div>

                            {errorMessage && (
                                <p className="text-xs text-rose-400 font-medium font-mono flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{errorMessage}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || (requiresOrg && !orgVerified)}
                                className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs shadow-lg transition-all border flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${accentClass.btn}`}
                            >
                                {isSubmitting ? (
                                    <span>Processing...</span>
                                ) : (
                                    <>
                                        <span>{authType === 'SIGN_IN' ? 'Sign In to ' : 'Create Account for '}{activePanel === 'user' ? 'Officer Portal' : activePanel === 'doctor' ? 'Doctor Portal' : 'Organization Portal'}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* FOOTER */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Firebase Key Configured:</span>
                    <span className="font-mono text-cyan-400 font-bold text-[10px]">
                        BDNbXgI1dZuytc3z...
                    </span>
                </div>

            </div>
        </div>
    );
};
