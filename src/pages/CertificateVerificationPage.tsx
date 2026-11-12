import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CertificationVerification } from '@/types/certification';

export default function CertificateVerificationPage() {
  const [params, setParams] = useSearchParams();
  const queryId = params.get('id');
  const lastVerifiedId = useRef('');
  const [certificateId, setCertificateId] = useState(queryId ?? '');
  const [result, setResult] = useState<CertificationVerification | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (queryId && queryId !== lastVerifiedId.current) { lastVerifiedId.current = queryId; setCertificateId(queryId); void verify(queryId); }
  // Run only when the query string changes, not after each state update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryId]);

  async function verify(value = certificateId) {
    const cleanId = value.trim().toUpperCase();
    if (!cleanId) { setError('Enter a certificate ID to verify.'); return; }
    lastVerifiedId.current = cleanId;
    setLoading(true); setError(''); setSearched(true); setResult(null);
    const { data, error: requestError } = await supabase.rpc('verify_powerlab_certificate', { p_certificate_id: cleanId });
    if (requestError) setError('Certificate verification is temporarily unavailable. Please try again.');
    else {
      const record = Array.isArray(data) ? data[0] : data;
      if (record) setResult(record as CertificationVerification);
    }
    setParams({ id: cleanId }, { replace: true });
    setLoading(false);
  }

  return <main className="container-content min-h-[70vh] py-16"><div className="mx-auto max-w-2xl"><p className="eyebrow text-bronze-600">POWERLAB</p><h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Verify a certificate</h1><p className="mt-3 text-sm leading-relaxed text-ink-muted">Enter the certificate ID to check its current status.</p><form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void verify(); }}><input className="field-input flex-1" aria-label="Certificate ID" placeholder="PL-2026-…" value={certificateId} onChange={(event) => setCertificateId(event.target.value)} /><button type="submit" className="btn-primary" disabled={loading}><Search size={16} />{loading ? 'Verifying…' : 'Verify'}</button></form>{error && <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}{result && <section className={`mt-6 border p-6 ${result.status === 'active' ? 'border-forest-200 bg-forest-50' : 'border-red-200 bg-red-50'}`}><BadgeCheck size={25} className={result.status === 'active' ? 'text-forest-700' : 'text-red-700'} /><p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">{result.status === 'active' ? 'Valid certificate' : 'Revoked certificate'}</p><h2 className="mt-2 font-display text-2xl text-ink">{result.recipient_name}</h2><p className="mt-2 text-sm text-ink-muted">{result.qualification}</p><p className="mt-1 text-xs text-ink-muted">Certificate ID: {result.certificate_id}</p><p className="mt-1 text-xs text-ink-muted">Issued: {new Date(result.issued_at).toLocaleDateString()}</p></section>}{searched && !loading && !error && !result && <p role="status" className="mt-6 border border-line bg-surface p-4 text-sm text-ink-muted">No certificate was found with that ID.</p>}<Link to="/" className="btn-ghost mt-8">Return to POWERLAB</Link></div></main>;
}
