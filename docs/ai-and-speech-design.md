# AI and speech design

AI is a recommendation assistant. Every result is labeled **Suggested for Crew Review** with Accept, Edit, Reject, or Select Another.

## Conversational page voice

Each applicable JRB step has **one Talk button**. The worker describes the page in natural language. The app transcribes, extracts structured values for **fields on the current step only**, and prefills empty fields. Typed values are never silently overwritten. Voice never advances the wizard.

Flow:

1. Talk → **Listening...**
2. Live / completed transcript on the page
3. Speech ends → page-field extraction
4. Prefill + brief highlight (“Filled from talk”)
5. Worker edits anything; safety confirmations stay manual

Components:

| Piece | Role |
|-------|------|
| `PageVoiceAssistant` | One Talk control, transcript, highlights, suggestion chips |
| Browser Web Speech API | Client transcription (`useSpeechToText`) |
| `SpeechProvider` | Server mock/Azure transcribe adapter |
| `extractPageFields` / `AiProvider.extractPageFields` | Structured extraction against the current page schema |
| `applyVoicePrefill` | Merge without overwrite; drop `never` actions |

Low confidence: the value is left blank (or offered as **Suggested for Crew Review**). The app does not invent details.

### Voice must not

Acknowledge, certify a control, select Ready for Work, sign for someone, submit/release a JRB, close Stop Work, attest Direct Controls are adequate, auto-confirm a High Energy presence, auto-confirm a task, or auto-confirm work classification. Those require an explicit tap on the existing control.

If the worker names a checkbox, PPE item, or High Energy that exists on this page, the app may prefill or suggest it. Suggestion chips still need a tap.

## Speech providers

Interface: `SpeechProvider.transcribe(input)`.

| Provider | Use |
|----------|-----|
| `mock` | Echo/fixture text for server tests |
| `browser` | Web Speech API in the client (field Talk) |
| `azure` | Azure AI Speech adapter (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`) |

Store original transcript per step (`voiceTranscripts`) plus work-description original/edited. Raw audio is discarded unless `AUDIO_RETENTION_ENABLED=true`.

Offline: typed entry remains. Extraction can run locally. If the microphone needs a connection, the UI says so.

## Task matching

Interface: `AiProvider.matchTasks({ workType, text, approvedTasks, approvedSynonyms })`.

Voice may fill the work description. Matching still runs only after **Use This Description**. The user must Confirm a task.

## Page extraction

Interface: `AiProvider.extractPageFields({ transcript, schema })`.

Local/mock: deterministic extractor (`local-page-extractor`). Azure OpenAI, when configured, can replace the extractor body without changing the wizard. `/api/ai/extract-page-fields` rebuilds the schema from `stepKey` (it does not trust a client-supplied schema).

## Forbidden

Invent tasks, icons, Direct Controls, OSHA rules, or PPE. Confirm a task. Approve a control strategy. Call Alternative Controls Direct Controls. Make a legal classification. Declare work safe. Replace the EIC or qualified-person judgment. Change confirmed values without the user. Remove stop-work. Score employees. Auto-advance the JRB.

## Persistence

`ai_recommendations` stores task-match input, original transcript, suggestion, model/provider, confidence, controlled records considered, user decision, confirmed result, timestamp, error status. Page extracts are audit-logged as `voice_page_extract`.
