import { useEffect, useRef, useCallback } from 'react';
import useCallStore from '../store/callStore.js';
import wsService from '../services/wsService.js';
import { startCall as apiStartCall, endCall as apiEndCall, transcribeAudio, processTranscript } from '../services/apiService.js';
import useMicrophone from './useMicrophone.js';
import useTTS from './useTTS.js';
import useWebSocket from './useWebSocket.js';

/**
 * Main call orchestration hook.
 * Ties together WebSocket, microphone, TTS, REST API, and Zustand store.
 */
export function useCall() {
  const {
    callStatus,
    sessionId,
    setCallStatus,
    setSessionId,
    addMessage,
    addLog,
    resetCall,
    resetDuration,
    incrementDuration,
  } = useCallStore();

  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const timerRef = useRef(null);
  const pendingUserMsgIdRef = useRef(null);

  // Register WebSocket event handlers (connects store to WS events)
  useWebSocket();

  // ── Mic with callback ───────────────────────────────────────────
  const handleRecordingComplete = useCallback(
    async (blob) => {
      const currentSessionId = useCallStore.getState().sessionId;

      if (!currentSessionId) {
        addLog({ level: 'error', message: 'No session ID — cannot transcribe audio' });
        return;
      }

      // Update the placeholder user message content after transcription
      try {
        setCallStatus('processing');
        addLog({ level: 'info', message: 'Sending audio to STT...' });

        const { transcript, durationMs } = await transcribeAudio(blob, currentSessionId);

        // Update the pending user message with the real transcript
        if (pendingUserMsgIdRef.current) {
          useCallStore.getState().updateStreamingMessage(pendingUserMsgIdRef.current, '');
          useCallStore.getState().finalizeMessage(pendingUserMsgIdRef.current);

          // Replace placeholder with real transcript
          const store = useCallStore.getState();
          store.messages; // access for reactivity
          useCallStore.setState((state) => ({
            messages: state.messages.map((m) =>
              m.id === pendingUserMsgIdRef.current
                ? { ...m, content: transcript, isStreaming: false }
                : m
            ),
          }));
          pendingUserMsgIdRef.current = null;
        } else {
          addMessage({ role: 'user', content: transcript });
        }

        addLog({ level: 'info', message: `STT complete — "${transcript}" (${durationMs}ms)` });

        // Trigger LLM processing — response comes back via WebSocket stream
        await processTranscript(currentSessionId, transcript);
      } catch (err) {
        console.error('[useCall] Transcription error:', err);
        addLog({ level: 'error', message: `Transcription failed: ${err.message}` });
        setCallStatus('active');
      }
    },
    [addMessage, addLog, setCallStatus]
  );

  const { startRecording, stopRecording, isRecording } = useMicrophone({
    onRecordingComplete: handleRecordingComplete,
  });

  // ── Listen for llm:complete → trigger TTS ───────────────────────
  useEffect(() => {
    const onLlmComplete = ({ response }) => {
      if (response) {
        setCallStatus('speaking');
        speak(response);
      }
    };

    wsService.on('llm:complete', onLlmComplete);
    return () => wsService.off('llm:complete', onLlmComplete);
  }, [speak, setCallStatus]);

  // ── When TTS finishes speaking → return to active ───────────────
  useEffect(() => {
    if (!isSpeaking && callStatus === 'speaking') {
      setCallStatus('active');
    }
  }, [isSpeaking, callStatus, setCallStatus]);

  // ── Clean up timer on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startCallTimer = useCallback(() => {
    resetDuration();
    timerRef.current = setInterval(() => {
      useCallStore.getState().incrementDuration();
    }, 1000);
  }, [resetDuration]);

  const stopCallTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── handleStartCall ─────────────────────────────────────────────
  const handleStartCall = useCallback(async () => {
    try {
      resetCall();
      wsService.connect();

      // Give WS a moment to open before sending, but proceed regardless
      await new Promise((resolve) => setTimeout(resolve, 300));

      setCallStatus('ringing');
      addLog({ level: 'info', message: 'Initiating call...' });

      // Prefer WS-initiated call; fall back to REST if WS not ready
      if (wsService.isConnected()) {
        wsService.send('call:start', { workflow: 'appointment' });
      } else {
        // REST fallback — backend will emit status changes via WS once connected
        const { sessionId: newSessionId } = await apiStartCall('appointment');
        setSessionId(newSessionId);
        setCallStatus('active');
        startCallTimer();
        addLog({ level: 'info', message: `Call started via REST. Session: ${newSessionId}` });
      }
    } catch (err) {
      console.error('[useCall] Start call error:', err);
      setCallStatus('idle');
      addLog({ level: 'error', message: `Failed to start call: ${err.message}` });
    }
  }, [resetCall, setCallStatus, setSessionId, addLog, startCallTimer]);

  // ── handleEndCall ───────────────────────────────────────────────
  const handleEndCall = useCallback(async () => {
    stopCallTimer();
    stopRecording();
    stopTTS();

    const currentSessionId = useCallStore.getState().sessionId;

    setCallStatus('ended');
    addLog({ level: 'info', message: 'Ending call...' });

    try {
      if (wsService.isConnected() && currentSessionId) {
        wsService.send('call:end', { sessionId: currentSessionId });
      } else if (currentSessionId) {
        await apiEndCall(currentSessionId);
      }
    } catch (err) {
      console.error('[useCall] End call error:', err);
      addLog({ level: 'warn', message: `End call request failed: ${err.message}` });
    }
  }, [stopCallTimer, stopRecording, stopTTS, setCallStatus, addLog]);

  // ── handleUserSpeakStart ────────────────────────────────────────
  const handleUserSpeakStart = useCallback(() => {
    if (callStatus !== 'active') return;

    setCallStatus('listening');

    // Add a placeholder user message immediately for responsiveness
    const msgId = `user-${Date.now()}`;
    pendingUserMsgIdRef.current = msgId;
    addMessage({ id: msgId, role: 'user', content: '...', isStreaming: true });

    startRecording();
  }, [callStatus, setCallStatus, addMessage, startRecording]);

  // ── handleUserSpeakStop ─────────────────────────────────────────
  const handleUserSpeakStop = useCallback(() => {
    if (!isRecording) return;
    stopRecording();
    // Blob assembly + transcription happens in handleRecordingComplete callback
  }, [isRecording, stopRecording]);

  // ── Listen for WS call:status to start timer when 'active' ──────
  useEffect(() => {
    const onCallStatus = ({ status }) => {
      if (status === 'active') {
        startCallTimer();
      } else if (status === 'ended') {
        stopCallTimer();
      }
    };

    wsService.on('call:status', onCallStatus);
    return () => wsService.off('call:status', onCallStatus);
  }, [startCallTimer, stopCallTimer]);

  return {
    handleStartCall,
    handleEndCall,
    handleUserSpeakStart,
    handleUserSpeakStop,
    isRecording,
    isSpeaking,
  };
}

export default useCall;
