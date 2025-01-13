// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 设置基础字体
        sans: [
          // 中文字体
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          '"Source Han Sans SC"',
          // 英文字体
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          // 无衬线后备字体
          'sans-serif'
        ],
        // 衬线字体，用于斜体等特殊效果
        serif: [
          // 中文衬线字体
          '"Noto Serif SC"',
          '"Source Han Serif SC"',
          '"Songti SC"',
          // 英文衬线字体
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'Times',
          // 衬线后备字体
          'serif'
        ],
        // 等宽字体，用于代码块
        mono: [
          // 中文等宽字体
          '"Source Code Pro"',
          '"Noto Sans Mono CJK SC"',
          // 英文等宽字体
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          // 等宽后备字体
          'monospace'
        ]
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#333',
            em: {
              // 使用衬线字体来确保斜体效果
              fontFamily: 'serif',
              fontStyle: 'italic',
            },
            'em *': {
              fontStyle: 'italic',
            },
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