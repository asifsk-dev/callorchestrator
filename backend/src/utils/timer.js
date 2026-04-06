import { performance } from 'perf_hooks';

/**
 * Start a high-resolution timer.
 * @returns {{ stop: () => number }} Timer object. Call stop() to get elapsed ms.
 */
export function startTimer() {
  const startMs = performance.now();

  return {
    /**
     * Stop the timer and return elapsed duration in milliseconds.
     * @returns {number} durationMs
     */
    stop() {
      return Math.round(performance.now() - startMs);
    },
  };
}
