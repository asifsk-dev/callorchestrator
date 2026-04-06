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

  // Auto-scroll to bottom whenever messages change or tokens arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, activeAgent]);

  // Show typing indicator when LLM is active and no streaming message is present yet
  const hasStreamingMessage = messages.some((m) => m.isStreaming && m.role === 'assistant');
  const showTypingIndicator = activeAgent === 'llm' && !hasStreamingMessage;

  const isEmpty = messages.length === 0 && !showTypingIndicator;

  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border-subtle panel-glow overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand" />
          <span className="text-sm font-medium text-slate-200">Conversation</span>
        </div>
        {messages.length > 0 && (
          <span className="text-xs text-slate-500 bg-surface-elevated px-2 py-0.5 rounded-full border border-border-subtle">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">No messages yet</p>
              <p className="text-slate-600 text-xs mt-1">
                {callStatus === 'idle' || callStatus === 'ended'
                  ? 'Start a call to begin the conversation'
                  : 'Waiting for activity...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
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
