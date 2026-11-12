/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F3EB',
        'canvas-2': '#EAE5D9',
        surface: '#FFFDF8',
        ink: {
          DEFAULT: '#292B28',
          muted: '#77766F',
        },
        forest: {
          DEFAULT: '#243D35',
          50: '#E8EDEB',
          100: '#D2DCD8',
          200: '#A8BBAE',
          300: '#7A9683',
          400: '#52735D',
          500: '#243D35',
          600: '#1E332C',
          700: '#192920',
        },
        bronze: {
          DEFAULT: '#A47D50',
          50: '#F3ECDD',
          100: '#E7D7B8',
          200: '#D4BC8C',
          300: '#C0A261',
          400: '#A47D50',
          500: '#8E6A42',
        },
        line: '#DED9CE',
        success: '#47785B',
        error: '#B65E55',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Lora', 'Georgia', 'serif'],
        display: ['Lora', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        bengali: ['"Noto Sans Bengali"', 'Inter', 'sans-serif'],
      },
      maxWidth: {
        prose: '68ch',
        'prose-narrow': '58ch',
        content: '1080px',
        reading: '720px',
      },
      letterSpacing: {
        tightish: '-0.015em',
        wider2: '0.18em',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(41,43,40,0.04), 0 8px 24px -16px rgba(41,43,40,0.12)',
        hairline: 'inset 0 0 0 1px #DED9CE',
      },
      transitionTimingFunction: {
        outsoft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
