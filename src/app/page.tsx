import React from 'react';
import {
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { AIPendingList } from "@/components/AIPendingList";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await auth();
  const organizationId = (session?.user as any)?.organizationId;
  if (!organizationId) redirect("/login");

  // 1. Fetch Real Stats & Drafts
  const [totalLeads, todayFollowups, responseRate, pendingAI, drafts] = await Promise.all([
    prisma.lead.count({ where: { organizationId } }),
    prisma.message.count({
      where: {
        lead: { organizationId },
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        direction: 'OUTBOUND',
        status: { not: 'DRAFT' }
      }
    }),
    prisma.lead.count({ where: { organizationId, status: 'WON' } }),
    prisma.message.count({ where: { lead: { organizationId }, status: 'DRAFT' } }),
    prisma.message.findMany({
      where: { lead: { organizationId }, status: 'DRAFT' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { lead: true }
    })
  ]);

  // 2. Fetch Recent Activity
  const recentMessages = await prisma.message.findMany({
    where: { lead: { organizationId }, status: { not: 'DRAFT' } },
    take: 4,
    orderBy: { createdAt: 'desc' },
    include: { lead: true }
  });

  const stats = [
    { label: 'Leads Totales', value: totalLeads.toLocaleString(), icon: Users, change: '+12%', color: 'from-blue-500 to-indigo-600' },
    { label: 'Seguimientos Hoy', value: todayFollowups.toString(), icon: MessageSquare, change: '+5%', color: 'from-purple-500 to-pink-600' },
    { label: 'Conversion Rate', value: `${((responseRate / (totalLeads || 1)) * 100).toFixed(1)}%`, icon: TrendingUp, change: '+2%', color: 'from-emerald-500 to-teal-600' },
    { label: 'Pendientes IA', value: pendingAI.toString(), icon: Clock, change: '-3', color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Bienvenido, {session?.user?.name || 'Admin'}
          </h1>
          <p className="text-slate-400 mt-1">Aquí está el resumen de tu rendimiento hoy.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95">
          <Sparkles className="w-4 h-4" />
          Nueva Campaña
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] blur-2xl group-hover:opacity-[0.08] transition-opacity`}></div>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg shadow-indigo-500/10`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stat.change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {stat.change}
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-slate-400 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* AI Drafts Approval Section */}
          <AIPendingList drafts={drafts as any} />

          {/* Recent Activity */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <h2 className="text-xl font-bold text-white">Actividad Reciente</h2>
              <button className="text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors flex items-center gap-1">
                Ver todo <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-800">
              {recentMessages.length > 0 ? recentMessages.map((msg: any) => (
                <div key={msg.id} className="p-6 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 uppercase">
                    {msg.lead.firstName?.[0] || 'L'}
                    {msg.lead.lastName?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {msg.lead.firstName} {msg.lead.lastName}
                      <span className="text-slate-500 font-normal ml-2">
                        {msg.direction === 'INBOUND' ? 'respondió un mensaje' : 'envió un seguimiento'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate italic">"{msg.content}"</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="text-xs text-slate-600 font-medium">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No hay actividad reciente aún.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Performance */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-950 border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>
            <div className="relative">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-4 uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Estado de IA
              </div>
              <h3 className="text-xl font-bold text-white mb-2">IA en Entrenamiento</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Tu asistente está aprendiendo de las respuestas de tus leads para personalizar mejor los próximos mensajes.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Precisión de Etiquetas</span>
                    <span>94%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[94%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Conversión de Follow-up</span>
                    <span>12.5%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[60%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
