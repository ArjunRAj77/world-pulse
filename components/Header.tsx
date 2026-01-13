import React from 'react';
import { Globe2, Info } from 'lucide-react';

const Header = () => {
  return (
    <div className="absolute top-0 left-0 w-full p-6 pointer-events-none z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
      <div className="pointer-events-auto bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-xl mb-4 md:mb-0">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Globe2 className="w-8 h-8 animate-[spin_10s_linear_infinite]" />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
                    WorldPulse
                </h1>
                <p className="text-xs text-slate-400 font-mono tracking-wide">
                    REAL-TIME SENTIMENT VISUALIZER
                </p>
            </div>
        </div>
      </div>

      <div className="pointer-events-auto bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-3 shadow-xl">
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                <span>Negative</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-600"></span>
                <span>Neutral</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                <span>Positive</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
