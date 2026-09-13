import assert from 'node:assert/strict';
import { createConversation, getConversationMessages, sendMessage, assertConversationAccess } from './messages.service.js';

const seedDb = {
  users: [
    { id: 'emp_1', role: 'USER', orgId: 'org_1' },
    { id: 'doc_1', role: 'PSYCHOLOGIST', orgId: 'org_1' },
    { id: 'emp_2', role: 'USER', orgId: 'org_1' },
    { id: 'officer_1', role: 'ORGANIZATION_OFFICER', orgId: 'org_1' },
  ],
  conversations: [],
  messages: [],
};

assert.doesNotThrow(() => {
  const conversation = createConversation(seedDb, { employeeId: 'emp_1', psychologistId: 'doc_1' });
  assert.equal(conversation.employeeId, 'emp_1');
  assert.equal(conversation.psychologistId, 'doc_1');
});

assert.doesNotThrow(() => {
  const conversation = createConversation(seedDb, { employeeId: 'emp_1', psychologistId: 'doc_1' });
  assert.equal(assertConversationAccess(seedDb, conversation.id, 'emp_1'), true);
  assert.equal(assertConversationAccess(seedDb, conversation.id, 'doc_1'), true);
  assert.equal(assertConversationAccess(seedDb, conversation.id, 'emp_2'), false);
  assert.equal(assertConversationAccess(seedDb, conversation.id, 'officer_1'), false);
});

assert.doesNotThrow(() => {
  const conversation = createConversation(seedDb, { employeeId: 'emp_1', psychologistId: 'doc_1' });
  const message = sendMessage(seedDb, conversation.id, 'emp_1', 'USER', 'I am stressed today.');
  assert.equal(message.senderId, 'emp_1');
  assert.match(message.encryptedContent, /^enc:/);
  assert.equal(getConversationMessages(seedDb, conversation.id).length, 1);
});

console.log('messages.service test: ok');
