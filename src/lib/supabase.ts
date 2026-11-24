import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase configuration is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

let recoverySession = false;
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session) recoverySession = true;
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') recoverySession = false;
});

export const hasPasswordRecoverySession = () => recoverySession;
