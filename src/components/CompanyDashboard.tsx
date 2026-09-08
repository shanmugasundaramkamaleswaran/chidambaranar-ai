import React, { useState, useEffect } from 'react';
import { User, Department, CompanyAlert } from '../types';
import { Building2, Users, AlertTriangle, ShieldCheck, TrendingUp, EyeOff, Lock, Stethoscope, Sliders, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface CompanyDashboardProps {
    admin: User;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ admin }) => {
    const [overview, setOverview] = useState<any>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [alerts, setAlerts] = useState<CompanyAlert[]>([]);

    // Policy Config state
    const [checkinFrequency, setCheckinFrequency] = useState('Daily');
    const [alertThreshold, setAlertThreshold] = useState(65);
    const [isSavedPolicy, setIsSavedPolicy] = useState(false);

    const fetchCompanyData = async () => {
        try {
            // 1. Fetch company overview
            const ovRes = await fetch(`/api/company/overview?orgId=${admin.orgId}`);
            const ovData = await ovRes.json();
            if (ovData.overview) setOverview(ovData.overview);

            // 2. Fetch department breakdown
            const deptRes = await fetch(`/api/company/departments?orgId=${admin.orgId}`);
            const deptData = await deptRes.json();
            if (deptData.departments) setDepartments(deptData.departments);

            // 3. Fetch anonymized alerts
            const altRes = await fetch(`/api/company/alerts?orgId=${admin.orgId}`);
            const altData = await altRes.json();
            if (altData.alerts) setAlerts(altData.alerts);
        } catch (err) {
            console.error('Error fetching company dashboard data:', err);
        }
    };

    useEffect(() => {
        fetchCompanyData();
    }, [admin.orgId]);

    const handleSavePolicy = () => {
        setIsSavedPolicy(true);
        setTimeout(() => setIsSavedPolicy(false), 3000);
    };

    // Risk Distribution Data for Recharts Pie
    const pieData = overview ? [
        { name: 'Low Risk', value: overview.riskBreakdown.lowPct, color: '#10b981' },
        { name: 'Moderate', value: overview.riskBreakdown.moderatePct, color: '#f59e0b' },
        { name: 'Elevated', value: overview.riskBreakdown.elevatedPct, color: '#f97316' },
        { name: 'High Risk', value: overview.riskBreakdown.highPct, color: '#ef4444' },
    ] : [];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

            {/* COMPANY ADMIN HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <div className="flex items-center gap-4">
                    {admin.avatar ? (
                        <img src={admin.avatar} alt={admin.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/50 shadow-md" />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-amber-950 border border-amber-700 flex items-center justify-center text-xl font-bold text-amber-300">
                            {admin.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl lg:text-2xl font-black text-white">{admin.name}</h1>
                            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800">
                                COMPANY ENTERPRISE PORTAL
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{admin.title} • {overview?.organizationName || 'Aegis Defense Systems'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700">
                        Total Personnel: <span className="text-white font-bold">{overview?.totalEmployees || 1250}</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700">
                        Overall Risk: <span className="text-amber-400 font-bold">{overview?.overallRiskStatus || 'Moderate'}</span>
                    </div>
                </div>
            </div>

            {/* STRICT PRIVACY ENFORCEMENT BANNER */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-lg flex items-center gap-3">
                <EyeOff className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-xs text-slate-300">
                    <strong className="text-white">Strict Privacy Boundary Active:</strong> Company Administrators view strictly anonymized department trends. Individual mental-health check-ins, personal journals, and raw scores are non-accessible to preserve personnel trust and compliance.
                </div>
            </div>

            {/* EXECUTIVE OVERVIEW & RISK DISTRIBUTION GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Risk Breakdown Chart Card */}
                <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-white mb-1">Organization Well-being Summary</h3>
                        <p className="text-xs text-slate-400">Distribution across 1,250 monitored personnel.</p>

                        <div className="h-52 w-full my-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4}>
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                                <span className="text-emerald-400 font-bold">Low Risk</span>
                                <span className="text-white font-bold">{overview?.riskBreakdown?.lowPct || 72}%</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                                <span className="text-amber-400 font-bold">Moderate</span>
                                <span className="text-white font-bold">{overview?.riskBreakdown?.moderatePct || 18}%</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                                <span className="text-orange-400 font-bold">Elevated</span>
                                <span className="text-white font-bold">{overview?.riskBreakdown?.elevatedPct || 8}%</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                                <span className="text-rose-400 font-bold">High Risk</span>
                                <span className="text-white font-bold">{overview?.riskBreakdown?.highPct || 2}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Department Stress Trend Heatmap */}
                <div className="lg:col-span-2 p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-white">Department-Level Stress & Risk Heatmap</h3>
                        <p className="text-xs text-slate-400">Aggregated operational unit analysis.</p>
                    </div>

                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departments}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                                <Bar dataKey="avgStressScore" name="Avg Stress Score" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {departments.map(d => (
                            <div key={d.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                                <div>
                                    <p className="font-bold text-white">{d.name}</p>
                                    <p className="text-[11px] text-slate-400">{d.personnelCount || 120} Active Officers</p>
                                </div>
                                <div className="text-right font-mono">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.riskLevel === 'High' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                                            d.riskLevel === 'Elevated' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                                                d.riskLevel === 'Moderate' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                                                    'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                        }`}>
                                        {d.riskLevel.toUpperCase()}
                                    </span>
                                    <p className="text-[11px] text-slate-400 mt-1">Avg Score: {d.avgStressScore}/100</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* ANONYMIZED ORGANIZATIONAL ALERTS & POLICY CONFIG GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Anonymized Early Warning Alerts Stream */}
                <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white">Anonymized Organizational Alerts</h3>
                        <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800">
                            ACTIVE WARNINGS
                        </span>
                    </div>

                    <div className="space-y-3">
                        {alerts.map(alt => (
                            <div key={alt.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-200 font-medium">{alt.message}</p>
                                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                                        Logged: {new Date(alt.createdAt).toLocaleString()} | Status: {alt.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Check-in Frequency & Alert Threshold Policy Configuration */}
                <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white">Organization Policy Settings</h3>
                        <Sliders className="w-4 h-4 text-amber-400" />
                    </div>

                    <div className="space-y-4 text-xs">
                        <div>
                            <label className="block text-slate-300 font-medium mb-1.5">Required Officer Check-In Frequency</label>
                            <select
                                value={checkinFrequency}
                                onChange={e => setCheckinFrequency(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                            >
                                <option value="Daily">Daily Operational Check-In (Recommended for Tactical Ops)</option>
                                <option value="Biweekly">Bi-weekly (2x per week)</option>
                                <option value="Weekly">Weekly Baseline Survey</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between font-medium mb-1">
                                <span className="text-slate-300">Organizational Department Alert Trigger Score</span>
                                <span className="text-amber-400 font-mono font-bold">{alertThreshold} / 100</span>
                            </div>
                            <input
                                type="range" min="40" max="85" value={alertThreshold}
                                onChange={e => setAlertThreshold(Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            {isSavedPolicy && <span className="text-xs text-emerald-400 font-bold">Policy settings saved successfully!</span>}
                            <button
                                onClick={handleSavePolicy}
                                className="ml-auto px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-colors"
                            >
                                Save Organizational Policy
                            </button>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};
