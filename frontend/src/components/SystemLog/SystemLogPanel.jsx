import React, { useEffect, useRef } from 'react';
import { Terminal, Eye, EyeOff, Trash2 } from 'lucide-react';
import useCallStore from '../../store/callStore.js';
import LogEntry from './LogEntry.jsx';

export function SystemLogPanel() {
  const logs = useCallStore((state) => state.logs);
  const logsVisible = useCallStore((state) => state.logsVisible);
  const toggleLogs = useCallStore((state) => state.toggleLogs);
  const clearLogs = useCallStore((state) => state.clearLogs);
  const bottomRef = useRef(null);

  // Auto-scroll to the latest log entry when visible
  useEffect(() => {
    if (logsVisible && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs, logsVisible]);

  return (
    <div className="flex flex-col bg-surface rounded-2xl border border-border-subtle panel-glow overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Terminal className="w-4 h-4 text-brand flex-shrink-0" />
        <span className="text-sm font-medium text-slate-200">System Log</span>

        {logs.length > 0 && (
          <span className="text-xs text-slate-500 bg-surface-elevated px-2 py-0.5 rounded-full border border-border-subtle font-mono">
            {logs.length}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Clear button */}
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-red-500/50"
              title="Clear logs"
              aria-label="Clear system logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Toggle visibility button */}
          <button
            onClick={toggleLogs}
            className="p-1.5 rounded-lg text-slate-500 hover:text-brand hover:bg-brand/10 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-brand/50"
            title={logsVisible ? 'Hide logs' : 'Show logs'}
            aria-label={logsVisible ? 'Hide system logs' : 'Show system logs'}
          >
            {logsVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Log content — collapsible */}
      {logsVisible && (
        <div className="border-t border-border-subtle">
          <div
            className="overflow-y-auto px-4 py-2"
            style={{ maxHeight: '240px' }}
          >
            {logs.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs text-slate-600">No log entries yet</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border-subtle/50">
                {logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
                <div ref={bottomRef} className="h-1" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemLogPanel;
