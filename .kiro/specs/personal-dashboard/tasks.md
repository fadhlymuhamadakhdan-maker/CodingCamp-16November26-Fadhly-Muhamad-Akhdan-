# Implementation Plan: Personal Dashboard

## Overview

Build the personal dashboard as three files (`index.html`, `css/style.css`, `js/app.js`) with no build tools or external dependencies. The implementation proceeds module-by-module — utilities first, then the Store and EventBus, then each widget, then Settings and ThemeManager — wiring everything together in the final step. Property-based tests use fast-check; unit tests use Vitest.

## Tasks

- [x] 1. Set up project structure and test scaffolding
  - Create `index.html` with semantic sections: `#greeting`, `#timer`, `#todo`, `#links`, `#settings`
  - Create `css/style.css` with CSS custom properties for the light theme palette and a `[data-theme='dark']` block for the dark palette; include a responsive grid layout and strikethrough style for completed tasks
  - Create `js/app.js` as an empty module scaffold with clearly marked sections for each component
  - Add `package.json` with `vitest` and `fast-check` as dev dependencies and a `test` script
  - Create `tests/` directory with an empty `utils.test.js`, `store.test.js`, `widgets.test.js`
  - _Requirements: 9.3, 9.4_

- [ ] 2. Implement Utils
  - [x] 2.1 Implement `Utils.formatTime`, `Utils.formatDate`, `Utils.greetingPrefix`, `Utils.formatCountdown`, `Utils.normalizeURL`, `Utils.isValidURL` in `js/app.js`
    - `formatTime(date)` → `"HH:MM"` (24-hour, zero-padded)
    - `formatDate(date)` → `"Weekday, DD Month YYYY"`
    - `greetingPrefix(hour)` → one of four strings based on hour ranges [0–4]→night, [5–11]→morning, [12–17]→afternoon, [18–20]→evening, [21–23]→night
    - `formatCountdown(seconds)` → `"MM:SS"` (zero-padded both parts)
    - `normalizeURL(raw)` → prepends `https://` if no `http://` or `https://` prefix
    - `isValidURL(raw)` → returns false if URL exceeds 2048 characters after normalization
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 3.1, 6.4_

  - [ ] 2.2 Write property test for `greetingPrefix` (Property 1)
    - **Property 1: Greeting prefix covers all 24 hours without gaps or overlaps**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
    - Use `fc.integer({ min: 0, max: 23 })` to generate hours; assert result is one of the four valid strings

  - [ ] 2.3 Write property test for `formatCountdown` (Property 7)
    - **Property 7: Countdown display format is always MM:SS**
    - **Validates: Requirements 3.1**
    - Use `fc.integer({ min: 0, max: 7200 })`; assert result matches `/^\d{2}:\d{2}$/`

  - [ ] 2.4 Write property test for `normalizeURL` idempotency (Property 4)
    - **Property 4: URL normalization is idempotent**
    - **Validates: Requirements 6.4**
    - Use `fc.string()`; assert `normalizeURL(normalizeURL(s)) === normalizeURL(s)`

  - [ ] 2.5 Write unit tests for Utils
    - `greetingPrefix`: one test per boundary hour (0, 5, 12, 18, 21, 23)
    - `formatTime`: midnight (00:00), noon (12:00), 09:05
    - `formatDate`: a fixed known date
    - `formatCountdown`: 0 s → "00:00", 7200 s → "120:00", 65 s → "01:05"
    - `normalizeURL`: already `https://`, already `http://`, no scheme, `ftp://` scheme
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 6.4_

