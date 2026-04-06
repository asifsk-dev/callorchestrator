import React from 'react';

function formatTime(isoString) {
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

export function MessageBubble({ message }) {
  const { role, content, timestamp, isStreaming } = message;
  const isUser = role === 'user';

  return (
    <div
      className={`flex animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center mr-2 mt-0.5">
          <span className="text-brand text-xs font-bold">AI</span>
        </div>
      )}

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div
          className={[
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
            isUser
              ? 'bg-brand text-white rounded-tr-sm'
              : 'bg-[#1e2130] text-slate-200 rounded-tl-sm border border-border-subtle',
          ].join(' ')}
        >
          <span>
            {content}
          </span>
          {isStreaming && (
            <span className="typewriter-cursor" aria-hidden="true" />
          )}
        </div>
        <span className="text-[10px] text-slate-600 mt-1 px-1 font-mono">
          {formatTime(timestamp)}
        </span>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center ml-2 mt-0.5">
          <span className="text-slate-300 text-xs font-bold">U</span>
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
