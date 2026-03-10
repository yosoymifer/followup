"use client";

import React, { useState, useEffect } from 'react';
import { Trash2, X } from 'lucide-react';

export default function ClearLeadsButton() {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [lists, setLists] = useState<any[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>("ALL");

    useEffect(() => {
        if (showModal) {
            fetch('/api/lists')
                .then(res => res.json())
                .then(data => {
                    if (data.lists) setLists(data.lists);
                })
                .catch(console.error);
        }
    }, [showModal]);

    const handleClear = async () => {
        const isAll = selectedListId === "ALL";
        const message = isAll
            ? '⚠️ ¿Estás seguro? Esto borrará TODOS los leads y mensajes. Esta acción no se puede deshacer.'
            : '⚠️ ¿Estás seguro? Esto borrará la LISTA seleccionada y todos sus LEADS. Esta acción no se puede deshacer.';

        if (!confirm(message)) {
            return;
        }

        setLoading(true);
        try {
            const body = isAll ? {} : { listId: selectedListId };
            const response = await fetch('/api/clear-leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.success) {
                alert(`✅ Limpieza exitosa:\n${data.deletedLeads} leads eliminados\n${data.deletedMessages} mensajes eliminados`);
                window.location.reload();
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (err) {
            alert('❌ Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center gap-2"
                title="Limpiar Leads o Listas"
            >
                <Trash2 className="w-4 h-4" />
                Limpiar Leads
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" /> Eliminar Datos
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    ¿Qué deseas eliminar?
                                </label>
                                <select
                                    value={selectedListId}
                                    onChange={e => setSelectedListId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-300"
                                >
                                    <option value="ALL">🚨 TODOS los leads de la cuenta</option>
                                    <optgroup label="Listas Específicas">
                                        {lists.map(list => (
                                            <option key={list.id} value={list.id}>
                                                Lista: {list.name} ({list._count?.leads || 0} leads)
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
                                {selectedListId === "ALL"
                                    ? "Se eliminarán todos los leads, mensajes y listas de tu cuenta de forma permanente."
                                    : "Se eliminará la lista seleccionada y todos los leads que pertenezcan a ella."}
                            </p>

                            <button
                                onClick={handleClear}
                                disabled={loading}
                                className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {loading ? 'Eliminando...' : 'Confirmar Eliminación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
