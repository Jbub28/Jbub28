# Implementation backlog

Vertical slices, in the required order. Each slice must leave the app runnable.

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Repository inspection | Done |
| 2 | Reference-file inventory | Done — `/docs/source-inventory.md` |
| 3 | Architecture and data model | Done — `/docs` + Prisma schema |
| 4 | Application shell | Field PWA shell, routes, high-contrast UI |
| 5 | Authentication and roles | Mock + Entra-ready provider, server RBAC |
| 6 | Database migrations | Prisma PostgreSQL |
| 7 | Controlled-content staging import | JSON extracts + CLI + admin publish |
| 8 | Start the Brief | Step 1 fields + JRB number |
| 9 | Voice and typed work description | Speech provider + transcript edit |
| 10 | EEI task search and confirmation | Library search + match suggestions |
| 11 | Pre-departure and jobsite conditions | Form-derived checklists |
| 12 | High Energy review | Form icons + Present / Not Present |
| 13 | Direct Control filtering and verification | Logic View filter + verify |
| 14 | Direct Control not used | Controlled reasons + audit |
| 15 | Alternative Control Framework | Two controls / two categories |
| 16 | Job steps, procedures, precautions, PPE | Sequential steps + form PPE |
| 17 | Minimum briefing completeness | Five subjects + EIC/crew/conditions |
| 18 | Job-plan review | Plain-language summary |
| 19 | Crew briefing and acknowledgment | Cards + signatures |
| 20 | Ready for Work gating | Domain `evaluateReadiness` |
| 21 | Stop Work | Persistent action, no supervisor gate |
| 22 | Conditions Changed / Rebrief | New version, prior preserved |
| 23 | Post-job review | Level 4 |
| 24 | Evidence upload | Type/size validation + storage provider |
| 25 | Offline drafts and sync | IndexedDB + queue |
| 26 | Administrative interfaces | Libraries, imports, exceptions |
| 27 | Audit history | Append-only |
| 28 | Automated tests | Unit, API, a11y, e2e scenarios |
| 29 | Security hardening | Headers, validation, rate limits |
| 30 | Deployment artifacts | Azure-oriented `/docs/deployment.md` |

Unresolved controlled-content work for administrators after go-live:

1. Confirm DC Inventory column headers from the original xlsx
2. Approve or reject proposed task synonyms
3. Author task-to-High Energy mappings only when a controlled source exists
4. Resolve Alternative Control rule pack (QR / rules 5, 7, 8)
5. Supply a swinging-load icon from an approved source, or keep the placeholder
6. Author SCLM values if a controlled catalog is approved
