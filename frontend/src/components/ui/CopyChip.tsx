import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyChipProps {
  value: string;
  displayLabel?: string;
  prefix?: string;
}

export const CopyChip: React.FC<CopyChipProps> = ({
  value,
  displayLabel,
  prefix
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: copied ? '#ECFDF5' : '#F1F5F9',
        border: `1px solid ${copied ? '#A7F3D0' : '#CBD5E1'}`,
        color: copied ? '#065F46' : '#475569',
        padding: '2px 7px',
        borderRadius: '5px',
        fontSize: '11px',
        fontFamily: 'ui-monospace, monospace',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
    >
      {prefix && <span style={{ opacity: 0.65 }}>{prefix}</span>}
      <span>{displayLabel || value}</span>
      {copied ? <Check size={11} color="#059669" /> : <Copy size={11} style={{ opacity: 0.6 }} />}
    </button>
  );
};
