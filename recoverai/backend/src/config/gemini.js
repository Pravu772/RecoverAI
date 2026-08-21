const { GoogleGenerativeAI } = require('@google/generative-ai');

let geminiClient = null;

/**
 * Initializes and returns the Gemini generative model.
 * Uses gemini-1.5-flash for speed and cost-efficiency in batch classification.
 * Returns null if API key is missing (allows graceful degradation).
 */
const getGeminiModel = () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn('⚠️  GEMINI_API_KEY not set — AI classification will fallback to rule-based only');
    return null;
  }

  if (!geminiClient) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiClient = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json', // Force JSON output mode
        temperature: 0.1, // Low temp for consistent, structured classification
      },
    });
  }

  return geminiClient;
};

module.exports = { getGeminiModel };
