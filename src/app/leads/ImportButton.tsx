"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { handleGHLImport } from "./actions";

export function ImportButton() {
    const [loading, setLoading] = useState(false);

    const onImport = async () => {
        const tag = prompt("¿Deseas filtrar por una etiqueta de GHL? (Ej: 'followup-ai-stale'). Déjalo vacío para importar todos");
        if (tag === null) return; // Cancelado por el usuario

        if (!confirm(tag ? `¿Importar solo leads con la etiqueta "${tag}"?` : "¿Estás seguro de que deseas importar TODOS los contactos de Go High Level?")) return;

        setLoading(true);
        try {
            const result = await handleGHLImport(tag || undefined);
            if (result.error) {
                alert("Error: " + result.error);
            } else {
                alert(`¡Éxito! Se importaron/actualizaron ${result.count} leads.`);
            }
        } catch (err) {
            alert("Error inesperado en la importación.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={onImport}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                </>
            ) : (
                "Importar GHL"
            )}
        </button>
    );
}
