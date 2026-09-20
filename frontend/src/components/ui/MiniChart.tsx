import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface DataPoint {
  day: string;
  count: number;
  highlight?: boolean;
}

interface MiniChartProps {
  title?: string;
  subtitle?: string;
  data?: DataPoint[];
  totalWeeklyCount?: number;
}

const DEFAULT_DATA: DataPoint[] = [
  { day: 'Mon', count: 2 },
  { day: 'Tue', count: 4 },
  { day: 'Wed', count: 3 },
  { day: 'Thu', count: 6, highlight: true },
  { day: 'Fri', count: 5 },
  { day: 'Sat', count: 7, highlight: true },
  { day: 'Sun', count: 4 }
];

export const MiniChart: React.FC<MiniChartProps> = ({
  title = 'Weekly Inquiries Volume',
  subtitle = 'Tenant interest across Ibadan neighborhoods',
  data = DEFAULT_DATA,
  totalWeeklyCount = 31
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const chartHeight = 80;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#000052', margin: 0 }}>
            {title}
          </h4>
          <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>
            {subtitle}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#000052', lineHeight: 1 }}>
            {totalWeeklyCount}
          </div>
          <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
            <TrendingUp size={11} />
            <span>+18% vs last wk</span>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart with Hover Tooltips */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: `${chartHeight}px`, gap: '8px', paddingTop: '10px' }}>
        {data.map((item, index) => {
          const isHovered = hoveredIdx === index;
          const barHeight = Math.max((item.count / maxCount) * (chartHeight - 16), 8);
          const barColor = isHovered ? '#000052' : item.highlight ? '#1B1B68' : '#E2E8F0';

          return (
            <div
              key={item.day}
              onMouseEnter={() => setHoveredIdx(index)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              {/* Floating Tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-24px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  {item.count} leads
                </div>
              )}

              {/* The Bar */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '28px',
                  height: `${barHeight}px`,
                  backgroundColor: barColor,
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isHovered ? 'scaleY(1.05)' : 'none',
                  transformOrigin: 'bottom'
                }}
              />

              {/* Day Label */}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isHovered ? 700 : 500,
                  color: isHovered ? '#000052' : '#94A3B8',
                  marginTop: '6px'
                }}
              >
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
