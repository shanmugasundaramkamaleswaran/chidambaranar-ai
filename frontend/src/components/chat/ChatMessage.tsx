import React from 'react';

interface ChatMessageProps {
    text: string;
    isOwn: boolean;
    timestamp: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ text, isOwn, timestamp }) => {
    return (
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                    isOwn
                        ? 'bg-cyan-600 text-white rounded-br-none'
                        : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                }`}
            >
                {text}
            </div>
            <span className="mt-1 text-[9px] font-mono text-slate-500">{timestamp}</span>
        </div>
    );
};
