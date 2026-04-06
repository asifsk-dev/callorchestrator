import { useState, useRef, useCallback } from 'react';
import useCallStore from '../store/callStore.js';

/**
 * Hook that wraps the browser Web Speech API (SpeechSynthesis) for TTS.
 */
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);
  const startTimeRef = useRef(null);

  const { setActiveAgent, addTiming, addLog } = useCallStore();

  const speak = useCallback(
    (text) => {
      if (!text || typeof text !== 'string' || text.trim() === '') return;

      if (!window.speechSynthesis) {
        addLog({ level: 'warn', message: 'TTS not supported in this browser' });
        return;
      }

      // Cancel any in-progress speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Prefer a natural-sounding voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang === 'en-US' && v.localService) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        null;

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        startTimeRef.current = performance.now();
        setIsSpeaking(true);
        setActiveAgent('tts');
        addLog({ level: 'info', message: 'TTS speaking...' });
      };

      utterance.onend = () => {
        const durationMs = startTimeRef.current
          ? Math.round(performance.now() - startTimeRef.current)
          : 0;
        startTimeRef.current = null;
        setIsSpeaking(false);
        setActiveAgent(null);
        addTiming({ agent: 'tts', durationMs });
        addLog({ level: 'info', message: `TTS done — ${durationMs}ms` });
      };

      utterance.onerror = (event) => {
        console.error('[useTTS] Speech error:', event);
        startTimeRef.current = null;
        setIsSpeaking(false);
        setActiveAgent(null);
        addLog({ level: 'error', message: `TTS error: ${event.error}` });
      };

      window.speechSynthesis.speak(utterance);
    },
    [setActiveAgent, addTiming, addLog]
  );

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    startTimeRef.current = null;
    setIsSpeaking(false);
    setActiveAgent(null);
  }, [setActiveAgent]);

  return { speak, stop, isSpeaking };
}

export default useTTS;
