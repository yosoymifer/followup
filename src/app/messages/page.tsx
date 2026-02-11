import React from 'react';
import {
    Send,
    Sparkles,
    Check,
    X,
    User,
    Smartphone,
    MessageCircle
} from 'lucide-react';

const pendingReviews = [
    {
        id: 1,
        lead: 'Juan Delgado',
        originalMsg: '¿Cuál es el precio del servicio?',
        aiDraft: '¡Hola Juan! Qué bueno que preguntes. Nuestros planes de SEO comienzan desde los $299/mes, adaptándonos al tamaño de tu negocio. ¿Te gustaría que agendemos una breve llamada para ver cuál te conviene más?',
        status: 'pending'
    }
];

export default function MessagesPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Centro de Mensajería</h1>
                    <p className="text-slate-400 mt-1">Revisa y aprueba los seguimientos generados por la IA.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pending Reviews List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Pendientes de Revisión</h2>
                    <div className="space-y-3">
                        {pendingReviews.map((review) => (
                            <div key={review.id} className="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl hover:bg-slate-800/80 transition-all cursor-pointer ring-1 ring-indigo-500/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                        JD
                                    </div>
                                    <span className="text-sm font-bold text-white">{review.lead}</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-4 line-clamp-2 italic">"{review.originalMsg}"</p>
                                <div className="flex gap-2">
                                    <button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                                        <Check className="w-3 h-3" /> Aprobar
                                    </button>
                                    <button className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-all">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Interface Preview */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl h-[600px] flex flex-col overflow-hidden backdrop-blur-sm">
                        {/* Chat Header */}
                        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20">
                                    JD
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Juan Delgado</h3>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">WhatsApp Oficial</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><Smartphone className="w-4 h-4" /></button>
                                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><MessageCircle className="w-4 h-4" /></button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://w0.peakpx.com/wallpaper/580/630/wallpaper-whatsapp-dark-mode.jpg')] bg-repeat bg-center bg-fixed opacity-90">
                            <div className="flex justify-start">
                                <div className="bg-slate-800 text-slate-200 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm shadow-sm border border-slate-700">
                                    {pendingReviews[0].originalMsg}
                                    <span className="block text-[10px] text-slate-500 mt-1 text-right">14:20</span>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-lg shadow-indigo-600/10">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-200 mb-1 uppercase tracking-widest">
                                        <Sparkles className="w-3 h-3" /> Borrador IA
                                    </div>
                                    {pendingReviews[0].aiDraft}
                                    <span className="block text-[10px] text-indigo-200/60 mt-1 text-right italic">Esperando aprobación...</span>
                                </div>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                            <div className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Escribe un mensaje o deja que la IA responda..."
                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-300 placeholder:text-slate-600"
                                />
                                <button className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all active:scale-95">
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
