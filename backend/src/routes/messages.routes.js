import express from 'express';
import { requireAuth, requireRole } from '../auth.js';
import {
    createConversationController,
    listConversationsController,
    getConversationMessagesController,
    sendMessageController,
    markMessageReadController,
    deleteMessageController,
} from '../controllers/messages.controller.js';

const router = express.Router();

router.post('/conversations', requireAuth, requireRole(['USER', 'PSYCHOLOGIST']), createConversationController);
router.get('/conversations', requireAuth, requireRole(['USER', 'PSYCHOLOGIST']), listConversationsController);
router.get('/conversations/:conversationId/messages', requireAuth, requireRole(['USER', 'PSYCHOLOGIST']), getConversationMessagesController);
router.post('/conversations/:conversationId/messages', requireAuth, requireRole(['USER', 'PSYCHOLOGIST']), sendMessageController);
router.patch('/messages/:messageId/read', requireAuth, requireRole(['USER', 'PSYCHOLOGIST']), markMessageReadController);
router.delete('/messages/:messageId', requireAuth, requireRole(['USER', 'PSYCHOLOGIST']), deleteMessageController);

export default router;
