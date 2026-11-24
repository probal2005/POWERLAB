# Reusable POWERLAB task prompt

Copy the template into an issue or an AI coding session. Replace the bracketed fields with details for the specific task.

```text
Project: POWERLAB, a React and TypeScript learning platform with Supabase and Vercel.
Source branch or commit: [branch or commit to work from]
Task: [user-visible problem or requested feature]
Affected role and routes: [visitor, student, or administrator; URLs or screens]
Current behavior: [what happens now, with steps to reproduce if applicable]
Expected behavior: [what the user should be able to do]
Acceptance checks: [specific outcomes, including failure cases]
Release scope: [local changes, pull request, preview, or approved production release]

Review the relevant code and existing tests. Reuse the existing project patterns and
keep the change focused on the requested behavior.

When touching learner or admin data, verify Supabase permissions for the affected
roles using test accounts or a disposable database. Keep credentials and private
data out of the change and its output. Preserve compatibility with existing records
and published certificate snapshots where the feature affects them.

For UI changes, check mobile and desktop layouts, keyboard interaction, and English
and Bengali text on affected screens. Keep the site's existing branding.

Run the applicable lint, type, build, and functional checks. Summarize the changed
files, the test cases and results, any migration order, and anything still
unverified. Distinguish local, preview, and production results.
```

Use [STRUCTURE.md](STRUCTURE.md) to find the relevant code and [PLAN.md](PLAN.md) to choose checks for the change.
