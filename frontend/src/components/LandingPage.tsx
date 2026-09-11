import React, { useState } from 'react';
import { ShieldCheck, Activity, Cpu, Lock, ArrowRight, Brain, Zap, UserCheck, Stethoscope, Building2, CheckCircle2, AlertTriangle, EyeOff, Layers } from 'lucide-react';

interface LandingPageProps {
    onSelectPortal: (portal: 'user' | 'doctor' | 'company') => void;
    onOpenWearables: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectPortal, onOpenWearables }) => {
    // Live Risk Scoring Simulator State
    const [simStress, setSimStress] = useState(7);
    const [simFatigue, setSimFatigue] = useState(8);
    const [simSleep, setSimSleep] = useState(5.2);
    const [simWorkload, setSimWorkload] = useState(9);

    // Simple simulator calculation
    const simScore = Math.round(
        (simStress / 10) * 30 +
        (simFatigue / 10) * 25 +
        (simWorkload / 10) * 20 +
        ((10 - simSleep) / 10) * 25
    );

    let simLevel = 'GREEN';
    let simColor = 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40';
    if (simScore >= 81) {
        simLevel = 'RED';
        simColor = 'text-rose-400 border-rose-500/50 bg-rose-950/40';
    } else if (simScore >= 61) {
        simLevel = 'ORANGE';
        simColor = 'text-orange-400 border-orange-500/50 bg-orange-950/40';
    } else if (simScore >= 31) {
        simLevel = 'YELLOW';
        simColor = 'text-amber-400 border-amber-500/50 bg-amber-950/40';
    }

    return (
        <div className="space-y-20 pb-20 overflow-hidden">

            {/* HERO SECTION */}
            <section className="relative pt-12 lg:pt-20 px-4 max-w-7xl mx-auto text-center">

                {/* Background glow graphics */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-600/15 via-sky-500/10 to-emerald-500/15 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 text-xs font-mono mb-6 shadow-inner">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>ENTERPRISE & TACTICAL READINESS ENGINE</span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-[1.1] text-white">
                    Predict Stress. <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">Protect Well-being.</span> Strengthen Readiness.
                </h1>

                <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
                    An AI-powered early-warning platform identifying subtle shifts in stress and well-being before burnout or operational degradation occurs — built with a strict privacy-first architecture.
                </p>

                {/* Portals CTA Group */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                    <button
                        onClick={() => onSelectPortal('user')}
                        className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-cyan-600 hover:from-cyan-500 hover:to-sky-400 text-white font-bold text-sm shadow-xl shadow-cyan-950/50 border border-cyan-400/40 transition-all transform hover:-translate-y-0.5"
                    >
                        <UserCheck className="w-4 h-4" />
                        Launch Officer Portal
                    </button>

                    <button
                        onClick={() => onSelectPortal('doctor')}
                        className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-sm border border-emerald-700/50 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-emerald-950/30"
                    >
                        <Stethoscope className="w-4 h-4" />
                        Launch Doctor Portal
                    </button>

                    <button
                        onClick={() => onSelectPortal('company')}
                        className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-sm border border-amber-700/50 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-amber-950/30"
                    >
                        <Building2 className="w-4 h-4" />
                        Launch Company Portal
                    </button>
                </div>

                {/* Key Metrics Ribbon */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    <div className="p-4 rounded-xl glass-panel text-center">
                        <p className="text-2xl lg:text-3xl font-extrabold text-cyan-400 font-mono">0 - 100</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Transparent Stress Index</p>
                    </div>
                    <div className="p-4 rounded-xl glass-panel text-center">
                        <p className="text-2xl lg:text-3xl font-extrabold text-emerald-400 font-mono">14 Days</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Personal Baseline Engine</p>
                    </div>
                    <div className="p-4 rounded-xl glass-panel text-center">
                        <p className="text-2xl lg:text-3xl font-extrabold text-amber-400 font-mono">4 Tiers</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Early Warning System</p>
                    </div>
                    <div className="p-4 rounded-xl glass-panel text-center">
                        <p className="text-2xl lg:text-3xl font-extrabold text-sky-400 font-mono">100% RBAC</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Privacy & Data Safeguards</p>
                    </div>
                </div>
            </section>

            {/* CORE WORKFLOW SYSTEM FLOW */}
            <section className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        How CHIDAMBARANAR AI Works: Detects Deviation from Personal Baseline
                    </h2>
                    <p className="text-slate-400 text-sm mt-2 max-w-2xl mx-auto">
                        Unlike static questionnaires, CHIDAMBARANAR AI models individual baseline patterns to identify meaningful stress shifts.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative">
                        <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center mb-4 text-cyan-400 font-bold font-mono">
                            01
                        </div>
                        <h3 className="font-bold text-white text-base">Software Signals</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Daily check-ins (stress, fatigue, workload, sleep hours, mood) combined with authorized after-hours duty patterns.
                        </p>
                    </div>

                    <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative">
                        <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-700/60 flex items-center justify-center mb-4 text-sky-400 font-bold font-mono">
                            02
                        </div>
                        <h3 className="font-bold text-white text-base">Personal Baseline</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Constructs a 14-day individual normal window. Identifies true signal deviations rather than cross-user comparisons.
                        </p>
                    </div>

                    <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative">
                        <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center mb-4 text-emerald-400 font-bold font-mono">
                            03
                        </div>
                        <h3 className="font-bold text-white text-base">AI Early Warning</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Computes transparent risk score (0-100), trend direction (Increasing/Stable), confidence rating, and contributing factors.
                        </p>
                    </div>

                    <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative">
                        <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-700/60 flex items-center justify-center mb-4 text-amber-400 font-bold font-mono">
                            04
                        </div>
                        <h3 className="font-bold text-white text-base">Proactive Support</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Provides tailored AI wellness coaching and enables one-click doctor consultations while protecting raw journal privacy.
                        </p>
                    </div>
                </div>
            </section>

            {/* LIVE RISK SCORING SIMULATOR */}
            <section className="max-w-5xl mx-auto px-4">
                <div className="p-6 md:p-8 rounded-3xl glass-panel-glow border border-cyan-500/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-800">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono mb-2">
                                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                                INTERACTIVE DEMO SIMULATOR
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-white">Test the AI Stress-Risk Engine</h3>
                            <p className="text-slate-400 text-xs mt-1">Adjust physiological & behavioral parameters to observe risk scoring algorithm.</p>
                        </div>

                        <div className={`px-5 py-3 rounded-2xl border ${simColor} text-center min-w-[160px]`}>
                            <p className="text-xs font-mono font-semibold uppercase tracking-wider">Risk Level: {simLevel}</p>
                            <p className="text-3xl font-extrabold font-mono mt-0.5">{simScore} / 100</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sliders */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs font-medium mb-1.5">
                                    <span className="text-slate-300">Self-Reported Stress (1-10)</span>
                                    <span className="text-cyan-400 font-mono">{simStress}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" value={simStress}
                                    onChange={(e) => setSimStress(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-medium mb-1.5">
                                    <span className="text-slate-300">Fatigue Index (1-10)</span>
                                    <span className="text-amber-400 font-mono">{simFatigue}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" value={simFatigue}
                                    onChange={(e) => setSimFatigue(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-medium mb-1.5">
                                    <span className="text-slate-300">Sleep Duration (Hours)</span>
                                    <span className="text-sky-400 font-mono">{simSleep}h</span>
                                </div>
                                <input
                                    type="range" min="3" max="10" step="0.5" value={simSleep}
                                    onChange={(e) => setSimSleep(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-medium mb-1.5">
                                    <span className="text-slate-300">Operational Workload (1-10)</span>
                                    <span className="text-emerald-400 font-mono">{simWorkload}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" value={simWorkload}
                                    onChange={(e) => setSimWorkload(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Generated Output Card */}
                        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
                            <div>
                                <h4 className="text-xs font-mono uppercase text-slate-400 mb-3 tracking-wider">Engine Risk Analysis</h4>
                                <ul className="space-y-2 text-xs text-slate-300">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                        <span><strong>Personal Baseline Deviation:</strong> +{(simStress - 3.5).toFixed(1)} stress points over normal.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                        <span><strong>Sleep Deficit Impact:</strong> sleeping {simSleep}h vs baseline 7.2h adds fatigue penalty.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                        <span><strong>Estimated Confidence Rating:</strong> 84% based on 14-day history.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400 italic">
                                Notice: CHIDAMBARANAR AI provides early-warning risk estimation to recommend recovery protocols. It does NOT diagnose clinical mental illness.
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* PRIVACY-FIRST GUARANTEE SECTION */}
            <section className="max-w-7xl mx-auto px-4">
                <div className="p-8 lg:p-10 rounded-3xl glass-panel border border-slate-800">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 text-xs font-mono mb-4">
                            <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            PRIVACY ARCHITECTURE & ANTI-SURVEILLANCE GUARANTEE
                        </div>
                        <h2 className="text-2xl md:text-4xl font-bold text-white">Built for High-Trust Defense & Enterprise Operations</h2>
                        <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                            Mental health data requires strict confidentiality. CHIDAMBARANAR AI is engineered with clear boundary enforcement between user privacy, clinical care, and organizational management.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                            <EyeOff className="w-6 h-6 text-cyan-400 mb-3" />
                            <h3 className="font-bold text-white text-sm">Company Privacy Wall</h3>
                            <p className="text-xs text-slate-400 mt-2">
                                Company administrators see ONLY anonymized, department-level aggregated risk percentages. Private journals and individual scores are strictly hidden.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                            <Stethoscope className="w-6 h-6 text-emerald-400 mb-3" />
                            <h3 className="font-bold text-white text-sm">Doctor Confidentiality</h3>
                            <p className="text-xs text-slate-400 mt-2">
                                Assigned physicians access individual longitudinal check-ins ONLY upon explicit user request or consent for clinical follow-up.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                            <ShieldCheck className="w-6 h-6 text-amber-400 mb-3" />
                            <h3 className="font-bold text-white text-sm">Immutable Audit Logs</h3>
                            <p className="text-xs text-slate-400 mt-2">
                                Every sensitive data access is recorded in an immutable RBAC audit trail. Users can review exactly who viewed their metrics.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* WEARABLE ROADMAP CTA */}
            <section className="max-w-7xl mx-auto px-4 text-center">
                <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0b1324] to-cyan-950/60 border border-cyan-800/40">
                    <Cpu className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                    <h2 className="text-2xl font-bold text-white">Extensible for Future Wearable Sensor Integration</h2>
                    <p className="text-slate-300 text-sm mt-2 max-w-2xl mx-auto">
                        Version 1 operates software-only. The system architecture includes ready API gateways for Heart Rate, HRV, PPG/ECG, Sleep, and Respiration edge data integration.
                    </p>
                    <button
                        onClick={onOpenWearables}
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 text-xs font-mono font-bold border border-cyan-700/60 transition-all"
                    >
                        Explore Wearable Data Schema <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </section>

        </div>
    );
};
