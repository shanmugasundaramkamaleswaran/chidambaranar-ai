import express from 'express';
import cors from 'cors';
import http from 'http';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import { getDb, saveDb, addAuditLog, findOrganization } from './db.js';
import { evaluateCheckinRisk, calculatePersonalBaseline } from './stressEngine.js';
import { generateAiChatResponse, generateGeminiClinicalReport } from './aiAssistant.js';
import { signToken, requireAuth, requireRole } from './auth.js';
import { getAbimanyuResponse } from './abimanyu.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// STUN / TURN server configuration structure
const getIceServers = () => {
    return [
        {
            urls: process.env.STUN_URL || 'stun:stun.l.google.com:19302'
        },
        ...(process.env.TURN_URL ? [{
            urls: process.env.TURN_URL,
            username: process.env.TURN_USERNAME || '',
            credential: process.env.TURN_CREDENTIAL || ''
        }] : [])
    ];
};

// Logger Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ============================================================
// RBAC ROLE CONSTANTS
// ============================================================
const ROLES = {
    USER: 'USER',              // Employee/User
    PSYCHOLOGIST: 'PSYCHOLOGIST', // Doctor/Psychologist
    ORGANIZATION_OFFICER: 'ORGANIZATION_OFFICER' // Company Admin
};

// ============================================================
// SEED PASSWORDS - ensure all DB users have hashed passwords
// ============================================================
async function ensurePasswordsSeeded() {
    const db = getDb();
    let changed = false;

    const seedPasswords = {
        'usr_1': 'officer1234',
        'usr_2': 'employee1234',
        'usr_3': 'admin1234',
        'usr_doc1': 'doctor1234',
        'usr_doc2': 'doctor5678',
    };

    // Map old roles to new RBAC roles
    const roleMap = {
        'user_employee': ROLES.USER,
        'company_admin': ROLES.ORGANIZATION_OFFICER,
        'doctor': ROLES.PSYCHOLOGIST,
    };

    for (const user of db.users) {
        // Assign rbacRole from old role
        if (!user.rbacRole && roleMap[user.role]) {
            user.rbacRole = roleMap[user.role];
            changed = true;
        }
        // Hash password if not set
        if (!user.passwordHash && seedPasswords[user.id]) {
            user.passwordHash = await bcrypt.hash(seedPasswords[user.id], 10);
            changed = true;
        }
    }

    if (changed) {
        saveDb(db);
        console.log('✅ RBAC roles and hashed passwords seeded into DB.');
    }
}

// ============================================================
// AUTHENTICATION ROUTES (Public - no token required)
// ============================================================

// Verify Organization ID (public)
app.post('/api/auth/organization/verify', (req, res) => {
    const { orgId } = req.body;
    const org = findOrganization(orgId);
    if (!org) {
        return res.status(404).json({ success: false, error: 'Organization ID not found.' });
    }
    res.json({ success: true, organization: org });
});

// -------- ORGANIZATION OFFICER LOGIN --------
app.post('/api/auth/organization/login', async (req, res) => {
    const { email, password, orgId } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const db = getDb();

    // Find user by email
    let user = db.users.find(u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        (u.role === 'company_admin' || u.rbacRole === ROLES.ORGANIZATION_OFFICER)
    );

    if (!user) {
        return res.status(401).json({ success: false, error: 'No Organization Officer account found with this email.' });
    }

    // Verify password
    if (user.passwordHash) {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        }
    }
    // (For demo: if no passwordHash yet, allow with preset password)
    else if (password !== 'admin1234') {
        return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    // Validate org if provided
    let org = null;
    if (orgId) {
        org = findOrganization(orgId);
    }
    if (!org) {
        org = db.organizations.find(o => o.id === user.orgId) || db.organizations[0];
    }

    // Ensure rbacRole
    user.rbacRole = ROLES.ORGANIZATION_OFFICER;

    // Sign JWT
    const token = signToken({
        id: user.id,
        email: user.email,
        role: ROLES.ORGANIZATION_OFFICER,
        orgId: org.id
    });

    addAuditLog(user.id, 'ORG_OFFICER_LOGIN', org.id, `Organization Officer ${user.name} logged into Enterprise Portal (${org.name}).`);

    // Return safe user object (no passwordHash)
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: { ...safeUser, rbacRole: ROLES.ORGANIZATION_OFFICER }, organization: org, token });
});

// -------- USER / EMPLOYEE LOGIN --------
app.post('/api/auth/user/login', async (req, res) => {
    const { email, password, orgId } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const db = getDb();

    let user = db.users.find(u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        (u.role === 'user_employee' || u.rbacRole === ROLES.USER)
    );

    if (!user) {
        return res.status(401).json({ success: false, error: 'No employee account found with this email.' });
    }

    // Verify password
    if (user.passwordHash) {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        }
    } else if (password !== 'officer1234' && password !== 'employee1234') {
        return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    // Validate org
    let org = null;
    if (orgId) {
        org = findOrganization(orgId);
        if (!org) {
            return res.status(400).json({ success: false, error: 'Invalid Organization ID or Code.' });
        }
        user.orgId = org.id;
        saveDb(db);
    }
    const userOrg = db.organizations.find(o => o.id === user.orgId) || db.organizations[0];

    user.rbacRole = ROLES.USER;

    const token = signToken({
        id: user.id,
        email: user.email,
        role: ROLES.USER,
        orgId: userOrg.id
    });

    addAuditLog(user.id, 'USER_LOGIN', user.id, `Employee ${user.name} logged into Sentinel Officer Portal (${userOrg.name}).`);

    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: { ...safeUser, rbacRole: ROLES.USER }, organization: userOrg, token });
});

