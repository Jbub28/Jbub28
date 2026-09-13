# Accessibility

Target: WCAG 2.2 AA for the field wizard and admin screens.

## Design rules used in the UI

- Text default 1.25rem; headings 1.75rem+
- Touch targets minimum 56×56 CSS pixels
- Visible focus ring (`:focus-visible`) on all controls
- Labels are visible text; icons always paired with words
- Status uses text + icon, never color alone
- Error summary at the top of a step, linked to fields
- `aria-live` for recording state, save state, and sync state
- Headings sequential (h1 page title, h2 sections)
- Keyboard: Tab order follows Back → fields → Next; Stop Work and Rebrief are reachable
- Reduced-motion: disable non-essential animation
- Contrast: near-black background, white text, yellow action, AAA-oriented large text
- Language: `lang="en"`
- Forms: `autocomplete` where appropriate; `aria-invalid` and `aria-describedby` on errors
- Dialogs (Stop Work, Rebrief): focus trap, Escape closes only the confirm layer not the JRB
- Drag-and-drop job-step reorder has Move up / Move down buttons

## Testing

- Unit: accessible names on primary components
- Playwright + `@axe-core/playwright` on sign-in, start brief, high energy, controls, ready
- Manual: keyboard-only pass of the happy path

Viewport `user-scalable` is allowed (unlike the previous app) so users can pinch-zoom.
