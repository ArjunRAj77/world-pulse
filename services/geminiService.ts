import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CountrySentimentData, SentimentType } from "../types";

// Initialize Gemini Client
// PRIORITY: Check GEMINI_API_KEY first as requested, then fall back to generic API_KEY
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

// We initialize the client even if key is missing to allow app to load, 
// but requests will be guarded below.
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key-to-prevent-crash" });

const modelId = "gemini-3-flash-preview";
const CACHE_PREFIX = 'wp_sentiment_v2_'; 
const CACHE_DURATION = 24 * 60 * 60 * 1000; 
const RATE_LIMIT_STORAGE_KEY = 'wp_rate_limit_lock_until';
const LAST_REQUEST_STORAGE_KEY = 'wp_last_api_req_ts';
const MIN_REQUEST_INTERVAL = 5000; 

export const KEY_COUNTRIES = [
  "United States", "China", "Russia", "United Kingdom", "Germany", 
  "France", "India", "Japan", "Brazil", "South Africa", 
  "Australia", "Canada", "Saudi Arabia", "Iran", "North Korea"
];

const getRateLimitLock = (): number => {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
        return stored ? parseInt(stored, 10) : 0;
    } catch { return 0; }
};

const setRateLimitLock = (timestamp: number) => {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, timestamp.toString());
};

