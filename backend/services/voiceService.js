const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

/**
 * Generates audio bytes for the given text using ElevenLabs.
 */
async function generateVoiceBytes(text) {
  if (!ELEVENLABS_API_KEY) {
    console.log('ElevenLabs API Key missing.');
    return null;
  }

  try {
    // Check for Abimanyu Voice
    const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });

    let voiceId = null;
    const voices = voicesResponse.data.voices;
    for (const v of voices) {
      if (v.name === 'Abimanyu Voice') {
        voiceId = v.voice_id;
        break;
      }
    }

    // If voice doesn't exist, we could add it here if reference file exists
    // But for simplicity in this migration, we expect the voice to be set up
    // or we'll use a default voice if name match fails.
    if (!voiceId) {
        // Fallback to a default voice if 'Abimanyu Voice' is not found
        voiceId = 'pNInz6obpgmqS2esW4QC'; // Adam
    }

    const ttsResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(ttsResponse.data);
  } catch (e) {
    console.error('ElevenLabs Error:', e.response ? e.response.data : e.message);
    return null;
  }
}

/**
 * Returns audio as base64 string.
 */
async function getAudioBase64(text) {
  const audioBytes = await generateVoiceBytes(text);
  if (audioBytes) {
    return audioBytes.toString('base64');
  }
  return null;
}

module.exports = {
  getAudioBase64
};
