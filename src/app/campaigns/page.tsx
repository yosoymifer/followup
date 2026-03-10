"use client";

import React, { useState, useEffect } from "react";
import {
    Plus, Play, Pause, Trash2, Send, BarChart3, AlertTriangle,
    Sparkles, FileText, Settings2, Clock, CheckCircle, XCircle
} from "lucide-react";

interface Campaign {
    id: string;
    name: string;
    message: string;
    useAI: boolean;
    segment: any;
    status: string;
    totalLeads: number;
    sentCount: number;
    batchSize: number;
    scheduledAt: string | null;
    createdAt: string;
}

interface Template {
    id: string;
    name: string;
    content: string;
    language: string;
    components?: any[];
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sendingBatchId, setSendingBatchId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState("");

    // New campaign form
    const [name, setName] = useState("");
    const [messageType, setMessageType] = useState<"FIXED" | "AI" | "TEMPLATE">("FIXED");
    const [message, setMessage] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [batchSize, setBatchSize] = useState(50);
    const [excludeActive, setExcludeActive] = useState(true);
    const [targetType, setTargetType] = useState<"ALL" | "LIST" | "TAGS" | "TEST_NUMBERS">("ALL");
    const [testNumbers, setTestNumbers] = useState("");
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [excludeTags, setExcludeTags] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [headerImageUrl, setHeaderImageUrl] = useState("");
    const [lists, setLists] = useState<any[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [syncingTemplates, setSyncingTemplates] = useState(false);

    // Media Library
    const [mediaItems, setMediaItems] = useState<any[]>([]);
    const [showingMedia, setShowingMedia] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const fetchCampaigns = async () => {
        try {
            const [cRes, tRes, tagsRes, listsRes] = await Promise.all([
                fetch("/api/campaigns"),
                fetch("/api/templates"),
                fetch("/api/tags"),
                fetch("/api/lists")
            ]);
            if (cRes.ok) {
                const data = await cRes.json();
                setCampaigns(data.campaigns || []);
            }
            if (tRes.ok) {
                const data = await tRes.json();
                setTemplates(data.templates || []);
                if (data.templates?.length > 0) {
                    setSelectedTemplate(data.templates[0].name);
                }
            }
            if (tagsRes.ok) {
                const data = await tagsRes.json();
                setAvailableTags(data.tags || []);
            }
            if (listsRes.ok) {
                const data = await listsRes.json();
                setLists(data.lists || []);
            }
            // Also fetch media
            const mRes = await fetch("/api/media");
            if (mRes.ok) {
                const data = await mRes.json();
                setMediaItems(data.media || []);
            }
        } catch (e) {
            console.error("Error fetching data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCampaigns(); }, []);

    const fetchMedia = async () => {
        try {
            const res = await fetch("/api/media");
            if (res.ok) {
                const data = await res.json();
                setMediaItems(data.media || []);
            }
        } catch (e) { console.error(e); }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        showFb("⏳ Subiendo...");
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) {
                showFb("✅ Imagen cargada correctamente");
                setHeaderImageUrl(data.media.url);
                fetchMedia();
            } else {
                showFb("❌ Error: " + data.error);
                console.error("Upload error details:", data.error);
            }
        } catch (err) {
            showFb("❌ Error de red al subir");
            console.error("Upload network error:", err);
        } finally { setIsUploading(false); }
    };

    const showFb = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(""), 3000);
    };

