import React, { useState, useRef, useEffect } from 'react';

interface PopoverProps {
  trigger: React.ReactNode;
  content: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
  width?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  content,
  align = 'right',
  width = '280px'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [align]: 0,
            width,
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 82, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            zIndex: 9995,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {content(() => setIsOpen(false))}
        </div>
      )}
    </div>
  );
};
