import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const storageKey = 'powerlab:viewer-heartbeat-id';
let temporaryId: string | undefined;

function getViewerId() {
  temporaryId ??= crypto.randomUUID();
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(saved)) return saved;
    localStorage.setItem(storageKey, temporaryId);
  } catch { /* A temporary ID is enough for a browser session. */ }
  return temporaryId;
}

export function TrackViewerPresence() {
  const { pathname } = useLocation();
  const publicPage = !/^\/(admin|student|certification)(\/|$)/.test(pathname) && pathname !== '/assessment/final';
  useEffect(() => {
    if (!publicPage) return;
    const browserId = getViewerId();
    const controller = new AbortController();
    const ping = () => {
      if (!document.hidden && navigator.onLine) {
        void supabase.rpc('record_powerlab_viewer', { p_browser_id: browserId })
          .abortSignal(controller.signal).then(() => {});
      }
    };
    ping();
    const timer = window.setInterval(ping, 20000);
    document.addEventListener('visibilitychange', ping);
    window.addEventListener('online', ping);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', ping);
      window.removeEventListener('online', ping);
    };
  }, [publicPage]);
  return null;
}

export function ViewerCount() {
  const [last, setLast] = useState<{ count: number; checkedAt: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let inFlight = false;
    const controller = new AbortController();
    const check = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      const { data, error } = await supabase.rpc('get_powerlab_viewer_count').abortSignal(controller.signal);
      inFlight = false;
      if (controller.signal.aborted) return;
      if (error || typeof data?.count !== 'number') setFailed(true);
      else { setLast(data); setFailed(false); }
    };
    void check();
    const timer = window.setInterval(() => void check(), 10000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
    };
  }, []);

  return (
    <section className="space-y-3 border border-line bg-surface p-5">
      <h2 className="font-display text-xl text-ink">Live website viewers</h2>
      <p className="font-display text-3xl text-ink">{last?.count ?? '—'}</p>
      <p className="text-sm text-ink-muted">{failed ? (last ? 'Check failed. Showing the last known count.' : 'Viewer count unavailable. Retrying…') : last ? 'Active browsers' : 'Checking viewers…'}</p>
      {last && <p className="text-xs text-ink-muted">
        Last checked <time dateTime={last.checkedAt}>{new Date(last.checkedAt).toLocaleTimeString()}</time>
      </p>}
      <p className="text-xs text-ink-muted">Estimated browsers active on public pages in the last minute. Updates every 10 seconds.</p>
    </section>
  );
}
