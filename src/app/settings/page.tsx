"use client";

import React, { useState, useEffect } from "react";
import {
    Settings,
    Key,
    Globe,
    Shield,
    Database,
    Smartphone,
    CheckCircle2,
    Save,
    Eye,
    EyeOff,
    Loader2,
    Download,
    ArrowRight
} from "lucide-react";

interface OrgSettings {
    name: string;
    ghlAccessToken: string | null;
    ghlLocationId: string | null;
    ghlPipelineId: string | null;
    ghlStageMap: Record<string, string> | null;
    waPhoneNumberId: string | null;
    waAccessToken: string | null;
    defaultSequenceId: string | null;
    masterPrompt: string | null;
}

interface GHLStage {
    id: string;
    name: string;
    position: number;
}

interface GHLPipeline {
    id: string;
    name: string;
    stages: GHLStage[];
}

// Internal statuses that can be mapped to GHL stages
const APP_STATUSES = [
    { key: "NEW", label: "Nuevo Lead" },
    { key: "CONTACTED", label: "Contactado" },
    { key: "IN_CONVERSATION", label: "En Conversación" },
    { key: "RESPONDED", label: "Respondió" },
    { key: "ESCALATED", label: "Escalado a Closer" },
    { key: "WON", label: "Ganado" },
    { key: "LOST", label: "Perdido" },
];

