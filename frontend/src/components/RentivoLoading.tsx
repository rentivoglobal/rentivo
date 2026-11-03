import React, { useState, useEffect } from 'react';
import '../styles/loading.css';

interface RentivoLoadingProps {
  message?: string;
  isFullScreen?: boolean;
}

const STATUS_MESSAGES = [
  'Verifying property details in Ibadan…',
  'Checking on-site inspection timestamps…',
  'Confirming direct lister credentials…',
  'Preparing authentic high-res photos…',
  'Certifying flat access fee terms…'
];

export const RentivoLoading: React.FC<RentivoLoadingProps> = ({
  message = 'Loading verified property…',
  isFullScreen = true
}) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`rentivo-loader-container ${isFullScreen ? 'rentivo-loader-container--full' : ''}`} role="status" aria-live="polite">
      <div className="rentivo-loader-stage">
        {/* Radar concentric pulses */}
        <div className="rentivo-loader-radar" aria-hidden="true">
          <div className="rentivo-loader-ring" />
          <div className="rentivo-loader-ring" />
          <div className="rentivo-loader-ring" />
        </div>

        {/* Central badge core with animated architectural house SVG */}
        <div className="rentivo-loader-core" aria-hidden="true">
          <svg
            className="rentivo-loader-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Architectural house outline with chimney and door */}
            <path d="M3 10.5L12 3l9 7.5v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z" />
            <polyline points="9 21 9 13 15 13 15 21" />
            <path d="M18 6.5V4h-2v4.5" />
          </svg>
        </div>
      </div>

      <h2 className="rentivo-loader-title">{message}</h2>

      <div className="rentivo-loader-sub" key={msgIndex}>
        <span className="rentivo-loader-sub-dot" />
        <span>{STATUS_MESSAGES[msgIndex]}</span>
      </div>

      <div className="rentivo-loader-track" aria-hidden="true">
        <div className="rentivo-loader-bar" />
      </div>
    </div>
  );
};
