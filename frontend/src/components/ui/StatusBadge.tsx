import React from 'react';

export type StatusVariant = 
  | 'active' 
  | 'published' 
  | 'pending_approval' 
  | 'needs_response' 
  | 'confirmed' 
  | 'payment_pending' 
  | 'paid' 
  | 'unavailable' 
  | 'rejected' 
  | 'draft'
  | 'verified';

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string; defaultLabel: string }> = {
  active: {
    bg: '#E8F7EE',
    text: '#16794A',
    border: '#A3E5B9',
    dot: '#16794A',
    defaultLabel: 'Published & Active'
  },
  published: {
    bg: '#E8F7EE',
    text: '#16794A',
    border: '#A3E5B9',
    dot: '#16794A',
    defaultLabel: 'Live on Market'
  },
  pending_approval: {
    bg: '#FEF3C7',
    text: '#B45309',
    border: '#FDE68A',
    dot: '#D97706',
    defaultLabel: 'Pending Admin Review'
  },
  needs_response: {
    bg: '#FEF3C7',
    text: '#B45309',
    border: '#FDE68A',
    dot: '#D97706',
    defaultLabel: 'Action Required'
  },
  confirmed: {
    bg: '#E8F7EE',
    text: '#16794A',
    border: '#A3E5B9',
    dot: '#16794A',
    defaultLabel: 'Confirmed Available'
  },
  payment_pending: {
    bg: '#F1F5F9',
    text: '#334155',
    border: '#CBD5E1',
    dot: '#64748B',
    defaultLabel: 'Payment Pending'
  },
  paid: {
    bg: '#E8F7EE',
    text: '#16794A',
    border: '#A3E5B9',
    dot: '#16794A',
    defaultLabel: 'Contact Unlocked'
  },
  unavailable: {
    bg: '#FEE4E2',
    text: '#B42318',
    border: '#FECDCA',
    dot: '#B42318',
    defaultLabel: 'Unavailable / Rented'
  },
  rejected: {
    bg: '#FEE4E2',
    text: '#B42318',
    border: '#FECDCA',
    dot: '#B42318',
    defaultLabel: 'Rejected by Admin'
  },
  draft: {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#E2E8F0',
    dot: '#94A3B8',
    defaultLabel: 'Draft'
  },
  verified: {
    bg: '#E8F7EE',
    text: '#16794A',
    border: '#A3E5B9',
    dot: '#16794A',
    defaultLabel: 'Physical Inspection Verified'
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  pulse = false,
  size = 'md'
}) => {
  const config = statusConfig[status] || {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#E5E7EB',
    dot: '#6B7280',
    defaultLabel: status
  };

  const displayText = label || config.defaultLabel;
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '5px' : '7px',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        borderRadius: '9999px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
      }}
    >
      <span
        style={{
          width: isSmall ? '5px' : '6px',
          height: isSmall ? '5px' : '6px',
          borderRadius: '9999px',
          backgroundColor: config.dot,
          display: 'inline-block',
          position: 'relative',
          boxShadow: pulse ? `0 0 0 2px ${config.dot}40` : 'none',
          animation: pulse ? 'pulse 2s infinite' : 'none'
        }}
      />
      <span>{displayText}</span>
    </span>
  );
};
