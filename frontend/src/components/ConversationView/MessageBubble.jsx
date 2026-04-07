import React from 'react';

function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function MessageBubble({ message }) {
  const { role, content, timestamp, isStreaming } = message;
  const isUser = role === 'user';

  return (
    <div className="animate-fadeIn px-1 py-1.5">
      {/* Header row: avatar + name + timestamp */}
      <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={[
            'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
            isUser
              ? 'bg-slate-700 border border-slate-600 text-slate-300'
              : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300',
          ].join(' ')}
        >
          {isUser ? 'U' : 'A'}
        </div>

        {/* Name */}
        <span className="text-[11px] font-semibold text-slate-400">
          {isUser ? 'User' : 'Aria'}
        </span>

        {/* Timestamp */}
        <span className={`text-[10px] text-slate-600 font-mono ${isUser ? 'mr-auto' : 'ml-auto'}`}>
          {formatTime(timestamp)}
        </span>
      </div>

      {/* Bubble */}
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={[
            'px-3 py-2 rounded-xl text-[13px] leading-relaxed break-words max-w-[90%]',
            isUser
              ? 'bg-[#1a2035] border border-[#243050] text-slate-200 rounded-tr-sm'
              : 'bg-[#161c2d] border border-[#1e2840] text-slate-200 rounded-tl-sm',
          ].join(' ')}
        >
          {content}
          {isStreaming && <span className="typewriter-cursor" aria-hidden="true" />}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
