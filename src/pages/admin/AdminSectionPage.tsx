import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

const sections: Record<
  string,
  { title: string; description: string; status: string }
> = {
  laws: {
    title: 'Laws & Lessons',
    description:
      'Create, edit, publish, unpublish, reorder, and remove law entries. Lesson editing will be included in this workspace.',
    status: 'Content management interface is being implemented.',
  },
  categories: {
    title: 'Categories',
    description:
      'Create and organize bilingual categories, update their labels, and remove categories that are no longer in use.',
    status: 'Category management interface is being implemented.',
  },
  assessments: {
    title: 'Assessments',
    description:
      'Build question banks, manage answer options, define correct answers, and add explanations.',
    status: 'Assessment management interface is being implemented.',
  },
  users: {
    title: 'Users',
    description:
      'User accounts, roles, and account status require a connected authentication backend.',
    status: 'This section requires backend authentication and user storage.',
  },
  settings: {
    title: 'Platform settings',
    description:
      'Manage platform identity and configuration. Production settings will require server-side storage.',
    status: 'Settings interface is being implemented.',
  },
};

export default function AdminSectionPage() {
  const location = useLocation();
  const key = location.pathname.split('/').filter(Boolean)[1] ?? '';
  const section = sections[key];

  if (!section) {
    return (
      <div className="border border-line bg-surface p-8">
        <h1 className="font-display text-2xl text-ink">
          Admin section not found
        </h1>
        <Link to="/admin" className="btn-secondary mt-5">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="border-b border-line pb-8">
        <p className="eyebrow text-bronze-600">Administration</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl">
          {section.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {section.description}
        </p>
      </div>

      <div className="mt-8 border border-line bg-surface p-8 sm:p-10">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center bg-canvas-2 text-forest-700">
            <Construction size={25} strokeWidth={1.6} />
          </span>
          <h2 className="mt-5 font-display text-2xl text-ink">
            Management tools coming next
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {section.status}
          </p>
          <Link to="/admin" className="btn-secondary mt-7">
            <ArrowLeft size={16} />
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}
