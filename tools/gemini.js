const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * processChat
 * Handles the multi-turn conversation with audio input.
 * @param {string} systemPrompt - The persona/instruction for the teacher.
 * @param {string} recentHistoryText - Formatted string of past conversation.
 * @param {string} mimeType - Audio mime type (e.g. 'audio/webm').
 * @param {string} audioBase64 - Base64 string of the audio input.
 * @returns {Promise<{transcript: string, replyText: string}>}
 */
async function processChat(systemPrompt, recentHistoryText, mimeType, audioBase64) {
    console.log('Processing chat with Gemini 2.5 Flash...');

    // Gemini 2.5 Flash is efficient for Audio
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
    });

    const promptText = `
    System Context: ${systemPrompt}
    
    Previous Conversation History:
    ${recentHistoryText}
    
    Instruction: Listen to the student's new audio input. 
    Review the *entire* conversation history above to know what has already been discussed (e.g. if name, passport, or purpose was already given).
    Do not ask for information that has already been provided.
    Output a JSON object with two fields (do not use markdown blocks):
    1. "transcript": The exact English text of what the student said.
    2. "replyText": Your conversational response as the teacher (keep it brief and spoken-style in 1-2 sentences).
    `;

    const parts = [
        { text: promptText },
        { inlineData: { mimeType: mimeType, data: audioBase64 } }
    ];

    try {
        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
        const response = await result.response;
        const textOutput = response.text();
        console.log('Gemini Output:', textOutput);

        // Parse JSON
        const cleanText = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error('Gemini Chat Error:', error.message);

        // Handle Rate Limits / Quotas with a mock fallback
        if (error.message.includes('429') || error.message.includes('503') || error.message.includes('quota')) {
            console.warn('Rate Limit Hit. Using Mock Response.');
            const fallbackResponses = [
                "That is interesting, please tell me more.",
                "I see. Could you elaborate on that?",
                "Very good. Please continue.",
                "I understand. Go on.",
                "Excellent. What else?"
            ];
            return {
                transcript: "(...)",
                replyText: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
            };
        }
        throw error;
    }
}

/**
 * generateFeedback
 * Analyzes the session transcript to provide grammatical feedback.
 * @param {Array} transcript - Array of {role, text} objects.
 * @returns {Promise<string>} - Markdown string of feedback.
 */
async function generateFeedback(transcript) {
    console.log('Generating Feedback with Gemini...');
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(`
        Analyze this English learning session transcript: ${JSON.stringify(transcript)}. 
        Provide constructive feedback on grammar and vocabulary in 3 bullet points.
    `);

    return result.response.text();
}

module.exports = {
    processChat,
    generateFeedback
};
