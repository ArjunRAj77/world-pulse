
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { X, PieChart, Activity, Globe, Calendar, CheckCircle2, AlertCircle, HelpCircle, MinusCircle, ArrowUp, ArrowDown, Download, Newspaper, TrendingDown, TrendingUp } from 'lucide-react';
import { getAllCountryData } from '../services/db';
import { CountrySentimentData } from '../types';
import clsx from 'clsx';

interface GlobalSummaryProps {
    onClose: () => void;
    geoData: any;
}

type SortField = 'name' | 'score' | 'updated';
type FilterType = 'ALL' | 'STABLE' | 'UNSTABLE' | 'NEUTRAL';

// --- Region Mapping Helper ---
const REGIONS: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico", "Cuba", "Guatemala", "Haiti", "Dominican Republic", "Honduras", "Nicaragua", "El Salvador", "Costa Rica", "Panama", "Jamaica", "Belize", "Bahamas"],
  "South America": ["Brazil", "Argentina", "Colombia", "Peru", "Chile", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname"],
  "Europe": ["Russia", "Germany", "United Kingdom", "France", "Italy", "Spain", "Ukraine", "Poland", "Romania", "Netherlands", "Belgium", "Czech Republic", "Greece", "Portugal", "Sweden", "Hungary", "Belarus", "Austria", "Serbia", "Switzerland", "Bulgaria", "Denmark", "Finland", "Slovakia", "Norway", "Ireland", "Croatia", "Moldova", "Bosnia and Herzegovina", "Albania", "Lithuania", "North Macedonia", "Slovenia", "Latvia", "Estonia", "Iceland"],
  "Asia": ["China", "India", "Indonesia", "Pakistan", "Bangladesh", "Japan", "Philippines", "Vietnam", "Turkey", "Thailand", "Myanmar", "South Korea", "Afghanistan", "Uzbekistan", "Malaysia", "Nepal", "North Korea", "Taiwan", "Sri Lanka", "Kazakhstan", "Cambodia", "Singapore", "Mongolia"],
  "Middle East": ["Iran", "Egypt", "Saudi Arabia", "Yemen", "Iraq", "Syria", "Jordan", "Israel", "Lebanon", "Palestine", "Oman", "Kuwait", "Qatar", "Bahrain", "United Arab Emirates"],
  "Africa": ["Nigeria", "Ethiopia", "Democratic Republic of the Congo", "Tanzania", "South Africa", "Kenya", "Uganda", "Algeria", "Sudan", "Morocco", "Angola", "Mozambique", "Ghana", "Madagascar", "Cameroon", "Côte d'Ivoire", "Niger", "Burkina Faso", "Mali", "Somalia", "Zimbabwe", "Rwanda", "Tunisia", "Libya"],
  "Oceania": ["Australia", "Papua New Guinea", "New Zealand", "Fiji"]
};

const getRegion = (countryName: string): string => {
    for (const [region, countries] of Object.entries(REGIONS)) {
        if (countries.includes(countryName)) return region;
    }
    return "Other";
};

