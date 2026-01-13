import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CountrySentimentData, SentimentType } from "../types";

// Initialize Gemini Client
// We assume process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = "gemini-3-flash-preview";

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

export const fetchCountrySentiment = async (countryName: string): Promise<CountrySentimentData> => {
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
      throw new Error("No response from Gemini");
    }

    const data = JSON.parse(text);

    // Map the raw score to our enum
    let sentimentLabel = SentimentType.NEUTRAL;
    if (data.sentimentScore > 0.2) sentimentLabel = SentimentType.POSITIVE;
    if (data.sentimentScore < -0.2) sentimentLabel = SentimentType.NEGATIVE;

    return {
      countryName,
      sentimentScore: data.sentimentScore,
      sentimentLabel,
      stateSummary: data.stateSummary,
      headlines: data.headlines,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error("Error fetching sentiment for", countryName, error);
    // Fallback/Mock data if API fails (graceful degradation)
    return {
      countryName,
      sentimentScore: 0,
      sentimentLabel: SentimentType.NEUTRAL,
      stateSummary: "Data unavailable. Could not fetch live news.",
      headlines: [
        { title: "Real-time news unavailable", category: "NEUTRAL", snippet: "Please check your connection or try again." }
      ],
      lastUpdated: Date.now(),
    };
  }
};