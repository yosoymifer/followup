import React from 'react';
import {
    History,
    Play,
    Pause,
    Settings2,
    AlertTriangle,
    CheckCircle,
    BarChart3,
    Bot
} from 'lucide-react';

export default function RecoveryPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Campaña de Recuperación</h1>
                    <p className="text-slate-400 mt-1">Reactivación masiva de los 1,500 leads en etapa inicial.</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 border border-slate-700">
                        <Settings2 className="w-4 h-4" />
                        Configurar Lotes
                    </button>
                    <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Iniciar Campaña
                    </button>
                </div>
            </div>

            {/* Progress Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="relative flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Leads Procesados</p>
                            <h3 className="text-3xl font-black text-white">450 <span className="text-slate-600 text-lg font-medium">/ 1,500</span></h3>
                        </div>
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                        </div>
                    </div>
                    <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-[30%]" />
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="relative flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Tasa de Respuesta</p>
                            <h3 className="text-3xl font-black text-emerald-400">18.4%</h3>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Bot className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">82 respuestas detectadas por la IA</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="relative flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Estado del Número</p>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-500" /> Saludable
                            </h3>
                        </div>
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Smartphone className="w-5 h-5 text-slate-400" />
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">Límite diario: 150 mensajes</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Active Log */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="p-6 border-b border-slate-800 bg-slate-900/40 font-bold text-white flex items-center justify-between">
                        <span>Log de Ejecución Actual</span>
                        <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">Lote #3 en curso</span>
                    </div>
                    <div className="p-4 space-y-3 font-mono text-[11px]">
                        <div className="flex gap-3 text-slate-500">
                            <span>[14:45:01]</span>
                            <span className="text-indigo-400">INFO:</span>
                            <span>Analizando contexto para lead: Carlos M.</span>
                        </div>
                        <div className="flex gap-3 text-slate-500">
                            <span>[14:45:12]</span>
                            <span className="text-emerald-400">SUCCESS:</span>
                            <span>Mensaje enviado a +54...89 (Carlos M.)</span>
                        </div>
                        <div className="flex gap-3 text-slate-500">
                            <span>[14:46:30]</span>
                            <span className="text-indigo-400">INFO:</span>
                            <span>Esperando 45s para siguiente envío (Simulación Humana)...</span>
                        </div>
                        <div className="flex gap-3 text-slate-500 opacity-50">
                            <span>[14:47:15]</span>
                            <span className="text-slate-400">PENDING:</span>
                            <span>Siguiente en cola: Elena R.</span>
                        </div>
                    </div>
                </div>

                {/* Campaign Settings Summary */}
                <div className="space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" /> Recordatorio de Seguridad
                        </h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Estamos enviando mensajes en intervalos aleatorios entre 30s y 2min para proteger tu cuenta de WhatsApp Official. No enviaremos más de 150 mensajes por día hasta que tu reputación suba.
                        </p>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Carga Actual</p>
                                <p className="text-sm font-bold text-white">150 msgs / día</p>
                            </div>
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Horario</p>
                                <p className="text-sm font-bold text-white">09:00 - 18:00</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 p-6 rounded-2xl">
                        <h3 className="text-white font-bold mb-2">IA Insights</h3>
                        <p className="text-xs text-indigo-300 mb-4 font-medium italic">
                            "He notado que los leads contactados entre las 10:00 y las 11:30 tienen un 35% más de tasa de respuesta. He ajustado el cronograma automáticamente."
                        </p>
                        <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10">
                            Ver reporte detallado de IA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Mocking Smartphone icon for the code above since it wasn't imported
const Smartphone = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />
    </svg>
)
