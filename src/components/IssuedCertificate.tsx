import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';
import { useLanguage } from '@/context/LanguageContext';
import type { CertificationIssuedCertificate } from '@/types/certification';

export default function IssuedCertificate({ certificate, recipient, previewLanguage }: {
  certificate: CertificationIssuedCertificate;
  recipient: string;
  previewLanguage?: 'en' | 'bn';
}) {
  const { t: translate, language: currentLanguage } = useLanguage();
  const preview = Boolean(previewLanguage);
  const language = previewLanguage ?? currentLanguage;
  const t = previewLanguage
    ? (en: string, bn: string) => previewLanguage === 'bn' ? bn : en
    : translate;
  const [copyMessage, setCopyMessage] = useState('');
  const active = certificate.status === 'active';
  const design = certificate.design_snapshot;
  const title = t(design?.title_en || 'Certificate of completion', design?.title_bn || 'পাঠ সমাপ্তির সার্টিফিকেট');
  const subtitle = t(design?.subtitle_en ?? '', design?.subtitle_bn ?? '');
  const minimal = design?.frame === 'minimal';
  const modern = design?.frame === 'modern';
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
    <section lang={language} className={`mt-8 ${modern ? 'certificate-modern-document' : 'border p-4 sm:p-8'} ${active ? `${preview ? '' : 'printable-certificate'} ${modern ? '' : 'border-forest-200 bg-surface'}` : 'border-red-200 bg-red-50'}`}>
      <div
        className={modern ? 'certificate-modern' : `${minimal ? 'border-t-4' : 'border border-bronze-400'} p-4 text-center sm:p-8`}
        style={modern ? { '--certificate-accent': design?.accent } as CSSProperties : { borderColor: design?.accent || undefined }}
      >
        <div className={modern ? "certificate-modern-logos" : "flex flex-wrap items-center justify-center gap-x-5 gap-y-2"}>
          <BrandLogo variant="auth" />
          {design?.partner_logo && (
            <img src={design.partner_logo} alt={design.partner_name} className="h-14 w-28 object-contain" />
          )}
        </div>
        {design?.partner_name && <p className={modern ? 'certificate-modern-partner' : 'mt-3 break-words text-sm text-ink-muted'}>{t('In collaboration with', 'সহযোগিতায়')} {design.partner_name}</p>}
        <h2 className={modern ? 'certificate-modern-title font-display' : 'mt-4 break-words font-display text-2xl text-ink sm:text-3xl'}>
          {active ? title : t('Certificate revoked', 'সার্টিফিকেট বাতিল হয়েছে')}
        </h2>
        {subtitle && <p className="mt-2 break-words text-sm text-ink-muted">{subtitle}</p>}
        {recipient && <p className={modern ? 'certificate-modern-recipient font-display' : 'mt-4 break-words font-display text-xl text-ink'}>{recipient}</p>}
        <p className={modern ? 'certificate-modern-qualification' : 'mt-2 text-sm text-ink-muted'}>{certificate.qualification}</p>
        <dl className={modern ? 'certificate-modern-details' : 'mt-5 space-y-2 text-sm'}>
          <div>
            <dt className="font-semibold">{t('Certificate ID', 'সার্টিফিকেট আইডি')}</dt>
            <dd className="break-all">{certificate.certificate_id}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t('Issued', 'ইস্যুর তারিখ')}</dt>
            <dd><time dateTime={certificate.issued_at}>{new Date(certificate.issued_at).toLocaleDateString(language)}</time></dd>
          </div>
        </dl>
        {!preview && <p className="hidden break-all text-sm print:mt-4 print:block">{verificationUrl}</p>}
      </div>
      {!preview && (
        <>
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
        </>
      )}
    </section>
  );
}
