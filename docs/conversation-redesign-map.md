# Conversation redesign map

This is the inventory of the previous 10-step JRB and where each capability lives after the field-facing redesign. Existing EEI, High Energy, Direct Control, auth, and record models stay in place. The employee UI is three pre-work screens plus event-driven Stop Work, Rebrief, and closeout.

## Original 10-step workflow

| Step | What it captured | Map |
|------|------------------|-----|
| 1 Start the Job Brief | Location, WO, work type, classification, EIC, supervisor, crew, contractor, emergency, comms | **A** Screen 1 (location + identity). Talk extracts the rest. Classification stays a suggestion, not auto-confirmed. |
| 2 What Work Are We Doing? | Work description, EEI task confirm | **A/B** Screen 1 conversation + suggested EEI tasks to Confirm. |
| 3 Jobsite Conditions | Predeparture, environment, walkdown, plan-match | **B/C** Extracted from talk when said; stored on conditions tables; not a required page. |
| 4 What Can Seriously Hurt or Kill Us? | HE presence, SIF fields, crew confirm | **A** Screen 2. Suggested from talk + catalog; crew confirms Present. |
| 5 How Will We Control the Energy? | DC select/verify, not-used, Alternative Controls | **A** Screen 2. Suggested/extracted controls; crew confirms use. Alt framework remains if no approved DC is used. |
| 6 Job Steps and PPE | Setup/tasks/cleanup, procedures, precautions, energy control, PPE, pole questions | **B/C** Extracted from talk onto job steps / facts. Shown on Screen 3 only if material. |
| 7 Briefing Subjects | OSHA completeness panel | **C** OSHA completeness engine; Screen 3 shows addressed/missing, not five empty checkboxes. |
| 8 Review the Job Plan | Summary | **A** Screen 3 summary. |
| 9 Brief the Crew | Questions, acknowledgments | **A** Screen 3 acknowledgments. Talk never acknowledges. |
| 10 Are We Ready to Start? | Release | **A** Screen 3 release. Same gating, no AI release. |

Stop Work, Conditions Changed / Rebrief, and Post-job stay **D/E/F** event-driven (already persistent actions; they are no longer implied as later wizard pages).

## Legend

- **A** Primary employee-facing workflow
- **B** Automatically extracted from conversation
- **C** Backend-only structured information
- **D** Event-driven Rebrief
- **E** Event-driven Stop Work
- **F** Post-job workflow
- **G** Redundant / safe to retire from the field UI (data retained)

## Retired from the field UI (not deleted)

Giant Before You Leave / Two-Minute Walk Down / PPE checkbox matrices are no longer mandatory pages. Their labels remain in extractors so spoken items still land in structured facts and existing tables. Historical JRB rows are not deleted.

## Employee-facing vs backend

Employee-facing: Job Location, Talk through the job, adaptive follow-ups, EEI task confirm, High Energy / control review, Ready for Work summary, crew acknowledgment, Release, persistent Stop Work / Rebrief, post-job closeout.

Backend-only unless safety-significant: weather, staging, vehicles, unused walkdown/predeparture items, transcript segments, extraction confidence, OSHA evidence mapping, unmapped facts.

Event-driven: Stop Work (open until a person resumes it), Conditions Changed / Rebrief (new version, original preserved), post-job review.

