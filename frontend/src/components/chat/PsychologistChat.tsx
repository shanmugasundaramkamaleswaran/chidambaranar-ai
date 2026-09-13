import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, UserCircle2, Clock3 } from 'lucide-react';
import { getAuthHeader } from '../../auth';
import { ChatMessage } from './ChatMessage';
import { MessageInput } from './MessageInput';

interface PsychologistChatProps {
    currentUser: {
        id: string;
        name: string;
        role: string;
    };
    psychologistId?: string;
    employeeId?: string;
    employeeName?: string;
    psychologistName?: string;
    isPsychologistView?: boolean;
    onClose?: () => void;
}

interface ChatMessageType {
    id: string;
    senderId: string;
    senderRole: string;
    content: string;
    createdAt: string;
}

export const PsychologistChat: React.FC<PsychologistChatProps> = ({
    currentUser,
    psychologistId,
    employeeId,
    employeeName = 'Employee',
    psychologistName = 'Psychologist',
    isPsychologistView = false,
    onClose,
}) => {
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [input, setInput] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const viewerRole = currentUser.role === 'doctor' || currentUser.role === 'PSYCHOLOGIST' ? 'PSYCHOLOGIST' : 'USER';
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const peerLabel = isPsychologistView ? employeeName : psychologistName;
    const peerSubLabel = isPsychologistView ? 'Assigned patient' : 'Online / Available';

    const ensureConversation = useCallback(async (): Promise<string | null> => {
        if (!employeeId || !psychologistId) return null;
        const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ employeeId, psychologistId }),
            });
        const data = await res.json();
        if (!res.ok || !data?.conversation?.id) {
            throw new Error(data?.error || 'This conversation is not currently authorized.');
        }
        setConversationId(data.conversation.id);
        return data.conversation.id;
    }, [employeeId, psychologistId]);

    useEffect(() => {
        const loadMessages = async () => {
            setLoading(true);
            try {
                setError('');
                const activeConversationId = await ensureConversation();
                if (!activeConversationId) return;
                const res = await fetch(`/api/conversations/${activeConversationId}/messages`, {
                    headers: { ...getAuthHeader() },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Unable to load messages.');
                setMessages(Array.isArray(data.messages) ? data.messages : []);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.');
            } finally {
                setLoading(false);
            }
        };

        void loadMessages();
    }, [ensureConversation]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || !conversationId || sending) return;

        const optimistic: ChatMessageType = {
            id: `temp_${Date.now()}`,
            senderId: currentUser.id,
            senderRole: viewerRole,
            content: trimmed,
            createdAt: new Date().toISOString(),
        };

        setMessages(prev => [...prev, optimistic]);
        setInput('');
        setSending(true);
        setError('');

        try {
            const res = await fetch(`/api/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ text: trimmed }),
            });
            const data = await res.json();
            if (!res.ok || !data?.message) throw new Error(data?.error || 'Unable to send message.');
            setMessages(prev => prev.filter(item => item.id !== optimistic.id).concat(data.message));
        } catch (sendError) {
            setMessages(prev => prev.filter(item => item.id !== optimistic.id));
            setInput(trimmed);
            setError(sendError instanceof Error ? sendError.message : 'Unable to send message.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-[70vh] max-h-[760px] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#07111c] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-950 text-cyan-300">
                        <UserCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">{peerLabel}</h3>
                        <p className="text-[10px] text-slate-400">{peerSubLabel}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/60 px-2.5 py-1 text-[10px] font-mono text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Online
                </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#091521] px-4 py-4">
                {loading ? (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400">
                        <Sparkles className="h-8 w-8 text-cyan-400" />
                        <p className="text-xs">No messages yet. Start the conversation securely.</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isOwn = message.senderId === currentUser.id;
                        return (
                            <ChatMessage
                                key={message.id}
                                text={message.content}
                                isOwn={isOwn}
                                timestamp={new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            />
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {error && <p className="border-t border-rose-900/60 bg-rose-950/40 px-4 py-2 text-xs text-rose-300">{error}</p>}

            <div className="bg-slate-950/80 px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-[10px] text-slate-500">
                    <Clock3 className="h-3 w-3" />
                    <span>Private, text-only psychologist communication</span>
                </div>
                <MessageInput
                    value={input}
                    onChange={setInput}
                    onSend={sendMessage}
                    placeholder={isPsychologistView ? 'Type a message to the employee...' : 'Type your message...'}
                    disabled={!conversationId || loading || sending}
                />
            </div>

            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white"
                >
                    Close
                </button>
            )}
        </div>
    );
};
