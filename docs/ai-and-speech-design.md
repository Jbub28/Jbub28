# AI and speech design

AI is a recommendation assistant. Every result is labeled **Suggested for Crew Review** with Accept, Edit, Reject, or Select Another.

## Speech

Interface: `SpeechProvider.transcribe(input)`.

| Provider | Use |
|----------|-----|
| `mock` | Returns fixture or echo text for local/dev/tests |
| `browser` | Web Speech API in the client; server stores the posted transcript |
| `azure` | Azure AI Speech adapter (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`) |

Workflow: request microphone permission → show recording → stop → transcript → user edits → Use This Description / Record Again / Type Instead.

Store original transcript separately from edited description, plus transcription status and provider. Raw audio is discarded unless `AUDIO_RETENTION_ENABLED=true`.

Offline: typed entry remains available. If transcription needs connectivity, the UI says so.

Never auto-submit AI-derived records. Never discard typed/recorded work without warning.

## Task matching

Interface: `AiProvider.matchTasks({ workType, text, approvedTasks, approvedSynonyms })`.

Local matcher:

- Restrict to selected work type and **active** tasks
- Score exact task name, activity name, approved synonyms, work-method tokens
- Return at most three suggestions with Strong Match / Possible Match / More Information Needed
- Never invent a task name
- Pole work: Distribution vs Transmission exact tasks as specified
- Ambiguous “pole” without a verb → one follow-up question from the approved list

Azure OpenAI adapter, when enabled, may only rank IDs from the approved list. If the model returns an unknown name, it is dropped and logged as an error.

## Other AI uses

Incomplete-field hints, plain-language summary from **confirmed** JRB data, rebrief suggestion when configured change flags are set, unmatched-term routing to admin review.

## Forbidden

Invent tasks, icons, Direct Controls, OSHA rules, or PPE. Confirm a task. Approve a control strategy. Call Alternative Controls Direct Controls. Make a legal classification. Declare work safe. Replace the EIC or qualified-person judgment. Change confirmed values without the user. Remove stop-work. Score employees.

## Persistence

`ai_recommendations` stores input, original transcript, suggestion, model/provider, confidence, controlled records considered, user decision, confirmed result, timestamp, error status.