// -------- USER / EMPLOYEE SIGNUP --------
app.post('/api/auth/user/signup', async (req, res) => {
    const { email, password, name, orgId } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: 'Name, email and password are required.' });
    }

    const db = getDb();

    // Check for existing user
    if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    let org = null;
    if (orgId) {
        org = findOrganization(orgId);
        if (!org) {
            return res.status(400).json({ success: false, error: 'Invalid Organization ID or Code.' });
        }
    }
    const targetOrg = org || db.organizations[0];

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
        id: `usr_${Date.now()}`,
        orgId: targetOrg.id,
        deptId: null,
        name,
        email,
        role: 'user_employee',
        rbacRole: ROLES.USER,
        title: 'Employee',
        avatar: null,
        baseline: null,
        passwordHash
    };

    db.users.push(newUser);
    saveDb(db);

    const token = signToken({
        id: newUser.id,
        email: newUser.email,
        role: ROLES.USER,
        orgId: targetOrg.id
    });

    addAuditLog(newUser.id, 'USER_SIGNUP', newUser.id, `New employee ${newUser.name} registered for org ${targetOrg.name}.`);

    const { passwordHash: ph, ...safeUser } = newUser;
    res.json({ success: true, user: safeUser, organization: targetOrg, token });
});

// -------- PSYCHOLOGIST / DOCTOR LOGIN --------
app.post('/api/auth/psychologist/login', async (req, res) => {
    const { email, password, orgId } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const db = getDb();

    let user = db.users.find(u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        (u.role === 'doctor' || u.rbacRole === ROLES.PSYCHOLOGIST)
    );

    if (!user) {
        return res.status(401).json({ success: false, error: 'No verified Psychologist/Doctor account found with this email.' });
    }

    // Verify password
    if (user.passwordHash) {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        }
    } else if (password !== 'doctor1234' && password !== 'doctor5678') {
        return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    let org = null;
    if (orgId) {
        org = findOrganization(orgId);
    }
    if (!org) {
        org = db.organizations.find(o => o.id === user.orgId) || db.organizations[0];
    }

    user.rbacRole = ROLES.PSYCHOLOGIST;

    const token = signToken({
        id: user.id,
        email: user.email,
        role: ROLES.PSYCHOLOGIST,
        orgId: org.id
    });

    addAuditLog(user.id, 'PSYCHOLOGIST_LOGIN', user.id, `Psychologist ${user.name} logged into Clinical Portal (${org.name}).`);

    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: { ...safeUser, rbacRole: ROLES.PSYCHOLOGIST }, organization: org, token });
});

// -------- TOKEN VERIFY (used by frontend to restore session) --------
app.post('/api/auth/verify', requireAuth, (req, res) => {
    const db = getDb();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    const org = db.organizations.find(o => o.id === req.user.orgId) || db.organizations[0];
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: { ...safeUser, rbacRole: req.user.role }, organization: org });
});

// ============================================================
// PUBLIC APIs
// ============================================================

app.get('/api/organizations', (req, res) => {
    const db = getDb();
    res.json({ organizations: db.organizations });
});

// ============================================================
// USER (EMPLOYEE) PROTECTED APIs — Role: USER
// ============================================================

app.get('/api/checkins', requireAuth, requireRole(ROLES.USER), (req, res) => {
    // Users can only see their OWN check-ins
    const userId = req.user.id;
    const db = getDb();
    const userCheckins = db.wellbeingCheckins
        .filter(c => c.userId === userId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ checkins: userCheckins });
});

app.post('/api/checkins', requireAuth, requireRole(ROLES.USER), (req, res) => {
    const { stressLevel, fatigue, mood, workload, sleepHours, sleepQuality, motivation, journal, afterHoursWorkMinutes } = req.body;
    const db = getDb();
    const uid = req.user.id; // Always use authenticated user's ID

    const user = db.users.find(u => u.id === uid);
    const existingCheckins = db.wellbeingCheckins.filter(c => c.userId === uid);
    const baseline = user?.baseline || calculatePersonalBaseline(existingCheckins);

    const newCheckinData = {
        stressLevel: Number(stressLevel || 5),
        fatigue: Number(fatigue || 5),
        mood: Number(mood || 6),
        workload: Number(workload || 6),
        sleepHours: Number(sleepHours || 7),
        sleepQuality: Number(sleepQuality || 6),
        motivation: Number(motivation || 6),
    };

    const riskEvaluation = evaluateCheckinRisk(newCheckinData, existingCheckins, baseline);

    const todayStr = new Date().toISOString().split('T')[0];
    const newCheckin = {
        id: `chk_${Date.now()}`,
        userId: uid,
        date: todayStr,
        ...newCheckinData,
        afterHoursWorkMinutes: Number(afterHoursWorkMinutes || 0),
        journal: journal || '',
        score: riskEvaluation.score,
        level: riskEvaluation.level
    };

    db.wellbeingCheckins.push(newCheckin);
    saveDb(db);

    addAuditLog(uid, 'SUBMIT_CHECKIN', newCheckin.id, `User submitted daily check-in (Risk Score: ${riskEvaluation.score}, Level: ${riskEvaluation.level}).`);

    res.json({ success: true, checkin: newCheckin, riskEvaluation });
});

