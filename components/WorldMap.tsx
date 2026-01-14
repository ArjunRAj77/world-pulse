import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Home } from 'lucide-react';

interface WorldMapProps {
  onCountrySelect: (countryName: string) => void;
  selectedCountry: string | null;
  sentimentMap: Record<string, number>; 
  geoData: any;
}

const WorldMap: React.FC<WorldMapProps> = ({ onCountrySelect, selectedCountry, sentimentMap, geoData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // D3 Refs to maintain state across renders without re-selecting
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const projectionRef = useRef<d3.GeoProjection>(d3.geoMercator());

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. Resize Observer to track container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        // Use requestAnimationFrame for smoother resize handling
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

  // 2. Initialize and Draw Map Geometry (Runs only on Data Load or Resize)
  useEffect(() => {
    // Only proceed if we have data and dimensions
    if (!geoData || !svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);

    // Setup Group if not exists
    let g = gRef.current;
    if (!g) {
      g = svg.append('g');
      gRef.current = g;
    }

    // Projection Logic (Responsive - Fit Extent)
    // fitExtent calculates the scale and translate automatically to fit the GeoJSON
    // within the box [[20, 20], [width-20, height-20]] (adding padding)
    const projection = d3.geoMercator()
      .fitExtent([[20, 20], [width - 20, height - 20]], geoData);
    
    // Store projection for zoom calculations
    projectionRef.current = projection;

    const pathGenerator = d3.geoPath().projection(projection);

    // Zoom Behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        if (gRef.current) {
             gRef.current.attr('transform', event.transform.toString());
             gRef.current.selectAll('path').attr('stroke-width', 0.5 / event.transform.k);
        }
      });

    // Store zoom instance
    zoomRef.current = zoom;
    
    // Bind zoom to SVG
    svg.call(zoom);

    // Render Paths
    const paths = g.selectAll<SVGPathElement, any>('path')
      .data(geoData.features, (d: any) => d.properties.name);

    // Enter + Update + Exit pattern
    paths.enter()
      .append('path')
      .attr('class', 'country-block')
      .attr('fill', '#f8fafc') // Fix: Default fill color to prevent black map
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      // Merge allows us to update the 'd' attribute on both new and existing paths when resize happens
      .merge(paths as any)
      .attr('d', pathGenerator as any); // Update geometry

    paths.exit().remove();

    // Event Listeners
    // We re-bind these on update to ensure they have the latest closure scope if needed
    g.selectAll('path')
      .on('mouseover', function(event, d: any) {
        const sel = d3.select(this);
        sel.raise(); // Bring to front
        sel.attr('stroke', '#64748b').attr('stroke-width', 1 / (d3.zoomTransform(svg.node()!).k || 1));
        
        // Show tooltip
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
        // Reset stroke
        sel.attr('stroke', '#cbd5e1').attr('stroke-width', 0.5 / (d3.zoomTransform(svg.node()!).k || 1));
        if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '0';
        }
      })
      .on('click', (event, d: any) => {
        event.stopPropagation();
        onCountrySelect(d.properties.name);
      });

  }, [geoData, dimensions]); // Trigger on Data Load or Resize

  // 3. Update Colors (Sentiment Only) - No Geometry redraw
  useEffect(() => {
    // Added geoData/dimensions dependency to ensure color re-applies after a resize/re-render of geometry
    if (!gRef.current || !sentimentMap) return;

    const getFillColor = (name: string) => {
      const score = sentimentMap[name] ?? 0;
      if (score > 0.1) return d3.interpolateRgb("#f8fafc", "#34d399")(score * 1.5);
      if (score < -0.1) return d3.interpolateRgb("#f8fafc", "#f87171")(Math.abs(score) * 1.5);
      return "#f8fafc";
    };

    // Use D3 transition for smooth updates without React re-render of SVG
    gRef.current.selectAll('path')
      .transition()
      .duration(500)
      .attr('fill', (d: any) => getFillColor(d.properties.name))
      .attr('class', (d: any) => {
          const score = sentimentMap[d.properties.name] ?? 0;
          return Math.abs(score) > 0.2 ? 'country-block animate-pulse-sentiment' : 'country-block';
      });

  }, [sentimentMap, geoData, dimensions]);

  // 4. Handle Selection Zoom
  useEffect(() => {
    if (!selectedCountry || !zoomRef.current || !svgRef.current || dimensions.width === 0) return;
    
    // Re-create projection logic locally to calculate bounds
    // We use the stored projectionRef which was configured with fitExtent
    const pathGenerator = d3.geoPath().projection(projectionRef.current);
    
    const feature = geoData.features.find((f: any) => f.properties.name === selectedCountry);
    
    if (feature) {
        const bounds = pathGenerator.bounds(feature);
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];
        const x = (bounds[0][0] + bounds[1][0]) / 2;
        const y = (bounds[0][1] + bounds[1][1]) / 2;
        
        // Calculate zoom scale
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
        const svg = d3.select(svgRef.current);
        svg.transition()
            .duration(750)
            .ease(d3.easeCubicOut)
            .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#e0f2fe] relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
            <div className="absolute inset-0 bg-gradient-to-b from-sky-100 to-sky-300"></div>
            <div className="absolute inset-0 wave-bg"></div>
        </div>

        <svg ref={svgRef} className="w-full h-full block relative z-10" />
        
        {/* Reset Button */}
        <button
            onClick={(e) => {
                e.stopPropagation();
                handleReset();
            }}
            className="absolute bottom-20 right-6 bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all z-20 hover:scale-110 active:scale-95"
            title="Reset to World View"
        >
            <Home className="w-5 h-5" />
        </button>

        <div 
            ref={tooltipRef}
            className="fixed pointer-events-none bg-white/95 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded shadow-lg z-50 backdrop-blur opacity-0 transition-opacity duration-150 uppercase tracking-widest whitespace-nowrap"
        />
        
        <style>{`
            .wave-bg {
                background-image: 
                    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4) 0%, transparent 50%),
                    radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.3) 0%, transparent 40%),
                    radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.3) 0%, transparent 40%);
                background-size: 150% 150%;
                animation: oceanBreathing 15s ease-in-out infinite alternate;
            }
            @keyframes oceanBreathing {
                0% { background-position: 0% 0%; }
                100% { background-position: 100% 100%; }
            }
            @keyframes pulseBrightness {
                0%, 100% { filter: brightness(1); }
                50% { filter: brightness(0.95); }
            }
            .animate-pulse-sentiment {
                animation: pulseBrightness 3s ease-in-out infinite;
            }
        `}</style>
    </div>
  );
};

export default WorldMap;