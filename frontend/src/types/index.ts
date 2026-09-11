export type UserRole = 'company_admin' | 'user_employee' | 'doctor';

export interface UserBaseline {
    normalStress: number;
    normalWorkload: number;
    normalSleepHours: number;
    normalFatigue: number;
}

export interface User {
    id: string;
    orgId: string;
    deptId?: string | null;
    name: string;
    email: string;
    role: UserRole;
    title: string;
    avatar?: string;
    specialty?: string;
    licenseNumber?: string;
    shareWithDoctor?: boolean;
    baseline?: UserBaseline | null;
}

export interface Organization {
    id: string;
    name: string;
    code: string;
    type: string;
    employeeCount: number;
}

export interface Department {
    id: string;
    orgId: string;
    name: string;
    riskLevel: 'Stable' | 'Moderate' | 'Elevated' | 'High';
    personnelCount?: number;
    avgStressScore?: number;
    trend?: string;
}

export interface WellbeingCheckin {
    id: string;
    userId: string;
    date: string;
    stressLevel: number; // 1-10
    fatigue: number;     // 1-10
    mood: number;        // 1-10
    workload: number;    // 1-10
    sleepHours: number;  // hours
    sleepQuality: number;// 1-10
    motivation: number;  // 1-10
    afterHoursWorkMinutes?: number;
    journal?: string;
    score?: number;      // 0-100
    level?: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

export interface RiskEvaluation {
    score: number;
    level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
    title: string;
    trend: 'Increasing' | 'Stable' | 'Decreasing';
    confidence: number;
    baseline: UserBaseline;
    deviations: {
        stressDev: number;
        sleepDev: number;
        fatigueDev: number;
        workloadDev: number;
    };
    contributingFactors: string[];
    recommendations: string[];
    disclaimer: string;
}

export interface ConsentRecord {
    userId: string;
    shareWithCompanyAggregated: boolean;
    shareWithAssignedDoctorDetailed: boolean;
    allowEmergencyEscalation: boolean;
    allowWorkPatternAnalytics: boolean;
    updatedAt?: string;
}

export interface DoctorAssignment {
    doctorId: string;
    userId: string;
    assignedAt: string;
    notes?: string;
}

export type ConsultationStatus =
    | 'REQUESTED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'WAITING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'Requested'
    | 'Accepted'
    | 'Scheduled'
    | 'Completed'
    | 'Cancelled';

export interface ConsultationNote {
    id: string;
    consultationId: string;
    doctorId: string;
    notes: string;
    followUpRequired: boolean;
    followUpDate?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Consultation {
    id: string;
    userId: string;
    doctorId: string;
    status: ConsultationStatus;
    requested_at?: string;
    accepted_at?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
    duration?: number | string | null;
    requestDate?: string;
    scheduledTime?: string | null;
    reason: string;
    doctorNotes?: string;
    followUpAction?: string;
    userName?: string;
    userTitle?: string;
    userAvatar?: string;
    doctorName?: string;
    doctorTitle?: string;
    doctorAvatar?: string;
    doctorSpecialty?: string;
    notes?: ConsultationNote | null;
    created_at?: string;
    updated_at?: string;
}

export interface Psychologist {
    id: string;
    name: string;
    email: string;
    title: string;
    specialty: string;
    avatar: string;
    licenseNumber?: string;
    availabilityStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
}

export interface CompanyAlert {
    id: string;
    orgId: string;
    deptId?: string;
    severity: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
    message: string;
    createdAt: string;
    status: 'Active' | 'Acknowledged' | 'Resolved';
}

export interface AuditLog {
    id: string;
    timestamp: string;
    actorId: string;
    action: string;
    targetId: string;
    details: string;
}

export interface AiChatMessage {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
    suggestedActions?: string[];
}
