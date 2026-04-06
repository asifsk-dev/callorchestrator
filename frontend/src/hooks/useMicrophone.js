import { useState, useRef, useCallback } from 'react';
import useCallStore from '../store/callStore.js';

/**
 * Hook that wraps MediaRecorder for microphone capture.
 * Returns start/stop functions and recording state.
 */
export function useMicrophone({ onRecordingComplete } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const addLog = useCallStore((state) => state.addLog);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer WebM/Opus; fall back to whatever the browser supports
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        });

        // Stop all tracks to release the mic
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        chunksRef.current = [];

        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }
      };

      recorder.onerror = (err) => {
        console.error('[useMicrophone] MediaRecorder error:', err);
        addLog({ level: 'error', message: `Microphone recording error: ${err.message ?? 'Unknown error'}` });
        setIsRecording(false);
      };

      recorder.start(100); // Collect data every 100ms for low latency
      setIsRecording(true);
      addLog({ level: 'info', message: 'Microphone recording started' });
    } catch (err) {
      console.error('[useMicrophone] Permission denied or mic unavailable:', err);
      addLog({
        level: 'error',
        message: `Microphone error: ${err.name === 'NotAllowedError'
          ? 'Permission denied — please allow microphone access'
          : err.message ?? 'Could not access microphone'}`,
      });
      setIsRecording(false);
    }
  }, [isRecording, onRecordingComplete, addLog]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    addLog({ level: 'info', message: 'Microphone recording stopped' });
  }, [isRecording, addLog]);

  return { startRecording, stopRecording, isRecording };
}

export default useMicrophone;
