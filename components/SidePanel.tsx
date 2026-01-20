
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Newspaper, Activity, Clock, Loader2, Lightbulb, Database, ExternalLink, Ban, History, ChevronDown, ChevronUp, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { CountrySentimentData, SentimentType, HistoricalPoint, PredictionType } from '../types';
import { getCountryHistory } from '../services/db';
import TrendChart from './TrendChart';
import clsx from 'clsx';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: CountrySentimentData | null;
  isLoading: boolean;
  countryName: string | null;
  error?: string | null;
  warning?: string | null; // Added warning prop for stale data
}

// Expanded List of Fun Facts
const FUN_FACTS = [
  "France uses 12 different time zones, the most of any country.",
  "Canada has more lakes than the rest of the world combined.",
  "There are more chickens than people on Earth.",
  "Antarctica is technically the world's largest desert.",
  "Bananas are curved because they grow towards the sun.",
  "A day on Venus is longer than a year on Venus.",
  "The entire population of the world could fit inside Los Angeles.",
  "There are more stars in space than grains of sand on every beach.",
  "Octopuses have three hearts and blue blood.",
  "Honey never spoils; archaeologists have found edible honey in ancient Egyptian tombs.",
  "The shortest commercial flight in the world lasts just 57 seconds.",
  "North Korea and Cuba are the only places you can't buy Coca-Cola.",
  "The Sahara Desert used to be a tropical rainforest.",
  "Sharks existed before trees.",
  "Wombat poop is cube-shaped.",
  "Iceland has no mosquitoes.",
  "Australia is wider than the moon.",
  "Russia has a larger surface area than Pluto.",
  "Bangladesh has more people than Russia.",
  "Finland has the most saunas per capita.",
  "There are no rivers in Saudi Arabia.",
  "The Dead Sea is sinking by about 1 meter per year.",
  "Sudan has more pyramids than Egypt.",
  "Istanbul is the only city in the world located on two continents.",
  "Japan consists of over 6,800 islands.",
  "90% of Earth's population lives in the Northern Hemisphere.",
  "California has a larger economy than most countries.",
  "A single cloud can weigh more than a million pounds.",
  "The Amazon rainforest produces 20% of the world's oxygen.",
  "Mount Everest grows about 4 millimeters every year.",
  "The Pacific Ocean shrinks by about 2.5 cm yearly.",
  "The Atlantic Ocean grows by about 2.5 cm yearly.",
  "Cowboys actually didn't wear cowboy hats; they wore bowler hats.",
  "It rains diamonds on Jupiter and Saturn.",
  "Humans share 60% of their DNA with bananas.",
  "A bolt of lightning is five times hotter than the sun.",
  "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion.",
  "New Zealand was the first country to give women the vote.",
  "Mongolia is the least densely populated country in the world.",
  "Bhutan is the only carbon-negative country in the world.",
  "There are more castles in Germany than McDonald's in the US.",
  "San Marino is the oldest republic in the world.",
  "Liechtenstein is the largest producer of false teeth.",
  "Papua New Guinea has over 850 languages spoken.",
  "Bolivia has two capital cities: La Paz and Sucre.",
  "Kiribati is the only country in all four hemispheres.",
  "Nauru is the only country without an official capital.",
  "Suriname is the most forested country in the world (98%)."
];

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, data, isLoading, countryName, error, warning }) => {
  const [currentFact, setCurrentFact] = useState(FUN_FACTS[0]);
  const [history, setHistory] = useState<HistoricalPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Collapse state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isForecastOpen, setIsForecastOpen] = useState(true);

  useEffect(() => {
    if (!isLoading) return;
    setCurrentFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
    const interval = setInterval(() => {
       setCurrentFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Fetch History when data loads
  useEffect(() => {
    if (countryName && data) {
        setLoadingHistory(true);
        // Reset collapse state when viewing a new country
        setIsHistoryOpen(false);
        setIsForecastOpen(true); 
        getCountryHistory(countryName).then(points => {
            setHistory(points);
            setLoadingHistory(false);
        });
    } else {
        setHistory([]);
    }
  }, [countryName, data]);

  const getSentimentColor = (label?: SentimentType) => {
    switch (label) {
      case SentimentType.POSITIVE: return 'text-emerald-400 border-emerald-900 bg-emerald-950/30';
      case SentimentType.NEGATIVE: return 'text-red-400 border-red-900 bg-red-950/30';
      default: return 'text-sky-400 border-sky-900 bg-sky-950/30';
    }
  };

  const getSentimentIcon = (label?: SentimentType) => {
    switch (label) {
      case SentimentType.POSITIVE: return <TrendingUp className="w-6 h-6 text-emerald-400" />;
      case SentimentType.NEGATIVE: return <TrendingDown className="w-6 h-6 text-red-400" />;
      default: return <Minus className="w-6 h-6 text-sky-400" />;
    }
  };

  const getPredictionIcon = (type?: PredictionType) => {
    switch(type) {
        case PredictionType.IMPROVING: return <TrendingUp className="w-4 h-4 text-emerald-400" />;
        case PredictionType.DETERIORATING: return <TrendingDown className="w-4 h-4 text-red-400" />;
        default: return <ArrowRight className="w-4 h-4 text-sky-400" />;
    }
  };

  const getPredictionColor = (type?: PredictionType) => {
      switch(type) {
        case PredictionType.IMPROVING: return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
        case PredictionType.DETERIORATING: return 'text-red-400 border-red-500/30 bg-red-500/10';
        default: return 'text-sky-400 border-sky-500/30 bg-sky-500/10';
    }
  };

  const formatDate = (timestamp: number) => {
    try {
        return new Date(timestamp).toLocaleString(undefined, {
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit',
            timeZoneName: 'short'
        });
    } catch (e) {
        return new Date(timestamp).toLocaleDateString();
    }
  };

  const isCached = data ? (Date.now() - data.lastUpdated) > 10000 : false;

  return (
    <div className={clsx(
      "absolute top-0 right-0 h-full w-full md:w-[450px] transition-transform duration-300 ease-out transform glass-panel text-slate-200 shadow-2xl flex flex-col",
      "z-[60]",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-3">
            {data?.countryCode && !isLoading && (
                <img 
                    src={`https://flagcdn.com/w80/${data.countryCode.toLowerCase()}.png`}
                    alt={`${countryName} flag`}
                    className="w-10 h-auto rounded shadow-sm border border-slate-600"
                />
            )}
            <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            {countryName || 'Select Country'}
            </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-200"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-8 bg-slate-900/40 backdrop-blur-sm">
             <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
             </div>
             
             <div className="space-y-4 max-w-sm animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold tracking-widest text-xs uppercase mb-2">
                    <Lightbulb className="w-4 h-4" />
                    <span>Did you know?</span>
                </div>
                <p className="text-slate-300 text-lg font-medium leading-relaxed italic">
                    "{currentFact}"
                </p>
                <div className="pt-4 text-xs text-slate-500 font-mono">
                    ANALYZING REGIONAL DATA...
                </div>
             </div>
          </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 animate-[fadeIn_0.5s_ease-out]">
                <div className="bg-red-900/20 p-6 rounded-full border border-red-500/20 mb-4">
                    <Ban className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-red-200 mb-2">Unavailable</h3>
                <p className="text-slate-400 max-w-xs leading-relaxed">{error}</p>
                <button onClick={onClose} className="mt-6 text-sm text-indigo-400 hover:text-indigo-300">
                    Close Panel
                </button>
            </div>
        ) : data ? (
          <>
            {/* Warning Banner for Stale/Timeout Fallback */}
            {warning && (
                <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-900/50 p-3 rounded-lg animate-[fadeIn_0.5s_ease-out]">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-200/80">
                        <strong className="block text-amber-400 mb-1">Update Pending</strong>
                        {warning}
                    </div>
                </div>
            )}

            {/* Timestamp Banner */}
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/50 py-2 rounded-lg border border-slate-800">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>LAST UPDATED:</span>
                <span className="text-indigo-300 font-bold">{formatDate(data.lastUpdated)}</span>
            </div>

            {/* Status Card */}
            <div className={clsx("p-5 rounded-xl border animate-[fadeIn_0.5s_ease-out] shadow-sm", getSentimentColor(data.sentimentLabel))}>
              <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-3">
                    {getSentimentIcon(data.sentimentLabel)}
                    <span className="font-bold text-lg tracking-wide uppercase">
                    {data.sentimentLabel} Outlook
                    </span>
                 </div>
                 {isCached && !warning && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700">
                        <Database className="w-3 h-3" />
                        <span>CACHED</span>
                    </div>
                 )}
              </div>
              <p className="text-sm opacity-90 leading-relaxed font-normal text-slate-300">
                {data.stateSummary}
              </p>
              
              <div className="mt-4 flex items-center gap-2 text-xs font-mono uppercase opacity-75 text-slate-400 border-t border-white/10 pt-3">
                  <Activity className="w-4 h-4" />
                  <span>AI Confidence Score: {data.sentimentScore.toFixed(2)}</span>
              </div>
            </div>

            {/* 7-Day Forecast Card (Collapsible) */}
            {data.prediction && (
                <div className={clsx(
                    "relative rounded-xl border animate-[fadeIn_0.6s_ease-out] transition-all duration-300 overflow-hidden",
                    getPredictionColor(data.prediction)
                )}>
                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                        <Sparkles className="w-12 h-12" />
                    </div>
                    
                    <button 
                        onClick={() => setIsForecastOpen(!isForecastOpen)}
                        className="w-full flex items-center justify-between p-4 text-left focus:outline-none hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-2 font-bold text-sm tracking-widest uppercase opacity-90">
                            {getPredictionIcon(data.prediction)}
                            <span>7-Day Forecast: {data.prediction}</span>
                        </div>
                        {isForecastOpen ? 
                            <ChevronUp className="w-4 h-4 opacity-70" /> : 
                            <ChevronDown className="w-4 h-4 opacity-70" />
                        }
                    </button>

                    {isForecastOpen && (
                        <div className="px-4 pb-4 animate-[fadeIn_0.3s_ease-out]">
                            <p className="text-sm opacity-90 relative z-10 leading-relaxed border-t border-white/10 pt-3">
                                {data.predictionRationale || "Analysis suggests current trends will persist."}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* HISTORICAL TIMELINE SECTION (Collapsible) */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden animate-[fadeIn_0.6s_ease-out]">
                 <button 
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                 >
                     <div className="flex items-center gap-2">
                         <History className="w-4 h-4 text-indigo-400" />
                         <h3 className="text-sm font-semibold text-slate-300">
                             Historical Timeline
                         </h3>
                     </div>
                     <div className="flex items-center gap-2">
                         {loadingHistory && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
                         {isHistoryOpen ? 
                            <ChevronUp className="w-4 h-4 text-slate-500" /> : 
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                         }
                     </div>
                 </button>
                 
                 {isHistoryOpen && (
                     <div className="px-4 pb-4 animate-[fadeIn_0.3s_ease-out]">
                         {history.length > 0 || !loadingHistory ? (
                             <TrendChart data={history} currentScore={data.sentimentScore} />
                         ) : (
                             <div className="h-[120px] flex items-center justify-center text-xs text-slate-500 italic">
                                 No historical data available yet.
                             </div>
                         )}
                         <p className="text-[10px] text-slate-500 text-center mt-2 pt-2 border-t border-slate-800/50">
                             Tracks volatility and stability trends over the last 30 days.
                         </p>
                     </div>
                 )}
            </div>

            {/* Headlines Section */}
            <div className="animate-[fadeIn_0.7s_ease-out]">
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-indigo-500" />
                Latest Headlines (24h)
              </h3>
              
              <div className="space-y-4">
                {data.headlines.map((news, idx) => (
                  <div key={idx} className="bg-slate-800/50 hover:bg-slate-800 transition-colors p-4 rounded-lg border border-slate-700 shadow-sm group relative">
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <a 
                           href={news.url || '#'} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-slate-200 font-bold leading-snug group-hover:text-indigo-400 transition-colors flex gap-2 items-start"
                        >
                            {news.title}
                            {news.url && <ExternalLink className="w-3 h-3 opacity-40 flex-shrink-0 mt-1" />}
                        </a>
                        <span className={clsx(
                            "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider min-w-fit",
                            news.category === 'GOOD' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900' :
                            news.category === 'BAD' ? 'bg-red-950/50 text-red-400 border border-red-900' :
                            'bg-sky-950/30 text-sky-400 border border-sky-900/50'
                        )}>
                            {news.category}
                        </span>
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-3 font-normal leading-relaxed">
                      {news.snippet}
                    </p>

                    {news.source && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase border-t border-slate-700/50 pt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            SOURCE: <span className="text-slate-400">{news.source}</span>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500 mt-20">
            <p>Select a region on the map to analyze its pulse.</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 text-center">
        <div className="text-xs text-slate-500 font-mono mb-2">
           POWERED BY GEMINI 3 FLASH & GOOGLE SEARCH
        </div>
        <p className="text-[10px] text-slate-600 leading-tight">
            Disclaimer: Analysis is AI-generated for informational purposes only.
        </p>
      </div>
      
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SidePanel;
