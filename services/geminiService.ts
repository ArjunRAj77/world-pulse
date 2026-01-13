import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CountrySentimentData, SentimentType } from "../types";

// Initialize Gemini Client
const getApiKey = () => {
    try {
        return process.env.API_KEY;
    } catch (e) {
        console.error("[GeminiService] Failed to access process.env.API_KEY", e);
        return undefined;
    }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey: apiKey });

const modelId = "gemini-3-flash-preview";
const CACHE_PREFIX = 'wp_sentiment_v1_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Hours in milliseconds

// Simple in-memory lock to prevent spamming API after a 429
let rateLimitResetTime = 0;

// Schema for structured output
const sentimentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentimentScore: {
      type: Type.NUMBER,
      description: "A score from -1.0 (very negative) to 1.0 (very positive) representing the overall news sentiment.",
    },
    stateSummary: {
      type: Type.STRING,
      description: "A 1-2 sentence summary of the country's current geopolitical or social state based on the last 24 hours.",
    },
    headlines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING, enum: ["GOOD", "BAD", "NEUTRAL"] },
          snippet: { type: Type.STRING, description: "Very brief context." },
        },
        required: ["title", "category", "snippet"],
      },
      description: "Top 5 most relevant and recent news headlines from the last 24 hours.",
    },
  },
  required: ["sentimentScore", "stateSummary", "headlines"],
};

const getRateLimitResponse = (countryName: string): CountrySentimentData => {
    return {
        countryName,
        sentimentScore: 0,
        sentimentLabel: SentimentType.NEUTRAL,
        stateSummary: "⚠️ SYSTEM OVERLOAD: API Rate Limit Reached. Please wait 60 seconds.",
        headlines: [
            { 
                title: "Quota Exceeded", 
                category: "BAD", 
                snippet: "The global sensor network is saturated. We are cooling down to prevent data corruption. Please try again in a minute." 
            }
        ],
        lastUpdated: Date.now()
    };
};

export const fetchCountrySentiment = async (countryName: string): Promise<CountrySentimentData> => {
  console.log(`[GeminiService] Requesting sentiment for: ${countryName}`);

  // 1. CHECK CACHE
  const cacheKey = `${CACHE_PREFIX}${countryName}`;
  const cachedRaw = localStorage.getItem(cacheKey);
  
  if (cachedRaw) {
    try {
        const cachedData = JSON.parse(cachedRaw) as CountrySentimentData;
        const now = Date.now();
        const age = now - cachedData.lastUpdated;

        // If cache is fresh (less than 24 hours), use it
        if (age < CACHE_DURATION) {
            console.log(`[GeminiService] Returning CACHED data for ${countryName} (Age: ${(age / 1000 / 60).toFixed(0)} mins)`);
            return cachedData;
        } else {
            console.log(`[GeminiService] Cache expired for ${countryName}. Fetching fresh data.`);
        }
    } catch (e) {
        console.warn("[GeminiService] Error parsing cache, clearing entry.", e);
        localStorage.removeItem(cacheKey);
    }
  }

  // 2. CHECK RATE LIMIT LOCK
  if (Date.now() < rateLimitResetTime) {
      console.warn(`[GeminiService] Client-side cooldown active for another ${(rateLimitResetTime - Date.now())/1000}s`);
      return getRateLimitResponse(countryName);
  }

  // 3. FETCH FROM API
  if (!apiKey) {
      console.error("[GeminiService] Aborting request: Missing API Key");
      return {
          countryName,
          sentimentScore: 0,
          sentimentLabel: SentimentType.NEUTRAL,
          stateSummary: "Configuration Error: API Key missing.",
          headlines: [],
          lastUpdated: Date.now()
      };
  }

  try {
    const prompt = `
      Perform a real-time news sentiment analysis for ${countryName}.
      
      CRITICAL: You must use Google Search to find news headlines published strictly within the **LAST 24 HOURS**.
      
      1. Search for the top news stories for ${countryName} today.
      2. Identify the top 5 most significant events.
      3. Classify each headline as:
         - GOOD: Economic growth, peace treaties, scientific breakthroughs, social improvements.
         - BAD: Conflict, natural disasters, political corruption, crime spikes, economic crashes.
         - NEUTRAL: Routine diplomatic visits, general announcements, sports (unless major).
      4. Calculate an aggregated sentiment score (-1.0 to 1.0) based on these 5 stories.
      5. Provide a "State of the Nation" summary reflecting these recent events.
      
      If absolutely no news is found in the last 24h, you may look back 48h, but note this in the summary.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: sentimentSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini");
    }

    console.log(`[GeminiService] Success response for ${countryName}`);

    const data = JSON.parse(text);

    // Map the raw score to our enum
    let sentimentLabel = SentimentType.NEUTRAL;
    if (data.sentimentScore > 0.2) sentimentLabel = SentimentType.POSITIVE;
    if (data.sentimentScore < -0.2) sentimentLabel = SentimentType.NEGATIVE;

    const result: CountrySentimentData = {
      countryName,
      sentimentScore: data.sentimentScore,
      sentimentLabel,
      stateSummary: data.stateSummary,
      headlines: data.headlines,
      lastUpdated: Date.now(),
    };

    // 4. SAVE TO CACHE
    try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
        console.warn("[GeminiService] Storage quota exceeded, could not cache result.");
    }

    return result;

  } catch (error: any) {
    console.error(`[GeminiService] Error fetching sentiment for ${countryName}:`, error);

    // Detect 429 / Quota Errors
    const errorMessage = error?.message || "";
    const isRateLimit = errorMessage.includes("429") || 
                        errorMessage.includes("quota") || 
                        errorMessage.includes("RESOURCE_EXHAUSTED") ||
                        error?.status === 429;

    if (isRateLimit) {
        console.warn("[GeminiService] Rate limit detected. Activating 60s cooldown.");
        rateLimitResetTime = Date.now() + 60000; // Block requests for 1 minute
        return getRateLimitResponse(countryName);
    }

    // Fallback/Mock data if API fails (graceful degradation)
    return {
      countryName,
      sentimentScore: 0,
      sentimentLabel: SentimentType.NEUTRAL,
      stateSummary: "Signal lost. Unable to retrieve live intelligence at this time.",
      headlines: [
        { title: "Connection Error", category: "NEUTRAL", snippet: "Could not connect to analysis grid. Please try again later." }
      ],
      lastUpdated: Date.now(),
    };
  }
};

// Helper to get all cached map data on load
export const getCachedSentimentMap = (): Record<string, number> => {
    const map: Record<string, number> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            try {
                const item = localStorage.getItem(key);
                if (item) {
                    const data = JSON.parse(item) as CountrySentimentData;
                    map[data.countryName] = data.sentimentScore;
                }
            } catch (e) { /* ignore corrupt keys */ }
        }
    }
    return map;
}