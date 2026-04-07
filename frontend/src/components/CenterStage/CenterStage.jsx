import React from 'react';
import { PhoneOff, Mic, Brain, Volume2 } from 'lucide-react';
import useCallStore from '../../store/callStore.js';
import WaveformAnimation from '../CallPanel/WaveformAnimation.jsx';
import CallTimer from '../CallPanel/CallTimer.jsx';

// ─── Agent pill config ────────────────────────────────────────────────────────
const PILLS = [
  {
    key: 'stt',
    label: 'STT',
    Icon: Mic,
    activeText: 'Transcribing',
    idleText: 'Idle',
    doneText: 'Done',
    glowClass: 'shadow-cyan-500/40',
    activeClass: 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300',
    doneClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
    idleClass: 'bg-[#161c2d] border-[#1e2840] text-slate-600',
  },
  {
    key: 'llm',
    label: 'LLM',
    Icon: Brain,
    activeText: 'Generating',
    idleText: 'Idle',
    doneText: 'Done',
    glowClass: 'shadow-indigo-500/40',
    activeClass: 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300',
    doneClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
    idleClass: 'bg-[#161c2d] border-[#1e2840] text-slate-600',
  },
  {
    key: 'tts',
    label: 'TTS',
    Icon: Volume2,
    activeText: 'Speaking',
    idleText: 'Idle',
    doneText: 'Done',
    glowClass: 'shadow-purple-500/40',
    activeClass: 'bg-purple-500/15 border-purple-500/50 text-purple-300',
    doneClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
    idleClass: 'bg-[#161c2d] border-[#1e2840] text-slate-600',
  },
];

function formatMs(ms) {
  if (ms == null) return null;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function AgentPill({ pill, isActive, isDone, timing }) {
  const { label, Icon, activeText, idleText, doneText, glowClass, activeClass, doneClass, idleClass } = pill;

  const stateClass = isActive ? activeClass : isDone ? doneClass : idleClass;
  const statusText = isActive ? activeText : isDone ? doneText : idleText;
  const timingLabel = isDone && timing ? formatMs(timing.durationMs) : null;

  return (
    <div
      className={[
        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 min-w-0',
        stateClass,
        isActive ? `shadow-lg ${glowClass}` : '',
      ].join(' ')}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-semibold leading-tight">{label}</span>
        <span className="text-[9px] font-mono opacity-70 leading-tight whitespace-nowrap">
          {timingLabel ? timingLabel : statusText}
        </span>
      </div>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-current flex-shrink-0" />
      )}
    </div>
  );
}

export function CenterStage({ onEndCall }) {
  const callStatus = useCallStore((state) => state.callStatus);
  const activeAgent = useCallStore((state) => state.activeAgent);
  const agentTimings = useCallStore((state) => state.agentTimings);

  const isCallLive = ['ringing', 'active', 'listening', 'processing', 'speaking'].includes(callStatus);
  const isCallActive = !['idle', 'ended'].includes(callStatus);

  // Most recent timing per agent
  const lastTimingByAgent = agentTimings.reduce((acc, t) => {
    acc[t.agent] = t;
    return acc;
  }, {});

  return (
    <div className="flex flex-col items-center justify-between h-full bg-[#0a0d14] px-4 py-6 gap-4 overflow-hidden">
      {/* Top status bar */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <div className="flex items-center gap-2">
          {isCallLive && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="text-sm font-medium text-slate-200">
                AI Agent &mdash; Aria
              </span>
              <span className="text-xs text-slate-500">· On Call</span>
            </>
          )}
          {!isCallLive && (
            <span className="text-sm text-slate-600">
              {callStatus === 'idle' ? 'Ready to connect' : 'Call ended'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          System Online
        </div>
      </div>

      {/* Waveform — center stage hero */}
      <div className="flex-1 flex items-center justify-center">
        <WaveformAnimation />
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center gap-1">
        <CallTimer />
        {isCallLive && (
          <p className="text-[11px] text-slate-500 font-mono">
            Call Agent &mdash; Aria · On Call
          </p>
        )}
      </div>

      {/* Agent pills row */}
      <div className="flex items-center gap-2 w-full max-w-sm justify-center">
        {PILLS.map((pill, idx) => {
          const isActive = activeAgent === pill.key;
          const timing = lastTimingByAgent[pill.key];
          const isDone = !isActive && timing != null && isCallActive;

          return (
            <React.Fragment key={pill.key}>
              <AgentPill
                pill={pill}
                isActive={isActive}
                isDone={isDone}
                timing={timing}
              />
              {idx < PILLS.length - 1 && (
                <div className="w-px h-6 bg-[#1e2840] flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* End call icon button (compact) */}
      {isCallLive && onEndCall && (
        <button
          onClick={onEndCall}
          className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          title="End call"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          End Call
        </button>
      )}

      {/* Idle hint */}
      {!isCallLive && (
        <p className="text-xs text-slate-600 text-center">
          {callStatus === 'idle'
            ? 'Start a call from the left panel'
            : 'Call ended — start a new one from the left panel'}
        </p>
      )}
    </div>
  );
}

export default CenterStage;
