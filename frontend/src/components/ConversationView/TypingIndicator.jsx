import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3 animate-fadeIn">
      {/* AI avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center mr-2 mt-0.5">
        <span className="text-brand text-xs font-bold">AI</span>
      </div>

      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1e2130] border border-border-subtle">
        <div className="flex items-center gap-1.5" aria-label="AI is typing">
          <span className="bounce-dot w-2 h-2 rounded-full bg-slate-400" />
          <span className="bounce-dot w-2 h-2 rounded-full bg-slate-400" />
          <span className="bounce-dot w-2 h-2 rounded-full bg-slate-400" />
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
