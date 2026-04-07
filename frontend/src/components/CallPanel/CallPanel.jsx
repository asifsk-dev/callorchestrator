import React from 'react';
import { Phone, PhoneOff, Mic, Brain, Volume2, Check } from 'lucide-react';
import useCallStore from '../../store/callStore.js';

// ─── Agent pipeline row config ────────────────────────────────────────────────
const PIPELINE = [
  {
    key: 'stt',
    label: 'STT',
    fullLabel: 'Speech to Text',
    Icon: Mic,
    activeText: 'Transcribing...',
    idleText: 'Idle',
    doneText: 'Done',
    accentColor: '#06b6d4',
    accentClass: 'text-cyan-400',
    borderActive: 'border-l-cyan-400',
    bgActive: 'bg-cyan-500/5',
    dotColor: 'bg-cyan-400',
  },
  {
    key: 'llm',
    label: 'LLM',
    fullLabel: 'Language Model',
    Icon: Brain,
    activeText: 'Generating...',
    idleText: 'Idle',
    doneText: 'Done',
    accentColor: '#6366f1',
    accentClass: 'text-indigo-400',
    borderActive: 'border-l-indigo-400',
    bgActive: 'bg-indigo-500/5',
    dotColor: 'bg-indigo-400',
  },
  {
    key: 'tts',
    label: 'TTS',
    fullLabel: 'Text to Speech',
    Icon: Volume2,
    activeText: 'Speaking...',
    idleText: 'Idle',
    doneText: 'Done',
    accentColor: '#8b5cf6',
    accentClass: 'text-purple-400',
    borderActive: 'border-l-purple-400',
    bgActive: 'bg-purple-500/5',
    dotColor: 'bg-purple-400',
  },
];

