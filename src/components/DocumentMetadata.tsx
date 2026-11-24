import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';

const siteUrl = 'https://powerlab48.vercel.app';
const defaultDescription = 'Explore 48 principles of power through bilingual lessons, practical examples, and assessments.';

const pageTitles: Record<string, string> = {
  '/': '48 Laws. One Learning Journey.',
  '/laws': 'Explore the 48 Laws',
  '/about': 'About',
  '/assessments': 'Assessments',
  '/certification': 'Certification',
  '/student': 'Student dashboard',
  '/student/review': 'Learning review',
  '/login': 'Sign in',
  '/register': 'Create an account',
  '/forgot-password': 'Reset your password',
  '/reset-password': 'Choose a new password',
  '/assessment/final': 'Final assessment',
  '/verify-certificate': 'Verify a certificate',
};

const publicPages = new Set(['/', '/laws', '/about', '/assessments']);

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  const element = existing ?? document.createElement('meta');
  element.setAttribute(attribute, key);
  element.content = content;
  if (!existing) document.head.append(element);
}

export default function DocumentMetadata() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '') || '/';
  const { laws, loading } = useContent();
  const route = path.match(/^\/(laws|assessment)\/([^/]+)$/);
  const law = route && laws.find(({ slug }) => slug === route[2]);
  const assessment = route?.[1] === 'assessment';
  const isAdmin = /^\/admin(?:\/|$)/.test(path);
  const title = pageTitles[path] ?? (law
    ? (assessment ? `Assessment: ${law.titleEn}` : law.titleEn)
    : isAdmin ? 'Administration' : route && loading ? 'Learning library' : 'Page not found');
  const description = law?.shortEn.trim() || defaultDescription;
  const indexable = publicPages.has(path) || Boolean(law && path !== '/assessment/final');
  const url = `${siteUrl}${path}`;

  useEffect(() => {
    const fullTitle = `${title} | POWERLAB`;
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'robots', indexable ? 'index, follow' : 'noindex, follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!indexable) {
      canonical?.remove();
      return;
    }

    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = url;
  }, [description, indexable, title, url]);

  return null;
}
