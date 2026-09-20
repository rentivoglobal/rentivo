import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction
}) => {
  return (
    <div
      style={{
        border: '1px dashed #CBD5E1',
        borderRadius: '16px',
        padding: '48px 32px',
        textAlign: 'center',
        backgroundColor: '#FAFBFD',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '16px 0'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          backgroundColor: '#EEF2FF',
          color: '#4F46E5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 2px 6px rgba(79, 70, 229, 0.1)'
        }}
      >
        {icon}
      </div>

      <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#000052', margin: '0 0 6px' }}>
        {title}
      </h3>
      <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 0 20px', lineHeight: 1.5 }}>
        {description}
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionText && (
          <button
            type="button"
            onClick={onAction}
            style={{
              backgroundColor: '#000052',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '9999px',
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 82, 0.15)',
              transition: 'background 0.15s ease'
            }}
          >
            {actionText}
          </button>
        )}

        {secondaryActionText && (
          <button
            type="button"
            onClick={onSecondaryAction}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '9999px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {secondaryActionText}
          </button>
        )}
      </div>
    </div>
  );
};
