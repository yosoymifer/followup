import React from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    Settings,
    History,
    Layers,
    Sparkles
} from 'lucide-react';

const Sidebar = () => {
    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
        { icon: Users, label: 'Leads', href: '/leads' },
        { icon: MessageSquare, label: 'Mensajes', href: '/messages' },
        { icon: History, label: 'Recuperación', href: '/recovery' },
        { icon: Layers, label: 'Plantillas', href: '/templates' },
        { icon: Settings, label: 'Configuración', href: '/settings' },
    ];

    return (
        <div className="flex flex-col h-screen w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
            <div className="p-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        FollowUp AI
                    </span>
                </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white group"
                    >
                        <item.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 px-2 py-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 items-center justify-center flex">
                        <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">Client Admin</span>
                        <span className="text-xs text-slate-500">Premium Plan</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
