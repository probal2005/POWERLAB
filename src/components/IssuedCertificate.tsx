import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';
import { useLanguage } from '@/context/LanguageContext';
import type { CertificationIssuedCertificate } from '@/types/certification';

export default function IssuedCertificate({ certificate, recipient }: {
  certificate: CertificationIssuedCertificate;
  recipient: string;
}) {
  const { t, language } = useLanguage();
  const [copyMessage, setCopyMessage] = useState('');
  const active = certificate.status === 'active';
  const verifyPath = `/verify-certificate?id=${encodeURIComponent(certificate.certificate_id)}`;
  const verificationUrl = new URL(verifyPath, window.location.origin).href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopyMessage(t('Verification link copied.', 'যাচাইয়ের লিংক কপি হয়েছে।'));
    } catch {
      setCopyMessage(t('Open the verification page to copy its link.', 'লিংক কপি করতে যাচাই পৃষ্ঠা খুলুন।'));
    }
  }

  return (
    <section className={`mt-8 border p-4 sm:p-8 ${active ? 'printable-certificate border-forest-200 bg-surface' : 'border-red-200 bg-red-50'}`}>
      <div className="border border-bronze-400 p-5 text-center sm:p-10">
        <BrandLogo variant="auth" />
        <h2 className="mt-4 font-display text-2xl text-ink sm:text-3xl">
          {active ? t('Certificate of completion', 'পাঠ সমাপ্তির সার্টিফিকেট') : t('Certificate revoked', 'সার্টিফিকেট বাতিল হয়েছে')}
        </h2>
        {recipient && <p className="mt-4 break-words font-display text-xl text-ink">{recipient}</p>}
        <p className="mt-2 text-sm text-ink-muted">{certificate.qualification}</p>
        <dl className="mt-5 space-y-2 text-sm">
          <div>
            <dt className="font-semibold">{t('Certificate ID', 'সার্টিফিকেট আইডি')}</dt>
            <dd className="break-all">{certificate.certificate_id}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t('Issued', 'ইস্যুর তারিখ')}</dt>
            <dd><time dateTime={certificate.issued_at}>{new Date(certificate.issued_at).toLocaleDateString(language)}</time></dd>
          </div>
        </dl>
        <p className="hidden break-all text-sm print:mt-4 print:block">{verificationUrl}</p>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-3 print:hidden">
        {active && <button type="button" className="btn-primary" onClick={() => window.print()}>
          {t('Print or save as PDF', 'প্রিন্ট করুন বা PDF হিসেবে সংরক্ষণ করুন')}
        </button>}
        <Link className="btn-secondary" to={verifyPath}>{t('Verify certificate', 'সার্টিফিকেট যাচাই করুন')}</Link>
        <button type="button" className="btn-ghost" onClick={() => void copyLink()}>
          {t('Copy verification link', 'যাচাইয়ের লিংক কপি করুন')}
        </button>
      </div>
      <p role="status" className="mt-2 text-center text-sm text-ink-muted print:hidden">{copyMessage}</p>
    </section>
  );
}