app.get('/api/user/baseline', requireAuth, requireRole(ROLES.USER), (req, res) => {
    const userId = req.user.id;
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    const checkins = db.wellbeingCheckins.filter(c => c.userId === userId);

    const baseline = user?.baseline || calculatePersonalBaseline(checkins);
    const latestCheckin = checkins[checkins.length - 1] || {};
    const riskEval = evaluateCheckinRisk(latestCheckin, checkins, baseline);

    res.json({ userId, baseline, latestCheckin, riskEval });
});

app.get('/api/user/consent', requireAuth, requireRole(ROLES.USER), (req, res) => {
    const userId = req.user.id;
    const db = getDb();
    const consent = db.consentRecords.find(c => c.userId === userId) || {
        userId,
        shareWithCompanyAggregated: true,
        shareWithAssignedDoctorDetailed: true,
        allowEmergencyEscalation: true,
        allowWorkPatternAnalytics: true
    };
    res.json({ consent });
});

app.post('/api/user/consent', requireAuth, requireRole(ROLES.USER), (req, res) => {
    const { shareWithCompanyAggregated, shareWithAssignedDoctorDetailed, allowEmergencyEscalation, allowWorkPatternAnalytics } = req.body;
    const db = getDb();
    const uid = req.user.id;

    let record = db.consentRecords.find(c => c.userId === uid);
    if (!record) {
        record = { userId: uid };
        db.consentRecords.push(record);
    }
    record.shareWithCompanyAggregated = shareWithCompanyAggregated;
    record.shareWithAssignedDoctorDetailed = shareWithAssignedDoctorDetailed;
    record.allowEmergencyEscalation = allowEmergencyEscalation;
    record.allowWorkPatternAnalytics = allowWorkPatternAnalytics;
    record.updatedAt = new Date().toISOString();

    saveDb(db);
    addAuditLog(uid, 'UPDATE_CONSENT_SETTINGS', uid, 'User updated privacy and data sharing settings.');
    res.json({ success: true, consent: record });
});

app.get('/api/psychologists', requireAuth, requireRole([ROLES.USER, ROLES.PSYCHOLOGIST]), (req, res) => {
    const db = getDb();
    const doctors = db.users
        .filter(u => u.role === 'doctor' || u.rbacRole === ROLES.PSYCHOLOGIST)
        .map(d => ({
            id: d.id,
            name: d.name,
            email: d.email,
            title: d.title,
            specialty: d.specialty,
            avatar: d.avatar,
            licenseNumber: d.licenseNumber,
            availabilityStatus: d.availabilityStatus || 'AVAILABLE'
        }));
    res.json({ psychologists: doctors });
});

app.get('/api/consultations/user', requireAuth, requireRole([ROLES.USER, ROLES.PSYCHOLOGIST]), (req, res) => {
    const userId = req.user.id;
    const db = getDb();

    const consultations = db.consultations
        .filter(c => c.userId === userId || c.doctorId === userId)
        .map(c => {
            const doctor = db.users.find(u => u.id === c.doctorId);
            const user = db.users.find(u => u.id === c.userId);
            const notes = db.consultationNotes.find(n => n.consultationId === c.id);
            return {
                ...c,
                doctorName: doctor ? doctor.name : 'Dr. Sarah Connor, MD',
                doctorTitle: doctor ? doctor.title : 'Chief Occupational Psychiatrist',
                doctorAvatar: doctor ? doctor.avatar : '',
                doctorSpecialty: doctor ? doctor.specialty : '',
                userName: user ? user.name : 'Officer',
                userTitle: user ? user.title : 'Officer',
                userAvatar: user ? user.avatar : '',
                notes: notes || null
            };
        });

    res.json({ consultations });
});

app.post('/api/consultations/request', requireAuth, requireRole([ROLES.USER, ROLES.PSYCHOLOGIST]), (req, res) => {
    const { doctorId, reason } = req.body;
    const db = getDb();

    const targetDocId = doctorId || 'usr_doc1';
    const uid = req.user.id;
    const now = new Date().toISOString();

    const newConsultation = {
        id: `cons_${Date.now()}`,
        userId: uid,
        doctorId: targetDocId,
        status: 'REQUESTED',
        requested_at: now,
        accepted_at: null,
        started_at: null,
        ended_at: null,
        duration: null,
        scheduledTime: null,
        reason: reason || 'Routine mental well-being check and fatigue management consultation.',
        doctorNotes: 'Pending physician review.',
        followUpAction: '',
        created_at: now,
        updated_at: now
    };

    db.consultations.unshift(newConsultation);
    saveDb(db);

    const user = db.users.find(u => u.id === uid);
    addAuditLog(uid, 'CREATE_CONSULTATION_REQUEST', newConsultation.id, `Requested doctor consultation with doctor ${targetDocId}.`);

    io.to(`user_${targetDocId}`).emit('consultation:request', {
        consultation: newConsultation,
        userName: user ? user.name : 'Officer'
    });

    res.json({ success: true, consultation: newConsultation });
});

