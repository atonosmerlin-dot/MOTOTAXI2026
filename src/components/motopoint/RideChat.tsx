import React, { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Message {
    id: string;
    content: string;
    sender_role: 'driver' | 'client';
    created_at: string;
}

interface RideChatProps {
    rideId: string;
    currentUserRole: 'driver' | 'client';
    className?: string;
}

const RideChat: React.FC<RideChatProps> = ({ rideId, currentUserRole, className }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch initial messages
    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('ride_messages' as any)
                .select('*')
                .eq('ride_id', rideId)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setMessages(data as unknown as Message[]);
            }
            setLoading(false);
        };

        fetchMessages();
    }, [rideId]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel(`chat-${rideId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'ride_messages', filter: `ride_id=eq.${rideId}` },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => [...prev, newMsg]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [rideId]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        const msgContent = newMessage.trim();
        setNewMessage(''); // optimistic clear

        try {
            await supabase.from('ride_messages' as any).insert({
                ride_id: rideId,
                content: msgContent,
                sender_role: currentUserRole
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <Loader2 className="animate-spin mb-2" />
                <p className="text-xs">Carregando chat...</p>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full bg-slate-950 relative overflow-hidden", className)}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}
            />

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scroll-smooth"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[80%] opacity-50 space-y-3">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-2">
                            <MessageCircle size={32} />
                        </div>
                        <p className="text-sm font-medium text-slate-300">Inicie a conversa</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.sender_role === currentUserRole;
                    const showTail = index === messages.length - 1 || messages[index + 1]?.sender_role !== msg.sender_role;

                    return (
                        <div
                            key={msg.id}
                            className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}
                        >
                            <div
                                className={cn(
                                    "relative max-w-[75%] px-4 py-3 text-sm shadow-md transition-all",
                                    isMe
                                        ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-2xl rounded-tr-sm"
                                        : "bg-slate-800 text-slate-100 rounded-2xl rounded-tl-sm border border-slate-700/50"
                                    , !showTail && (isMe ? "rounded-tr-2xl" : "rounded-tl-2xl") // round corner if not last
                                )}
                            >
                                <div className="break-words leading-relaxed mb-1">
                                    {msg.content}
                                </div>

                                <div className={cn("flex items-center justify-end gap-1 select-none", isMe ? "text-indigo-200" : "text-slate-400")}>
                                    <span className="text-[10px] font-medium">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && <CheckCheck size={12} className="opacity-80" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="flex-none p-3 bg-slate-900 border-t border-slate-800 z-20">
                <div className="grid grid-cols-[1fr,auto] gap-2 items-end">
                    <div className="relative">
                        <textarea
                            className="w-full bg-slate-950 border border-slate-700 rounded-3xl pl-5 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500 resize-none max-h-32 min-h-[46px] scrollbar-hide"
                            placeholder="Mensagem..."
                            rows={1}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="w-[46px] h-[46px] bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-full flex items-center justify-center text-white transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        <Send size={20} className="ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RideChat;
