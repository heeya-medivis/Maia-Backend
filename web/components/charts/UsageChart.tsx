'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { MaiaChatSession, MaiaDeepAnalysis } from '@/lib/api-client';

type TimeRange = 'today' | '7days';
type Metric = 'sessions' | 'tokens';
type ViewType = 'combined' | 'chat' | 'analysis';

interface UsageChartProps {
  chatSessions: MaiaChatSession[];
  deepAnalyses: MaiaDeepAnalysis[];
  timeRange: TimeRange;
  metric: Metric;
  viewType: ViewType;
  height?: number;
}

interface DataPoint {
  label: string;
  value: number;
  timestamp: number;
}

// Colors for different series
const CHAT_COLOR = '#3b82f6'; // Blue
const ANALYSIS_COLOR = '#ec4899'; // Pink

function getChatTotalTokens(session: MaiaChatSession): number {
  return (
    session.totalInputTextTokens +
    session.totalInputImageTokens +
    session.totalInputAudioTokens +
    session.totalOutputTextTokens +
    session.totalOutputAudioTokens
  );
}

function getAnalysisTotalTokens(analysis: MaiaDeepAnalysis): number {
  return analysis.inputTokens + analysis.outputTokens;
}

function generateChatDataPoints(
  sessions: MaiaChatSession[],
  timeRange: TimeRange,
  metric: Metric
): DataPoint[] {
  const now = new Date();
  const dataPoints: DataPoint[] = [];

  if (timeRange === 'today') {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startOfDay);
      hourStart.setHours(hour);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1);

      const hourSessions = sessions.filter((s) => {
        const sessionTime = new Date(s.startTime);
        return sessionTime >= hourStart && sessionTime < hourEnd;
      });

      let value = 0;
      if (metric === 'sessions') {
        value = hourSessions.length;
      } else {
        value = hourSessions.reduce((sum, s) => sum + getChatTotalTokens(s), 0);
      }

      dataPoints.push({
        label: `${hour.toString().padStart(2, '0')}:00`,
        value,
        timestamp: hourStart.getTime(),
      });
    }
  } else {
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - daysAgo);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const daySessions = sessions.filter((s) => {
        const sessionTime = new Date(s.startTime);
        return sessionTime >= dayStart && sessionTime < dayEnd;
      });

      let value = 0;
      if (metric === 'sessions') {
        value = daySessions.length;
      } else {
        value = daySessions.reduce((sum, s) => sum + getChatTotalTokens(s), 0);
      }

      const dayLabel = dayStart.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      dataPoints.push({
        label: dayLabel,
        value,
        timestamp: dayStart.getTime(),
      });
    }
  }

  return dataPoints;
}

function generateAnalysisDataPoints(
  analyses: MaiaDeepAnalysis[],
  timeRange: TimeRange,
  metric: Metric
): DataPoint[] {
  const now = new Date();
  const dataPoints: DataPoint[] = [];

  if (timeRange === 'today') {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startOfDay);
      hourStart.setHours(hour);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1);

      const hourAnalyses = analyses.filter((a) => {
        const analysisTime = new Date(a.requestTime);
        return analysisTime >= hourStart && analysisTime < hourEnd;
      });

      let value = 0;
      if (metric === 'sessions') {
        value = hourAnalyses.length;
      } else {
        value = hourAnalyses.reduce((sum, a) => sum + getAnalysisTotalTokens(a), 0);
      }

      dataPoints.push({
        label: `${hour.toString().padStart(2, '0')}:00`,
        value,
        timestamp: hourStart.getTime(),
      });
    }
  } else {
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - daysAgo);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayAnalyses = analyses.filter((a) => {
        const analysisTime = new Date(a.requestTime);
        return analysisTime >= dayStart && analysisTime < dayEnd;
      });

      let value = 0;
      if (metric === 'sessions') {
        value = dayAnalyses.length;
      } else {
        value = dayAnalyses.reduce((sum, a) => sum + getAnalysisTotalTokens(a), 0);
      }

      const dayLabel = dayStart.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      dataPoints.push({
        label: dayLabel,
        value,
        timestamp: dayStart.getTime(),
      });
    }
  }

  return dataPoints;
}

