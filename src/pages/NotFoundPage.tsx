import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function NotFoundPage() {
  const { t, language } = useLanguage();

  return (
    <section
      className={`container-content flex min-h-[65vh] items-center justify-center py-20 ${
        language === 'bn' ? 'font-bengali' : ''
      }`}
    >
      <div className="max-w-xl text-center">
        <span className="font-display text-7xl text-forest-600">404</span>

        <h1 className="mt-5 font-display text-3xl text-ink">
          {t('Page not found', 'পৃষ্ঠাটি খুঁজে পাওয়া যায়নি')}
        </h1>

        <p className="mt-4 leading-[1.8] text-ink-muted">
          {t(
            'The page you are looking for may have moved, or the address may be incorrect.',
            'আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি সরানো হয়ে থাকতে পারে অথবা ঠিকানাটি ভুল হতে পারে।'
          )}
        </p>

        <Link to="/" className="btn-primary mt-8">
          <ArrowLeft className="h-4 w-4" />
          <BookOpen className="h-4 w-4" />
          {t('Return to homepage', 'হোমপেজে ফিরে যান')}
        </Link>
      </div>
    </section>
  );
}
