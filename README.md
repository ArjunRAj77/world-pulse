
# Geo-Pulse 🌍 v1.6.0

> **Geo-Pulse: The weather radar for geopolitics.**

Uses **Google Gemini AI** to turn live news into a real-time global sentiment heatmap. Watch the world pulse Red for conflict or Green for stability.

## 🧐 What is this?

Think of it as a **Mood Ring for the Planet**. 
We grab live news, feed it to **Google Gemini 3 Flash**, and it spits back a "Sentiment Score" for every country.

- **Green?** Doing great. Best life. (Economic booms, peace treaties).
- **Red?** Chaos. Maybe avoid for now. (Conflict, instability).
- **Blue?** Meh. Business as usual.

## ✨ Cool Stuff It Does

### 1. The Living Map 🗺️
It's a fully interactive vector map designed to look like a sci-fi command center.
- **New in v1.6:** **"Stellar Flow" Ocean:** The background features a bioluminescent particle system that mimics ocean currents and wind patterns.
- **New in v1.6:** **Live Strategic Layers:** Overlay icons are now fully animated—Nuclear symbols spin, Space ports float, and Conflict zones pulse with urgency.

### 2. AI News Anchor 🤖
Click a country, and our AI:
- **Reads the News:** Scours the web for the latest headlines (literally from today).
- **Summarizes the Drama:** Gives you a one-sentence breakdown of what's happening.
- **Predicts the Future:** Analyzes trends to guess if next week will be better or worse.

### 3. Features You'll Love
- **Global Dashboard:** A big table view to see who is winning at "Stability" and who needs a hug.
- **Air Quality Check:** Tells you if you should wear a mask in the capital city right now.
- **Time Travel:** We save data daily, so you can see a graph of how a country's mood has changed over the last month.
- **Auto-Pilot Mode:** Hit the button, sit back, and let the app take you on a guided tour of the world. Perfect for hallway screens.

---

## 🔒 Security & Privacy

We take data hygiene seriously.
- **Encrypted Comms:** All API traffic flows through TLS 1.2+ encrypted channels via the official Google GenAI SDK.
- **Stealth Mode:** Production logs are sanitized to prevent leaking API keys or internal database structures in the browser console.

---

## 🛠️ The Tech Stack (For the Nerds)

This isn't just a pretty face. It's built with some solid engineering:

- **Frontend:** React 18 + TypeScript (Because we like type safety).
- **AI Brain:** Google GenAI SDK (`gemini-3-flash-preview`). It's fast and smart.
- **Grounding:** Google Search Tool (So the AI doesn't hallucinate fake news).
- **Database:** Firebase Firestore. We cache reports for 22 hours so we don't go broke on API limits.
- **Visuals:** D3.js (For that buttery smooth map interaction).

---

## 🚀 How to Run It

1. **Clone this repo:**
   ```bash
   git clone https://github.com/yourusername/geopulse.git
   ```

2. **Install the goods:**
   ```bash
   npm install
   ```

3. **Add your keys:**
   Create a `.env` file and add your `VITE_GEMINI_API_KEY`.

4. **Run it:**
   ```bash
   npm run dev
   ```

5. **Vibe check the world.**

---

*Built with ☕ and 🤖 by Team Inevitables.*
