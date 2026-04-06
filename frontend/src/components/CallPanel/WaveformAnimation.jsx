import React from 'react';
import useCallStore from '../../store/callStore.js';

const BAR_COUNT = 7;

// Animation classes per bar index — different speeds for organic feel
const BAR_ANIMATIONS = [
  'animate-waveform-1',
  'animate-waveform-2',
  'animate-waveform-3',
  'animate-waveform-4',
  'animate-waveform-5',
  'animate-waveform-6',
  'animate-waveform-7',
];

// Bar height ranges (Tailwind h-* values) for visual variety
const BAR_HEIGHTS = ['h-8', 'h-12', 'h-16', 'h-14', 'h-10', 'h-12', 'h-8'];

export function WaveformAnimation() {
  const activeAgent = useCallStore((state) => state.activeAgent);
  const callStatus = useCallStore((state) => state.callStatus);

  const isActive =
    activeAgent === 'stt' ||
    activeAgent === 'tts' ||
    callStatus === 'active' ||
    callStatus === 'listening' ||
    callStatus === 'speaking';

  return (
    <div
      className="flex items-end justify-center gap-1 h-16 py-1"
      role="img"
      aria-label={isActive ? 'Audio waveform — active' : 'Audio waveform — idle'}
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className={[
            'waveform-bar',
            BAR_HEIGHTS[i],
            'w-1.5 rounded-sm transition-colors duration-300',
            isActive ? `active ${BAR_ANIMATIONS[i]}` : 'idle',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

export default WaveformAnimation;
