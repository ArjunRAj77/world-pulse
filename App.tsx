import React, { useState, useEffect, useCallback, useMemo } from 'react';
import WorldMap from './components/WorldMap';
import SidePanel from './components/SidePanel';
import Header from './components/Header';
import Footer from './components/Footer';
import { fetchCountrySentiment, getCachedSentimentMap, preloadGlobalData, KEY_COUNTRIES } from './services/geminiService';
import { CountrySentimentData } from './types';

function App() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<CountrySentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  
  // Stores the visual score for the map
  const [sentimentMap, setSentimentMap] = useState<Record<string, number>>({});
  
  // Footer State
  const [loadedCount, setLoadedCount] = useState(0);
  const [lastGlobalUpdate, setLastGlobalUpdate] = useState<number | null>(null);

  // Load GeoJSON once at App level
  useEffect(() => {
    const CACHE_KEY = 'worldpulse_geojson_v1';
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
      try {
        setGeoData(JSON.parse(cachedData));
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    if (!cachedData) {
        fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
        .then(res => res.json())
        .then(data => {
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            } catch (e) {}
            setGeoData(data);
        })
        .catch(err => console.error("Failed to load map data", err));
    }
  }, []);

  // Derive country list for search
  const countryList = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.map((f: any) => f.properties.name).sort();
  }, [geoData]);

  useEffect(() => {
    console.log("[App] Component Mounted");
    if (!process.env.API_KEY) {
        console.error("[App] CRITICAL: process.env.API_KEY is missing! The app will fail to fetch data.");
    }

    // 1. Load any cached data immediately so the map isn't empty
    const cachedMap = getCachedSentimentMap();
    setSentimentMap(cachedMap);
    
    // 2. Start Background Preloader
    let initialCachedCount = 0;
    KEY_COUNTRIES.forEach(c => {
        if (cachedMap[c] !== undefined) initialCachedCount++;
    });
    setLoadedCount(initialCachedCount);

    preloadGlobalData((data) => {
        // Update Map
        setSentimentMap(prev => ({
            ...prev,
            [data.countryName]: data.sentimentScore
        }));

        // Update Footer State
        setLastGlobalUpdate(data.lastUpdated);
        
        // Update Count (ensure we don't double count if we already had it, but simpler to just increment for "activity")
        setLoadedCount(prev => Math.min(prev + 1, KEY_COUNTRIES.length));
    });

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
    setLastGlobalUpdate(data.lastUpdated);

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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-indigo-500/30">
      <Header 
        countries={countryList} 
        onCountrySelect={handleCountrySelect}
        isPanelOpen={isPanelOpen} 
      />
      
      {/* Removed pb-8 to allow map to be full height */}
      <main className="w-full h-full">
        <WorldMap 
            geoData={geoData}
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
      
      <Footer 
        lastUpdated={lastGlobalUpdate}
        loadedItems={loadedCount}
        totalItems={KEY_COUNTRIES.length}
      />
    </div>
  );
}

export default App;