const enforceGlobalThrottle = async () => {
    try {
        const lastRequest = localStorage.getItem(LAST_REQUEST_STORAGE_KEY);
        if (lastRequest) {
            const lastTime = parseInt(lastRequest, 10);
            const now = Date.now();
            const timeSince = now - lastTime;
            
            if (timeSince < MIN_REQUEST_INTERVAL) {
                const waitTime = MIN_REQUEST_INTERVAL - timeSince;
                console.log(`[GeminiService] Global throttle active. Sleeping for ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        localStorage.setItem(LAST_REQUEST_STORAGE_KEY, Date.now().toString());
    } catch (e) {
        console.warn("[GeminiService] Throttle storage error", e);
    }
};

const sentimentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    countryCode: {
      type: Type.STRING,
      description: "The 2-letter ISO 3166-1 alpha-2 country code (e.g. US, CN, FR, GB).",
    },
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
          source: { type: Type.STRING, description: "The name of the news publisher (e.g. BBC, Reuters)." },
          url: { type: Type.STRING, description: "The direct URL to the news story." }
        },
        required: ["title", "category", "snippet", "source", "url"],
      },
      description: "Top 5 most relevant and recent news headlines from the last 24 hours.",
    },
  },
  required: ["countryCode", "sentimentScore", "stateSummary", "headlines"],
};

const getRateLimitResponse = (countryName: string, waitSeconds: number): CountrySentimentData => {
    return {
        countryName,
        sentimentScore: 0,
        sentimentLabel: SentimentType.NEUTRAL,
        stateSummary: `⚠️ SYSTEM OVERLOAD: API Rate Limit Reached. Cooldown active for ${waitSeconds}s.`,
        headlines: [
            { 
                title: "Quota Exceeded", 
                category: "BAD", 
                snippet: "The global sensor network is saturated. We are cooling down to prevent data corruption. Please try again in a minute.",
                source: "System",
                url: "#"
            }
        ],
        lastUpdated: Date.now()
    };
};

/**
 * DEBUG FUNCTION: Verifies if the API key is active and working.
 * Logs specific details to console to help with deployment debugging.
 */
export const validateApiKeyConnection = async (): Promise<{ success: boolean; message: string }> => {
    if (!apiKey) {
        console.error("❌ [GeminiService] No API Key found in environment variables.");
        return { success: false, message: "Missing API Key" };
    }

    const maskedKey = apiKey.length > 5 
        ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 3)}` 
        : "(Invalid Length)";

    console.log(`ℹ️ [GeminiService] Testing Connection using Key: ${maskedKey}`);

    try {
        // Simple "ping" test using countTokens to avoid using a lot of quota
        await ai.models.countTokens({
            model: modelId,
            contents: "System Check"
        });
        
        console.log("✅ [GeminiService] Connection Successful! API is responding.");
        return { success: true, message: "Connected" };
    } catch (error: any) {
        console.error("❌ [GeminiService] Connection Test Failed:", error);
        return { 
            success: false, 
            message: error?.message || "Unknown API Error"
        };
    }
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

        if (age < CACHE_DURATION) {
            console.log(`[GeminiService] Returning CACHED data for ${countryName}`);
            return cachedData;
        }
    } catch (e) {
        localStorage.removeItem(cacheKey);
    }
  }

  // 2. CHECK PERSISTENT RATE LIMIT LOCK
  const lockTime = getRateLimitLock();
  if (Date.now() < lockTime) {
      const waitSeconds = Math.ceil((lockTime - Date.now()) / 1000);
      return getRateLimitResponse(countryName, waitSeconds);
  }

  // 3. FETCH FROM API - CRITICAL GUARD
  if (!apiKey) {
      console.error("[GeminiService] CRITICAL: Missing API Key. Ensure process.env.GEMINI_API_KEY is set in deployment.");
      return {
          countryName,
          sentimentScore: 0,
          sentimentLabel: SentimentType.NEUTRAL,
          stateSummary: "Configuration Error: API Key missing. Please check GEMINI_API_KEY environment variable.",
          headlines: [
             { title: "Missing Configuration", category: "BAD", snippet: "The application could not find the 'GEMINI_API_KEY'.", source: "System", url: "#" }
          ],
          lastUpdated: Date.now()
      };
  }

  try {
    await enforceGlobalThrottle();

    const prompt = `
      Perform a real-time news sentiment analysis for ${countryName}.
      
      CRITICAL: You must use Google Search to find news headlines published strictly within the **LAST 24 HOURS**.
      
      1. Search for the top news stories for ${countryName} today.
      2. Identify the top 5 most significant events.
      3. Classify each headline as:
         - GOOD: Economic growth, peace treaties, scientific breakthroughs, social improvements.
         - BAD: Conflict, natural disasters, political corruption, crime spikes, economic crashes.
         - NEUTRAL: Routine diplomatic visits, general announcements, sports (unless major).
      4. EXTRACT SOURCE DATA: For every headline, you MUST provide the 'source' name (e.g., CNN, Al Jazeera) and the 'url' to the article.
      5. Calculate an aggregated sentiment score (-1.0 to 1.0) based on these 5 stories.
      6. Provide a "State of the Nation" summary reflecting these recent events.
      7. Provide the 2-letter ISO 3166-1 alpha-2 country code (e.g. US, CN, FR).
      
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

    const data = JSON.parse(text);
    let sentimentLabel = SentimentType.NEUTRAL;
    if (data.sentimentScore > 0.2) sentimentLabel = SentimentType.POSITIVE;
    if (data.sentimentScore < -0.2) sentimentLabel = SentimentType.NEGATIVE;

    const result: CountrySentimentData = {
      countryName,
      countryCode: data.countryCode,
      sentimentScore: data.sentimentScore,
      sentimentLabel,
      stateSummary: data.stateSummary,
      headlines: data.headlines,
      lastUpdated: Date.now(),
    };

    try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
        console.warn("[GeminiService] Storage quota exceeded");
    }

    return result;

  } catch (error: any) {
    const errorMessage = error?.message || "";
    const isRateLimit = errorMessage.includes("429") || 
                        errorMessage.includes("quota") || 
                        errorMessage.includes("RESOURCE_EXHAUSTED") ||
                        error?.status === 429;

    if (isRateLimit) {
        setRateLimitLock(Date.now() + 60000); 
        return getRateLimitResponse(countryName, 60);
    }

    console.error(`[GeminiService] Error fetching sentiment for ${countryName}:`, error);

    return {
      countryName,
      sentimentScore: 0,
      sentimentLabel: SentimentType.NEUTRAL,
      stateSummary: "Signal lost. Unable to retrieve live intelligence at this time.",
      headlines: [
        { title: "Connection Error", category: "NEUTRAL", snippet: "Could not connect to analysis grid. Please try again later.", source: "System", url: "#" }
      ],
      lastUpdated: Date.now(),
    };
  }
};

export const preloadGlobalData = async (
  onDataReceived: (data: CountrySentimentData) => void
) => {
  const needsFetch: string[] = [];

  for (const country of KEY_COUNTRIES) {
    const cacheKey = `${CACHE_PREFIX}${country}`;
    const cachedRaw = localStorage.getItem(cacheKey);
    let validCacheFound = false;

    if (cachedRaw) {
      try {
        const data = JSON.parse(cachedRaw);
        if (Date.now() - data.lastUpdated < CACHE_DURATION) {
          onDataReceived(data); 
          validCacheFound = true;
        }
      } catch (e) { localStorage.removeItem(cacheKey); }
    }

    if (!validCacheFound) needsFetch.push(country);
  }
  
  // NOTE: We do not auto-fetch in background if apiKey is missing to prevent spamming errors
  if (!apiKey && needsFetch.length > 0) {
      console.warn("[GeminiService] Skipping preload: API Key missing.");
      return;
  }
  
  if (needsFetch.length > 0) {
      for (let i = 0; i < needsFetch.length; i++) {
        if (Date.now() < getRateLimitLock()) break;
        const country = needsFetch[i];
        if (i > 0) await new Promise(r => setTimeout(r, 1000));
        const data = await fetchCountrySentiment(country);
        if (data.stateSummary.includes("SYSTEM OVERLOAD")) break;
        onDataReceived(data);
      }
  }
};

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
            } catch (e) { }
        }
    }
    return map;
}