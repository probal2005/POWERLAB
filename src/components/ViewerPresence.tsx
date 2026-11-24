import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const topic = 'powerlab:active-public-viewers';
const localKey = 'powerlab:viewer-id';
const empty = { count: null as number | null, updated: null as Date | null, connected: null as boolean | null };
const ViewerContext = createContext(empty);

export function ViewerPresence({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const publicPage = !/^\/(admin|student|certification)(\/|$)/.test(pathname);
  const visible = useRef(publicPage);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribed = useRef(false);
  const [status, setStatus] = useState(empty);

  useEffect(() => {
    visible.current = publicPage;
    const channel = channelRef.current;
    if (!channel || !subscribed.current) return;
    if (publicPage) void channel.track({ active: true });
    else void channel.untrack();
  }, [publicPage]);

  useEffect(() => {
    let active = true;
    const start = window.setTimeout(() => {
      let browserId = crypto.randomUUID() as string;
      try {
        browserId = localStorage.getItem(localKey) || browserId;
        localStorage.setItem(localKey, browserId);
      } catch { /* Fall back to this tab when storage is unavailable. */ }
      const channel = supabase.channel(topic, { config: { presence: { key: browserId, enabled: true } } });
      channelRef.current = channel;
      channel.on('presence', { event: 'sync' }, () => {
        if (active) setStatus({ count: Object.keys(channel.presenceState()).length, updated: new Date(), connected: true });
      }).subscribe((phase) => {
        if (!active) return;
        subscribed.current = phase === 'SUBSCRIBED';
        if (subscribed.current && visible.current) void channel.track({ active: true });
        if (phase === 'CHANNEL_ERROR' || phase === 'TIMED_OUT' || phase === 'CLOSED') {
          setStatus((current) => ({ ...current, connected: false }));
        }
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(start);
      const channel = channelRef.current;
      channelRef.current = null;
      subscribed.current = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return <ViewerContext.Provider value={status}>{children}</ViewerContext.Provider>;
}

export function ViewerCount() {
  const { count, updated, connected } = useContext(ViewerContext);
  return (
    <section className="space-y-3 border border-line bg-surface p-5">
      <h2 className="font-display text-xl text-ink">Live website viewers</h2>
      <p className="font-display text-3xl text-ink">{count ?? '—'}</p>
      <p className="text-sm text-ink-muted">{connected === false ? 'Connection lost · showing last known count' : connected ? 'Connected browsers' : 'Connecting…'}</p>
      {updated && <p className="text-xs text-ink-muted">
        Last updated <time dateTime={updated.toISOString()}>{updated.toLocaleTimeString()}</time>
      </p>}
      <p className="text-xs text-ink-muted">Counts connected browsers on public pages. Open tabs in the same browser are counted once when local storage is available.</p>
    </section>
  );
}
