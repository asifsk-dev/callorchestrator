import React from 'react';

const LEVEL_CONFIG = {
  info: {
    badgeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    label: 'INFO',
  },
  warn: {
    badgeClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    label: 'WARN',
  },
  error: {
    badgeClass: 'text-red-400 bg-red-500/10 border-red-500/20',
    label: 'ERR',
  },
};

function formatLogTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
}

export function LogEntry({ log }) {
  const { level, message, timestamp } = log;
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.info;

  return (
    <div className="flex items-start gap-2 py-1 group">
      {/* Timestamp */}
      <span className="text-[10px] text-slate-700 font-mono whitespace-nowrap mt-0.5 flex-shrink-0 group-hover:text-slate-600 transition-colors">
        {formatLogTime(timestamp)}
      </span>

      {/* Level badge */}
      <span
        className={`text-[9px] font-semibold px-1 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 mt-0.5 font-mono ${config.badgeClass}`}
      >
        {config.label}
      </span>

      {/* Message */}
      <span className="text-[11px] text-slate-400 font-mono leading-relaxed break-all group-hover:text-slate-300 transition-colors">
        {message}
      </span>
    </div>
  );
}

export default LogEntry;
