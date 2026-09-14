# AI and speech design

AI is a recommendation assistant. Every result that could affect work is labeled for crew review. EnergyGuard captures, classifies, prefills, and maps to approved inventories. It does not invent facts, confirm controls, acknowledge, or decide that work is safe.

## Conversational briefing voice

Screen 1 has **one Talk through the job** control. The worker describes the job in natural language. The app transcribes, extracts structured safety facts, prefills empty identity/location/work fields, and keeps unused details in backend conversation intelligence. Typed values are never silently overwritten. If a location field already has a value, the app shows the proposed spoken change and waits for an explicit tap. Voice never advances the wizard and never submits the JRB.

Flow:

1. Talk → **Listening...**
2. Live / completed transcript on the page
3. Speech ends → briefing extraction (`extractBriefing` / `AiProvider.extractBriefing`)
4. Prefill + “Filled from talk where it was clear”
5. OSHA completeness + High Energy / Direct Control matching against published catalogs
6. At most the necessary follow-up questions
7. Worker edits anything; safety confirmations stay manual

Stop Work and Conditions Changed / Rebrief reuse the same speech stack. Post-job review still uses `PageVoiceAssistant` for closeout notes.

### Voice must not

Acknowledge, certify a control, select Ready for Work, sign for someone, submit/release a JRB, close Stop Work, attest Direct Controls are adequate, auto-confirm a High Energy presence, auto-confirm a task, or auto-confirm work classification. Those require an explicit tap.

AI must not represent something as discussed unless the conversation or employee input supports it. Low confidence leaves the item unconfirmed or asks for clarification. A hazard does not imply that a control is in place.

## Speech providers

Interface: `SpeechProvider.transcribe(input)`.

| Provider | Use |
|----------|-----|
| `mock` | Echo/fixture text for server tests |
| `browser` | Web Speech API in the client (field Talk) |
| `azure` | Azure AI Speech adapter (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`) |

Prefer transcript + structured facts + source mapping. Raw audio is discarded after transcription (`audioDiscarded: true`) unless `AUDIO_RETENTION_ENABLED=true` and a retention design is approved.

Offline: typed entry remains. Extraction can run locally from the transcript. If the microphone needs a connection, the UI says so.

## Briefing extraction

Interface: `AiProvider.extractBriefing({ transcript, catalog })`.

Server route `/api/ai/extract-briefing` loads the published catalog and validates output with Zod (`BriefingExtractionSchema`). The client may fall back to the local extractor if the API is offline.

Local/mock: deterministic extractor (`local-library-matcher` / `deterministic-v1`). Azure OpenAI, when configured, still runs the same catalog-bounded extractor in this build so invented controls cannot bypass validation.

## Task matching

Interface: `AiProvider.matchTasks({ workType, text, approvedTasks, approvedSynonyms })`.

Voice may fill the work description. Matching still returns at most three approved tasks. The user must Confirm.

## Page extraction

`AiProvider.extractPageFields` remains for closeout and any remaining page-scoped voice. `/api/ai/extract-page-fields` rebuilds the schema from `stepKey`.

## Forbidden

Invent tasks, icons, Direct Controls, OSHA rules, or PPE. Confirm a task. Approve a control strategy. Call Alternative Controls Direct Controls. Make a legal classification. Declare work safe. Replace the EIC or qualified-person judgment. Change confirmed values without the user. Remove stop-work. Score employees. Auto-advance the JRB.

## Persistence

`conversation_sessions` stores transcript, provider, and `audioDiscarded`. `conversation_facts` stores extracted values with origin, confidence, source segment, catalog id, and `displayOnJrb`. `briefing_assessments` stores OSHA subject mapping and follow-ups. `ai_recommendations` still stores task-match input. Page and briefing extracts are audit-logged.
