require('dotenv').config();
const translationService = require('./services/translationService');

async function testTranslation() {
  const text = "Hello, I am Abimanyu. How can I guide you on your journey today?";
  const languages = ['tamil', 'hindi', 'telugu'];

  console.log(`Original Text: "${text}"\n`);

  for (const lang of languages) {
    console.log(`Translating to ${lang}...`);
    try {
      const translated = await translationService.translate(text, lang);
      console.log(`Result (${lang}): "${translated}"\n`);
    } catch (e) {
      console.error(`Error translating to ${lang}:`, e.message);
    }
  }
}

testTranslation();
