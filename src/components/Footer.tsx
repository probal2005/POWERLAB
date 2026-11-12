import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import BrandLogo from './BrandLogo';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-24 border-t border-line bg-canvas-2/60">
      <div className="container-content py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center" aria-label="POWERLAB home">
              <BrandLogo variant="footer" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              {t(
                'An independent educational platform exploring timeless principles of power, influence, and strategic thinking through structured bilingual lessons.',
                'ক্ষমতা, প্রভাব এবং কৌশলগত চিন্তার শাশ্বত নীতিগুলি কাঠামোগত দ্বিভাষিক পাঠের মাধ্যমে অন্বেষণকারী একটি স্বাধীন শৈক্ষিক প্ল্যাটফর্ম।'
              )}
            </p>
          </div>

          <div className="md:col-span-2">
            <h3 className="eyebrow mb-4">{t('Explore', 'অন্বেষণ')}</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/laws" className="text-ink/80 hover:text-forest-600 transition-colors">{t('All 48 Laws', '৪৮ নিয়ম')}</Link></li>
              <li><Link to="/about" className="text-ink/80 hover:text-forest-600 transition-colors">{t('About', 'পরিচিতি')}</Link></li>
              <li><Link to="/assessments" className="text-ink/80 hover:text-forest-600 transition-colors">{t('Assessments', 'মূল্যায়ন')}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="eyebrow mb-4">{t('Account', 'হিসাব')}</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/login" className="text-ink/80 hover:text-forest-600 transition-colors">{t('Sign In', 'প্রবেশ')}</Link></li>
              <li><Link to="/register" className="text-ink/80 hover:text-forest-600 transition-colors">{t('Register', 'নিবন্ধন')}</Link></li>
              <li><Link to="/student" className="text-ink/80 hover:text-forest-600 transition-colors">{t('Dashboard', 'ড্যাশবোর্ড')}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="eyebrow mb-4">{t('Independence Notice', 'স্বাধীনতা বিজ্ঞপ্তি')}</h3>
            <p className="text-xs leading-relaxed text-ink-muted">
              {t(
                'POWERLAB is an independent educational project. It is not affiliated with, endorsed by, or sponsored by Robert Greene or his publishers. All commentary is original.',
                'POWERLAB একটি স্বাধীন শৈক্ষিক প্রকল্প। এটি রবার্ট গ্রিন বা তাঁর প্রকাশকদের সাথে সম্পর্কিত, অনুমোদিত বা স্পন্সর করা নয়। সমস্ত ভাষ্য মৌলিক।'
              )}
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} POWERLAB. {t('All rights reserved.', 'সর্বস্বত্ব সংরক্ষিত।')}
          </p>
          <p className="text-xs text-ink-muted">
            {t('48 Laws. One Learning Journey.', '৪৮ নিয়ম। এক শেখার যাত্রা।')}
          </p>
        </div>
      </div>
    </footer>
  );
}
