
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { HistoricalPoint } from '../types';

interface TrendChartProps {
  data: HistoricalPoint[];
  currentScore: number;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, currentScore }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length < 1) return;

    // 1. Setup Data - Append current live score as the latest point if not present
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    let chartData = [...data];
    const lastPoint = chartData[chartData.length - 1];
    
    // If the last point isn't from today/now, add the current live score to "connect" the line
    if (lastPoint.date !== todayStr) {
        chartData.push({
            date: todayStr,
            timestamp: Date.now(),
            score: currentScore
        });
    }

    // Only keep last 14 points for visual clarity
    chartData = chartData.slice(-14);

    const margin = { top: 10, right: 10, bottom: 20, left: 30 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 120 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 2. Scales
    const x = d3.scaleTime()
        .domain(d3.extent(chartData, d => new Date(d.timestamp)) as [Date, Date])
        .range([0, width]);

    // Fixed Y scale from -1 to 1 for consistent context
    const y = d3.scaleLinear()
        .domain([-1.1, 1.1])
        .range([height, 0]);

    // 3. Gradients
    const defs = svg.append("defs");
    
    // Area Gradient
    const areaGradient = defs.append("linearGradient")
        .attr("id", "area-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
    
    areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#10b981").attr("stop-opacity", 0.3); // Top Green
    areaGradient.append("stop").attr("offset", "50%").attr("stop-color", "#fbbf24").attr("stop-opacity", 0.1); // Mid Amber
    areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444").attr("stop-opacity", 0.3); // Bot Red

    // 4. Draw Axes
    // X Axis (Dates)
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(3).tickFormat(d3.timeFormat("%b %d") as any))
        .attr("color", "#64748b")
        .select(".domain").remove();

    // Y Axis (Score)
    g.append("g")
        .call(d3.axisLeft(y).ticks(3))
        .attr("color", "#64748b")
        .select(".domain").remove();

    // Zero Line (Neutral)
    g.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "#475569")
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 1);

    // 5. Draw Line & Area
    const area = d3.area<HistoricalPoint>()
        .x(d => x(new Date(d.timestamp)))
        .y0(y(0)) // Area starts from 0 line
        .y1(d => y(d.score))
        .curve(d3.curveMonotoneX);

    const line = d3.line<HistoricalPoint>()
        .x(d => x(new Date(d.timestamp)))
        .y(d => y(d.score))
        .curve(d3.curveMonotoneX);

    // Add Area
    g.append("path")
        .datum(chartData)
        .attr("fill", "url(#area-gradient)")
        .attr("d", area);

    // Add Line
    g.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add Dots
    g.selectAll(".dot")
        .data(chartData)
        .enter()
        .append("circle")
        .attr("cx", d => x(new Date(d.timestamp)))
        .attr("cy", d => y(d.score))
        .attr("r", 3)
        .attr("fill", d => d.score > 0 ? "#10b981" : d.score < 0 ? "#ef4444" : "#fbbf24")
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 1);

  }, [data, currentScore]);

  return (
    <div className="w-full h-[120px]">
        <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default TrendChart;
