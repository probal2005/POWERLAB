import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Construction, Plus, Save, Search, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { supabase } from '@/lib/supabase';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';

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

  if (key === 'categories') return <CategoryManager />;
  if (key === 'assessments') return <AssessmentManager />;
  if (key === 'users') return <UserManager />;
  if (key === 'settings') return <AdminSettingsPage />;

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

function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory, loading, error } = useContent();
  const [newId, setNewId] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newBn, setNewBn] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { en: string; bn: string }>>({});
  const [message, setMessage] = useState('');

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = newId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id || !newEn.trim() || !newBn.trim()) {
      setMessage('Enter an English and Bengali label.');
      return;
    }
    try {
      await addCategory({ id, labelEn: newEn.trim(), labelBn: newBn.trim() });
      setNewId(''); setNewEn(''); setNewBn(''); setMessage('Category added.');
    } catch (saveError) { setMessage(saveError instanceof Error ? saveError.message : 'Could not add category.'); }
  }

  async function saveCategory(id: string, currentEn: string, currentBn: string) {
    const draft = drafts[id] ?? { en: currentEn, bn: currentBn };
    try {
      await updateCategory(id, { labelEn: draft.en.trim(), labelBn: draft.bn.trim() });
      setMessage('Category updated.');
    } catch (saveError) { setMessage(saveError instanceof Error ? saveError.message : 'Could not update category.'); }
  }

  async function removeCategory(id: string) {
    if (!window.confirm(`Delete category “${id}”? Categories used by laws cannot be deleted.`)) return;
    try { await deleteCategory(id); setMessage('Category deleted.'); }
    catch (deleteError) { setMessage(deleteError instanceof Error ? deleteError.message : 'Could not delete category.'); }
  }

  return (
    <div className="animate-fade-up space-y-7">
      <div className="border-b border-line pb-8">
        <p className="eyebrow text-bronze-600">Administration</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl">Categories</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">Manage the shared bilingual categories used by the law library.</p>
      </div>
      <form onSubmit={createCategory} className="grid gap-3 border border-line bg-surface p-5 md:grid-cols-4">
        <input aria-label="Category ID" className="field-input" placeholder="category-id" value={newId} onChange={(event) => setNewId(event.target.value)} />
        <input aria-label="English label" className="field-input" placeholder="English label" value={newEn} onChange={(event) => setNewEn(event.target.value)} />
        <input aria-label="Bengali label" className="field-input font-bengali" placeholder="বাংলা নাম" value={newBn} onChange={(event) => setNewBn(event.target.value)} />
        <button type="submit" className="btn-primary"><Plus size={16} /> Add category</button>
      </form>
      {loading ? <p className="text-sm text-ink-muted">Loading categories…</p> : categories.map((category) => {
        const draft = drafts[category.id] ?? { en: category.labelEn, bn: category.labelBn };
        return <div key={category.id} className="grid gap-3 border border-line bg-surface p-5 md:grid-cols-[1fr_1fr_auto_auto]">
          <label className="text-xs text-ink-muted">{category.id}<input className="field-input mt-1" value={draft.en} onChange={(event) => setDrafts((old) => ({ ...old, [category.id]: { ...draft, en: event.target.value } }))} /></label>
          <label className="text-xs text-ink-muted">বাংলা<input className="field-input mt-1 font-bengali" value={draft.bn} onChange={(event) => setDrafts((old) => ({ ...old, [category.id]: { ...draft, bn: event.target.value } }))} /></label>
          <button type="button" onClick={() => void saveCategory(category.id, category.labelEn, category.labelBn)} className="btn-secondary self-end"><Save size={15} /> Save</button>
          <button type="button" onClick={() => void removeCategory(category.id)} className="btn-ghost self-end text-red-700" aria-label={`Delete ${category.id}`}><Trash2 size={16} /></button>
        </div>;
      })}
      {(message || error) && <p role="status" className="text-sm text-red-700">{message || error}</p>}
    </div>
  );
}

