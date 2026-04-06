import { useEffect, useRef } from 'react';
import wsService from '../services/wsService.js';
import useCallStore from '../store/callStore.js';

/**
 * Connects the WebSocket service to the Zustand store.
 * Registers handlers for all server→client event types from the architecture.
 * Manages connection lifecycle on mount/unmount.
 */
export function useWebSocket() {
  const {
    setCallStatus,
    setSessionId,
    setActiveAgent,
    addTiming,
    addMessage,
    updateStreamingMessage,
    finalizeMessage,
    addLog,
  } = useCallStore();

  // Track the current streaming message id so llm:token events can target it
  const streamingMsgIdRef = useRef(null);

  useEffect(() => {
    // ── call:status ──────────────────────────────────────────────
    const onCallStatus = ({ status, sessionId }) => {
      setCallStatus(status);
      if (sessionId) setSessionId(sessionId);
      addLog({
        level: 'info',
        message: `Call status changed to: ${status}${sessionId ? ` (session: ${sessionId})` : ''}`,
      });
    };

    // ── agent:active ─────────────────────────────────────────────
    const onAgentActive = ({ agent }) => {
      setActiveAgent(agent);
      addLog({ level: 'info', message: `Agent active: ${agent.toUpperCase()}` });
    };

    // ── agent:done ───────────────────────────────────────────────
    const onAgentDone = ({ agent, durationMs, transcript }) => {
      setActiveAgent(null);
      addTiming({ agent, durationMs });
      addLog({
        level: 'info',
        message: `Agent done: ${agent.toUpperCase()} — ${durationMs}ms${transcript ? ` — "${transcript}"` : ''}`,
      });
    };

    // ── llm:token ────────────────────────────────────────────────
    const onLlmToken = ({ token, sessionId }) => {
      if (!streamingMsgIdRef.current) {
        // Create the streaming assistant message on the first token
        const msgId = `stream-${Date.now()}`;
        streamingMsgIdRef.current = msgId;
        addMessage({
          id: msgId,
          role: 'assistant',
          content: token,
          isStreaming: true,
        });
      } else {
        updateStreamingMessage(streamingMsgIdRef.current, token);
      }
    };

    // ── llm:complete ─────────────────────────────────────────────
    const onLlmComplete = ({ response, durationMs, sessionId }) => {
      if (streamingMsgIdRef.current) {
        finalizeMessage(streamingMsgIdRef.current);
        streamingMsgIdRef.current = null;
      } else {
        // No streaming message was created (e.g. empty stream) — add whole response
        addMessage({
          role: 'assistant',
          content: response ?? '',
          isStreaming: false,
        });
      }
      // Note: timing is already recorded by agent:done — do not double-count here
      addLog({ level: 'info', message: `LLM response complete — ${durationMs}ms` });
    };

    // ── session:update ───────────────────────────────────────────
    const onSessionUpdate = ({ currentStep, collectedData }) => {
      addLog({
        level: 'info',
        message: `Workflow step ${currentStep} — collected: ${Object.keys(collectedData ?? {}).join(', ') || 'none'}`,
      });
    };

    // ── log:entry ────────────────────────────────────────────────
    const onLogEntry = ({ level, message, timestamp }) => {
      addLog({ level: level ?? 'info', message, timestamp });
    };

    // ── call:ended ───────────────────────────────────────────────
    const onCallEnded = ({ sessionId, summary }) => {
      setCallStatus('ended');
      streamingMsgIdRef.current = null;
      addLog({
        level: 'info',
        message: `Call ended${summary ? `: ${summary}` : ''}`,
      });
    };

    // ── connection events ────────────────────────────────────────
    const onConnectionOpen = () => {
      addLog({ level: 'info', message: 'WebSocket connection established' });
    };

    const onConnectionClosed = ({ code, reason }) => {
      addLog({
        level: 'warn',
        message: `WebSocket closed (code ${code})${reason ? `: ${reason}` : ''}`,
      });
    };

    const onConnectionError = () => {
      addLog({ level: 'error', message: 'WebSocket connection error' });
    };

    const onConnectionFailed = ({ retries }) => {
      addLog({ level: 'error', message: `WebSocket failed after ${retries} reconnection attempts` });
    };

    // Register all handlers
    wsService.on('call:status', onCallStatus);
    wsService.on('agent:active', onAgentActive);
    wsService.on('agent:done', onAgentDone);
    wsService.on('llm:token', onLlmToken);
    wsService.on('llm:complete', onLlmComplete);
    wsService.on('session:update', onSessionUpdate);
    wsService.on('log:entry', onLogEntry);
    wsService.on('call:ended', onCallEnded);
    wsService.on('connection:open', onConnectionOpen);
    wsService.on('connection:closed', onConnectionClosed);
    wsService.on('connection:error', onConnectionError);
    wsService.on('connection:failed', onConnectionFailed);

    return () => {
      // Deregister all handlers on cleanup
      wsService.off('call:status', onCallStatus);
      wsService.off('agent:active', onAgentActive);
      wsService.off('agent:done', onAgentDone);
      wsService.off('llm:token', onLlmToken);
      wsService.off('llm:complete', onLlmComplete);
      wsService.off('session:update', onSessionUpdate);
      wsService.off('log:entry', onLogEntry);
      wsService.off('call:ended', onCallEnded);
      wsService.off('connection:open', onConnectionOpen);
      wsService.off('connection:closed', onConnectionClosed);
      wsService.off('connection:error', onConnectionError);
      wsService.off('connection:failed', onConnectionFailed);
    };
  }, [
    setCallStatus,
    setSessionId,
    setActiveAgent,
    addTiming,
    addMessage,
    updateStreamingMessage,
    finalizeMessage,
    addLog,
  ]);

  // Return the streaming message id ref for consumers (e.g. useCall TTS trigger)
  return { streamingMsgIdRef };
}

export default useWebSocket;
