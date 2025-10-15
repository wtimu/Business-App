import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f9ff',
          100: '#e0f2ff',
          500: '#0077ff',
          600: '#0059c9'
        }
      }
    }
  },
  plugins: []
};

export default config;
