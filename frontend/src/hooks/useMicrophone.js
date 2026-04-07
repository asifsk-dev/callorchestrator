import { useState, useRef, useCallback } from 'react';
import useCallStore from '../store/callStore.js';

/**
 * Microphone hook with adaptive VAD and barge-in support.
 *
 * VAD strategy
 * ────────────
 * 1. CALIBRATION (normal mode only, 400 ms): measure ambient RMS noise floor.
 * 2. Set SPEECH threshold = clamp(noiseFloor × NORMAL_RATIO, MIN_THR, MAX_THR).
 *    Barge-in mode skips calibration and uses a higher multiplier so TTS echo
 *    (which has already been partially cancelled by echoCancellation) cannot
 *    accidentally trigger the detector.
 * 3. Frame-based detection:
 *    - SPEECH_FRAMES consecutive above-threshold frames → speech confirmed
 *    - SILENCE_FRAMES consecutive below-threshold frames (after speech) → stop
 * 4. Hard cap: MAX_RECORD_MS — prevents any stuck state.
 *
 * Barge-in
 * ────────
 * When called with { bargeIn: true }:
 * - Uses lastNoiseFloor × BARGEIN_RATIO (higher bar, avoids TTS echo).
 * - onBargeIn fires as soon as speech is confirmed (SPEECH_FRAMES met).
 *   The caller (useCall) can then stop TTS immediately.
 * - Recording continues past onBargeIn and fires onRecordingComplete normally
 *   once silence is detected — so the interrupt speech is fully captured.
 */

// ── Constants ────────────────────────────────────────────────────────────────
const CALIBRATION_MS  = 400;   // ambient noise measurement window
const NORMAL_RATIO    = 4.5;   // threshold = noiseFloor × this (normal mode)
const BARGEIN_RATIO   = 8.0;   // threshold = noiseFloor × this (during TTS)
const MIN_THR         = 0.008; // absolute floor (very quiet rooms)
const MAX_THR         = 0.12;  // absolute ceiling (very noisy rooms)
const SPEECH_FRAMES   = 5;     // ~83 ms at 60 fps to confirm speech started
const SILENCE_FRAMES  = 65;    // ~1.08 s at 60 fps to confirm speech ended
const MIN_RECORD_MS   = 300;   // don't allow silence-stop before this
const MAX_RECORD_MS   = 15000; // hard cap — always fires regardless of VAD
const FFT_SIZE        = 1024;  // analyser buffer (time-domain)

const MIC_CONSTRAINTS = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: false,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** RMS amplitude from time-domain byte data (0–255, centred at 128). */
function getRMS(analyser, buf) {
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = (buf[i] - 128) / 128;
    sum += x * x;
  }
  return Math.sqrt(sum / buf.length);
}

/**
 * Measure ambient noise floor over CALIBRATION_MS.
 * Returns the average RMS across samples.
 */