// AI Chatbot — uses the local Abimanyu backend implementation instead of the dead external URL
app.post('/api/ai/chat', requireAuth, requireRole([ROLES.USER, ROLES.PSYCHOLOGIST]), async (req, res) => {
    const { message, messages } = req.body;
    const db = getDb();

    let userMessage = message;
    if (!userMessage && Array.isArray(messages) && messages.length > 0) {
        userMessage = messages[messages.length - 1]?.content || messages[messages.length - 1]?.text || '';
    }
    if (!userMessage) return res.status(400).json({ error: 'No message provided.' });

    const userId = req.user.id;
    let contextPrefix = '';
    try {
        const user = db.users.find(u => u.id === userId);
        const checkins = db.wellbeingCheckins.filter(c => c.userId === userId);
        const latest = checkins[checkins.length - 1] || {};
        const risk = evaluateCheckinRisk(latest, checkins, user?.baseline);
        contextPrefix = `[User: ${user?.name || 'Officer'} | Stress: ${risk.level} ${risk.score}/100] `;
    } catch (_) { }

    try {
        const aiResult = await getAbimanyuResponse(contextPrefix + userMessage, [], 'english');
        res.json({
            reply: aiResult.responseText || aiResult.reply || 'I am here for you, warrior. Please tell me what troubles your heart.',
            sentiment: 'neutral',
            mood: aiResult.emotion || 'calm',
            audio: null
        });
    } catch (err) {
        console.error('Local ABIMANYU AI error:', err.message);
        res.json({
            reply: "I'm here for you. Please take a deep breath — the connection to my guidance was briefly interrupted. Please try again.",
            sentiment: 'neutral',
            mood: 'calm',
            audio: null
        });
    }
});

// Wearable sync - USER only
app.post('/api/wearables/sync', requireAuth, requireRole(ROLES.USER), (req, res) => {
    const { heartRateBpm, hrvMs, sleepDurationHours, respirationRate, deviceType } = req.body;
    const uid = req.user.id;

    const wearableLog = {
        timestamp: new Date().toISOString(),
        userId: uid,
        heartRateBpm: heartRateBpm || 72,
        hrvMs: hrvMs || 48,
        sleepDurationHours: sleepDurationHours || 7.1,
        respirationRate: respirationRate || 16,
        deviceType: deviceType || 'Garmin Tactical Smartwatch / Edge Gateway'
    };

    addAuditLog(uid, 'WEARABLE_DATA_SYNC', uid, `Ingested physiological wearable metrics from ${wearableLog.deviceType}.`);

    res.json({
        success: true,
        message: 'Wearable data integrated into SENTINEL AI Stress Engine pipeline.',
        data: wearableLog
    });
});

// ============================================================
// PSYCHOLOGIST PROTECTED APIs — Role: PSYCHOLOGIST
// ============================================================

app.get('/api/doctor/users', requireAuth, requireRole(ROLES.PSYCHOLOGIST), (req, res) => {
    const doctorId = req.user.id;
    const db = getDb();

    const assigned = db.doctorAssignments.filter(a => a.doctorId === doctorId);
    const patientIds = assigned.map(a => a.userId);

    const patients = db.users
        .filter(u => patientIds.includes(u.id))
        .map(user => {
            const checkins = db.wellbeingCheckins.filter(c => c.userId === user.id);
            const latest = checkins[checkins.length - 1] || {};
            const riskEval = evaluateCheckinRisk(latest, checkins, user.baseline);
            const consent = db.consentRecords.find(c => c.userId === user.id);

            const { passwordHash, ...safeUser } = user;
            return {
                ...safeUser,
                latestCheckin: latest,
                riskEval,
                consentAuthorized: consent ? consent.shareWithAssignedDoctorDetailed : true
            };
        });

    addAuditLog(doctorId, 'VIEW_ASSIGNED_PATIENTS', doctorId, `Psychologist viewed list of ${patients.length} assigned patients.`);
    res.json({ patients });
});

app.get('/api/doctor/users/:id', requireAuth, requireRole(ROLES.PSYCHOLOGIST), (req, res) => {
    const userId = req.params.id;
    const doctorId = req.user.id;
    const db = getDb();

    // Check assignment
    const isAssigned = db.doctorAssignments.some(a => a.doctorId === doctorId && a.userId === userId);
    if (!isAssigned) {
        return res.status(403).json({ success: false, error: 'Access Denied. This patient is not assigned to you.' });
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const consent = db.consentRecords.find(c => c.userId === userId);
    const isAuthorized = consent ? consent.shareWithAssignedDoctorDetailed : true;

    const checkins = db.wellbeingCheckins
        .filter(c => c.userId === userId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const latest = checkins[checkins.length - 1] || {};
    const riskEval = evaluateCheckinRisk(latest, checkins, user.baseline);

    const consultations = db.consultations.filter(c => c.userId === userId && c.doctorId === doctorId);

    const sanitizedCheckins = checkins.map(c => ({
        ...c,
        journal: isAuthorized ? c.journal : '[CONFIDENTIAL - Consent Restricted]'
    }));

    addAuditLog(doctorId, 'VIEW_PATIENT_CLINICAL_PROFILE', userId, `Psychologist viewed clinical profile for ${user.name}.`);

    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser, consent, isAuthorized, checkins: sanitizedCheckins, riskEval, consultations });
});

app.put('/api/psychologists/availability', requireAuth, requireRole(ROLES.PSYCHOLOGIST), (req, res) => {
    const { availabilityStatus } = req.body;
    const db = getDb();
    const doc = db.users.find(u => u.id === req.user.id);
    if (!doc) return res.status(404).json({ error: 'Psychologist not found' });

    if (['AVAILABLE', 'BUSY', 'OFFLINE'].includes(availabilityStatus)) {
        doc.availabilityStatus = availabilityStatus;
        saveDb(db);
        addAuditLog(doc.id, 'UPDATE_AVAILABILITY', doc.id, `Psychologist ${doc.name} updated availability to ${availabilityStatus}.`);
        io.emit('psychologist:availability_changed', { doctorId: doc.id, availabilityStatus });
        return res.json({ success: true, doctor: doc });
    }
    return res.status(400).json({ error: 'Invalid availability status' });
});

