# Reference import design

Repeatable import lives in `scripts/import-controlled-content.ts` and the admin Import screen.

## Sources

| File | Parser | Output |
|------|--------|--------|
| EEI Task Libraries PDF | Page-bounded extract JSON (and PDF text re-parse when run) | Staged work types, activities, tasks |
| DC Inventory PDF / future xlsx | Logic View JSON (xlsx parser stub when workbook present) | Staged Direct Controls and mappings |
| Job Briefing Form PDF | Form JSON + extracted PNG icons | Checklists, PPE, High Energy icons |
| Alternative Control PDF | Infographic JSON | Categories, examples, DC criteria |

Original files are stored as `controlled_content_sources` with checksum. The full EEI PDF is retained even when non-Electric-Delivery tasks are not published to the field library.

## Pipeline

1. Parse
2. Validate required fields
3. Detect duplicates (exact name + work type + source version)
4. Write staging rows (`contentStatus = staged`)
5. Create import report
6. Administrator review
7. Publish (new versions; no silent overwrite of published wording)

## Import report fields

Accepted, rejected, duplicate, missing values, unresolved mappings, warnings, source filename, source version, import date, importing user.

## Guardrails

- Exact controlled wording is not rewritten
- Missing values → `Unresolved`
- Conflicting labels across sources → exception row, both strings stored
- xlsx not present → report warning, PDF extract used, EXC-001 remains open