function measureNoiseFloor(analyser, buf) {
  return new Promise((resolve) => {
    const samples = [];
    const id = setInterval(() => samples.push(getRMS(analyser, buf)), 40);
    setTimeout(() => {
      clearInterval(id);
      resolve(samples.reduce((a, b) => a + b, 0) / (samples.length || 1));
    }, CALIBRATION_MS);
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useMicrophone({ onRecordingComplete, onBargeIn } = {}) {
  const [isRecording, setIsRecording] = useState(false);

  const isRecordingRef         = useRef(false);
  const mediaRecorderRef       = useRef(null);
  const chunksRef              = useRef([]);
  const streamRef              = useRef(null);
  const audioContextRef        = useRef(null);
  const analyserRef            = useRef(null);
  const vadFrameRef            = useRef(null);
  const maxRecordTimerRef      = useRef(null);
  const hasSpeechRef           = useRef(false);
  const speechFrameCountRef    = useRef(0);
  const silenceFrameCountRef   = useRef(0);
  const recordingStartRef      = useRef(null);
  const lastNoiseFloorRef      = useRef(0.005); // cached between turns for barge-in mode
  const bargeInFiredRef        = useRef(false);

  // Keep callbacks in refs so they never go stale inside async code
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onBargeInRef           = useRef(onBargeIn);
  onRecordingCompleteRef.current = onRecordingComplete;
  onBargeInRef.current           = onBargeIn;

  const addLog = useCallStore((state) => state.addLog);

  // ── Teardown ──────────────────────────────────────────────────────
  const teardownVAD = useCallback(() => {
    if (vadFrameRef.current)       { cancelAnimationFrame(vadFrameRef.current); vadFrameRef.current = null; }
    if (maxRecordTimerRef.current) { clearTimeout(maxRecordTimerRef.current);   maxRecordTimerRef.current = null; }
    if (audioContextRef.current)   { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    analyserRef.current          = null;
    hasSpeechRef.current         = false;
    speechFrameCountRef.current  = 0;
    silenceFrameCountRef.current = 0;
    bargeInFiredRef.current      = false;
    recordingStartRef.current    = null;
  }, []);

  // ── Shared stop ───────────────────────────────────────────────────
  const _stop = useCallback((fireCallback) => {
    if (!isRecordingRef.current) return;
    teardownVAD();

    if (mediaRecorderRef.current) {
      if (!fireCallback) {
        // Cancel path: detach onstop so no callback fires, discard chunks
        mediaRecorderRef.current.onstop = null;
        chunksRef.current = [];
      }
      // Fire path: DO NOT clear chunks here — onstop fires asynchronously
      // and assembles the Blob from chunks. Clearing early = empty blob.
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    isRecordingRef.current = false;
    setIsRecording(false);
  }, [teardownVAD]);

  const stopRef = useRef(_stop);
  stopRef.current = _stop;

  const stopRecording   = useCallback(() => stopRef.current(true),  []);
  const cancelRecording = useCallback(() => stopRef.current(false), []);

  // ── Permission check ──────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch { return false; }
  }, []);

  // ── Start recording ───────────────────────────────────────────────
  /**
   * @param {{ bargeIn?: boolean }} options
   *   bargeIn: true  → use cached noise floor × BARGEIN_RATIO, fire onBargeIn on speech
   *   bargeIn: false → calibrate fresh, normal recording (default)
   */
  const startRecording = useCallback(async ({ bargeIn = false } = {}) => {
    if (isRecordingRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      streamRef.current      = stream;
      isRecordingRef.current = true;

      // AudioContext — resume if Chrome suspended it
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') await audioContext.resume();

      const source   = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize              = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.1; // low smoothing for responsive VAD
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder — prefer opus for quality/size
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current        = [];
      bargeInFiredRef.current  = false;

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      // Assemble blob AFTER stop() returns — do NOT clear chunks before this
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (onRecordingCompleteRef.current) onRecordingCompleteRef.current(blob);
      };

      recorder.onerror = () => {
        addLog({ level: 'error', message: 'Microphone recording error' });
        isRecordingRef.current = false;
        setIsRecording(false);
      };

      recorder.start(100); // collect chunks every 100ms
      setIsRecording(true);

      // ── Calibration / threshold ─────────────────────────────────
      const timeData = new Uint8Array(analyser.fftSize);
      let noiseFloor;

      if (bargeIn) {
        // Barge-in: skip recalibration, use last known floor
        // (recalibrating during TTS would measure TTS output, inflating the floor)
        noiseFloor = lastNoiseFloorRef.current;
        addLog({ level: 'info', message: `Barge-in listening... (cached noise=${noiseFloor.toFixed(4)})` });
      } else {
        addLog({ level: 'info', message: 'Calibrating mic...' });
        noiseFloor = await measureNoiseFloor(analyser, timeData);
        lastNoiseFloorRef.current = noiseFloor;
        addLog({ level: 'info', message: `Listening... (noise=${noiseFloor.toFixed(4)})` });
      }

      const ratio     = bargeIn ? BARGEIN_RATIO : NORMAL_RATIO;
      const threshold = Math.min(MAX_THR, Math.max(MIN_THR, noiseFloor * ratio));
      console.log(`[VAD] mode=${bargeIn ? 'barge-in' : 'normal'} noiseFloor=${noiseFloor.toFixed(4)} threshold=${threshold.toFixed(4)}`);

      hasSpeechRef.current         = false;
      speechFrameCountRef.current  = 0;
      silenceFrameCountRef.current = 0;
      recordingStartRef.current    = Date.now();

      // Hard cap — never get permanently stuck
      maxRecordTimerRef.current = setTimeout(() => {
        addLog({ level: 'warn', message: 'Max recording duration reached — processing...' });
        stopRef.current(true);
      }, MAX_RECORD_MS);

      // ── VAD loop ────────────────────────────────────────────────
      let logThrottle = 0;

      const tick = () => {
        if (!analyserRef.current) return;

        const rms = getRMS(analyserRef.current, timeData);

        if (++logThrottle % 30 === 0) {
          console.log(
            `[VAD] rms=${rms.toFixed(4)} thr=${threshold.toFixed(4)}` +
            ` speech=${hasSpeechRef.current} sf=${speechFrameCountRef.current}` +
            ` silence=${silenceFrameCountRef.current}`,
          );
        }

        if (rms > threshold) {
          // Above threshold — potential speech
          silenceFrameCountRef.current = 0;
          speechFrameCountRef.current++;

          if (speechFrameCountRef.current >= SPEECH_FRAMES && !hasSpeechRef.current) {
            hasSpeechRef.current = true;
            addLog({ level: 'info', message: `Speech detected (rms=${rms.toFixed(3)})` });

            // Barge-in: notify caller immediately so TTS can be stopped.
            // Recording continues — onRecordingComplete will fire when silence comes.
            if (bargeIn && !bargeInFiredRef.current && onBargeInRef.current) {
              bargeInFiredRef.current = true;
              onBargeInRef.current();
            }
          }
        } else {
          // Below threshold — potential silence
          // Decay speech frame count gradually rather than snapping to 0
          if (speechFrameCountRef.current > 0) speechFrameCountRef.current--;

          if (hasSpeechRef.current) {
            silenceFrameCountRef.current++;
            const elapsed = Date.now() - (recordingStartRef.current ?? Date.now());

            if (silenceFrameCountRef.current >= SILENCE_FRAMES && elapsed >= MIN_RECORD_MS) {
              addLog({ level: 'info', message: 'Silence detected — processing...' });
              stopRef.current(true);
              return; // stop scheduleFrame
            }
          }
        }

        vadFrameRef.current = requestAnimationFrame(tick);
      };

      vadFrameRef.current = requestAnimationFrame(tick);

    } catch (err) {
      isRecordingRef.current = false;
      setIsRecording(false);
      addLog({
        level: 'error',
        message: err.name === 'NotAllowedError'
          ? 'Microphone permission denied — allow access in browser settings'
          : `Microphone error: ${err.message}`,
      });
    }
  }, [addLog]);

  return { startRecording, stopRecording, cancelRecording, requestPermission, isRecording };
}

export default useMicrophone;
