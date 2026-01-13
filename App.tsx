import React, { useState, useEffect, useCallback } from 'react';
import WorldMap from './components/WorldMap';
import SidePanel from './components/SidePanel';
import Header from './components/Header';
import { fetchCountrySentiment, getCachedSentimentMap } from './services/geminiService';
import { CountrySentimentData } from './types';

function App() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<CountrySentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Stores the visual score for the map
  const [sentimentMap, setSentimentMap] = useState<Record<string, number>>({});
  
  useEffect(() => {
    console.log("[App] Component Mounted");
    if (!process.env.API_KEY) {
        console.error("[App] CRITICAL: process.env.API_KEY is missing! The app will fail to fetch data.");
    }

    // 1. Load any cached data immediately so the map isn't empty
    const cachedMap = getCachedSentimentMap();
    
    // 2. Add some visual noise for countries not in cache (optional, keeps the map looking "alive")
    // We only apply random noise to countries NOT in the cache.
    // This allows the map to start "blank" but retain history.
    
    setSentimentMap(cachedMap);
  }, []);

  const handleCountrySelect = useCallback(async (countryName: string) => {
    console.log(`[User Interaction] Selected country: ${countryName}`);
    setSelectedCountry(countryName);
    setIsPanelOpen(true);
    setIsLoading(true);
    setSentimentData(null);

    // Fetch real data from Gemini (Service handles 24h caching)
    const data = await fetchCountrySentiment(countryName);
    
    setSentimentData(data);
    setIsLoading(false);

    // Update the visual map with the score
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
            SYSTEM STATUS: ONLINE (OPTIMIZED MODE)
         </div>
      </div>
    </div>
  );
}

export default App;