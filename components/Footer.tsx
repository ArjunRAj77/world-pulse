import React from 'react';
import { RefreshCw, CheckCircle2, Database } from 'lucide-react';

interface FooterProps {
    lastUpdated: number | null;
    totalItems: number;
    loadedItems: number;
}

const Footer: React.FC<FooterProps> = ({ lastUpdated, totalItems, loadedItems }) => {
    // If we have more loaded than total (e.g. user clicked extra countries), cap the progress visual at 100%
    const progress = Math.min(100, (loadedItems / totalItems) * 100);
    const isComplete = loadedItems >= totalItems;
    
    return (
        <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur border-t border-slate-200 text-slate-500 text-xs font-mono p-2 px-6 flex flex-col md:flex-row justify-between items-center z-30 gap-2 md:gap-0">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 min-w-fit">
                    {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                    )}
                    <span className="uppercase tracking-wider font-bold text-slate-700">
                        {isComplete ? "Global Uplink Established" : `Synchronizing Feeds (${loadedItems}/${totalItems})`}
                    </span>
                </div>
                
                {/* Progress Bar */}
                <div className="flex-1 md:w-32 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {lastUpdated && (
                    <div className="opacity-75 flex items-center gap-2">
                        <Database className="w-3 h-3" />
                        <span>LAST UPDATE: <span className="text-slate-800">{new Date(lastUpdated).toLocaleTimeString()}</span></span>
                    </div>
                )}
                <div className="text-[10px] opacity-50 hidden md:block border-l border-slate-300 pl-4 text-slate-400">
                    SECURE CONNECTION // GEMINI-3-FLASH
                </div>
            </div>
        </div>
    );
};

export default Footer;