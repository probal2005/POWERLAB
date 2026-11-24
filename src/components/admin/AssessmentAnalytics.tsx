import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Analytics = {
  laws: { slug: string; title_en: string; attempts: number; passes: number; started: number; completed: number }[];
  questions: { law_slug: string; question: string; responses: number; misses: number }[];
};

export default function AssessmentAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void supabase.rpc('get_powerlab_assessment_analytics').abortSignal(controller.signal).then(({ data, error }) => {
      if (controller.signal.aborted) return;
      if (error) setError(true);
      else setAnalytics(data);
    });
    return () => controller.abort();
  }, []);

  return <details className="space-y-4 border border-line bg-surface p-5">
    <summary className="cursor-pointer font-display text-xl">Quiz and lesson analytics</summary>
    {error ? <p role="alert">Analytics are unavailable.</p> : !analytics ? <p role="status">Loading analytics…</p> : <>
      <h3 className="font-semibold">Lesson completion and quiz passes</h3>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead><tr><th scope="col">Lesson</th><th scope="col">Completed / started</th><th scope="col">Passed / attempts</th></tr></thead>
          <tbody>{analytics.laws.map((law) => <tr className="border-t border-line" key={law.slug}>
            <th scope="row" className="py-2 pr-4 font-medium">{law.title_en}</th>
            <td>{law.completed} / {law.started}</td><td>{law.passes} / {law.attempts}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <h3 className="font-semibold">Most missed questions</h3>
      {!analytics.questions.length && <p className="text-sm text-ink-muted">Question-level results appear after new quiz submissions.</p>}
      <ul className="space-y-2">{analytics.questions.map((question) => <li className="text-sm" key={`${question.law_slug}:${question.question}`}>
        {question.question} · {question.misses} missed out of {question.responses} responses
      </li>)}</ul>
    </>}
  </details>;
}
