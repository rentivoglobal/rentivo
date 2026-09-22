import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles, ArrowRight, X } from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  actionText?: string;
  onAction?: () => void;
}

interface OnboardingWidgetProps {
  steps: OnboardingStep[];
  onDismiss?: () => void;
}

export const OnboardingWidget: React.FC<OnboardingWidgetProps> = ({
  steps,
  onDismiss
}) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return false;
    }
    return true;
  });
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const completedCount = steps.filter(s => s.isCompleted).length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9900,
        maxWidth: isExpanded ? '380px' : '260px',
        width: '100%',
        boxShadow: '0 12px 32px -4px rgba(0, 0, 82, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Widget Header Banner */}
      <div
        style={{
          backgroundColor: '#000052',
          color: '#FFFFFF',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Circular Progress Ring */}
          <div style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0 }}>
            <svg width="28" height="28" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#1B1B68"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#BE89FF"
                strokeWidth="3.5"
                strokeDasharray={`${progressPercent}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 800,
                color: '#BE89FF'
              }}
            >
              {progressPercent}%
            </span>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Lister Setup Guide</span>
              <Sparkles size={12} color="#BE89FF" />
            </div>
            <div style={{ fontSize: '10px', color: '#C7D2FE' }}>
              {completedCount} of {totalCount} completed
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#CBD5E1',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isExpanded ? 'Collapse checklist' : 'Expand checklist'}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
              if (onDismiss) onDismiss();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Dismiss checklist"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expanded Checklist Steps */}
      {isExpanded && (
        <div style={{ padding: '16px', maxHeight: '320px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {steps.map((step, idx) => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: step.isCompleted ? '#F8FAFC' : '#FAF5FF',
                  border: `1px solid ${step.isCompleted ? '#E2E8F0' : '#E9D5FF'}`
                }}
              >
                <div style={{ marginTop: '2px', flexShrink: 0 }}>
                  {step.isCompleted ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : (
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '9999px',
                        backgroundColor: '#6B21A8',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {idx + 1}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: step.isCompleted ? '#64748B' : '#000052',
                      textDecoration: step.isCompleted ? 'line-through' : 'none'
                    }}
                  >
                    {step.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                    {step.description}
                  </div>

                  {!step.isCompleted && step.actionText && step.onAction && (
                    <button
                      type="button"
                      onClick={step.onAction}
                      style={{
                        marginTop: '6px',
                        backgroundColor: '#BE89FF',
                        color: '#000052',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{step.actionText}</span>
                      <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
