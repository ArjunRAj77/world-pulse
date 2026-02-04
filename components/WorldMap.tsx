import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Home, Sparkles } from 'lucide-react';
import { STATIC_OVERLAYS, OverlayType } from '../services/staticData';
import { ConflictZone } from '../types';

interface WorldMapProps {
  onCountrySelect: (countryName: string) => void;
  selectedCountry: string | null;
  sentimentMap: Record<string, number>; 
  geoData: any;
  activeOverlay: OverlayType;
  customOverlayCountries?: string[]; // Kept for generic lists
  conflictZones?: ConflictZone[]; // New prop for detailed conflict data
}

const WorldMap: React.FC<WorldMapProps> = ({ 
    onCountrySelect, 
    selectedCountry, 
    sentimentMap, 
    geoData, 
    activeOverlay, 
    customOverlayCountries,
    conflictZones
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // D3 Refs
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const projectionRef = useRef<d3.GeoProjection>(d3.geoMercator()); 

  // Use a ref to track dimensions to prevent unnecessary re-renders loop in ResizeObserver
  const dimRef = useRef({ width: 0, height: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (!Array.isArray(entries) || !entries.length) return;
      const entry = entries[0];
      
      requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;
        // Ignore initial 0,0 or minimal changes (sub-pixel jitter) to prevent flicker
        if (width > 0 && height > 0 && 
            (Math.abs(width - dimRef.current.width) > 2 || 
             Math.abs(height - dimRef.current.height) > 2)) {
            
            dimRef.current = { width, height };
            setDimensions({ width, height });
        }
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Helper to determine color based on score
  const getFillColor = (score: number | undefined) => {
      if (score === undefined || score === null || isNaN(score)) return '#1e293b'; // Default Land (Slate 800)
      
      try {
          // Threshold lowered to 0.05 to capture mild positive/negative sentiments
          if (score > 0.05) {
              // Positive: Interpolate to Emerald 500
              return d3.interpolateRgb("#1e293b", "#10b981")(0.3 + (Math.min(1, score) * 0.7)); 
          }
          if (score < -0.05) {
              // Negative: Interpolate to Red 500
              return d3.interpolateRgb("#1e293b", "#ef4444")(0.3 + (Math.min(1, Math.abs(score)) * 0.7));
          }
      } catch (e) {
          return '#1e293b';
      }
      
      // Neutral (-0.05 to 0.05): Sky 500 (Light Blue)
      return '#0ea5e9'; 
  };

  // 2. Initialize and Draw Map
  useEffect(() => {
    if (!geoData || !svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    if (!geoData.features || geoData.features.length === 0) return;

    try {
        const { width, height } = dimensions;
        const svg = d3.select(svgRef.current);
        
        // Remove existing listeners to prevent accumulation (Fixes strict mode / resize issues)
        svg.on('.zoom', null);
        
        // Clear previous contents
        svg.selectAll('*').remove();
        
        // Create Group
        const g = svg.append('g').style('will-change', 'transform');
        gRef.current = g;

        // Filter valid features
        const validFeatures = geoData.features.filter((f: any) => 
            f && f.properties && f.properties.name && f.properties.name !== "Antarctica"
        );
        
        const featuresWithoutAntarctica = {
            type: "FeatureCollection",
            features: validFeatures
        };
        
        if (featuresWithoutAntarctica.features.length === 0) return;

        const projection = d3.geoMercator()
          .fitExtent([[20, 20], [width - 20, height - 20]], featuresWithoutAntarctica as any);
        
        projectionRef.current = projection;

        const pathGenerator = d3.geoPath().projection(projection);
        const graticule = d3.geoGraticule();

        // Zoom Behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([1, 12])
          .translateExtent([[0, 0], [width, height]])
          .on('zoom', (event) => {
             if (!gRef.current) return;
             
             gRef.current.attr('transform', event.transform.toString());
             
             const k = event.transform.k;
             
             // OPTIMIZATION: Removed manual stroke-width updates. 
             // Using vector-effect: non-scaling-stroke in CSS instead.
             // This significantly improves performance during zoom.

             // Scale Icons
             gRef.current.selectAll('.overlay-icon-group')
                .attr('transform', function(d: any) {
                    try {
                        const centroid = pathGenerator.centroid(d);
                        if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return null;
                        const scale = Math.max(0.3, 1 / k); 
                        return `translate(${centroid[0]}, ${centroid[1]}) scale(${scale})`;
                    } catch (e) { return null; }
                });
          });

        zoomRef.current = zoom;
        svg.call(zoom);

        // --- DRAWING ORDER ---

        // 1. Ocean Background
        g.append('rect')
          .attr('x', -width * 2)
          .attr('y', -height * 2)
          .attr('width', width * 5)
          .attr('height', height * 5)
          .attr('fill', '#020617') // Deepest Slate/Black
          .attr('stroke', 'none');

        // 2. Ocean "Wave of Stars" Effect
        // Generate stars that drift across the map like waves
        const starCount = 350;
        const starData = d3.range(starCount).map(() => ({
            x: d3.randomUniform(-width * 2, width * 3)(), 
            y: d3.randomUniform(-height * 2, height * 3)(),
            r: d3.randomUniform(0.3, 1.8)(),
            delay: d3.randomUniform(0, 15)(), // Spread out start times so they don't pulse together
            duration: d3.randomUniform(10, 25)() // Slow movement duration
        }));

        g.append('g')
            .attr('class', 'ocean-stars')
            .selectAll('circle')
            .data(starData)
            .enter()
            .append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.r)
            .attr('fill', '#bae6fd') // Very light blue (Sky 200)
            .style('opacity', 0)
            .style('animation', d => `ocean-wave ${d.duration}s infinite linear ${d.delay}s`);

        // 3. Graticules
        g.append('path')
          .datum(graticule)
          .attr('class', 'graticule')
          .attr('d', pathGenerator as any)
          .attr('fill', 'none')
          .attr('stroke', '#1e293b') // Fainter slate
          .attr('stroke-width', 0.5)
          .attr('vector-effect', 'non-scaling-stroke') // OPTIMIZATION
          .attr('stroke-opacity', 0.4);

        // 4. Countries
        const paths = g.selectAll<SVGPathElement, any>('.country-block')
          .data(featuresWithoutAntarctica.features, (d: any) => d.properties.name);

        paths.enter()
          .append('path')
          .attr('class', 'country-block')
          .attr('fill', '#1e293b') // Initial Default Land
          .attr('stroke', '#334155')
          .attr('stroke-width', 0.5)
          .attr('vector-effect', 'non-scaling-stroke') // OPTIMIZATION
          .style('cursor', 'pointer')
          .attr('d', pathGenerator as any);

        // 5. Overlays Group (Created once)
        g.append('g').attr('class', 'overlay-group').style('pointer-events', 'none');

        // Initial Zoom
        if (!selectedCountry) {
            const initialTransform = d3.zoomIdentity;
            svg.call(zoom.transform, initialTransform);
        }

    } catch (e) {
        console.error("Map Initialization Error:", e);
    }
    
    // Cleanup on unmount or re-run
    return () => {
        if (svgRef.current) {
            d3.select(svgRef.current).on('.zoom', null);
        }
    };
  }, [geoData, dimensions]); 

  // 3. Update Colors (Sentiment)
  useEffect(() => {
    if (!gRef.current || !sentimentMap) return;

    try {
        gRef.current.selectAll('.country-block')
          .interrupt() // STOP any pending transitions to prevent flicker during rapid updates
          .transition()
          .duration(700)
          .attr('fill', (d: any) => {
              // Safety check for datum
              if (!d || !d.properties) return '#1e293b';
              return getFillColor(sentimentMap[d.properties.name]);
          })
          .attr('class', (d: any) => {
              if (!d || !d.properties) return 'country-block';
              const score = sentimentMap[d.properties.name];
              return (score !== undefined && score !== null && Math.abs(score) > 0.2) 
                ? 'country-block animate-pulse-sentiment' 
                : 'country-block';
          });
    } catch (e) {
        console.error("Sentiment Update Error:", e);
    }

  }, [sentimentMap, geoData, dimensions]);

  // 4. Update Overlays (Static & Dynamic)
  useEffect(() => {
    if (!gRef.current || !geoData || !projectionRef.current) return;
    
    try {
        const svg = d3.select(svgRef.current);
        const k = d3.zoomTransform(svg.node()!).k || 1;
        // Re-create path generator with current projection ref to avoid stale closures
        const pathGenerator = d3.geoPath().projection(projectionRef.current);
        const overlayGroup = gRef.current.select('.overlay-group');

        // Clear existing
        overlayGroup.selectAll('*').remove();

        if (activeOverlay === 'NONE') return;

        const config = STATIC_OVERLAYS[activeOverlay];
        if (!config || !config.mapPath) return;

        // Use dynamic countries if provided, else fallback to static config
        const targetCountries = customOverlayCountries && customOverlayCountries.length > 0 
            ? customOverlayCountries 
            : config.countries;
        
        // Filter features that match the active overlay list
        const featuresToOverlay = geoData.features.filter((f: any) => 
            f && f.properties && targetCountries.includes(f.properties.name)
        );
        
        // Create groups for each icon to handle translation and scaling
        const groups = overlayGroup.selectAll('.overlay-icon-group')
            .data(featuresToOverlay)
            .enter()
            .append('g')
            .attr('class', 'overlay-icon-group')
            .attr('transform', (d: any) => {
                const centroid = pathGenerator.centroid(d);
                if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return null;
                // Initial scale
                const scale = Math.max(0.3, 1 / k);
                return `translate(${centroid[0]}, ${centroid[1]}) scale(${scale})`;
            });

        // Add Pulse effect behind (Base pulse)
        groups.append('circle')
            .attr('r', 8)
            .attr('fill', config.color)
            .attr('opacity', 0.4)
            .attr('class', 'animate-ping-slow');

        // Create a wrapper group for the icon path to handle centering and animation origins
        const iconWrapper = groups.append('g')
            .attr('transform', 'translate(-12, -12)');

        // Append Path to Wrapper
        const path = iconWrapper.append('path')
            .attr('d', config.mapPath)
            .attr('fill', config.color)
            .attr('stroke', '#0f172a') // Dark stroke for contrast
            .attr('stroke-width', 1)
            .attr('opacity', 0);
        
        // Apply specific animations based on overlay type
        // Note: transform-origin is critical for rotation.
        // The path is drawn in 0,0 to 24,24 space. Center is 12,12.
        path.style('transform-origin', '12px 12px');

        if (activeOverlay === 'NUCLEAR') {
            path.attr('class', 'icon-spin');
        } else if (activeOverlay === 'SPACE') {
            path.attr('class', 'icon-float');
        } else if (activeOverlay === 'CONFLICT') {
            path.attr('class', 'icon-pulse-fast');
        } else if (activeOverlay === 'OPEC') {
            path.attr('class', 'icon-flicker');
        } else if (activeOverlay === 'AI_HUBS') {
            path.attr('class', 'icon-pulse');
        } else if (activeOverlay === 'NATO') {
             path.attr('class', 'icon-pulse');
        }

        path.transition()
            .duration(500)
            .attr('opacity', 1);

    } catch (e) {
        console.error("Overlay Update Error:", e);
    }
  }, [activeOverlay, geoData, dimensions, customOverlayCountries, conflictZones]);

  // 5. Handle Focus Zoom
  useEffect(() => {
    if (!selectedCountry || !zoomRef.current || !svgRef.current || dimensions.width === 0) return;
    if (!geoData || !geoData.features || geoData.features.length === 0) return;

    try {
        const pathGenerator = d3.geoPath().projection(projectionRef.current);
        const feature = geoData.features.find((f: any) => f && f.properties && f.properties.name === selectedCountry);
        
        if (feature) {
            const bounds = pathGenerator.bounds(feature);
            if (!bounds || bounds[0][0] === Infinity) return;

            const dx = bounds[1][0] - bounds[0][0];
            const dy = bounds[1][1] - bounds[0][1];
            const x = (bounds[0][0] + bounds[1][0]) / 2;
            const y = (bounds[0][1] + bounds[1][1]) / 2;
            
            const s = Math.max(1, Math.min(8, 0.9 / Math.max(dx / dimensions.width, dy / dimensions.height)));
            
            const transform = d3.zoomIdentity
                .translate(dimensions.width / 2, dimensions.height / 2)
                .scale(s)
                .translate(-x, -y);

            d3.select(svgRef.current).transition()
              .duration(1000)
              .ease(d3.easeCubicOut)
              .call(zoomRef.current.transform, transform);
        }
    } catch (e) {
        console.error("Zoom Focus Error:", e);
    }
  }, [selectedCountry, dimensions, geoData]);

  // 6. Update Interactions (Tooltips & Events) - Re-binds when props change to fix stale closures
  useEffect(() => {
    if (!gRef.current) return;

    try {
        // We select all existing country paths and re-apply event listeners
        // Fixed: Removed generic type arguments from selectAll to prevent TS error about untyped function calls
        gRef.current.selectAll('.country-block')
          .on('mouseover', function(event, d: any) {
            if (!d || !d.properties) return;
            const sel = d3.select(this);
            sel.raise();
            
            // Safety check for overlay group
            if (gRef.current) {
                const overlayGroup = gRef.current.select('.overlay-group');
                if (!overlayGroup.empty()) overlayGroup.raise();
            }

            // Using vector-effect so we don't need complex stroke-width math here for hover, just color change
            sel.attr('stroke', '#f8fafc').attr('stroke-width', 1.0);
            
            if (tooltipRef.current) {
                tooltipRef.current.style.opacity = '1';
                
                // Build tooltip content
                let content = `<strong>${d.properties.name}</strong>`;
                
                // Add conflict info if available (Using fresh state)
                if (activeOverlay === 'CONFLICT' && conflictZones) {
                    const zone = conflictZones.find(c => c.countryName === d.properties.name);
                    if (zone) {
                        content += `
                            <div class="mt-2 pt-2 border-t border-red-500/30 flex flex-col gap-1">
                                <div class="flex items-center gap-1.5 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                    <span>⚠️ Active Conflict</span>
                                </div>
                                <div class="text-slate-300 text-[10px] leading-relaxed max-w-[180px] font-normal">
                                    ${zone.summary}
                                </div>
                            </div>
                        `;
                    }
                }

                tooltipRef.current.innerHTML = content;
                tooltipRef.current.style.left = `${event.pageX + 15}px`;
                tooltipRef.current.style.top = `${event.pageY + 15}px`;
            }
          })
          .on('mousemove', (event) => {
            if (tooltipRef.current) {
                tooltipRef.current.style.left = `${event.pageX + 15}px`;
                tooltipRef.current.style.top = `${event.pageY + 15}px`;
            }
          })
          .on('mouseout', function(event, d: any) {
            const sel = d3.select(this);
            sel.attr('stroke', '#334155').attr('stroke-width', 0.5);
            
            if (tooltipRef.current) {
                tooltipRef.current.style.opacity = '0';
            }
          })
          .on('click', (event, d: any) => {
            event.stopPropagation();
            if (d && d.properties) {
                onCountrySelect(d.properties.name);
            }
          });
    } catch (e) {
        console.error("Event Binding Error:", e);
    }

  }, [activeOverlay, conflictZones, onCountrySelect, geoData, dimensions]);

  const handleReset = () => {
    if (svgRef.current && zoomRef.current) {
        d3.select(svgRef.current).transition()
            .duration(750)
            .ease(d3.easeCubicOut)
            .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#020617] relative overflow-hidden">
        {/* Simple Flat Background */}
        <div className="absolute inset-0 z-0 bg-slate-950 opacity-100 pointer-events-none" />

        {!geoData && (
             <div className="absolute inset-0 flex items-center justify-center text-slate-500 z-20">
                <span className="animate-pulse tracking-widest font-mono text-sm">INITIALIZING GEO-GRID...</span>
             </div>
        )}

        <svg ref={svgRef} className="w-full h-full block relative z-10" />
        
        <button
            onClick={(e) => {
                e.stopPropagation();
                handleReset();
            }}
            className="absolute bottom-20 right-6 bg-slate-800/90 backdrop-blur p-2.5 rounded-full shadow-lg border border-slate-700 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-all z-20 hover:scale-110 active:scale-95"
            title="Reset to World View"
        >
            <Home className="w-5 h-5" />
        </button>

        <div 
            ref={tooltipRef}
            className="fixed pointer-events-none bg-slate-900/95 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded shadow-xl z-50 backdrop-blur opacity-0 transition-opacity duration-150 uppercase tracking-widest"
        />

        {/* AI WARNING BANNER FOR CONFLICT LAYER */}
        {activeOverlay === 'CONFLICT' && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-red-950/80 backdrop-blur-md border border-red-500/30 px-6 py-3 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-[fadeIn_0.5s_ease-out] pointer-events-none">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30">
                     <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-red-200 uppercase tracking-widest leading-none mb-1">
                        AI GENERATED: Conflict Analysis
                    </span>
                    <span className="text-[10px] text-red-200/70 leading-none font-mono">
                        Conflict zones identified by Gemini from live news. Real-time coverage may vary.
                    </span>
                </div>
            </div>
        )}
        
        <style>{`
            @keyframes pulseBrightness {
                0%, 100% { filter: brightness(1); }
                50% { filter: brightness(1.2); }
            }
            @keyframes pingSlow {
                0% { transform: scale(0.8); opacity: 0.5; }
                100% { transform: scale(2); opacity: 0; }
            }
            @keyframes ocean-wave {
                0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
                10% { opacity: 0.8; transform: translate(10px, -2px) scale(1); }
                90% { opacity: 0.8; transform: translate(90px, -18px) scale(1); }
                100% { opacity: 0; transform: translate(100px, -20px) scale(0.5); }
            }
            @keyframes spin { 
                100% { transform: rotate(360deg); } 
            }
            @keyframes float { 
                0%, 100% { transform: translateY(0); } 
                50% { transform: translateY(-3px); } 
            }
            @keyframes flicker {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            @keyframes pulse-scale {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.15); }
            }
            .icon-spin { animation: spin 4s linear infinite; }
            .icon-float { animation: float 3s ease-in-out infinite; }
            .icon-flicker { animation: flicker 2s infinite; }
            .icon-pulse { animation: pulse-scale 2s ease-in-out infinite; }
            .icon-pulse-fast { animation: pulse-scale 1s ease-in-out infinite; }
            
            .animate-pulse-sentiment {
                animation: pulseBrightness 3s ease-in-out infinite;
            }
            .animate-ping-slow {
                animation: pingSlow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
            }
            .overlay-icon-group {
                pointer-events: none;
            }
        `}</style>
    </div>
  );
};

export default WorldMap;