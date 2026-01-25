
import React, { useState, useRef, useEffect } from 'react';
import { Search, Command, X } from 'lucide-react';
import clsx from 'clsx';

interface HeaderProps {
    countries: string[];
    onCountrySelect: (country: string) => void;
    isPanelOpen: boolean;
}

// Custom Animated Gyroscope Component
const GyroscopeIcon = () => {
  return (
    <div className="relative w-9 h-9 flex items-center justify-center overflow-hidden">
      {/* Outer Ring */}
      <div className="absolute w-full h-full rounded-full border border-indigo-500/30 border-t-indigo-400 animate-[spin_3s_linear_infinite] shadow-[0_0_15px_rgba(99,102,241,0.2)]" />
      
      {/* Middle Ring */}
      <div className="absolute w-[75%] h-[75%] rounded-full border border-indigo-500/40 border-r-indigo-300 animate-[spin_2s_linear_infinite_reverse]" />
      
      {/* Inner Ring */}
      <div className="absolute w-[50%] h-[50%] rounded-full border border-indigo-500/50 border-b-indigo-200 animate-[spin_1s_linear_infinite]" />
      
      {/* Core */}
      <div className="absolute w-2 h-2 bg-indigo-100 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
    </div>
  );
};

const Header: React.FC<HeaderProps> = ({ countries, onCountrySelect, isPanelOpen }) => {
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
    setSearchTerm(country); 
    setIsFocused(false);
    onCountrySelect(country);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (suggestions.length > 0) {
            handleSelect(suggestions[0]);
        }
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setIsFocused(true);
  };

  return (
    <div className={clsx(
        "absolute top-0 left-0 w-full p-4 md:p-6 pointer-events-none z-50 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 ease-in-out",
        // Shift content left on desktop when sidebar is open to prevent overlap
        isPanelOpen ? "md:pr-[470px]" : ""
    )}>
      
      {/* LEFT: Logo Section */}
      <div className="pointer-events-auto flex items-center gap-3 flex-shrink-0">
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex-shrink-0 group hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-4">
                <div className="relative p-1.5 bg-indigo-950/30 rounded-lg text-indigo-400 overflow-hidden border border-indigo-500/20 group-hover:border-indigo-400/40 transition-colors">
                    <GyroscopeIcon />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-tighter text-slate-100 font-sans">
                        Geo-Pulse
                    </h1>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider group-hover:text-indigo-400 transition-colors lowercase">
                        a living map of global events
                    </p>
                </div>
            </div>
          </div>
      </div>

      {/* MIDDLE: Search Bar Section */}
      <div 
        ref={dropdownRef}
        className="pointer-events-auto relative w-full md:w-[400px] transition-all duration-300"
      >
        <div className={clsx(
            "flex items-center bg-slate-950/90 backdrop-blur-md border rounded-xl p-2.5 shadow-2xl transition-all duration-300",
            isFocused ? "border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]" : "border-slate-800 hover:border-slate-700"
        )}>
            <Search className={clsx("w-4 h-4 ml-2 mr-3 transition-colors", isFocused ? "text-indigo-400" : "text-slate-600")} />
            <input 
                type="text"
                placeholder="Search country..."
                className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-600 text-sm w-full font-mono tracking-tight"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
            />
            {searchTerm ? (
                <button 
                    onClick={handleClear}
                    className="p-1 hover:bg-slate-800 rounded-md transition-colors mr-1"
                >
                    <X className="w-3 h-3 text-slate-400" />
                </button>
            ) : (
                <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-500 font-bold border border-slate-800 bg-slate-900/50 rounded-md px-2 py-1 mr-1">
                    <Command className="w-3 h-3" />
                    <span className="font-mono">K</span>
                </div>
            )}
        </div>

        {/* Autocomplete Dropdown */}
        {isFocused && suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.1s_ease-out] backdrop-blur-xl">
                {suggestions.map((country) => (
                    <button
                        key={country}
                        onClick={() => handleSelect(country)}
                        className="w-full text-left px-4 py-3 text-sm text-slate-400 hover:bg-indigo-950/30 hover:text-indigo-300 transition-colors border-b border-slate-900 last:border-0 flex justify-between group font-mono"
                    >
                        <span>{country}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-indigo-400 text-[10px] transform translate-x-2 group-hover:translate-x-0 transition-all">
                            INITIALIZE
                        </span>
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* RIGHT: Legend - HIDDEN when SidePanel is open to prevent visual clutter/overlap */}
      <div className={clsx(
          "hidden md:block pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl transition-all duration-300 flex-shrink-0",
          isPanelOpen ? "opacity-0 pointer-events-none translate-x-10" : "opacity-100 translate-x-0"
      )}>
        <div className="flex items-center gap-5 text-[10px] font-bold tracking-widest uppercase text-slate-400">
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                <span>CRITICAL</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]"></span>
                <span>NEUTRAL</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                <span>OPTIMAL</span>
            </div>
        </div>
      </div>
      
    </div>
  );
};

export default Header;
