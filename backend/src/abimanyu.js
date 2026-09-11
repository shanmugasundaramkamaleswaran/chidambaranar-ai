const DEFAULT_PROMPT = 'You are Abimanyu AI, a calm and wise guide inspired by duty, courage, and compassion.';

function detectEmotion(text = '') {
  const lower = String(text).toLowerCase();
  const keywords = {
    fear: ['afraid', 'scared', 'fear', 'worry', 'anxious', 'panic', 'terrified'],
    anger: ['angry', 'hate', 'mad', 'frustrated', 'rage', 'annoyed'],
    grief: ['sad', 'crying', 'grief', 'lost', 'hurt', 'lonely', 'miss', 'depressed'],
    confusion: ['confused', 'unsure', 'help', 'what to do', 'doubt', 'uncertain'],
    weakness: ['weak', 'tired', "can't", 'give up', 'hopeless', 'failed', 'exhausted'],
    patience: ['patience', 'wait', 'long time', 'slow', 'endure', 'how long'],
    determination: ['determined', 'focus', 'goal', 'success', 'willpower', 'achieve'],
    sacrifice: ['sacrifice', 'duty', 'for others', 'selfless', 'service'],
  };

  for (const [emotion, words] of Object.entries(keywords)) {
    if (words.some((word) => lower.includes(word))) {
      return emotion;
    }
  }

  return 'bravery';
}

function generateOfflineAbimanyuReply(userInput = 'your path', emotion = 'bravery', targetLang = 'english') {
  const lang = String(targetLang || 'english').toLowerCase();
  const safeInput = userInput || 'your path';

  const english = `My friend, the path of duty is not always easy, but it is never without meaning. I see your struggle, and I honor your courage. In the wisdom of the Gita, the soul is never conquered by sorrow; it rises through discipline, clarity, and self-control. Stand steady, take one small step forward, and let your effort be guided by purpose rather than fear. Your strength is already within you.`;

  const tamil = `என் நண்பா, கடமைப்பாதை எப்போதும் எளிதானதல்ல; ஆனால் அர்த்தமற்றதுமல்ல. உன் சிரமத்தை நான் அறிந்துகொள்கிறேன், உன் தைரியத்தை நான் மதிக்கிறேன். பகவத் கீதையின் ஞானத்தில், ஆன்மா துக்கத்தால் அழிக்கப்படுவதில்லை; அது ஒழுக்கம், தெளிவு, கட்டுப்பாட்டால் வளர்கிறது. நிலையாக நில், ஒரு சிறிய அடியை முன்னே வில்; பயத்தை விட குறிக்கோளை ஏற்று நட. உனது பலம் ஏற்கெனவே உன்னில் உள்ளது.`;

  const hindi = `मेरे दोस्त, कर्तव्य का मार्ग हमेशा सरल नहीं होता, लेकिन वह अर्थहीन भी नहीं होता। मैं तेरी पीड़ा को समझता हूँ, और तेरे साहस को सम्मान करता हूँ। गीता की wisdom में, आत्मा शोक से नहीं हारती; वह अनुशासन, स्पष्टता और आत्म-नियंत्रण से उठती है। स्थिर रहो, एक छोटा कदम आगे बढ़ाओ, और भय के बजाय उद्देश्य को अपना मार्ग बनाओ। तेरी शक्ति पहले से ही तेरे भीतर है।`;

  const localized = { english, tamil, hindi, default: english };

  return localized[lang] || localized.default;
}

export async function getAbimanyuResponse(userInput, history = [], targetLang = 'english') {
  const emotion = detectEmotion(userInput);
  const currentLang = String(targetLang || 'english').toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `You are ABIMANYU AI, a divine, brave, and empathetic guide. Respond in ${currentLang} only. Validate the user's feeling, give encouraging guidance, and end with a strong motivational sentence about duty and courage. User message: "${userInput || 'Please guide me'}". Keep tone serious, wise, and compassionate. Do not mention being an AI or using markdown unless necessary.`;

  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { responseText: text.trim(), emotion };
        }
      }
    } catch (error) {
      console.error('Gemini Abimanyu error:', error.message);
    }
  }

  return {
    responseText: generateOfflineAbimanyuReply(userInput, emotion, currentLang),
    emotion,
    fallback: true,
  };
}

export { detectEmotion, generateOfflineAbimanyuReply };
