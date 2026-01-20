
# GeoPulse 🌍

> **A living map of global events powered by AI.**

GeoPulse is an interactive real-time visualization tool that transforms raw geopolitical news into a living heatmap. Powered by **Google Gemini 3 Flash** and **Google Search Grounding**, it analyzes live headlines, socio-political events, and regional stability to generate an AI Confidence Score for every country on Earth.

## 🛡️ Security Hardening (CRITICAL)

Since this application runs client-side, your API keys are visible to the browser. You **MUST** implement the following restrictions to prevent abuse.

### 1. Restrict the Gemini API Key
Prevent unauthorized usage of your API Key by restricting it to your specific domains.

1. Go to **[Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)**.
2. Click on your **Gemini API Key**.
3. Under **Application restrictions**, select **Websites (HTTP referrers)**.
4. Add the following items:
   - `http://localhost:5173/*` (for local development)
   - `https://your-production-domain.com/*` (your deployed URL)
5. Under **API restrictions**, select **Restrict key** and check only:
   - **Generative Language API**
6. Save changes.

### 2. Secure Firebase Firestore
Prevent malicious data injection or database wiping.

1. Go to **Firebase Console > Firestore Database > Rules**.
2. Copy the contents of the `firestore.rules` file included in this project.
3. Paste it into the editor and click **Publish**.
4. **Result**: 
   - Public users can only write data that matches the strict schema (e.g., specific country names, scores between -1 and 1).
   - Public users cannot delete the database.
   - Public users cannot modify historical archives.

## ✨ Features

- **Interactive World Map**: A fully responsive D3.js vector map allowing exploration of 180+ countries.
- **Real-Time AI Analysis**: Instantly generates concise geopolitical summaries using Gemini 3 Flash.
- **Sentiment Heatmap**: Visualizes global stability with dynamic color coding (Emerald/Amber/Red).
- **Historical Timeline**: Visualizes sentiment trends over the last 30 days.
- **Live News Feed**: Fetches and categorizes the latest headlines using Google Search Grounding.
- **Smart Caching**: Utilizes Firebase Firestore to cache reports (22h validity) to minimize API usage and latency.
- **Rate Limit Protection**: Built-in scheduler and quota management to gracefully handle API limits.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Visualization**: D3.js (Data-Driven Documents)
- **AI Core**: Google GenAI SDK (Gemini 3 Flash Preview)
- **Database**: Firebase Firestore (Caching & History)
- **Build Tool**: Vite

## 🚀 Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/geopulse.git
   cd geopulse
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory.
   
   ```env
   # Required
   VITE_GEMINI_API_KEY=your_gemini_api_key_here

   # Optional (for caching feature)
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_PROJECT_ID=...
   # ... add other firebase config keys
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 🧠 How It Works

1. **Selection**: User clicks a country on the map.
2. **Cache Check**: The app checks Firestore for an analysis generated in the last 22 hours.
3. **AI Generation**: If no fresh data exists, a request is sent to Gemini 3 Flash.
4. **Grounding**: Gemini uses Google Search to find recent news articles.
5. **Synthesis**: The model assigns a Sentiment Score (-1.0 to 1.0) and summarizes the state of affairs.
6. **Visualization**: The map updates to reflect the new sentiment score.

## 📄 License

MIT License © 2026 Team Inevitables