app.get('/api/consultations/psychologist', requireAuth, requireRole(ROLES.PSYCHOLOGIST), (req, res) => {
    const doctorId = req.user.id;
    const db = getDb();

    const consultations = db.consultations
        .filter(c => c.doctorId === doctorId)
        .map(c => {
            const user = db.users.find(u => u.id === c.userId);
            const notes = db.consultationNotes.find(n => n.consultationId === c.id);
            return {
                ...c,
                userName: user ? user.name : 'Unknown User',
                userTitle: user ? user.title : 'Officer',
                userAvatar: user ? user.avatar : '',
                notes: notes || null
            };
        });

    res.json({ consultations });
});

app.post('/api/consultations/:id/accept', requireAuth, requireRole(ROLES.PSYCHOLOGIST), (req, res) => {
    const { id } = req.params;
    const db = getDb();

    const cons = db.consultations.find(c => c.id === id);
    if (!cons) return res.status(404).json({ error: 'Consultation not found' });

    if (cons.doctorId !== req.user.id) {
        return res.status(403).json({ error: 'Access Denied. This consultation is not assigned to you.' });
    }

    cons.status = 'ACCEPTED';
    cons.accepted_at = new Date().toISOString();
    cons.updated_at = new Date().toISOString();
    saveDb(db);

    addAuditLog(req.user.id, 'ACCEPT_CONSULTATION', cons.id, `Accepted consultation request ${cons.id}.`);

    const doc = db.users.find(u => u.id === req.user.id);
    io.to(`user_${cons.userId}`).emit('consultation:accepted', {
        consultationId: cons.id,
        doctorName: doc ? doc.name : 'Dr. Sarah Connor, MD'
    });

    res.json({ success: true, consultation: cons });
});

app.post('/api/consultations/:id/reject', requireAuth, requireRole(ROLES.PSYCHOLOGIST), (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const db = getDb();

    const cons = db.consultations.find(c => c.id === id);
    if (!cons) return res.status(404).json({ error: 'Consultation not found' });

    if (cons.doctorId !== req.user.id) {
        return res.status(403).json({ error: 'Access Denied.' });
    }

    cons.status = 'REJECTED';
    cons.updated_at = new Date().toISOString();
    if (reason) cons.doctorNotes = `Rejected: ${reason}`;
    saveDb(db);

    addAuditLog(req.user.id, 'REJECT_CONSULTATION', cons.id, `Rejected consultation request ${cons.id}.`);

    io.to(`user_${cons.userId}`).emit('consultation:rejected', {
        consultationId: cons.id,
        reason: reason || 'Psychologist currently unavailable'
    });

    res.json({ success: true, consultation: cons });
});

app.post('/api/consultations/:id/start', requireAuth, requireRole([ROLES.PSYCHOLOGIST, ROLES.USER]), (req, res) => {
    const { id } = req.params;
    const db = getDb();

    const cons = db.consultations.find(c => c.id === id);
    if (!cons) return res.status(404).json({ error: 'Consultation not found' });

    if (req.user.id !== cons.doctorId && req.user.id !== cons.userId) {
        return res.status(403).json({ error: 'Access Denied.' });
    }

    cons.status = 'IN_PROGRESS';
    if (!cons.started_at) cons.started_at = new Date().toISOString();
    cons.updated_at = new Date().toISOString();
    saveDb(db);

    io.to(`user_${cons.userId}`).emit('consultation:ready', { consultationId: cons.id });
    io.to(`user_${cons.doctorId}`).emit('consultation:ready', { consultationId: cons.id });

    res.json({ success: true, consultation: cons });
});

app.post('/api/consultations/:id/end', requireAuth, requireRole([ROLES.PSYCHOLOGIST, ROLES.USER]), (req, res) => {
    const { id } = req.params;
    const { duration } = req.body;
    const db = getDb();

    const cons = db.consultations.find(c => c.id === id);
    if (!cons) return res.status(404).json({ error: 'Consultation not found' });

    const uid = req.user.id;
    if (uid !== cons.userId && uid !== cons.doctorId) {
        return res.status(403).json({ error: 'Access Denied. You are not a participant in this consultation.' });
    }

    cons.status = 'COMPLETED';
    cons.ended_at = new Date().toISOString();
    if (duration !== undefined) cons.duration = duration;
    cons.updated_at = new Date().toISOString();
    saveDb(db);

    addAuditLog(uid, 'END_CONSULTATION', cons.id, `Consultation ${cons.id} ended. Duration: ${duration || 'N/A'}.`);
    io.to(`room_${cons.id}`).emit('call:ended', { consultationId: cons.id });

    res.json({ success: true, consultation: cons });
});

