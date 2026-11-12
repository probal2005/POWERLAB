import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Construction, Plus, Save, Trash2 } from 'lucide-react';
import { useContent } from '@/context/ContentContext';

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
