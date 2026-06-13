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
          className: 'border-border-neon-gold bg-neon-gold/8 text-neon-gold hover:shadow-[0_0_10px_rgba(255,184,0,0.15)]',
          nextStatus: 'skipped'
        };
      case 'skipped':
        return {
          label: 'Skipped',
          icon: '⏭',
          className: 'border-neon-purple bg-neon-purple/8 text-neon-purple hover:shadow-[0_0_10px_rgba(157,78,221,0.15)]',
          nextStatus: 'unwatched'
        };
      case 'unwatched':
      default:
        return {
          label: 'Unwatched',
          icon: '⭕',
          className: 'border-border-color text-text-secondary hover:border-neon-cyan hover:text-neon-cyan hover:bg-neon-cyan/5',
          nextStatus: 'watched'
        };
    }
  };

  const { label, icon, className, nextStatus } = getStatusDetails();

  return (
    <button
      className={`font-sans text-[11px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-transparent cursor-pointer transition-all duration-300 hover:bg-white/3 ${className}`}
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
