import React from 'react';
import { Phone, PhoneOff, PhoneCall, Mic } from 'lucide-react';
import useCallStore from '../../store/callStore.js';
import StatusBadge from '../common/StatusBadge.jsx';
import WaveformAnimation from './WaveformAnimation.jsx';
import CallTimer from './CallTimer.jsx';

export function CallPanel({ onStartCall, onEndCall, onSpeakStart, onSpeakStop }) {
  const callStatus = useCallStore((state) => state.callStatus);

  const showStartButton = callStatus === 'idle' || callStatus === 'ended';
  const showEndButton = callStatus === 'active' || callStatus === 'listening' || callStatus === 'processing' || callStatus === 'speaking';
  const showRinging = callStatus === 'ringing';
  const showMicButton = callStatus === 'active';

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-surface rounded-2xl border border-border-subtle panel-glow transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 w-full">
        <div className="p-2 bg-brand/10 rounded-xl border border-brand/20">
          <Phone className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-base leading-tight tracking-tight">
            CallOrchestrator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">AI Voice Agent</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={callStatus} />
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-border-subtle" />

      {/* Waveform */}
      <WaveformAnimation />

      {/* Timer */}
      <CallTimer />

      {/* Ringing indicator */}
      {showRinging && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center animate-pulse">
              <PhoneCall className="w-7 h-7 text-yellow-400" />
            </div>
            <span className="absolute -inset-2 rounded-full border-2 border-yellow-500/20 animate-ping" />
          </div>
          <p className="text-yellow-400 text-sm font-medium">Connecting...</p>
        </div>
      )}

      {/* Call controls */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Start Call button */}
        {showStartButton && (
          <button
            onClick={onStartCall}
            className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-emerald-900/30 hover:shadow-emerald-800/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-surface"
          >
            <Phone className="w-4 h-4" />
            {callStatus === 'ended' ? 'New Call' : 'Start Call'}
          </button>
        )}

        {/* End Call button */}
        {showEndButton && (
          <button
            onClick={onEndCall}
            className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-red-900/30 hover:shadow-red-800/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </button>
        )}

        {/* Mic button — hold to speak */}
        {showMicButton && (
          <button
            onMouseDown={onSpeakStart}
            onMouseUp={onSpeakStop}
            onMouseLeave={onSpeakStop}
            onTouchStart={(e) => { e.preventDefault(); onSpeakStart(); }}
            onTouchEnd={(e) => { e.preventDefault(); onSpeakStop(); }}
            className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-brand hover:bg-brand-dark active:bg-brand-dark text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/30 hover:shadow-indigo-800/40 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-surface select-none cursor-pointer"
            style={{ WebkitUserSelect: 'none', touchAction: 'none' }}
          >
            <Mic className="w-4 h-4" />
            Hold to Speak
          </button>
        )}
      </div>

      {/* Hint text */}
      {callStatus === 'idle' && (
        <p className="text-xs text-slate-600 text-center">
          Press Start Call to connect with the AI agent
        </p>
      )}
      {callStatus === 'active' && (
        <p className="text-xs text-slate-500 text-center">
          Hold the mic button while speaking, release to send
        </p>
      )}
    </div>
  );
}

export default CallPanel;
