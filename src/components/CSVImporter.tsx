"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, ListPlus } from 'lucide-react';

interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    total: number;
    errors?: string[];
    error?: string;
}

export default function CSVImporter() {
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [importTags, setImportTags] = useState("");
    const [lists, setLists] = useState<any[]>([]);
    const [selectedListId, setSelectedListId] = useState("");
    const [newListName, setNewListName] = useState("");
    const [creatingList, setCreatingList] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const fetchLists = async () => {
            try {
                const res = await fetch('/api/lists');
                if (res.ok) {
                    const data = await res.json();
                    setLists(data.lists || []);
                }
            } catch (e) {
                console.error("Failed to fetch lists", e);
            }
        };
        fetchLists();
    }, []);

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        setCreatingList(true);
        try {
            const res = await fetch('/api/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newListName.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setLists(prev => [data.list, ...prev]);
                setSelectedListId(data.list.id);
                setNewListName("");
            }
        } catch (e) {
            console.error("Error creating list", e);
        } finally {
            setCreatingList(false);
        }
    };

    const handleFile = async (file: File) => {
        if (!file.name.match(/\.(csv|txt)$/i)) {
            setResult({ success: false, imported: 0, skipped: 0, total: 0, error: 'Solo se aceptan archivos .csv' });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            if (importTags.trim()) formData.append('tags', importTags.trim());
            if (selectedListId && selectedListId !== 'NEW') formData.append('listId', selectedListId);

            const response = await fetch('/api/import-csv', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            setResult(data);

            if (data.success) {
                // Reload page to show new leads
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (err) {
            setResult({ success: false, imported: 0, skipped: 0, total: 0, error: 'Error de conexión' });
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/50 p-4 border border-slate-700/50 rounded-2xl">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Etiquetas a aplicar a todos los leads importados (Opcional, separadas por coma)
                </label>
                <input
                    type="text"
                    value={importTags}
                    onChange={(e) => setImportTags(e.target.value)}
                    placeholder="Ejemplo: lanzamiento_marzo, referidos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300 placeholder:text-slate-600 mb-4"
                />

                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Lista de Destino (Opcional)
                </label>
                <div className="flex gap-2 items-start">
                    <select
                        value={selectedListId}
                        onChange={(e) => setSelectedListId(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300"
                    >
                        <option value="">Sin Lista</option>
                        {lists.map(list => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                        ))}
                        <option value="NEW">+ Crear nueva lista</option>
                    </select>

                    {selectedListId === 'NEW' && (
                        <div className="flex flex-1 gap-2">
                            <input
                                autoFocus
                                type="text"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="Nombre de lista..."
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300"
                            />
                            <button
                                onClick={handleCreateList}
                                disabled={creatingList || !newListName.trim()}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-xl flex items-center justify-center transition-all"
                            >
                                <ListPlus className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                    ${dragActive
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30'
                    }
                    ${loading ? 'opacity-50 pointer-events-none' : ''}
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />

                <div className="flex flex-col items-center gap-3">
                    {loading ? (
                        <>
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-300 font-bold">Importando leads...</p>
                        </>
                    ) : (
                        <>
                            <div className="bg-slate-800 p-4 rounded-2xl">
                                <Upload className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-lg">Arrastra tu archivo CSV aquí</p>
                                <p className="text-slate-500 text-sm mt-1">o haz clic para seleccionarlo</p>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl mt-2">
                                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                                <span className="text-xs text-slate-400">Columnas: nombre, telefono, email, etiquetas</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Result */}
            {result && (
                <div className={`rounded-2xl p-5 flex items-start gap-4 ${result.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    {result.success ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                        {result.success ? (
                            <>
                                <p className="text-emerald-300 font-bold">¡Importación exitosa!</p>
                                <p className="text-slate-400 text-sm mt-1">
                                    {result.imported} importados • {result.skipped} omitidos (duplicados) • {result.total} total
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-red-300 font-bold">Error en la importación</p>
                                <p className="text-slate-400 text-sm mt-1">{result.error}</p>
                            </>
                        )}
                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-2 text-xs text-slate-500">
                                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                            </div>
                        )}
                    </div>
                    <button onClick={() => setResult(null)} className="text-slate-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
