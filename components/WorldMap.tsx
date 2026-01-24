
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Home } from 'lucide-react';
import { STATIC_OVERLAYS, OverlayType } from '../services/staticData';

interface WorldMapProps {
  onCountrySelect: (countryName: string) => void;
  selectedCountry: string | null;
  sentimentMap: Record<string, number>; 
  geoData: any;
  activeOverlay: OverlayType;
  customOverlayCountries?: string[]; // New prop for dynamic layers
}

const WorldMap: React.FC<WorldMapProps> = ({ onCountrySelect, selectedCountry, sentimentMap, geoData, activeOverlay, customOverlayCountries }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // D3 Refs
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const projectionRef = useRef<d3.GeoProjection>(d3.geoMercator()); 

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        requestAnimationFrame(() => {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Helper to determine color based on score
  const getFillColor = (score: number | undefined) => {
      if (score === undefined) return '#1e293b'; // Default Land (Slate 800)
      
      // Threshold lowered to 0.05 to capture mild positive/negative sentiments
      if (score > 0.05) {
          // Positive: Interpolate to Emerald 500
          return d3.interpolateRgb("#1e293b", "#10b981")(0.3 + (Math.min(1, score) * 0.7)); 
      }
      if (score < -0.05) {
          // Negative: Interpolate to Red 500
          return d3.interpolateRgb("#1e293b", "#ef4444")(0.3 + (Math.min(1, Math.abs(score)) * 0.7));
      }
      
      // Neutral (-0.05 to 0.05): Sky 500 (Light Blue)
      return '#0ea5e9'; 
  };

  // 2. Initialize and Draw Map
  useEffect(() => {
    if (!geoData || !svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    if (!geoData.features || geoData.features.length === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    
    // Clear previous contents
    svg.selectAll('*').remove();
    
    // Create Group
    const g = svg.append('g');
    gRef.current = g;

    // Filter out Antarctica
    const featuresWithoutAntarctica = {
        type: "FeatureCollection",
        features: geoData.features.filter((f: any) => f.properties.name !== "Antarctica")
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
         g.attr('transform', event.transform.toString());
         
         const k = event.transform.k;
         // Scale borders
         g.selectAll('.country-block').attr('stroke-width', 0.5 / k);
         g.selectAll('.graticule').attr('stroke-width', 0.5 / k);

         // Scale Icons: We inverse scale the 'transform' on the group or the path
         // For paths, we might need to adjust scale attribute directly
         g.selectAll('.overlay-icon-group')
            .attr('transform', function(d: any) {
                // Recover the original translation from the data datum we attached or recalculate
                const centroid = pathGenerator.centroid(d);
                if (isNaN(centroid[0]) || isNaN(centroid[1])) return null;
                // Scale 1/k
                const scale = Math.max(0.3, 1 / k); 
                return `translate(${centroid[0]}, ${centroid[1]}) scale(${scale})`;
            });
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // --- DRAWING ORDER ---

    // 1. Ocean
    g.append('rect')
      .attr('x', -width * 2)
      .attr('y', -height * 2)
      .attr('width', width * 5)
      .attr('height', height * 5)
      .attr('fill', '#0f172a') // Slate 900
      .attr('stroke', 'none');

    // 2. Graticules
    g.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', pathGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', '#334155')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.3);

    // 3. Countries
    const paths = g.selectAll<SVGPathElement, any>('.country-block')
      .data(geoData.features, (d: any) => d.properties.name);

    paths.enter()
      .append('path')
      .attr('class', 'country-block')
      .attr('fill', '#1e293b') // Initial Default Land
      .attr('stroke', '#334155')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .attr('d', pathGenerator as any)
      .on('mouseover', function(event, d: any) {
        const sel = d3.select(this);
        sel.raise();
        // Keep overlays on top after raise
        g.selectAll('.overlay-group').raise();

        sel.attr('stroke', '#f8fafc').attr('stroke-width', 1.5 / (d3.zoomTransform(svg.node()!).k || 1));
        
        if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '1';
            tooltipRef.current.innerText = d.properties.name;
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
        sel.attr('stroke', '#334155').attr('stroke-width', 0.5 / (d3.zoomTransform(svg.node()!).k || 1));
        
        if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '0';
        }
      })
      .on('click', (event, d: any) => {
        event.stopPropagation();
        onCountrySelect(d.properties.name);
      });

    // 4. Overlays Group (Created once)
    g.append('g').attr('class', 'overlay-group');

    // Initial Zoom
    if (!selectedCountry) {
        const initialTransform = d3.zoomIdentity;
        svg.call(zoom.transform, initialTransform);
    }

  }, [geoData, dimensions]); 

  // 3. Update Colors (Sentiment)
  useEffect(() => {
    if (!gRef.current || !sentimentMap) return;

    gRef.current.selectAll('.country-block')
      .transition()
      .duration(700)
      .attr('fill', (d: any) => getFillColor(sentimentMap[d.properties.name]))
      .attr('class', (d: any) => {
          const score = sentimentMap[d.properties.name];
          return (score !== undefined && Math.abs(score) > 0.2) 
            ? 'country-block animate-pulse-sentiment' 
            : 'country-block';
      });

  }, [sentimentMap, geoData, dimensions]);

  // 4. Update Overlays (Static & Dynamic)
  useEffect(() => {
    if (!gRef.current || !geoData || !projectionRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const k = d3.zoomTransform(svg.node()!).k || 1;
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
        targetCountries.includes(f.properties.name)
    );
    
    // Create groups for each icon to handle translation and scaling
    const groups = overlayGroup.selectAll('.overlay-icon-group')
        .data(featuresToOverlay)
        .enter()
        .append('g')
        .attr('class', 'overlay-icon-group')
        .attr('transform', (d: any) => {
            const centroid = pathGenerator.centroid(d);
            if (isNaN(centroid[0]) || isNaN(centroid[1])) return null;
            // Initial scale
            const scale = Math.max(0.3, 1 / k);
            return `translate(${centroid[0]}, ${centroid[1]}) scale(${scale})`;
        });

    // Append Path to Group
    groups.append('path')
        .attr('d', config.mapPath)
        .attr('fill', config.color)
        .attr('stroke', '#0f172a') // Dark stroke for contrast
        .attr('stroke-width', 1)
        // Center the 24x24 icon. Translate -12, -12
        .attr('transform', 'translate(-12, -12)') 
        .attr('opacity', 0)
        .transition()
        .duration(500)
        .attr('opacity', 1);

    // Add Pulse effect behind
    groups.insert('circle', 'path')
        .attr('r', 8)
        .attr('fill', config.color)
        .attr('opacity', 0.4)
        .attr('class', 'animate-ping-slow');

  }, [activeOverlay, geoData, dimensions, customOverlayCountries]);

  // 5. Handle Focus Zoom
  useEffect(() => {
    if (!selectedCountry || !zoomRef.current || !svgRef.current || dimensions.width === 0) return;
    
    if (!geoData || !geoData.features || geoData.features.length === 0) return;

    const pathGenerator = d3.geoPath().projection(projectionRef.current);
    const feature = geoData.features.find((f: any) => f.properties.name === selectedCountry);
    
    if (feature) {
        const bounds = pathGenerator.bounds(feature);
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
  }, [selectedCountry, dimensions, geoData]);

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
            className="fixed pointer-events-none bg-slate-900/95 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded shadow-xl z-50 backdrop-blur opacity-0 transition-opacity duration-150 uppercase tracking-widest whitespace-nowrap"
        />
        
        <style>{`
            @keyframes pulseBrightness {
                0%, 100% { filter: brightness(1); }
                50% { filter: brightness(1.2); }
            }
            @keyframes pingSlow {
                0% { transform: scale(0.8); opacity: 0.5; }
                100% { transform: scale(2); opacity: 0; }
            }
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
