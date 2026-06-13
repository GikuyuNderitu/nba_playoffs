import React from 'react';

/**
 * SkipControl Component
 * Cycles game status: 'unwatched' -> 'watched' -> 'skipped' -> 'unwatched' on click.
 */
export default function SkipControl({ status = 'unwatched', onChange }) {
  const getStatusDetails = () => {
    switch (status) {
      case 'watched':
        return {
          label: 'Watched',
          icon: '👁',
          className: 'status-watched',
          nextStatus: 'skipped'
        };
      case 'skipped':
        return {
          label: 'Skipped',
          icon: '⏭',
          className: 'status-skipped',
          nextStatus: 'unwatched'
        };
      case 'unwatched':
      default:
        return {
          label: 'Unwatched',
          icon: '⭕',
          className: 'status-unwatched',
          nextStatus: 'watched'
        };
    }
  };

  const { label, icon, className, nextStatus } = getStatusDetails();

  return (
    <button
      className={`skip-control-btn ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(nextStatus);
      }}
      title={`Cycle to ${nextStatus}`}
      aria-label={`Watch status: ${label}`}
    >
      <span className="control-icon">{icon}</span>
      <span className="control-label">{label}</span>
    </button>
  );
}
