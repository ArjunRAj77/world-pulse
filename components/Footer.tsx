
import React, { useState } from 'react';
import { Heart, Zap, Info } from 'lucide-react';

interface FooterProps {
    onSecretTest: () => void;
    onOpenAbout: () => void;
}

const Footer: React.FC<FooterProps> = ({ onSecretTest, onOpenAbout }) => {
    const [clickCount, setClickCount] = useState(0);

    const handleSecretClick = () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);
        
        if (newCount >= 5) {
            onSecretTest();
            setClickCount(0);
        }

        // Reset if no clicks for 2 seconds
        setTimeout(() => setClickCount(0), 2000);
    };

    return (
        <div className="absolute bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur border-t border-slate-800 text-slate-400 text-xs font-mono p-3 flex justify-center items-center z-30 selection:bg-indigo-500/30">
            
            {/* Dev Mode Indicator (Moved to Left) */}
            {clickCount > 0 && clickCount < 5 && (
                <div className="absolute left-4 text-[10px] opacity-50 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Dev Mode: {clickCount}/5</span>
                </div>
            )}

            {/* Main Footer Text */}
            <div 
                onClick={handleSecretClick}
                className="flex items-center gap-2 cursor-pointer hover:text-indigo-400 transition-colors select-none group"
                title={clickCount > 0 ? `${5 - clickCount} more...` : undefined}
            >
                <span>Vibe coded by</span>
                <span className="font-bold text-slate-200 group-hover:text-white transition-colors">Team Inevitables</span>
                <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
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
