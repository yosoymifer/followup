import React from 'react';
import { X, Mail, Phone, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import LeadTagsEditor from './LeadTagsEditor';

interface LeadDetailsModalProps {
    lead: any;
    onClose: () => void;
}

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

export default function LeadDetailsModal({ lead, onClose }: LeadDetailsModalProps) {
    if (!lead) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/40">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            {lead.firstName} {lead.lastName}
                            <StatusBadge status={lead.status} />
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">

                    {/* Contact Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> Teléfono
                            </h3>
                            <p className="text-sm text-slate-300 font-mono">{lead.phone || 'No especificado'}</p>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" /> Email
                            </h3>
                            <p className="text-sm text-slate-300">{lead.email || 'No especificado'}</p>
                        </div>
                    </div>

                    {/* Timeline Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Último Contacto
                            </h3>
                            <p className="text-sm text-slate-300">
                                {lead.lastContactedAt
                                    ? new Date(lead.lastContactedAt).toLocaleString('es')
                                    : 'Nunca'}
                            </p>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" /> Total de Mensajes
                            </h3>
                            <p className="text-sm text-slate-300 font-mono">
                                {lead._count?.messages || 0} mensajes
                            </p>
                        </div>
                    </div>

                    {/* Tags Editor */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Etiquetas</h3>
                        <LeadTagsEditor leadId={lead.id} initialTags={lead.tags || []} />
                    </div>

                    {/* Context Data imported from CSV */}
                    {lead.context && Object.keys(lead.context).length > 0 && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">Datos Adicionales (Contexto)</h3>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                {Object.entries(lead.context).map(([key, value]) => (
                                    <div key={key}>
                                        <span className="text-[11px] font-medium text-slate-500 capitalize">{key}:</span>
                                        <p className="text-sm text-slate-300 truncate" title={String(value)}>{String(value)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer can be used for actions later */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