const GlobalSummary: React.FC<GlobalSummaryProps> = ({ onClose, geoData }) => {
    const [analyzedData, setAnalyzedData] = useState<CountrySentimentData[]>([]);
    const [sortField, setSortField] = useState<SortField>('updated');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [filter, setFilter] = useState<FilterType>('ALL');
    const svgRef = useRef<SVGSVGElement>(null);

    // Load Data
    useEffect(() => {
        const load = async () => {
            const data = await getAllCountryData();
            setAnalyzedData(data);
        };
        load();
    }, []);

    // Compute Stats, Extremes, & Regional Data
    const { stats, extremes, headlines, regionalData } = useMemo(() => {
        const allCountries: string[] = geoData?.features?.map((f: any) => f.properties.name) || [];
        
        let positive = 0;
        let negative = 0;
        let neutral = 0;
        
        const validData = analyzedData.filter(d => d.sentimentScore !== undefined);
        const sortedByScore = [...validData].sort((a, b) => a.sentimentScore - b.sentimentScore);

        // Regional Calculations
        const regionStats: Record<string, { sum: number; count: number }> = {};

        validData.forEach(d => {
            if (d.sentimentScore > 0.05) positive++;
            else if (d.sentimentScore < -0.05) negative++;
            else neutral++;

            // Region Aggregation
            const region = getRegion(d.countryName);
            if (region !== "Other") {
                if (!regionStats[region]) regionStats[region] = { sum: 0, count: 0 };
                regionStats[region].sum += d.sentimentScore;
                regionStats[region].count += 1;
            }
        });

        const regionsFormatted = Object.entries(regionStats)
            .map(([name, val]) => ({
                name,
                avg: val.sum / val.count,
                count: val.count
            }))
            .sort((a, b) => b.avg - a.avg);

        // "Unknown" are countries in GeoJSON that are NOT in DB
        const unknownCount = Math.max(0, allCountries.length - analyzedData.length);

        // Collect all headlines for the ticker
        const allHeadlines = analyzedData.flatMap(d => d.headlines.map(h => ({ ...h, country: d.countryName })));

        return {
            stats: {
                positive,
                negative,
                neutral,
                unknown: unknownCount,
                total: allCountries.length,
                analyzed: analyzedData.length,
                allNames: allCountries.sort()
            },
            extremes: {
                mostStable: sortedByScore.length > 0 ? sortedByScore[sortedByScore.length - 1] : null,
                mostUnstable: sortedByScore.length > 0 ? sortedByScore[0] : null
            },
            headlines: allHeadlines,
            regionalData: regionsFormatted
        };
    }, [analyzedData, geoData]);

    // Derived Data for Table
    const tableData = useMemo(() => {
        let data = stats.allNames.map(name => {
            const countryData = analyzedData.find(d => d.countryName === name);
            return {
                name,
                data: countryData,
                score: countryData?.sentimentScore ?? -999, // -999 for null sorting
                updated: countryData?.lastUpdated ?? 0
            };
        });

        // Filter
        if (filter !== 'ALL') {
            data = data.filter(item => {
                if (!item.data) return false; // Hide "No Data" in specific filters
                if (filter === 'STABLE') return item.data.sentimentScore > 0.05;
                if (filter === 'UNSTABLE') return item.data.sentimentScore < -0.05;
                if (filter === 'NEUTRAL') return item.data.sentimentScore >= -0.05 && item.data.sentimentScore <= 0.05;
                return true;
            });
        }

        // Sort
        return data.sort((a, b) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];

            // Handle string sorting
            if (sortField === 'name') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [stats.allNames, analyzedData, sortField, sortDirection, filter]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Draw Pie Chart
    useEffect(() => {
        if (!svgRef.current || stats.total === 0) return;

        const data = [
            { label: 'Stable', value: stats.positive, color: '#10b981' }, // Emerald
            { label: 'Unstable', value: stats.negative, color: '#ef4444' }, // Red
            { label: 'Neutral', value: stats.neutral, color: '#0ea5e9' }, // Sky
            { label: 'No Data', value: stats.unknown, color: '#334155' }, // Slate 700
        ].filter(d => d.value > 0);

        const width = 180;
        const height = 180;
        const radius = Math.min(width, height) / 2;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        const pie = d3.pie<any>().value(d => d.value).sort(null);
        const arc = d3.arc<any>().innerRadius(radius * 0.65).outerRadius(radius);

        const arcs = g.selectAll('arc')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'arc');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 2)
            .transition()
            .duration(1000)
            .attrTween('d', function(d) {
                const i = d3.interpolate(d.startAngle + 0.1, d.endAngle);
                return function(t) {
                    d.endAngle = i(t);
                    return arc(d) || '';
                }
            });

        // Center Text
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.2em")
            .text(`${Math.round((stats.analyzed / stats.total) * 100)}%`)
            .attr("fill", "#fff")
            .attr("font-size", "22px")
            .attr("font-weight", "bold");
        
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1.2em")
            .text("COVERAGE")
            .attr("fill", "#94a3b8")
            .attr("font-size", "9px")
            .attr("letter-spacing", "0.1em");

    }, [stats]);

    const isToday = (timestamp: number) => {
        const date = new Date(timestamp);
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const formatLastUpdated = (timestamp: number) => {
        if (timestamp === 0) return <span className="text-slate-700 text-xs">—</span>;
        if (isToday(timestamp)) {
            return <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">Today</span>;
        }
        return <span className="text-slate-500 font-mono text-xs">{new Date(timestamp).toLocaleDateString()}</span>;
    };

    const handleDownload = () => {
        const headers = ["Country", "Sentiment Score", "Label", "Last Updated", "Summary"];
        const rows = analyzedData.map(d => [
            d.countryName,
            d.sentimentScore.toFixed(3),
            d.sentimentLabel,
            new Date(d.lastUpdated).toISOString(),
            `"${d.stateSummary.replace(/"/g, '""')}"`
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `geopulse_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-slate-900 w-full max-w-6xl h-[90vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Global Intelligence Summary</h2>
                            <p className="text-slate-400 text-xs font-mono">CONFIDENTIAL_REPORT_V1 // {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleDownload}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                        >
                            <Download className="w-3 h-3" />
                            EXPORT CSV
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* LEFT COLUMN: Metrics (4 Cols) */}
                        <div className="lg:col-span-4 space-y-6">
                            
                            {/* Distribution Card */}
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-red-500 opacity-50"></div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 w-full text-left flex items-center gap-2">
                                    <PieChart className="w-3 h-3" /> Stability Index
                                </h3>
                                <svg ref={svgRef} width="180" height="180"></svg>
                                
                                <div className="grid grid-cols-2 gap-3 w-full mt-6">
                                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Stable ({stats.positive})
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Critical ({stats.negative})
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                        <div className="w-2 h-2 rounded-full bg-sky-500"></div> Neutral ({stats.neutral})
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                        <div className="w-2 h-2 rounded-full bg-slate-700"></div> No Data ({stats.unknown})
                                    </div>
                                </div>
                            </div>

                            {/* REGIONAL ANALYSIS CARD (NEW) */}
                            {regionalData.length > 0 && (
                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Globe className="w-3 h-3" /> Regional Stability
                                    </h3>
                                    <div className="space-y-3">
                                        {regionalData.map(r => (
                                            <div key={r.name}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-300 font-semibold">{r.name}</span>
                                                    <span className={clsx("font-mono font-bold", r.avg > 0 ? "text-emerald-400" : r.avg < 0 ? "text-red-400" : "text-sky-400")}>
                                                        {r.avg > 0 ? '+' : ''}{r.avg.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden border border-slate-600/30">
                                                    <div 
                                                        className={clsx("h-full transition-all duration-500", r.avg > 0.05 ? "bg-emerald-500" : r.avg < -0.05 ? "bg-red-500" : "bg-sky-500")}
                                                        style={{ width: `${Math.min(100, Math.max(5, ((r.avg + 1) / 2) * 100))}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 text-right">
                                                    {r.count} reports
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Extremes Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Most Unstable */}
                                <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl">
                                    <div className="flex items-center gap-2 text-red-400 mb-2">
                                        <TrendingDown className="w-4 h-4" />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">Most Critical</span>
                                    </div>
                                    {extremes.mostUnstable ? (
                                        <>
                                            <div className="text-lg font-bold text-white truncate">{extremes.mostUnstable.countryName}</div>
                                            <div className="text-xs text-red-300/60 font-mono mt-1">
                                                Score: {extremes.mostUnstable.sentimentScore.toFixed(2)}
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-xs text-slate-500 italic">No Data</span>
                                    )}
                                </div>

                                {/* Most Stable */}
                                <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl">
                                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">Most Stable</span>
                                    </div>
                                    {extremes.mostStable ? (
                                        <>
                                            <div className="text-lg font-bold text-white truncate">{extremes.mostStable.countryName}</div>
                                            <div className="text-xs text-emerald-300/60 font-mono mt-1">
                                                Score: +{extremes.mostStable.sentimentScore.toFixed(2)}
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-xs text-slate-500 italic">No Data</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Data Table (8 Cols) */}
                        <div className="lg:col-span-8 bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden flex flex-col max-h-[600px]">
                            
                            {/* Toolbar */}
                            <div className="p-3 border-b border-slate-700 bg-slate-800/80 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-300 uppercase tracking-wider">
                                    <Activity className="w-4 h-4 text-indigo-400" />
                                    <span>Registry</span>
                                    <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 rounded-full">{analyzedData.length}</span>
                                </div>
                                
                                <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
                                    {(['ALL', 'STABLE', 'UNSTABLE', 'NEUTRAL'] as FilterType[]).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={clsx(
                                                "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                                                filter === f 
                                                    ? "bg-indigo-500 text-white shadow-sm" 
                                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                            )}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-900/90 sticky top-0 z-10 text-xs text-slate-500 font-mono uppercase backdrop-blur-md">
                                        <tr>
                                            <th 
                                                className="p-4 font-medium cursor-pointer hover:text-indigo-400 transition-colors select-none"
                                                onClick={() => handleSort('name')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Region {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th 
                                                className="p-4 font-medium cursor-pointer hover:text-indigo-400 transition-colors select-none"
                                                onClick={() => handleSort('score')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Outlook {sortField === 'score' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th 
                                                className="p-4 font-medium text-right cursor-pointer hover:text-indigo-400 transition-colors select-none"
                                                onClick={() => handleSort('updated')}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    Freshness {sortField === 'updated' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-slate-800/50">
                                        {tableData.map((item) => (
                                            <tr key={item.name} className="hover:bg-indigo-500/5 transition-colors group">
                                                <td className="p-4 font-medium text-slate-300 group-hover:text-white border-r border-slate-800/30">
                                                    {item.name}
                                                </td>
                                                <td className="p-4 border-r border-slate-800/30">
                                                    {item.data ? (
                                                        <div className="flex items-center gap-2">
                                                            {item.data.sentimentScore > 0.05 ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                    <CheckCircle2 className="w-3 h-3" /> Stable
                                                                </span>
                                                            ) : item.data.sentimentScore < -0.05 ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                                                    <AlertCircle className="w-3 h-3" /> Unstable
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-500 border border-sky-500/20">
                                                                    <MinusCircle className="w-3 h-3" /> Neutral
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {item.data.sentimentScore.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800/50 text-slate-500 border border-slate-700/50">
                                                            <HelpCircle className="w-3 h-3" /> No Data
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {item.data ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            {formatLastUpdated(item.data.lastUpdated)}
                                                            <Calendar className="w-3 h-3 text-slate-600" />
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-700 text-xs">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / News Ticker */}
                <div className="bg-slate-950 border-t border-slate-800 h-10 flex items-center overflow-hidden relative">
                    <div className="bg-indigo-600 h-full px-3 flex items-center justify-center z-20 shadow-lg">
                        <Newspaper className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 overflow-hidden relative flex items-center">
                        <div className="whitespace-nowrap animate-ticker flex items-center gap-8 pl-4">
                            {headlines.length > 0 ? (
                                [...headlines, ...headlines].map((h, i) => (
                                    <span key={i} className="text-xs text-slate-400 font-mono flex items-center gap-2">
                                        <span className="text-indigo-400 font-bold uppercase">{h.country}:</span> 
                                        {h.title}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-slate-600 font-mono italic">
                                    Initializing global news feed... Waiting for regional analysis data...
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes ticker {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .animate-ticker {
                        animation: ticker 2400s linear infinite;
                    }
                    .animate-ticker:hover {
                        animation-play-state: paused;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default GlobalSummary;
