import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./popup.html', './index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#08080d',
        abyss: '#0b0b13',
        panel: '#10101a',
        panel2: '#151524',
        line: '#23233a',
        neon: {
          violet: '#8b5cf6',
          soft: '#a78bfa',
          mint: '#34d399',
          cyan: '#22d3ee',
          amber: '#fbbf24',
          rose: '#fb7185',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,92,246,0.45), 0 0 24px rgba(139,92,246,0.25)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px rgba(0,0,0,0.35)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 1px rgba(139,92,246,.45), 0 0 18px rgba(139,92,246,.22)' },
          '50%': { boxShadow: '0 0 0 1px rgba(52,211,153,.5), 0 0 28px rgba(52,211,153,.28)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        blink: 'blink 1s step-end infinite',
        scanline: 'scanline 2.2s linear infinite',
        fadeUp: 'fadeUp .35s ease both',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