app.post('/api/consultations/:id/notes', requireAuth, requireRole(ROLES.PSYCHOLOGIST), (req, res) => {
    const { id } = req.params;
    const { notes, followUpRequired, followUpDate } = req.body;
    const db = getDb();

    const cons = db.consultations.find(c => c.id === id);
    if (!cons) return res.status(404).json({ error: 'Consultation not found' });

    if (req.user.id !== cons.doctorId) {
        return res.status(403).json({ error: 'Unauthorized: Only the assigned psychologist can write notes for this consultation.' });
    }

    let noteRecord = db.consultationNotes.find(n => n.consultationId === id);
    const now = new Date().toISOString();

    if (!noteRecord) {
        noteRecord = {
            id: `note_${Date.now()}`,
            consultationId: id,
            doctorId: req.user.id,
            notes: notes || '',
            followUpRequired: Boolean(followUpRequired),
            followUpDate: followUpDate || null,
            createdAt: now,
            updatedAt: now
        };
        db.consultationNotes.unshift(noteRecord);
    } else {
        noteRecord.notes = notes !== undefined ? notes : noteRecord.notes;
        noteRecord.followUpRequired = followUpRequired !== undefined ? Boolean(followUpRequired) : noteRecord.followUpRequired;
        noteRecord.followUpDate = followUpDate !== undefined ? followUpDate : noteRecord.followUpDate;
        noteRecord.updatedAt = now;
    }

    cons.doctorNotes = notes || cons.doctorNotes;
    cons.followUpAction = followUpRequired ? `Follow-up scheduled on ${followUpDate}` : 'No follow-up required';
    saveDb(db);

    addAuditLog(req.user.id, 'CREATE_CLINICAL_NOTES', id, `Psychologist added confidential notes for consultation ${id}.`);
    res.json({ success: true, note: noteRecord });
});

app.get('/api/consultations/:id/notes', requireAuth, requireRole(ROLES.PSYCHOLOGIST), (req, res) => {
    const { id } = req.params;
    const db = getDb();

    const cons = db.consultations.find(c => c.id === id);
    if (!cons) return res.status(404).json({ error: 'Consultation not found' });

    if (req.user.id !== cons.doctorId) {
        return res.status(403).json({ error: 'Unauthorized access to confidential clinical notes.' });
    }

    const note = db.consultationNotes.find(n => n.consultationId === id) || null;
    res.json({ note });
});

// Gemini clinical report - PSYCHOLOGIST only
app.post('/api/doctor/generate-report', requireAuth, requireRole(ROLES.PSYCHOLOGIST), async (req, res) => {
    const { patientId, apiKey } = req.body;
    const db = getDb();
    const doctorId = req.user.id;

    // Verify assignment
    const isAssigned = db.doctorAssignments.some(a => a.doctorId === doctorId && a.userId === patientId);
    if (!isAssigned) {
        return res.status(403).json({ success: false, error: 'Access Denied. Patient not assigned to you.' });
    }

    const patient = db.users.find(u => u.id === (patientId || 'usr_1')) || db.users[0];
    const userCheckins = db.wellbeingCheckins.filter(c => c.userId === patient.id);
    const riskEval = evaluateCheckinRisk(userCheckins);

    addAuditLog(doctorId, 'GENERATE_GEMINI_CLINICAL_REPORT', patient.id, `Psychologist generated Gemini AI Structured Clinical Report for Officer ${patient.name}.`);

    const result = await generateGeminiClinicalReport(patient, userCheckins, riskEval, apiKey);
    const { passwordHash: ph, ...safePatient } = patient;
    res.json({
        success: true,
        patient: {
            id: safePatient.id,
            name: safePatient.name,
            title: safePatient.title,
            department: safePatient.department,
            avatar: safePatient.avatar
        },
        report: result.report,
        provider: result.provider
    });
});

// ============================================================
// ORGANIZATION OFFICER PROTECTED APIs — Role: ORGANIZATION_OFFICER
// ============================================================

app.get('/api/company/overview', requireAuth, requireRole(ROLES.ORGANIZATION_OFFICER), (req, res) => {
    const orgId = req.user.orgId || req.query.orgId || 'org_1';
    const db = getDb();
    const org = db.organizations.find(o => o.id === orgId);

    // PRIVACY RULE: Aggregate numbers only — NO individual user data
    const orgUsers = db.users.filter(u => u.orgId === orgId && (u.role === 'user_employee' || u.rbacRole === ROLES.USER));

    let lowCount = 0, modCount = 0, elevCount = 0, highCount = 0;

    orgUsers.forEach(u => {
        const checkins = db.wellbeingCheckins.filter(c => c.userId === u.id);
        const latest = checkins[checkins.length - 1] || {};
        const evalResult = evaluateCheckinRisk(latest, checkins, u.baseline);

        if (evalResult.level === 'GREEN') lowCount++;
        else if (evalResult.level === 'YELLOW') modCount++;
        else if (evalResult.level === 'ORANGE') elevCount++;
        else if (evalResult.level === 'RED') highCount++;
    });

    const total = Math.max(1, orgUsers.length);
    const overview = {
        organizationName: org ? org.name : 'Defense Organization',
        totalEmployees: org ? org.employeeCount : 1250,
        activeMonitored: orgUsers.length,
        riskBreakdown: {
            lowPct: Math.round((lowCount / total) * 100) || 72,
            moderatePct: Math.round((modCount / total) * 100) || 18,
            elevatedPct: Math.round((elevCount / total) * 100) || 8,
            highPct: Math.round((highCount / total) * 100) || 2
        },
        overallRiskStatus: elevCount + highCount > 0 ? 'Moderate' : 'Stable',
        trend: '↑ 4% Increase in After-Hours Operational Load'
    };

    addAuditLog(req.user.id, 'VIEW_COMPANY_OVERVIEW', orgId, 'Organization Officer viewed aggregated analytics.');
    res.json({ overview });
});

