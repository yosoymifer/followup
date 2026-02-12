import React from 'react';
import {
    Search,
    Filter,
    MoreHorizontal,
    Mail,
    Phone,
    Tag as TagIcon,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2
} from 'lucide-react';
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { handleGHLImport } from "./actions";

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        HOT: 'bg-red-500/10 text-red-400 border-red-500/20',
        NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        COLD: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        WON: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status]}`}>
            {status}
        </span>
    );
};

export default async function LeadsPage() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId || 'pascual_prod';

    const leads = await prisma.lead.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: { _count: { select: { messages: true } } }
    });

    const totalLeads = await prisma.lead.count({ where: { organizationId } });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Gestión de Leads</h1>
                    <p className="text-slate-400 mt-1">Administra tus contactos sincronizados de GHL.</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 border border-slate-700">
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                    <ImportButton />
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o teléfono..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-300 placeholder:text-slate-600"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 mr-2">Acciones masivas:</span>
                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors" title="Enviar Mensaje"><Mail className="w-4 h-4" /></button>
                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors" title="Asignar Etiqueta"><TagIcon className="w-4 h-4" /></button>
                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors" title="Marcar como Ganado"><CheckCircle2 className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/20">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Lead</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Contacto</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Etiquetas</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Interacciones</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {leads.length > 0 ? leads.map((lead: any) => (
                                <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-white">{lead.firstName} {lead.lastName}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-tighter">ID: {lead.id.slice(0, 8)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {lead.email && (
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Mail className="w-3 h-3 text-slate-500" /> {lead.email}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                                                <Phone className="w-3 h-3 text-slate-500" /> {lead.phone}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={lead.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {lead.tags.map((tag: string) => (
                                                <span key={tag} className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                                                    {tag}
                                                </span>
                                            ))}
                                            {lead.tags.length === 0 && <span className="text-[10px] text-slate-600">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <MessageSquare className="w-3 h-3" /> {lead._count.messages} mensajes
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                                        No hay leads importados todavía.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium tracking-tight">
                        Mostrando {leads.length} de {totalLeads} leads
                    </span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 rounded border border-slate-800 text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-50" disabled>Anterior</button>
                        <button className="px-3 py-1 rounded border border-slate-800 text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors" disabled={leads.length >= totalLeads}>Siguiente</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Separate Client Component for the Import Button to avoid re-rendering entire page
import { ImportButton } from "./ImportButton";
import { MessageSquare } from 'lucide-react';
