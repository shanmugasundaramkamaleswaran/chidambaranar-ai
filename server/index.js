import express from 'express';
import cors from 'cors';
import { getDb, saveDb, addAuditLog } from './db.js';
import { evaluateCheckinRisk, calculatePersonalBaseline } from './stressEngine.js';
import { generateAiChatResponse } from './aiAssistant.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/company/login', (req, res) => {
    const db = getDb();
    const admin = db.users.find(u => u.role === 'company_admin');
    addAuditLog(admin.id, 'COMPANY_LOGIN', admin.orgId, 'Company Administrator logged into Sentinel Enterprise Portal.');
    res.json({ success: true, user: admin, token: 'demo_jwt_company_token' });
});

app.post('/api/auth/user/login', (req, res) => {
    const { userId } = req.body;
    const db = getDb();
    const targetId = userId || 'usr_1';
    const user = db.users.find(u => u.id === targetId) || db.users.find(u => u.role === 'user_employee');
    addAuditLog(user.id, 'USER_LOGIN', user.id, `User ${user.name} logged into Sentinel Officer Portal.`);
    res.json({ success: true, user, token: `demo_jwt_user_${user.id}_token` });
});

app.post('/api/auth/doctor/login', (req, res) => {
    const { doctorId } = req.body;
    const db = getDb();
    const targetId = doctorId || 'usr_doc1';
    const doctor = db.users.find(u => u.id === targetId) || db.users.find(u => u.role === 'doctor');
    addAuditLog(doctor.id, 'DOCTOR_LOGIN', doctor.id, `Doctor ${doctor.name} logged into Sentinel Clinical Portal.`);
    res.json({ success: true, user: doctor, token: `demo_jwt_doctor_${doctor.id}_token` });
});

app.get('/api/users', (req, res) => {
    const db = getDb();
    res.json({ users: db.users });
});

// --- USER CHECK-INS & BASELINE API ---

app.get('/api/checkins', (req, res) => {
    const userId = req.query.userId || 'usr_1';
    const db = getDb();
    const userCheckins = db.wellbeingCheckins
        .filter(c => c.userId === userId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ checkins: userCheckins });
});

app.post('/api/checkins', (req, res) => {
    const { userId, stressLevel, fatigue, mood, workload, sleepHours, sleepQuality, motivation, journal, afterHoursWorkMinutes } = req.body;
    const db = getDb();
    const uid = userId || 'usr_1';
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

    res.json({
        success: true,
        checkin: newCheckin,
        riskEvaluation
    });
});

app.get('/api/user/baseline', (req, res) => {
    const userId = req.query.userId || 'usr_1';
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    const checkins = db.wellbeingCheckins.filter(c => c.userId === userId);

    const baseline = user?.baseline || calculatePersonalBaseline(checkins);
    const latestCheckin = checkins[checkins.length - 1] || {};
    const riskEval = evaluateCheckinRisk(latestCheckin, checkins, baseline);

    res.json({
        userId,
        baseline,
        latestCheckin,
        riskEval
    });
});

