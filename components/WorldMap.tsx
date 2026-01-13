import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { MapFeature, SentimentType } from '../types';

interface WorldMapProps {
  onCountrySelect: (countryName: string) => void;
  selectedCountry: string | null;
  sentimentMap: Record<string, number>; 
}

const LOADING_MESSAGES = [
  "Initializing planetary interface...",
  "Calibrating geopolitical sensors...",
  "Establishing satellite uplink...",
  "Downloading topographical mesh...",
  "Analyzing global sentiment vectors...",
  "Synchronizing real-time feeds..."
];

const WorldMap: React.FC<WorldMapProps> = ({ onCountrySelect, selectedCountry, sentimentMap }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);

  // Loading Message Cycle
  useEffect(() => {
    if (geoData) return;
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIndex]);
    }, 800);
    return () => clearInterval(interval);
  }, [geoData]);

  // Load GeoJSON with Caching
  useEffect(() => {
    const CACHE_KEY = 'worldpulse_geojson_v1';
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
      try {
        setGeoData(JSON.parse(cachedData));
        return;
      } catch (e) {
        console.warn("Invalid cached map data", e);
        localStorage.removeItem(CACHE_KEY);
      }
    }

    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(res => res.json())
      .then(data => {
        // Simple cache
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn("Storage full, cannot cache map", e);
        }
        setGeoData(data);
      })
      .catch(err => console.error("Failed to load map data", err));
  }, []);

  // Draw Map
  useEffect(() => {
    if (!geoData || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Define Filters
    const defs = svg.append("defs");
    
    // Glow/Shadow Filter
    const filter = defs.append("filter")
        .attr("id", "hover-glow")
        .attr("height", "150%")
        .attr("width", "150%")
        .attr("x", "-25%")
        .attr("y", "-25%");

    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 4)
        .attr("result", "blur");

    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 0)
        .attr("dy", 4)
        .attr("result", "offsetBlur");
        
    // Combine shadow with original element
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Projection
    const projection = d3.geoMercator()
      .scale(width / 6.5)
      .center([0, 20])
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        // Reset tooltips on zoom to avoid floating issues
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
      });

    svg.call(zoom);

    // Click background to deselect
    svg.on('click', () => {
        // onCountrySelect(null); // Optional: Allow clicking ocean to deselect?
    });

    const g = svg.append('g');

    // Color scales
    const getFillColor = (countryName: string) => {
      const score = sentimentMap[countryName] ?? 0;
      if (score > 0.1) {
        return d3.interpolateRgb("#334155", "#10b981")(score);
      } else if (score < -0.1) {
        return d3.interpolateRgb("#334155", "#ef4444")(Math.abs(score));
      } else {
        return "#334155";
      }
    };

    // Draw countries
    g.selectAll('path')
      .data(geoData.features)
      .enter()
      .append('path')
      .attr('d', path as any)
      .attr('class', 'country-path')
      .attr('fill', (d: any) => getFillColor(d.properties.name))
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.5s ease') // Smooth color transition
      .on('mouseover', function(event, d: any) {
        const element = d3.select(this);
        
        // Visual Pop
        element.raise(); // Bring to front
        element.attr('stroke', '#fff').attr('stroke-width', 1);
        element.style('filter', 'url(#hover-glow)');
        
        // Calculate scaling origin (centroid)
        const centroid = path.centroid(d);
        if (!isNaN(centroid[0]) && !isNaN(centroid[1])) {
             element.transition().duration(200)
            .attr('transform', `translate(${centroid[0]},${centroid[1]}) scale(1.02) translate(${-centroid[0]},${-centroid[1]})`);
        }

        // Tooltip
        if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '1';
            tooltipRef.current.innerText = d.properties.name;
            tooltipRef.current.style.left = `${event.pageX + 15}px`;
            tooltipRef.current.style.top = `${event.pageY + 15}px`;
        }
      })
      .on('mousemove', function(event) {
        if (tooltipRef.current) {
            tooltipRef.current.style.left = `${event.pageX + 15}px`;
            tooltipRef.current.style.top = `${event.pageY + 15}px`;
        }
      })
      .on('mouseout', function(event, d: any) {
        const element = d3.select(this);
        element.style('filter', null);
        element.transition().duration(200)
            .attr('transform', 'null') // Reset transform
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 0.5);

        if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '0';
        }
      })
      .on('click', (event, d: any) => {
        event.stopPropagation();
        onCountrySelect(d.properties.name);
        
        // Zoom to country
        const bounds = path.bounds(d as any);
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];
        const x = (bounds[0][0] + bounds[1][0]) / 2;
        const y = (bounds[0][1] + bounds[1][1]) / 2;
        const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
        const translate = [width / 2 - scale * x, height / 2 - scale * y];

        svg.transition()
          .duration(750)
          .call(
            zoom.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
          );
      });

    // Add pulsing indicators for hotspots
    const extremeCountries = geoData.features.filter((d: any) => {
        const score = sentimentMap[d.properties.name] ?? 0;
        return Math.abs(score) > 0.6; 
    });

    g.selectAll('circle.pulse-effect')
      .data(extremeCountries)
      .enter()
      .append('circle')
      .attr('cx', (d: any) => path.centroid(d)[0])
      .attr('cy', (d: any) => path.centroid(d)[1])
      .attr('r', 2)
      .attr('fill', (d: any) => {
         const score = sentimentMap[d.properties.name] ?? 0;
         return score > 0 ? '#34d399' : '#f87171';
      })
      .attr('opacity', 0.6)
      .classed('animate-pulse', true)
      .each(function() {
         // Manual loop for pulse
         const circle = d3.select(this);
         function repeat() {
            circle.transition()
                .duration(2000)
                .attr('r', 20)
                .style('opacity', 0)
                .on('end', () => {
                    circle.attr('r', 2).style('opacity', 0.6);
                    repeat();
                });
         }
         repeat();
      });


  }, [geoData, sentimentMap]); 

  return (
    <div ref={containerRef} className="w-full h-full bg-[#020617] relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-transparent to-[#0f172a] pointer-events-none" />
        
        <svg ref={svgRef} className="w-full h-full block" />
        
        {/* Tooltip */}
        <div 
            ref={tooltipRef}
            className="fixed pointer-events-none bg-slate-900/90 border border-slate-700 text-white text-xs font-mono px-3 py-1.5 rounded shadow-xl z-50 backdrop-blur opacity-0 transition-opacity duration-150"
        />

        {/* Loading Overlay */}
        {!geoData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] z-50">
                <div className="w-64 space-y-4">
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite] w-1/2 origin-left"></div>
                    </div>
                    <div className="text-center font-mono text-xs text-indigo-400 animate-pulse">
                        {loadingMsg}
                    </div>
                </div>
                <style>{`
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        50% { transform: translateX(0%); }
                        100% { transform: translateX(200%); }
                    }
                `}</style>
            </div>
        )}
    </div>
  );
};

export default WorldMap;