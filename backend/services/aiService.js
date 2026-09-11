const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs').promises;
const vectorService = require('./vectorService');

// Simple in-memory cache for repeat-answer avoidance
const usedVerseIds = new Set();
const usedFFIds = new Set();
const CACHE_LIMIT = 50;
const FF_CACHE_LIMIT = 20;

class AIService {
  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.hfKey = process.env.HF_API_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY;
    this.mistralKey = process.env.MISTRAL_API_KEY;

    if (this.openaiKey && !this.openaiKey.toLowerCase().includes('your_')) {
      this.openaiClient = new OpenAI({ apiKey: this.openaiKey });
    }

    if (this.geminiKey && !this.geminiKey.toLowerCase().includes('your_')) {
      this.genAI = new GoogleGenerativeAI(this.geminiKey);
    }

    if (this.mistralKey && !this.mistralKey.toLowerCase().includes('your_')) {
      // Mistral is OpenAI-compatible
      this.mistralClient = new OpenAI({
        apiKey: this.mistralKey,
        baseURL: 'https://api.mistral.ai/v1'
      });
    }

    this.hfEndpoint = 'https://router.huggingface.co/v1/chat/completions';
  }

  async getResponse(prompt, history = [], provider = 'gemini') {
    // Priority: Gemini -> Mistral -> HuggingFace -> OpenAI
    // Gemini is prioritized for better multilingual and persona depth
    console.log(`[AI] Attempting response with provider order: Gemini -> Mistral -> HF -> OpenAI`);

    // 1. Try Gemini
    if (this.genAI) {
      console.log('[AI] Trying Google Gemini...');
      try {
        return await this._getGeminiResponse(prompt, history);
      } catch (e) {
        console.error('[AI] Gemini Error:', e.message);
      }
    }

    // 2. Try Mistral
    if (this.mistralClient) {
      console.log('[AI] Trying Mistral AI...');
      try {
        return await this._getMistralResponse(prompt, history);
      } catch (e) {
        console.error('[AI] Mistral Error:', e.message);
      }
    }

    // 3. Try Hugging Face
    if (this.hfKey) {
      console.log('[AI] Trying Hugging Face (Mistral-7B stable)...');
      try {
        return await this._getHFResponse(prompt, history);
      } catch (e) {
        console.error('[AI] HF Error:', e.message);
      }
    }

    // 4. Try OpenAI
    if (this.openaiClient) {
      console.log('[AI] Trying OpenAI...');
      try {
        return await this._getOpenAIResponse(prompt, history);
      } catch (e) {
        console.error('[AI] OpenAI Error:', e.message);
      }
    }

    throw new Error('No AI provider configured properly or all providers failed.');
  }

  async _getGeminiResponse(prompt, history) {
    // Use gemini-2.0-flash as primary, with gemini-pro-latest as fallback
    let model;
    try {
      model = this.genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });
    } catch (e) {
      model = this.genAI.getGenerativeModel({ model: "models/gemini-pro-latest" });
    }

    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    const response = await result.response;
    return response.text().trim();
  }

  async _getMistralResponse(prompt, history) {
    const messages = history.map(msg => ({ role: msg.role, content: msg.content }));
    messages.push({ role: 'user', content: prompt });

    const response = await this.mistralClient.chat.completions.create({
      model: 'mistral-large-latest',
      messages: messages,
      max_tokens: 1000
    });
    return response.choices[0].message.content.trim();
  }

  async _getHFResponse(prompt, history) {
    const messages = history.map(msg => ({ role: msg.role, content: msg.content }));
    messages.push({ role: 'user', content: prompt });

    // Using a more stable model for the router
    const model = 'mistralai/Mistral-7B-Instruct-v0.3';

    const response = await axios.post(
      this.hfEndpoint,
      {
        model: model,
        messages: messages,
        max_tokens: 600,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${this.hfKey}`,
          'x-wait-for-model': 'true'
        },
        timeout: 60000
      }
    );

    if (response.data.choices && response.data.choices[0].message) {
      return response.data.choices[0].message.content.trim();
    }

    return JSON.stringify(response.data);
  }

  async _getOpenAIResponse(prompt, history) {
    const messages = history.map(msg => ({ role: msg.role, content: msg.content }));
    messages.push({ role: 'user', content: prompt });

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages
    });
    return response.choices[0].message.content.trim();
  }

  /**
   * Specialized method to translate text while preserving tone
   */
  async translateText(text, targetLang) {
    const prompt = `Translate the following text to ${targetLang}. 
    Maintain the divine, wise, and poetic tone of Abimanyu. 
    Only return the translated text without any explanations.
    
    TEXT:
    ${text}`;

    try {
      // Use Gemini for translation as it's excellent for Indian languages
      if (this.genAI) {
        return await this._getGeminiResponse(prompt, []);
      }
      // Fallback to whichever provider is available
      return await this.getResponse(prompt, []);
    } catch (e) {
      console.error(`[AI-Translate] Error translating to ${targetLang}:`, e.message);
      return text;
    }
  }
}

const aiService = new AIService();

function detectEmotion(text) {
  text = text.toLowerCase().trim();
  let emotion = 'bravery';

  const keywords = {
    fear: ['afraid', 'scared', 'fear', 'worry', 'anxious', 'panic', 'terrified'],
    anger: ['angry', 'hate', 'mad', 'frustrated', 'kill', 'annoyed', 'rage'],
    grief: ['sad', 'crying', 'grief', 'lost', 'hurt', 'lonely', 'miss', 'depressed'],
    confusion: ['confused', 'unsure', 'help', 'what to do', 'doubt', 'uncertain'],
    weakness: ['weak', 'tired', "can't", 'give up', 'hopeless', 'failed', 'exhausted'],
    patience: ['patience', 'wait', 'long time', 'slow', 'endure', 'how long'],
    determination: ['determined', 'focus', 'goal', 'success', 'willpower', 'achieve'],
    sacrifice: ['sacrifice', 'give up', 'for others', 'selfless', 'duty']
  };

  for (const [key, words] of Object.entries(keywords)) {
    if (words.some(word => text.includes(word))) {
      return key;
    }
  }

  return emotion;
}

function generateOfflineAbimanyuReply(userInput, emotion = 'bravery', targetLang = 'english') {
  const lang = String(targetLang || 'english').toLowerCase();
  const safeInput = userInput || 'your path';

  const english = `My friend, the path of duty is not always easy, but it is never without meaning. I see your struggle, and I honor your courage. In the wisdom of the Gita, the soul is never conquered by sorrow; it rises through discipline, clarity, and self-control. Stand steady, take one small step forward, and let your effort be guided by purpose rather than fear. Your strength is already within you.`;

  const tamil = `என் நண்பா, கடமைப்பாதை எப்போதும் எளிதானதல்ல; ஆனால் அர்த்தமற்றதுமல்ல. உன் சிரமத்தை நான் அறிந்துகொள்கிறேன், உன் தைரியத்தை நான் மதிக்கிறேன். பகவத் கீதையின் ஞானத்தில், ஆன்மா துக்கத்தால் அழிக்கப்படுவதில்லை; அது ஒழுக்கம், தெளிவு, கட்டுப்பாட்டால் வளர்கிறது. நிலையாக நில், ஒரு சிறிய அடியை முன்னே வில்; பயத்தை விட குறிக்கோளை ஏற்று நட. உனது பலம் ஏற்கெனவே உன்னில் உள்ளது.`;

  const hindi = `मेरे दोस्त, कर्तव्य का मार्ग हमेशा सरल नहीं होता, लेकिन वह अर्थहीन भी नहीं होता। मैं तेरी पीड़ा को समझता हूँ, और तेरे साहस को सम्मान करता हूँ। गीता की wisdom में, आत्मा शोक से नहीं हारती; वह अनुशासन, स्पष्टता और आत्म-नियंत्रण से उठती है। स्थिर रहो, एक छोटा कदम आगे बढ़ाओ, और भय के बजाय उद्देश्य को अपना मार्ग बनाओ। तेरी शक्ति पहले से ही तेरे भीतर है।`;

  const localized = {
    english,
    tamil,
    hindi,
    default: english,
  };

  return localized[lang] || localized.default;
}

async function getRelevantGitaExcerpt(userInput) {
  try {
    const excludeIds = Array.from(usedVerseIds);
    const result = await vectorService.search(userInput, 10, excludeIds, 0.7, 'gita');

    if (result) {
      usedVerseIds.add(result.id);
      if (usedVerseIds.size > CACHE_LIMIT) {
        const first = usedVerseIds.values().next().value;
        usedVerseIds.delete(first);
      }
      return result.text;
    }
    return "The soul is eternal, unchanging, and indestructible. It never dies when the body is slain.";
  } catch (e) {
    console.error('Error fetching relevant Gita text:', e);
    return 'The soul is eternal and imperishable.';
  }
}

async function getRelevantFreedomFighter(userInput) {
  try {
    const excludeIds = Array.from(usedFFIds);
    const result = await vectorService.search(userInput, 10, excludeIds, 0.8, 'freedom_fighter');

    if (result) {
      usedFFIds.add(result.id);
      if (usedFFIds.size > FF_CACHE_LIMIT) {
        const first = usedFFIds.values().next().value;
        usedFFIds.delete(first);
      }
      return result.text;
    }
    return "Tiruppur Kumaran was a brave Indian freedom fighter who died holding the Indian flag tightly.";
  } catch (e) {
    console.error('Error fetching relevant Freedom Fighter:', e);
    return 'Brave heroes fought for our freedom with unwavering courage.';
  }
}

async function getAbimanyuResponse(userInput, history = [], targetLang = 'english') {
  const emotion = detectEmotion(userInput);
  const gitaExcerpt = await getRelevantGitaExcerpt(userInput);
  const ffExcerpt = await getRelevantFreedomFighter(userInput);

  const currentLang = targetLang || 'english';

  const PROMPT = `
    YOU ARE ABIMANYU AI, a divine and brave guide inspired by the Bhagavad Gita and India's heroic history.
    Personality: Empathetic, Poetic, Unshakeable, and Wise.
    
    CRITICAL INSTRUCTION:
    YOU MUST RESPOND NATIVELY IN ${currentLang.toUpperCase()}. 
    Maintain your Abimanyu persona perfectly in ${currentLang}.
    
    SCENARIO DATA:
    - User Message: "${userInput}"
    - Detected Underlying Emotion: ${emotion}
    - Spiritual Source (Bhagavad Gita):
    ---
    ${gitaExcerpt}
    ---
    - Historical Source (Freedom Fighter):
    ---
    ${ffExcerpt}
    ---
 
    INSTRUCTIONS:
    1. Respond directly to the user's message as Abimanyu in ${currentLang}.
    2. Actively interpret their words and validate their feelings with deep empathy.
    3. Weave in TWO specific references:
       A. Exactly ONE teaching from the "Spiritual Source (Bhagavad Gita)" above.
       B. Exactly ONE story/struggle from the "Historical Source (Freedom Fighter)" above.
    4. Connect the spiritual wisdom of the Gita with the practical bravery of the freedom fighter to guide the user.
    5. Use markdown for a premium feel (bolding, blockquotes for quotes).
    6. Conclude with a powerful, motivating sentence about growth and Dharma in ${currentLang}.
    7. Do NOT use any generic corporate chatbot language (like 'As an AI'). Embody your divine persona completely.
    8. Use ${currentLang} for the ENTIRE response.
    9. Do NOT use any emojis in your response. Maintain a solemn and divine tone using only text and markdown.
  `;

  try {
    const responseText = await aiService.getResponse(PROMPT, history);
    return { responseText, emotion };
  } catch (e) {
    console.error('AI Service Error:', e);
    return {
      responseText: generateOfflineAbimanyuReply(userInput, emotion, currentLang),
      emotion
    };
  }
}

module.exports = {
  getAbimanyuResponse,
  aiService
};
