"use client";

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function ClearLeadsButton() {
    const [loading, setLoading] = useState(false);

    const handleClear = async () => {
        if (!confirm('⚠️ ¿Estás seguro? Esto borrará TODOS los leads y mensajes. Esta acción no se puede deshacer.')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/clear-leads', {
                method: 'POST',
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
        <button
            onClick={handleClear}
            disabled={loading}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center gap-2"
            title="Borrar todos los leads"
        >
            <Trash2 className="w-4 h-4" />
            {loading ? 'Limpiando...' : 'Limpiar Todo'}
        </button>
    );
}
