# Testing strategy

## Layers

1. **Unit** — domain gating, Alternative Control rules, task matching, RBAC helpers, import validation (Vitest)
2. **Integration** — API routes with mock auth and PostgreSQL (Vitest + Prisma test database)
3. **Accessibility** — axe on key screens (Playwright)
4. **End-to-end** — conversational briefing, location, Stop Work, and accessibility (Playwright)

## Required coverage (automated)

Authentication; role authorization; JRB creation; draft saving; voice fallback; task matching; confirmation; multiple tasks; High Energy selection; Direct Control filtering; verification; not-used reason; Alternative Control count; category diversity; ownership; supervisor review; minimum briefing completeness; crew acknowledgment; late-arrival acknowledgment; Ready for Work gating; Stop Work; rebrief versioning; post-job; offline draft; sync; conflicts; controlled version retention; audit events; secure upload; accessibility; mobile layout; AI failure; speech failure; import validation.

## E2E scenarios

1. Distribution “setting a pole” → confirm Dist pole task → controls → brief → release only when complete
2. Transmission installing a transmission pole → Dist pole task is not the confirmed task
3. Substation rack-in/rack-out → exact Substation task
4. Present High Energy + selected unverified Direct Control → cannot Ready for Work
5. Two Alternative Controls same category → rejected
6. Complete Alternative Control strategy (two categories, owners, verification, residual, stop-work, supervisor)
7. Conditions change after release → new version, prior preserved, rebrief required
8. Stop Work removes Ready for Work without supervisor approval
9. Offline draft saves; UI does not claim synchronized or released

## Commands

```bash
npm test
npx playwright test
npm run typecheck
npm run lint
```

Do not fabricate passing results. Failures are fixed or documented as known gaps.
