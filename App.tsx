
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import WorldMap from './components/WorldMap';
import SidePanel from './components/SidePanel';
import Header from './components/Header';
import Footer from './components/Footer';
import GlobalSummary from './components/GlobalSummary';
import { validateApiKeyConnection, KEY_COUNTRIES, normalizeCountryName, fetchActiveConflicts } from './services/geminiService';
import { syncManager } from './services/scheduler';
import { initDB, getCountryData, getAllCountryData, testConnection, getActiveConflicts, saveActiveConflicts } from './services/db';
import { CountrySentimentData, ConflictZone } from './types';
import { AlertTriangle, WifiOff, Key, RefreshCw, ShieldAlert, Loader2, Globe, Ban, Info, X, Radar, Terminal, Coffee, Map as MapIcon, HeartHandshake, Layers, Shield, ChevronDown, Radiation, Rocket, Target, Link, Cpu, Flame } from 'lucide-react';
import { OverlayType, STATIC_OVERLAYS } from './services/staticData';
import clsx from 'clsx';

function App() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<CountrySentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Panel state - closed by default
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelWarning, setPanelWarning] = useState<string | null>(null);
  
  // UI Modal State
  const [showAbout, setShowAbout] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [showGlobalSummary, setShowGlobalSummary] = useState(false);

  // Map Overlay State
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>('NONE');
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);
  
  // Dynamic Layers Data
  const [conflictZones, setConflictZones] = useState<ConflictZone[]>([]);
  const [isConflictLoading, setIsConflictLoading] = useState(false);

  // Auto Pilot State
  const [isAutoPilot, setIsAutoPilot] = useState(false);

  // Refs for managing timeouts safely
  const loadingRef = useRef(false);
  const layersMenuRef = useRef<HTMLDivElement>(null);

  const [geoData, setGeoData] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Background Job State
  const [syncStatus, setSyncStatus] = useState<{ active: boolean; current?: string; remaining?: number }>({ active: false });
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  
  // Configuration State
  const [configStatus, setConfigStatus] = useState<'OK' | 'MISSING_KEY' | 'PLACEHOLDER_KEY' | 'CONNECTION_ERROR' | 'DB_PERMISSION_DENIED'>('OK');
  const [configMessage, setConfigMessage] = useState('');
  
  // Stores the visual score for the map
  const [sentimentMap, setSentimentMap] = useState<Record<string, number>>({});
  
  // 1. Initialize DB and Load Map Data
  useEffect(() => {
    const initApp = async () => {
        // Init DB
        await initDB();

        // TEST CONNECTION
        // console.debug("[App] Running DB Connectivity Test...");
        const dbTestResult = await testConnection();
        if (!dbTestResult.success && dbTestResult.error === 'permission-denied') {
            setConfigStatus('DB_PERMISSION_DENIED');
        }

        // Load initial sentiments from DB
        const allData = await getAllCountryData();
        if (allData.length > 0) {
            const initialMap: Record<string, number> = {};
            allData.forEach(d => { initialMap[d.countryName] = d.sentimentScore; });
            setSentimentMap(initialMap);
        }

        // Load active conflicts from DB (with Auto-Init fallback)
        try {
            let conflicts = await getActiveConflicts();
            const hasLegacyData = conflicts.some(c => c.summary === "Active conflict reported.");
            if (conflicts.length > 0) {
                setConflictZones(conflicts);
            }
            if (conflicts.length === 0 || hasLegacyData) {
                // if (hasLegacyData) console.log("[App] Detected legacy conflict data. Refreshing via AI...");
                const freshConflicts = await fetchActiveConflicts();
                if (freshConflicts.length > 0) {
                    await saveActiveConflicts(freshConflicts);
                    setConflictZones(freshConflicts);
                }
            }
        } catch (e) {
            // console.error("[App] Failed to load conflict data:", e);
        }

        // --- SCHEDULER LOGIC ---
        syncManager.setCallback((state) => {
             if (state.status === 'ERROR') {
                 setSyncStatus({ active: false });
                 setQuotaExceeded(true);
                 // console.warn(`[App] Sync Scheduler Stopped: ${state.errorMessage}`);
             } else if (state.status === 'COMPLETE') {
                 setSyncStatus({ active: false });
                 getAllCountryData().then(data => {
                    const newMap: Record<string, number> = {};
                    data.forEach(d => { newMap[d.countryName] = d.sentimentScore; });
                    setSentimentMap(newMap);
                 });
             } else {
                 setSyncStatus({ active: true, remaining: state.remaining, current: state.current });
             }
        });

        // console.debug("[App] 20 RPD Limit Mode: Background sync disabled. Waiting for user interaction.");
    };

    initApp();
  }, []);

  // 2. Load GeoJSON
  useEffect(() => {
    const CACHE_KEY = 'worldpulse_geojson_v1';
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
      try {
        const data = JSON.parse(cachedData);
        if (data && data.features) {
            data.features.forEach((f: any) => {
                f.properties.name = normalizeCountryName(f.properties.name);
            });
        }
        setGeoData(data);
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    if (!cachedData) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); 

        fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson', { signal: controller.signal })
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch map data");
            return res.json();
        })
        .then(data => {
            clearTimeout(timeoutId);
            if (data && data.features) {
                data.features.forEach((f: any) => {
                    f.properties.name = normalizeCountryName(f.properties.name);
                });
            }
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            } catch (e) {}
            setGeoData(data);
        })
        .catch(err => {
            // console.error("Failed to load map data", err);
            setMapError("Map data unavailable (Network/CORS).");
            setGeoData({ type: "FeatureCollection", features: [] });
        });
    }
  }, []);

  const countryList = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.map((f: any) => f.properties.name).sort();
  }, [geoData]);

  // Derived list of conflict country names for map overlay rendering
  const conflictCountryNames = useMemo(() => {
      return conflictZones.map(z => z.countryName);
  }, [conflictZones]);

  // 3. API Check
  useEffect(() => {
    const runStartupChecks = async () => {
        const result = await validateApiKeyConnection();
        if (!result.success) {
            if (result.message === "Missing API Key") {
                setConfigStatus('MISSING_KEY');
            } else if (result.message === "PLACEHOLDER_KEY_DETECTED") {
                setConfigStatus('PLACEHOLDER_KEY');
            } else {
                setConfigStatus('CONNECTION_ERROR');
                setConfigMessage(result.message);
            }
        }
    };
    runStartupChecks();
  }, []);

  // Close layers menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (layersMenuRef.current && !layersMenuRef.current.contains(event.target as Node)) {
            setIsLayersMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 4. Handle Selection
  const handleCountrySelect = useCallback(async (rawCountryName: string, isAuto: boolean = false) => {
    const countryName = normalizeCountryName(rawCountryName);
    
    // Manual intervention stops auto pilot
    if (!isAuto) {
        setIsAutoPilot(false);
    }

    setSelectedCountry(countryName);
    setIsPanelOpen(true);
    setSentimentData(null);
    setPanelError(null);
    setPanelWarning(null);

    // 1. Try to get from DB first (Cheap)
    let data = await getCountryData(countryName);

    // 2. Determine Freshness
    const isStale = !data || (Date.now() - data.lastUpdated > 1000 * 60 * 60 * 22); // 22h

    if (isStale) {
        if (quotaExceeded) {
             // console.warn("[App] Quota exceeded, cannot fetch new data.");
             if (data) {
                 setSentimentData(data);
                 setPanelWarning("Daily API Limit Reached. Displaying last available report.");
             } else {
                 setPanelError("Daily API Quota Limit Exceeded. Cannot generate new report.");
             }
             setIsLoading(false);
             return;
        }

        setIsLoading(true);
        loadingRef.current = true;
        
        syncManager.prioritize(countryName);
        
        // Polling for update
        const checkInterval = setInterval(async () => {
             const freshData = await getCountryData(countryName);
             if (freshData && freshData.lastUpdated > (data?.lastUpdated || 0)) {
                 clearInterval(checkInterval);
                 setSentimentData(freshData);
                 setIsLoading(false);
                 loadingRef.current = false;
                 setSentimentMap(prev => ({ ...prev, [countryName]: freshData.sentimentScore }));
             }
        }, 1000);
        
        // Timeout after 45s - FALLBACK TO STALE DATA IF AVAILABLE
        setTimeout(() => {
             if (loadingRef.current) {
                 clearInterval(checkInterval);
                 setIsLoading(false); 
                 loadingRef.current = false;

                 if (data) {
                     setSentimentData(data);
                     setPanelWarning("Live update timed out. Displaying last available report.");
                 } else {
                     setPanelError("Analysis timed out or connection slow.");
                 }
             }
        }, 45000);
        
    } else {
        setSentimentData(data || null);
        setIsLoading(false);
    }
  }, [isLoading, quotaExceeded]);

  // Auto Pilot Loop
  useEffect(() => {
    if (!isAutoPilot) return;

    // Filter list to only include countries we have data for (better presentation)
    // If we have no cached data, fallback to KEY_COUNTRIES
    const cachedCountries = Object.keys(sentimentMap);
    const candidateList = cachedCountries.length > 0 ? cachedCountries : KEY_COUNTRIES;

    if (candidateList.length === 0) return;

    const interval = setInterval(() => {
        // Randomly select next country
        let nextIndex = Math.floor(Math.random() * candidateList.length);
        let nextCountry = candidateList[nextIndex];
        
        // Avoid selecting the same country twice in a row if list has > 1 item
        if (candidateList.length > 1 && nextCountry === selectedCountry) {
            nextIndex = (nextIndex + 1) % candidateList.length;
            nextCountry = candidateList[nextIndex];
        }

        handleCountrySelect(nextCountry, true);
    }, 15000); // 15 seconds per country

    return () => clearInterval(interval);
  }, [isAutoPilot, sentimentMap, selectedCountry, handleCountrySelect]);

  const toggleAutoPilot = () => {
      if (isAutoPilot) {
          setIsAutoPilot(false);
      } else {
          setIsAutoPilot(true);
          // If no country selected, start immediately with a random one
          if (!selectedCountry) {
              const cached = Object.keys(sentimentMap);
              const list = cached.length > 0 ? cached : KEY_COUNTRIES;
              if (list.length > 0) {
                  const randomIndex = Math.floor(Math.random() * list.length);
                  handleCountrySelect(list[randomIndex], true);
              }
          }
      }
  };

  const handleClosePanel = () => {
    setIsAutoPilot(false);
    setIsPanelOpen(false);
    setSelectedCountry(null);
    setSentimentData(null);
  };

  const handleRefreshConflicts = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isConflictLoading) return;
      
      if (!confirm("Initiate AI scan for active conflict zones? This consumes API quota.")) return;

      setIsConflictLoading(true);
      const newConflicts = await fetchActiveConflicts();
      if (newConflicts.length > 0) {
          await saveActiveConflicts(newConflicts);
          setConflictZones(newConflicts);
          alert(`Scan Complete. Found ${newConflicts.length} conflict zones.`);
      } else {
          alert("Scan returned no results or failed.");
      }
      setIsConflictLoading(false);
  };

  const handleManualDbTest = async () => {
      const result = await testConnection();
      if (result.success) {
          alert("Database Write SUCCESS!\n\nYour rules are correctly configured.");
          if (configStatus === 'DB_PERMISSION_DENIED') setConfigStatus('OK');
      } else {
          if (result.error === 'permission-denied') {
              setConfigStatus('DB_PERMISSION_DENIED');
          } else {
              alert(`Database Write FAILED:\n${result.error}`);
          }
      }
  };

  const handleSecretTest = async () => {
    if (quotaExceeded) {
        alert("Daily Quota Exceeded. Cannot run test.");
        return;
    }
    const testCountry = "Iceland";
    if (confirm(`SECRET DEV MODE ACTIVATED\n\nRun immediate API test for ${testCountry}?`)) {
        syncManager.start([testCountry], true);
        handleCountrySelect(testCountry);
    }
  };

  // Helper to map active overlay to animated icon
  const getOverlayIcon = (type: OverlayType) => {
      switch(type) {
          case 'NUCLEAR': 
            return <Radiation className="w-4 h-4 text-amber-500 animate-[spin_4s_linear_infinite]" />;
          case 'SPACE': 
            return <Rocket className="w-4 h-4 text-sky-400 animate-pulse" />;
          case 'NATO': 
            return <Shield className="w-4 h-4 text-indigo-400 animate-pulse" />;
          case 'CONFLICT': 
            return (
                <div className="relative flex items-center justify-center">
                    <Target className="w-4 h-4 text-red-500 relative z-10" />
                    <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></span>
                </div>
            );
          case 'BRICS': 
            return <Link className="w-4 h-4 text-fuchsia-400 animate-pulse" />;
          case 'AI_HUBS': 
            return <Cpu className="w-4 h-4 text-cyan-400 animate-[pulse_1.5s_ease-in-out_infinite]" />;
          case 'OPEC': 
            return <Flame className="w-4 h-4 text-yellow-400 animate-[pulse_2s_ease-in-out_infinite]" />;
          default: 
            return <X className="w-4 h-4 text-slate-500" />;
      }
  };

  const totalCountries = KEY_COUNTRIES.length;
  const progressPercent = syncStatus.remaining 
    ? Math.round(((totalCountries - syncStatus.remaining) / totalCountries) * 100) 
    : 100;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-pulse-dark text-slate-100 selection:bg-indigo-500/30">
      
      {/* 1. SETUP REQUIRED SCREEN (Placeholder Key) */}
      {configStatus === 'PLACEHOLDER_KEY' && (
        <div className="absolute inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-slate-900 rounded-2xl mx-auto flex items-center justify-center border border-slate-800 shadow-2xl">
                    <Key className="w-10 h-10 text-amber-400 animate-pulse" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Setup Required</h1>
                    <p className="text-slate-400">
                        The application is detected, but the <code>.env</code> file is using a placeholder API Key.
                    </p>
                </div>
                <div className="bg-slate-900 text-left p-6 rounded-lg border border-slate-800 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-500/20 text-indigo-400 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                        <p className="text-sm text-slate-300">Open the <code>.env</code> file in your project root.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-500/20 text-indigo-400 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                        <p className="text-sm text-slate-300">Replace <code>YOUR_GEMINI_API_KEY_HERE</code> with your valid Gemini API Key.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-500/20 text-indigo-400 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                        <p className="text-sm text-slate-300">Save the file and refresh this page.</p>
                    </div>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors w-full"
                >
                    I Updated the File, Retry
                </button>
            </div>
        </div>
      )}

      {/* 2. DB PERMISSION ERROR SCREEN */}
      {configStatus === 'DB_PERMISSION_DENIED' && (
        <div className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6">
             <div className="max-w-xl w-full text-center space-y-6 animate-[fadeIn_0.5s_ease-out]">
                <div className="w-20 h-20 bg-red-900/20 rounded-2xl mx-auto flex items-center justify-center border border-red-500/30 shadow-2xl">
                    <ShieldAlert className="w-10 h-10 text-red-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Database Access Denied</h1>
                    <p className="text-red-200/80">
                        Firebase is blocking write operations. You need to update your Security Rules.
                    </p>
                </div>
                <div className="bg-slate-900 text-left p-6 rounded-lg border border-red-900/30 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="bg-red-500/20 text-red-400 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                        <p className="text-sm text-slate-300">Go to <strong>Firebase Console</strong> &gt; <strong>Firestore Database</strong> &gt; <strong>Rules</strong>.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="bg-red-500/20 text-red-400 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                        <div className="space-y-2 w-full">
                            <p className="text-sm text-slate-300">Change the rules to allow public access (for development):</p>
                            <div className="bg-black/50 p-3 rounded border border-slate-700 font-mono text-xs text-emerald-400 overflow-x-auto">
                                allow read, write: if true;
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="bg-red-500/20 text-red-400 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                        <p className="text-sm text-slate-300">Click <strong>Publish</strong> and then click "Retry Connection" below.</p>
                    </div>
                </div>
                <button 
                    onClick={handleManualDbTest}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors w-full flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry Connection
                </button>
             </div>
        </div>
      )}

      {/* 3. CONNECTION ERROR SCREEN (Generic) */}
      {configStatus === 'CONNECTION_ERROR' && (
        <div className="absolute top-0 left-0 w-full bg-red-900/90 text-white p-3 text-center text-sm font-bold z-[100] shadow-xl flex items-center justify-center gap-2 animate-[fadeIn_0.5s_ease-out] backdrop-blur-md">
            <WifiOff className="w-5 h-5" />
            <span>CONNECTION ERROR: {configMessage}</span>
        </div>
      )}

      {/* 4. MISSING KEY SCREEN */}
      {configStatus === 'MISSING_KEY' && (
        <div className="absolute top-0 left-0 w-full bg-amber-900/90 text-white p-3 text-center text-sm font-bold z-[100] shadow-xl flex items-center justify-center gap-2 animate-[fadeIn_0.5s_ease-out] backdrop-blur-md">
            <AlertTriangle className="w-5 h-5" />
            <span>MISSING: VITE_GEMINI_API_KEY is not set in environment variables.</span>
        </div>
      )}
      
      {/* 5. SYNC PROGRESS INDICATOR */}
      {syncStatus.active && (
         <div className="absolute bottom-16 right-6 z-40 bg-slate-900/95 border border-indigo-500/30 p-4 rounded-xl shadow-2xl backdrop-blur-md w-72 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-400">
                    <Globe className="w-4 h-4 animate-pulse" />
                    <span className="font-bold text-xs tracking-wider uppercase">Global Data Sync</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
                <div 
                    className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                <span className="truncate">Processing: {syncStatus.current}</span>
            </div>
         </div>
      )}
      
      {/* QUOTA WARNING INDICATOR */}
      {quotaExceeded && (
         <div className="absolute bottom-16 right-6 z-40 bg-red-900/90 border border-red-500/50 p-3 rounded-xl shadow-2xl backdrop-blur-md animate-slide-up flex items-center gap-3">
             <Ban className="w-5 h-5 text-red-200" />
             <div className="text-xs text-red-100">
                 <div className="font-bold">QUOTA LIMIT REACHED</div>
                 <div className="opacity-80">Background sync disabled.</div>
             </div>
         </div>
      )}

      {/* MAP LAYER CONTROLS (COLLAPSIBLE) */}
      <div 
        ref={layersMenuRef}
        className="absolute bottom-6 left-6 z-40 flex flex-col gap-2"
      >
          {isLayersMenuOpen ? (
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-2 shadow-xl flex flex-col gap-1 w-48 animate-[fadeIn_0.2s_ease-out]">
                  <div 
                    onClick={() => setIsLayersMenuOpen(false)}
                    className="flex items-center justify-between p-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-800 mb-1 cursor-pointer hover:text-slate-300"
                  >
                      <div className="flex items-center gap-2">
                         <Layers className="w-3 h-3" />
                         Layers
                      </div>
                      <ChevronDown className="w-3 h-3" />
                  </div>
                  {(['NONE', 'NUCLEAR', 'SPACE', 'NATO', 'BRICS', 'AI_HUBS', 'OPEC', 'CONFLICT'] as OverlayType[]).map((type) => (
                      <button
                          key={type}
                          onClick={() => {
                              setActiveOverlay(type);
                              setIsLayersMenuOpen(false);
                          }}
                          className={clsx(
                              "px-3 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-between group",
                              activeOverlay === type
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                                  : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          )}
                          title={STATIC_OVERLAYS[type].description}
                      >
                          <div className="flex items-center gap-2">
                              {getOverlayIcon(type)}
                              <span>{STATIC_OVERLAYS[type].label}</span>
                          </div>
                          
                          {type === 'CONFLICT' && activeOverlay === 'CONFLICT' && (
                              <div 
                                onClick={handleRefreshConflicts}
                                className={clsx("p-1 rounded hover:bg-white/20 transition-colors", isConflictLoading && "animate-spin")}
                                title="Scan for latest conflicts"
                              >
                                  <RefreshCw className="w-3 h-3 text-white" />
                              </div>
                          )}
                          
                          {activeOverlay === type && type !== 'CONFLICT' && (
                             <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          )}
                      </button>
                  ))}
              </div>
          ) : (
              <button
                  onClick={() => setIsLayersMenuOpen(true)}
                  className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full p-3 shadow-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 group relative"
                  title="Map Layers"
              >
                  <Layers className="w-5 h-5" />
                  {activeOverlay !== 'NONE' && (
                      <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                      </span>
                  )}
              </button>
          )}
      </div>
      
      {/* MAP ERROR OVERLAY */}
      {mapError && (!geoData || geoData.features.length === 0) && (
         <div className="absolute inset-0 z-50 flex items-center justify-center text-red-400 bg-slate-950 pointer-events-none">
             <div className="text-center bg-slate-900/90 p-6 rounded-xl border border-red-900 shadow-2xl pointer-events-auto">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Map Data Unavailable</h2>
                <p className="mt-2 text-sm opacity-80">{mapError}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors"
                >
                    Retry Connection
                </button>
             </div>
         </div>
      )}

      {/* EASTER EGG MODAL */}
      {showEasterEgg && (
         <div className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-6 font-mono animate-[fadeIn_0.5s_ease-out]" onClick={() => setShowEasterEgg(false)}>
             <div className="max-w-xl w-full border border-green-500/50 p-8 rounded-lg shadow-[0_0_30px_rgba(34,197,94,0.1)] relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowEasterEgg(false)} className="absolute top-4 right-4 text-green-700 hover:text-green-500"><X /></button>
                
                <div className="flex items-center gap-3 mb-6 border-b border-green-900/50 pb-4">
                    <Terminal className="w-6 h-6 text-green-500" />
                    <h2 className="text-xl text-green-500 font-bold tracking-widest">CONFIDENTIAL_LOG_404</h2>
                </div>
                
                <ul className="space-y-6 text-green-400/90 text-sm leading-relaxed list-none">
                    <li className="flex items-start gap-4">
                        <Coffee className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                        <span>A group of engineers doing random stuff hoping to change the world one day 🌍. (Mostly just turning caffeine into code ☕).</span>
                    </li>
                    <li className="flex items-start gap-4">
                        <MapIcon className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                        <span>This map is not correct 🗺️. Not because we intentionally did it, but because it's the only one we got that didn't crash the browser. Mercator is a lie anyway 🤥.</span>
                    </li>
                    <li className="flex items-start gap-4">
                        <HeartHandshake className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                        <span>We realised something: the world is getting bad day by day 📉. Maybe you can be kind to someone today as well. It costs less than an API call ❤️.</span>
                    </li>
                </ul>

                <div className="mt-8 pt-6 border-t border-green-900/50 text-[10px] text-green-700 text-center uppercase tracking-[0.2em]">
                    System Status: Duct Tape Holding Steady
                </div>
             </div>
         </div>
      )}

      {/* GLOBAL SUMMARY MODAL (NEW) */}
      {showGlobalSummary && (
          <GlobalSummary 
            onClose={() => setShowGlobalSummary(false)}
            geoData={geoData}
          />
      )}

      {/* ABOUT / INFO MODAL */}
      {showAbout && (
        <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                
                <div className="p-8">
                    <button 
                        onClick={() => setShowAbout(false)}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-indigo-950/50 rounded-xl border border-indigo-500/30">
                             <Radar className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">About Geo-Pulse</h2>
                            <p className="text-slate-400 text-sm font-mono">v1.5.0 • Holographic Edition</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                        <p>
                            <strong className="text-indigo-400">Geo-Pulse</strong> is a real-time visualization tool that transforms raw geopolitical news into a living, interactive heatmap.
                        </p>
                        <p>
                            Powered by <strong className="text-white">Google Gemini 3 Flash</strong>, the application analyzes live headlines, socio-political events, and regional stability to generate an AI Confidence Score for every country on Earth.
                        </p>
                        
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 mt-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-emerald-200">Positive Sentiment (Stability/Growth)</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span className="text-red-200">Negative Sentiment (Conflict/Unrest)</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                <span className="text-sky-200">Neutral/Mixed Outlook</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
                        <span>Data sourced via Google Search Grounding</span>
                        <span>© 2026 Team Inevitables</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- COMPONENTS --- */}
      
      {/* 1. Header */}
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
            activeOverlay={activeOverlay}
            customOverlayCountries={activeOverlay === 'CONFLICT' ? conflictCountryNames : undefined}
            conflictZones={activeOverlay === 'CONFLICT' ? conflictZones : undefined}
        />
      </main>

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel}
        countryName={selectedCountry}
        data={sentimentData}
        isLoading={isLoading}
        error={panelError}
        warning={panelWarning}
      />
      
      <Footer 
        onSecretTest={handleSecretTest} 
        onOpenAbout={() => setShowAbout(true)} 
        onOpenEasterEgg={() => setShowEasterEgg(true)}
        onOpenGlobalSummary={() => setShowGlobalSummary(true)}
        isAutoPilot={isAutoPilot}
        onToggleAutoPilot={toggleAutoPilot}
      />
    </div>
  );
}

export default App;