export default function SettingsPage() {
    const [settings, setSettings] = useState<OrgSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

    // GHL credentials
    const [ghlAccessToken, setGhlAccessToken] = useState("");
    const [ghlLocationId, setGhlLocationId] = useState("");

    // AI Context
    const [masterPrompt, setMasterPrompt] = useState("");

    // Pipeline selector
    const [pipelines, setPipelines] = useState<GHLPipeline[]>([]);
    const [selectedPipeline, setSelectedPipeline] = useState<string>("");
    const [stageMap, setStageMap] = useState<Record<string, string>>({});
    const [loadingPipelines, setLoadingPipelines] = useState(false);
    const [pipelineError, setPipelineError] = useState("");

    // WA credentials
    const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
    const [waAccessToken, setWaAccessToken] = useState("");

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                // Set the input values to the masked strings received from API
                setGhlAccessToken(data.ghlAccessToken || "");
                setGhlLocationId(data.ghlLocationId || "");
                setSelectedPipeline(data.ghlPipelineId || "");
                setStageMap(data.ghlStageMap || {});
                setWaPhoneNumberId(data.waPhoneNumberId || "");
                setWaAccessToken(data.waAccessToken || "");
                setMasterPrompt(data.masterPrompt || "");
            }
        } catch (e) {
            console.error("Error fetching settings:", e);
        } finally {
            setLoading(false);
        }
    };

    const showFb = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(""), 4000);
    };

    const fetchPipelines = async () => {
        setLoadingPipelines(true);
        setPipelineError("");
        try {
            const res = await fetch("/api/ghl/pipelines");
            const data = await res.json();
            if (res.ok) {
                setPipelines(data.pipelines || []);
                if (data.pipelines.length === 0) {
                    setPipelineError("No se encontraron pipelines en tu cuenta de GHL.");
                } else {
                    showFb(`✅ Se encontraron ${data.pipelines.length} pipeline(s)`);
                    // Auto-select first pipeline if none selected
                    if (!selectedPipeline && data.pipelines.length > 0) {
                        setSelectedPipeline(data.pipelines[0].id);
                    }
                }
            } else {
                setPipelineError(data.error || "Error al obtener pipelines");
            }
        } catch {
            setPipelineError("Error de conexión al obtener pipelines");
        } finally {
            setLoadingPipelines(false);
        }
    };

    const handleSave = async (section: string) => {
        setSaving(true);
        let body: any = {};

        // Helper to check if a token value is actually a new token (not masked)
        const isNewToken = (val: string) => val && !val.includes("•••••");

        if (section === "ghl") {
            if (isNewToken(ghlAccessToken)) body.ghlAccessToken = ghlAccessToken;
            if (ghlLocationId) body.ghlLocationId = ghlLocationId;
            if (selectedPipeline) body.ghlPipelineId = selectedPipeline;
            // Only save stage map entries that have a value
            const cleanMap: Record<string, string> = {};
            for (const [key, value] of Object.entries(stageMap)) {
                if (value) cleanMap[key] = value;
            }
            if (Object.keys(cleanMap).length > 0) body.ghlStageMap = cleanMap;
        } else if (section === "wa") {
            if (isNewToken(waAccessToken)) body.waAccessToken = waAccessToken;
            if (waPhoneNumberId) body.waPhoneNumberId = waPhoneNumberId;
        } else if (section === "ai") {
            body.masterPrompt = masterPrompt;
        }


        if (Object.keys(body).length === 0) {
            showFb("⚠️ No hay cambios para guardar");
            setSaving(false);
            return;
        }

        try {
            const res = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                showFb("✅ Configuración guardada");
                fetchSettings();
            } else {
                showFb("❌ " + data.error);
            }
        } catch {
            showFb("❌ Error de conexión");
        } finally {
            setSaving(false);
        }
    };

    const toggleToken = (key: string) => {
        setShowTokens(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Get stages for the currently selected pipeline
    const currentPipelineStages = pipelines.find(p => p.id === selectedPipeline)?.stages || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Configuración</h1>
                    <p className="text-slate-400 mt-1">Gestiona tus integraciones y credenciales de API.</p>
                </div>
            </div>

            {feedback && (
                <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-sm text-slate-300 animate-pulse">
                    {feedback}
                </div>
            )}

            {/* AI Context Settings */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-purple-500/10 p-2 rounded-lg">
                        <Settings className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Master Prompt (Contexto IA)</h2>
                        <p className="text-xs text-slate-500">Instrucciones globales sobre tu negocio, ofertas y productos para la IA.</p>
                    </div>
                </div>

                <div>
                    <textarea
                        value={masterPrompt}
                        onChange={(e) => setMasterPrompt(e.target.value)}
                        placeholder="Ejemplo: Nuestro programa tiene 3 bonos: 1. Mentoria grupal, 2. Plantillas, 3. Comunidad. El precio es $997."
                        rows={6}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y"
                    />
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => handleSave("ai")}
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Prompt
                    </button>
                </div>
            </div>

            {/* GHL Settings */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-500/10 p-2 rounded-lg">
                        <Globe className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Go High Level (GHL)</h2>
                        <p className="text-xs text-slate-500">Conecta tu cuenta de GHL V2 para sincronizar leads y pipeline.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Access Token */}
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Token (JWT o PIT)</label>
                            <a href="https://marketplace.gohighlevel.com/docs/getting-started" target="_blank" className="text-[10px] text-blue-400 hover:underline">¿Cómo obtenerlo?</a>
                        </div>
                        <div className="relative">
                            <input
                                type={showTokens.ghl ? "text" : "password"}
                                value={ghlAccessToken}
                                onChange={(e) => setGhlAccessToken(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 pr-10 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                            <button type="button" onClick={() => toggleToken("ghl")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                {showTokens.ghl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Location ID */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Location ID</label>
                        <input
                            value={ghlLocationId}
                            onChange={(e) => setGhlLocationId(e.target.value)}
                            placeholder="ej: cqxFPznq5HKPGBzOwRvC"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    {/* Pipeline & Stage Mapping - Auto-fetch */}
                    <div className="border-t border-slate-800 pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pipeline y Etapas</label>
                            <button
                                onClick={fetchPipelines}
                                disabled={loadingPipelines}
                                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-500/20 disabled:opacity-50"
                            >
                                {loadingPipelines ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Download className="w-3 h-3" />
                                )}
                                {loadingPipelines ? "Cargando..." : "Obtener de GHL"}
                            </button>
                        </div>

                        {pipelineError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-3">
                                {pipelineError}
                            </div>
                        )}

                        {pipelines.length > 0 && (
                            <div className="space-y-4">
                                {/* Pipeline selector */}
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Selecciona tu Pipeline</label>
                                    <select
                                        value={selectedPipeline}
                                        onChange={(e) => setSelectedPipeline(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                                    >
                                        <option value="">-- Selecciona --</option>
                                        {pipelines.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Stage mapping */}
                                {currentPipelineStages.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-xs text-slate-500">
                                            Mapea cada estado de la App a una etapa de tu pipeline en GHL:
                                        </p>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
                                            {APP_STATUSES.map((status) => (
                                                <div key={status.key} className="flex items-center gap-3">
                                                    <div className="w-40 flex-shrink-0">
                                                        <span className="text-sm text-slate-300 font-medium">{status.label}</span>
                                                        <span className="text-[10px] text-slate-600 ml-1.5 font-mono">({status.key})</span>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                                    <select
                                                        value={stageMap[status.key] || ""}
                                                        onChange={(e) => setStageMap(prev => ({ ...prev, [status.key]: e.target.value }))}
                                                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer"
                                                    >
                                                        <option value="">-- Sin mapear --</option>
                                                        {currentPipelineStages.map((stage) => (
                                                            <option key={stage.id} value={stage.id}>
                                                                {stage.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {pipelines.length === 0 && !loadingPipelines && (
                            <p className="text-xs text-slate-600 mt-1">
                                Guarda primero tu Access Token y Location ID, luego haz clic en "Obtener de GHL" para cargar tus pipelines automáticamente.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => handleSave("ghl")}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar GHL
                    </button>
                </div>
            </div>

            {/* WhatsApp Settings */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <Smartphone className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">WhatsApp Cloud API</h2>
                        <p className="text-xs text-slate-500">Configura la API de WhatsApp para enviar mensajes automáticos.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Access Token</label>
                        <div className="relative">
                            <input
                                type={showTokens.wa ? "text" : "password"}
                                value={waAccessToken}
                                onChange={(e) => setWaAccessToken(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 pr-10 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                            <button type="button" onClick={() => toggleToken("wa")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                {showTokens.wa ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Phone Number ID</label>
                        <input
                            value={waPhoneNumberId}
                            onChange={(e) => setWaPhoneNumberId(e.target.value)}
                            placeholder="ej: 968503396348147"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => handleSave("wa")}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar WhatsApp
                    </button>
                </div>
            </div>

            {/* API Secret Info */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-amber-500/10 p-2 rounded-lg">
                        <Shield className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">API Secret (n8n)</h2>
                        <p className="text-xs text-slate-500">Usa este secret en tus flujos de n8n como header <code className="bg-slate-800 px-1 rounded">x-api-secret</code>.</p>
                    </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-400 flex items-center justify-between">
                    <span>Configurado en variables de entorno (.env)</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
            </div>
        </div>
    );
}
