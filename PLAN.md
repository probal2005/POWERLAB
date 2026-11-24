# POWERLAB project plan

Use this checklist when preparing a change or deciding what to verify next.

## Before implementation

- [ ] Identify the affected role, route, and user workflow. Record the current behavior and what should happen after the change.
- [ ] Confirm the starting branch and the target environment. The public site currently uses a separate production source branch. [Production source](https://github.com/probal2005/POWERLAB/tree/codex/production-readiness)
- [ ] For a database change, identify the affected roles, existing records, and required migration order.

## Before requesting review

- [ ] Run `npm run lint`, `npm run typecheck`, and `npm run build` from the application branch for code changes.
- [ ] Test the affected workflow with the appropriate role. Use a second student account when testing restrictions on ownership of progress, notes, attempts, or certificates.
- [ ] Check mobile and desktop navigation, keyboard interaction, and English and Bengali rendering for UI changes.
- [ ] If certification changes, test claiming a certificate, printing a PDF, public verification, and the behavior of a previously issued certificate.
- [ ] Record test results, deployment dependencies, and any unverified cases in the pull request.

Run the browser smoke check against the local production preview with a disposable Supabase project and test accounts. Run the SQL checks against a disposable database after applying migrations. [Browser smoke check](https://github.com/probal2005/POWERLAB/blob/codex/production-readiness/tests/browser-smoke.py) · [SQL checks](https://github.com/probal2005/POWERLAB/tree/codex/production-readiness/tests)

## When releasing

- [ ] Confirm the target commit and preview behavior. Verify signup, login, and admin access on a staging project if the change affects authentication.
- [ ] Apply any required backward-compatible migration before releasing frontend code that depends on it. Confirm that the existing frontend still works during the transition.
- [ ] After an approved production release, verify the live commit, representative lesson and assessment deep links, and the specific changed feature.

## Open verification work

- [ ] **Dynamic missing routes.** Verify the HTTP response for an unknown lesson or assessment slug. Ordinary unknown paths return `404`, but an unknown lesson slug was observed returning `200` with an in-app error page.
- [ ] **Auth and data isolation.** Verify reset email delivery and cross-account data access with staging accounts. Review any remaining Supabase Advisor findings in the target project.
- [ ] **Visitor history.** Compare active time and visit counts across separate browser profiles, including background tabs and returning visits.
- [ ] **Content and accessibility.** Review Bengali lesson and question wording with a fluent reviewer. Recheck the learning and certificate flows on real mobile devices and with a screen reader.

See [README.md](README.md) for local setup and [STRUCTURE.md](STRUCTURE.md) for code ownership.
