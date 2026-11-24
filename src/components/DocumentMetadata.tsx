import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';

const titleByPath: Record<string, string> = {
  '/': '48 Laws. One Learning Journey.',
  '/laws': 'Explore the 48 Laws',
  '/about': 'About',
  '/assessments': 'Assessments',
  '/certification': 'Certification',
  '/student': 'Student dashboard',
  '/login': 'Sign in',
  '/register': 'Create an account',
  '/verify-certificate': 'Verify a certificate',
};

export default function DocumentMetadata() {
  const { pathname } = useLocation();
  const { laws } = useContent();
  const lesson = pathname.match(/^\/(laws|assessment)\/([^/]+)$/);
  const law = lesson && laws.find(({ slug }) => slug === lesson[2]);
  const title = law
    ? (lesson[1] === 'assessment' ? `Assessment: ${law.titleEn}` : law.titleEn)
    : titleByPath[pathname] ?? (pathname.startsWith('/admin') ? 'Administration' : 'Learning library');

  useEffect(() => {
    document.title = `${title} | POWERLAB`;
  }, [title]);

  return null;
}
