import React from 'react';
import { Check, Clock, ArrowRight } from 'lucide-react';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  avatarInitials?: string;
  avatarColor?: string;
  icon?: React.ReactNode;
  statusBadge?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'warning';
  };
  isUrgent?: boolean;
  isCompleted?: boolean;
}

interface TimelineProps {
  items: TimelineItem[];
  emptyMessage?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  items,
  emptyMessage = 'No recent activity.'
}) => {
  if (items.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', padding: '8px 0' }}>
      {/* Continuous vertical connecting line */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          bottom: '24px',
          left: '19px',
          width: '2px',
          backgroundColor: '#E2E8F0',
          zIndex: 1
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const nodeBg = item.isUrgent ? '#FEF3C7' : item.isCompleted ? '#E8F7EE' : '#F8FAFC';
          const nodeColor = item.isUrgent ? '#B45309' : item.isCompleted ? '#16794A' : '#64748B';
          const nodeBorder = item.isUrgent ? '#FDE68A' : item.isCompleted ? '#A3E5B9' : '#CBD5E1';

          return (
            <div
              key={item.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                zIndex: 2
              }}
            >
              {/* Node Icon / Avatar */}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '9999px',
                  backgroundColor: item.avatarInitials ? (item.avatarColor || '#F1F5F9') : nodeBg,
                  color: item.avatarInitials ? '#000052' : nodeColor,
                  border: `2px solid ${item.avatarInitials ? '#E2E8F0' : nodeBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}
              >
                {item.avatarInitials ? (
                  item.avatarInitials
                ) : item.icon ? (
                  item.icon
                ) : item.isCompleted ? (
                  <Check size={16} />
                ) : item.isUrgent ? (
                  <Clock size={16} />
                ) : (
                  <span style={{ fontSize: '12px' }}>{index + 1}</span>
                )}
              </div>

              {/* Event Content Card */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: item.isUrgent ? '#FFFDF5' : '#FFFFFF',
                  border: `1px solid ${item.isUrgent ? '#FDE68A' : '#E2E8F0'}`,
                  borderRadius: '12px',
                  padding: '14px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#000052', margin: 0 }}>
                      {item.title}
                    </h4>
                    {item.description && (
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0', lineHeight: 1.4 }}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.statusBadge}
                    <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                      {item.timestamp}
                    </span>
                  </div>
                </div>

                {item.action && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={item.action.onClick}
                      style={{
                        backgroundColor: item.action.variant === 'warning' ? '#F59E0B' : item.action.variant === 'secondary' ? '#F1F5F9' : '#000052',
                        color: item.action.variant === 'secondary' ? '#334155' : '#FFFFFF',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: item.action.variant === 'warning' ? '0 1px 3px rgba(245, 158, 11, 0.25)' : 'none'
                      }}
                    >
                      <span>{item.action.label}</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
