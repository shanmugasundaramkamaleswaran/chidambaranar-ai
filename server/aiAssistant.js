/**
 * SENTINEL AI Well-being Assistant
 * 
 * Provides empathetic support, stress reflection, practical coping techniques,
 * and preparation for doctor consultation.
 */

export function generateAiChatResponse(messages, userContext = {}) {
    const lastMessage = messages[messages.length - 1]?.text || '';
    const lowerMsg = lastMessage.toLowerCase();

    const userRiskLevel = userContext.riskLevel || 'GREEN';
    const userName = userContext.userName || 'Officer';

    let reply = '';
    let suggestedActions = [];

    if (lowerMsg.includes('sleep') || lowerMsg.includes('insomnia') || lowerMsg.includes('tired')) {
        reply = `I hear how exhausting disrupted sleep can be, ${userName}. Sleep deficit significantly impacts cognitive readiness and emotional resilience. 

Here are three tactical sleep recovery steps you can try tonight:
1. **Digital Wind-Down**: Discontinue duty screens and tactical devices 45 minutes before sleep.
2. **4-7-8 Tactical Breathing**: Inhale for 4 seconds, hold for 7 seconds, exhale slowly for 8 seconds to down-regulate your sympathetic nervous system.
3. **Cool Environment**: Keep your sleep space between 18-20°C (65-68°F).

If insomnia persists beyond 3 consecutive days, I recommend submitting a confidential consultation request with your assigned physician.`;
        suggestedActions = ['Request Doctor Consultation', 'Try 4-7-8 Breathing Guide', 'View Sleep Trend Data'];
    } else if (lowerMsg.includes('workload') || lowerMsg.includes('overwhelmed') || lowerMsg.includes('shift') || lowerMsg.includes('deadline')) {
        reply = `It sounds like your operational workload is placing a heavy strain on your energy, ${userName}. High task density without scheduled recovery intervals leads to cognitive fatigue.

Let's break this down into actionable mitigation:
• **Task Triaging**: Identify the top 2 mission-critical tasks for today and defer secondary items.
• **Micro-Recovery Protocol**: Take a mandatory 5-minute physical walk or posture shift every 90 minutes.
• **Shift Handover Communication**: Transparently flag task capacity limits during team debriefs.

Would you like help preparing a brief workload summary to share with your supervisor or doctor?`;
        suggestedActions = ['Prepare Doctor Meeting Notes', 'Log Workload Check-in', 'Request Time-off Guidance'];
    } else if (lowerMsg.includes('doctor') || lowerMsg.includes('consultation') || lowerMsg.includes('prepare')) {
        reply = `Preparing for a doctor consultation is a great proactive step, ${userName}. 

Here are key items to share with your physician:
1. **Specific Symptoms**: Note when fatigue or tension is highest during your duty shift.
2. **Baseline Shift**: Share your 14-day SENTINEL stress trend chart showing workload vs sleep changes.
3. **Impact on Daily Tasks**: Mention any difficulty with focus, decision-making, or physical tension.

You can click "Request Professional Support" directly on your dashboard to notify Dr. Sarah Connor or Dr. Marcus Vance.`;
        suggestedActions = ['Submit Doctor Request', 'Export 14-Day Stress Summary'];
    } else {
        reply = `Thank you for reaching out, ${userName}. I'm here as your SENTINEL AI Well-being Assistant to support your daily readiness and stress recovery. 

Based on your recent check-in metrics (Risk Status: ${userRiskLevel}), taking time for reflection and structured rest is vital. 

How are you feeling physically right now? Is there a particular aspect of your current workload or routine that feels most challenging?`;
        suggestedActions = ['Discuss Sleep & Fatigue', 'Discuss Workload Pressure', 'Prepare for Doctor Visit'];
    }

    return {
        reply,
        suggestedActions,
        disclaimer: 'SENTINEL AI Assistant is an automated support tool and does NOT provide clinical medical advice or diagnosis.',
        timestamp: new Date().toISOString()
    };
}
