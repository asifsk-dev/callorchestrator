import React from 'react';
import { Mic } from 'lucide-react';
import useCallStore from '../../store/callStore.js';

const BAR_COUNT = 28;

// Compute glow colors + ring colors based on status
function getStatusConfig(callStatus, activeAgent) {
  if (callStatus === 'listening' || activeAgent === 'stt') {
    return {
      ringColor: '#06b6d4',
      glowShadow: '0 0 40px 12px rgba(6,182,212,0.35), 0 0 80px 24px rgba(6,182,212,0.15)',
      iconColor: 'text-cyan-400',
      barColor: '#06b6d4',
      borderColor: 'border-cyan-500/40',
      bgColor: 'bg-cyan-500/5',
      animate: true,
    };
  }
  if (callStatus === 'speaking' || activeAgent === 'tts') {
    return {
      ringColor: '#8b5cf6',
      glowShadow: '0 0 40px 12px rgba(139,92,246,0.35), 0 0 80px 24px rgba(139,92,246,0.15)',
      iconColor: 'text-purple-400',
      barColor: '#8b5cf6',
      borderColor: 'border-purple-500/40',
      bgColor: 'bg-purple-500/5',
      animate: true,
    };
  }
  if (callStatus === 'processing' || activeAgent === 'llm') {
    return {
      ringColor: '#6366f1',
      glowShadow: '0 0 40px 12px rgba(99,102,241,0.30), 0 0 80px 24px rgba(99,102,241,0.12)',
      iconColor: 'text-indigo-400',
      barColor: '#6366f1',
      borderColor: 'border-indigo-500/40',
      bgColor: 'bg-indigo-500/5',
      animate: true,
    };
  }
  if (callStatus === 'active' || callStatus === 'ringing') {
    return {
      ringColor: '#06b6d4',
      glowShadow: '0 0 24px 8px rgba(6,182,212,0.20)',
      iconColor: 'text-cyan-500/60',
      barColor: '#06b6d4',
      borderColor: 'border-cyan-500/20',
      bgColor: 'bg-cyan-500/5',
      animate: false,
    };
  }
  // idle / ended
  return {
    ringColor: '#2d3748',
    glowShadow: 'none',
    iconColor: 'text-slate-600',
    barColor: '#2d3748',
    borderColor: 'border-slate-700/30',
    bgColor: 'bg-transparent',
    animate: false,
  };
}

// Delays spread across bars for a wave-like feel
const BAR_DELAYS = Array.from({ length: BAR_COUNT }, (_, i) =>
  `${((i / BAR_COUNT) * 1.2).toFixed(2)}s`
);

export function WaveformAnimation() {
  const activeAgent = useCallStore((state) => state.activeAgent);
  const callStatus = useCallStore((state) => state.callStatus);

  const config = getStatusConfig(callStatus, activeAgent);
  const { animate, ringColor, glowShadow, iconColor, barColor, borderColor, bgColor } = config;

  const RADIUS = 128; // px from center to bar base (container is 320px = 160px radius)
  const BAR_HEIGHT = 14; // max bar height in px

  return (
    <div className="flex items-center justify-center">
      {/* Outer glow wrapper */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 320, height: 320 }}
        role="img"
        aria-label={animate ? 'Audio waveform — active' : 'Audio waveform — idle'}
      >
        {/* Expanding ring animations (only when active) */}
        {animate && (
          <>
            <div
              className="absolute rounded-full animate-ring-expand"
              style={{
                width: 240,
                height: 240,
                border: `1px solid ${ringColor}`,
                opacity: 0,
              }}
            />
            <div
              className="absolute rounded-full animate-ring-expand-delay"
              style={{
                width: 240,
                height: 240,
                border: `1px solid ${ringColor}`,
                opacity: 0,
              }}
            />
            <div
              className="absolute rounded-full animate-ring-expand-delay2"
              style={{
                width: 240,
                height: 240,
                border: `1px solid ${ringColor}`,
                opacity: 0,
              }}
            />
          </>
        )}

        {/* Concentric static rings */}
        <div
          className={`absolute rounded-full border transition-all duration-700 ${borderColor}`}
          style={{ width: 280, height: 280 }}
        />
        <div
          className={`absolute rounded-full border transition-all duration-700 ${borderColor}`}
          style={{ width: 240, height: 240 }}
        />
        <div
          className={`absolute rounded-full border transition-all duration-700 ${borderColor}`}
          style={{ width: 200, height: 200 }}
        />

        {/* Radial bars arranged in a circle */}
        <div
          className="absolute"
          style={{ width: 320, height: 320 }}
        >
          {Array.from({ length: BAR_COUNT }, (_, i) => {
            const angle = (i / BAR_COUNT) * 360;
            const rad = (angle * Math.PI) / 180;
            // bar center position
            const cx = 160 + RADIUS * Math.sin(rad);
            const cy = 160 - RADIUS * Math.cos(rad);

            return (
              <div
                key={i}
                className="absolute"
                style={{
                  width: 3,
                  height: BAR_HEIGHT,
                  left: cx - 1.5,
                  top: cy - BAR_HEIGHT / 2,
                  borderRadius: 2,
                  backgroundColor: animate ? barColor : '#2d3748',
                  transformOrigin: 'center center',
                  transform: `rotate(${angle}deg)`,
                  opacity: animate ? 0.85 : 0.25,
                  animation: animate
                    ? `barWave ${0.8 + (i % 5) * 0.1}s ease-in-out infinite ${BAR_DELAYS[i]}`
                    : 'none',
                  transition: 'background-color 0.6s, opacity 0.6s',
                }}
              />
            );
          })}
        </div>

        {/* Dark core circle */}
        <div
          className="absolute rounded-full transition-all duration-700"
          style={{
            width: 180,
            height: 180,
            background: '#0a0d14',
            boxShadow: glowShadow,
          }}
        />

        {/* Inner glowing background tint */}
        <div
          className={`absolute rounded-full transition-all duration-700 ${bgColor} ${animate ? 'animate-radial-pulse' : ''}`}
          style={{ width: 160, height: 160 }}
        />

        {/* Mic icon in center */}
        <div className="relative z-10 flex flex-col items-center gap-1">
          <Mic
            className={`w-10 h-10 transition-all duration-500 drop-shadow-lg ${iconColor} ${animate ? 'animate-pulse' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}

export default WaveformAnimation;