function formatMs(ms) {
  if (ms == null) return null;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function AgentRow({ cfg, isActive, isDone, timing }) {
  const { label, fullLabel, Icon, activeText, idleText, accentClass, borderActive, bgActive, dotColor } = cfg;

  const statusText = isActive ? cfg.activeText : isDone ? cfg.doneText : idleText;
  const timingLabel = isDone && timing ? formatMs(timing.durationMs) : null;

  return (
    <div
      className={[
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-2 transition-all duration-300',
        isActive
          ? `${borderActive} ${bgActive} border-l-2`
          : isDone
          ? 'border-l-emerald-500/60 bg-emerald-500/5'
          : 'border-l-transparent bg-transparent',
      ].join(' ')}
    >
      {/* Icon */}
      <div className="relative flex-shrink-0">
        {isActive && (
          <span
            className={`absolute -inset-1.5 rounded-full animate-ping opacity-40 ${dotColor}`}
          />
        )}
        <div
          className={[
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300',
            isActive
              ? `bg-current/10 ${accentClass}`
              : isDone
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-slate-800/60 text-slate-600',
          ].join(' ')}
        >
          {isDone ? (
            <Check className="w-4 h-4 text-emerald-400 relative z-10" />
          ) : (
            <Icon className="w-4 h-4 relative z-10" />
          )}
        </div>
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-semibold leading-tight transition-colors duration-300 ${
            isActive ? accentClass : isDone ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {label}
        </p>
        <p
          className={`text-[10px] mt-0.5 font-mono transition-colors duration-300 ${
            isActive ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {statusText}
        </p>
      </div>

      {/* Timing badge + checkmark */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {timingLabel && (
          <span className="text-[10px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
            {timingLabel}
          </span>
        )}
        {isActive && (
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
        )}
        {isDone && (
          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

export function CallPanel({ onStartCall, onEndCall }) {
  const callStatus = useCallStore((state) => state.callStatus);
  const activeAgent = useCallStore((state) => state.activeAgent);
  const agentTimings = useCallStore((state) => state.agentTimings);

  const showStart = callStatus === 'idle' || callStatus === 'ended';
  const showEnd = ['ringing', 'active', 'listening', 'processing', 'speaking'].includes(callStatus);

  // Most recent timing per agent
  const lastTimingByAgent = agentTimings.reduce((acc, t) => {
    acc[t.agent] = t;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-0 h-full bg-[#0d1117] overflow-hidden">
      {/* Top bar: logo + status */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shadow-lg shadow-indigo-900/40 flex-shrink-0">
            <span className="text-white text-xs font-bold">CO</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">CallOrchestrator</p>
            <p className="text-[10px] text-slate-500 leading-tight">AI Voice Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-[10px] text-emerald-400 font-medium">System Online</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-[#1e2840]" />

      {/* Call control button */}
      <div className="px-4 py-4">
        {showStart && (
          <button
            onClick={onStartCall}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-lg shadow-emerald-900/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#111520]"
          >
            <Phone className="w-4 h-4" />
            {callStatus === 'ended' ? 'New Call' : 'Start Call'}
          </button>
        )}

        {showEnd && (
          <button
            onClick={onEndCall}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-lg shadow-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#111520]"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </button>
        )}

        {callStatus === 'ringing' && (
          <p className="text-xs text-yellow-400/80 text-center mt-2 font-mono animate-pulse">
            Connecting to Aria...
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-[#1e2840]" />

      {/* Real-time Agent Pipeline */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Real-time Agent Pipeline
          </span>
          {/* Visual toggle — always on */}
          <div className="flex items-center gap-1">
            <div className="w-7 h-4 rounded-full bg-brand/60 flex items-center px-0.5">
              <div className="w-3 h-3 rounded-full bg-white ml-auto shadow" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {PIPELINE.map((cfg) => {
            const isActive = activeAgent === cfg.key;
            const timing = lastTimingByAgent[cfg.key];
            // isDone: had activity in this call, and is no longer active
            const isCallActive = !['idle', 'ended'].includes(callStatus);
            const isDone = !isActive && timing != null && isCallActive;

            return (
              <AgentRow
                key={cfg.key}
                cfg={cfg}
                isActive={isActive}
                isDone={isDone}
                timing={timing}
              />
            );
          })}
        </div>
      </div>

      {/* Spacer pushes logs to bottom */}
      <div className="flex-1" />

      {/* System Logs (embedded at bottom) */}
      <SystemLogsSection />
    </div>
  );
}

// ─── Embedded System Logs ──────────────────────────────────────────────────────
function SystemLogsSection() {
  const logs = useCallStore((state) => state.logs);
  const logsVisible = useCallStore((state) => state.logsVisible);
  const toggleLogs = useCallStore((state) => state.toggleLogs);

  const LEVEL_DOT = {
    info: 'bg-emerald-400',
    warn: 'bg-yellow-400',
    error: 'bg-red-400',
  };

  function formatLogTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '--:--';
    }
  }

  const visibleLogs = logs.slice(-6).reverse();

  return (
    <div className="border-t border-[#1e2840]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-1">
          System Logs
        </span>
        {logs.length > 0 && (
          <span className="text-[10px] text-slate-600 font-mono bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
            {logs.length}
          </span>
        )}
        {/* Toggle switch */}
        <button
          onClick={toggleLogs}
          className="focus:outline-none"
          aria-label={logsVisible ? 'Hide system logs' : 'Show system logs'}
          title={logsVisible ? 'Hide logs' : 'Show logs'}
        >
          <div
            className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors duration-200 ${
              logsVisible ? 'bg-brand/70' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${
                logsVisible ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </button>
      </div>

      {/* Log list — collapsible */}
      {logsVisible && (
        <div className="px-4 pb-3 max-h-40 overflow-y-auto">
          {visibleLogs.length === 0 ? (
            <p className="text-[10px] text-slate-600 py-2 text-center">No log entries yet</p>
          ) : (
            <div className="flex flex-col gap-1">
              {visibleLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 py-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                      LEVEL_DOT[log.level] ?? 'bg-slate-500'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 font-mono leading-relaxed flex-1 break-all">
                    {log.message}
                  </span>
                  <span className="text-[9px] text-slate-700 font-mono whitespace-nowrap flex-shrink-0 mt-0.5">
                    {formatLogTime(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CallPanel;
