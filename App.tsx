import React, { useState, useEffect, useCallback, useMemo } from 'react';
import WorldMap from './components/WorldMap';
import SidePanel from './components/SidePanel';
import Header from './components/Header';
import Footer from './components/Footer';
import { fetchCountrySentiment, getCachedSentimentMap, preloadGlobalData, KEY_COUNTRIES, validateApiKeyConnection } from './services/geminiService';
import { CountrySentimentData } from './types';
import { AlertTriangle, WifiOff } from 'lucide-react';

function App() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<CountrySentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  const [configError, setConfigError] = useState<{isError: boolean, message: string}>({ isError: false, message: '' });
  
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
    
    // STARTUP CHECK: Verify API Connectivity
    const runStartupChecks = async () => {
        const result = await validateApiKeyConnection();
        if (!result.success) {
            setConfigError({
                isError: true, 
                message: result.message === "Missing API Key" 
                    ? "GEMINI_API_KEY is missing from environment variables."
                    : `API Connection Failed: ${result.message}`
            });
        }
    };
    runStartupChecks();

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
        
        // Update Count
        setLoadedCount(prev => Math.min(prev + 1, KEY_COUNTRIES.length));
    });

  }, []);

  const handleCountrySelect = useCallback(async (countryName: string) => {
    console.log(`[User Interaction] Selected country: ${countryName}`);
    setSelectedCountry(countryName);
    setIsPanelOpen(true);
    setIsLoading(true);
    setSentimentData(null);

    // Fetch real data from Gemini
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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      
      {/* Configuration Error Banner */}
      {configError.isError && (
        <div className="absolute top-0 left-0 w-full bg-red-900/90 text-white p-3 text-center text-sm font-bold z-[100] shadow-xl flex items-center justify-center gap-2 animate-[fadeIn_0.5s_ease-out] backdrop-blur-md">
            {configError.message.includes("Missing") ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
            <span>CRITICAL: {configError.message}</span>
        </div>
      )}

      <Header 
        countries={countryList} 
        onCountrySelect={handleCountrySelect}
        isPanelOpen={isPanelOpen} 
      />
      
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