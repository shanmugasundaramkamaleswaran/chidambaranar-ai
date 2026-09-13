import assert from 'node:assert/strict';

process.env.MESSAGE_ENCRYPTION_KEY ||= 'test-message-encryption-key-with-32-chars';
const { createConversation, getConversationMessages, sendMessage, assertConversationAccess, MAX_MESSAGE_LENGTH } = await import('./messages.service.js');

const seedDb = {
  users: [
    { id: 'emp_1', role: 'USER', orgId: 'org_1' },
    { id: 'doc_1', role: 'PSYCHOLOGIST', orgId: 'org_1' },
    { id: 'emp_2', role: 'USER', orgId: 'org_1' },
    { id: 'officer_1', role: 'ORGANIZATION_OFFICER', orgId: 'org_1' },
  ],
  conversations: [],
  messages: [],
  doctorAssignments: [{ doctorId: 'doc_1', userId: 'emp_1' }],
  consultations: [],
  persist() {},
};

assert.doesNotThrow(() => {
  const conversation = createConversation(seedDb, { employeeId: 'emp_1', psychologistId: 'doc_1' });
  assert.equal(conversation.employeeId, 'emp_1');
  assert.equal(conversation.psychologistId, 'doc_1');
});

assert.throws(() => createConversation(seedDb, { employeeId: 'emp_2', psychologistId: 'doc_1' }), /assigned or authorized/);
assert.equal(assertConversationAccess(seedDb, 'missing_conversation', 'emp_1', 'USER'), false);

assert.doesNotThrow(() => {
  const conversation = createConversation(seedDb, { employeeId: 'emp_1', psychologistId: 'doc_1' });
  assert.equal(assertConversationAccess(seedDb, conversation.id, 'emp_1', 'USER'), true);
  assert.equal(assertConversationAccess(seedDb, conversation.id, 'doc_1', 'PSYCHOLOGIST'), true);
  assert.equal(assertConversationAccess(seedDb, conversation.id, 'emp_2', 'USER'), false);
  assert.equal(assertConversationAccess(seedDb, conversation.id, 'officer_1', 'ORGANIZATION_OFFICER'), false);
});

assert.doesNotThrow(() => {
  const conversation = createConversation(seedDb, { employeeId: 'emp_1', psychologistId: 'doc_1' });
  const message = sendMessage(seedDb, conversation.id, 'emp_1', 'USER', 'I am stressed today.');
  assert.equal(message.senderId, 'emp_1');
  assert.match(message.encryptedContent, /^enc:/);
  assert.equal(getConversationMessages(seedDb, conversation.id, 'emp_1', 'USER').length, 1);
  assert.throws(() => sendMessage(seedDb, conversation.id, 'emp_1', 'USER', 'x'.repeat(MAX_MESSAGE_LENGTH + 1)), /cannot exceed/);
  assert.equal(sendMessage(seedDb, conversation.id, 'emp_1', 'USER', 'I am stressed today.').id, message.id);
});

console.log('messages.service test: ok');
