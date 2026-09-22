import React from 'react';

interface NairaIconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const NairaIcon: React.FC<NairaIconProps> = ({
  size = 16,
  color = 'currentColor',
  className = '',
  style
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {/* N vertical bars and diagonal */}
      <line x1="6" y1="4" x2="6" y2="20" />
      <line x1="6" y1="4" x2="18" y2="20" />
      <line x1="18" y1="4" x2="18" y2="20" />
      {/* Naira double horizontal strike-through */}
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="3.5" y1="14" x2="20.5" y2="14" />
    </svg>
  );
};
