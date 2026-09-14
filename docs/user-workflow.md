# User workflow

The field path is three pre-work screens plus event-driven Stop Work, Conditions Changed / Rebrief, and post-job closeout. Navigation shows “Step n of 3”. Persistent actions on an active JRB: **Stop Work** and **Conditions Changed / Rebrief**.

EnergyGuard listens to the crew’s safety conversation. It does not administer a 10-page questionnaire. The crew should spend time on:

1. What are we doing?
2. What can seriously injure or kill us?
3. How are we preventing that exposure?

## Screen 1 — Talk Through the Job

Job Location is first: primary Job Location, 911/street address, optional GPS coordinates, and a pole/structure/equipment identifier when it applies. GPS permission is never required; typing always works. Location is stored on the JRB record so it stays available through rebriefs, Stop Work, and post-job closeout.

One **Talk through the job** control captures the briefing. The prompt is: tell us what we’re doing, what can seriously hurt or kill us, and how we’re going to control it. Speech is transcribed, then structured. Empty fields may prefill. Existing values are not overwritten unless the employee accepts a spoken change. Voice never confirms a task, never acknowledges, never releases work, and never advances the wizard.

Worker in Charge, crew, date/time, work order, circuit, and task remain available. They are not all mandatory.

Follow-up questions appear only when a required OSHA subject, a high-energy exposure without a control, or a safety-critical statement is missing or uncertain. One answer is re-analyzed. The app does not run a fixed questionnaire.

Suggested EEI tasks still require an explicit **Confirm this task**.

## Screen 2 — What Can Kill Us / Critical Controls

Shows High Energy exposures identified from the conversation and matched to the published catalog, plus controls identified from talk and suggested from the Direct Control Inventory.

States stay distinct:

- identified from conversation
- suggested from inventory
- confirmed by the crew

A suggested control is not a confirmed control. **This is what we briefed** is the employee confirmation. If a high-energy exposure still lacks a control, that confirmation is blocked until the crew answers the follow-up.

## Screen 3 — Ready for Work / Crew Confirmation

A short summary: job, location, what can seriously hurt or kill us, critical/direct controls, and material PPE or precautions. OSHA’s five briefing subjects are shown as addressed or needs attention from the conversation — not as empty checkboxes to complete again.

Crew members acknowledge this version. Stop Work authority and rebrief-on-change are part of that acknowledgment. AI cannot acknowledge or sign.

**Release JRB for Work** still uses the existing readiness gate: confirmed EEI task, crew acknowledgments, verified Direct Control (or complete Alternative Control strategy) for Present High Energy, synchronized records, and no active Stop Work. After release: “The briefing is complete. Continue to monitor the work and stop or rebrief if conditions change.”

## Stop Work

Always available during an active JRB. Not a later wizard page. Capture what happened, the condition, affected work/hazard, and corrective action. Voice is available. The event stays open until a person explains the corrective action and taps **Work may resume**. AI cannot close Stop Work.

## Conditions Changed / Rebrief

Always available. Ask “What changed?” Voice is available. Analysis compares the original briefing to the new conditions and only highlights affected exposures and controls. The original briefing and version are preserved. A new version requires new acknowledgments.

## Post-job review

Event-driven closeout, not part of the pre-work sequence. Voice-enabled notes for what went well, improvements, and best practices, plus grounds/hold order/cargo/spotter/Stop Work/rebrief flags when they apply. Not used to score people.
