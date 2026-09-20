import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: position === 'top' ? 'calc(100% + 8px)' : 'auto',
            top: position === 'bottom' ? 'calc(100% + 8px)' : 'auto',
            left: position === 'left' ? 'auto' : '50%',
            right: position === 'left' ? 'calc(100% + 8px)' : 'auto',
            transform: (position === 'top' || position === 'bottom') ? 'translateX(-50%)' : 'none',
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            padding: '6px 10px',
            fontSize: '11px',
            fontWeight: 500,
            borderRadius: '6px',
            whiteSpace: 'normal',
            maxWidth: '220px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
            zIndex: 9999,
            pointerEvents: 'none',
            lineHeight: 1.4,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};
