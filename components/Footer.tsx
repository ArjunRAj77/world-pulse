
import React, { useState } from 'react';
import { Heart, Zap, Info, PieChart, HelpCircle } from 'lucide-react';

interface FooterProps {
    onSecretTest: () => void;
    onOpenAbout: () => void;
    onOpenEasterEgg: () => void;
    onOpenGlobalSummary: () => void;
}

const Footer: React.FC<FooterProps> = ({ onSecretTest, onOpenAbout, onOpenEasterEgg, onOpenGlobalSummary }) => {
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
        <div className="absolute bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur border-t border-slate-800 text-slate-400 text-xs font-mono p-3 flex justify-center items-center z-30 selection:bg-indigo-500/30">
            
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
