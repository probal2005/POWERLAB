import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  deleteLaw: (slug: string) => Promise<void>;
  reorderLaws: (orderedSlugs: string[]) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  resetContent: () => Promise<void>;
};

const ContentContext = createContext<ContentContextValue | undefined>(undefined);
type ContentPayload = { laws: Law[]; categories: Category[] };

function fromDatabase(row: Record<string, unknown>): Law {
  return {
    number: Number(row.number), slug: String(row.slug),
    titleEn: String(row.title_en), titleBn: String(row.title_bn),
    shortEn: String(row.short_en ?? ''), shortBn: String(row.short_bn ?? ''),
    category: String(row.category_id), sections: (row.sections ?? []) as LawSection[],
    assessment: row.assessment as Law['assessment'], isPublished: Boolean(row.is_published),
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

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentPayload>({ laws: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.rpc('get_powerlab_content');
    if (loadError) {
      setError(`Could not load shared POWERLAB content: ${loadError.message}`);
      setLoading(false);
      return;
    }
    const payload = data as { laws?: Record<string, unknown>[]; categories?: Record<string, unknown>[] };
    setContent({
      laws: (payload.laws ?? []).map(fromDatabase),
      categories: (payload.categories ?? []).map((category) => ({
        id: String(category.id), labelEn: String(category.label_en), labelBn: String(category.label_bn),
      })),
    });
    setError(null);
    setLoading(false);
  }, []);

  // Published content is shared across roles, so auth changes must not refetch it.
  useEffect(() => { void refresh(); }, [refresh]);

  const commit = useCallback(async (operation: () => PromiseLike<{ error: { message: string } | null }>) => {
    const result = await operation();
    if (result.error) {
      setError(`Could not save shared content: ${result.error.message}`);
      throw new Error(result.error.message);
    }
    await refresh();
  }, [refresh]);

  const addLaw = useCallback((law: Law) => commit(() => supabase.from('content_laws').insert(toDatabase(law))), [commit]);
  const updateLaw = useCallback((slug: string, updates: Partial<Law>) => {
    const current = content.laws.find((law) => law.slug === slug);
    if (!current) return Promise.reject(new Error('Law not found'));
    return commit(() => supabase.from('content_laws').update(toDatabase({ ...current, ...updates })).eq('slug', slug));
  }, [commit, content.laws]);
  const deleteLaw = useCallback((slug: string) => commit(() => supabase.from('content_laws').delete().eq('slug', slug)), [commit]);
  const reorderLaws = useCallback(async (slugs: string[]) => {
    const current = new Map(content.laws.map((law) => [law.slug, law]));
    for (let i = 0; i < slugs.length; i += 1) {
      const law = current.get(slugs[i]);
      if (law) await commit(() => supabase.from('content_laws').update({ sort_order: i + 1 }).eq('slug', law.slug));
    }
  }, [commit, content.laws]);
  const addCategory = useCallback((category: Category) => commit(() => supabase.from('content_categories').insert({ id: category.id, label_en: category.labelEn, label_bn: category.labelBn })), [commit]);
  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    const current = content.categories.find((category) => category.id === id);
    if (!current) return Promise.reject(new Error('Category not found'));
    const category = { ...current, ...updates };
    return commit(() => supabase.from('content_categories').update({ label_en: category.labelEn, label_bn: category.labelBn }).eq('id', id));
  }, [commit, content.categories]);
  const deleteCategory = useCallback((id: string) => commit(() => supabase.from('content_categories').delete().eq('id', id)), [commit]);
  const resetContent = useCallback(async () => {
    throw new Error('Resetting shared content is disabled to protect existing edits.');
  }, []);

  const getSections = useCallback((slug: string) => content.laws.find((law) => law.slug === slug)?.sections, [content.laws]);
  const value = useMemo(() => ({ ...content, loading, error, getSections, addLaw, updateLaw, deleteLaw, reorderLaws, addCategory, updateCategory, deleteCategory, resetContent }), [content, loading, error, getSections, addLaw, updateLaw, deleteLaw, reorderLaws, addCategory, updateCategory, deleteCategory, resetContent]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used inside ContentProvider');
  return context;
}
