import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileEdit,
  Layers3,
  Plus,
} from 'lucide-react';
import { useContent } from '@/context/ContentContext';

export default function AdminDashboardPage() {
  const { laws, categories } = useContent();

  const published = laws.filter((law) => law.isPublished !== false);
  const drafts = laws.filter((law) => law.isPublished === false);
  const lessonsWithContent = laws.filter(
    (law) => (law.sections?.length ?? 0) > 0
  );

  const stats = [
    {
      label: 'Total laws',
      value: laws.length,
      detail: 'All law entries',
      icon: BookOpen,
    },
    {
      label: 'Published',
      value: published.length,
      detail: 'Visible on public pages',
      icon: CheckCircle2,
    },
    {
      label: 'Drafts',
      value: drafts.length,
      detail: 'Not publicly visible',
      icon: FileEdit,
    },
    {
      label: 'Categories',
      value: categories.length,
      detail: 'Content classifications',
      icon: Layers3,
    },
  ];

  return (
    <div className="animate-fade-up space-y-9">
      <section className="flex flex-col justify-between gap-5 border-b border-line pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-bronze-600">Workspace overview</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
            Manage the laws, learning material, and structure of your POWERLAB
            platform from one workspace.
          </p>
        </div>

        <Link to="/admin/laws" className="btn-primary w-fit">
          <Plus size={16} />
          Manage laws
        </Link>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow">Content statistics</p>
            <h2 className="mt-1 font-display text-xl text-ink">
              Your platform at a glance
            </h2>
          </div>
          <span className="text-xs text-ink-muted">Live local data</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                key={stat.label}
                className="border border-line bg-surface p-5"
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-ink-muted">
                    {stat.label}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center bg-canvas-2 text-forest-700">
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                </div>
                <p className="mt-5 font-display text-4xl text-ink">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{stat.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="border border-line bg-surface p-6 xl:col-span-3">
          <p className="eyebrow">Content health</p>
          <h2 className="mt-2 font-display text-xl text-ink">
            Lesson coverage
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Laws that currently contain at least one lesson section.
          </p>

          <div className="mt-7 flex items-end justify-between gap-4">
            <p className="font-display text-4xl text-ink">
              {lessonsWithContent.length}
              <span className="ml-2 text-lg text-ink-muted">
                / {laws.length}
              </span>
            </p>
            <p className="text-xs text-ink-muted">
              {laws.length
                ? Math.round((lessonsWithContent.length / laws.length) * 100)
                : 0}
              % coverage
            </p>
          </div>

          <div className="mt-4 h-2 overflow-hidden bg-canvas-2">
            <div
              className="h-full bg-forest-600 transition-all"
              style={{
                width: `${
                  laws.length
                    ? (lessonsWithContent.length / laws.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-5 text-xs text-ink-muted">
            <span>{published.length} published</span>
            <span>{drafts.length} drafts</span>
            <span>{lessonsWithContent.length} with lesson content</span>
          </div>
        </div>

        <div className="border border-line bg-surface p-6 xl:col-span-2">
          <p className="eyebrow">Quick actions</p>
          <h2 className="mt-2 font-display text-xl text-ink">
            Manage your content
          </h2>

          <div className="mt-5 divide-y divide-line">
            <Link
              to="/admin/laws"
              className="group flex items-center justify-between py-4"
            >
              <span>
                <span className="block text-sm font-medium text-ink">
                  Laws & lessons
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  Create, edit, publish, or remove laws
                </span>
              </span>
              <ArrowRight
                size={17}
                className="text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-forest-700"
              />
            </Link>

            <Link
              to="/admin/categories"
              className="group flex items-center justify-between py-4"
            >
              <span>
                <span className="block text-sm font-medium text-ink">
                  Categories
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  Organize the learning library
                </span>
              </span>
              <ArrowRight
                size={17}
                className="text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-forest-700"
              />
            </Link>

            <Link
              to="/admin/assessments"
              className="group flex items-center justify-between py-4"
            >
              <span>
                <span className="block text-sm font-medium text-ink">
                  Assessments
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  Manage quizzes and questions
                </span>
              </span>
              <ArrowRight
                size={17}
                className="text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-forest-700"
              />
            </Link>
          </div>
        </div>
      </section>

      <section className="border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-ink">Publishing checklist</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Review both language versions before publishing. Laws without lesson sections remain visible in the library, but the lesson page will ask students to return later. Add reviewed source material before publishing complete lesson content.
        </p>
      </section>
    </div>
  );
}
