import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { CertificationCertificateRecord } from '@/types/certification';

type CertificateSummary = Pick<CertificationCertificateRecord, 'certificate_id' | 'qualification' | 'issued_at' | 'status' | 'revoked_at' | 'revocation_reason'>;

export default function CertificateManagement() {
  const [query, setQuery] = useState('');
  const [certificate, setCertificate] = useState<CertificateSummary | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function findCertificate(id: string) {
    return supabase.from('certificates')
      .select('certificate_id,qualification,issued_at,status,revoked_at,revocation_reason')
      .eq('certificate_id', id).maybeSingle<CertificateSummary>();
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = query.trim().toUpperCase();
    if (!id || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    setCertificate(null);
    setConfirmed(false);
    setReason('');
    const { data, error: lookupError } = await findCertificate(id);
    if (lookupError) setError(lookupError.message);
    else if (!data) setNotice('No certificate matched that ID.');
    else setCertificate(data);
    setBusy(false);
  }

  async function revoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!certificate || certificate.status !== 'active' || !confirmed || reason.trim().length < 5 || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const { error: revokeError } = await supabase.rpc('revoke_powerlab_certificate', {
      p_certificate_id: certificate.certificate_id,
      p_reason: reason.trim(),
    });
    if (revokeError) {
      setError(revokeError.message);
    } else {
      setCertificate({ ...certificate, status: 'revoked', revocation_reason: reason.trim() });
      setNotice('Certificate revoked. The public verification page now shows its revoked status.');
      const { data } = await findCertificate(certificate.certificate_id);
      if (data) setCertificate(data);
    }
    setBusy(false);
  }

  return (
    <section className="space-y-4 border border-line bg-surface p-5 sm:p-7">
      <h2 className="font-display text-xl text-ink">Issued certificates</h2>
      <form className="flex flex-wrap items-end gap-3" onSubmit={search}>
        <label className="w-full max-w-md text-sm text-ink">Certificate ID
          <input className="field-input mt-1" value={query} onChange={(event) => setQuery(event.target.value)} required disabled={busy} />
        </label>
        <button type="submit" className="btn-secondary" disabled={busy}>Find certificate</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="text-sm text-ink">{notice}</p>}
      {certificate && (
        <div className="space-y-3 border border-line p-4">
          <p className="break-all text-sm font-semibold">{certificate.certificate_id}</p>
          <p className="text-sm">{certificate.qualification} · {new Date(certificate.issued_at).toLocaleDateString()}</p>
          <p className="text-sm">{certificate.status === 'active' ? 'Active' : 'Revoked'}</p>
          <Link className="btn-ghost" to={`/verify-certificate?id=${encodeURIComponent(certificate.certificate_id)}`}>View public verification</Link>
          {certificate.status === 'revoked' && certificate.revocation_reason && <p className="break-words text-sm">Revocation reason: {certificate.revocation_reason}</p>}
          {certificate.status === 'active' && (
            <form className="space-y-3" onSubmit={revoke}>
              <label className="block text-sm">Revocation reason
                <textarea className="field-input mt-1" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} required disabled={busy} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} />
                Confirm permanent revocation of this certificate
              </label>
              <button type="submit" className="btn-secondary text-red-800" disabled={busy || !confirmed || reason.trim().length < 5}>Revoke certificate</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
