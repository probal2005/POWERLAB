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
    let previousSample: number | null = null;
    let inFlight = false;
    let visibilityEpoch = 0;
    const ping = async () => {
      if (document.hidden || !navigator.onLine || inFlight || controller.signal.aborted) return;
      const now = performance.now();
      const epoch = visibilityEpoch;
      const elapsed = previousSample === null ? 0 : Math.floor(now - previousSample);
      inFlight = true;
      try {
        const { error } = await supabase.rpc('record_powerlab_viewer', {
          p_browser_id: browserId,
          p_visible_ms: elapsed <= 35000 ? elapsed : 0,
        }).abortSignal(controller.signal);
        if (epoch === visibilityEpoch) previousSample = error ? null : now;
      } catch {
        if (epoch === visibilityEpoch) previousSample = null;
      } finally {
        inFlight = false;
        if (epoch !== visibilityEpoch) void ping();
      }
    };
    const finishVisibleSample = () => {
      const previous = previousSample;
      previousSample = null;
      visibilityEpoch++;
      if (previous === null || !navigator.onLine) return;
      const elapsed = Math.floor(performance.now() - previous);
      if (elapsed <= 0 || elapsed > 35000) return;
      // Keep the final visible sample when the browser navigates away or closes.
      const url = new URL('/rest/v1/rpc/record_powerlab_viewer', import.meta.env.VITE_SUPABASE_URL);
      void fetch(url, {
        method: 'POST',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_browser_id: browserId, p_visible_ms: elapsed }),
        keepalive: true,
      }).catch(() => {});
    };
    const resume = () => {
      visibilityEpoch++;
      previousSample = null;
      void ping();
    };
    const onVisibility = () => {
      if (document.hidden) finishVisibleSample();
      else resume();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resume();
    };
    void ping();
    const timer = window.setInterval(ping, 20000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', finishVisibleSample);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', resume);
    window.addEventListener('offline', finishVisibleSample);
    return () => {
      finishVisibleSample();
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', finishVisibleSample);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', finishVisibleSample);
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
