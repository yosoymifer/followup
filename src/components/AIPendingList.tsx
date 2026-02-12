"use client";

import React, { useState } from 'react';
import { Sparkles, Send, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { sendAIAction } from '@/app/actions/ai';

interface DraftMessage {
    id: string;
    content: string;
    lead: {
        firstName: string;
        lastName: string;
    };
}

export function AIPendingList({ drafts }: { drafts: DraftMessage[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleSend = async (id: string) => {
        setLoadingId(id);
        try {
            const res = await sendAIAction(id);
            if (res.error) alert(res.error);
        } catch (err) {
            alert("Error al enviar el mensaje");
        } finally {
            setLoadingId(null);
        }
    };

    if (drafts.length === 0) return null;

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500/10 p-2 rounded-xl">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">Propuestas de la IA</h2>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wider">Requieren tu aprobación antes de enviarse</p>
                    </div>
                </div>
                <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30">
                    {drafts.length} Pendientes
                </span>
            </div>

            <div className="divide-y divide-slate-800">
                {drafts.map((draft) => (
                    <div key={draft.id} className="p-6 hover:bg-slate-800/20 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                                {draft.lead.firstName} {draft.lead.lastName}
                            </h3>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-500 hover:text-white transition-all">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-slate-800 italic group-hover:border-indigo-500/30 transition-colors">
                            "{draft.content}"
                        </p>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => handleSend(draft.id)}
                                disabled={loadingId === draft.id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {loadingId === draft.id ? (
                                    "Enviando..."
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Aprobar y Enviar (WA)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