export function UsageChart({
  chatSessions,
  deepAnalyses,
  timeRange,
  metric,
  viewType,
  height = 300,
}: UsageChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredSeries, setHoveredSeries] = useState<'chat' | 'analysis' | null>(null);
  const [isLabelTransitioning, setIsLabelTransitioning] = useState(false);
  const prevTimeRangeRef = useRef<string>(timeRange);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Generate data for each series
  const chatData = useMemo(
    () => generateChatDataPoints(chatSessions, timeRange, metric),
    [chatSessions, timeRange, metric]
  );

  const analysisData = useMemo(
    () => generateAnalysisDataPoints(deepAnalyses, timeRange, metric),
    [deepAnalyses, timeRange, metric]
  );

  // Only fade labels when time range changes
  useEffect(() => {
    if (prevTimeRangeRef.current !== timeRange) {
      setIsLabelTransitioning(true);
      const timer = setTimeout(() => setIsLabelTransitioning(false), 50);
      prevTimeRangeRef.current = timeRange;
      return () => clearTimeout(timer);
    }
  }, [timeRange]);

  // Calculate max value across all visible series
  const maxValue = useMemo(() => {
    let allValues: number[] = [];

    if (viewType === 'combined' || viewType === 'chat') {
      allValues = allValues.concat(chatData.map((d) => d.value));
    }
    if (viewType === 'combined' || viewType === 'analysis') {
      allValues = allValues.concat(analysisData.map((d) => d.value));
    }

    const max = Math.max(...allValues, 1);
    if (max <= 10) return Math.ceil(max);
    if (max <= 100) return Math.ceil(max / 10) * 10;
    if (max <= 1000) return Math.ceil(max / 100) * 100;
    return Math.ceil(max / 1000) * 1000;
  }, [chatData, analysisData, viewType]);

  const formatValue = (value: number) => {
    if (metric === 'tokens') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  // Chart dimensions
  const padding = { top: 40, right: 20, bottom: 60, left: 70 };
  const chartWidth = containerWidth;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Axis labels
  const yAxisLabel = metric === 'sessions' ? 'Number of Sessions' : 'Number of Tokens';
  const xAxisLabel = timeRange === 'today' ? 'Hour of Day' : 'Date';

  // Calculate point positions for a data series
  const calculatePoints = (data: DataPoint[]) => {
    return data.map((d, i) => {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
      const y = padding.top + innerHeight - (d.value / maxValue) * innerHeight;
      return { x, y, data: d };
    });
  };

  const chatPoints = useMemo(() => calculatePoints(chatData), [chatData, innerWidth, innerHeight, maxValue]);
  const analysisPoints = useMemo(() => calculatePoints(analysisData), [analysisData, innerWidth, innerHeight, maxValue]);

  // Create SVG paths
  const createLinePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const createAreaPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    const bottomY = padding.top + innerHeight;
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return `${line} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  };

  // Y-axis labels
  const yLabels = [0, maxValue / 2, maxValue];

  // X-axis labels interval
  const xLabelInterval = timeRange === 'today' ? 3 : 1;

  // Use chat data for x-axis labels (both have same labels)
  const xAxisPoints = chatPoints;

  // Determine which series to show
  const showChat = viewType === 'combined' || viewType === 'chat';
  const showAnalysis = viewType === 'combined' || viewType === 'analysis';

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {/* Legend */}
      {viewType === 'combined' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHAT_COLOR }} />
            <span className="text-[var(--muted)]">Chat Sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ANALYSIS_COLOR }} />
            <span className="text-[var(--muted)]">Analysis Sessions</span>
          </div>
        </div>
      )}

      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="chatGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHAT_COLOR} stopOpacity={0.4} />
            <stop offset="100%" stopColor={CHAT_COLOR} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="analysisGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ANALYSIS_COLOR} stopOpacity={0.4} />
            <stop offset="100%" stopColor={ANALYSIS_COLOR} stopOpacity={0.05} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((val, i) => {
          const y = padding.top + innerHeight - (val / maxValue) * innerHeight;
          return (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="4 4"
                opacity={0.5}
                className="transition-all duration-500 ease-out"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="var(--muted)"
                fontSize={12}
                className="transition-all duration-500 ease-out"
              >
                {formatValue(val)}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={chartWidth - padding.right}
          y2={padding.top + innerHeight}
          stroke="var(--border)"
        />

        {/* X-axis labels */}
        <g
          className="transition-opacity duration-300 ease-out"
          style={{ opacity: isLabelTransitioning ? 0 : 1 }}
        >
          {xAxisPoints.map((p, i) => {
            if (i % xLabelInterval !== 0) return null;
            return (
              <text
                key={`xlabel-${i}`}
                x={p.x}
                y={padding.top + innerHeight + 20}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize={11}
              >
                {p.data.label}
              </text>
            );
          })}
        </g>

        {/* X-axis label */}
        <text
          x={padding.left + innerWidth / 2}
          y={chartHeight - 8}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize={12}
          className="transition-opacity duration-300 ease-out"
          style={{ opacity: isLabelTransitioning ? 0 : 1 }}
        >
          {xAxisLabel}
        </text>

        {/* Y-axis label */}
        <text
          x={18}
          y={padding.top + innerHeight / 2}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize={12}
          transform={`rotate(-90, 18, ${padding.top + innerHeight / 2})`}
          className="transition-opacity duration-300 ease-out"
        >
          {yAxisLabel}
        </text>

        {/* Analysis Area & Line (render first so chat appears on top) */}
        {showAnalysis && (
          <>
            <path
              d={createAreaPath(analysisPoints)}
              fill="url(#analysisGradient)"
              className="transition-opacity duration-300 ease-out"
              style={{ opacity: isLabelTransitioning ? 0 : 1 }}
            />
            <path
              d={createLinePath(analysisPoints)}
              fill="none"
              stroke={ANALYSIS_COLOR}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-opacity duration-300 ease-out"
              style={{ opacity: isLabelTransitioning ? 0 : 1 }}
            />
          </>
        )}

        {/* Chat Area & Line */}
        {showChat && (
          <>
            <path
              d={createAreaPath(chatPoints)}
              fill="url(#chatGradient)"
              className="transition-opacity duration-300 ease-out"
              style={{ opacity: isLabelTransitioning ? 0 : 1 }}
            />
            <path
              d={createLinePath(chatPoints)}
              fill="none"
              stroke={CHAT_COLOR}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-opacity duration-300 ease-out"
              style={{ opacity: isLabelTransitioning ? 0 : 1 }}
            />
          </>
        )}

        {/* Analysis Data Points */}
        {showAnalysis &&
          analysisPoints.map((p, i) => {
            const yOffset = p.y - (padding.top + innerHeight);
            const isHovered = hoveredIndex === i && hoveredSeries === 'analysis';
            return (
              <g
                key={`analysis-point-${i}`}
                className="transition-all duration-500 ease-out"
                style={{
                  transform: `translate(${p.x}px, ${padding.top + innerHeight}px) translateY(${yOffset}px)`,
                  opacity: isLabelTransitioning ? 0 : 1,
                }}
              >
                <circle
                  cx={0}
                  cy={0}
                  r={15}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredIndex(i);
                    setHoveredSeries('analysis');
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setHoveredSeries(null);
                  }}
                />
                <circle
                  cx={0}
                  cy={0}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? ANALYSIS_COLOR : '#4a1942'}
                  stroke={ANALYSIS_COLOR}
                  strokeWidth={2}
                  className="transition-all duration-150 ease-out"
                />
              </g>
            );
          })}

        {/* Chat Data Points */}
        {showChat &&
          chatPoints.map((p, i) => {
            const yOffset = p.y - (padding.top + innerHeight);
            const isHovered = hoveredIndex === i && hoveredSeries === 'chat';
            return (
              <g
                key={`chat-point-${i}`}
                className="transition-all duration-500 ease-out"
                style={{
                  transform: `translate(${p.x}px, ${padding.top + innerHeight}px) translateY(${yOffset}px)`,
                  opacity: isLabelTransitioning ? 0 : 1,
                }}
              >
                <circle
                  cx={0}
                  cy={0}
                  r={15}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredIndex(i);
                    setHoveredSeries('chat');
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setHoveredSeries(null);
                  }}
                />
                <circle
                  cx={0}
                  cy={0}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? CHAT_COLOR : '#1e3a5f'}
                  stroke={CHAT_COLOR}
                  strokeWidth={2}
                  className="transition-all duration-150 ease-out"
                />
              </g>
            );
          })}

        {/* Hover vertical line */}
        {hoveredIndex !== null && hoveredSeries && (
          <line
            x1={hoveredSeries === 'chat' ? chatPoints[hoveredIndex]?.x : analysisPoints[hoveredIndex]?.x}
            y1={padding.top}
            x2={hoveredSeries === 'chat' ? chatPoints[hoveredIndex]?.x : analysisPoints[hoveredIndex]?.x}
            y2={padding.top + innerHeight}
            stroke={hoveredSeries === 'chat' ? CHAT_COLOR : ANALYSIS_COLOR}
            strokeDasharray="4 4"
            opacity={0.5}
            className="transition-all duration-300 ease-out"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && hoveredSeries && (
        <div
          className="absolute bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm pointer-events-none z-10 shadow-lg transition-all duration-300 ease-out"
          style={{
            left: Math.min(
              Math.max(
                hoveredSeries === 'chat' ? chatPoints[hoveredIndex]?.x : analysisPoints[hoveredIndex]?.x,
                80
              ),
              chartWidth - 120
            ),
            top: Math.max(
              (hoveredSeries === 'chat' ? chatPoints[hoveredIndex]?.y : analysisPoints[hoveredIndex]?.y) - 70,
              10
            ),
            transform: 'translateX(-50%)',
            borderColor: hoveredSeries === 'chat' ? CHAT_COLOR : ANALYSIS_COLOR,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: hoveredSeries === 'chat' ? CHAT_COLOR : ANALYSIS_COLOR }}
            />
            <span className="text-[var(--muted)] text-xs">
              {hoveredSeries === 'chat' ? 'Chat' : 'Analysis'}
            </span>
          </div>
          <div className="text-[var(--muted)] text-xs mb-1">
            {hoveredSeries === 'chat' ? chatData[hoveredIndex]?.label : analysisData[hoveredIndex]?.label}
          </div>
          <div className="font-semibold text-white">
            {(hoveredSeries === 'chat'
              ? chatData[hoveredIndex]?.value
              : analysisData[hoveredIndex]?.value
            )?.toLocaleString()}{' '}
            <span className="font-normal text-[var(--muted)]">
              {metric === 'tokens' ? 'tokens' : 'sessions'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