function AssessmentManager() {
  const { laws, loading, error } = useContent();
  const ordered = [...laws].sort((a, b) => a.number - b.number);
  const published = ordered.filter((law) => law.isPublished !== false);
  const ready = published.filter((law) => law.assessment?.isPublished && (law.assessment.questions?.length ?? 0) > 0);

  return (
    <div className="animate-fade-up space-y-7">
      <div className="border-b border-line pb-8">
        <p className="eyebrow text-bronze-600">Administration</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl">Assessments</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">Review each law assessment, edit its bilingual questions and explanations, and publish it when the question bank is complete.</p>
      </div>
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-sm text-ink-muted">Loading assessments…</p> : <>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Published laws" value={published.length} />
          <Metric label="Published assessments" value={ready.length} />
          <Metric label="Needs assessment" value={published.length - ready.length} />
        </div>
        <div className="divide-y divide-line border border-line bg-surface">
          {ordered.map((law) => {
            const questionCount = law.assessment?.questions?.length ?? 0;
            const isReady = law.isPublished !== false && law.assessment?.isPublished === true && questionCount > 0;
            return <div key={law.slug} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-ink">Law {String(law.number).padStart(2, '0')}: {law.titleEn}</p><p className="mt-1 text-xs text-ink-muted">{questionCount} question{questionCount === 1 ? '' : 's'} · {isReady ? 'Published' : law.isPublished === false ? 'Law unpublished' : 'Draft / not published'}</p></div>
              <Link className="btn-secondary w-fit" to={`/admin/laws?assessment=${encodeURIComponent(law.slug)}`}><ClipboardCheck size={15} /> Edit question bank</Link>
            </div>;
          })}
        </div>
      </>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-line bg-surface p-5"><p className="font-display text-3xl text-ink">{value}</p><p className="mt-1 text-xs text-ink-muted">{label}</p></div>;
}

type ManagedUser = { id: string; email: string | null; full_name: string; role: 'student' | 'admin'; created_at: string };

function UserManager() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');
    const { data, error: requestError } = await supabase.functions.invoke('powerlab-admin-users', { body: { action: 'list' } });
    if (requestError) {
      setError(requestError.message || 'Could not load user accounts.');
      setUsers([]);
    } else {
      setUsers((data?.users ?? []) as ManagedUser[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadUsers(); }, []);

  async function changeRole(user: ManagedUser, role: ManagedUser['role']) {
    if (user.role === role) return;
    const action = role === 'admin' ? 'promote to administrator' : 'change to student';
    if (!window.confirm(`Are you sure you want to ${action} ${user.email || user.full_name || 'this account'}?`)) return;
    setSavingId(user.id);
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.functions.invoke('powerlab-admin-users', { body: { action: 'update-role', userId: user.id, role } });
    if (requestError) {
      setError(requestError.message || 'Could not update the account role.');
    } else {
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role } : item));
      setMessage('Account role updated.');
    }
    setSavingId('');
  }

  const filtered = users.filter((user) => `${user.full_name} ${user.email ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <div className="animate-fade-up space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
      <div><p className="eyebrow text-bronze-600">Administration</p><h1 className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl">Users</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">Review POWERLAB accounts and manage administrator access.</p></div>
      <div className="flex h-10 items-center gap-2 border border-line bg-surface px-3 text-xs text-ink-muted"><ShieldCheck size={16} className="text-forest-700" />Protected administrator access</div>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block w-full sm:max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" /><input className="field-input pl-9" aria-label="Search users" placeholder="Search name or email" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <p className="text-sm text-ink-muted">{users.length} accounts</p>
    </div>
    {(error || message) && <p role={error ? 'alert' : 'status'} className={`border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-forest-200 bg-forest-50 text-forest-800'}`}>{error || message}</p>}
    <div className="divide-y divide-line border border-line bg-surface">
      {loading ? <p className="p-6 text-sm text-ink-muted">Loading accounts…</p> : filtered.length === 0 ? <p className="p-6 text-sm text-ink-muted">{users.length ? 'No accounts match your search.' : 'No user accounts were found.'}</p> : filtered.map((user) => <article key={user.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-canvas-2 text-forest-700"><UserRound size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{user.full_name || 'Name not provided'}</p><p className="mt-1 break-all text-xs text-ink-muted">{user.email || 'Email unavailable'}</p><p className="mt-1 text-[11px] text-ink-muted">Joined {new Date(user.created_at).toLocaleDateString()}</p></div></div>
        <label className="flex items-center gap-3 text-xs text-ink-muted">Role<select className="field-input w-auto" aria-label={`Role for ${user.email || user.full_name}`} value={user.role} disabled={savingId === user.id} onChange={(event) => void changeRole(user, event.target.value as ManagedUser['role'])}><option value="student">Student</option><option value="admin">Administrator</option></select>{savingId === user.id && <span>Saving…</span>}</label>
      </article>)}
    </div>
  </div>;
}
