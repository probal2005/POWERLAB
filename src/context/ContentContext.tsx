import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Category, Law, LawSection } from '@/types/law';
import { supabase } from '@/lib/supabase';

type ContentContextValue = {
  laws: Law[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  getSections: (slug: string) => LawSection[] | undefined;
  addLaw: (law: Law) => Promise<void>;
  updateLaw: (slug: string, updates: Partial<Law>) => Promise<void>;
  swapLawNumbers: (firstSlug: string, secondSlug: string) => Promise<void>;
  deleteLaw: (slug: string) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  refresh: () => Promise<boolean>;
};

const ContentContext = createContext<ContentContextValue | undefined>(undefined);
type ContentPayload = { laws: Law[]; categories: Category[] };
const CONTENT_CACHE_KEY = 'powerlab:shared-content:v4';

function readCachedContent(): ContentPayload | null {
  try {
    const raw = localStorage.getItem(CONTENT_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { content?: ContentPayload };
    if (!Array.isArray(cached.content?.laws) || !Array.isArray(cached.content?.categories)) return null;
    return cached.content;
  } catch {
    return null;
  }
}

function fromDatabase(row: Record<string, unknown>): Law {
  return {
    number: Number(row.number), slug: String(row.slug),
    titleEn: String(row.title_en), titleBn: String(row.title_bn),
    shortEn: String(row.short_en ?? ''), shortBn: String(row.short_bn ?? ''),
    category: String(row.category_id), sections: (row.sections ?? []) as LawSection[],
    assessment: row.assessment as Law['assessment'],
    assessmentRevision: typeof row.assessment_revision === 'string' ? row.assessment_revision : undefined, isPublished: Boolean(row.is_published),
  };
}

function toDatabase(law: Law) {
  return {
    slug: law.slug, number: law.number, title_en: law.titleEn, title_bn: law.titleBn,
    short_en: law.shortEn, short_bn: law.shortBn, category_id: law.category,
    sections: law.sections ?? [], assessment: law.assessment ?? null,
    is_published: law.isPublished !== false, sort_order: law.number,
  };
}

export function ContentProvider({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const refreshPublic = useContext(ContentContext)?.refresh;
  const [content, setContent] = useState<ContentPayload>(() => {
    const cached = admin ? null : readCachedContent();
    return cached ?? { laws: [], categories: [] };
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    const hasCachedContent = !admin && readCachedContent() !== null;
    if (!hasCachedContent) setLoading(true);
    const { data, error: loadError } = await supabase.rpc(admin ? 'get_powerlab_admin_content' : 'get_powerlab_public_content');
    if (id !== requestId.current) return true;
    if (loadError) {
      setError(`Could not load shared POWERLAB content: ${loadError.message}`);
      setLoading(false);
      return false;
    }
    const payload = data as { laws?: Record<string, unknown>[]; categories?: Record<string, unknown>[] };
    const nextContent = {
      laws: (payload.laws ?? []).map(fromDatabase),
      categories: (payload.categories ?? []).map((category) => ({
        id: String(category.id), labelEn: String(category.label_en), labelBn: String(category.label_bn),
      })),
    };
    setContent(nextContent);
    try { if (!admin) localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), content: nextContent })); } catch { /* storage can be disabled or full */ }
    setError(null);
    setLoading(false);
    return true;
  }, [admin]);

  // Published content is shared across roles, so auth changes must not refetch it.
  useEffect(() => {
    try { localStorage.removeItem('powerlab:shared-content:v2'); } catch { /* storage can be disabled */ }
  }, []);

  useEffect(() => {
    const requests = requestId;
    void refresh();
    return () => { ++requests.current; };
  }, [refresh]);

  const commit = useCallback(async (operation: () => PromiseLike<{ error: { message: string } | null }>) => {
    const result = await operation();
    if (result.error) {
      setError(`Could not save shared content: ${result.error.message}`);
      throw new Error(result.error.message);
    }
    if (admin) void refreshPublic?.();
    if (!await refresh()) {
      throw new Error('The change was saved, but the latest shared content could not be reloaded. Refresh the page to confirm it.');
    }
  }, [admin, refresh, refreshPublic]);

  const addLaw = useCallback((law: Law) => commit(() => supabase.from('content_laws').insert(toDatabase(law))), [commit]);
  const updateLaw = useCallback((slug: string, updates: Partial<Law>) => {
    const current = content.laws.find((law) => law.slug === slug);
    if (!current) return Promise.reject(new Error('Law not found'));
    return commit(() => supabase.from('content_laws').update(toDatabase({ ...current, ...updates })).eq('slug', slug));
  }, [commit, content.laws]);
  const swapLawNumbers = useCallback((firstSlug: string, secondSlug: string) => commit(() =>
    supabase.rpc('swap_powerlab_law_numbers', { p_first: firstSlug, p_second: secondSlug })
  ), [commit]);
  const deleteLaw = useCallback((slug: string) => commit(() => supabase.from('content_laws').delete().eq('slug', slug)), [commit]);
  const addCategory = useCallback((category: Category) => commit(() => supabase.from('content_categories').insert({ id: category.id, label_en: category.labelEn, label_bn: category.labelBn })), [commit]);
  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    const current = content.categories.find((category) => category.id === id);
    if (!current) return Promise.reject(new Error('Category not found'));
    const category = { ...current, ...updates };
    return commit(() => supabase.from('content_categories').update({ label_en: category.labelEn, label_bn: category.labelBn }).eq('id', id));
  }, [commit, content.categories]);
  const deleteCategory = useCallback((id: string) => commit(() => supabase.from('content_categories').delete().eq('id', id)), [commit]);
  const getSections = useCallback((slug: string) => content.laws.find((law) => law.slug === slug)?.sections, [content.laws]);
  const value = useMemo(() => ({ ...content, loading, error, getSections, addLaw, updateLaw, swapLawNumbers, deleteLaw, addCategory, updateCategory, deleteCategory, refresh }), [content, loading, error, getSections, addLaw, updateLaw, swapLawNumbers, deleteLaw, addCategory, updateCategory, deleteCategory, refresh]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used inside ContentProvider');
  return context;
}
