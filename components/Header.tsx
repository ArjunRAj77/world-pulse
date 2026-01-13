import React, { useState, useRef, useEffect } from 'react';
import { Radar, Search, Command } from 'lucide-react';
import clsx from 'clsx';

interface HeaderProps {
    countries: string[];
    onCountrySelect: (country: string) => void;
}

const Header: React.FC<HeaderProps> = ({ countries, onCountrySelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
        setSuggestions([]);
        return;
    }
    const filtered = countries.filter(c => 
        c.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
    setSuggestions(filtered);
  }, [searchTerm, countries]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsFocused(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country: string) => {
    setSearchTerm(''); // Clear after selection or keep it? Clearing is cleaner.
    setIsFocused(false);
    onCountrySelect(country);
  };

  return (
    <div className="absolute top-0 left-0 w-full p-4 md:p-6 pointer-events-none z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
      
      {/* Logo Section */}
      <div className="pointer-events-auto bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-xl flex-shrink-0 group">
        <div className="flex items-center gap-3">
            <div className="relative p-2 bg-indigo-500/10 rounded-lg text-indigo-400 overflow-hidden border border-indigo-500/20 group-hover:border-indigo-400/50 transition-colors">
                <div className="absolute inset-0 bg-indigo-500/20 blur-md group-hover:bg-indigo-400/20 transition-all duration-500"></div>
                <Radar className="w-8 h-8 animate-[spin_3s_linear_infinite] relative z-10" />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                    WorldPulse
                </h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest group-hover:text-indigo-300 transition-colors uppercase">
                    Global Sentiment
                </p>
            </div>
        </div>
      </div>

      {/* Search Bar Section */}
      <div 
        ref={dropdownRef}
        className="pointer-events-auto relative w-full md:w-96 transition-all duration-300"
      >
        <div className={clsx(
            "flex items-center bg-[#0f172a]/80 backdrop-blur-md border rounded-xl p-3 shadow-xl transition-colors",
            isFocused ? "border-indigo-500 ring-1 ring-indigo-500/50" : "border-slate-700/50"
        )}>
            <Search className={clsx("w-5 h-5 mr-3 transition-colors", isFocused ? "text-indigo-400" : "text-slate-500")} />
            <input 
                type="text"
                placeholder="Search country..."
                className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 text-sm w-full font-mono"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
            />
            {!isFocused && !searchTerm && (
                <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-600 border border-slate-700/50 rounded px-1.5 py-0.5">
                    <Command className="w-3 h-3" />
                    <span>K</span>
                </div>
            )}
        </div>

        {/* Autocomplete Dropdown */}
        {isFocused && suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#1e293b] border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.1s_ease-out]">
                {suggestions.map((country) => (
                    <button
                        key={country}
                        onClick={() => handleSelect(country)}
                        className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-indigo-500/20 hover:text-white transition-colors border-b border-slate-800/50 last:border-0 flex justify-between group"
                    >
                        <span>{country}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-indigo-400 text-xs transform translate-x-2 group-hover:translate-x-0 transition-all font-mono">
                            VIEW →
                        </span>
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* Legend */}
      <div className="hidden md:block pointer-events-auto bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-3 shadow-xl">
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                <span>CRITICAL</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-600"></span>
                <span>STABLE</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                <span>OPTIMAL</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Header;