"use client";

import React, { useState, useEffect } from "react";
import {
    Plus, Trash2, Save, Sparkles, FileText, Clock, Star,
    ChevronDown, ChevronUp, GripVertical, Play, Pause
} from "lucide-react";

interface Step {
    delayDays: number;
    delayHours?: number;
    messageTemplate: string;
    useAI: boolean;
    isTemplate?: boolean;
}


interface Sequence {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    steps: Step[];
    _count?: { leads: number };
}

interface Template {
    id: string;
    name: string;
    content: string;
    language: string;
}

export default function SequencesPage() {
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [defaultSequenceId, setDefaultSequenceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState("");

    // New sequence form
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newSteps, setNewSteps] = useState<Step[]>([
        { delayDays: 0, delayHours: 0, messageTemplate: "", useAI: true, isTemplate: false },
    ]);

    // Edit sequence form
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editSteps, setEditSteps] = useState<Step[]>([]);

    const fetchSequences = async () => {
        try {
            const [sRes, tRes] = await Promise.all([
                fetch("/api/sequences"),
                fetch("/api/templates")
            ]);

            if (sRes.ok) {
                const data = await sRes.json();
                setSequences(data.sequences || []);
                setDefaultSequenceId(data.defaultSequenceId);
            }
            if (tRes.ok) {
                const data = await tRes.json();
                setTemplates(data.templates || []);
            }
        } catch (e) {
            console.error("Error fetching data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSequences(); }, []);

    const showFeedback = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(""), 3000);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/sequences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    description: newDesc,
                    steps: newSteps,
                    isDefault: sequences.length === 0,
                }),
            });
            const data = await res.json();
            if (data.success) {
                showFeedback("✅ Secuencia creada");
                setShowNew(false);
                setNewName("");
                setNewDesc("");
                setNewSteps([{ delayDays: 0, delayHours: 0, messageTemplate: "", useAI: true, isTemplate: false }]);
                fetchSequences();
            } else {
                showFeedback("❌ " + data.error);
            }
        } catch {
            showFeedback("❌ Error de conexión");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id: string) => {
        setSaving(true);
        try {
            const res = await fetch("/api/sequences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    name: editName,
                    description: editDesc,
                    steps: editSteps,
                }),
            });
            const data = await res.json();
            if (data.success) {
                showFeedback("✅ Secuencia actualizada");
                setEditing(null);
                fetchSequences();
            } else {
                showFeedback("❌ " + data.error);
            }
        } catch {
            showFeedback("❌ Error de conexión");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta secuencia? Los leads asignados serán desvinculados.")) return;
        try {
            const res = await fetch(`/api/sequences?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                showFeedback("✅ Secuencia eliminada");
                fetchSequences();
            }
        } catch {
            showFeedback("❌ Error de conexión");
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            const res = await fetch("/api/sequences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isDefault: true }),
            });
            const data = await res.json();
            if (data.success) {
                setDefaultSequenceId(id);
                showFeedback("✅ Secuencia por defecto actualizada");
            }
        } catch {
            showFeedback("❌ Error");
        }
    };

    const startEdit = (seq: Sequence) => {
        setEditing(seq.id);
        setEditName(seq.name);
        setEditDesc(seq.description || "");
        setEditSteps(seq.steps.map(s => ({ ...s })));
    };

    const addStep = (steps: Step[], setter: React.Dispatch<React.SetStateAction<Step[]>>) => {
        const lastDelay = steps.length > 0 ? steps[steps.length - 1].delayDays : 0;
        setter([...steps, { delayDays: lastDelay + 3, delayHours: 0, messageTemplate: "", useAI: true, isTemplate: false }]);
    };

    const removeStep = (steps: Step[], index: number, setter: React.Dispatch<React.SetStateAction<Step[]>>) => {
        setter(steps.filter((_, i) => i !== index));
    };

    const updateStep = (steps: Step[], index: number, field: keyof Step, value: any, setter: React.Dispatch<React.SetStateAction<Step[]>>) => {
        const updated = [...steps];
        (updated[index] as any)[field] = value;
        setter(updated);
    };

    const StepEditor = ({
        steps, setter, prefix
    }: { steps: Step[]; setter: React.Dispatch<React.SetStateAction<Step[]>>; prefix: string }) => (
        <div className="space-y-4">
            {steps.map((step, i) => (
                <div key={`${prefix}-${i}`} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/30">
                                {i + 1}
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <input
                                    type="number"
                                    min="0"
                                    value={step.delayDays}
                                    onChange={(e) => updateStep(steps, i, "delayDays", parseInt(e.target.value) || 0, setter)}
                                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Días"
                                />
                                <span className="text-xs text-slate-500 font-medium">d</span>

                                <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={step.delayHours || 0}
                                    onChange={(e) => updateStep(steps, i, "delayHours", parseInt(e.target.value) || 0, setter)}
                                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Hrs"
                                />
                                <span className="text-xs text-slate-500 font-medium truncate hidden sm:inline">hrs de espera</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    updateStep(steps, i, "isTemplate", !step.isTemplate, setter);
                                    if (!step.isTemplate && templates.length > 0 && !step.messageTemplate) {
                                        updateStep(steps, i, "messageTemplate", templates[0].name, setter);
                                    }
                                    if (!step.isTemplate) {
                                        updateStep(steps, i, "useAI", false, setter); // disable AI if template is forced
                                    }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${step.isTemplate
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-lg shadow-amber-500/20"
                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                    }`}
                                title="Forzar uso de Plantilla Meta (obligatorio después de 24h)"
                            >
                                <Star className="w-3 h-3" /> {step.isTemplate ? "Plantilla Meta" : "Texto Libre"}
                            </button>
                            {!step.isTemplate && (
                                <button
                                    onClick={() => updateStep(steps, i, "useAI", !step.useAI, setter)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${step.useAI
                                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-lg shadow-purple-500/20"
                                        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                        }`}
                                >
                                    {step.useAI ? <Sparkles className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                    {step.useAI ? "IA" : "Fijo"}
                                </button>
                            )}
                            {steps.length > 1 && (
                                <button
                                    onClick={() => removeStep(steps, i, setter)}
                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {step.isTemplate ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Selecciona plantilla aprobada</label>
                            {templates.length > 0 ? (
                                <select
                                    value={step.messageTemplate}
                                    onChange={(e) => updateStep(steps, i, "messageTemplate", e.target.value, setter)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                                >
                                    {templates.map(t => (
                                        <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-xs text-amber-500">No hay plantillas registradas.</div>
                            )}
                            {step.messageTemplate && templates.find(t => t.name === step.messageTemplate) && (
                                <div className="mt-1 text-xs text-slate-400 italic px-1">
                                    "{templates.find(t => t.name === step.messageTemplate)?.content}"
                                </div>
                            )}
                        </div>
                    ) : (
                        <textarea
                            value={step.messageTemplate}
                            onChange={(e) => updateStep(steps, i, "messageTemplate", e.target.value, setter)}
                            placeholder={step.useAI
                                ? "Prompt para la IA: ej. 'Genera un mensaje amigable de seguimiento mencionando que no hemos sabido de ellos...'"
                                : "Mensaje de texto fijo. Usa {{firstName}}, {{lastName}}, {{phone}} como variables."
                            }
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                    )}
                </div>
            ))}
            <button
                onClick={() => addStep(steps, setter)}
                className="w-full py-2.5 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
                <Plus className="w-4 h-4" /> Agregar paso
            </button>
        </div>
    );

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
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Secuencias</h1>
                    <p className="text-slate-400 mt-1">Configura los pasos de seguimiento automático para tus leads.</p>
                </div>
                <button
                    onClick={() => setShowNew(!showNew)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Nueva Secuencia
                </button>
            </div>

            {feedback && (
                <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-sm text-slate-300">
                    {feedback}
                </div>
            )}

            {/* New Sequence Form */}
            {showNew && (
                <div className="bg-slate-900/50 border border-indigo-500/30 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
                    <h2 className="text-lg font-bold text-white">Nueva Secuencia</h2>
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nombre de la secuencia (ej: Reactivación 3 días)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <input
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Descripción (opcional)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-4">Pasos de la secuencia</h3>
                    <StepEditor steps={newSteps} setter={setNewSteps} prefix="new" />
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={saving || !newName.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Crear Secuencia"}
                        </button>
                    </div>
                </div>
            )}

            {/* Sequence List */}
            <div className="space-y-4">
                {sequences.length === 0 && !showNew && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                        <Sparkles className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No hay secuencias configuradas</p>
                        <p className="text-sm text-slate-600 mt-1">Crea tu primera secuencia para empezar a hacer seguimiento automático.</p>
                    </div>
                )}

                {sequences.map((seq) => (
                    <div key={seq.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${seq.isActive ? "bg-emerald-500/10" : "bg-slate-800"}`}>
                                    {seq.isActive ? <Play className="w-5 h-5 text-emerald-500" /> : <Pause className="w-5 h-5 text-slate-500" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-white">{seq.name}</h3>
                                        {defaultSequenceId === seq.id && (
                                            <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/20 flex items-center gap-1">
                                                <Star className="w-3 h-3" /> Default
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {seq.steps.length} pasos · {seq._count?.leads || 0} leads asignados
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {defaultSequenceId !== seq.id && (
                                    <button
                                        onClick={() => handleSetDefault(seq.id)}
                                        className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-amber-400 bg-slate-800 hover:bg-amber-500/10 rounded-lg transition-all border border-slate-700"
                                        title="Hacer Default"
                                    >
                                        <Star className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => editing === seq.id ? setEditing(null) : startEdit(seq)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700"
                                >
                                    {editing === seq.id ? "Cerrar" : "Editar"}
                                </button>
                                <button
                                    onClick={() => handleDelete(seq.id)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-red-500/10 rounded-lg transition-all border border-slate-700"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Timeline preview */}
                        {editing !== seq.id && (
                            <div className="px-6 pb-6">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {seq.steps.map((step, i) => (
                                        <React.Fragment key={i}>
                                            <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                                                <span className="text-indigo-400 font-bold text-xs">Día {step.delayDays}</span>
                                                <span className="text-slate-600 text-xs">·</span>
                                                {step.useAI ? (
                                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                                ) : (
                                                    <FileText className="w-3 h-3 text-slate-400" />
                                                )}
                                            </div>
                                            {i < seq.steps.length - 1 && (
                                                <div className="w-4 h-px bg-slate-700" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Edit form */}
                        {editing === seq.id && (
                            <div className="border-t border-slate-800 p-6 space-y-4">
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                                <input
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    placeholder="Descripción"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                                <StepEditor steps={editSteps} setter={setEditSteps} prefix={`edit-${seq.id}`} />
                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleUpdate(seq.id)}
                                        disabled={saving}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
