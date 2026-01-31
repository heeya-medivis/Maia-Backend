'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { MaiaSession } from '@/lib/api-client';

type TimeRange = 'today' | '7days';
type Metric = 'sessions' | 'tokens';

interface UsageChartProps {
  chatSessions: MaiaSession[];
  timeRange: TimeRange;
  metric: Metric;
  height?: number;
}

interface DataPoint {
  label: string;
  value: number;
  timestamp: number;
}

const CHART_COLOR = '#3b82f6'; // Blue

function getChatTotalTokens(session: MaiaSession): number {
  return (
    session.totalInputTextTokens +
    session.totalInputImageTokens +
    session.totalInputAudioTokens +
    session.totalOutputTextTokens +
    session.totalOutputImageTokens +
    session.totalOutputAudioTokens +
    session.totalOutputReasoningTokens
  );
}

function generateDataPoints(
  sessions: MaiaSession[],
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

export function UsageChart({
  chatSessions,
  timeRange,
  metric,
  height = 300,
}: UsageChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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

  const data = useMemo(
    () => generateDataPoints(chatSessions, timeRange, metric),
    [chatSessions, timeRange, metric]
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

  // Calculate max value
  const maxValue = useMemo(() => {
    const max = Math.max(...data.map((d) => d.value), 1);
    if (max <= 10) return Math.ceil(max);
    if (max <= 100) return Math.ceil(max / 10) * 10;
    if (max <= 1000) return Math.ceil(max / 100) * 100;
    return Math.ceil(max / 1000) * 1000;
  }, [data]);

  const formatValue = (value: number) => {
    if (metric === 'tokens') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 60, left: 70 };
  const chartWidth = containerWidth;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Axis labels
  const yAxisLabel = metric === 'sessions' ? 'Number of Sessions' : 'Number of Tokens';
  const xAxisLabel = timeRange === 'today' ? 'Hour of Day' : 'Date';

  // Calculate point positions
  const points = useMemo(() => {
    return data.map((d, i) => {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
      const y = padding.top + innerHeight - (d.value / maxValue) * innerHeight;
      return { x, y, data: d };
    });
  }, [data, innerWidth, innerHeight, maxValue, padding.left, padding.top]);

  // Create SVG paths
  const createLinePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const createAreaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    const bottomY = padding.top + innerHeight;
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return `${line} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`;
  };

  // Y-axis labels
  const yLabels = [0, maxValue / 2, maxValue];

  // X-axis labels interval
  const xLabelInterval = timeRange === 'today' ? 3 : 1;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.4} />
            <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0.05} />
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
          {points.map((p, i) => {
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

        {/* Area & Line */}
        <path
          d={createAreaPath(points)}
          fill="url(#chartGradient)"
          className="transition-opacity duration-300 ease-out"
          style={{ opacity: isLabelTransitioning ? 0 : 1 }}
        />
        <path
          d={createLinePath(points)}
          fill="none"
          stroke={CHART_COLOR}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-opacity duration-300 ease-out"
          style={{ opacity: isLabelTransitioning ? 0 : 1 }}
        />

        {/* Data Points */}
        {points.map((p, i) => {
          const yOffset = p.y - (padding.top + innerHeight);
          const isHovered = hoveredIndex === i;
          return (
            <g
              key={`point-${i}`}
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
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              <circle
                cx={0}
                cy={0}
                r={isHovered ? 6 : 4}
                fill={isHovered ? CHART_COLOR : '#1e3a5f'}
                stroke={CHART_COLOR}
                strokeWidth={2}
                className="transition-all duration-150 ease-out"
              />
            </g>
          );
        })}

        {/* Hover vertical line */}
        {hoveredIndex !== null && (
          <line
            x1={points[hoveredIndex]?.x}
            y1={padding.top}
            x2={points[hoveredIndex]?.x}
            y2={padding.top + innerHeight}
            stroke={CHART_COLOR}
            strokeDasharray="4 4"
            opacity={0.5}
            className="transition-all duration-300 ease-out"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm pointer-events-none z-10 shadow-lg transition-all duration-300 ease-out"
          style={{
            left: Math.min(Math.max(points[hoveredIndex]?.x, 80), chartWidth - 120),
            top: Math.max(points[hoveredIndex]?.y - 70, 10),
            transform: 'translateX(-50%)',
            borderColor: CHART_COLOR,
          }}
        >
          <div className="text-[var(--muted)] text-xs mb-1">{data[hoveredIndex]?.label}</div>
          <div className="font-semibold text-white">
            {data[hoveredIndex]?.value?.toLocaleString()}{' '}
            <span className="font-normal text-[var(--muted)]">
              {metric === 'tokens' ? 'tokens' : 'sessions'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
