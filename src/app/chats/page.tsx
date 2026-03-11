"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Sparkles, User, Search, RefreshCw, PowerOff, Trash2 } from "lucide-react";


interface ChatLead {
    id: string;
    name: string;
    phone: string;
    lastMessage: string;
    lastMessageAt: string;
    hasUnread: boolean;
    tags: string[];
    aiEnabled: boolean;
}

interface Message {
    id: string;
    content: string;
    direction: "INBOUND" | "OUTBOUND";
    aiGenerated: boolean;
    createdAt: string;
    status: string;
}

export default function ChatsPage() {
    const [leads, setLeads] = useState<ChatLead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    // Active Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingChat, setLoadingChat] = useState(false);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [isAiEnabled, setIsAiEnabled] = useState(true);
    const [isClearing, setIsClearing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchLeads = async () => {
        setLoadingLeads(true);
        try {
            const res = await fetch(`/api/chats?search=${encodeURIComponent(search)}`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingLeads(false);
        }
    };

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchLeads();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchChat = async (id: string) => {
        setLoadingChat(true);
        try {
            const res = await fetch(`/api/chats/${id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.lead.messages || []);
                setIsAiEnabled(data.lead.aiEnabled);
                setTimeout(scrollToBottom, 50);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingChat(false);
        }
    };

    useEffect(() => {
        if (selectedLeadId) {
            fetchChat(selectedLeadId);
        }
    }, [selectedLeadId]);

    const handleSend = async () => {
        if (!inputText.trim() || !selectedLeadId) return;
        setSending(true);

        // Optimistic UI update
        const newMessage: Message = {
            id: 'temp-' + Date.now(),
            content: inputText,
            direction: 'OUTBOUND',
            aiGenerated: false,
            createdAt: new Date().toISOString(),
            status: 'SENDING'
        };
        setMessages(prev => [...prev, newMessage]);
        const textToSend = inputText;
        setInputText("");
        setTimeout(scrollToBottom, 50);

        try {
            const res = await fetch(`/api/chats/${selectedLeadId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: textToSend })
            });
            const data = await res.json();
            if (data.success) {
                // Replace temp message with real one
                setMessages(prev => prev.map(m => m.id === newMessage.id ? data.message : m));
                fetchLeads(); // Update last message in sidebar
            }
        } catch (e) {
            console.error("Failed to send message", e);
        } finally {
            setSending(false);
        }
    };

    const toggleAI = async () => {
        if (!selectedLeadId) return;
        const newState = !isAiEnabled;
        setIsAiEnabled(newState); // Optimistic

        try {
            const res = await fetch(`/api/chats/${selectedLeadId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aiEnabled: newState })
            });
            if (!res.ok) {
                setIsAiEnabled(!newState); // Revert on error
            } else {
                fetchLeads(); // Update sidebar state
            }
        } catch {
            setIsAiEnabled(!newState);
        }
    };



    const activeLead = leads.find(l => l.id === selectedLeadId);

    return (
        <div className="h-[calc(100vh-6rem)] -mt-2 -mx-2 lg:-mx-4 flex border border-slate-800 rounded-3xl overflow-hidden bg-slate-950/50 backdrop-blur-xl">
            {/* Sidebar List */}
            <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-800 bg-slate-900/40">
                <div className="p-4 border-b border-slate-800 bg-slate-900/80">
                    <h2 className="text-xl font-extrabold text-white flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-indigo-400" />
                        Live Chats
                    </h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o celular..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingLeads ? (
                        <div className="flex justify-center p-8 text-slate-500">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No se encontraron conversaciones activas.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {leads.map((lead) => (
                                <button
                                    key={lead.id}
                                    onClick={() => setSelectedLeadId(lead.id)}
                                    className={`w-full text-left p-4 hover:bg-slate-800/50 transition-colors ${selectedLeadId === lead.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-slate-200 truncate pr-2">
                                            {lead.name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                                            {lead.lastMessageAt ? new Date(lead.lastMessageAt).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-xs truncate pr-4 ${lead.hasUnread ? 'text-white font-medium' : 'text-slate-500'}`}>
                                            {lead.lastMessage || "Nueva conversación"}
                                        </p>
                                        {lead.aiEnabled ? (
                                            <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                        ) : (
                                            <PowerOff className="w-3 h-3 text-slate-600 flex-shrink-0" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-slate-950 ${!selectedLeadId ? 'hidden md:flex' : 'flex'}`}>
                {selectedLeadId ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                    <User className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{activeLead?.name}</h3>
                                    <p className="text-xs text-slate-400">{activeLead?.phone}</p>
                                </div>
                            </div>

                            <button
                                onClick={toggleAI}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isAiEnabled
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                    }`}
                            >
                                {isAiEnabled ? (
                                    <><Sparkles className="w-3 h-3 animate-pulse" /> IA Respondiendo</>
                                ) : (
                                    <><PowerOff className="w-3 h-3" /> IA Apagada</>
                                )}
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingChat ? (
                                <div className="flex justify-center h-full items-center text-slate-500">
                                    <RefreshCw className="w-6 h-6 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                                    <MessageSquare className="w-8 h-8 opacity-50" />
                                    <p className="text-sm">No hay mensajes en esta conversación.</p>
                                </div>
                            ) : (
                                messages.map((msg, i) => {
                                    const isLead = msg.direction === 'INBOUND';
                                    return (
                                        <div key={msg.id || i} className={`flex ${isLead ? 'justify-start' : 'justify-end'}`}>
                                            <div className="max-w-[75%] lg:max-w-[60%]">
                                                <div
                                                    className={`p-3 rounded-2xl text-sm ${isLead
                                                        ? 'bg-slate-800 text-slate-200 rounded-tl-sm'
                                                        : 'bg-indigo-600 text-white rounded-tr-sm'
                                                        }`}
                                                >
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                                <div className={`flex items-center gap-1 mt-1 text-[10px] ${isLead ? 'justify-start text-slate-500' : 'justify-end text-indigo-300'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {!isLead && msg.aiGenerated && (
                                                        <span className="flex items-center gap-0.5 ml-1">
                                                            <Sparkles className="w-2.5 h-2.5" /> IA
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Escribe un mensaje al lead..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 shadow-inner"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !inputText.trim()}
                                    className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg transition-colors"
                                >
                                    {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 text-center">
                                Tip: Responder manualmente es útil si el lead hace una pregunta muy específica o para cerrar la venta.
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
                            <MessageSquare className="w-8 h-8 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-slate-300">Bandeja de Entrada</p>
                            <p className="text-sm mt-1">Selecciona una conversación de la lista para ver el historial y responder.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
