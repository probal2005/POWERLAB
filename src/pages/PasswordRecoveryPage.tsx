import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { hasPasswordRecoverySession, supabase } from '@/lib/supabase';

export default function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const [recovery, setRecovery] = useState(hasPasswordRecoverySession);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!reset) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    return () => data.subscription.unsubscribe();
  }, [reset]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || finished || (reset && !recovery)) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    if (reset) {
      const password = String(form.get('password') ?? '');
      if (password !== form.get('confirm')) {
        setError('The passwords do not match.');
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setError(error.message);
        else {
          setFinished(true);
          await supabase.auth.signOut();
          setStatus('Password changed. Sign in with your new password.');
        }
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(String(form.get('email') ?? '').trim(), {
        redirectTo: new URL('/reset-password', window.location.origin).href,
      });
      if (error && error.status !== 400 && error.status !== 404) {
        setError('Could not send a reset link right now. Try again shortly.');
      } else {
        setFinished(true);
        setStatus('If an account exists for that address, a reset link will arrive by email.');
      }
    }
    setBusy(false);
  }

  return (
    <section className="container-content py-16">
      <div className="mx-auto max-w-md space-y-5">
        <h1 className="font-display text-3xl text-ink">{reset ? 'Set a new password' : 'Reset your password'}</h1>
        {reset && !recovery && !finished && <p className="text-sm text-ink-muted">Open the link from your recovery email. If it has expired, <Link className="underline" to="/forgot-password">request another link</Link>.</p>}
        {!finished && (!reset || recovery) && <form onSubmit={(event) => void submit(event)} className="space-y-4">
          {reset ? <>
            <label className="block text-sm">New password<input className="field-input mt-1" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
            <label className="block text-sm">Confirm password<input className="field-input mt-1" name="confirm" type="password" autoComplete="new-password" minLength={8} required /></label>
          </> : <label className="block text-sm">Email address<input className="field-input mt-1" name="email" type="email" autoComplete="email" required /></label>}
          <button type="submit" className="btn-primary" disabled={busy}>{reset ? 'Save new password' : 'Send reset link'}</button>
        </form>}
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        {status && <p role="status" className="text-sm text-forest-700">{status}</p>}
        <Link to="/login" className="btn-secondary">Back to sign in</Link>
      </div>
    </section>
  );
}
