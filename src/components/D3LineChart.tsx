import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { Info, Sparkles } from "lucide-react";

export interface ForecastPoint {
  date: string;
  volume: number;
  credibility: number;
}

interface DataPoint {
  date: Date;
  volume: number;
  credibility: number;
  isForecast: boolean;
}

interface D3LineChartProps {
  forecastPoints?: ForecastPoint[] | null;
}

// Generate realistic data for the past 30 days up to July 17, 2026
const generateData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const baseDate = new Date("2026-07-17");
  
  // Seed random generator for consistent aesthetic curves
  let seed = 42;
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 29; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - i);
    
    // Volume ranges from 5 to 25 with some random noise
    const volume = Math.floor(8 + random() * 12 + Math.sin(i / 3) * 4);
    
    // Credibility index ranges from 84% to 97% with an upward trend
    const credibility = parseFloat((86 + random() * 8 + Math.cos(i / 4) * 3 + (29 - i) * 0.1).toFixed(1));
    
    data.push({ date, volume, credibility, isForecast: false });
  }
  return data;
};

export default function D3LineChart({ forecastPoints }: D3LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  // Compute merged data using useMemo
  const data = useMemo<DataPoint[]>(() => {
    const historical = generateData();
    if (!forecastPoints || forecastPoints.length === 0) {
      return historical;
    }

    const mappedForecast = forecastPoints.map((pt) => {
      // Parse YYYY-MM-DD cleanly using split to avoid timezone offsets
      const parts = pt.date.split("-");
      const dateObj = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      );

      return {
        date: dateObj,
        volume: pt.volume,
        credibility: pt.credibility,
        isForecast: true,
      };
    });

    return [...historical, ...mappedForecast];
  }, [forecastPoints]);

  // Handle ResizeObserver for precise responsiveness
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Keep height relative but bounded
      const height = Math.max(280, Math.min(360, width * 0.5));
      setDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous elements
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll("*").remove();

    const margin = { top: 30, right: 55, bottom: 40, left: 50 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = svgElement
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add Gradients for elegant visual fills
    const defs = svg.append("defs");

    // Historical Volume area gradient
    const volumeGrad = defs
      .append("linearGradient")
      .attr("id", "volume-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    volumeGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#6366f1") // Indigo
      .attr("stop-opacity", 0.15);

    volumeGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#6366f1")
      .attr("stop-opacity", 0.0);

    // Projected Volume area gradient
    const volumeForecastGrad = defs
      .append("linearGradient")
      .attr("id", "volume-gradient-forecast")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    volumeForecastGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#818cf8") // Lighter indigo
      .attr("stop-opacity", 0.08);

    volumeForecastGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#818cf8")
      .attr("stop-opacity", 0.0);

    // Historical Credibility area gradient
    const credGrad = defs
      .append("linearGradient")
      .attr("id", "credibility-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    credGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#10b981") // Emerald
      .attr("stop-opacity", 0.15);

    credGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.0);

    // Projected Credibility area gradient
    const credForecastGrad = defs
      .append("linearGradient")
      .attr("id", "credibility-gradient-forecast")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    credForecastGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#34d399") // Lighter emerald
      .attr("stop-opacity", 0.08);

    credForecastGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#34d399")
      .attr("stop-opacity", 0.0);

    // X scale
    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    // Y scale Left (Volume)
    const yLeft = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.volume)! + 5])
      .range([height, 0]);

    // Y scale Right (Credibility)
    const yRight = d3
      .scaleLinear()
      .domain([70, 100]) // Bounded credibility percentage
      .range([height, 0]);

    // Format generators
    const formatTime = d3.timeFormat("%b %d");

    // Gridlines (Horizontal)
    svg
      .append("g")
      .attr("class", "grid")
      .attr("stroke", "#f1f5f9")
      .attr("stroke-width", 1)
      .attr("opacity", 0.6)
      .call(
        d3
          .axisLeft(yLeft)
          .tickSize(-width)
          .tickFormat(() => "")
      );

    // Left Y Axis (Volume)
    const yAxisLeft = d3.axisLeft(yLeft).ticks(5).tickSize(0).tickPadding(8);
    svg
      .append("g")
      .call(yAxisLeft)
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("fill", "#64748b")
          .attr("font-family", "JetBrains Mono, monospace")
          .attr("font-size", "9px")
      );

    // Right Y Axis (Credibility)
    const yAxisRight = d3
      .axisRight(yRight)
      .ticks(5)
      .tickSize(0)
      .tickPadding(8)
      .tickFormat((d) => `${d}%`);
    svg
      .append("g")
      .attr("transform", `translate(${width}, 0)`)
      .call(yAxisRight)
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("fill", "#64748b")
          .attr("font-family", "JetBrains Mono, monospace")
          .attr("font-size", "9px")
      );

    // X Axis
    const xAxis = d3
      .axisBottom(x)
      .ticks(width > 500 ? 10 : 5)
      .tickSize(0)
      .tickPadding(12)
      .tickFormat((domainValue) => formatTime(domainValue as Date));
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .call((g) => g.select(".domain").attr("stroke", "#e2e8f0"))
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("fill", "#64748b")
          .attr("font-family", "JetBrains Mono, monospace")
          .attr("font-size", "9px")
      );

    // Split historical and forecasted groups for separate stroke rendering
    const historicalPoints = data.filter((d) => !d.isForecast);
    const forecastPointsGroup = data.filter((d, i) => {
      if (d.isForecast) return true;
      // Include the final historical element to build an unbroken connecting line
      const nextPoint = data[i + 1];
      return nextPoint && nextPoint.isForecast;
    });

    // Area/Line Generators
    const volumeArea = d3
      .area<DataPoint>()
      .x((d) => x(d.date))
      .y0(height)
      .y1((d) => yLeft(d.volume))
      .curve(d3.curveMonotoneX);

    const credArea = d3
      .area<DataPoint>()
      .x((d) => x(d.date))
      .y0(height)
      .y1((d) => yRight(d.credibility))
      .curve(d3.curveMonotoneX);

    const volumeLine = d3
      .line<DataPoint>()
      .x((d) => x(d.date))
      .y((d) => yLeft(d.volume))
      .curve(d3.curveMonotoneX);

    const credibilityLine = d3
      .line<DataPoint>()
      .x((d) => x(d.date))
      .y((d) => yRight(d.credibility))
      .curve(d3.curveMonotoneX);

    // 1. Draw Volume Historical Area & Line
    svg
      .append("path")
      .datum(historicalPoints)
      .attr("fill", "url(#volume-gradient)")
      .attr("d", volumeArea);

    svg
      .append("path")
      .datum(historicalPoints)
      .attr("fill", "none")
      .attr("stroke", "#6366f1") // Indigo
      .attr("stroke-width", 2)
      .attr("d", volumeLine);

    // 2. Draw Volume Forecast Area & Line (Dashed)
    if (forecastPointsGroup.length > 0) {
      svg
        .append("path")
        .datum(forecastPointsGroup)
        .attr("fill", "url(#volume-gradient-forecast)")
        .attr("d", volumeArea);

      svg
        .append("path")
        .datum(forecastPointsGroup)
        .attr("fill", "none")
        .attr("stroke", "#818cf8") // Slightly lighter indigo for projection
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4") // High-polish dashed line
        .attr("d", volumeLine);
    }

    // 3. Draw Credibility Historical Area & Line
    svg
      .append("path")
      .datum(historicalPoints)
      .attr("fill", "url(#credibility-gradient)")
      .attr("d", credArea);

    svg
      .append("path")
      .datum(historicalPoints)
      .attr("fill", "none")
      .attr("stroke", "#10b981") // Emerald
      .attr("stroke-width", 2)
      .attr("d", credibilityLine);

    // 4. Draw Credibility Forecast Area & Line (Dashed)
    if (forecastPointsGroup.length > 0) {
      svg
        .append("path")
        .datum(forecastPointsGroup)
        .attr("fill", "url(#credibility-gradient-forecast)")
        .attr("d", credArea);

      svg
        .append("path")
        .datum(forecastPointsGroup)
        .attr("fill", "none")
        .attr("stroke", "#34d399") // Slightly lighter emerald
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4") // High-polish dashed line
        .attr("d", credibilityLine);
    }

    // Vertical indicator and hover overlay interactive mechanism
    const bisectDate = d3.bisector<DataPoint, Date>((d) => d.date).left;

    const hoverLine = svg
      .append("line")
      .attr("class", "hover-line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("opacity", 0)
      .attr("y1", 0)
      .attr("y2", height);

    const volumeDot = svg
      .append("circle")
      .attr("r", 5.5)
      .attr("fill", "#6366f1")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .style("opacity", 0);

    const credDot = svg
      .append("circle")
      .attr("r", 5.5)
      .attr("fill", "#10b981")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .style("opacity", 0);

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const dateAtMouse = x.invert(mouseX);
        const index = bisectDate(data, dateAtMouse, 1);
        const d0 = data[index - 1];
        const d1 = data[index];
        if (!d0 || !d1) return;

        const d =
          dateAtMouse.getTime() - d0.date.getTime() > d1.date.getTime() - dateAtMouse.getTime()
            ? d1
            : d0;

        setHoveredPoint(d);

        // Position overlay items precisely
        const targetX = x(d.date);
        hoverLine.attr("x1", targetX).attr("x2", targetX).style("opacity", 1);
        volumeDot.attr("cx", targetX).attr("cy", yLeft(d.volume)).style("opacity", 1);
        credDot.attr("cx", targetX).attr("cy", yRight(d.credibility)).style("opacity", 1);
      })
      .on("mouseleave", () => {
        setHoveredPoint(null);
        hoverLine.style("opacity", 0);
        volumeDot.style("opacity", 0);
        credDot.style("opacity", 0);
      });
  }, [data, dimensions]);

  return (
    <div className="space-y-4">
      {/* Legend & Stats Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Report Volume</p>
              <p className="text-sm font-semibold text-slate-800">
                {hoveredPoint ? `${hoveredPoint.volume} Filings` : "14.8 Daily Avg"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Credibility Index</p>
              <p className="text-sm font-semibold text-slate-800">
                {hoveredPoint ? `${hoveredPoint.credibility}% Score` : "91.2% Average"}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Tooltip Info */}
        <div className="text-right">
          {hoveredPoint ? (
            <div>
              <p className="text-[10px] text-slate-400 font-mono font-medium">
                {hoveredPoint.date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
              <p className="text-[10px] font-semibold text-slate-700 font-mono flex items-center gap-1.5 justify-end">
                {hoveredPoint.isForecast ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse shrink-0" />
                    <span className="text-indigo-600 font-bold">Gemini Trend Forecast</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Audited Integrity Trace</span>
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Hover chart lines to view specific daily audit coordinates</span>
            </div>
          )}
        </div>
      </div>

      {/* Actual SVG Container */}
      <div ref={containerRef} className="w-full h-auto bg-white border border-slate-200 rounded-2xl p-4 overflow-hidden shadow-xs relative">
        {forecastPoints && forecastPoints.length > 0 && (
          <div className="absolute top-3 right-4 flex items-center gap-1 bg-indigo-50 border border-indigo-200/60 rounded px-2 py-0.5 text-[9px] text-indigo-600 font-mono font-semibold">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>30D PROJECTION OVERLAY ACTIVE</span>
          </div>
        )}
        <svg ref={svgRef} className="mx-auto block" />
      </div>
    </div>
  );
}
