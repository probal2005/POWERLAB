![POWERLAB website logo](public/powerlab-logo.png)

# POWERLAB

POWERLAB is a bilingual learning platform for exploring 48 principles of power and influence through structured lessons, practical examples, and assessments. The live site offers English and বাংলা.

[Visit POWERLAB](https://powerlab48.vercel.app/) · [Browse the 48 laws](https://powerlab48.vercel.app/laws) · [Verify a certificate](https://powerlab48.vercel.app/verify-certificate)

## What you can do

| Role | Features on the live site |
| --- | --- |
| Visitor | Browse the 48 lessons, switch between English and বাংলা, explore lesson quizzes, and verify a certificate by ID. |
| Student | Track lesson progress, save lessons, review assessment results, and earn a printable certificate after completing the required modules and passing the final assessment. |
| Administrator | Manage lessons, categories, assessments, users, and manual translations. Configure certification, edit the final question bank, customize certificate branding and partner logos, and review website visit history. |

The live release is maintained on the [production-readiness branch](https://github.com/probal2005/POWERLAB/tree/codex/production-readiness). Use that branch when developing against the features described above.

## Technology

- **Frontend** — React, TypeScript, React Router, Vite, and Tailwind CSS.
- **Backend** — Supabase Auth and PostgreSQL, with row-level security policies that restrict access by role and ownership.
- **Hosting** — Vercel.

## Run locally

Use Node.js **22.12 or later**, npm, and a development Supabase project.

```bash
git clone --branch codex/production-readiness https://github.com/probal2005/POWERLAB.git
cd POWERLAB
npm ci
```

Apply the SQL files in `supabase/migrations/` in filename order to your development database. Create a `.env.local` file in the project root with your Supabase project URL and publishable key.

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Keep service-role keys out of client environment variables. Start the development server with `npm run dev`.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Check TypeScript types. |
| `npm run build` | Generate a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |

Application code lives in `src/`, static assets in `public/`, and database migrations in `supabase/migrations/`.

## Project guides

- [STRUCTURE.md](STRUCTURE.md) maps routes, source directories, and key data flows.
- [PROMPT.md](PROMPT.md) provides a reusable task brief for future changes.
- [PLAN.md](PLAN.md) tracks development, testing, and release checks.
