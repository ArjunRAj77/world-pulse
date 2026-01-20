# Release Notes

## v1.0.0 - "Genesis Pulse" (Public Beta)
**Release Date:** October 26, 2026

We are thrilled to announce the first public release of **GeoPulse**. This version lays the foundation for a real-time global sentiment monitoring system using the latest in Generative AI.

### 🌟 New Features

#### Core Intelligence
- **Gemini 3 Flash Integration:** Utilizes Google's latest high-efficiency model for rapid text analysis and reasoning.
- **Search Grounding:** Integrated `googleSearch` tool to ensure AI responses are based on real-time, up-to-the-minute web data.
- **Sentiment Scoring Engine:** Proprietary logic to convert qualitative news data into a quantitative `SentimentScore` (-1.0 to +1.0).

#### Visualization & UI
- **Interactive D3.js Map:** Vector-based world map with zoom, pan, and hover interactions.
- **Dynamic Heatmap:** Countries automatically color-code based on their AI confidence score (Red = Critical, Amber = Neutral, Emerald = Optimal).
- **Glassmorphism Side Panel:** Responsive details panel displaying state summaries, news feeds, and country statistics.
- **"Did You Know?" Loading State:** Entertaining facts displayed while the AI "thinks" to improve perceived latency.

#### Infrastructure & Performance
- **Firebase Caching Layer:** Implemented Firestore read/write logic to cache country data for 22 hours, significantly reducing API costs and latency for popular queries.
- **Rate Limit Scheduler:** A smart queuing system (`SyncManager`) that respects the Gemini API free tier limits (Requests Per Minute/Day) and handles 429 errors gracefully.
- **Offline/Fallback Support:** In-memory fallback caching if Firebase is unreachable.

### 🐛 Known Issues
- **API Quotas:** Heavy usage may trigger the "Daily Quota Exceeded" warning on the Free Tier.
- **Mobile Map Navigation:** Zoom gestures on smaller mobile screens can sometimes conflict with page scrolling.

### 🔮 Coming Soon (Roadmap)
- Historical timeline view.
- Comparative analysis between two countries.
- Multi-language support.