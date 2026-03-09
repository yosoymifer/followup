"use client";

import React, { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';

interface LeadTagsEditorProps {
    leadId: string;
    initialTags: string[];
}

export default function LeadTagsEditor({ leadId, initialTags }: LeadTagsEditorProps) {
    const [tags, setTags] = useState<string[]>(initialTags || []);
    const [isEditing, setIsEditing] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [loading, setLoading] = useState(false);

    const updateTagsInDb = async (newTagsList: string[]) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/leads/${leadId}/tags`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: newTagsList }),
            });
            if (res.ok) {
                setTags(newTagsList);
            }
        } catch (error) {
            console.error("Failed to update tags:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = async () => {
        const trimmed = newTag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            const updated = [...tags, trimmed];
            await updateTagsInDb(updated);
        }
        setNewTag('');
        setIsEditing(false);
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        const updated = tags.filter((t) => t !== tagToRemove);
        await updateTagsInDb(updated);
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="group flex items-center gap-1 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-500/20 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                    title="Click para eliminar"
                >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                    <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
            ))}

            {isEditing ? (
                <div className="flex items-center gap-1">
                    <input
                        autoFocus
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTag();
                            if (e.key === 'Escape') setIsEditing(false);
                        }}
                        onBlur={() => {
                            if (newTag.trim()) handleAddTag();
                            else setIsEditing(false);
                        }}
                        placeholder="Nueva etiqueta..."
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 bg-slate-900 text-slate-300 w-24 outline-none focus:border-indigo-500 flex-1"
                        disabled={loading}
                    />
                </div>
            ) : (
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex justify-center items-center w-5 h-5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all"
                    title="Añadir Etiqueta"
                    disabled={loading}
                >
                    <Plus className="w-3 h-3" />
                </button>
            )}
            {loading && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ml-1" />}
        </div>
    );
}