    const handleCreate = async () => {
        const finalMessage = messageType === "TEMPLATE" ? selectedTemplate : message;
        if (!name.trim() || !finalMessage.trim()) return;

        setSaving(true);
        try {
            const segment: any = { excludeActive, targetType };

            if (targetType === "TAGS" && filterTags.length > 0) {
                segment.tags = filterTags;
            }
            if (targetType === "LIST" && selectedListId) {
                segment.listId = selectedListId;
            }
            if (targetType === "TEST_NUMBERS" && testNumbers.trim().length > 0) {
                segment.testNumbers = testNumbers.split(',').map(n => n.trim()).filter(Boolean);
            }
            if (excludeTags.length > 0) {
                segment.excludeTags = excludeTags;
            }
            if (headerImageUrl) {
                segment.headerImageUrl = headerImageUrl;
            }

            const res = await fetch("/api/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    message: finalMessage,
                    useAI: messageType === "AI",
                    batchSize,
                    segment,
                    scheduledAt: scheduledAt || null,
                    isTemplate: messageType === "TEMPLATE"
                }),
            });
            const data = await res.json();
            if (data.success) {
                showFb("✅ Campaña creada");
                setShowNew(false);
                setName("");
                setMessage("");
                setFilterTags([]);
                setExcludeTags([]);
                setSelectedListId("");
                setScheduledAt("");
                setHeaderImageUrl("");
                fetchCampaigns();
            } else {
                showFb("❌ " + data.error);
            }
        } catch {
            showFb("❌ Error de conexión");
        } finally {
            setSaving(false);
        }
    };

    const handleSyncTemplates = async () => {
        setSyncingTemplates(true);
        try {
            const res = await fetch("/api/templates/sync", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                showFb("✅ " + data.message);
                fetchCampaigns(); // refresh dropdown
            } else {
                showFb("❌ " + data.error);
            }
        } catch {
            showFb("❌ Error al sincronizar plantillas");
        } finally {
            setSyncingTemplates(false);
        }
    };

    const handleProcessBatch = async (id: string, defaultBatchSize: number) => {
        const input = window.prompt(`¿Cuántos leads quieres procesar en este lote?`, defaultBatchSize.toString());
        if (!input) return;
        const batchSizeOverride = parseInt(input);
        if (isNaN(batchSizeOverride) || batchSizeOverride <= 0) return;

        setSendingBatchId(id);
        try {
            const res = await fetch("/api/campaigns/send-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaignId: id, batchSizeOverride }),
            });
            const data = await res.json();
            if (data.success) {
                showFb(`✅ Lote finalizado. Procesados: ${data.processed}. Éxitos: ${data.successCount}, Fallos: ${data.failCount}`);
                fetchCampaigns();
            } else {
                showFb("❌ Error: " + data.error);
            }
        } catch {
            showFb("❌ Error de conexión al procesar");
        } finally {
            setSendingBatchId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta campaña?")) return;
        try {
            await fetch(`/api/campaigns?id=${id}`, { method: "DELETE" });
            showFb("✅ Campaña eliminada");
            fetchCampaigns();
        } catch {
            showFb("❌ Error");
        }
    };

    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
        DRAFT: { color: "slate", icon: <FileText className="w-4 h-4" />, label: "Borrador" },
        ACTIVE: { color: "emerald", icon: <Play className="w-4 h-4" />, label: "Activa" },
        PAUSED: { color: "amber", icon: <Pause className="w-4 h-4" />, label: "Pausada" },
        COMPLETED: { color: "indigo", icon: <CheckCircle className="w-4 h-4" />, label: "Completada" },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Campañas</h1>
                    <p className="text-slate-400 mt-1">Envío masivo de mensajes por WhatsApp para promociones y lanzamientos.</p>
                </div>
                <button
                    onClick={() => setShowNew(!showNew)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Nueva Campaña
                </button>
            </div>

            {feedback && (
                <div className="fixed bottom-6 right-6 z-[110] bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl text-sm text-white shadow-2xl animate-in slide-in-from-right-10 duration-300 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    {feedback}
                </div>
            )}

            {/* Safety Reminder */}
            <div className="bg-slate-900/50 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm text-indigo-200 font-medium">Control Manual de Envíos (V2)</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Tú tienes el control absoluto. Usa el botón "Procesar Lote" en cada campaña para realizar envíos masivos progresivos a tu ritmo. Esto protege tu cuenta de Meta contra bloqueos por picos de tráfico.
                    </p>
                </div>
            </div>

            {/* New Campaign Form */}
            {showNew && (
                <div className="bg-slate-900/50 border border-indigo-500/30 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
                    <h2 className="text-lg font-bold text-white">Nueva Campaña</h2>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nombre de la campaña (ej: Promo Navidad 2026)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />

                    <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <button
                            onClick={() => setMessageType("FIXED")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${messageType === "FIXED"
                                ? "bg-indigo-500 text-white"
                                : "text-slate-400 hover:text-slate-300"
                                }`}
                        >
                            <FileText className="w-4 h-4" /> Texto Fijo
                        </button>
                        <button
                            onClick={() => setMessageType("TEMPLATE")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${messageType === "TEMPLATE"
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                                : "text-slate-400 hover:text-slate-300"
                                }`}
                        >
                            <Sparkles className="w-4 h-4" /> Plantilla Meta
                        </button>
                        <button
                            onClick={() => setMessageType("AI")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${messageType === "AI"
                                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                                : "text-slate-400 hover:text-slate-300"
                                }`}
                        >
                            <Sparkles className="w-4 h-4" /> IA
                        </button>
                    </div>

                    {messageType === "TEMPLATE" ? (
                        <div className="space-y-2 relative">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase">Selecciona una Plantilla Aprobada</label>
                                <button
                                    onClick={handleSyncTemplates}
                                    disabled={syncingTemplates}
                                    className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase transition flex items-center gap-1 disabled:opacity-50"
                                    title="Sincronizar directamente con Meta"
                                >
                                    {syncingTemplates ? <div className="w-3 h-3 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin" /> : "↺ Sincronizar"}
                                </button>
                            </div>
                            {templates.length > 0 ? (
                                <select
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                >
                                    {templates.map(t => (
                                        <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm">
                                    No tienes plantillas registradas. Se usarán de prueba internamente.
                                </div>
                            )}
                            {selectedTemplate && templates.find(t => t.name === selectedTemplate) && (
                                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-400 italic">
                                    "{templates.find(t => t.name === selectedTemplate)?.content}"
                                </div>
                            )}

                            {selectedTemplate && templates.find(t => t.name === selectedTemplate)?.components?.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-500 uppercase">
                                            Imagen de Cabecera (Obligatorio)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => { fetchMedia(); setShowingMedia(true); }}
                                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase transition-colors"
                                        >
                                            Ver Biblioteca
                                        </button>
                                    </div>

                                    <div className="flex gap-3">
                                        <input
                                            value={headerImageUrl}
                                            onChange={(e) => setHeaderImageUrl(e.target.value)}
                                            placeholder="URL de imagen o sube un archivo..."
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        />
                                        <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-4 flex items-center justify-center transition-colors">
                                            {isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
                                        </label>
                                    </div>

                                    {headerImageUrl && (
                                        <div className="relative group w-full max-w-sm aspect-video rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-xl shadow-indigo-500/10">
                                            <img src={headerImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                                                <p className="text-[10px] text-white font-bold uppercase tracking-widest">Vista previa de cabecera</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setHeaderImageUrl("")}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-all shadow-lg"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={messageType === "AI"
                                ? "Prompt para la IA: ej. 'Genera un mensaje promocional sobre nuestro descuento del 20% en servicios de SEO...'"
                                : "Mensaje de texto. Usa {{firstName}} y {{lastName}} como variables."
                            }
                            rows={4}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                        />
                    )}

                    {/* TARGETING UI REVAMP */}
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">1. ¿A quién enviaremos?</label>
                            <div className="flex gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setTargetType("ALL")}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${targetType === "ALL" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-slate-300"}`}
                                >
                                    Toda la base
                                </button>
                                <button
                                    onClick={() => setTargetType("LIST")}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${targetType === "LIST" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-slate-300"}`}
                                >
                                    A una Lista
                                </button>
                                <button
                                    onClick={() => setTargetType("TAGS")}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${targetType === "TAGS" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-slate-300"}`}
                                >
                                    Por Etiquetas
                                </button>
                                <button
                                    onClick={() => setTargetType("TEST_NUMBERS")}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${targetType === "TEST_NUMBERS" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-slate-300"}`}
                                >
                                    Para Pruebas (Números)
                                </button>
                            </div>
                        </div>

                        {/* Additional Pickers based on Target Type */}
                        {targetType === "TEST_NUMBERS" && (
                            <div className="space-y-2 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                                <label className="text-xs font-bold text-slate-500 uppercase">Lista de Números de Prueba</label>
                                <p className="text-[10px] text-slate-500">Separados por coma y con código de país (ej. +573001234567, +14155552671)</p>
                                <textarea
                                    value={testNumbers}
                                    onChange={(e) => setTestNumbers(e.target.value)}
                                    placeholder="+573001234567, +14155552671"
                                    rows={3}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                                />
                            </div>
                        )}

                        {targetType === "LIST" && (
                            <div className="space-y-2 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                                <label className="text-xs font-bold text-slate-500 uppercase">Selecciona la Lista Mágica</label>
                                <select
                                    value={selectedListId}
                                    onChange={(e) => setSelectedListId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="">Seleccione una lista...</option>
                                    {lists.map(list => (
                                        <option key={list.id} value={list.id}>{list.name} ({list._count?.leads || 0} leads)</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {targetType === "TAGS" && (
                            <div className="space-y-2 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                                <label className="text-xs font-bold text-slate-500 uppercase">Incluir estas etiquetas</label>
                                {availableTags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                        {availableTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => {
                                                    if (filterTags.includes(tag)) setFilterTags(filterTags.filter(t => t !== tag));
                                                    else setFilterTags([...filterTags, tag]);
                                                }}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterTags.includes(tag) ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-500 italic">No hay etiquetas creadas.</div>
                                )}
                            </div>
                        )}

                        {/* EXCLUSIONS ARE ALWAYS AVAILABLE */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                            <label className="text-xs font-bold text-red-500/80 uppercase">2. Excluir Etiquetas (Inverso) [Opcional]</label>
                            {availableTags.length > 0 ? (
                                <div className="flex flex-wrap gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl max-h-32 overflow-y-auto">
                                    {availableTags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                if (excludeTags.includes(tag)) setExcludeTags(excludeTags.filter(t => t !== tag));
                                                else setExcludeTags([...excludeTags, tag]);
                                            }}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${excludeTags.includes(tag) ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 italic">No hay etiquetas creadas.</div>
                            )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-800">
                            <label className="text-xs font-bold text-slate-500 uppercase">3. Tamaño de lote</label>
                            <input
                                type="number"
                                value={batchSize}
                                onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
                                className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                            <Clock className="w-4 h-4" /> Programar Envío (Opcional)
                        </label>
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                        />
                        <p className="text-[10px] text-slate-500">Déjalo en blanco para permitir la ejecución manual de la campaña a tu propio ritmo.</p>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={excludeActive}
                            onChange={(e) => setExcludeActive(e.target.checked)}
                            className="rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        Excluir leads que ya están en una secuencia activa
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={saving || !name.trim() || (messageType === "TEMPLATE" ? !selectedTemplate : !message.trim())}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" /> {saving ? "Creando..." : "Crear Campaña"}
                        </button>
                    </div>
                </div>
            )
            }

            {/* Campaign List */}
            <div className="space-y-4">
                {campaigns.length === 0 && !showNew && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                        <Send className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No hay campañas</p>
                        <p className="text-sm text-slate-600 mt-1">Crea tu primera campaña para enviar mensajes masivos.</p>
                    </div>
                )}

                {campaigns.map((campaign) => {
                    const progress = campaign.totalLeads > 0 ? (campaign.sentCount / campaign.totalLeads) * 100 : 0;
                    const sc = statusConfig[campaign.status] || statusConfig.DRAFT;

                    return (
                        <div key={campaign.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-${sc.color}-500/10`}>
                                        {sc.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
                                        <span className={`text-xs font-bold text-${sc.color}-400 uppercase`}>{sc.label}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {campaign.status !== "COMPLETED" && (
                                        <button
                                            onClick={() => handleProcessBatch(campaign.id, campaign.batchSize)}
                                            disabled={sendingBatchId === campaign.id}
                                            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {sendingBatchId === campaign.id ? (
                                                <><div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Procesando...</>
                                            ) : (
                                                <><Play className="w-3 h-3" /> Procesar Lote ({campaign.batchSize})</>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(campaign.id)}
                                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-red-500/10 rounded-lg transition-all border border-slate-700"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Progreso</span>
                                    <span className="text-slate-400 font-mono">{campaign.sentCount} / {campaign.totalLeads}</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-3">
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">
                                    Lote: {campaign.batchSize}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded flex items-center gap-1">
                                    {campaign.useAI ? <><Sparkles className="w-3 h-3 text-purple-400" /> IA</> : <><FileText className="w-3 h-3" /> Fijo / Plantilla</>}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Media Library Modal */}
            {showingMedia && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h3 className="font-bold text-white text-lg">Biblioteca de Medios</h3>
                                <p className="text-xs text-slate-500">Selecciona una imagen previamente subida</p>
                            </div>
                            <button
                                onClick={() => setShowingMedia(false)}
                                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <XCircle className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {mediaItems.length === 0 && (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-3 opacity-50">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                                        <Plus className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <p className="text-sm">No has subido ninguna imagen todavía.</p>
                                </div>
                            )}

                            {mediaItems.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => { setHeaderImageUrl(m.url); setShowingMedia(false); }}
                                    className="group relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 hover:border-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                                >
                                    <img src={m.url} alt={m.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                                        <p className="text-[10px] text-white font-bold truncate">{m.name}</p>
                                    </div>
                                    <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full scale-0 group-hover:scale-100 transition-transform duration-200 shadow-lg">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <p className="text-xs text-slate-500">Usa el botón "+" en el formulario para subir más imágenes.</p>
                            <button
                                onClick={() => setShowingMedia(false)}
                                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
