// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#333',
            a: {
              color: '#3182ce',
              '&:hover': {
                color: '#2c5282',
              },
            },
            'h1,h2,h3,h4': {
              'scroll-margin-top': '5rem',
              'margin-bottom': '0.5em',
            },
            pre: {
              backgroundColor: '#f7fafc',
              color: '#1a202c',
              overflowX: 'auto',
              padding: '1rem',
              borderRadius: '0.375rem',
            },
            code: {
              backgroundColor: '#f7fafc',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            blockquote: {
              borderLeftColor: '#e2e8f0',
              color: '#4a5568',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}