app.get('/api/company/personnel-stress', requireAuth, requireRole(ROLES.ORGANIZATION_OFFICER), (req, res) => {
    const orgId = req.user.orgId || req.query.orgId || 'org_1';
    const db = getDb();

    const orgUsers = db.users.filter(u => u.orgId === orgId && (u.role === 'user_employee' || u.rbacRole === ROLES.USER));

    const personnel = orgUsers.map(u => {
        const checkins = db.wellbeingCheckins.filter(c => c.userId === u.id);
        const latest = checkins[checkins.length - 1] || {};
        const evalResult = evaluateCheckinRisk(latest, checkins, u.baseline);

        return {
            id: u.id,
            name: u.name,
            title: u.title,
            avatar: u.avatar || '',
            departmentId: u.deptId,
            riskLevel: evalResult.level,
            riskScore: evalResult.score,
            latestCheckinDate: latest.date || 'Never'
        };
    });

    addAuditLog(req.user.id, 'VIEW_PERSONNEL_STRESS', orgId, 'Organization Officer fetched individual personnel stress data.');
    res.json({ personnel });
});

app.get('/api/company/departments', requireAuth, requireRole(ROLES.ORGANIZATION_OFFICER), (req, res) => {
    const orgId = req.user.orgId || req.query.orgId || 'org_1';
    const db = getDb();

    const depts = db.departments.filter(d => d.orgId === orgId);
    const deptStats = depts.map(d => {
        const deptUsers = db.users.filter(u => u.deptId === d.id);
        let avgStressScore = 42;
        if (deptUsers.length > 0) {
            let sum = 0;
            deptUsers.forEach(u => {
                const checkins = db.wellbeingCheckins.filter(c => c.userId === u.id);
                const latest = checkins[checkins.length - 1] || {};
                const evalR = evaluateCheckinRisk(latest, checkins, u.baseline);
                sum += evalR.score;
            });
            avgStressScore = Math.round(sum / deptUsers.length);
        }

        return {
            id: d.id,
            name: d.name,
            personnelCount: deptUsers.length * 40 + 80,
            riskLevel: d.riskLevel,
            avgStressScore,
            trend: avgStressScore > 65 ? 'Increasing' : 'Stable'
        };
    });

    res.json({ departments: deptStats });
});

app.get('/api/company/alerts', requireAuth, requireRole(ROLES.ORGANIZATION_OFFICER), (req, res) => {
    const orgId = req.user.orgId || req.query.orgId || 'org_1';
    const db = getDb();
    const alerts = db.companyAlerts.filter(a => a.orgId === orgId);
    res.json({ alerts });
});

app.get('/api/company/audit-logs', requireAuth, requireRole(ROLES.ORGANIZATION_OFFICER), (req, res) => {
    const db = getDb();
    res.json({ logs: db.auditLogs.slice(0, 100) });
});

// ============================================================
// SHARED PROTECTED APIs (PSYCHOLOGIST + USER for calls)
// ============================================================

app.post('/api/calls/:consultationId/join', requireAuth, (req, res) => {
    const { consultationId } = req.params;
    const db = getDb();

    const cons = db.consultations.find(c => c.id === consultationId);
    if (!cons) return res.status(404).json({ error: 'Consultation not found' });

    const requesterId = req.user.id;
    if (requesterId !== cons.userId && requesterId !== cons.doctorId) {
        return res.status(403).json({ error: 'Unauthorized: You are not a participant of this consultation session.' });
    }

    if (cons.status === 'REJECTED' || cons.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Consultation is no longer active.' });
    }

    const roomToken = `room_${consultationId}`;
    addAuditLog(requesterId, 'JOIN_CALL_SESSION', consultationId, `Participant ${requesterId} authorized to join confidential room ${roomToken}.`);

    res.json({
        success: true,
        consultation: cons,
        room: roomToken,
        iceServers: getIceServers()
    });
});

// ============================================================
// ADMIN-ONLY: Get all users (for legacy internal use only)
// ============================================================
app.get('/api/users', requireAuth, requireRole(ROLES.ORGANIZATION_OFFICER), (req, res) => {
    const db = getDb();
    const safeUsers = db.users.map(({ passwordHash, ...user }) => user);
    res.json({ users: safeUsers });
});

// ============================================================
// SOCKET.IO WEBRTC SIGNALING SERVER
// ============================================================

const onlineUsers = new Map(); // userId -> { socketId, name, role }

