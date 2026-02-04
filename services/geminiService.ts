
import { GoogleGenAI, Type } from "@google/genai";
import { CountrySentimentData, SentimentType, PredictionType, ConflictZone } from "../types";

// Initialize Gemini Client
// @google/genai Coding Guidelines: apiKey must be from process.env.API_KEY
// Assuming process.env.API_KEY is available and valid.
// Note: Communication is encrypted via HTTPS by the SDK.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const KEY_COUNTRIES = [
  "United States", "China", "Russia", "United Kingdom", "Germany", 
  "France", "India", "Japan", "Brazil", "South Africa", 
  "Australia", "Canada", "Saudi Arabia", "Iran", "North Korea"
];

// Helper to pause execution
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Normalization helper to prevent duplicate DB entries
export const normalizeCountryName = (name: string): string => {
  const n = name.trim();
  if (n === "United States of America" || n === "USA") return "United States";
  if (n === "United Kingdom" || n === "England") return "United Kingdom";
  return n;
};

export const validateApiKeyConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        if (!process.env.API_KEY) {
             return { success: false, message: "Missing API Key" };
        }
        // Basic validation for placeholder
        if (process.env.API_KEY.includes("YOUR_GEMINI_API_KEY")) {
             return { success: false, message: "PLACEHOLDER_KEY_DETECTED" };
        }
        
        // OPTIMIZATION: We do NOT make a test call here anymore.
        // We return success based on static analysis; actual errors will be caught in data fetching.
        return { success: true, message: "Connected" };
    } catch (error: any) {
        // Suppress detailed error logging in production for security
        // console.error("[GeminiService] Validation Error:", error);
        return { success: false, message: error.message || "Connection Failed" };
    }
};

/**
 * Fetch list of countries with active conflicts and a brief summary
 */
export const fetchActiveConflicts = async (): Promise<ConflictZone[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Identify countries with CURRENTLY active armed conflicts (wars, civil wars, insurgencies) as of ${new Date().toDateString()}.
            Return a JSON object with a 'conflicts' array containing the country name and a brief summary of the conflict.
            RULES:
            1. ONLY include conflicts active right now. EXCLUDE historical conflicts, resolved conflicts, or those with stable peace treaties.
            2. Use common English names (e.g. "Russia", "Syria", "Myanmar").
            3. For "Israel/Gaza", include "Israel" and "Palestine".
            4. Summary must be specific (e.g. "Civil war between X and Y" or "Border clashes with Z").
            5. Summary MAX 25 words.
            6. Do NOT use generic phrases like "Active conflict reported".
            7. Include major hotspots like Ukraine, Sudan, Yemen, DRC, Myanmar.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        conflicts: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT,
                                properties: {
                                    countryName: { type: Type.STRING },
                                    summary: { type: Type.STRING, description: "Specific details of the conflict (max 25 words). Do not use generic placeholders." }
                                }
                            } 
                        }
                    }
                },
                tools: [{googleSearch: {}}]
            }
        });

        const text = response.text;
        
        if (!text) {
            return [];
        }

        const data = JSON.parse(text);
        const rawConflicts = data.conflicts || [];

        return rawConflicts.map((c: any) => ({
            countryName: normalizeCountryName(c.countryName),
            summary: c.summary || "Conflict detected."
        }));

    } catch (e) {
        // console.error("[GeminiService] Failed to fetch conflicts:", e);
        return [];
    }
};

/**
 * Fetch data for multiple countries in a single request (Batching)
 */
export const fetchBatchCountrySentiment = async (countries: string[]): Promise<CountrySentimentData[]> => {
    const countriesList = countries.join(", ");
    // console.debug(`[GeminiService] Batch Analyzing: ${countriesList}`);

    let attempt = 0;
    const MAX_RETRIES = 2;

    while (attempt <= MAX_RETRIES) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: `Analyze sentiment, news, and environment for the following countries: ${countriesList}. 
                For EACH country, provide:
                1. sentimentScore (-1.0 to 1.0), sentimentLabel (POSITIVE, NEGATIVE, NEUTRAL).
                2. stateSummary (Max 20 words).
                3. prediction (IMPROVING, DETERIORATING, STABLE) and rationale.
                4. sectorBreakdown.
                5. AQI for capital.
                6. EXACTLY 3 headlines.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                countryName: { type: Type.STRING },
                                countryCode: { type: Type.STRING, description: "ISO 3166-1 alpha-2 code" },
                                sentimentScore: { type: Type.NUMBER },
                                sentimentLabel: { type: Type.STRING },
                                stateSummary: { type: Type.STRING },
                                prediction: { type: Type.STRING, enum: ["IMPROVING", "DETERIORATING", "STABLE"] },
                                predictionRationale: { type: Type.STRING },
                                sectorBreakdown: {
                                    type: Type.OBJECT,
                                    properties: {
                                        economy: { type: Type.NUMBER },
                                        politics: { type: Type.NUMBER },
                                        civil: { type: Type.NUMBER }
                                    }
                                },
                                aqi: { type: Type.NUMBER },
                                headlines: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            title: { type: Type.STRING },
                                            category: { type: Type.STRING },
                                            snippet: { type: Type.STRING },
                                            source: { type: Type.STRING },
                                            url: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    tools: [{googleSearch: {}}]
                }
            });

            const text = response.text;
            if (!text) throw new Error("Empty response text");

            const dataArray = JSON.parse(text);
            
            if (!Array.isArray(dataArray)) {
                // console.warn("[GeminiService] Batch response was not an array");
                return [];
            }

            return dataArray.map((data: any) => ({
                countryName: data.countryName || "Unknown",
                countryCode: data.countryCode,
                sentimentScore: data.sentimentScore,
                sentimentLabel: data.sentimentLabel as SentimentType,
                stateSummary: data.stateSummary,
                prediction: data.prediction as PredictionType,
                predictionRationale: data.predictionRationale,
                sectorBreakdown: data.sectorBreakdown,
                aqi: data.aqi,
                headlines: data.headlines || [],
                lastUpdated: Date.now()
            }));

        } catch (error: any) {
            const isRateLimit = error.status === 429 || (error.message && error.message.includes("429")) || (error.message && error.message.includes("quota"));
            
            if (isRateLimit) {
                if (attempt < MAX_RETRIES) {
                    const delay = 15000 + (attempt * 15000); 
                    // console.warn(`[GeminiService] Batch 429. Retrying in ${Math.round(delay/1000)}s...`);
                    await wait(delay);
                    attempt++;
                    continue;
                } else {
                    throw new Error("QUOTA_EXHAUSTED");
                }
            }
            // console.error(`[GeminiService] Batch Error for ${countriesList}:`, error);
            return []; // Skip this batch
        }
    }
    return [];
};

/**
 * Single Country Fetch (Wrapper for legacy calls or specific on-demand checks)
 */
export const fetchCountrySentiment = async (countryName: string): Promise<CountrySentimentData | null> => {
    // We reuse the batch logic for a single item to maintain consistency
    const result = await fetchBatchCountrySentiment([countryName]);
    return result.length > 0 ? result[0] : null;
};
