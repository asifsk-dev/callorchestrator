import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import useCallStore from '../../store/callStore.js';
import MessageBubble from './MessageBubble.jsx';
import TypingIndicator from './TypingIndicator.jsx';

export function ConversationView() {
  const messages = useCallStore((state) => state.messages);
  const activeAgent = useCallStore((state) => state.activeAgent);
  const callStatus = useCallStore((state) => state.callStatus);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, activeAgent]);

  const hasStreamingMessage = messages.some((m) => m.isStreaming && m.role === 'assistant');
  const showTypingIndicator = activeAgent === 'llm' && !hasStreamingMessage;
  const isEmpty = messages.length === 0 && !showTypingIndicator;

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#1e2840] flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-brand" />
        <span className="text-sm font-semibold text-slate-200">Call Transcript</span>
        {messages.length > 0 && (
          <span className="ml-auto text-[10px] text-slate-500 bg-[#161c2d] px-2 py-0.5 rounded-full border border-[#1e2840] font-mono">
            {messages.length}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-[#161c2d] border border-[#1e2840] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-slate-500 text-xs">
              {callStatus === 'idle' || callStatus === 'ended'
                ? 'Start a call to see the transcript'
                : 'Waiting for conversation...'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {showTypingIndicator && <TypingIndicator />}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationView;
