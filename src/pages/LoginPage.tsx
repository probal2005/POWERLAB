import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage() {
  const { t, language } = useLanguage();
  const { signIn, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      navigate(profile.role === 'admin' ? '/admin' : '/student', {
        replace: true,
      });
    }
  }, [loading, user, profile, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');

    try {
      const result = await signIn(email, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      const state = location.state as
        | { from?: { pathname?: string } }
        | null;

      const requestedPath = state?.from?.pathname;
      const defaultDestination =
        result.role === 'admin' ? '/admin' : '/student';

      const allowedPrefix =
        result.role === 'admin' ? '/admin' : '/student';

      const destination =
        requestedPath &&
        (requestedPath === allowedPrefix ||
          requestedPath.startsWith(`${allowedPrefix}/`))
          ? requestedPath
          : defaultDestination;

      navigate(destination, { replace: true });
    } catch {
      setError(
        t(
          'Unable to sign in. Please check your connection and try again.',
          'প্রবেশ করা যাচ্ছে না। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`container-content flex min-h-[68vh] items-center justify-center py-16 md:py-24 ${language === 'bn' ? 'font-bengali' : ''}`}>
      <div className="w-full max-w-md">
        <div className="text-center">
          <BrandLogo variant="auth" />

          <span className="eyebrow mt-7 block text-bronze-500">
            {t('WELCOME BACK', 'আবার স্বাগতম')}
          </span>

          <h1 className="mt-3 font-display text-3xl tracking-tightish text-ink md:text-4xl">
            {t('Sign in to POWERLAB', 'POWERLAB-এ প্রবেশ করুন')}
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            {t(
              'Continue your learning journey and return to the ideas you have been exploring.',
              'আপনার শেখার যাত্রা চালিয়ে যান এবং আগে পড়া বিষয়গুলোতে ফিরে আসুন।'
            )}
          </p>
        </div>

        <div className="surface-card mt-9 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-ink">
                {t('Email address', 'ইমেইল ঠিকানা')}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-sm border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none transition focus:border-forest-400"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-ink">
                {t('Password', 'পাসওয়ার্ড')}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder={t('Enter your password', 'আপনার পাসওয়ার্ড লিখুন')}
                  className="w-full rounded-sm border border-line bg-canvas px-4 py-3 pr-12 text-sm text-ink outline-none transition focus:border-forest-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-ink-muted hover:text-forest-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <span className="text-xs text-ink-muted">
                {t('Password recovery will be available soon.', 'পাসওয়ার্ড পুনরুদ্ধার সুবিধা শীঘ্রই আসছে।')}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? t('Signing in...', 'প্রবেশ করা হচ্ছে...')
                : t('Sign In', 'প্রবেশ করুন')}
              <ArrowRight className="h-4 w-4" />
            </button>

            {error && (
              <p role="alert" className="rounded-sm border border-error/30 bg-error/5 p-3 text-sm leading-relaxed text-error">
                {error}
              </p>
            )}
          </form>

          <div className="my-6 rule-line" />

          <p className="text-center text-sm text-ink-muted">
            {t("Don't have an account?", 'আপনার কি অ্যাকাউন্ট নেই?')}{' '}
            <Link to="/register" className="font-semibold text-forest-600 underline-offset-4 hover:underline">
              {t('Create an account', 'অ্যাকাউন্ট তৈরি করুন')}
            </Link>
          </p>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-muted">
          <LockKeyhole className="h-3.5 w-3.5" />
          {t('Your learning journey, at your own pace.', 'আপনার নিজের গতিতে শেখার যাত্রা।')}
        </p>

        <p className="mt-3 text-center text-xs text-ink-muted">
          <Link to="/laws" className="hover:text-forest-600">
            {t('Continue reading without an account', 'অ্যাকাউন্ট ছাড়াই পড়া চালিয়ে যান')}
          </Link>
        </p>
      </div>
    </section>
  );
}
