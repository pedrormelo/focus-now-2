/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/index.html',
    './src/**/*.{html,ts,scss}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#1C1C1C',
        surface: {
          DEFAULT: '#202020',
          subtle: '#323232',
          strong: '#4E4E4E',
          border: '#373737'
        },
        brand: {
          DEFAULT: '#FE5D00',
          light: '#FDB000',
          gradientStart: '#FDB000',
          gradientEnd: '#FE5D00',
          accent: '#FF8000',
          border: '#F05806'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#D6D6D6',
          muted: '#A0A0A0'
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        '4xl': '2.5rem'
      },
      boxShadow: {
        spotlight: '0px 12px 30px rgba(254, 93, 0, 0.25)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};
