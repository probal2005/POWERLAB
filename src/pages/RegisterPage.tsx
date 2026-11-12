import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import BrandLogo from '@/components/BrandLogo';

export default function RegisterPage() {
  const { t, language } = useLanguage();
  const { signUp, user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notice, setNotice] = useState('');
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
    setNotice('');

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const confirmation = String(formData.get('confirmPassword') || '');

    if (password !== confirmation) {
      setError(t('The passwords do not match.', 'পাসওয়ার্ড দুটি মিলছে না।'));
      return;
    }

    if (fullName.length < 2) {
      setError(t('Please enter your full name.', 'আপনার সম্পূর্ণ নাম লিখুন।'));
      return;
    }

    setSubmitting(true);

    try {
      const result = await signUp(fullName, email, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.emailConfirmationRequired) {
        setNotice(
          t(
            'Your account request was submitted. Check your email for the confirmation link before signing in.',
            'আপনার অ্যাকাউন্ট তৈরির অনুরোধ জমা হয়েছে। প্রবেশ করার আগে ইমেইলে পাঠানো নিশ্চিতকরণ লিংক ব্যবহার করুন।'
          )
        );
      } else {
        navigate('/student', { replace: true });
      }
    } catch {
      setError(
        t(
          'Registration could not be completed. Please check your connection and try again.',
          'নিবন্ধন সম্পন্ন করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'
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
            {t('BEGIN YOUR JOURNEY', 'আপনার যাত্রা শুরু করুন')}
          </span>

          <h1 className="mt-3 font-display text-3xl tracking-tightish text-ink md:text-4xl">
            {t('Create your account', 'আপনার অ্যাকাউন্ট তৈরি করুন')}
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            {t(
              'Create a space to keep track of your reading, notes, and learning progress.',
              'আপনার পড়াশোনা, নোট এবং শেখার অগ্রগতি সংরক্ষণের জন্য একটি অ্যাকাউন্ট তৈরি করুন।'
            )}
          </p>
        </div>

        <div className="surface-card mt-9 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-medium text-ink">
                {t('Full name', 'সম্পূর্ণ নাম')}
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                placeholder={t('Your name', 'আপনার নাম')}
                className="w-full rounded-sm border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none transition focus:border-forest-400"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-ink">
                {t('Email address', 'ইমেইল ঠিকানা')}
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-sm border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none transition focus:border-forest-400"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-ink">
                {t('Password', 'পাসওয়ার্ড')}
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder={t('At least 8 characters', 'কমপক্ষে ৮টি অক্ষর')}
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

            <div>
              <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-medium text-ink">
                {t('Confirm password', 'পাসওয়ার্ড নিশ্চিত করুন')}
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmation ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder={t('Enter your password again', 'আবার পাসওয়ার্ড লিখুন')}
                  className="w-full rounded-sm border border-line bg-canvas px-4 py-3 pr-12 text-sm text-ink outline-none transition focus:border-forest-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmation((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-ink-muted hover:text-forest-600"
                  aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'}
                >
                  {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-sm border border-error/30 bg-error/5 p-3 text-sm text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              {submitting
                ? t('Creating account...', 'অ্যাকাউন্ট তৈরি হচ্ছে...')
                : t('Create Account', 'অ্যাকাউন্ট তৈরি করুন')}
              <ArrowRight className="h-4 w-4" />
            </button>

            {notice && (
              <p role="status" className="rounded-sm border border-bronze-200 bg-bronze-50 p-3 text-sm leading-relaxed text-ink">
                {notice}
              </p>
            )}
          </form>

          <div className="my-6 rule-line" />

          <p className="text-center text-sm text-ink-muted">
            {t('Already have an account?', 'ইতিমধ্যে অ্যাকাউন্ট আছে?')}{' '}
            <Link to="/login" className="font-semibold text-forest-600 underline-offset-4 hover:underline">
              {t('Sign in', 'প্রবেশ করুন')}
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-muted">
          {t(
            'You can explore all 48 lessons without creating an account.',
            'অ্যাকাউন্ট তৈরি না করেও আপনি ৪৮টি পাঠ অন্বেষণ করতে পারবেন।'
          )}{' '}
          <Link to="/laws" className="font-medium text-forest-600 hover:underline">
            {t('Explore the laws', 'নিয়মগুলো দেখুন')}
          </Link>
        </p>
      </div>
    </section>
  );
}
