import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0f172a',
          panel: '#1e293b',
          accent: '#38bdf8',
          warning: '#fbbf24',
          critical: '#f87171',
        },
      },
    },
  },
  plugins: [],
};
export default config;