- [ ] 3. Implement Store and EventBus
  - [ ] 3.1 Implement `EventBus` with `on`, `off`, and `emit` in `js/app.js`
    - Use a plain `Map<string, Set<Function>>` internally
    - _Requirements: 8.1_

  - [ ] 3.2 Implement `Store` with `get`, `set`, `remove`, and `loadAll` in `js/app.js`
    - `get` / `set` / `remove` wrap `localStorage` calls in try/catch; `set` returns `{ ok, error? }`
    - `loadAll` reads all five keys, validates each, falls back to defaults, emits `storageWarning` on any error
    - Parse `tasks` and `quickLinks` with `JSON.parse`; on failure return `[]` and emit `storageWarning`
    - Validate `sessionDuration` is in [1, 120]; default to 25 on failure
    - Validate `theme` is `"light"` or `"dark"`; default to `"light"` on failure
    - _Requirements: 4.3, 4.4, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_

  - [ ] 3.3 Write unit tests for Store
    - Mock `localStorage` with a stub object
    - Test `get`/`set`/`remove` happy paths
    - Test `set` failure (simulate `DOMException`): returns `{ ok: false }`, emits `storageWarning`
    - Test `loadAll` with malformed JSON for `tasks`: returns `[]`, emits `storageWarning`
    - Test `loadAll` with invalid `theme` value: returns `"light"`
    - Test `loadAll` with `sessionDuration` = `"0"`: returns 25
    - _Requirements: 8.4, 8.6, 8.7_

- [ ] 4. Checkpoint — Ensure Store, EventBus, and Utils tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement GreetingWidget
  - [ ] 5.1 Implement `GreetingWidget.init`, `startClock`, and `render` in `js/app.js`
    - `init` stores `userName` reference and calls `render` once
    - `startClock` sets a 1-second `setInterval`; `render` is called only when the minute value changes
    - `render` calls `Utils.formatTime`, `Utils.formatDate`, `Utils.greetingPrefix`; appends `, {name}` when `userName` is non-null
    - Subscribe to `userNameChanged` event: update stored name and call `render`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.4, 2.5_

  - [ ] 5.2 Write unit tests for GreetingWidget rendering
    - Render with `userName = null`: verify no name suffix
    - Render with `userName = "Alex"`: verify ", Alex" suffix
    - Render at hour 5 (morning), 12 (afternoon), 18 (evening), 21 (night)
    - _Requirements: 2.4, 2.5_

- [ ] 6. Implement TimerWidget
  - [x] 6.1 Implement `TimerWidget.init`, `start`, `stop`, `reset`, `render`, and `playAlert` in `js/app.js`
    - Internal state: `remainingSeconds`, `isRunning`, `isPaused`, `intervalId`, `pendingDuration`
    - `start`: no-op when `remainingSeconds === 0`; sets `setInterval` decrementing by 1 s; calls `render` each tick; on 00:00 stops and calls `playAlert`
    - `stop`: clears interval, sets `isRunning = false`, `isPaused = true`, calls `render`
    - `reset`: clears interval, resets `remainingSeconds` to `sessionDuration`, calls `render` within 200 ms
    - `playAlert`: Web Audio API oscillator, 1–3 s duration
    - `render`: updates MM:SS display; disables start/enables stop while running; enables start/disables stop otherwise
    - Subscribe to `sessionDurationChanged`: if stopped → reset immediately; if running/paused → store as `pendingDuration`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.3, 4.4, 4.6, 4.7_

  - [ ] 6.2 Write unit tests for TimerWidget
    - Use `vi.useFakeTimers()`
    - Start → tick 1 s → verify `remainingSeconds` decremented
    - Stop → verify interval cleared and time preserved
    - Reset → verify display returns to `sessionDuration` within 200 ms
    - Start when `remainingSeconds === 0`: verify no-op
    - Countdown reaches 00:00: verify `playAlert` called (spy)
    - `sessionDurationChanged` while stopped: verify immediate reset
    - `sessionDurationChanged` while running: verify `remainingSeconds` unchanged, `pendingDuration` stored
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.6, 4.7_

