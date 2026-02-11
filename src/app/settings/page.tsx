import React from 'react';
import {
    Settings,
    Key,
    Globe,
    Shield,
    Database,
    Smartphone,
    CheckCircle2
} from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Configuración</h1>
                    <p className="text-slate-400 mt-1">Gestiona tus integraciones y credenciales de API.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Navigation Tabs */}
                <div className="lg:col-span-1 space-y-2">
                    {[
                        { label: 'Integraciones', icon: Globe, active: true },
                        { label: 'Seguridad y API', icon: Shield, active: false },
                        { label: 'Base de Datos', icon: Database, active: false },
                        { label: 'Organización', icon: Settings, active: false },
                    ].map((item) => (
                        <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${item.active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Settings Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* GHL Config */}
                    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl space-y-6 backdrop-blur-sm">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <Globe className="w-6 h-6 text-indigo-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Go High Level (GHL)</h2>
                                <p className="text-xs text-slate-500">Conecta tu sub-cuenta para sincronizar leads.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">GHL Access Token</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                    <input
                                        type="password"
                                        placeholder="ghl_******************************"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">Location ID</label>
                                <input
                                    type="text"
                                    placeholder="ID de la locación en GHL"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-300"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-slate-700">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Vincular Sub-cuenta
                            </button>
                        </div>
                    </div>

                    {/* WhatsApp Cloud API Config */}
                    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl space-y-6 backdrop-blur-sm">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Smartphone className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">WhatsApp Cloud API</h2>
                                <p className="text-xs text-slate-500">API oficial de Meta para envíos masivos.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">Phone Number ID</label>
                                <input
                                    type="text"
                                    placeholder="ID de número de teléfono"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">Permanent Access Token</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                    <input
                                        type="password"
                                        placeholder="EAAG******************************"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-300"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all border border-slate-700">
                                Verificar Conexión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
