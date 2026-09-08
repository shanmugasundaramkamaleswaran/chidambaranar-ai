/**
 * SENTINEL AI Stress-Risk Engine
 * 
 * Implements Personal Baseline modeling, score calculation (0-100),
 * risk tier classification (GREEN, YELLOW, ORANGE, RED), trend detection,
 * confidence scoring, and contributing factor breakdown.
 */

export function calculatePersonalBaseline(checkins) {
    if (!checkins || checkins.length === 0) {
        return { normalStress: 3.5, normalWorkload: 6.0, normalSleepHours: 7.2, normalFatigue: 3.0 };
    }

    // Calculate moving window averages from first half or overall historical records
    const sample = checkins.slice(0, Math.min(7, checkins.length));
    const sumStress = sample.reduce((acc, c) => acc + Number(c.stressLevel || 3), 0);
    const sumWorkload = sample.reduce((acc, c) => acc + Number(c.workload || 6), 0);
    const sumSleep = sample.reduce((acc, c) => acc + Number(c.sleepHours || 7), 0);
    const sumFatigue = sample.reduce((acc, c) => acc + Number(c.fatigue || 3), 0);

    return {
        normalStress: Number((sumStress / sample.length).toFixed(1)),
        normalWorkload: Number((sumWorkload / sample.length).toFixed(1)),
        normalSleepHours: Number((sumSleep / sample.length).toFixed(1)),
        normalFatigue: Number((sumFatigue / sample.length).toFixed(1))
    };
}

export function evaluateCheckinRisk(checkin, checkinHistory = [], userBaseline = null) {
    const baseline = userBaseline || calculatePersonalBaseline(checkinHistory);

    const currentStress = Number(checkin.stressLevel || 5);
    const currentFatigue = Number(checkin.fatigue || 5);
    const currentWorkload = Number(checkin.workload || 5);
    const currentSleep = Number(checkin.sleepHours || 7);
    const currentMood = Number(checkin.mood || 6); // 1-10 scale (10 is high/positive)
    const currentSleepQuality = Number(checkin.sleepQuality || 6);

    // 1. Raw Weighted Signal Score (0 to 100)
    // Higher stress, fatigue, workload, low sleep, low mood contribute to higher risk
    const stressContrib = (currentStress / 10) * 28;
    const fatigueContrib = (currentFatigue / 10) * 22;
    const workloadContrib = (currentWorkload / 10) * 18;
    const sleepContrib = ((10 - Math.min(10, currentSleep)) / 10) * 18;
    const moodContrib = ((10 - currentMood) / 10) * 14;

    let rawScore = Math.round(stressContrib + fatigueContrib + workloadContrib + sleepContrib + moodContrib);

    // 2. Personal Baseline Deviation Adjustment
    const stressDev = currentStress - baseline.normalStress;
    const sleepDev = baseline.normalSleepHours - currentSleep; // positive if sleeping less than baseline
    const fatigueDev = currentFatigue - baseline.normalFatigue;
    const workloadDev = currentWorkload - baseline.normalWorkload;

    let deviationMultiplier = 0;
    if (stressDev > 2) deviationMultiplier += 8;
    if (sleepDev > 1.5) deviationMultiplier += 7;
    if (fatigueDev > 2) deviationMultiplier += 6;
    if (workloadDev > 2) deviationMultiplier += 4;

    let finalScore = Math.min(100, Math.max(0, rawScore + deviationMultiplier));

    // 3. Risk Tier Determination
    let level = 'GREEN';
    let title = 'Stable / Low Risk';
    if (finalScore >= 81) {
        level = 'RED';
        title = 'High Persistent Stress Risk';
    } else if (finalScore >= 61) {
        level = 'ORANGE';
        title = 'Elevated Stress & Fatigue Risk';
    } else if (finalScore >= 31) {
        level = 'YELLOW';
        title = 'Moderate Baseline Shift';
    }

    // 4. Trend Analysis over recent check-ins
    const recentHistory = checkinHistory.slice(-5);
    let trend = 'Stable';
    if (recentHistory.length >= 3) {
        const scores = recentHistory.map(h => Number(h.score || 30));
        const firstAvg = (scores[0] + scores[1]) / 2;
        const lastAvg = (scores[scores.length - 1] + scores[scores.length - 2]) / 2;
        if (lastAvg - firstAvg > 7) trend = 'Increasing';
        else if (firstAvg - lastAvg > 7) trend = 'Decreasing';
    }

    // 5. Confidence Score Calculation
    const dataPoints = checkinHistory.length + 1;
    const confidence = Math.min(95, Math.max(65, 60 + Math.min(30, dataPoints * 2)));

    // 6. Contributing Factors Identification
    const contributingFactors = [];
    if (workloadDev > 1.5) contributingFactors.push(`Workload elevated (+${(workloadDev).toFixed(1)} points above personal baseline)`);
    if (sleepDev > 1.0) contributingFactors.push(`Reduced sleep duration (${currentSleep}h vs normal ${baseline.normalSleepHours}h)`);
    if (fatigueDev > 1.5) contributingFactors.push(`High fatigue rating (${currentFatigue}/10)`);
    if (stressDev > 2.0) contributingFactors.push(`Consistently elevated stress perception (${currentStress}/10)`);
    if (currentMood <= 4) contributingFactors.push(`Lowered self-reported mood (${currentMood}/10)`);

    if (contributingFactors.length === 0) {
        contributingFactors.push('Metrics within normal personal baseline bounds');
    }

    // 7. Recommended Action Plan per Early Warning System
    let recommendations = [];
    if (level === 'GREEN') {
        recommendations = [
            'Maintain your current healthy work-rest cycle.',
            'Engage in routine active recovery or physical exercise.',
            'Continue logging daily check-ins to reinforce your personal baseline.'
        ];
    } else if (level === 'YELLOW') {
        recommendations = [
            'Consider taking a 15-minute micro-break during peak workload hours.',
            'Prioritize sleep hygiene tonight aiming for +1 hour of restful sleep.',
            'Review task priorities and discuss workload allocation with team leads.'
        ];
    } else if (level === 'ORANGE') {
        recommendations = [
            'Persistent stress indicators detected. We strongly encourage scheduling a confidential doctor consultation.',
            'Implement strict after-hours disconnection rules to allow cognitive recovery.',
            'Utilize the SENTINEL AI Support Assistant to explore targeted stress management strategies.'
        ];
    } else if (level === 'RED') {
        recommendations = [
            'High stress risk detected. Please seek professional support or connect with your designated behavioral doctor.',
            'Immediate workload relief and structured rest protocol recommended.',
            'Emergency support contact and confidential counseling resources are readily available.'
        ];
    }

    return {
        score: finalScore,
        level,
        title,
        trend,
        confidence,
        baseline,
        deviations: {
            stressDev: Number(stressDev.toFixed(1)),
            sleepDev: Number(sleepDev.toFixed(1)),
            fatigueDev: Number(fatigueDev.toFixed(1)),
            workloadDev: Number(workloadDev.toFixed(1))
        },
        contributingFactors,
        recommendations,
        disclaimer: 'SENTINEL is an early-warning risk estimation system and does NOT provide medical diagnosis.'
    };
}
