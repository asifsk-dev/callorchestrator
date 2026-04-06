import React from 'react';
import useCall from '../hooks/useCall.js';
import CallPanel from '../components/CallPanel/CallPanel.jsx';
import ConversationView from '../components/ConversationView/ConversationView.jsx';
import AgentActivityPanel from '../components/AgentActivity/AgentActivityPanel.jsx';
import SystemLogPanel from '../components/SystemLog/SystemLogPanel.jsx';

export function CallPage() {
  const {
    handleStartCall,
    handleEndCall,
    handleUserSpeakStart,
    handleUserSpeakStop,
  } = useCall();

  return (
    <div className="min-h-screen bg-[#0f1117] bg-grid text-slate-100 font-sans">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-600/5 blur-[100px]" />
      </div>

      {/* Main layout */}
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Top nav bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <span className="text-white text-sm font-bold">CO</span>
            </div>
            <div>
              <span className="text-white font-semibold text-sm">CallOrchestrator</span>
              <span className="text-slate-600 text-xs ml-2">v1.0</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column: Call controls + Agent activity */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            <CallPanel
              onStartCall={handleStartCall}
              onEndCall={handleEndCall}
              onSpeakStart={handleUserSpeakStart}
              onSpeakStop={handleUserSpeakStop}
            />
            <AgentActivityPanel />
          </div>

          {/* Right column: Conversation view */}
          <div className="lg:col-span-2" style={{ minHeight: '600px' }}>
            <div className="h-full" style={{ minHeight: '600px' }}>
              <ConversationView />
            </div>
          </div>
        </div>

        {/* System log — full width below */}
        <div className="mt-4">
          <SystemLogPanel />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-700">
          CallOrchestrator &mdash; AI Voice Agent Platform &bull; Built with MAOS
        </div>
      </div>
    </div>
  );
}

export default CallPage;
