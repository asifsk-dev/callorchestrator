import React from 'react';
import useCallStore from '../../store/callStore.js';

const VISIBLE_STATUSES = new Set(['active', 'listening', 'processing', 'speaking']);

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CallTimer() {
  const callStatus = useCallStore((state) => state.callStatus);
  const callDuration = useCallStore((state) => state.callDuration);

  if (!VISIBLE_STATUSES.has(callStatus)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-emerald-400 font-mono text-lg font-semibold tabular-nums">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      {formatDuration(callDuration)}
    </div>
  );
}

export default CallTimer;
