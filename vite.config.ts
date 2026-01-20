import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Explicitly map VITE_GEMINI_API_KEY to process.env.API_KEY for the Gemini SDK
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      
      // Polyfill process.env for other parts of the app (e.g. Firebase config)
      'process.env': JSON.stringify(env)
    }
  };
});