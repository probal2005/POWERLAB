# POWERLAB project structure

This guide maps the live application to its source. The production source branch contains features and database migrations beyond those on `main`. The route examples and source links below follow the production branch. [Production source](https://github.com/probal2005/POWERLAB/tree/codex/production-readiness)

## Where to make changes

| Area | Location | What it owns |
| --- | --- | --- |
| App shell and routing | `src/main.tsx`, `src/App.tsx` | App startup, providers, lazy-loaded pages, public routes, and student/admin route groups. |
| Page content and workflows | `src/pages/`, `src/pages/admin/` | Lesson reading, assessments, learner progress, certificate verification, and admin tools. |
| Layout and brand | `src/components/`, `src/index.css`, `tailwind.config.js`, `public/` | Public navigation, shared workspace layout, branding, responsive styles, print rules, and static assets. |
| Shared application state | `src/context/` | Auth session and profile, shared lesson content, and language selection. |
| Data and utilities | `src/data/`, `src/lib/`, `src/types/` | Bundled lesson and translation data, Supabase client, reading position, translation helpers, and TypeScript types. |
| Backend | `supabase/migrations/`, `supabase/functions/` | Schema, row-level security policies, database functions, seed data, and the admin user-management Edge Function. |
| Verification and hosting | `tests/`, `vercel.json` | Browser smoke tests, SQL checks, and Vercel routing and headers. |

## Routes and access

- **Public** — `/`, `/laws`, `/laws/:slug`, `/assessments`, `/assessment/:lawSlug`, and `/verify-certificate`. Visitors can browse lessons and open quizzes. Submitting a graded attempt requires sign-in.
- **Student** — `/student`, `/student/review`, `/certification`, and `/assessment/final`. These routes use the shared workspace layout and require the student role.
- **Admin** — `/admin` and its content, assessment, user, language, settings, and certification pages. The route guard controls the UI. Supabase policies and server-side role checks enforce data access. [Route definitions](https://github.com/probal2005/POWERLAB/blob/codex/production-readiness/src/App.tsx)

## Important data flows

- **Lessons and quizzes** — The content provider requests published content from Supabase. Public responses omit quiz answer keys. The quiz page sends attempts to the server for grading and shows the result. [Content provider](https://github.com/probal2005/POWERLAB/blob/codex/production-readiness/src/context/ContentContext.tsx) · [Assessment page](https://github.com/probal2005/POWERLAB/blob/codex/production-readiness/src/pages/AssessmentPage.tsx)
- **Certificates** — The admin publishes a design. When a student qualifies and claims a certificate, issuance captures a snapshot of that design. The student page uses it for display and printing. Public verification looks up the certificate ID and status. [Design editor](https://github.com/probal2005/POWERLAB/blob/codex/production-readiness/src/components/admin/CertificateDesignEditor.tsx) · [Design migration](https://github.com/probal2005/POWERLAB/blob/codex/production-readiness/supabase/migrations/20261124000800_certificate_design.sql)
- **Visitor reporting** — Public pages send browser activity samples. Admin reporting shows estimated active browsers, visit history, and active time. These counts are browser-based. [Presence tracker](https://github.com/probal2005/POWERLAB/blob/codex/production-readiness/src/components/ViewerPresence.tsx)

For setup and commands, see the [README](README.md). For change planning and release checks, see [PLAN.md](PLAN.md).
