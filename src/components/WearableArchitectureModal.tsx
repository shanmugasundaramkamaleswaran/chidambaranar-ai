import React, { useState } from 'react';
import { X, Cpu, ArrowDown, ShieldCheck, HeartPulse, Activity, Zap, CheckCircle2 } from 'lucide-react';

interface WearableArchitectureModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WearableArchitectureModal: React.FC<WearableArchitectureModalProps> = ({ isOpen, onClose }) => {
    const [syncStatus, setSyncStatus] = useState<string | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    if (!isOpen) return null;

    const handleSimulateWearableSync = async () => {
        setIsSimulating(true);
        try {
            const res = await fetch('/api/wearables/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'usr_1',
                    heartRateBpm: 78,
                    hrvMs: 42,
                    sleepDurationHours: 5.8,
                    respirationRate: 17,
                    deviceType: 'Tactical Smartwatch (Garmin/Polar Gateway)'
                })
            });
            const data = await res.json();
            if (data.success) {
                setSyncStatus('Ingested HR 78 BPM, HRV 42ms, Sleep 5.8h from Tactical Smartwatch Edge Gateway.');
            }
        } catch (err) {
            console.error('Wearable sync error:', err);
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#0b1324] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 lg:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">

                <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                        <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Wearable Sensor Integration API Architecture</h2>
                        <p className="text-xs text-slate-400">Version 1 Software-Only System Extensible for Physiological Sensor Ingestion</p>
                    </div>
                </div>

                {/* Visual Architecture Pipeline */}
                <div className="space-y-4 my-6">

                    {/* Layer 1 */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Layer 1: Wearable Physiological Data Sources</span>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-xs font-mono">
                            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">Heart Rate (BPM)</div>
                            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">HRV (ms)</div>
                            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">Sleep Architecture</div>
                            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">Respiration Rate</div>
                            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">Skin Conductance</div>
                        </div>
                    </div>

                    <div className="flex justify-center text-cyan-500">
                        <ArrowDown className="w-5 h-5 animate-bounce" />
                    </div>

                    {/* Layer 2 */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest font-bold">Layer 2: Secure Data Gateway & Edge Processing</span>
                        <p className="text-xs text-slate-300 mt-2">
                            REST / gRPC Data Integration Endpoint (`POST /api/wearables/sync`) with local edge filtering to protect biometric privacy.
                        </p>
                    </div>

                    <div className="flex justify-center text-sky-500">
                        <ArrowDown className="w-5 h-5 animate-bounce" />
                    </div>

                    {/* Layer 3 */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Layer 3: SENTINEL AI Stress & Personal Baseline Engine</span>
                        <p className="text-xs text-slate-300 mt-2">
                            Fused Multimodal Data + Software Signals → Personal Baseline Anomaly Score → Early Warning Escalation.
                        </p>
                    </div>

                </div>

                {/* Live Wearable API Test Button */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Test Wearable Data Ingestion Gateway</span>
                        <button
                            onClick={handleSimulateWearableSync}
                            disabled={isSimulating}
                            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-colors"
                        >
                            {isSimulating ? 'Ingesting Sensor Stream...' : 'Simulate Smartwatch Data Sync'}
                        </button>
                    </div>

                    {syncStatus && (
                        <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-800 text-xs text-cyan-300 font-mono flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                            {syncStatus}
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs">Close Gateway Schema</button>
                </div>

            </div>
        </div>
    );
};
