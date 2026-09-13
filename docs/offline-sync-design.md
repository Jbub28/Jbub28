# Offline sync design

The field client is a Progressive Web App.

## What works offline

- Open an existing local draft
- Create a new local draft (temp id `local:...`)
- Edit all briefing fields after they are on the device
- Edit a transcript that was already produced
- Typed work description (always)
- Stop Work and Rebrief intents (queued)

## What needs connectivity

- Live Azure/browser cloud transcription (typed fallback remains)
- Evidence upload (queued)
- Release for Work, acknowledgements that must be official, supervisor review
- Publishing libraries

The UI never shows Submitted, Acknowledged, Approved, or Released for Work unless the server has the required synchronized records.

## Status words

Online, Offline, Saved on Device, Waiting to Sync, Synchronized, Sync Error.

## Queue

IndexedDB tables: `drafts`, `outbox`, `conflicts`.

Outbox items: `{ id, jrbId, version, op, payload, updatedAt, baseRevision }`.

Retry with exponential backoff when `online`.

## Conflicts

If `baseRevision !== serverRevision`, show Conflict: keep device values, keep server values, or merge field-by-field. Safety events (Stop Work) always apply; they do not lose to a stale draft.

## Data loss protection

Autosave to IndexedDB every successful field blur and every 5 seconds while dirty. Unload handler flushes. Service worker caches the app shell.
