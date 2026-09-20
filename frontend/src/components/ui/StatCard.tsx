import React from 'react';
import { HelpCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  insight?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  badgeText?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'purple';
  icon?: React.ReactNode;
  tooltipText?: string;
  actionText?: string;
  onActionClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  insight,
  trend,
  badgeText,
  badgeVariant = 'default',
  icon,
  tooltipText,
  actionText,
  onActionClick
}) => {
  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'success':
        return { bg: '#E8F7EE', text: '#16794A', border: '#A3E5B9' };
      case 'warning':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'purple':
        return { bg: '#F8FAFC', text: '#000052', border: '#E2E8F0' };
      default:
        return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '20px 22px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease'
      }}
    >
      {/* Top Row: Title + Tooltip + Icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', letterSpacing: '0.01em' }}>
            {title}
          </span>
          {tooltipText && (
            <Tooltip content={tooltipText}>
              <HelpCircle size={13} color="#94A3B8" style={{ cursor: 'pointer' }} />
            </Tooltip>
          )}
        </div>

        {icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #EDF2F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000052'
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Middle Row: Primary Value + Badges */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '30px', fontWeight: 800, color: '#000052', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </span>

        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11px',
              fontWeight: 600,
              color: trend.isPositive ? '#059669' : '#DC2626',
              backgroundColor: trend.isPositive ? '#ECFDF5' : '#FEF2F2',
              padding: '2px 7px',
              borderRadius: '9999px',
              border: `1px solid ${trend.isPositive ? '#A7F3D0' : '#FECACA'}`
            }}
          >
            {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value}
          </span>
        )}

        {badgeText && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: badgeStyle.text,
              backgroundColor: badgeStyle.bg,
              border: `1px solid ${badgeStyle.border}`,
              padding: '2px 8px',
              borderRadius: '9999px'
            }}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* Bottom: Subtitle or "One Step Ahead" Actionable Insight */}
      <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
        {insight ? (
          <p style={{ fontSize: '12px', color: '#475569', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
            {insight}
          </p>
        ) : subtitle ? (
          <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
            {subtitle}
          </p>
        ) : null}

        {actionText && (
          <button
            type="button"
            onClick={onActionClick}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              marginTop: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#000052',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{actionText}</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
