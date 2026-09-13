import { getDb, saveDb } from '../db.js';
import { createConversation, assertConversationAccess, getConversationsForUser, sendMessage, getConversationMessages, markMessageRead, deleteMessage } from '../services/messages.service.js';

export async function createConversationController(req, res) {
    try {
        const db = getDb();
        const { employeeId, psychologistId } = req.body || {};
        const requesterId = req.user.id;

        if (req.user.role === 'USER' && requesterId !== employeeId) {
            return res.status(403).json({ success: false, error: 'You can only create conversations for your own account.' });
        }
        if (req.user.role === 'PSYCHOLOGIST' && requesterId !== psychologistId) {
            return res.status(403).json({ success: false, error: 'You can only create conversations assigned to you.' });
        }

        const existing = (db.conversations || []).find((conversation) =>
            conversation.employeeId === employeeId && conversation.psychologistId === psychologistId
        );

        if (existing) {
            return res.json({ success: true, conversation: existing });
        }

        const conversation = createConversation(db, { employeeId, psychologistId });
        return res.status(201).json({ success: true, conversation });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Unable to create conversation.' });
    }
}

export function listConversationsController(req, res) {
    try {
        const db = getDb();
        const conversations = getConversationsForUser(db, req.user.id, req.user.role);
        return res.json({ success: true, conversations });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export function getConversationMessagesController(req, res) {
    try {
        const { conversationId } = req.params;
        const db = getDb();
        if (!assertConversationAccess(db, conversationId, req.user.id)) {
            return res.status(403).json({ success: false, error: 'Forbidden: this conversation is not assigned to your account.' });
        }

        const messages = getConversationMessages(db, conversationId, req.user.id);
        return res.json({ success: true, messages });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export function sendMessageController(req, res) {
    try {
        const { conversationId } = req.params;
        const { text } = req.body || {};
        const db = getDb();

        if (!assertConversationAccess(db, conversationId, req.user.id)) {
            return res.status(403).json({ success: false, error: 'Forbidden: you are not a participant in this conversation.' });
        }

        const message = sendMessage(db, conversationId, req.user.id, req.user.role, text);
        return res.status(201).json({ success: true, message });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Unable to send message.' });
    }
}

export function markMessageReadController(req, res) {
    try {
        const { messageId } = req.params;
        const db = getDb();
        const updated = markMessageRead(db, messageId, req.user.id);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Message not found.' });
        }
        return res.json({ success: true, message: updated });
    } catch (error) {
        return res.status(403).json({ success: false, error: error.message || 'Forbidden.' });
    }
}

export function deleteMessageController(req, res) {
    try {
        const { messageId } = req.params;
        const db = getDb();
        const deleted = deleteMessage(db, messageId, req.user.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Message not found.' });
        }
        return res.json({ success: true, deleted: true });
    } catch (error) {
        return res.status(403).json({ success: false, error: error.message || 'Forbidden.' });
    }
}