- [ ] 7. Implement TodoWidget
  - [ ] 7.1 Implement `TodoWidget.init`, `addTask`, `toggleTask`, `deleteTask`, `startEdit`, `saveEdit`, and `render` in `js/app.js`
    - IDs via `crypto.randomUUID()`
    - `addTask`: trim description; reject if empty or > 200 chars; push task with `completed: false`; persist via `Store.set`; call `render`
    - `toggleTask`: flip `completed` for matching ID; persist; call `render`
    - `deleteTask`: remove matching ID; persist; call `render`
    - `startEdit`: set `editingId`; exit any other open edit; call `render`
    - `saveEdit`: if description is empty or whitespace, retain original and exit edit mode; otherwise update and persist
    - `render`: build task list DOM; apply strikethrough to completed tasks; show inline error for empty-add attempt
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ] 7.2 Write property test for empty-task rejection (Property 5)
    - **Property 5: Empty-task rejection preserves list length**
    - **Validates: Requirements 5.3**
    - Use `fc.array(validTask())` and `fc.string().filter(s => s.trim() === '')`

  - [ ] 7.3 Write property test for task addition (Property 6)
    - **Property 6: Task addition grows the list by exactly one**
    - **Validates: Requirements 5.2**
    - Use `fc.array(validTask())` and `fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)`

  - [ ] 7.4 Write property test for Task JSON round-trip (Property 2)
    - **Property 2: LocalStorage JSON round-trip preserves task array**
    - **Validates: Requirements 8.2, 8.5**
    - Use `fc.array(fc.record({ id: fc.uuid(), description: fc.string({ minLength: 1, maxLength: 200 }), completed: fc.boolean() }))`

  - [ ] 7.5 Write unit tests for TodoWidget
    - Add task at 200 chars (valid), 201 chars (invalid)
    - Add empty task: list unchanged, inline error shown
    - Edit with empty string: retains original description
    - Toggle: flips `completed` state
    - Delete: removes task from list
    - Only one task in edit mode at a time
    - _Requirements: 5.2, 5.3, 5.6, 5.7, 5.8_

- [ ] 8. Implement LinksWidget
  - [ ] 8.1 Implement `LinksWidget.init`, `addLink`, `deleteLink`, and `render` in `js/app.js`
    - `addLink`: validate label (1–50 chars) and URL (non-empty); normalize URL via `Utils.normalizeURL`; validate with `Utils.isValidURL`; reject if list already has 20 entries; push link; persist via `Store.set`; on `Store.set` failure, display error and do NOT remove from displayed list; call `render`
    - `deleteLink`: remove matching ID; persist; call `render`
    - `render`: build link button list; each button opens URL in new tab via `window.open(url, '_blank')`
    - Show inline error per field for empty label/URL; show capacity error at 20 links
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ] 8.2 Write property test for link addition (Property 8)
    - **Property 8: Link addition grows the list by exactly one (up to the maximum)**
    - **Validates: Requirements 6.2, 6.8**
    - Use `fc.array(validLink(), { maxLength: 19 })` and `validLabelAndURL()`

  - [ ] 8.3 Write property test for max-link enforcement (Property 9)
    - **Property 9: Maximum-link enforcement prevents overflow**
    - **Validates: Requirements 6.8, 6.9**
    - Use `fc.array(validLink(), { minLength: 20, maxLength: 20 })` and `validLabelAndURL()`

  - [ ] 8.4 Write property test for Link JSON round-trip (Property 3)
    - **Property 3: LocalStorage JSON round-trip preserves link array**
    - **Validates: Requirements 8.3, 8.5**
    - Use `fc.array(fc.record({ id: fc.uuid(), label: fc.string({ minLength: 1, maxLength: 50 }), url: fc.webUrl() }))`

  - [ ] 8.5 Write unit tests for LinksWidget
    - Add 20th link: succeeds
    - Add 21st link: rejected with inline message
    - Delete link: removed from list
    - Add with empty label: inline error, link not added
    - Add with empty URL: inline error, link not added
    - URL without scheme: `https://` prepended before save
    - `Store.set` failure: error shown, link remains in display
    - _Requirements: 6.2, 6.3, 6.4, 6.6, 6.7, 6.8, 6.9_

