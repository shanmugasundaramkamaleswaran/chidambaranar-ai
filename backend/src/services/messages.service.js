import { saveDb } from '../db.js';
import { encryptText, decryptText } from '../utils/encryption.js';

export const MAX_MESSAGE_LENGTH = 4000;
const ACTIVE_CONSULTATION_STATUSES = new Set(['ACCEPTED', 'IN_PROGRESS', 'COMPLETED']);

function persist(db) {
    if (typeof db.persist === 'function') db.persist();
    else saveDb(db);
}

function getUser(db, userId) {
    return (db.users || []).find(user => user.id === userId) || null;
}

function isEmployee(user) {
    return user?.rbacRole === 'USER' || user?.role === 'USER' || user?.role === 'user_employee';
}

function isPsychologist(user) {
    return user?.rbacRole === 'PSYCHOLOGIST' || user?.role === 'PSYCHOLOGIST' || user?.role === 'doctor';
}

function isAssigned(db, employeeId, psychologistId) {
    return (db.doctorAssignments || []).some(assignment =>
        assignment.userId === employeeId && assignment.doctorId === psychologistId
    );
}

function hasConsultationRelationship(db, employeeId, psychologistId) {
    return (db.consultations || []).some(consultation =>
        consultation.userId === employeeId &&
        consultation.doctorId === psychologistId &&
        ACTIVE_CONSULTATION_STATUSES.has(consultation.status)
    );
}

export function assertMessagingRelationship(db, employeeId, psychologistId) {
    const employee = getUser(db, employeeId);
    const psychologist = getUser(db, psychologistId);

    if (!isEmployee(employee) || !isPsychologist(psychologist)) {
        throw new Error('A valid employee and psychologist are required.');
    }
    if (!employee.orgId || employee.orgId !== psychologist.orgId) {
        throw new Error('Employee and psychologist must belong to the same organization.');
    }
    if (!isAssigned(db, employeeId, psychologistId) && !hasConsultationRelationship(db, employeeId, psychologistId)) {
        throw new Error('This psychologist is not assigned or authorized for the employee.');
    }
    return { employee, psychologist };
}

export function createConversation(db, { employeeId, psychologistId }) {
    assertMessagingRelationship(db, employeeId, psychologistId);

    db.conversations = db.conversations || [];
    const existing = db.conversations.find(conversation =>
        conversation.employeeId === employeeId && conversation.psychologistId === psychologistId
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        employeeId,
        psychologistId,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        lastMessageAt: null,
    };

    db.conversations.push(conversation);
        persist(db);
    return conversation;
}

export function assertConversationAccess(db, conversationId, actorId, actorRole) {
    const conversation = (db.conversations || []).find(c => c.id === conversationId);
    const actor = getUser(db, actorId);
    if (!conversation || !actor) return false;

    const roleMatches = actorRole === 'USER'
        ? conversation.employeeId === actorId && isEmployee(actor)
        : actorRole === 'PSYCHOLOGIST'
            ? conversation.psychologistId === actorId && isPsychologist(actor)
            : false;
    if (!roleMatches) return false;

    try {
        assertMessagingRelationship(db, conversation.employeeId, conversation.psychologistId);
        return true;
    } catch {
        return false;
    }
}

export function getConversationsForUser(db, actorId, role) {
    const conversations = (db.conversations || []).filter(conversation =>
        assertConversationAccess(db, conversation.id, actorId, role)
    );

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
    const trimmed = typeof messageText === 'string' ? messageText.trim() : '';
    if (!trimmed) throw new Error('Message content is required.');
    if (trimmed.length > MAX_MESSAGE_LENGTH) throw new Error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
    if (!assertConversationAccess(db, conversationId, senderId, senderRole)) {
        throw new Error('You are not authorized to send messages in this conversation.');
    }

    const conversation = (db.conversations || []).find(c => c.id === conversationId);

    const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        conversationId,
        senderId,
        senderRole,
        encryptedContent: encryptText(trimmed),
        createdAt: new Date().toISOString(),
        readAt: null,
        status: 'SENT',
    };

    db.messages = db.messages || [];
    const duplicate = [...db.messages].reverse().find(item =>
        item.conversationId === conversationId &&
        item.senderId === senderId &&
        Date.now() - new Date(item.createdAt).getTime() < 5000 &&
        decryptText(item.encryptedContent) === trimmed
    );
    if (duplicate) return { ...duplicate, content: trimmed };

    db.messages.push(message);
    conversation.updatedAt = message.createdAt;
    conversation.lastMessageAt = message.createdAt;
        persist(db);
    return { ...message, content: trimmed };
}

export function getConversationMessages(db, conversationId, viewerId, viewerRole) {
    if (!assertConversationAccess(db, conversationId, viewerId, viewerRole)) {
        throw new Error('Forbidden.');
    }
    const messages = (db.messages || []).filter(m => m.conversationId === conversationId);
    return messages
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((message) => ({
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            senderRole: message.senderRole,
            content: decryptText(message.encryptedContent),
            createdAt: message.createdAt,
            readAt: message.readAt,
            status: message.status || 'SENT',
        }));
}

export function markMessageRead(db, messageId, viewerId, viewerRole) {
    const message = (db.messages || []).find(m => m.id === messageId);
    if (!message) return null;
    if (!assertConversationAccess(db, message.conversationId, viewerId, viewerRole)) {
        throw new Error('Forbidden.');
    }
    message.readAt = new Date().toISOString();
        persist(db);
    return message;
}

export function deleteMessage(db, messageId, viewerId, viewerRole) {
    const index = (db.messages || []).findIndex(m => m.id === messageId);
    if (index === -1) return false;
    const message = db.messages[index];
    if (!assertConversationAccess(db, message.conversationId, viewerId, viewerRole)) {
        throw new Error('Forbidden.');
    }
    if (message.senderId !== viewerId) throw new Error('Only the sender can delete a message.');
    db.messages.splice(index, 1);
        persist(db);
    return true;
}
