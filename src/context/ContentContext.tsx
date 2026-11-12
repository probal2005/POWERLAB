import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Category, Law, LawSection } from '@/types/law';
import { laws as initialLaws } from '@/data/laws';
import { lawSections as initialSections } from '@/data/lawSections';
import { categories as initialCategories } from '@/data/categories';

const STORAGE_KEY = 'powerlab:content:v1';

type StoredContent = {
  laws: Law[];
  categories: Category[];
};

type ContentContextValue = {
  laws: Law[];
  categories: Category[];
  getSections: (slug: string) => LawSection[] | undefined;
  addLaw: (law: Law) => void;
  updateLaw: (slug: string, updates: Partial<Law>) => void;
  deleteLaw: (slug: string) => void;
  reorderLaws: (orderedSlugs: string[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  resetContent: () => void;
};

const ContentContext = createContext<ContentContextValue | undefined>(undefined);

function createInitialLaws(): Law[] {
  return initialLaws.map((law) => ({
    ...law,
    isPublished: true,
    sections: initialSections[law.slug] ?? [],
  }));
}

function readStoredContent(): StoredContent {
  const defaults: StoredContent = {
    laws: createInitialLaws(),
    categories: initialCategories,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const parsed: unknown = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as StoredContent).laws) ||
      !Array.isArray((parsed as StoredContent).categories)
    ) {
      return defaults;
    }

    const stored = parsed as StoredContent;

    return {
      laws: stored.laws,
      categories: stored.categories,
    };
  } catch {
    return defaults;
  }
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<StoredContent>(readStoredContent);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    } catch (error) {
      console.error('POWERLAB content could not be saved:', error);
    }
  }, [content]);

  const getSections = useCallback(
    (slug: string) => content.laws.find((law) => law.slug === slug)?.sections,
    [content.laws]
  );

  const addLaw = useCallback((law: Law) => {
    setContent((current) => {
      if (current.laws.some((item) => item.slug === law.slug)) {
        return current;
      }

      return {
        ...current,
        laws: [...current.laws, { ...law, isPublished: law.isPublished ?? false }],
      };
    });
  }, []);

  const updateLaw = useCallback((slug: string, updates: Partial<Law>) => {
    setContent((current) => ({
      ...current,
      laws: current.laws.map((law) =>
        law.slug === slug
          ? { ...law, ...updates, number: updates.number ?? law.number }
          : law
      ),
    }));
  }, []);

  const deleteLaw = useCallback((slug: string) => {
    setContent((current) => ({
      ...current,
      laws: current.laws.filter((law) => law.slug !== slug),
    }));
  }, []);

  const reorderLaws = useCallback((orderedSlugs: string[]) => {
    setContent((current) => {
      const bySlug = new Map(current.laws.map((law) => [law.slug, law]));
      const reordered = orderedSlugs
        .map((slug) => bySlug.get(slug))
        .filter((law): law is Law => Boolean(law));

      const included = new Set(orderedSlugs);
      const remaining = current.laws.filter((law) => !included.has(law.slug));

      return { ...current, laws: [...reordered, ...remaining] };
    });
  }, []);

  const addCategory = useCallback((category: Category) => {
    setContent((current) => {
      if (current.categories.some((item) => item.id === category.id)) {
        return current;
      }

      return {
        ...current,
        categories: [...current.categories, category],
      };
    });
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setContent((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === id ? { ...category, ...updates } : category
      ),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setContent((current) => {
      if (current.laws.some((law) => law.category === id)) {
        return current;
      }

      return {
        ...current,
        categories: current.categories.filter((category) => category.id !== id),
      };
    });
  }, []);

  const resetContent = useCallback(() => {
    setContent({
      laws: createInitialLaws(),
      categories: initialCategories,
    });
  }, []);

  const value = useMemo<ContentContextValue>(
    () => ({
      laws: content.laws,
      categories: content.categories,
      getSections,
      addLaw,
      updateLaw,
      deleteLaw,
      reorderLaws,
      addCategory,
      updateCategory,
      deleteCategory,
      resetContent,
    }),
    [
      content,
      getSections,
      addLaw,
      updateLaw,
      deleteLaw,
      reorderLaws,
      addCategory,
      updateCategory,
      deleteCategory,
      resetContent,
    ]
  );

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContent() {
  const context = useContext(ContentContext);

  if (!context) {
    throw new Error('useContent must be used inside ContentProvider');
  }

  return context;
}
