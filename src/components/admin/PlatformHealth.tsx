import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PlatformHealth() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [checked, setChecked] = useState<Date | null>(null);
  const [success, setSuccess] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    let busy = false;
    const controller = new AbortController();
    const check = async () => {
      if (document.hidden || busy) return;
      busy = true;
      const { error } = await supabase.from('content_categories')
        .select('id').limit(1).abortSignal(controller.signal);
      busy = false;
      if (!active) return;
      const now = new Date();
      setHealthy(!error);
      setChecked(now);
      if (!error) setSuccess(now);
    };
    void check();
    const timer = window.setInterval(() => void check(), 30000);
    window.addEventListener('focus', check);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
    };
  }, []);

  return (
    <section className="space-y-3 border border-line bg-surface p-5">
      <h2 className="font-display text-xl text-ink">Platform health</h2>
      <p className="text-sm font-semibold">{healthy === null ? 'Checking database…' : healthy ? 'Database reachable' : 'Database check failed'}</p>
      {checked && <p className="text-xs text-ink-muted">Last checked <time dateTime={checked.toISOString()}>{checked.toLocaleTimeString()}</time></p>}
      {success && <p className="text-xs text-ink-muted">Last successful check <time dateTime={success.toISOString()}>{success.toLocaleTimeString()}</time></p>}
    </section>
  );
}
