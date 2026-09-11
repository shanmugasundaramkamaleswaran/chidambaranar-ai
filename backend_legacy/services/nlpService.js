const Sentiment = require('sentiment');
const natural = require('natural');
const nlp = require('compromise');
const sentiment = new Sentiment();

/**
 * Port of analyze_sentiment from Python TextBlob.
 */
function analyzeSentiment(text) {
  const result = sentiment.analyze(text);
  const score = result.comparative; // result.comparative is roughly equivalent to polarity

  if (score < -0.3) {
    return 'negative';
  } else if (score > 0.3) {
    return 'positive';
  } else {
    return 'neutral';
  }
}

/**
 * Port of detect_intent from Python.
 */
function detectIntent(text) {
  text = text.toLowerCase();

  if (['hi', 'hello', 'hey', 'good morning', 'good evening'].some(word => text.includes(word))) {
    return 'greeting';
  }

  if (['help', 'support', 'guide', 'advice'].some(word => text.includes(word))) {
    return 'help';
  }

  if (['sad', 'anxious', 'stressed', 'lonely', 'overwhelmed'].some(word => text.includes(word))) {
    return 'emotional_support';
  }

  if (['suicide', 'kill myself', 'end my life', 'self harm'].some(word => text.includes(word))) {
    return 'crisis';
  }

  if (['bye', 'goodbye', 'see you', 'thanks', 'thank you'].some(word => text.includes(word))) {
    return 'goodbye';
  }

  return 'general';
}

/**
 * Detect if text is gibberish/meaningless.
 */
function isGibberish(text) {
  if (!text || text.trim().length < 3) return true;

  const trimmed = text.trim();

  // Rule 1: Only random caps/numbers (e.g. "ASDF123")
  if (/^[A-Z0-9\s]+$/.test(trimmed)) {
    if (!trimmed.includes(' ') && trimmed.length > 5) return true;
  }

  // Rule 2: Char repetition (e.g. "aaaaaa", "111111")
  if (/(.)\1{4,}/.test(trimmed)) return true;

  // Rule 3: Vowel ratio check (English heuristic)
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 3) {
    const vowels = letters.match(/[aeiouAEIOU]/g) || [];
    const vowelRatio = vowels.length / letters.length;
    // English usually has > 25% vowels. Random keys often have very few.
    if (vowelRatio < 0.15) return true; 
  }

  // Rule 4: NLP check
  const doc = nlp(trimmed);
  const terms = doc.terms().out('array');
  if (terms.length === 0) return true;

  // Rule 5: English words ratio (Strict tokenization)
  const tokenizer = new natural.WordTokenizer();
  const words = tokenizer.tokenize(trimmed);

  let valid = 0;
  words.forEach((w) => {
    // Basic word check: at least one vowel and correct alphabet usage
    if (/^[a-zA-Z]+$/.test(w) && /[aeiouAEIOU]/.test(w)) valid++;
  });

  if (valid === 0) return true;

  return false;
}

module.exports = {
  analyzeSentiment,
  detectIntent,
  isGibberish
};
