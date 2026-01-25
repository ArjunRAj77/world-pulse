
import React, { useState } from 'react';
import { Heart, Info, PieChart, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

interface FooterProps {
    onSecretTest: () => void;
    onOpenAbout: () => void;
    onOpenEasterEgg: () => void;
    onOpenGlobalSummary: () => void;
    isAutoPilot: boolean;
    onToggleAutoPilot: () => void;
}

const Footer: React.FC<FooterProps> = ({ 
    onSecretTest, 
    onOpenAbout, 
    onOpenEasterEgg, 
    onOpenGlobalSummary,
    isAutoPilot,
    onToggleAutoPilot
}) => {
    const [clickCount, setClickCount] = useState(0);

    const handleSecretClick = () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);
        
        // Easter Egg Trigger (Double Click)
        if (newCount === 2) {
            onOpenEasterEgg();
        }

        // Global Summary Dashboard (5 Clicks)
        if (newCount === 5) {
            onOpenGlobalSummary();
        }

        // Dev Mode Trigger (7 clicks now)
        if (newCount >= 7) {
            onSecretTest();
            setClickCount(0);
        }

        // Reset if no clicks for 2 seconds
        setTimeout(() => setClickCount(0), 2000);
    };

    return (
        <div className="absolute bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur border-t border-slate-800 text-slate-400 text-xs font-mono p-3 flex justify-center items-center z-30 selection:bg-indigo-500/30">
            
            {/* Dev Mode Indicator (Moved to Left) */}
            {clickCount > 2 && clickCount < 7 && (
                <div className="absolute left-4 text-[10px] opacity-50 flex items-center gap-1">
                    <PieChart className="w-3 h-3 text-indigo-400" />
                    <span>Accessing Data... {clickCount}/5</span>
                </div>
            )}

            {/* Main Footer Text */}
            <div 
                onClick={handleSecretClick}
                className="flex items-center gap-2 cursor-pointer hover:text-indigo-400 transition-colors select-none group relative"
                title={clickCount > 0 ? "Keep clicking..." : undefined}
            >
                <span>Vibe coded by</span>
                <span className="font-bold text-slate-200 group-hover:text-white transition-colors">Team Inevitables</span>
                <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
                
                {/* Hint Icon & Tooltip */}
                <div className="relative group/hint ml-1">
                    <HelpCircle className="w-3 h-3 text-slate-600 hover:text-indigo-400 transition-colors" />
                    
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max opacity-0 group-hover/hint:opacity-100 transition-opacity bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded shadow-xl border border-slate-700 pointer-events-none">
                        Double-tap for Team • 5x for Dashboard
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700"></div>
                    </div>
                </div>
            </div>

            {/* Auto Pilot Slider Toggle */}
            <div className="relative group/autopilot ml-6 flex items-center">
                <div 
                    onClick={onToggleAutoPilot}
                    className="flex items-center gap-3 cursor-pointer group select-none"
                    role="button"
                    tabIndex={0}
                >
                    <span className={clsx(
                        "text-[10px] font-bold tracking-widest transition-colors duration-300",
                        isAutoPilot ? "text-indigo-400 shadow-indigo-500/50 drop-shadow-sm" : "text-slate-500 group-hover:text-slate-400"
                    )}>
                        AUTO PILOT
                    </span>
                    
                    {/* Toggle Track */}
                    <div className={clsx(
                        "w-9 h-5 rounded-full border transition-all duration-300 relative flex items-center",
                        isAutoPilot 
                            ? "bg-indigo-500/20 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]" 
                            : "bg-slate-800 border-slate-600 group-hover:border-slate-500"
                    )}>
                        {/* Toggle Thumb */}
                        <div className={clsx(
                            "w-3 h-3 rounded-full shadow-sm transition-all duration-300 absolute ease-out-back",
                            isAutoPilot 
                                ? "bg-indigo-400 left-[20px] shadow-[0_0_8px_rgba(99,102,241,0.8)]" 
                                : "bg-slate-400 left-[3px]"
                        )} />
                    </div>
                </div>

                {/* Info Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[200px] opacity-0 group-hover/autopilot:opacity-100 transition-opacity duration-200 bg-slate-900 text-slate-300 text-[10px] px-3 py-2 rounded-lg shadow-xl border border-slate-700 pointer-events-none text-center z-50 leading-tight backdrop-blur-md">
                    <span className="font-bold text-indigo-400 block mb-1">Presentation Mode</span>
                    Automatically cycles through cached regions.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700"></div>
                </div>
            </div>

            {/* Info Button (Added to Right) */}
            <button 
                onClick={onOpenAbout}
                className="absolute right-4 p-2 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-full transition-all"
                title="About Geo-Pulse"
            >
                <Info className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Footer;
