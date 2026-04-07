import React from 'react';
import useCall from '../hooks/useCall.js';
import CallPanel from '../components/CallPanel/CallPanel.jsx';
import CenterStage from '../components/CenterStage/CenterStage.jsx';
import ConversationView from '../components/ConversationView/ConversationView.jsx';

export function CallPage() {
  const { handleStartCall, handleEndCall } = useCall();

  return (
    <div className="h-screen flex flex-col bg-[#0a0d14] text-slate-100 font-sans overflow-hidden">
      {/* ── Top nav bar ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#1e2840] bg-[#0d1117] flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <span className="text-white text-xs font-bold">CO</span>
          </div>
          <span className="text-white font-semibold text-sm">CallOrchestrator</span>
          <span className="text-slate-600 text-xs">v1.0</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          System Online
        </div>
      </header>

      {/* ── 3-column body ───────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: call controls + pipeline + logs */}
        <aside className="w-[280px] flex-shrink-0 border-r border-[#1e2840] overflow-y-auto">
          <CallPanel onStartCall={handleStartCall} onEndCall={handleEndCall} />
        </aside>

        {/* Center: waveform hero */}
        <main className="flex-1 min-w-0 overflow-hidden">
          <CenterStage onEndCall={handleEndCall} />
        </main>

        {/* Right: transcript */}
        <aside className="w-[340px] flex-shrink-0 border-l border-[#1e2840] overflow-hidden flex flex-col">
          <ConversationView />
        </aside>
      </div>
    </div>
  );
}

export default CallPage;
