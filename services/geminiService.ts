import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CountrySentimentData, SentimentType } from "../types";

// Initialize Gemini Client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = "gemini-3-flash-preview";
const CACHE_PREFIX = 'wp_sentiment_v2_'; // Bumped version for new schema
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Hours in milliseconds
const RATE_LIMIT_STORAGE_KEY = 'wp_rate_limit_lock_until';
const LAST_REQUEST_STORAGE_KEY = 'wp_last_api_req_ts';
const MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests (Conservative 12 RPM)

// Strategic countries to auto-load on startup
export const KEY_COUNTRIES = [
  "United States", "China", "Russia", "United Kingdom", "Germany", 
  "France", "India", "Japan", "Brazil", "South Africa", 
  "Australia", "Canada", "Saudi Arabia", "Iran", "North Korea"
];

// Helper to manage persistent rate limit lock
const getRateLimitLock = (): number => {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
        return stored ? parseInt(stored, 10) : 0;
    } catch { return 0; }
};

const setRateLimitLock = (timestamp: number) => {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, timestamp.toString());
};

// Helper to throttle requests across reloads
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
        // Update timestamp for this new request
        localStorage.setItem(LAST_REQUEST_STORAGE_KEY, Date.now().toString());
    } catch (e) {
        // Fallback if storage fails
        console.warn("[GeminiService] Throttle storage error", e);
    }
};

// Schema for structured output
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

  // 2. CHECK PERSISTENT RATE LIMIT LOCK
  const lockTime = getRateLimitLock();
  if (Date.now() < lockTime) {
      const waitSeconds = Math.ceil((lockTime - Date.now()) / 1000);
      console.warn(`[GeminiService] Persistent cooldown active. Request aborted.`);
      return getRateLimitResponse(countryName, waitSeconds);
  }

  // 3. FETCH FROM API
  if (!process.env.API_KEY) {
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
    // Enforce global throttle (wait if we made a request recently, even after reload)
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

    console.log(`[GeminiService] Success response for ${countryName}`);

    const data = JSON.parse(text);

    // Map the raw score to our enum
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

    // 4. SAVE TO CACHE
    try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
        console.warn("[GeminiService] Storage quota exceeded, could not cache result.");
    }

    return result;

  } catch (error: any) {
    // Detect 429 / Quota Errors
    const errorMessage = error?.message || "";
    const isRateLimit = errorMessage.includes("429") || 
                        errorMessage.includes("quota") || 
                        errorMessage.includes("RESOURCE_EXHAUSTED") ||
                        error?.status === 429;

    if (isRateLimit) {
        console.warn(`[GeminiService] Rate limit hit for ${countryName}. Activating 60s persistent cooldown.`);
        setRateLimitLock(Date.now() + 60000); // Persist lock for 60s
        return getRateLimitResponse(countryName, 60);
    }

    // Only log non-rate-limit errors as Error to clean up console
    console.error(`[GeminiService] Error fetching sentiment for ${countryName}:`, error);

    // Fallback/Mock data if API fails (graceful degradation)
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

// Batch Loader
export const preloadGlobalData = async (
  onDataReceived: (data: CountrySentimentData) => void
) => {
  const needsFetch: string[] = [];

  // 1. Emit cached data immediately
  for (const country of KEY_COUNTRIES) {
    const cacheKey = `${CACHE_PREFIX}${country}`;
    const cachedRaw = localStorage.getItem(cacheKey);
    let validCacheFound = false;

    if (cachedRaw) {
      try {
        const data = JSON.parse(cachedRaw);
        if (Date.now() - data.lastUpdated < CACHE_DURATION) {
          console.log(`[GeminiService] Preload hit cache for ${country}`);
          onDataReceived(data); // Immediate update
          validCacheFound = true;
        }
      } catch (e) { localStorage.removeItem(cacheKey); }
    }

    if (!validCacheFound) {
      needsFetch.push(country);
    }
  }

  // 2. Fetch missing data with Rate Limiting
  
  if (needsFetch.length > 0) {
      console.log(`[GeminiService] Need to fetch ${needsFetch.length} countries. Starting sequence...`);
      
      for (let i = 0; i < needsFetch.length; i++) {
        
        // Abort if locked
        if (Date.now() < getRateLimitLock()) {
            console.log("[GeminiService] Preload aborted due to global rate limit lock.");
            break;
        }

        const country = needsFetch[i];
        
        // Use the centralized throttle logic inside fetchCountrySentiment
        // But also add a small delay here to prevent overlapping console logs/UI updates being too frenetic
        if (i > 0) {
             await new Promise(r => setTimeout(r, 1000));
        }

        const data = await fetchCountrySentiment(country);
        
        // If we hit a rate limit during preload, stop the queue immediately
        if (data.stateSummary.includes("SYSTEM OVERLOAD")) {
            console.warn("[GeminiService] Rate limit hit during preload. Stopping batch.");
            break;
        }

        onDataReceived(data);
      }
  } else {
      console.log("[GeminiService] All key countries already cached.");
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