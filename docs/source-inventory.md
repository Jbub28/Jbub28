# Controlled source inventory

Inspection date: 2026-09-13.

The `/reference` folder contains PDF conversions of the four named attachments. The original `.xlsx` workbooks were **not** present in the repository or the upload set. Excel worksheets, named ranges, and data-validation lists therefore could not be inspected. That gap is recorded as exception **EXC-001**.

| # | Received file | Requested original | Pages / sheets found | Publisher / ID |
|---|----------------|--------------------|----------------------|----------------|
| 1 | `AIC 2024 Electric Job Briefing Form.pdf` | `AIC 2024 Electric Job Briefing Form.xlsx` | 2 pages (PDF). Excel worksheets not available. | ELECTRIC JOB SAFETY BRIEFING FORM, F 5845 Stock # 37-41-377, Apr-2024 |
| 2 | `DC_Inventory_v1 (5).pdf` | `DC Inventory_v1 (5).xlsx` | 1 page Logic View matrix. Excel worksheets not available. | Direct Control inventory v1 |
| 3 | `EEI_Task_Libraries_-_All_work_types_7-21-2026 (2).pdf` | `EEI Task Libraries - All work types_7-21-2026 (2).pdf` | 136 pages | EEI / Itron, Approved Task Libraries, July 2026 |
| 4 | `cc21cf_f6f373a62bf34aaa9b7aa3bb05be5750.pdf` | same | 1 page infographic | CSRA — High Energy: Controlling the Uncontrollable |

Machine-readable extracts live in `/reference/extracted/`. High Energy icons extracted from form page 2 live in `/public/controlled/high-energy/` with `ATTRIBUTION.txt`.

## 1. AIC 2024 Electric Job Safety Briefing Form

**Directly importable (exact labels)**

- Form title, form ID, Apr-2024 print date
- Level 1 Before You Leave checklist items
- Environmental hazard choices: Heat, Cold, Wind, Rain, Snow, Ice, Fog, Other
- JULIE # and Dig By/Expiration fields
- Level 2 Two Minute Walk Down items
- Level 3 work-procedure topics (Hold-Off, WPA, grounding, aerial lift, etc.)
- Voltage identifier checkboxes (stored as job identifiers, not calculated limits)
- Pole climbing question, four tests, and the do-not-climb warning
- PPE list
- Ergonomics / Power Zone questions
- Stop Work, Re-Brief, and Emergency Action acknowledgements
- Sign-in sheet columns
- Level 4 post-job items
- 13 High Energy icons and their on-form captions

**Reviewed extraction**

- Layout grouping (Level 1–4) used as workflow structure, not as invented safety rules
- “Worker in Charge” vs product role “Employee in Charge” (EXC-011)

**Explicit mappings supplied**

- None between tasks, High Energy, Direct Controls, or PPE

**Not supplied / not imported as logic**

- Minimum approach distance values (the form has a “4 Foot Primary/MAD” topic checkbox only)
- Voltage thresholds as calculated technical requirements
- Energy Wheel categories (Gravity, Motion, Mechanical, Electrical, Pressure, Sound, Ergonomic, Biological, Chemical, Temperature) are **not** the High Energy catalog. They are displayed only as a help graphic attribution, not as selectable High Energy records.

## 2. DC Inventory v1

**Directly importable**

- Direct Control definition line on the sheet
- 44 Direct Control names (exact spelling, including asterisks and punctuation)
- Notes and Examples column text
- X-mark mappings from the Logic View (control × High Energy column)

**Reviewed extraction**

- Rotated High Energy column headers were not OCR-reliable (EXC-002). Column order was reconstructed and must be confirmed against the original xlsx before treating headers as final controlled text.
- “Gas detection monitoring” had no extractable X-mark (EXC-007).

**Explicit mappings supplied**

- Direct Control → High Energy (Logic View X marks)
- 14 High Energy columns, including Swinging load (no form icon)

**Not supplied**

- Task → Direct Control mappings
- Verification methods per control
- Additional Excel sheets (if any existed in the xlsx)

## 3. EEI Task Libraries (July 2026)

**Directly importable**

- Activity definition (page 7)
- Task definition and formula (page 8)
- Hierarchy: Work Type → Activity → Task → Work Method when needed
- Electric Distribution task library (pages 12–16): 10 activities, 65 tasks
- Electric Transmission task library (pages 17–21): 8 activities, 66 tasks
- Electric Substation task library (pages 22–27): 12 activities, 78 tasks

**Preserved in import history, not loaded to the field app**

Generation, Gas, Vegetation Management, Fleet, Supply Chain / Warehouse, Solar, Wind, Hydroelectric, and Battery Storage libraries (pages 28–136). The original PDF is retained in `/reference` and recorded on the import record.

**Explicit mappings supplied**

- None to High Energy, Direct Controls, PPE, or OSHA citations

**Not supplied**

- Approved synonyms or aliases (proposed aids are staged as unapproved)
- Work-method child records beyond what is already in the task name

## 4. Alternative Control resource (cc21cf)

**Directly importable**

- Three Direct Control requirements (exact card text)
- Alternative Control definition
- Two-control / two-category rule (exact body text)
- Category cards: Physical Obstacle, Dedicated Monitoring, Visual Reminder — definitions and examples

**Reviewed extraction**

- Body text says “Direct Monitoring”; the card is labeled “Dedicated Monitoring” (EXC-005)
- Footer statements about Alternative Controls

**Not supplied**

- Rules 5, 7, and 8 referenced in examples
- QR-linked “Access Alternative Controls rules” content (EXC-006)
- “Energy Calculations” icon is not a DC Inventory column and is not an operational High Energy record

## Mapping status

| Mapping | In source? | Application behavior |
|---------|------------|----------------------|
| Direct Control × High Energy | Yes (Logic View) | Used to filter controls after an exposure is Present |
| EEI Task × High Energy | No | Table exists; no production rows; crew adds exposures manually |
| EEI Task × Direct Control | No | Filter by High Energy only |
| EEI Task × PPE | No | PPE list from the form; user confirms; no AI determination |
| Synonym × EEI Task | No | Proposed aids, pending administrator approval |
| SCLM catalog | No | Help text only; values require administrator content |

Do not treat reconstructed headers, proposed synonyms, or empty mapping tables as approved safety content.
