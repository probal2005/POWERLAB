import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import IssuedCertificate from '@/components/IssuedCertificate';
import { supabase } from '@/lib/supabase';
import type { CertificateDesign } from '@/types/certification';

const designColumns = 'title_en,title_bn,subtitle_en,subtitle_bn,qualification_en,qualification_bn,accent,frame,partner_name,partner_logo';
const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
const maxLogoBytes = 256 * 1024;

const textFields = [
  { key: 'title_en', label: 'Title (English)', maxlength: 100, lang: 'en' },
  { key: 'title_bn', label: 'Title (বাংলা)', maxlength: 100, lang: 'bn' },
  { key: 'subtitle_en', label: 'Subtitle (English)', maxlength: 160, lang: 'en' },
  { key: 'subtitle_bn', label: 'Subtitle (বাংলা)', maxlength: 160, lang: 'bn' },
  { key: 'qualification_en', label: 'Course or award name (English)', maxlength: 120, lang: 'en' },
  { key: 'qualification_bn', label: 'Course or award name (বাংলা)', maxlength: 120, lang: 'bn' },
] as const;

function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject();
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function CertificateDesignEditor() {
  const [draft, setDraft] = useState<CertificateDesign | null>(null);
  const [published, setPublished] = useState<CertificateDesign | null>(null);
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'bn'>('en');
  const [busy, setBusy] = useState(false);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.location.hash === '#certificate-design') section.current?.scrollIntoView();
  }, []);

  useEffect(() => {
    const request = new AbortController();
    void supabase.from('certificate_design').select(designColumns).eq('id', true)
      .abortSignal(request.signal).single<CertificateDesign>().then(({ data, error }) => {
        if (request.signal.aborted) return;
        if (error || !data) setError('The published certificate content could not be loaded.');
        else { setDraft(data); setPublished(data); }
      });
    return () => request.abort();
  }, [loadVersion]);

  function change<K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) {
    setNotice('');
    setDraft((current) => current && { ...current, [key]: value });
  }

  async function upload(file: File) {
    setError('');
    setNotice('');
    if (!allowedTypes.includes(file.type) || file.size > maxLogoBytes) {
      setError('Choose a PNG, JPEG, or WebP file of 256 KB or less.');
      return;
    }

    setLoadingLogo(true);
    try {
      const image = await createImageBitmap(file);
      const fits = image.width <= 2048 && image.height <= 2048;
      image.close();
      if (!fits) {
        setError('The logo must be no larger than 2048 × 2048 pixels.');
        return;
      }
      change('partner_logo', await readLogo(file));
    } catch {
      setError('This image could not be read. Choose another logo.');
    } finally {
      setLoadingLogo(false);
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy || loadingLogo) return;

    const next = {
      ...draft,
      title_en: draft.title_en.trim(),
      title_bn: draft.title_bn.trim(),
      subtitle_en: draft.subtitle_en.trim(),
      subtitle_bn: draft.subtitle_bn.trim(),
      qualification_en: draft.qualification_en.trim(),
      qualification_bn: draft.qualification_bn.trim(),
      partner_name: draft.partner_name.trim(),
    };
    setError('');
    setNotice('');
    if (next.partner_logo && !next.partner_name) {
      setError('Enter the partner name so the logo can be identified.');
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.from('certificate_design').update(next).eq('id', true)
        .select(designColumns).single<CertificateDesign>();
      if (error || !data) {
        setError('The design could not be published. Your changes are still in the editor.');
        return;
      }
      setDraft(data);
      setPublished(data);
      setNotice('Design published for newly issued certificates.');
    } catch {
      setError('Could not connect. Your changes are still in the editor.');
    } finally {
      setBusy(false);
    }
  }

  const dirty = draft && published && Object.keys(draft).some((key) => {
    const field = key as keyof CertificateDesign;
    return draft[field] !== published[field];
  });

  return (
    <section ref={section} id="certificate-design" className="scroll-mt-24 space-y-5 border border-line bg-surface p-5 sm:p-7" aria-labelledby="certificate-design-title">
      <div>
        <h2 id="certificate-design-title" className="font-display text-xl text-ink">Certificate content and design</h2>
        <p className="mt-2 text-sm text-ink-muted">Edit the title, subtitle, and course or award name for future certificates. Leave the award name blank to use the default.</p>
      </div>
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="border border-forest-200 bg-forest-50 p-3 text-sm text-forest-800">{notice}</p>}
      {!draft && error && (
        <button type="button" className="btn-secondary" onClick={() => { setError(''); setLoadVersion((version) => version + 1); }}>Retry loading certificate content</button>
      )}
      {!draft && !error && <p role="status" className="text-sm text-ink-muted">Loading certificate design…</p>}
      {draft && (
        <div className="grid gap-6 2xl:grid-cols-2">
          <form onSubmit={(event) => void publish(event)} className="min-w-0">
            <fieldset disabled={busy || loadingLogo} className="min-w-0 space-y-4">
              <legend className="mb-2 text-sm font-semibold text-ink">Certificate text</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {textFields.map(({ key, label, maxlength, lang }) => (
                  <label key={key} className="min-w-0 text-sm">{label}
                    <input className="field-input mt-1" lang={lang} maxLength={maxlength} value={draft[key]} onChange={(event) => change(key, event.target.value)} />
                  </label>
                ))}
              </div>
              <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                <label className="text-sm">Frame
                  <select className="field-input mt-1" value={draft.frame} onChange={(event) => change('frame', event.target.value as CertificateDesign['frame'])}>
                    <option value="classic">Classic border</option>
                    <option value="minimal">Minimal top rule</option>
                  </select>
                </label>
                <label className="text-sm">Accent colour
                  <input className="field-input mt-1 max-w-24" type="color" value={draft.accent} onChange={(event) => change('accent', event.target.value)} />
                </label>
              </div>
              <div className="space-y-3 border-t border-line pt-4">
                <label className="block text-sm">Partner company name
                  <input className="field-input mt-1" maxLength={100} value={draft.partner_name} onChange={(event) => change('partner_name', event.target.value)} />
                </label>
                <label className="block text-sm"><ImagePlus size={16} className="mr-2 inline-block" aria-hidden="true" />Partner logo
                  <input className="field-input mt-1" type="file" accept={allowedTypes.join(',')} aria-describedby="certificate-logo-help"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      if (file) void upload(file);
                    }} />
                </label>
                <p id="certificate-logo-help" className="text-xs text-ink-muted">PNG, JPEG or WebP. Maximum 256 KB and 2048 × 2048 pixels.</p>
                {draft.partner_logo && <button type="button" className="btn-ghost" onClick={() => change('partner_logo', '')}>Remove partner logo</button>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-primary" disabled={!dirty}>
                  <Save size={16} aria-hidden="true" />{busy ? 'Publishing…' : 'Publish design'}
                </button>
                <button type="button" className="btn-secondary" disabled={!dirty} onClick={() => { setDraft(published); setError(''); setNotice(''); }}>Discard changes</button>
              </div>
            </fieldset>
          </form>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg">Certificate preview</h3>
              <select aria-label="Preview language" className="field-input w-auto" value={previewLanguage}
                onChange={(event) => setPreviewLanguage(event.target.value === 'bn' ? 'bn' : 'en')}>
                <option value="en">English</option>
                <option value="bn" lang="bn">বাংলা</option>
              </select>
            </div>
            <IssuedCertificate previewLanguage={previewLanguage} recipient="Example Learner" certificate={{
              certificate_id: 'PL-PREVIEW', qualification: 'Master of the 48 Laws of Power',
              issued_at: new Date().toISOString(), status: 'active', design_snapshot: draft,
            }} />
          </div>
        </div>
      )}
    </section>
  );
}
