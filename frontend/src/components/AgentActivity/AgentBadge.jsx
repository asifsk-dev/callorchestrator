import React from 'react';
import { Mic, Cpu, Volume2, Check } from 'lucide-react';

const AGENT_CONFIG = {
  stt: {
    label: 'STT',
    fullLabel: 'Speech to Text',
    Icon: Mic,
    color: 'text-blue-400',
    bgActive: 'bg-blue-500/10 border-blue-500/30',
    bgDone: 'bg-emerald-500/10 border-emerald-500/30',
    dotActive: 'bg-blue-400',
  },
  llm: {
    label: 'LLM',
    fullLabel: 'Language Model',
    Icon: Cpu,
    color: 'text-indigo-400',
    bgActive: 'bg-indigo-500/10 border-indigo-500/30',
    bgDone: 'bg-emerald-500/10 border-emerald-500/30',
    dotActive: 'bg-indigo-400',
  },
  tts: {
    label: 'TTS',
    fullLabel: 'Text to Speech',
    Icon: Volume2,
    color: 'text-purple-400',
    bgActive: 'bg-purple-500/10 border-purple-500/30',
    bgDone: 'bg-emerald-500/10 border-emerald-500/30',
    dotActive: 'bg-purple-400',
  },
};

export function AgentBadge({ agent, isActive, lastTiming }) {
  const config = AGENT_CONFIG[agent];
  if (!config) return null;

  const { label, fullLabel, Icon } = config;
  const isDone = !isActive && lastTiming != null;

  let containerClass = 'bg-surface-elevated border-border-subtle text-slate-500';
  if (isActive) containerClass = `${config.bgActive} ${config.color}`;
  if (isDone) containerClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';

  return (
    <div
      className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all duration-300 min-w-[72px] ${containerClass}`}
      title={fullLabel}
    >
      <div className="relative">
        {isActive && (
          <span className={`absolute -inset-1.5 rounded-full animate-ping opacity-40 ${config.dotActive}`} />
        )}
        {isDone ? (
          <Check className="w-4 h-4 text-emerald-400 relative z-10" />
        ) : (
          <Icon className={`w-4 h-4 relative z-10 ${isActive ? config.color : 'text-slate-600'}`} />
        )}
      </div>

      <span className="text-xs font-semibold tracking-wide">{label}</span>

      {isActive && (
        <span className="text-[10px] text-current opacity-70 font-medium">Active</span>
      )}
      {isDone && lastTiming && (
        <span className="text-[10px] text-emerald-400/70 font-mono">
          {lastTiming.durationMs < 1000
            ? `${lastTiming.durationMs}ms`
            : `${(lastTiming.durationMs / 1000).toFixed(1)}s`}
        </span>
      )}
      {!isActive && !isDone && (
        <span className="text-[10px] text-slate-600">Idle</span>
      )}
    </div>
  );
}

export default AgentBadge;