- [ ] 9. Implement SettingsPanel and ThemeManager
  - [ ] 9.1 Implement `ThemeManager.apply` in `js/app.js`
    - Set `document.documentElement.dataset.theme` to `'light'` or `'dark'`
    - If value is neither, default to `'light'`
    - _Requirements: 7.2, 7.4, 7.5, 7.6_

  - [ ] 9.2 Implement `SettingsPanel.init`, `saveName`, `saveDuration`, `toggleTheme`, `showError`, and `clearError` in `js/app.js`
    - `saveName`: trim input; if length > 50 call `showError`; if empty call `Store.remove('userName')` and emit `userNameChanged(null)`; otherwise `Store.set` and emit `userNameChanged`
    - `saveDuration`: parse as integer; if outside [1, 120] call `showError` with range message; otherwise `Store.set` and emit `sessionDurationChanged`
    - `toggleTheme`: flip current theme; `Store.set`; `ThemeManager.apply`; emit `themeChanged`
    - `showError` / `clearError`: insert/remove inline error element adjacent to named field
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 4.1, 4.2, 4.5, 7.1, 7.2, 7.3_

  - [ ] 9.3 Write unit tests for SettingsPanel validators
    - Name at 50 chars: valid, persisted
    - Name at 51 chars: invalid, error shown, not persisted
    - Name empty: `userName` key removed
    - Duration = 1: valid
    - Duration = 120: valid
    - Duration = 0: invalid, error shown with range "1–120"
    - Duration = 121: invalid, error shown
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.5_

- [ ] 10. Checkpoint — Ensure all widget and settings tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Wire everything together in `js/app.js` and complete `index.html`
  - [ ] 11.1 Write the `DOMContentLoaded` initialization sequence
    - Call `Store.loadAll()` to get `AppState`
    - Call `ThemeManager.apply(state.theme)` before any widget init
    - Call `GreetingWidget.init(state)`, `TimerWidget.init(state.sessionDuration)`, `TodoWidget.init(state.tasks)`, `LinksWidget.init(state.quickLinks)`, `SettingsPanel.init(state)`
    - Subscribe all widgets to their respective `Bus` events
    - Call `GreetingWidget.startClock()`
    - Subscribe to `storageWarning`: display a non-blocking banner at the top of the page
    - _Requirements: 7.4, 8.1, 9.1_

  - [ ] 11.2 Complete `index.html` markup
    - Add `<link rel="stylesheet" href="css/style.css">` and `<script src="js/app.js" defer></script>` — no other external resources
    - Structure `#greeting`, `#timer`, `#todo`, `#links`, `#settings` sections with all required controls (start/stop/reset buttons, task input, link form, name input, duration input, theme toggle)
    - _Requirements: 9.3, 9.4_

  - [ ] 11.3 Implement responsive CSS in `css/style.css`
    - CSS Grid or Flexbox layout; at viewport widths 320 px–2560 px no widget overflows or requires horizontal scrolling
    - Media queries to collapse to single-column on narrow viewports
    - Theme variables applied via `[data-theme='dark']` selector on `:root`
    - _Requirements: 7.2, 9.2_

  - [ ] 11.4 Write integration smoke tests
    - Verify `Store.loadAll()` → `ThemeManager.apply` sets `data-theme` attribute within 100 ms
    - Verify settings save persists correct key/value pairs to `localStorage`
    - Verify timer start → fake-clock to 00:00 → `playAlert` spy is called
    - Verify page renders all four widget sections in DOM
    - _Requirements: 7.2, 8.1, 9.1_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breaks
- Property tests (Properties 1–9) validate universal correctness properties using fast-check with a minimum of 100 iterations each
- Unit tests validate specific examples and edge cases
- No build tool is required; Vitest runs in Node against the pure-function exports; DOM tests use `jsdom`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3"] },
    { "id": 5, "tasks": ["4"] },
    { "id": 6, "tasks": ["5.1", "6.1", "7.1", "8.1", "9.1"] },
    { "id": 7, "tasks": ["5.2", "6.2", "7.2", "7.3", "7.4", "7.5", "8.2", "8.3", "8.4", "8.5", "9.2"] },
    { "id": 8, "tasks": ["9.3"] },
    { "id": 9, "tasks": ["10"] },
    { "id": 10, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 11, "tasks": ["11.4"] },
    { "id": 12, "tasks": ["12"] }
  ]
}
```
