# Assumptions and exceptions

Safety-critical gaps are recorded as exception records and as `controlled_content_exceptions` rows at seed time. Nothing below is silent invention.

## Assumptions (non-safety)

1. The existing repository was a different product (route-risk / iOS navigation). EnergyGuard JRB replaces the web application. Legacy Capacitor / iOS folders are not part of this product.
2. Local development uses mock authentication, mock speech, mock AI matching, and local file storage. Azure adapters are compiled and configured through environment variables but are not called unless credentials exist.
3. PostgreSQL is the system of record. A docker-compose file and local cluster instructions are provided.
4. Demo users are seeded for local use only. They are not production identities.
5. “JULIE #” on the Illinois-origin form is stored as **utility locate / ticket number** so other operating areas can use the same field.
6. Work Classification is a user-confirmed value. AI may suggest Operations or Maintenance vs Construction; it never finalizes a legal class.
7. Crew-facing talk-to-text uses the browser Web Speech API. If the browser cannot listen, the field says so and typing still works. `/api/speech/transcribe` mock/Azure adapters remain for server-side transcription; they are not used as a fake microphone in the field UI. Azure Speech is used when `SPEECH_PROVIDER=azure`.
8. Photos are optional evidence. They never replace verification fields.
9. The original EEI PDF is retained under `/reference` even though only three Electric Delivery work types are operational.

## Exception register

See `/reference/extracted/exceptions.json` for the machine-readable list.

| ID | Status | Topic |
|----|--------|--------|
| EXC-001 | Administrator Review Required | Original xlsx workbooks were not provided |
| EXC-002 | Administrator Review Required | DC Inventory header OCR unreliable |
| EXC-003 | Unresolved | No task-to-High Energy production mapping |
| EXC-004 | Unresolved | No task-to-Direct Control production mapping |
| EXC-005 | Administrator Review Required | Dedicated Monitoring vs Direct Monitoring |
| EXC-006 | Unresolved | Alternative Control rules 5/7/8 and QR target |
| EXC-007 | Unresolved | Gas detection monitoring unmapped |
| EXC-008 | Administrator Review Required | High Energy label variants across sources |
| EXC-009 | Unresolved | Swinging load icon missing |
| EXC-010 | Unresolved | SCLM classification table not in attachments |
| EXC-011 | Note | Worker in Charge vs Employee in Charge |
| EXC-012 | Unresolved | No approved PPE-to-task mappings |

## What the application will not do

- Invent EEI tasks, High Energy icons, Direct Controls, OSHA requirements, or PPE requirements
- Auto-confirm AI or speech suggestions
- Label Alternative Controls as Direct Controls
- Declare work “safe,” “OSHA compliant,” or “OSHA approved”
- Generate MAD, voltage, PPE rating, or switching values
- Score or rank employees
- Publish imported controlled content without an administrator approval action
