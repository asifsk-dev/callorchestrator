/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
          light: '#818cf8',
        },
        surface: {
          DEFAULT: '#111520',
          elevated: '#161c2d',
        },
        border: {
          subtle: '#1e2840',
        },
        cyan: {
          glow: '#06b6d4',
        },
        bg: {
          base: '#0a0d14',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'waveform-1': 'waveform 1.0s ease-in-out infinite',
        'waveform-2': 'waveform 1.2s ease-in-out infinite 0.1s',
        'waveform-3': 'waveform 0.9s ease-in-out infinite 0.2s',
        'waveform-4': 'waveform 1.1s ease-in-out infinite 0.15s',
        'waveform-5': 'waveform 1.3s ease-in-out infinite 0.05s',
        'waveform-6': 'waveform 0.85s ease-in-out infinite 0.25s',
        'waveform-7': 'waveform 1.15s ease-in-out infinite 0.1s',
        'fadeIn': 'fadeIn 0.3s ease-out forwards',
        'blink': 'blink 1s ease-in-out infinite',
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
        'radial-pulse': 'radialPulse 2s ease-in-out infinite',
        'ring-expand': 'ringExpand 2s ease-out infinite',
        'ring-expand-delay': 'ringExpand 2s ease-out infinite 0.7s',
        'ring-expand-delay2': 'ringExpand 2s ease-out infinite 1.4s',
        'spin-slow': 'spin 8s linear infinite',
        'bar-wave': 'barWave 1.2s ease-in-out infinite',
      },
      keyframes: {
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.2)' },
          '50%': { transform: 'scaleY(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-6px)', opacity: '1' },
        },
        radialPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.15)', opacity: '1' },
        },
        ringExpand: {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(1.2)', opacity: '0' },
        },
        barWave: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
};
