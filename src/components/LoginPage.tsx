import React, { useState } from 'react';
import { Shield, UserCheck, Stethoscope, Building2, ArrowRight } from 'lucide-react';
import { User } from '../types';
import { signInWithGoogle } from '../firebase';

interface LoginPageProps {
    onLoginSuccess: (user: User, role: 'user' | 'doctor' | 'company') => void;
    allUsers: User[];
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, allUsers }) => {
    const [activePanel, setActivePanel] = useState<'user' | 'doctor' | 'company'>('user');

    // Form fields
    const [email, setEmail] = useState('john.vance@aegis-defense.com');
    const [password, setPassword] = useState('••••••••••••');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Handle panel tab switch
    const handleSwitchPanel = (panel: 'user' | 'doctor' | 'company') => {
        setActivePanel(panel);
        setErrorMessage('');
        if (panel === 'user') {
            setEmail('john.vance@aegis-defense.com');
        } else if (panel === 'doctor') {
            setEmail('dr.connor@sentinel-medical.org');
        } else if (panel === 'company') {
            setEmail('alex.mercer@aegis-defense.com');
        }
    };

    // Handle Form Submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage('');

        setTimeout(() => {
            let matchedUser: User | undefined;

            if (activePanel === 'user') {
                matchedUser = allUsers.find(u => u.role === 'user_employee' && (u.email === email || u.id === 'usr_1')) || allUsers[0];
            } else if (activePanel === 'doctor') {
                matchedUser = allUsers.find(u => u.role === 'doctor') || allUsers.find(u => u.id === 'usr_doc1');
            } else if (activePanel === 'company') {
                matchedUser = allUsers.find(u => u.role === 'company_admin') || allUsers.find(u => u.id === 'usr_3');
            }

            setIsSubmitting(false);
            if (matchedUser) {
                onLoginSuccess(matchedUser, activePanel);
            } else {
                setErrorMessage('Invalid credentials for selected portal.');
            }
        }, 600);
    };

    // Handle Firebase Google Account Sign-In
    const handleGoogleLogin = async () => {
        setIsSubmitting(true);
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
                onLoginSuccess(matchedUser, activePanel);
            }
        } catch (err) {
            console.error('Google Sign In Error:', err);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">

                {/* Top Glow Accent */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors ${activePanel === 'user' ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-600' :
                        activePanel === 'doctor' ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600' :
                            'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600'
                    }`} />

                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#090d16] border border-slate-800 shadow-inner mb-3">
                        <Shield className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">SENTINEL AUTHENTICATION</h1>
                    <p className="text-xs text-slate-400 mt-1">Select your access portal to sign in with Google or Password.</p>
                </div>

                {/* THREE LOGIN PANELS TABS */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/90 mb-8">

                    {/* Panel 1: User / Employee */}
                    <button
                        type="button"
                        onClick={() => handleSwitchPanel('user')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'user'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80 shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                            }`}
                    >
                        <UserCheck className="w-4 h-4 text-cyan-400" />
                        <span>User Login</span>
                    </button>

                    {/* Panel 2: Doctor */}
                    <button
                        type="button"
                        onClick={() => handleSwitchPanel('doctor')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'doctor'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                            }`}
                    >
                        <Stethoscope className="w-4 h-4 text-emerald-400" />
                        <span>Doctor Login</span>
                    </button>

                    {/* Panel 3: Organization */}
                    <button
                        type="button"
                        onClick={() => handleSwitchPanel('company')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'company'
                                ? 'bg-amber-950 text-amber-300 border border-amber-700/80 shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                            }`}
                    >
                        <Building2 className="w-4 h-4 text-amber-400" />
                        <span>Org Login</span>
                    </button>

                </div>

                {/* FIREBASE GOOGLE SIGN IN BUTTON */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 transition-all shadow-md group"
                >
                    {/* Official Google G Logo SVG */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google Account</span>
                </button>

                {/* DIVIDER */}
                <div className="relative my-6 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                    <span className="relative bg-slate-900 px-3 text-[11px] font-mono text-slate-500 uppercase">OR SIGN IN WITH EMAIL</span>
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
                        <p className="text-xs text-rose-400 font-medium font-mono">{errorMessage}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs shadow-lg transition-all border flex items-center justify-center gap-2 ${activePanel === 'user'
                                ? 'bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 border-cyan-400/40 shadow-cyan-950/50'
                                : activePanel === 'doctor'
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border-emerald-400/40 shadow-emerald-950/50'
                                    : 'bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 border-amber-400/40 shadow-amber-950/50'
                            }`}
                    >
                        {isSubmitting ? (
                            <span>Authenticating...</span>
                        ) : (
                            <>
                                <span>Sign In to {activePanel === 'user' ? 'Officer Portal' : activePanel === 'doctor' ? 'Doctor Portal' : 'Organization Portal'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* DEMO ACCOUNT QUICK CHIP */}
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
