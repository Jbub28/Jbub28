# EnergyGuard JRB — product requirements

EnergyGuard JRB is a mobile-first Job Risk Briefing application for Electric Delivery employees and contractors. It guides a crew discussion before work starts. It is not an Energy-Based Observation tool, scoring tool, or performance evaluation.

## Who it is for

Field crews and contractors on Electric Distribution, Electric Transmission, and Electric Substation work; Employees in Charge; supervisors; authorized Safety reviewers; reference-library administrators; read-only reporting users.

## What a briefing must accomplish

1. Plan the work and identify approved EEI tasks
2. Recognize High Energy exposures
3. Evaluate serious injury or fatality potential (SCLM help is optional)
4. Select and verify Direct Controls, or complete the Alternative Control Framework
5. Discuss required briefing subjects
6. Document crew participation
7. Confirm readiness for work
8. Stop work when needed
9. Rebrief when conditions change
10. Close the job without ranking people

## Non-goals

- Observation forms, observer assessments, coaching scores, behavior ratings
- Employee rankings or disciplinary records
- Loading Generation, Gas, Vegetation, Fleet, Supply Chain, or renewable work-type tasks into the field library
- Inventing MAD, voltage, PPE ratings, switching steps, or other technical values
- Declaring work safe because software checks passed

## Core safety principles (product rules)

1. The briefing is a crew discussion, not merely a completed form.
2. The Employee in Charge remains responsible for conducting the briefing.
3. AI provides suggestions for crew review, not final safety decisions.
4. Workers retain stop-work authority.
5. A completed software validation does not mean that work is safe.
6. A verified Direct Control is preferred for every applicable High Energy exposure.
7. When a Direct Control is not feasible, the Alternative Control Framework is required.
8. Alternative Controls are not labeled as Direct Controls.
9. Significant changes require reassessment and rebriefing.
10. Controlled safety content is governed, versioned, and auditable.
11. Company rules, approved work methods, regulations, and qualified-person judgment still apply.
12. The application does not generate technical work-practice values unless imported from an approved source.

## Field experience (extreme simplicity)

One clear question at a time. Plain field language. Short sentences. Voice first, typed fallback. Large buttons, large text, glove-sized targets, high contrast. Icons always have labels. Color is never the only status. Back, Save Draft, Help, and Next stay in the same places. Progress is visible. Only applicable questions appear. Search instead of long dropdowns. Back navigation preserves answers. Autosave. Specific validation. Expandable definitions. Review before release. Persistent Stop Work and Conditions Changed / Rebrief. WCAG 2.2 AA objectives.

## Workflow steps

1. Start the Job Brief
2. What Work Are We Doing?
3. Before You Leave and Jobsite Conditions
4. What Can Seriously Hurt or Kill Us?
5. How Will We Control the Energy?
6. Job steps, procedures, precautions, and PPE
7. OSHA minimum briefing subjects (completeness layer)
8. Review the Job Plan
9. Brief the Crew
10. Are We Ready to Start?
11. Post-job review

## Gating (Ready for Work)

A JRB cannot be Released for Work while High Energy is Present and any of these are true: no verified Direct Control and Alternative Control Framework incomplete; missing supervisor review when required; a control has no owner; required verification is incomplete; a control is no longer in place; an unresolved safety question remains; Stop Work is active; required records are not synchronized.

## Definition of done

See the project request. The first production candidate requires authentication, a complete briefing path, controlled-content governance, offline drafts, append-only audit, passing critical tests, and no invented safety content.
