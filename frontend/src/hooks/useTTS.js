import { useState, useRef, useCallback, useEffect } from 'react';
import useCallStore from '../store/callStore.js';

const VOICE_PREFERENCES = [
  'Google UK English Female',
  'Microsoft Hazel',
  'Microsoft Zira',
  'Google US English',
  'Samantha',
  'Karen',
  'Moira',
];

function pickVoice(voices) {
  for (const name of VOICE_PREFERENCES) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  return (
    voices.find((v) => v.lang === 'en-GB') ||
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang.startsWith('en')) ||
    null
  );
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef   = useRef(null);
  const startTimeRef   = useRef(null);
  const voiceRef       = useRef(null);
  const onEndCallbackRef = useRef(null);
  // Chrome keepalive: Chrome pauses speechSynthesis after ~15s of inactivity
  const keepAliveRef   = useRef(null);

  const { setActiveAgent, addTiming, addLog } = useCallStore();

  useEffect(() => {
    const loadVoice = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      if (voices.length > 0) voiceRef.current = pickVoice(voices);
    };
    loadVoice();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoice);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoice);
  }, []);

  // ── Internal: called when speech finishes (from onend OR fallback) ─
  const handleSpeechEnd = useCallback((durationMs) => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    startTimeRef.current = null;
    setIsSpeaking(false);
    setActiveAgent(null);
    addTiming({ agent: 'tts', durationMs: durationMs ?? 0 });
    addLog({ level: 'info', message: `Aria done speaking — ${durationMs ?? 0}ms` });

    // Fire the caller's onEnd callback
    if (onEndCallbackRef.current) {
      const cb = onEndCallbackRef.current;
      onEndCallbackRef.current = null;
      cb();
    }
  }, [setActiveAgent, addTiming, addLog]);

  /**
   * Speak text aloud.
   * @param {string} text
   * @param {() => void} [onEnd] — called when speech finishes (or is stopped)
   */
  const speak = useCallback((text, onEnd) => {
    if (!text?.trim()) {
      if (onEnd) onEnd();
      return;
    }
    if (!window.speechSynthesis) {
      addLog({ level: 'warn', message: 'TTS not supported in this browser' });
      if (onEnd) onEnd();
      return;
    }

    // Store callback before cancelling to avoid races
    onEndCallbackRef.current = onEnd ?? null;

    window.speechSynthesis.cancel();

    // Chrome needs a tiny delay after cancel() before a new speak() works
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate   = 0.92;
      utterance.pitch  = 0.95;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        startTimeRef.current = performance.now();
        setIsSpeaking(true);
        setActiveAgent('tts');
        addLog({ level: 'info', message: 'Aria speaking...' });

        // Chrome keepalive — pause/resume every 10s to prevent silent stall
        keepAliveRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      };

      utterance.onend = () => {
        const ms = startTimeRef.current
          ? Math.round(performance.now() - startTimeRef.current)
          : 0;
        handleSpeechEnd(ms);
      };

      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
          // Manual stop — do NOT fire onEnd (stop() handles cleanup)
          return;
        }
        const ms = startTimeRef.current
          ? Math.round(performance.now() - startTimeRef.current)
          : 0;
        addLog({ level: 'error', message: `TTS error: ${event.error}` });
        handleSpeechEnd(ms);
      };

      window.speechSynthesis.speak(utterance);
    }, 50);
  }, [setActiveAgent, addLog, handleSpeechEnd]);

  const stop = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    onEndCallbackRef.current = null; // discard callback — caller is ending the call
    window.speechSynthesis?.cancel();
    startTimeRef.current = null;
    setIsSpeaking(false);
    setActiveAgent(null);
  }, [setActiveAgent]);

  return { speak, stop, isSpeaking };
}

export default useTTS;
