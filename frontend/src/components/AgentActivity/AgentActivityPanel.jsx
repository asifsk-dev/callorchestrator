import React from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import useCallStore from '../../store/callStore.js';
import AgentBadge from './AgentBadge.jsx';

const PIPELINE_AGENTS = ['stt', 'llm', 'tts'];

function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

const AGENT_COLORS = {
  stt: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  llm: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  tts: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export function AgentActivityPanel() {
  const activeAgent = useCallStore((state) => state.activeAgent);
  const agentTimings = useCallStore((state) => state.agentTimings);
  const callStatus = useCallStore((state) => state.callStatus);

  const isCallActive = callStatus !== 'idle' && callStatus !== 'ended';

  // Get the most recent timing entry for each agent
  const lastTimingByAgent = agentTimings.reduce((acc, timing) => {
    acc[timing.agent] = timing;
    return acc;
  }, {});

  // Recent timings — last 10
  const recentTimings = agentTimings.slice(-10).reverse();

  return (
    <div className="flex flex-col bg-surface rounded-2xl border border-border-subtle panel-glow overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle flex-shrink-0">
        <Activity className="w-4 h-4 text-brand" />
        <span className="text-sm font-medium text-slate-200">Agent Pipeline</span>
        {activeAgent && (
          <span className="ml-auto text-xs text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20 animate-pulse">
            Running
          </span>
        )}
      </div>

      {/* Pipeline badges */}
      <div className="px-4 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-1">
          {PIPELINE_AGENTS.map((agent, idx) => (
            <React.Fragment key={agent}>
              <AgentBadge
                agent={agent}
                isActive={activeAgent === agent}
                lastTiming={lastTimingByAgent[agent]}
              />
              {idx < PIPELINE_AGENTS.length - 1 && (
                <ChevronRight
                  className={`w-4 h-4 flex-shrink-0 transition-colors duration-300 ${
                    activeAgent && PIPELINE_AGENTS.indexOf(activeAgent) > idx
                      ? 'text-brand'
                      : 'text-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border-subtle flex-shrink-0" />

      {/* Recent timings list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0" style={{ maxHeight: '180px' }}>
        {recentTimings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <p className="text-xs text-slate-600 text-center">
              {isCallActive
                ? 'Waiting for agent activity...'
                : 'No activity recorded yet'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mb-1">
              Recent Activity
            </p>
            {recentTimings.map((timing, idx) => (
              <div
                key={`${timing.timestamp}-${idx}`}
                className="flex items-center gap-2 py-1"
              >
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide ${
                    AGENT_COLORS[timing.agent] ?? 'text-slate-400 bg-slate-700/50 border-slate-600/50'
                  }`}
                >
                  {timing.agent}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {timing.durationMs < 1000
                    ? `${timing.durationMs}ms`
                    : `${(timing.durationMs / 1000).toFixed(2)}s`}
                </span>
                <span className="text-[10px] text-slate-700 ml-auto font-mono">
                  {formatTimestamp(timing.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentActivityPanel;
