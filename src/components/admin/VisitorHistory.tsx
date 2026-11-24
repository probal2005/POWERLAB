import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Visitor {
  visitorNumber: number;
  firstSeen: string;
  lastSeen: string;
  visits: number;
  activeSeconds: number;
}

interface History {
  uniqueBrowsers: number;
  totalVisits: number;
  activeSeconds: number;
  trackingSince: string | null;
  visitors: Visitor[];
}

const pageSize = 25;

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  return [hours ? `${hours}h` : '', minutes ? `${minutes}m` : '', `${seconds % 60}s`].filter(Boolean).join(' ');
}

const formatDate = (value: string) => new Date(value).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function VisitorHistory() {
  const [offset, setOffset] = useState(0);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ offset: number; data: History } | null>(null);
  const [failed, setFailed] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      const { data, error } = await supabase.rpc('get_powerlab_visitor_history', { p_offset: offset })
        .abortSignal(controller.signal);
      inFlight = false;
      if (controller.signal.aborted) return;
      setFailed(Boolean(error || !data));
      if (data && !error) { setResult({ offset, data }); setUpdated(new Date()); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [offset, version]);

  const history = result?.offset === offset ? result.data : null;
  const metrics = history ? [
    ['Unique browsers', history.uniqueBrowsers.toLocaleString()],
    ['Total visits', history.totalVisits.toLocaleString()],
    ['Total active time', formatDuration(history.activeSeconds)],
    ['Average time per visit', formatDuration(history.totalVisits ? Math.round(history.activeSeconds / history.totalVisits) : 0)],
  ] : [];

  return (
    <section className="space-y-5 border border-line bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">Website visit history</h2>
          <p className="mt-1 text-sm text-ink-muted">Counts represent browsers. Active time is estimated from visible public pages. A return after 30 minutes of inactivity starts a new visit.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={() => setVersion((value) => value + 1)}>Refresh history</button>
      </div>
      {failed && <p role="alert" className="text-sm text-red-800">{history ? 'Refresh failed. Showing the last successful result.' : 'Visit history could not be loaded.'}</p>}
      {!history && !failed && <p role="status" className="text-sm text-ink-muted">Loading visit history…</p>}
      {history && <>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(([label, value]) => <div className="border border-line p-3" key={label}>
            <dt className="text-xs text-ink-muted">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">{value}</dd>
          </div>)}
        </dl>
        <p className="text-xs text-ink-muted">
          {history.trackingSince && <>Tracking since <time dateTime={history.trackingSince}>{formatDate(history.trackingSince)}</time>.</>}
          {updated && <> Last updated <time dateTime={updated.toISOString()}>{updated.toLocaleTimeString()}</time>.</>}
        </p>
        {!history.visitors.length ? <p className="text-sm text-ink-muted">No visitors have been recorded on this page.</p> :
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Visitor history table">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead><tr>
                <th scope="col" className="p-2">Anonymous visitor</th>
                <th scope="col" className="p-2">Visits</th>
                <th scope="col" className="p-2">Active time</th>
                <th scope="col" className="p-2">First seen</th>
                <th scope="col" className="p-2">Last seen</th>
              </tr></thead>
              <tbody>{history.visitors.map((visitor) => <tr key={visitor.visitorNumber} className="border-t border-line">
                <th scope="row" className="p-2 font-medium">Visitor {visitor.visitorNumber.toLocaleString()}</th>
                <td className="p-2">{visitor.visits.toLocaleString()}</td>
                <td className="p-2">{formatDuration(visitor.activeSeconds)}</td>
                <td className="p-2"><time dateTime={visitor.firstSeen}>{formatDate(visitor.firstSeen)}</time></td>
                <td className="p-2"><time dateTime={visitor.lastSeen}>{formatDate(visitor.lastSeen)}</time></td>
              </tr>)}</tbody>
            </table>
          </div>}
        <div className="flex flex-wrap gap-3">
          {offset > 0 && <button className="btn-secondary" type="button" onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous visitors</button>}
          {offset + history.visitors.length < history.uniqueBrowsers &&
            <button className="btn-secondary" type="button" onClick={() => setOffset(offset + pageSize)}>Next visitors</button>}
        </div>
      </>}
    </section>
  );
}
