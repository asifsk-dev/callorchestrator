import { useEffect, useRef, useCallback } from 'react';
import useCallStore from '../store/callStore.js';
import wsService from '../services/wsService.js';
import {
  startCall as apiStartCall,
  endCall as apiEndCall,
  transcribeAudio,
  processTranscript,
} from '../services/apiService.js';
import useMicrophone from './useMicrophone.js';
import useTTS from './useTTS.js';
import useWebSocket from './useWebSocket.js';

/**
 * useCall — voice call state machine
 *
 * State transitions
 * ─────────────────
 *   idle ──startCall──► ringing ──call:status──► active
 *   active ──auto──► listening  (mic opens, calibrates, VAD watches)
 *   listening ──VAD fires──► processing  (mic closes, STT runs)
 *   processing ──llm:complete──► speaking  (TTS plays, barge-in mic opens)
 *   speaking ──TTS ends──► active ──► listening  (normal turn)
 *   speaking ──barge-in──► listening  (user interrupted, recording continues)
 *   any ──endCall──► ended
 *
 * Barge-in
 * ────────
 * While Aria is speaking, the mic is opened with a higher VAD threshold
 * (BARGEIN_RATIO × noise floor) so TTS echo doesn't trigger it. If the
 * user speaks above that threshold, onBargeIn fires → TTS stops immediately
 * → the recording continues and completes normally → STT → LLM → etc.
 */

const POST_TTS_DELAY_MS = 400; // gap after TTS ends before re-opening mic
const MIN_BLOB_BYTES    = 4000; // minimum audio payload to bother sending to STT

