import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'node:buffer';
import { fileURLToPath, URL } from 'node:url';

function isPublishableKey(key: string) {
  if (key.startsWith('sb_publishable_')) return true;
  const [header, payload, signature] = key.split('.');
  if (!header || !payload || !signature) return false;

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role === 'anon';
  } catch {
    return false;
  }
}

export default defineConfig(({ command, mode, isPreview }) => {
  if (command === 'build' && !isPreview) {
    const env = loadEnv(mode, process.cwd());
    if (!env.VITE_SUPABASE_URL || !isPublishableKey(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '')) {
      throw new Error('Set VITE_SUPABASE_URL and a public Supabase publishable or legacy anon key before building.');
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
