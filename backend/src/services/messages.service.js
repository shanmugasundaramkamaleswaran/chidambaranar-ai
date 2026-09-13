import { saveDb } from '../db.js';
import { encryptText, decryptText } from '../utils/encryption.js';

export function createConversation(db, { employeeId, psychologistId }) {
    if (!employeeId || !psychologistId) {
        throw new Error('employeeId and psychologistId are required.');
    }

    const conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        employeeId,
        psychologistId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    db.conversations = db.conversations || [];
    db.conversations.push(conversation);
    saveDb(db);
    return conversation;
}

export function assertConversationAccess(db, conversationId, actorId) {
    const conversation = (db.conversations || []).find(c => c.id === conversationId);
    if (!conversation) {
        return false;
    }
    return conversation.employeeId === actorId || conversation.psychologistId === actorId;
}

export function getConversationsForUser(db, actorId, role) {
    const conversations = (db.conversations || []).filter((conversation) => {
        if (role === 'USER') return conversation.employeeId === actorId;
        if (role === 'PSYCHOLOGIST') return conversation.psychologistId === actorId;
        return false;
    });

    return conversations.map((conversation) => {
        const lastMessage = (db.messages || []).filter(m => m.conversationId === conversation.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        return {
            ...conversation,
            lastMessage: lastMessage ? {
                id: lastMessage.id,
                senderId: lastMessage.senderId,
                senderRole: lastMessage.senderRole,
                createdAt: lastMessage.createdAt,
                content: decryptText(lastMessage.encryptedContent),
            } : null,
        };
    });
}

export function sendMessage(db, conversationId, senderId, senderRole, messageText) {
    const trimmed = (messageText || '').trim();
    if (!trimmed) {
        throw new Error('Message content is required.');
    }

    const conversation = (db.conversations || []).find(c => c.id === conversationId);
    if (!conversation) {
        throw new Error('Conversation not found.');
    }

    if (conversation.employeeId !== senderId && conversation.psychologistId !== senderId) {
        throw new Error('You are not authorized to send messages in this conversation.');
    }

    const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        conversationId,
        senderId,
        senderRole,
        encryptedContent: encryptText(trimmed),
        createdAt: new Date().toISOString(),
        readAt: null,
    };

    db.messages = db.messages || [];
    db.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    saveDb(db);
    return message;
}

export function getConversationMessages(db, conversationId, viewerId) {
    const messages = (db.messages || []).filter(m => m.conversationId === conversationId);
    return messages
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((message) => ({
            ...message,
            content: viewerId ? decryptText(message.encryptedContent) : '[encrypted content]',
        }));
}

export function markMessageRead(db, messageId, viewerId) {
    const message = (db.messages || []).find(m => m.id === messageId);
    if (!message) return null;
    if (!assertConversationAccess(db, message.conversationId, viewerId)) {
        throw new Error('Forbidden.');
    }
    message.readAt = new Date().toISOString();
    saveDb(db);
    return message;
}

export function deleteMessage(db, messageId, viewerId) {
    const index = (db.messages || []).findIndex(m => m.id === messageId);
    if (index === -1) return false;
    const message = db.messages[index];
    if (!assertConversationAccess(db, message.conversationId, viewerId)) {
        throw new Error('Forbidden.');
    }
    db.messages.splice(index, 1);
    saveDb(db);
    return true;
}