export function useCall() {
  const {
    setCallStatus, setSessionId, setActiveAgent, addTiming,
    addMessage, addLog, resetCall, resetDuration,
  } = useCallStore();

  const timerRef         = useRef(null);
  const pendingMsgIdRef  = useRef(null);
  const postTTSTimerRef  = useRef(null);
  const bargeInOpenRef   = useRef(false); // is barge-in mic currently open?

  useWebSocket();

  // ── Duration timer ────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    resetDuration();
    timerRef.current = setInterval(() => useCallStore.getState().incrementDuration(), 1000);
  }, [resetDuration]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── Stable refs for use inside async closures / event handlers ────
  const startRecordingRef  = useRef(null);
  const cancelRecordingRef = useRef(null);
  const stopTTSRef         = useRef(null);
  const addMessageRef      = useRef(addMessage);    addMessageRef.current   = addMessage;
  const setCallStatusRef   = useRef(setCallStatus); setCallStatusRef.current = setCallStatus;
  const addLogRef          = useRef(addLog);        addLogRef.current        = addLog;

  // ── openMic — start a normal (non-barge-in) recording turn ───────
  const openMic = useCallback(() => {
    const { callStatus } = useCallStore.getState();
    // Only open during states where it makes sense
    if (['ended', 'idle', 'processing', 'speaking'].includes(callStatus)) return;

    const msgId = `user-${Date.now()}`;
    pendingMsgIdRef.current = msgId;
    addMessageRef.current({ id: msgId, role: 'user', content: '...', isStreaming: true });
    setCallStatusRef.current('listening');
    addLogRef.current({ level: 'info', message: 'Listening...' });
    bargeInOpenRef.current = false;

    if (startRecordingRef.current) startRecordingRef.current({ bargeIn: false });
  }, []);

  const openMicRef = useRef(openMic);
  openMicRef.current = openMic;

  // ── handleBargeIn — user spoke while Aria was talking ────────────
  //
  // Called by useMicrophone as soon as sustained speech is detected
  // in barge-in mode. TTS is stopped; the barge-in recording continues
  // until VAD detects silence, then onRecordingComplete fires normally.
  const handleBargeIn = useCallback(() => {
    const { callStatus } = useCallStore.getState();
    if (callStatus !== 'speaking') return;

    addLogRef.current({ level: 'info', message: 'Barge-in — user interrupted Aria' });
    bargeInOpenRef.current = false;

    // Stop TTS — this discards the TTS onEnd callback so it won't
    // try to cancel the barge-in recording or re-open mic.
    if (stopTTSRef.current) stopTTSRef.current();

    // Create the "..." bubble so the user sees we're listening
    const msgId = `user-${Date.now()}`;
    pendingMsgIdRef.current = msgId;
    addMessageRef.current({ id: msgId, role: 'user', content: '...', isStreaming: true });
    setCallStatusRef.current('listening');
    // Recording is already running — VAD will fire onRecordingComplete when done
  }, []);

  const handleBargeInRef = useRef(handleBargeIn);
  handleBargeInRef.current = handleBargeIn;

  // ── handleRecordingComplete — blob from VAD stop (normal or barge-in)
  const handleRecordingComplete = useCallback(async (blob) => {
    const { sessionId, callStatus } = useCallStore.getState();
    if (!sessionId || callStatus === 'ended' || callStatus === 'idle') return;

    // If still flagged as speaking (very short barge-in where speech didn't meet
    // SPEECH_FRAMES before silence), just reopen barge-in mic and continue.
    if (callStatus === 'speaking') {
      if (startRecordingRef.current) startRecordingRef.current({ bargeIn: true });
      return;
    }

    // Discard blobs that are too small to contain real speech
    if (blob.size < MIN_BLOB_BYTES) {
      addLog({ level: 'warn', message: `Audio too short (${blob.size} B) — re-listening` });
      // Remove the "..." bubble we may have added
      if (pendingMsgIdRef.current) {
        useCallStore.setState((s) => ({
          messages: s.messages.filter((m) => m.id !== pendingMsgIdRef.current),
        }));
        pendingMsgIdRef.current = null;
      }
      setCallStatus('active');
      setTimeout(() => openMicRef.current(), 200);
      return;
    }

    // ── STT ──────────────────────────────────────────────────────
    try {
      setCallStatus('processing');
      setActiveAgent('stt');
      addLog({ level: 'info', message: `Sending audio to STT (${blob.size} B)...` });

      const { transcript, durationMs } = await transcribeAudio(blob, sessionId);

      addTiming({ agent: 'stt', durationMs: durationMs ?? 0 });
      setActiveAgent(null);

      // Update the "..." bubble → real transcript, or remove if noise
      if (pendingMsgIdRef.current) {
        if (transcript) {
          useCallStore.setState((s) => ({
            messages: s.messages.map((m) =>
              m.id === pendingMsgIdRef.current
                ? { ...m, content: transcript, isStreaming: false }
                : m,
            ),
          }));
        } else {
          useCallStore.setState((s) => ({
            messages: s.messages.filter((m) => m.id !== pendingMsgIdRef.current),
          }));
        }
        pendingMsgIdRef.current = null;
      } else if (transcript) {
        addMessage({ role: 'user', content: transcript });
      }

      // Empty transcript = Whisper says no speech (background noise) → re-listen
      if (!transcript) {
        addLog({ level: 'warn', message: 'STT: no speech detected — re-listening' });
        setCallStatus('active');
        setTimeout(() => openMicRef.current(), 300);
        return;
      }

      addLog({ level: 'info', message: `STT: "${transcript}" (${durationMs}ms)` });

      // ── Fire LLM (fire-and-forget) ────────────────────────────
      // Response arrives via WebSocket llm:complete.
      // Do NOT re-open mic here — wait for llm:complete → TTS → post-TTS.
      setCallStatus('processing');
      processTranscript(sessionId, transcript).catch((err) => {
        addLog({ level: 'error', message: `LLM request failed: ${err.message}` });
        // LLM failed — re-open mic so user can try again
        setCallStatus('active');
        setTimeout(() => openMicRef.current(), 500);
      });

    } catch (err) {
      setActiveAgent(null);
      addLog({ level: 'error', message: `Transcription failed: ${err.message}` });
      setCallStatus('active');
      setTimeout(() => openMicRef.current(), 500);
    }
  }, [addMessage, addLog, setCallStatus, setActiveAgent, addTiming]);

  // ── Mount mic hook ────────────────────────────────────────────────
  const { startRecording, cancelRecording, requestPermission, isRecording } = useMicrophone({
    onRecordingComplete: handleRecordingComplete,
    onBargeIn: () => handleBargeInRef.current(),
  });

  startRecordingRef.current  = startRecording;
  cancelRecordingRef.current = cancelRecording;

  // Expose useTTS stop via ref so handleBargeIn can call it without stale closure
  const { speak, stop: stopTTS } = useTTS();
  stopTTSRef.current = stopTTS;

  // ── llm:complete → TTS → barge-in mic → re-open after TTS ends ───
  useEffect(() => {
    const onLlmComplete = ({ response }) => {
      const { callStatus } = useCallStore.getState();
      if (callStatus === 'ended' || callStatus === 'idle') return;
      if (!response) return;

      // Cancel any recording that may have started (shouldn't be any in
      // normal flow since mic is closed during processing, but be safe)
      if (cancelRecordingRef.current) cancelRecordingRef.current();
      if (pendingMsgIdRef.current) {
        useCallStore.setState((s) => ({
          messages: s.messages.filter((m) => m.id !== pendingMsgIdRef.current),
        }));
        pendingMsgIdRef.current = null;
      }

      setCallStatus('speaking');
      bargeInOpenRef.current = true;

      // Open barge-in mic slightly after TTS starts so the first word of Aria's
      // speech doesn't pollute the noise calibration baseline.
      // We skip re-calibration (barge-in mode uses cached noise floor).
      const bargeInTimer = setTimeout(() => {
        const { callStatus: st } = useCallStore.getState();
        if (st === 'speaking' && startRecordingRef.current) {
          startRecordingRef.current({ bargeIn: true });
        }
      }, 250);

      speak(response, () => {
        // TTS ended naturally (no barge-in) — cancel barge-in recording, open fresh mic
        clearTimeout(bargeInTimer);
        if (cancelRecordingRef.current) cancelRecordingRef.current();
        bargeInOpenRef.current = false;

        const { callStatus: st } = useCallStore.getState();
        if (st === 'ended' || st === 'idle') return;

        setCallStatus('active');
        if (postTTSTimerRef.current) clearTimeout(postTTSTimerRef.current);
        postTTSTimerRef.current = setTimeout(() => openMicRef.current(), POST_TTS_DELAY_MS);
      });
    };

    wsService.on('llm:complete', onLlmComplete);
    return () => wsService.off('llm:complete', onLlmComplete);
  }, [speak, setCallStatus, addLog]);

  // ── call:status from WS ───────────────────────────────────────────
  useEffect(() => {
    const onCallStatus = ({ status }) => {
      if (status === 'active') {
        startTimer();
        // Auto-open mic when call becomes active (first turn)
        setTimeout(() => openMicRef.current(), 300);
      } else if (status === 'ended') {
        stopTimer();
      }
    };
    wsService.on('call:status', onCallStatus);
    return () => wsService.off('call:status', onCallStatus);
  }, [startTimer, stopTimer]);

  // ── handleStartCall ───────────────────────────────────────────────
  const handleStartCall = useCallback(async () => {
    addLog({ level: 'info', message: 'Requesting microphone permission...' });
    const granted = await requestPermission();
    if (!granted) {
      addLog({ level: 'error', message: 'Microphone access denied — allow mic in browser settings' });
      return;
    }
    addLog({ level: 'info', message: 'Microphone ready.' });

    resetCall();
    wsService.connect();
    await new Promise((r) => setTimeout(r, 300));

    setCallStatus('ringing');
    addLog({ level: 'info', message: 'Connecting to Aria...' });

    try {
      if (wsService.isConnected()) {
        wsService.send('call:start', { workflow: 'appointment' });
      } else {
        const { sessionId: id } = await apiStartCall('appointment');
        setSessionId(id);
        setCallStatus('active');
        startTimer();
        setTimeout(() => openMicRef.current(), 300);
      }
    } catch (err) {
      setCallStatus('idle');
      addLog({ level: 'error', message: `Failed to start call: ${err.message}` });
    }
  }, [requestPermission, resetCall, setCallStatus, setSessionId, addLog, startTimer]);

  // ── handleEndCall ─────────────────────────────────────────────────
  const handleEndCall = useCallback(async () => {
    stopTimer();
    if (postTTSTimerRef.current) { clearTimeout(postTTSTimerRef.current); postTTSTimerRef.current = null; }

    cancelRecording();
    stopTTS();
    bargeInOpenRef.current = false;

    if (pendingMsgIdRef.current) {
      useCallStore.setState((s) => ({
        messages: s.messages.filter((m) => m.id !== pendingMsgIdRef.current),
      }));
      pendingMsgIdRef.current = null;
    }

    const { sessionId } = useCallStore.getState();
    setCallStatus('ended');
    addLog({ level: 'info', message: 'Call ended.' });

    try {
      if (wsService.isConnected() && sessionId) wsService.send('call:end', { sessionId });
      else if (sessionId) await apiEndCall(sessionId);
    } catch (err) {
      addLog({ level: 'warn', message: `End call cleanup: ${err.message}` });
    }

    wsService.disconnect();
  }, [stopTimer, cancelRecording, stopTTS, setCallStatus, addLog]);

  return { handleStartCall, handleEndCall, isRecording };
}

export default useCall;
