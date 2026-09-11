const { aiService } = require('./aiService');

/**
 * Service for Text Translation using Gemini AI
 * Pivoted from iFLYTEK due to authentication issues.
 */
class TranslationService {
  /**
   * Translates text to the target language using Gemini.
   * @param {string} text - The text to translate.
   * @param {string} targetLang - e.g., 'tamil', 'hindi', 'telugu'.
   * @returns {Promise<string>} - The translated text.
   */
  async translate(text, targetLang) {
    if (!text || !targetLang || targetLang.toLowerCase() === 'english') {
      return text;
    }

    console.log(`[Translation] Pivoting to Gemini for ${targetLang} translation...`);
    
    try {
      // Use the centralized aiService for translation
      const translatedText = await aiService.translateText(text, targetLang);
      return translatedText;
    } catch (e) {
      console.error(`[Translation] Gemini translation failed for ${targetLang}:`, e.message);
      return text; // Fallback to English
    }
  }
}

module.exports = new TranslationService();
