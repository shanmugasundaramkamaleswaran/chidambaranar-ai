import React from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    value,
    onChange,
    onSend,
    disabled = false,
    placeholder = 'Type a message...',
}) => {
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (!disabled && value.trim()) {
                    onSend();
                }
            }}
            className="flex gap-2 border-t border-slate-800 pt-3"
        >
            <input
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
                type="submit"
                disabled={disabled || !value.trim()}
                className="rounded-xl bg-cyan-600 px-3 py-2 text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                aria-label="Send message"
            >
                <Send className="h-4 w-4" />
            </button>
        </form>
    );
};
