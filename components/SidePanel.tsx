import React from 'react';
import { X, TrendingUp, TrendingDown, Minus, Newspaper, Activity, Clock } from 'lucide-react';
import { CountrySentimentData, SentimentType } from '../types';
import clsx from 'clsx';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: CountrySentimentData | null;
  isLoading: boolean;
  countryName: string | null;
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, data, isLoading, countryName }) => {
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
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-32 bg-slate-700/50 rounded-lg"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-slate-700/30 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : data ? (
          <>
            {/* Status Card */}
            <div className={clsx("p-5 rounded-xl border", getSentimentColor(data.sentimentLabel))}>
              <div className="flex items-center gap-3 mb-3">
                {getSentimentIcon(data.sentimentLabel)}
                <span className="font-bold text-lg tracking-wide uppercase">
                  {data.sentimentLabel} Outlook
                </span>
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
                    <span>Last 24h</span>
                </div>
              </div>
            </div>

            {/* Headlines Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-sky-400" />
                Latest Headlines (24h)
              </h3>
              
              <div className="space-y-4">
                {data.headlines.map((news, idx) => (
                  <div key={idx} className="bg-slate-800/50 hover:bg-slate-800 transition-colors p-4 rounded-lg border border-slate-700/50 group">
                    <div className="flex justify-between items-start gap-4">
                        <h4 className="text-slate-100 font-medium leading-snug group-hover:text-sky-300 transition-colors">
                            {news.title}
                        </h4>
                        <span className={clsx(
                            "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider min-w-fit",
                            news.category === 'GOOD' ? 'bg-emerald-900/50 text-emerald-400' :
                            news.category === 'BAD' ? 'bg-red-900/50 text-red-400' :
                            'bg-slate-700 text-slate-400'
                        )}>
                            {news.category}
                        </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-2 font-light leading-relaxed">
                      {news.snippet}
                    </p>
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
    </div>
  );
};

export default SidePanel;