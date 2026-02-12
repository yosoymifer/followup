"use client";

import React, { useState } from 'react';
import { Sparkles, Send, MessageSquare, X } from 'lucide-react';
import { generateAIAction } from '@/app/actions/ai';
import { sendManualMessage } from '@/app/leads/actions';

export function LeadActions({ leadId, leadName }: { leadId: string; leadName: string }) {
    const [showModal, setShowModal] = useState(false);
    const [manualMsg, setManualMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [feedback, setFeedback] = useState('');

    const handleManualSend = async () => {
        if (!manualMsg.trim()) return;
        setLoading(true);
        try {
            const res = await sendManualMessage(leadId, manualMsg);
            if (res.error) {
                setFeedback('❌ ' + res.error);
            } else {
                setFeedback('✅ Mensaje enviado');
                setManualMsg('');
                setTimeout(() => { setShowModal(false); setFeedback(''); }, 1500);
            }
        } catch {
            setFeedback('❌ Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAI = async () => {
        setAiLoading(true);
        try {
            const res = await generateAIAction(leadId);
            if (res.error) {
                setFeedback('❌ ' + res.error);
            } else {
                setFeedback('✅ Borrador IA creado. Revísalo en el Dashboard.');
                setTimeout(() => { setFeedback(''); }, 3000);
            }
        } catch {
            setFeedback('❌ Error al generar');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <>
            <div className="flex gap-1">
                <button
                    onClick={() => setShowModal(true)}
                    className="p-2 hover:bg-indigo-500/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"
                    title="Enviar mensaje"
                >
                    <MessageSquare className="w-4 h-4" />
                </button>
                <button
                    onClick={handleGenerateAI}
                    disabled={aiLoading}
                    className="p-2 hover:bg-purple-500/10 rounded-lg text-slate-400 hover:text-purple-400 transition-all disabled:opacity-50"
                    title="Generar con IA"
                >
                    <Sparkles className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {feedback && !showModal && (
                <div className="absolute right-6 mt-1 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 shadow-xl z-50">
                    {feedback}
                </div>
            )}

            {/* Manual Message Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Mensaje para {leadName}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <textarea
                            value={manualMsg}
                            onChange={(e) => setManualMsg(e.target.value)}
                            placeholder="Escribe tu mensaje aquí..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-32"
                        />

                        {feedback && (
                            <p className="text-sm mt-2 text-slate-400">{feedback}</p>
                        )}

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleManualSend}
                                disabled={loading || !manualMsg.trim()}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                {loading ? 'Enviando...' : 'Enviar por WhatsApp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
