/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        ink: {
          950: '#050d09',
          900: '#0a1a12',
          850: '#0f221a',
          800: '#12281c',
          700: '#1a3d2a',
          600: '#234d36',
        },
        glow: '#34ff8e',
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(ellipse at center, #12281c 0%, #0a1a12 40%, #050d09 100%)',
        'grid-fade':
          'linear-gradient(to bottom, rgba(5,13,9,0) 0%, rgba(5,13,9,1) 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 16px rgba(52, 255, 142, 0.18)',
        'glow':    '0 0 28px rgba(52, 255, 142, 0.28)',
        'glow-lg': '0 0 48px rgba(52, 255, 142, 0.35)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        breath: {
          '0%, 100%': { opacity: '0.85' },
          '50%':      { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 14px rgba(52, 255, 142, 0.25)' },
          '50%':      { boxShadow: '0 0 28px rgba(52, 255, 142, 0.55)' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float:        'float 6s ease-in-out infinite',
        breath:       'breath 2.5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.2s ease-in-out infinite',
        'fade-up':    'fade-up 0.6s ease-out both',
      },
    },
  },
  plugins: [],
}