app.get('/api/user/consent', (req, res) => {
    const userId = req.query.userId || 'usr_1';
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

app.post('/api/user/consent', (req, res) => {
    const { userId, shareWithCompanyAggregated, shareWithAssignedDoctorDetailed, allowEmergencyEscalation, allowWorkPatternAnalytics } = req.body;
    const db = getDb();
    const uid = userId || 'usr_1';

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

// --- AI CHATBOT ROUTE ---

app.post('/api/ai/chat', (req, res) => {
    const { messages, userContext } = req.body;
    const aiResponse = generateAiChatResponse(messages || [], userContext || {});
    res.json({ response: aiResponse });
});

// --- DOCTOR PORTAL APIS ---

app.get('/api/doctor/users', (req, res) => {
    const doctorId = req.query.doctorId || 'usr_doc1';
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

            return {
                ...user,
                latestCheckin: latest,
                riskEval,
                consentAuthorized: consent ? consent.shareWithAssignedDoctorDetailed : true
            };
        });

    addAuditLog(doctorId, 'VIEW_ASSIGNED_PATIENTS', doctorId, `Doctor viewed list of ${patients.length} assigned patients.`);
    res.json({ patients });
});

app.get('/api/doctor/users/:id', (req, res) => {
    const userId = req.params.id;
    const doctorId = req.query.doctorId || 'usr_doc1';
    const db = getDb();

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

    // If user denied doctor detailed access, suppress private journal text
    const sanitizedCheckins = checkins.map(c => ({
        ...c,
        journal: isAuthorized ? c.journal : '[CONFIDENTIAL - Consent Restricted]'
    }));

    addAuditLog(doctorId, 'VIEW_PATIENT_CLINICAL_PROFILE', userId, `Doctor viewed clinical profile for ${user.name}.`);

    res.json({
        user,
        consent,
        isAuthorized,
        checkins: sanitizedCheckins,
        riskEval,
        consultations
    });
});

app.get('/api/doctor/consultations', (req, res) => {
    const doctorId = req.query.doctorId || 'usr_doc1';
    const db = getDb();

    const consultations = db.consultations
        .filter(c => c.doctorId === doctorId)
        .map(c => {
            const user = db.users.find(u => u.id === c.userId);
            return {
                ...c,
                userName: user ? user.name : 'Unknown User',
                userTitle: user ? user.title : 'Officer',
                userAvatar: user ? user.avatar : ''
            };
        });

    res.json({ consultations });
});

app.post('/api/consultations/request', (req, res) => {
    const { userId, doctorId, reason } = req.body;
    const db = getDb();

    const targetDocId = doctorId || 'usr_doc1';
    const uid = userId || 'usr_1';

    const newConsultation = {
        id: `cons_${Date.now()}`,
        userId: uid,
        doctorId: targetDocId,
        requestDate: new Date().toISOString(),
        status: 'Requested',
        scheduledTime: null,
        reason: reason || 'Routine mental well-being check and fatigue management consultation.',
        doctorNotes: 'Pending physician review.',
        followUpAction: ''
    };

    db.consultations.unshift(newConsultation);
    saveDb(db);

    addAuditLog(uid, 'CREATE_CONSULTATION_REQUEST', newConsultation.id, `Requested doctor consultation with doctor ${targetDocId}.`);

    res.json({ success: true, consultation: newConsultation });
});

app.put('/api/consultations/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, scheduledTime, doctorNotes, followUpAction, doctorId } = req.body;
    const db = getDb();

    const cons = db.consultations.find(c => c.id === id);
    if (!cons) return res.status(404).json({ error: 'Consultation not found' });

    if (status) cons.status = status;
    if (scheduledTime) cons.scheduledTime = scheduledTime;
    if (doctorNotes !== undefined) cons.doctorNotes = doctorNotes;
    if (followUpAction !== undefined) cons.followUpAction = followUpAction;

    saveDb(db);

    addAuditLog(doctorId || 'usr_doc1', 'UPDATE_CONSULTATION_STATUS', cons.id, `Updated consultation status to ${status}.`);

    res.json({ success: true, consultation: cons });
});

// --- COMPANY AGGREGATED ANALYTICS APIS (PRIVACY PROTECTED) ---

app.get('/api/company/overview', (req, res) => {
    const orgId = req.query.orgId || 'org_1';
    const db = getDb();
    const org = db.organizations.find(o => o.id === orgId);

    // PRIVACY RULE: Aggregate numbers across organization employees
    const orgUsers = db.users.filter(u => u.orgId === orgId && u.role === 'user_employee');

    let lowCount = 0;
    let modCount = 0;
    let elevCount = 0;
    let highCount = 0;

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
        organizationName: org ? org.name : 'Aegis Defense Systems',
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

    addAuditLog('usr_3', 'VIEW_COMPANY_OVERVIEW', orgId, 'Company Admin viewed organization-level aggregated analytics.');

    res.json({ overview });
});

app.get('/api/company/departments', (req, res) => {
    const orgId = req.query.orgId || 'org_1';
    const db = getDb();

    const depts = db.departments.filter(d => d.orgId === orgId);
    const deptStats = depts.map(d => {
        const deptUsers = db.users.filter(u => u.deptId === d.id);
        let avgStressScore = 0;
        if (deptUsers.length > 0) {
            let sum = 0;
            deptUsers.forEach(u => {
                const checkins = db.wellbeingCheckins.filter(c => c.userId === u.id);
                const latest = checkins[checkins.length - 1] || {};
                const evalR = evaluateCheckinRisk(latest, checkins, u.baseline);
                sum += evalR.score;
            });
            avgStressScore = Math.round(sum / deptUsers.length);
        } else {
            avgStressScore = 42;
        }

        return {
            id: d.id,
            name: d.name,
            personnelCount: deptUsers.length * 40 + 80, // demo scaled count
            riskLevel: d.riskLevel,
            avgStressScore,
            trend: avgStressScore > 65 ? 'Increasing' : 'Stable'
        };
    });

    res.json({ departments: deptStats });
});

app.get('/api/company/alerts', (req, res) => {
    const orgId = req.query.orgId || 'org_1';
    const db = getDb();
    const alerts = db.companyAlerts.filter(a => a.orgId === orgId);
    res.json({ alerts });
});

// --- WEARABLE DATA INTEGRATION MOCK API ---

app.post('/api/wearables/sync', (req, res) => {
    const { userId, heartRateBpm, hrvMs, sleepDurationHours, respirationRate, deviceType } = req.body;
    const db = getDb();
    const uid = userId || 'usr_1';

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

// --- AUDIT LOGS API ---

app.get('/api/audit-logs', (req, res) => {
    const db = getDb();
    res.json({ logs: db.auditLogs.slice(0, 30) });
});

// Start Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🛡️  SENTINEL Backend Server running on port ${PORT}`);
    console.log(`====================================================`);
});
