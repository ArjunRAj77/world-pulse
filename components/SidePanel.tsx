import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Newspaper, Activity, Clock, Loader2, Lightbulb, Database, ExternalLink } from 'lucide-react';
import { CountrySentimentData, SentimentType } from '../types';
import clsx from 'clsx';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: CountrySentimentData | null;
  isLoading: boolean;
  countryName: string | null;
}

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
  "Wombat poop is cube-shaped."
];

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, data, isLoading, countryName }) => {
  const [currentFact, setCurrentFact] = useState(FUN_FACTS[0]);

  useEffect(() => {
    if (!isLoading) return;
    
    // Pick a random fact initially
    setCurrentFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
    
    const interval = setInterval(() => {
       // Cycle randomly
       setCurrentFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
    }, 4000); // Slower read time for facts

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isOpen) return null;

  const getSentimentColor = (label?: SentimentType) => {
    switch (label) {
      case SentimentType.POSITIVE: return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case SentimentType.NEGATIVE: return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  const getSentimentIcon = (label?: SentimentType) => {
    switch (label) {
      case SentimentType.POSITIVE: return <TrendingUp className="w-6 h-6" />;
      case SentimentType.NEGATIVE: return <TrendingDown className="w-6 h-6" />;
      default: return <Minus className="w-6 h-6" />;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  const isCached = data ? (Date.now() - data.lastUpdated) > 10000 : false; // If older than 10s, it's from cache

  return (
    <div className={clsx(
      "absolute top-0 right-0 h-full w-full md:w-[450px] z-20 transition-transform duration-300 ease-out transform glass-panel text-white shadow-2xl flex flex-col",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-[#0f172a]/80">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          {countryName || 'Select Country'}
        </h2>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-8 bg-[#0f172a]/50 backdrop-blur-sm">
             <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin relative z-10" />
             </div>
             
             <div className="space-y-4 max-w-sm animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold tracking-widest text-xs uppercase mb-2">
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
        ) : data ? (
          <>
            {/* Status Card */}
            <div className={clsx("p-5 rounded-xl border animate-[fadeIn_0.5s_ease-out]", getSentimentColor(data.sentimentLabel))}>
              <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-3">
                    {getSentimentIcon(data.sentimentLabel)}
                    <span className="font-bold text-lg tracking-wide uppercase">
                    {data.sentimentLabel} Outlook
                    </span>
                 </div>
                 {isCached && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                        <Database className="w-3 h-3" />
                        <span>CACHED</span>
                    </div>
                 )}
              </div>
              <p className="text-sm opacity-90 leading-relaxed font-light">
                {data.stateSummary}
              </p>
              
              {/* Score Indicator */}
              <div className="mt-4 flex items-center justify-between text-xs font-mono uppercase opacity-75">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>Score: {data.sentimentScore.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Updated: {formatDate(data.lastUpdated)}</span>
                </div>
              </div>
            </div>

            {/* Headlines Section */}
            <div className="animate-[fadeIn_0.7s_ease-out]">
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-sky-400" />
                Latest Headlines (24h)
              </h3>
              
              <div className="space-y-4">
                {data.headlines.map((news, idx) => (
                  <div key={idx} className="bg-slate-800/50 hover:bg-slate-800 transition-colors p-4 rounded-lg border border-slate-700/50 group relative">
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <a 
                           href={news.url || '#'} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-slate-100 font-medium leading-snug group-hover:text-sky-300 transition-colors flex gap-2 items-start"
                        >
                            {news.title}
                            {news.url && <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0 mt-1" />}
                        </a>
                        <span className={clsx(
                            "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider min-w-fit",
                            news.category === 'GOOD' ? 'bg-emerald-900/50 text-emerald-400' :
                            news.category === 'BAD' ? 'bg-red-900/50 text-red-400' :
                            'bg-slate-700 text-slate-400'
                        )}>
                            {news.category}
                        </span>
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-3 font-light leading-relaxed">
                      {news.snippet}
                    </p>

                    {/* Source Attribution */}
                    {news.source && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase border-t border-slate-700/50 pt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            SOURCE: <span className="text-slate-300">{news.source}</span>
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
      <div className="p-4 border-t border-slate-700/50 text-center text-xs text-slate-500 font-mono">
        POWERED BY GEMINI 3 FLASH & GOOGLE SEARCH
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