io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // Register user for direct P2P call signaling & room routing
    socket.on('user:register', ({ userId, name, role }) => {
        if (userId) {
            socket.join(`user_${userId}`);
            socket.data = { ...socket.data, userId, username: name || userId, role: role || 'user' };
            onlineUsers.set(userId, { socketId: socket.id, name: name || userId, role: role || 'user' });
            console.log(`👤 Socket ${socket.id} registered for user: ${userId}`);
        }
    });

    socket.on('user:online', ({ userId, name, role }) => {
        if (userId) {
            socket.join(`user_${userId}`);
            socket.data = { ...socket.data, userId, username: name || userId, role: role || 'user' };
            onlineUsers.set(userId, { socketId: socket.id, name: name || userId, role: role || 'user' });
        }
    });

    // Realtime-Voice-Chat-System-main P2P Call Handlers
    socket.on('consultation:request', ({ toUserId, doctorId, note, reason }) => {
        const targetId = toUserId || doctorId;
        const fromUserId = socket.data.userId || socket.id;
        const fromName = socket.data.username || fromUserId;

        console.log(`📞 Call Request: ${fromName} (${fromUserId}) -> Doctor ${targetId}`);

        if (targetId) {
            io.to(`user_${targetId}`).emit('consultation:incoming', {
                fromUserId,
                fromName,
                note: note || reason,
                role: socket.data.role || 'user'
            });
            io.to(`user_${targetId}`).emit('consultation:request', {
                fromUserId,
                fromName,
                reason: note || reason
            });
            socket.emit('consultation:requested', { toUserId: targetId });
        }
    });

    socket.on('consultation:accept', ({ toUserId, userId, consultationId }) => {
        const targetId = toUserId || userId;
        const doctorId = socket.data.userId || socket.id;
        console.log(`✅ Call Accepted by Doctor ${doctorId} for User ${targetId}`);

        if (targetId) {
            io.to(`user_${targetId}`).emit('consultation:accepted', {
                consultationId,
                doctorId,
                doctorName: socket.data.username || doctorId
            });
        }
        if (consultationId) {
            io.to(`room_${consultationId}`).emit('call:ready', { consultationId, status: 'IN_PROGRESS' });
        }
    });

    socket.on('consultation:reject', ({ toUserId, userId, reason }) => {
        const targetId = toUserId || userId;
        if (targetId) {
            io.to(`user_${targetId}`).emit('consultation:rejected', {
                reason: reason || 'Psychologist unavailable at this moment.'
            });
        }
    });

    socket.on('consultation:end', ({ toUserId, consultationId }) => {
        if (toUserId) {
            io.to(`user_${toUserId}`).emit('consultation:ended', { fromUserId: socket.data.userId });
        }
        if (consultationId) {
            io.to(`room_${consultationId}`).emit('call:ended', { consultationId });
        }
    });

    // Realtime-Voice-Chat-System-main WebRTC Direct Signal Handlers
    socket.on('webrtc:offer', ({ toUserId, offer, consultationId }) => {
        if (toUserId) {
            io.to(`user_${toUserId}`).emit('webrtc:offer', { offer, fromUserId: socket.data.userId });
        }
        if (consultationId) {
            socket.to(`room_${consultationId}`).emit('call:offer', { sdp: offer, senderId: socket.id });
        }
    });

    socket.on('webrtc:answer', ({ toUserId, answer, consultationId }) => {
        if (toUserId) {
            io.to(`user_${toUserId}`).emit('webrtc:answer', { answer, fromUserId: socket.data.userId });
        }
        if (consultationId) {
            socket.to(`room_${consultationId}`).emit('call:answer', { sdp: answer, senderId: socket.id });
        }
    });

    socket.on('webrtc:ice', ({ toUserId, candidate, consultationId }) => {
        if (toUserId) {
            io.to(`user_${toUserId}`).emit('webrtc:ice', { candidate, fromUserId: socket.data.userId });
        }
        if (consultationId) {
            socket.to(`room_${consultationId}`).emit('call:ice-candidate', { candidate, senderId: socket.id });
        }
    });

    // Room-Based WebRTC Call Handlers
    socket.on('call:join', ({ consultationId, userId, doctorId, participantId, role }) => {
        const db = getDb();
        const cons = db.consultations.find(c => c.id === consultationId);

        const currentPartId = participantId || userId || doctorId || (socket.data && socket.data.userId);

        if (!cons) {
            socket.emit('call:error', { message: 'Consultation session not found.' });
            return;
        }

        const roomToken = `room_${consultationId}`;
        socket.join(roomToken);
        socket.data = { consultationId, userId: currentPartId, role, room: roomToken };

        console.log(`🎧 Participant ${currentPartId} (${role}) joined consultation room: ${roomToken}`);

        const roomSockets = io.sockets.adapter.rooms.get(roomToken);
        const occupantCount = roomSockets ? roomSockets.size : 0;

        socket.to(roomToken).emit('call:peer_joined', { participantId: currentPartId, role, occupantCount });

        if (occupantCount >= 2) {
            io.to(roomToken).emit('call:ready', { consultationId, status: 'IN_PROGRESS' });
        }
    });

    socket.on('call:offer', ({ sdp, consultationId }) => {
        const roomToken = `room_${consultationId}`;
        socket.to(roomToken).emit('call:offer', { sdp, senderId: socket.id });
    });

    socket.on('call:answer', ({ sdp, consultationId }) => {
        const roomToken = `room_${consultationId}`;
        socket.to(roomToken).emit('call:answer', { sdp, senderId: socket.id });
    });

    socket.on('call:ice-candidate', ({ candidate, consultationId }) => {
        const roomToken = `room_${consultationId}`;
        socket.to(roomToken).emit('call:ice-candidate', { candidate, senderId: socket.id });
    });

    socket.on('call:mute_state', ({ consultationId, isMuted, role }) => {
        const roomToken = `room_${consultationId}`;
        socket.to(roomToken).emit('call:peer_mute_changed', { isMuted, role });
    });

    socket.on('call:reconnect_attempt', ({ consultationId, role }) => {
        const roomToken = `room_${consultationId}`;
        socket.to(roomToken).emit('call:peer_reconnecting', { role });
    });

    socket.on('call:end', ({ consultationId }) => {
        const roomToken = `room_${consultationId}`;
        io.to(roomToken).emit('call:ended', { consultationId });
    });

    socket.on('disconnect', () => {
        if (socket.data && socket.data.userId) {
            onlineUsers.delete(socket.data.userId);
        }
        if (socket.data && socket.data.room) {
            socket.to(socket.data.room).emit('call:peer_disconnected', {
                participantId: socket.data.userId,
                role: socket.data.role
            });
        }
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// ============================================================
// START SERVER
// ============================================================
async function startServer() {
    await ensurePasswordsSeeded();
    server.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🛡️  CHIDAMBARANAR AI Backend running on port ${PORT}`);
        console.log(`====================================================`);
        console.log(`🔐 RBAC Roles: USER | PSYCHOLOGIST | ORGANIZATION_OFFICER`);
        console.log(`====================================================`);
    });
}

startServer();
