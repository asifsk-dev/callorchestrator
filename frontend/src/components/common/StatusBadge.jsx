import React from 'react';

const STATUS_CONFIG = {
  idle: {
    label: 'Idle',
    classes: 'bg-gray-700/50 text-gray-400 border-gray-600/50',
    dot: 'bg-gray-500',
    pulse: false,
  },
  ringing: {
    label: 'Ringing...',
    classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    dot: 'bg-yellow-400',
    pulse: true,
  },
  active: {
    label: 'Live',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
    pulse: true,
    pulseClass: 'animate-pulse-slow',
  },
  listening: {
    label: 'Listening...',
    classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
    pulse: true,
  },
  processing: {
    label: 'Processing...',
    classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    dot: 'bg-indigo-400',
    pulse: true,
  },
  speaking: {
    label: 'Speaking...',
    classes: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-400',
    pulse: true,
  },
  ended: {
    label: 'Call Ended',
    classes: 'bg-red-500/10 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
    pulse: false,
  },
};

export function StatusBadge({ status = 'idle' }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium tracking-wide transition-all duration-300 ${config.classes}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      {config.label}
    </span>
  );
}

export default StatusBadge;
