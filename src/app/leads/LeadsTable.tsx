"use client";

import React, { useState } from 'react';
import {
    Search,
    Mail,
    Phone,
    CheckCircle2,
    Clock,
    AlertCircle,
    MessageSquare,
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import { LeadActions } from './LeadActions';

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        HOT: 'bg-red-500/10 text-red-400 border-red-500/20',
        NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        COLD: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        WON: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        CONTACTED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || styles['NEW']}`}>
            {status}
        </span>
    );
};

interface LeadsTableProps {
    initialLeads: any[];
    totalLeads: number;
}

export default function LeadsTable({ initialLeads, totalLeads }: LeadsTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [leads, setLeads] = useState(initialLeads);
    const [loading, setLoading] = useState(false);

    const totalPages = Math.ceil(totalLeads / pageSize);

    const fetchLeads = async (page: number, size: number) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/leads?page=${page}&pageSize=${size}`);
            const data = await response.json();
            setLeads(data.leads);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchLeads(page, pageSize);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setCurrentPage(1);
        fetchLeads(1, size);
    };

    return (
        <>
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
                    <span className="text-xs font-medium text-slate-500 bg-slate-800 px-3 py-1 rounded-lg">
                        {totalLeads} leads
                    </span>
                </div>

                <div className={`overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/20">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Lead</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Contacto</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Último Contacto</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Mensajes</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {leads.length > 0 ? leads.map((lead: any) => (
                                <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-white">{lead.firstName} {lead.lastName}</div>

                                        {/* Additional context data */}
                                        {lead.context && (
                                            <div className="flex flex-col gap-0.5 mt-1.5 text-[11px]">
                                                {lead.context.fase && (
                                                    <div className="text-slate-400">
                                                        <span className="text-slate-600">Fase:</span> {lead.context.fase}
                                                    </div>
                                                )}
                                                {lead.context.fuente && (
                                                    <div className="text-slate-400">
                                                        <span className="text-slate-600">Fuente:</span> {lead.context.fuente}
                                                    </div>
                                                )}
                                                {lead.context['días desde la fecha del último cambiar de estado'] && (
                                                    <div className="text-slate-400">
                                                        <span className="text-slate-600">Días:</span> {lead.context['días desde la fecha del último cambiar de estado']}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {lead.tags.map((tag: string) => (
                                                <span key={tag} className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {lead.email && (
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Mail className="w-3 h-3 text-slate-500" /> {lead.email}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                                                <Phone className="w-3 h-3 text-slate-500" /> {lead.phone || '-'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={lead.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-400">
                                            {lead.lastContactedAt
                                                ? new Date(lead.lastContactedAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })
                                                : <span className="text-slate-600">Nunca</span>
                                            }
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <MessageSquare className="w-4 h-4 text-slate-500" />
                                            <span className="font-mono">{lead._count?.messages || 0}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <LeadActions leadId={lead.id} />
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle className="w-12 h-12 text-slate-700" />
                                            <p className="text-slate-500 font-medium">No hay leads para mostrar</p>
                                            <p className="text-sm text-slate-600">Importa un CSV para comenzar</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalLeads > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalItems={totalLeads}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                    />
                )}
            </div>
        </>
    );
}
