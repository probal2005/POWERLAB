import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FilePlus2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import type {
  AssessmentQuestion,
  Law,
  LawAssessment,
  LawSection,
} from '@/types/law';

type EditorState = {
  originalSlug?: string;
  number: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  shortEn: string;
  shortBn: string;
  category: string;
  isPublished: boolean;
  sections: LawSection[];
  assessment: LawAssessment;
};

const emptySection = (): LawSection => ({
  headingEn: '',
  headingBn: '',
  bodyEn: [],
  bodyBn: [],
});

const emptyQuestion = (): AssessmentQuestion => ({
  id: crypto.randomUUID(),
  questionEn: '',
  questionBn: '',
  optionsEn: ['', '', '', ''],
  optionsBn: ['', '', '', ''],
  correctOption: 0,
  explanationEn: '',
  explanationBn: '',
});

const emptyAssessment = (): LawAssessment => ({
  passPercentage: 60,
  isPublished: false,
  questions: [],
});

const cloneAssessment = (assessment?: LawAssessment): LawAssessment => ({
  passPercentage: assessment?.passPercentage ?? 60,
  isPublished: assessment?.isPublished ?? false,
  questions: (assessment?.questions ?? []).map((question) => ({
    ...question,
    optionsEn: [...question.optionsEn] as AssessmentQuestion['optionsEn'],
    optionsBn: [...question.optionsBn] as AssessmentQuestion['optionsBn'],
  })),
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const toEditorState = (law: Law): EditorState => ({
  originalSlug: law.slug,
  number: String(law.number),
  slug: law.slug,
  titleEn: law.titleEn,
  titleBn: law.titleBn,
  shortEn: law.shortEn,
  shortBn: law.shortBn,
  category: law.category,
  isPublished: law.isPublished !== false,
  sections: (law.sections ?? []).map((section) => ({
    ...section,
    bodyEn: [...section.bodyEn],
    bodyBn: [...section.bodyBn],
  })),
  assessment: cloneAssessment(law.assessment),
});

const fieldClass =
  'mt-1.5 w-full rounded-sm border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-forest-500 focus:ring-1 focus:ring-forest-500';

const labelClass = 'block text-xs font-semibold text-ink-muted';

export default function AdminLawsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    laws,
    categories,
    addLaw,
    updateLaw,
    swapLawNumbers,
    deleteLaw,
  } = useContent();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState('');
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assessmentPreview, setAssessmentPreview] = useState(false);

  const orderedLaws = useMemo(
    () => [...laws].sort((a, b) => a.number - b.number),
    [laws]
  );

  const filteredLaws = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orderedLaws.filter((law) => {
      const matchesQuery =
        !q ||
        law.titleEn.toLowerCase().includes(q) ||
        law.titleBn.includes(q) ||
        law.slug.toLowerCase().includes(q) ||
        String(law.number) === q;

      const matchesFilter =
        filter === 'all' ||
        (filter === 'published' && law.isPublished !== false) ||
        (filter === 'draft' && law.isPublished === false);

      return matchesQuery && matchesFilter;
    });
  }, [orderedLaws, query, filter]);

  const publishedCount = laws.filter(
    (law) => law.isPublished !== false
  ).length;

  const openNewEditor = () => {
    const nextNumber =
      laws.length > 0
        ? Math.max(...laws.map((law) => law.number)) + 1
        : 1;

    setError('');
    setEditor({
      number: String(nextNumber),
      slug: '',
      titleEn: '',
      titleBn: '',
      shortEn: '',
      shortBn: '',
      category: categories[0]?.id ?? '',
      isPublished: false,
      sections: [],
      assessment: emptyAssessment(),
    });
  };

  const openEditEditor = (law: Law) => {
    setError('');
    setEditor(toEditorState(law));
  };

  useEffect(() => {
    const assessmentSlug = searchParams.get('assessment');
    if (!assessmentSlug || !laws.length) return;
    const law = laws.find((item) => item.slug === assessmentSlug);
    if (law) {
      setError('');
      setEditor(toEditorState(law));
    }
    setSearchParams({}, { replace: true });
  }, [laws, searchParams, setSearchParams]);

  const updateEditor = <K extends keyof EditorState>(
    key: K,
    value: EditorState[K]
  ) => {
    setEditor((current) =>
      current ? { ...current, [key]: value } : current
    );
  };

  const updateSection = (
    index: number,
    key: keyof LawSection,
    value: string | string[]
  ) => {
    setEditor((current) => {
      if (!current) return current;

      const sections = [...current.sections];
      sections[index] = {
        ...sections[index],
        [key]: value,
      };

      return { ...current, sections };
    });
  };

  const updateAssessment = <K extends keyof LawAssessment>(
    key: K,
    value: LawAssessment[K]
  ) => {
    setEditor((current) =>
      current
        ? {
            ...current,
            assessment: { ...current.assessment, [key]: value },
          }
        : current
    );
  };

  const updateQuestion = <K extends keyof AssessmentQuestion>(
    index: number,
    key: K,
    value: AssessmentQuestion[K]
  ) => {
    setEditor((current) => {
      if (!current) return current;

      const questions = [...current.assessment.questions];
      questions[index] = { ...questions[index], [key]: value };

      return {
        ...current,
        assessment: { ...current.assessment, questions },
      };
    });
  };

  const updateQuestionOption = (
    index: number,
    language: 'en' | 'bn',
    optionIndex: number,
    value: string
  ) => {
    setEditor((current) => {
      if (!current) return current;

      const questions = [...current.assessment.questions];
      const question = questions[index];

      if (language === 'en') {
        const optionsEn = [...question.optionsEn] as AssessmentQuestion['optionsEn'];
        optionsEn[optionIndex] = value;
        questions[index] = { ...question, optionsEn };
      } else {
        const optionsBn = [...question.optionsBn] as AssessmentQuestion['optionsBn'];
        optionsBn[optionIndex] = value;
        questions[index] = { ...question, optionsBn };
      }

      return {
        ...current,
        assessment: { ...current.assessment, questions },
      };
    });
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    setEditor((current) => {
      if (!current) return current;

      const target = index + direction;
      const questions = [...current.assessment.questions];

      if (target < 0 || target >= questions.length) return current;

      [questions[index], questions[target]] = [
        questions[target],
        questions[index],
      ];

      return {
        ...current,
        assessment: { ...current.assessment, questions },
      };
    });
  };

  const removeQuestion = (index: number) => {
    const confirmed = window.confirm(
      `Remove assessment question ${index + 1}?`
    );

    if (!confirmed) return;

    setEditor((current) =>
      current
        ? {
            ...current,
            assessment: {
              ...current.assessment,
              questions: current.assessment.questions.filter(
                (_, questionIndex) => questionIndex !== index
              ),
              isPublished: false,
            },
          }
        : current
    );
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setEditor((current) => {
      if (!current) return current;

      const target = index + direction;
      if (target < 0 || target >= current.sections.length) return current;

      const sections = [...current.sections];
      [sections[index], sections[target]] = [
        sections[target],
        sections[index],
      ];

      return { ...current, sections };
    });
  };

  const removeSection = (index: number) => {
    setEditor((current) =>
      current
        ? {
            ...current,
            sections: current.sections.filter((_, i) => i !== index),
          }
        : current
    );
  };

  const saveLaw = async () => {
    if (!editor) return;

    const number = Number(editor.number);
    const slug = slugify(editor.slug);

    if (!Number.isInteger(number) || number < 1) {
      setError('Enter a valid positive law number.');
      return;
    }

    if (!editor.titleEn.trim() || !editor.titleBn.trim()) {
      setError('Both English and Bengali titles are required.');
      return;
    }

    if (!slug) {
      setError('A valid URL slug is required.');
      return;
    }

    if (!editor.category || !categories.some((c) => c.id === editor.category)) {
      setError('Select a valid category.');
      return;
    }

    const duplicateSlug = laws.some(
      (law) =>
        law.slug === slug && law.slug !== editor.originalSlug
    );

    if (duplicateSlug) {
      setError('Another law already uses this URL slug.');
      return;
    }

    const duplicateNumber = laws.some(
      (law) =>
        law.number === number && law.slug !== editor.originalSlug
    );

    if (duplicateNumber) {
      setError('Another law already uses this number.');
      return;
    }

    const cleanSections = editor.sections.map((section) => ({
      headingEn: section.headingEn.trim(),
      headingBn: section.headingBn.trim(),
      bodyEn: section.bodyEn.map((p) => p.trim()).filter(Boolean),
      bodyBn: section.bodyBn.map((p) => p.trim()).filter(Boolean),
    }));

    const incompleteSection = cleanSections.some(
      (section) =>
        !section.headingEn ||
        !section.headingBn ||
        section.bodyEn.length === 0 ||
        section.bodyBn.length === 0
    );

    if (incompleteSection) {
      setError(
        'Every lesson section needs both headings and at least one paragraph in each language.'
      );
      return;
    }

    const passPercentage = Number(editor.assessment.passPercentage);

    if (
      !Number.isInteger(passPercentage) ||
      passPercentage < 1 ||
      passPercentage > 100
    ) {
      setError('Assessment pass percentage must be a whole number from 1 to 100.');
      return;
    }

    const cleanQuestions = editor.assessment.questions.map((question) => ({
      ...question,
      questionEn: question.questionEn.trim(),
      questionBn: question.questionBn.trim(),
      optionsEn: question.optionsEn.map((option) => option.trim()) as AssessmentQuestion['optionsEn'],
      optionsBn: question.optionsBn.map((option) => option.trim()) as AssessmentQuestion['optionsBn'],
      explanationEn: question.explanationEn.trim(),
      explanationBn: question.explanationBn.trim(),
    }));

    const incompleteQuestion = cleanQuestions.some((question) =>
      !question.questionEn ||
      !question.questionBn ||
      question.optionsEn.some((option) => !option) ||
      question.optionsBn.some((option) => !option) ||
      !Number.isInteger(question.correctOption) ||
      question.correctOption < 0 ||
      question.correctOption > 3 ||
      !question.explanationEn ||
      !question.explanationBn
    );

    if (incompleteQuestion) {
      setError(
        'Every assessment question needs bilingual question text, four bilingual options, a correct answer, and bilingual explanations.'
      );
      return;
    }

    const cleanAssessment: LawAssessment = {
      passPercentage,
      isPublished:
        editor.assessment.isPublished && cleanQuestions.length > 0,
      questions: cleanQuestions,
    };

    const law: Law = {
      number,
      slug,
      titleEn: editor.titleEn.trim(),
      titleBn: editor.titleBn.trim(),
      shortEn: editor.shortEn.trim(),
      shortBn: editor.shortBn.trim(),
      category: editor.category,
      isPublished: editor.isPublished,
      sections: cleanSections,
      assessment: cleanAssessment,
    };

    setSaving(true);

    try {
      if (editor.originalSlug) {
        await updateLaw(editor.originalSlug, law);
      } else {
        await addLaw(law);
      }

      setEditor(null);
      setError('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save law content.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (law: Law) => {
    try { await updateLaw(law.slug, {
      isPublished: law.isPublished === false,
    }); } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Unable to update publication status.');
    }
  };

  const removeLaw = async (law: Law) => {
    const confirmed = window.confirm(
      `Delete Law ${law.number}: ${law.titleEn}?\n\nThis removes the shared lesson content.`
    );

    if (confirmed) {
      try { await deleteLaw(law.slug); } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete law.');
      }
    }
  };

  const moveLaw = async (law: Law, direction: -1 | 1) => {
    const index = orderedLaws.findIndex((item) => item.slug === law.slug);
    const target = index + direction;

    if (target < 0 || target >= orderedLaws.length) return;

    const other = orderedLaws[target];

    try {
      await swapLawNumbers(law.slug, other.slug);
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : 'Unable to reorder laws.');
    }
  };

  return (
    <div className="animate-fade-up space-y-7">
      <section className="flex flex-col justify-between gap-5 border-b border-line pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-bronze-600">Content library</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl">
            Laws & Lessons
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
            Manage law information, bilingual lesson content, publication
            status, and display order.
          </p>
        </div>

        <button type="button" onClick={openNewEditor} className="btn-primary w-fit">
          <Plus size={16} />
          Add new law
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="border border-line bg-surface p-4">
          <p className="text-xs text-ink-muted">Total laws</p>
          <p className="mt-2 font-display text-3xl text-ink">{laws.length}</p>
        </div>
        <div className="border border-line bg-surface p-4">
          <p className="text-xs text-ink-muted">Published</p>
          <p className="mt-2 font-display text-3xl text-forest-700">
            {publishedCount}
          </p>
        </div>
        <div className="col-span-2 border border-line bg-surface p-4 sm:col-span-1">
          <p className="text-xs text-ink-muted">Drafts</p>
          <p className="mt-2 font-display text-3xl text-bronze-700">
            {laws.length - publishedCount}
          </p>
        </div>
      </section>

      <section className="border border-line bg-surface">
        <div className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search laws by title, slug, or number..."
              className={`${fieldClass} !mt-0 pl-9`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'published', 'draft'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full border px-3.5 py-2 text-xs font-medium capitalize transition-colors ${
                  filter === item
                    ? 'border-forest-600 bg-forest-600 text-white'
                    : 'border-line text-ink-muted hover:border-forest-300 hover:text-ink'
                }`}
              >
                {item === 'all' ? 'All laws' : item}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-line">
          {filteredLaws.map((law) => {
            const isExpanded = expandedSlug === law.slug;
            const sectionCount = law.sections?.length ?? 0;

            return (
              <article key={law.slug} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-canvas-2 font-display text-lg text-forest-700">
                      {law.number}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg text-ink">
                          {law.titleEn}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                            law.isPublished === false
                              ? 'bg-bronze-50 text-bronze-700'
                              : 'bg-forest-50 text-forest-700'
                          }`}
                        >
                          {law.isPublished === false ? 'Draft' : 'Published'}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-ink-muted">
                        {law.titleBn}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                        <span>{law.slug}</span>
                        <span>
                          {categories.find((c) => c.id === law.category)?.labelEn ??
                            'Uncategorized'}
                        </span>
                        <span>
                          {sectionCount} lesson section
                          {sectionCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 xl:justify-end">
                    <button
                      type="button"
                      onClick={() => moveLaw(law, -1)}
                      disabled={law.number === orderedLaws[0]?.number}
                      className="rounded-sm p-2 text-ink-muted hover:bg-canvas-2 disabled:cursor-not-allowed disabled:opacity-25"
                      title="Move up"
                      aria-label={`Move law ${law.number} up`}
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLaw(law, 1)}
                      disabled={law.number === orderedLaws[orderedLaws.length - 1]?.number}
                      className="rounded-sm p-2 text-ink-muted hover:bg-canvas-2 disabled:cursor-not-allowed disabled:opacity-25"
                      title="Move down"
                      aria-label={`Move law ${law.number} down`}
                    >
                      <ArrowDown size={17} />
                    </button>
                    <span className="mx-1 h-6 w-px bg-line" />
                    <button
                      type="button"
                      onClick={() => togglePublished(law)}
                      className="rounded-sm p-2 text-ink-muted hover:bg-canvas-2 hover:text-forest-700"
                      title={law.isPublished === false ? 'Publish' : 'Unpublish'}
                    >
                      {law.isPublished === false ? (
                        <Eye size={17} />
                      ) : (
                        <EyeOff size={17} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditEditor(law)}
                      className="rounded-sm p-2 text-ink-muted hover:bg-canvas-2 hover:text-forest-700"
                      title="Edit law"
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLaw(law)}
                      className="rounded-sm p-2 text-ink-muted hover:bg-red-50 hover:text-red-700"
                      title="Delete law"
                    >
                      <Trash2 size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSlug(isExpanded ? null : law.slug)
                      }
                      className="rounded-sm p-2 text-ink-muted hover:bg-canvas-2"
                      title="Toggle details"
                    >
                      {isExpanded ? (
                        <ChevronUp size={17} />
                      ) : (
                        <ChevronDown size={17} />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-5 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
                    <div>
                      <p className="eyebrow">English description</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                        {law.shortEn || 'No description added.'}
                      </p>
                    </div>
                    <div>
                      <p className="eyebrow">Bengali description</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                        {law.shortBn || 'কোনো বিবরণ যোগ করা হয়নি।'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => openEditEditor(law)}
                        className="text-sm font-semibold text-forest-700 hover:underline"
                      >
                        Edit complete lesson content
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {filteredLaws.length === 0 && (
            <div className="px-6 py-16 text-center">
              <BookOpen className="mx-auto text-ink-muted" size={30} />
              <p className="mt-4 font-display text-xl text-ink">
                No laws found
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Try a different search or publication filter.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-line bg-canvas-2/50 px-5 py-3 text-xs text-ink-muted">
          Showing {filteredLaws.length} of {laws.length} laws
        </div>
      </section>

      {editor && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink/50 p-3 sm:p-6">
          <div className="mx-auto my-4 w-full max-w-5xl bg-canvas shadow-2xl sm:my-8">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4 sm:px-7">
              <div>
                <p className="eyebrow text-bronze-600">
                  {editor.originalSlug ? 'Edit content' : 'Create content'}
                </p>
                <h2 className="mt-1 font-display text-xl text-ink sm:text-2xl">
                  {editor.originalSlug ? 'Edit law & lesson' : 'Add a new law'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-sm p-2 text-ink-muted hover:bg-canvas-2"
                aria-label="Close editor"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8 p-5 sm:p-7">
              <section>
                <div className="mb-5">
                  <p className="eyebrow">01 · Basic information</p>
                  <h3 className="mt-1 font-display text-lg text-ink">
                    Law details
                  </h3>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className={labelClass}>
                    Law number
                    <input
                      type="number"
                      min="1"
                      value={editor.number}
                      onChange={(event) =>
                        updateEditor('number', event.target.value)
                      }
                      className={fieldClass}
                    />
                  </label>

                  <label className={labelClass}>
                    URL slug
                    <input
                      value={editor.slug}
                      onChange={(event) =>
                        updateEditor('slug', event.target.value)
                      }
                      onBlur={() =>
                        updateEditor('slug', slugify(editor.slug))
                      }
                      placeholder="example-law-title"
                      className={fieldClass}
                    />
                  </label>

                  <label className={labelClass}>
                    English title
                    <input
                      value={editor.titleEn}
                      onChange={(event) => {
                        updateEditor('titleEn', event.target.value);
                        if (!editor.originalSlug) {
                          updateEditor('slug', slugify(event.target.value));
                        }
                      }}
                      className={fieldClass}
                      required
                    />
                  </label>

                  <label className={labelClass}>
                    Bengali title
                    <input
                      value={editor.titleBn}
                      onChange={(event) =>
                        updateEditor('titleBn', event.target.value)
                      }
                      className={fieldClass}
                      required
                    />
                  </label>

                  <label className={labelClass}>
                    Category
                    <select
                      value={editor.category}
                      onChange={(event) =>
                        updateEditor('category', event.target.value)
                      }
                      className={fieldClass}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.labelEn} / {category.labelBn}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-3 self-end border border-line bg-surface px-4 py-3">
                    <input
                      type="checkbox"
                      checked={editor.isPublished}
                      onChange={(event) =>
                        updateEditor('isPublished', event.target.checked)
                      }
                      className="h-4 w-4 accent-[#243D35]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        Publish immediately
                      </span>
                      <span className="block text-xs text-ink-muted">
                        Make this law visible on public pages
                      </span>
                    </span>
                  </label>

                  <label className={`${labelClass} sm:col-span-2`}>
                    Short description — English
                    <textarea
                      rows={3}
                      value={editor.shortEn}
                      onChange={(event) =>
                        updateEditor('shortEn', event.target.value)
                      }
                      className={fieldClass}
                    />
                  </label>

                  <label className={`${labelClass} sm:col-span-2`}>
                    Short description — Bengali
                    <textarea
                      rows={3}
                      value={editor.shortBn}
                      onChange={(event) =>
                        updateEditor('shortBn', event.target.value)
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
              </section>

              <section className="border-t border-line pt-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">02 · Learning material</p>
                    <h3 className="mt-1 font-display text-lg text-ink">
                      Lesson sections
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Add bilingual headings and paragraphs for the reading page.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateEditor('sections', [
                        ...editor.sections,
                        emptySection(),
                      ])
                    }
                    className="btn-secondary !px-4 !py-2"
                  >
                    <FilePlus2 size={16} />
                    Add section
                  </button>
                </div>

                {editor.sections.length === 0 && (
                  <div className="mt-5 border border-dashed border-line bg-surface px-5 py-10 text-center">
                    <BookOpen className="mx-auto text-ink-muted" size={26} />
                    <p className="mt-3 text-sm font-medium text-ink">
                      No lesson sections yet
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Add an introduction, core principle, examples, and other
                      learning sections.
                    </p>
                  </div>
                )}

                <div className="mt-5 space-y-5">
                  {editor.sections.map((section, index) => (
                    <div
                      key={index}
                      className="border border-line bg-surface p-4 sm:p-5"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center bg-forest-50 font-semibold text-forest-700">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              Lesson section {index + 1}
                            </p>
                            <p className="text-[11px] text-ink-muted">
                              Bilingual content
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSection(index, -1)}
                            disabled={index === 0}
                            className="rounded p-2 text-ink-muted hover:bg-canvas-2 disabled:opacity-25"
                            aria-label="Move section up"
                          >
                            <ChevronUp size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSection(index, 1)}
                            disabled={index === editor.sections.length - 1}
                            className="rounded p-2 text-ink-muted hover:bg-canvas-2 disabled:opacity-25"
                            aria-label="Move section down"
                          >
                            <ChevronDown size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSection(index)}
                            className="rounded p-2 text-ink-muted hover:bg-red-50 hover:text-red-700"
                            aria-label="Remove section"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                          Section heading — English
                          <input
                            value={section.headingEn}
                            onChange={(event) =>
                              updateSection(index, 'headingEn', event.target.value)
                            }
                            className={fieldClass}
                            placeholder="Introduction"
                          />
                        </label>

                        <label className={labelClass}>
                          Section heading — Bengali
                          <input
                            value={section.headingBn}
                            onChange={(event) =>
                              updateSection(index, 'headingBn', event.target.value)
                            }
                            className={fieldClass}
                            placeholder="ভূমিকা"
                          />
                        </label>

                        <label className={`${labelClass} sm:col-span-2`}>
                          Paragraphs — English
                          <textarea
                            rows={5}
                            value={section.bodyEn.join('\n')}
                            onChange={(event) =>
                              updateSection(
                                index,
                                'bodyEn',
                                event.target.value.split('\n')
                              )
                            }
                            className={fieldClass}
                            placeholder="Write each paragraph on a separate line."
                          />
                          <span className="mt-1 block text-[11px] font-normal text-ink-muted">
                            Each non-empty line becomes a separate paragraph.
                          </span>
                        </label>

                        <label className={`${labelClass} sm:col-span-2`}>
                          Paragraphs — Bengali
                          <textarea
                            rows={5}
                            value={section.bodyBn.join('\n')}
                            onChange={(event) =>
                              updateSection(
                                index,
                                'bodyBn',
                                event.target.value.split('\n')
                              )
                            }
                            className={fieldClass}
                            placeholder="প্রতিটি অনুচ্ছেদ আলাদা লাইনে লিখুন।"
                          />
                          <span className="mt-1 block text-[11px] font-normal text-ink-muted">
                            প্রতিটি অ-ফাঁকা লাইন একটি আলাদা অনুচ্ছেদ হবে।
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-t border-line pt-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">03 · Knowledge check</p>
                    <h3 className="mt-1 font-display text-lg text-ink">
                      Individual assessment
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Create a bilingual multiple-choice question bank for this law.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateAssessment('questions', [
                        ...editor.assessment.questions,
                        emptyQuestion(),
                      ])
                    }
                    className="btn-secondary !px-4 !py-2"
                  >
                    <FilePlus2 size={16} />
                    Add question
                  </button>
                </div>

                <div className="mt-6 grid gap-5 border border-line bg-surface p-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Passing percentage
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={editor.assessment.passPercentage}
                      onChange={(event) =>
                        updateAssessment(
                          'passPercentage',
                          Number(event.target.value)
                        )
                      }
                      className={fieldClass}
                    />
                    <span className="mt-1 block text-[11px] font-normal">
                      Learners must achieve this percentage to pass.
                    </span>
                  </label>

                  <label className="flex items-center gap-3 self-end border border-line bg-canvas px-4 py-3">
                    <input
                      type="checkbox"
                      checked={editor.assessment.isPublished}
                      disabled={editor.assessment.questions.length === 0}
                      onChange={(event) =>
                        updateAssessment('isPublished', event.target.checked)
                      }
                      className="h-4 w-4 accent-[#243D35]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        Publish assessment
                      </span>
                      <span className="block text-xs text-ink-muted">
                        Make this question bank available to learners
                      </span>
                    </span>
                  </label>

                  <div className="text-xs text-ink-muted sm:col-span-2">
                    {editor.assessment.questions.length} question(s)
                    {' · '}
                    {editor.assessment.isPublished
                      ? 'Marked for publication'
                      : 'Currently a draft'}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-ink-muted">
                    Preview displays both languages and reveals the answer key.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAssessmentPreview((value) => !value)}
                    className="btn-secondary !px-4 !py-2"
                  >
                    {assessmentPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                    {assessmentPreview ? 'Hide preview' : 'Preview assessment'}
                  </button>
                </div>

                {editor.assessment.questions.length === 0 && (
                  <div className="mt-5 border border-dashed border-line bg-surface px-5 py-10 text-center">
                    <BookOpen className="mx-auto text-ink-muted" size={26} />
                    <p className="mt-3 text-sm font-medium text-ink">
                      No assessment questions yet
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Add questions to build this law's individual assessment.
                    </p>
                  </div>
                )}

                <div className="mt-5 space-y-5">
                  {editor.assessment.questions.map((question, index) => (
                    <article
                      key={question.id}
                      className="border border-line bg-surface p-4 sm:p-5"
                    >
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center bg-forest-50 font-semibold text-forest-700">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              Question {index + 1}
                            </p>
                            <p className="text-[11px] text-ink-muted">
                              Four answer options · Bilingual
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveQuestion(index, -1)}
                            disabled={index === 0}
                            className="rounded p-2 text-ink-muted hover:bg-canvas-2 disabled:opacity-25"
                            aria-label="Move question up"
                          >
                            <ChevronUp size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(index, 1)}
                            disabled={index === editor.assessment.questions.length - 1}
                            className="rounded p-2 text-ink-muted hover:bg-canvas-2 disabled:opacity-25"
                            aria-label="Move question down"
                          >
                            <ChevronDown size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="rounded p-2 text-ink-muted hover:bg-red-50 hover:text-red-700"
                            aria-label="Remove question"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                          Question — English
                          <textarea
                            rows={3}
                            value={question.questionEn}
                            onChange={(event) =>
                              updateQuestion(index, 'questionEn', event.target.value)
                            }
                            className={fieldClass}
                            placeholder="Write the question in English."
                          />
                        </label>

                        <label className={labelClass}>
                          Question — Bengali
                          <textarea
                            rows={3}
                            value={question.questionBn}
                            onChange={(event) =>
                              updateQuestion(index, 'questionBn', event.target.value)
                            }
                            className={fieldClass}
                            placeholder="প্রশ্নটি বাংলায় লিখুন।"
                          />
                        </label>
                      </div>

                      <div className="mt-6">
                        <p className="text-xs font-semibold text-ink-muted">
                          Answer options
                        </p>

                        <div className="mt-3 space-y-4">
                          {question.optionsEn.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className="border border-line bg-canvas p-3 sm:p-4"
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-ink">
                                  Option {String.fromCharCode(65 + optionIndex)}
                                </span>
                                <label className="flex items-center gap-2 text-xs font-medium text-forest-700">
                                  <input
                                    type="radio"
                                    name={`correct-${question.id}`}
                                    checked={question.correctOption === optionIndex}
                                    onChange={() =>
                                      updateQuestion(
                                        index,
                                        'correctOption',
                                        optionIndex as 0 | 1 | 2 | 3
                                      )
                                    }
                                    className="accent-[#243D35]"
                                  />
                                  Correct answer
                                </label>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className={labelClass}>
                                  English
                                  <input
                                    value={option}
                                    onChange={(event) =>
                                      updateQuestionOption(
                                        index,
                                        'en',
                                        optionIndex,
                                        event.target.value
                                      )
                                    }
                                    className={fieldClass}
                                    placeholder={`Option ${optionIndex + 1} in English`}
                                  />
                                </label>

                                <label className={labelClass}>
                                  Bengali
                                  <input
                                    value={question.optionsBn[optionIndex]}
                                    onChange={(event) =>
                                      updateQuestionOption(
                                        index,
                                        'bn',
                                        optionIndex,
                                        event.target.value
                                      )
                                    }
                                    className={fieldClass}
                                    placeholder={`বিকল্প ${optionIndex + 1} বাংলায়`}
                                  />
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                          Explanation — English
                          <textarea
                            rows={4}
                            value={question.explanationEn}
                            onChange={(event) =>
                              updateQuestion(index, 'explanationEn', event.target.value)
                            }
                            className={fieldClass}
                            placeholder="Explain why the correct answer is right."
                          />
                        </label>

                        <label className={labelClass}>
                          Explanation — Bengali
                          <textarea
                            rows={4}
                            value={question.explanationBn}
                            onChange={(event) =>
                              updateQuestion(index, 'explanationBn', event.target.value)
                            }
                            className={fieldClass}
                            placeholder="সঠিক উত্তরটি কেন সঠিক তা ব্যাখ্যা করুন।"
                          />
                        </label>
                      </div>

                      {assessmentPreview && (
                        <div className="mt-5 border border-forest-200 bg-canvas p-4">
                          <p className="eyebrow text-forest-700">
                            Question preview · {index + 1}
                          </p>
                          <h4 className="mt-3 text-sm font-semibold text-ink">
                            {question.questionEn || 'English question preview'}
                          </h4>
                          <p className="mt-1 text-sm text-ink-muted">
                            {question.questionBn || 'বাংলা প্রশ্নের প্রিভিউ'}
                          </p>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {question.optionsEn.map((option, optionIndex) => (
                              <div
                                key={optionIndex}
                                className={`border px-3 py-2 text-xs ${
                                  question.correctOption === optionIndex
                                    ? 'border-forest-500 bg-forest-50 text-forest-800'
                                    : 'border-line bg-surface text-ink'
                                }`}
                              >
                                <span className="font-semibold">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>{' '}
                                {option || 'English option'}
                                <p className="mt-1">
                                  {question.optionsBn[optionIndex] || 'বাংলা বিকল্প'}
                                </p>
                                {question.correctOption === optionIndex && (
                                  <span className="mt-2 block font-semibold">
                                    Correct answer / সঠিক উত্তর
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
                            <p className="font-semibold text-ink">
                              Explanation
                            </p>
                            <p className="mt-1">{question.explanationEn || 'English explanation'}</p>
                            <p className="mt-1">{question.explanationBn || 'বাংলা ব্যাখ্যা'}</p>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              {error && (
                <div
                  role="alert"
                  className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLaw}
                disabled={saving}
                className="btn-primary"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save law & lesson'}
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
