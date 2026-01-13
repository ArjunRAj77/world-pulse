import React, { useState, useEffect, useCallback, useRef } from 'react';
import WorldMap from './components/WorldMap';
import SidePanel from './components/SidePanel';
import Header from './components/Header';
import { fetchCountrySentiment } from './services/geminiService';
import { CountrySentimentData } from './types';

// List of major countries to cycle through for background updates
const LIVE_UPDATE_COUNTRIES = [
  'United States', 'China', 'Russia', 'Ukraine', 'Israel', 
  'India', 'Brazil', 'United Kingdom', 'Germany', 'France', 
  'Japan', 'South Korea', 'Iran', 'Saudi Arabia', 'Turkey',
  'Mexico', 'Canada', 'Australia', 'South Africa', 'Nigeria'
];

function App() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<CountrySentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Stores the visual score for the map
  const [sentimentMap, setSentimentMap] = useState<Record<string, number>>({});
  
  // Track last updated for UI "liveness"
  const [lastUpdatedCountry, setLastUpdatedCountry] = useState<string | null>(null);

  useEffect(() => {
    // Initial simulated seed data for visual interest
    const mockMap: Record<string, number> = {};
    LIVE_UPDATE_COUNTRIES.forEach(c => {
        // Randomize slightly to not be static, biased towards neutral/slight tension
        mockMap[c] = (Math.random() * 1.5) - 0.75; 
    });
    setSentimentMap(mockMap);
  }, []);

  // Background "Heartbeat" - Update a random country every 20 seconds
  useEffect(() => {
    const intervalId = setInterval(async () => {
      // Don't update in background if user is actively looking at something else to avoid distraction?
      // Actually, updating the map while user reads is the goal ("alive").
      
      const randomCountry = LIVE_UPDATE_COUNTRIES[Math.floor(Math.random() * LIVE_UPDATE_COUNTRIES.length)];
      
      try {
        // We fetch silently without opening panel
        const data = await fetchCountrySentiment(randomCountry);
        setSentimentMap(prev => ({
          ...prev,
          [randomCountry]: data.sentimentScore
        }));
        setLastUpdatedCountry(randomCountry);
        
        // Clear the "just updated" tag after a few seconds
        setTimeout(() => setLastUpdatedCountry(null), 3000);
      } catch (e) {
        console.warn("Background update failed", e);
      }
    }, 15000); // 15 seconds

    return () => clearInterval(intervalId);
  }, []);

  const handleCountrySelect = useCallback(async (countryName: string) => {
    setSelectedCountry(countryName);
    setIsPanelOpen(true);
    setIsLoading(true);
    setSentimentData(null);

    // Fetch real data from Gemini
    const data = await fetchCountrySentiment(countryName);
    
    setSentimentData(data);
    setIsLoading(false);

    // Update the visual map with the REAL score we just got
    setSentimentMap(prev => ({
        ...prev,
        [countryName]: data.sentimentScore
    }));
  }, []);

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedCountry(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020617] text-white selection:bg-indigo-500/30">
      <Header />
      
      <main className="w-full h-full">
        <WorldMap 
            onCountrySelect={handleCountrySelect} 
            selectedCountry={selectedCountry}
            sentimentMap={sentimentMap}
        />
      </main>

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel}
        countryName={selectedCountry}
        data={sentimentData}
        isLoading={isLoading}
      />
      
      {/* Live Activity Indicator */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
         <div className="text-[10px] text-slate-500 font-mono">
            SYSTEM STATUS: ONLINE
         </div>
         {lastUpdatedCountry && (
           <div className="flex items-center gap-2 text-emerald-400 animate-pulse">
             <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
             <span className="text-xs font-mono uppercase">Updated: {lastUpdatedCountry}</span>
           </div>
         )}
      </div>
    </div>
  );
}

export default App;