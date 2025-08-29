import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#26355D',
          dark: '#26355D',
        },
        secondary: {
          DEFAULT: '#8520F7',
          dark: '#8520F7',
        },
        tertiary: {
          DEFAULT: '#FF8F00',
          dark: '#FF8F00',
        },
        alternate: {
          DEFAULT: '#FFDB00', // #FFDB00 or #F9E400
          dark: '#FFDB00',
        },
        bgPrimary: {
          DEFAULT: '#e5e7eb80', //e5e7eb80
          dark: '#e5e7eb80', 
        },
        defaultAmber: '#92400E',
        defaultPurple: '#5b21b6'
      },
      
      animation: {
        'gradient': 'gradient 8s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      },
    },
  },
  plugins: [],
}
export default config