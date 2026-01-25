
# Release Notes

## v1.5.0 - "Kinetic Horizon"
**Release Date:** December 15, 2026

This major update brings kinetic energy to the UI and specialized intelligence layers for conflict monitoring.

### 🌟 New Features

#### Kinetic Interface
- **Animated Gyroscope:** Replaced the static header globe with a custom-built, CSS-animated gyroscope that pulses with the application's heartbeat.
- **Improved Haptics:** Smoother transitions for map zooms and panel interactions.

#### Conflict Intelligence Layer
- **Active Conflict Tracking:** A dedicated map overlay that uses Gemini 3 Flash to identify and summarize active armed conflict zones in real-time.
- **AI-Driven Refresh:** Users can manually trigger a "Re-Scan" of conflict zones, which tasks the AI to scour the latest war reports and update the map overlay.

#### Global Intelligence Dashboard
- **Centralized Command Center:** A new comprehensive dashboard provides a holistic view of the world's stability.
- **Regional Analysis:** Aggregated sentiment scores by continent (e.g., "Europe is trending +0.45").
- **Extremes Tracking:** Instantly identify the "Most Stable" and "Most Critical" regions at a glance.
- **Sortable Registry:** A detailed table view of all analyzed countries with filtering, sorting, and CSV export.

### 🔧 Enhancements
- **Environmental Sensing:** Integrated Air Quality Index (AQI) data into the country intelligence panel.
- **Auto Pilot Upgrades:** Smoother touring with improved informational tooltips.

---

## v1.1.0 - "Atmospheric Awareness"
**Release Date:** November 02, 2026

This update expands the sensory capabilities of GeoPulse, introducing environmental data and a comprehensive global dashboard for deeper analysis.

### 🚀 New Features

#### Global Intelligence Dashboard
- **Centralized Command Center:** A new comprehensive dashboard provides a holistic view of the world's stability.
- **Regional Analysis:** Aggregated sentiment scores by continent (e.g., "Europe is trending +0.45").

#### Environmental Sensing
- **Air Quality Index (AQI):** The AI now retrieves real-time air quality data for capital cities using Google Search, displayed with color-coded health indicators in the country side panel.

---

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
- **Dynamic Heatmap:** Countries automatically color-code based on their AI confidence score.
- **Glassmorphism Side Panel:** Responsive details panel displaying state summaries, news feeds, and country statistics.
