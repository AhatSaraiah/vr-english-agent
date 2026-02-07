const axios = require('axios');
const googleTTS = require('google-tts-api');

/**
 * generateSpeech
 * Converts text to speech using ElevenLabs (Paid) or Google TTS (Free Fallback).
 * @param {string} text - The strict text to speak.
 * @returns {Promise<string>} - The base64 Data URI of the audio (MP3).
 */
async function generateSpeech(text) {
    if (!text) return null;

    try {
        console.log('Generating speech with ElevenLabs...');
        const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                text: text,
                model_id: 'eleven_turbo_v2', // Faster and cheaper
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            },
            {
                headers: {
                    'xi-api-key': process.env.ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                responseType: 'arraybuffer'
            }
        );

        const audioBase64 = Buffer.from(response.data).toString('base64');
        return `data:audio/mpeg;base64,${audioBase64}`;

    } catch (elevenError) {
        console.error('ElevenLabs TTS Error:', elevenError.response ? elevenError.response.data.toString() : elevenError.message);
        console.warn('Falling back to Google TTS (Free)...');

        try {
            // Google TTS Fallback
            const base64 = await googleTTS.getAudioBase64(text, {
                lang: 'en',
                slow: false,
                host: 'https://translate.google.com',
                timeout: 10000,
            });
            return `data:audio/mp3;base64,${base64}`;

        } catch (googleError) {
            console.error('Google TTS Fallback Error:', googleError.message);
            if (googleError.message.includes('200 chars')) {
                console.warn('Text too long for simple TTS. Proceeding without audio.');
            }
            return null; // Return null if both fail
        }
    }
}

module.exports = {
    generateSpeech
};
