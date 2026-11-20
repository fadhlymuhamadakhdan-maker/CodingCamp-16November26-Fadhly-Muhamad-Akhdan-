# Requirements Document

## Introduction

A personal dashboard delivered as a single-page web application (new-tab / browser-extension style). It runs entirely in the browser with no backend or build tools: one HTML file, one CSS file in `css/`, and one JavaScript file in `js/`. All user data is stored in browser LocalStorage. The dashboard provides a time-based greeting, a configurable Pomodoro focus timer, a persistent to-do list, and a quick-links launcher. It supports light/dark mode and a customisable user name.

## Glossary

- **Dashboard**: The single HTML page that hosts all widgets.
- **Greeting_Widget**: The section of the Dashboard that displays the current time, date, and a personalised greeting.
- **Timer_Widget**: The Pomodoro countdown timer section of the Dashboard.
- **Todo_Widget**: The to-do list section of the Dashboard.
- **Links_Widget**: The quick-links section of the Dashboard.
- **Settings_Panel**: The UI panel that exposes user-configurable preferences (name, timer duration, theme).
- **LocalStorage**: The browser's `window.localStorage` API used for all client-side data persistence.
- **Task**: A single to-do item consisting of a text description and a completion state.
- **Link**: A quick-link entry consisting of a label and a URL.
- **Session_Duration**: The configurable length of a Pomodoro focus interval, expressed in whole minutes.
- **Theme**: The colour scheme of the Dashboard, either `light` or `dark`.

---

## Requirements

### Requirement 1: Time and Date Greeting

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open a new tab, so that I am immediately oriented and feel welcomed.

#### Acceptance Criteria

1. WHEN the local wall-clock minute changes, THE Greeting_Widget SHALL update the displayed time to the current local time in HH:MM (24-hour) format.
2. THE Greeting_Widget SHALL display the current local date in the format "Weekday, DD Month YYYY" (e.g. "Monday, 20 November 2026").
3. WHEN the local hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting prefix "Good morning".
4. WHEN the local hour is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting prefix "Good afternoon".
5. WHEN the local hour is between 18:00 and 20:59, THE Greeting_Widget SHALL display the greeting prefix "Good evening".
6. WHEN the local hour is between 21:00 and 23:59 or between 00:00 and 04:59, THE Greeting_Widget SHALL display the greeting prefix "Good night".

---

### Requirement 2: Custom Name in Greeting

**User Story:** As a user, I want to set my name so that the greeting is personalised to me.

#### Acceptance Criteria

1. THE Settings_Panel SHALL provide a text input for the user's name accepting between 1 and 50 characters.
2. WHEN the user submits a name between 1 and 50 characters in length, THE Dashboard SHALL persist the name to LocalStorage under the key `userName`.
3. IF the user submits a name exceeding 50 characters, THEN THE Settings_Panel SHALL reject the input and display an error indicating the name must be 50 characters or fewer, without writing to LocalStorage.
4. WHEN a `userName` value exists in LocalStorage, THE Greeting_Widget SHALL display the greeting prefix followed by a comma, a space, and the stored name (e.g. "Good morning, Alex").
5. WHEN no `userName` value exists in LocalStorage, THE Greeting_Widget SHALL display the greeting prefix without a name suffix.
6. WHEN the user clears the name field and saves, THE Dashboard SHALL remove the `userName` key from LocalStorage.

---

### Requirement 3: Focus Timer (Pomodoro)

**User Story:** As a user, I want a countdown timer I can start, stop, and reset, so that I can track focused work intervals.

#### Acceptance Criteria

1. THE Timer_Widget SHALL display a countdown in MM:SS format initialised to the current Session_Duration, where Session_Duration is a whole number of minutes between 1 and 120 inclusive.
2. WHEN the user activates the start control, THE Timer_Widget SHALL begin counting down at one-second intervals, decrementing the displayed time by exactly one second per interval.
3. WHEN the timer is running and the user activates the stop control, THE Timer_Widget SHALL pause the countdown and preserve the remaining time accurate to the nearest second.
4. WHEN the user activates the reset control, THE Timer_Widget SHALL stop the countdown and reset the display to the full Session_Duration within 200 milliseconds.
5. WHEN the countdown reaches 00:00, THE Timer_Widget SHALL stop counting and play an audible alert tone lasting between 1 and 3 seconds at a volume audible at the device's current output level.
6. WHILE the timer is running, THE Timer_Widget SHALL disable the start control and enable the stop control so that only one of the two controls is interactive at any time.
7. WHILE the timer is stopped or paused, THE Timer_Widget SHALL enable the start control and disable the stop control so that only one of the two controls is interactive at any time.
8. IF the user activates the start control when the displayed time is 00:00, THEN THE Timer_Widget SHALL take no action and keep the start control disabled.

---

### Requirement 4: Configurable Pomodoro Duration

**User Story:** As a user, I want to change the focus timer duration, so that I can adapt it to my preferred work interval length.

#### Acceptance Criteria

1. THE Settings_Panel SHALL provide a numeric input for Session_Duration, accepting whole-number values between 1 and 120 (inclusive).
2. WHEN the user saves a valid Session_Duration, THE Dashboard SHALL persist the value to LocalStorage under the key `sessionDuration`.
3. IF a `sessionDuration` value exists in LocalStorage on page load, THEN THE Timer_Widget SHALL initialise to that stored value.
4. IF no `sessionDuration` value exists in LocalStorage on page load, THEN THE Timer_Widget SHALL initialise to a default Session_Duration of 25 minutes.
5. IF the user enters a Session_Duration outside the range 1–120, THEN THE Settings_Panel SHALL display an inline validation error indicating the valid range (1–120) and SHALL NOT persist the value.
6. WHILE the timer is in a stopped state (neither running nor paused), WHEN a new Session_Duration is saved, THE Timer_Widget SHALL reset to the new Session_Duration within 100 milliseconds.
7. WHILE the timer is in a running or paused state, WHEN a new Session_Duration is saved, THE Timer_Widget SHALL apply the new Session_Duration at the start of the next session and SHALL NOT alter the current countdown.

---

### Requirement 5: To-Do List

**User Story:** As a user, I want to add, edit, complete, and delete tasks, so that I can track what I need to do during my session.

#### Acceptance Criteria

1. WHEN the application loads, THE Todo_Widget SHALL read the task list from LocalStorage under the key `tasks` and display all stored Tasks; IF the key is absent or empty, THEN THE Todo_Widget SHALL display an empty task list with no Tasks shown.
2. WHEN the user submits a non-empty task description of 1–200 characters, THE Todo_Widget SHALL add a new Task with completion state `false` and persist the updated task list to LocalStorage.
3. IF the user submits an empty task description, THEN THE Todo_Widget SHALL not add a Task and SHALL display an inline prompt indicating that task text is required.
4. WHEN the user activates the complete toggle on a Task, THE Todo_Widget SHALL update that Task's completion state and persist the updated task list to LocalStorage.
5. WHEN the user activates the delete control on a Task, THE Todo_Widget SHALL remove that Task and persist the updated task list to LocalStorage.
6. WHEN the user activates the edit control on a Task, THE Todo_Widget SHALL present an inline editable field pre-filled with the current task description and SHALL exit edit mode on any other Task that is currently being edited.
7. WHEN the user saves an edited Task with a non-empty description of 1–200 characters, THE Todo_Widget SHALL update that Task's description and persist the updated task list to LocalStorage.
8. IF the user saves an edited Task with an empty description, THEN THE Todo_Widget SHALL retain the original description and exit edit mode.
9. THE Todo_Widget SHALL render completed Tasks with strikethrough styling on the task description text to distinguish them from incomplete Tasks.

---

### Requirement 6: Quick Links

**User Story:** As a user, I want to save and launch favourite websites with a single click, so that I can navigate quickly without typing URLs.

#### Acceptance Criteria

1. THE Links_Widget SHALL display all Links currently stored in LocalStorage under the key `quickLinks`, showing each Link's label as the clickable button text.
2. WHEN the user submits a new Link with a non-empty label (1–50 characters) and a valid URL (1–2048 characters), THE Links_Widget SHALL add the Link to the displayed list and persist the updated link list to LocalStorage.
3. IF the user submits a new Link with an empty label or an empty URL, THEN THE Links_Widget SHALL display an inline validation message adjacent to the invalid field and SHALL NOT add the Link.
4. IF the user submits a URL that does not begin with `http://` or `https://`, THEN THE Links_Widget SHALL prepend `https://` to the URL before saving and displaying the Link.
5. WHEN the user activates a Link button, THE Dashboard SHALL open the associated URL in a new browser tab without navigating away from the Dashboard.
6. WHEN the user activates the delete control on a Link, THE Links_Widget SHALL remove the Link from the displayed list and persist the updated link list to LocalStorage.
7. IF LocalStorage is unavailable or write fails when persisting the link list, THEN THE Links_Widget SHALL display an error message indicating the save failed and SHALL NOT remove the Link from the displayed list.
8. THE Links_Widget SHALL support storing a maximum of 20 Links under the `quickLinks` key.
9. IF the user attempts to add a Link when 20 Links are already stored, THEN THE Links_Widget SHALL display an inline message indicating the maximum number of Links has been reached and SHALL NOT add the Link.

---

### Requirement 7: Light / Dark Mode Toggle

**User Story:** As a user, I want to switch between a light and dark colour scheme, so that the dashboard is comfortable to view in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control that switches the Theme between `light` and `dark`, and SHALL display the toggle in a state that reflects the currently active Theme.
2. WHEN the user activates the theme toggle, THE Dashboard SHALL apply the selected Theme to all visible elements within 100 milliseconds without a page reload.
3. WHEN the user activates the theme toggle, THE Dashboard SHALL persist the selected Theme to LocalStorage under the key `theme`.
4. IF a `theme` value of `light` or `dark` exists in LocalStorage on page load, THEN THE Dashboard SHALL apply that Theme before the first render.
5. IF no `theme` value exists in LocalStorage on page load, THEN THE Dashboard SHALL apply the `light` Theme as the default.
6. IF the value stored in LocalStorage under the key `theme` is not `light` or `dark` on page load, THEN THE Dashboard SHALL apply the `light` Theme as the default.

---

### Requirement 8: Data Persistence and Page Load

**User Story:** As a user, I want my preferences and data to be restored each time I open the dashboard, so that I do not have to re-enter information after closing the tab.

#### Acceptance Criteria

1. WHEN the Dashboard page loads, THE Dashboard SHALL read all persisted values from LocalStorage before rendering any widget.
2. THE Dashboard SHALL persist Task data as a JSON-serialised array under the key `tasks` in LocalStorage.
3. THE Dashboard SHALL persist Link data as a JSON-serialised array under the key `quickLinks` in LocalStorage.
4. IF LocalStorage is unavailable or throws an error on read, THEN THE Dashboard SHALL render all widgets with default empty states and SHALL display a non-blocking warning message to the user.
5. FOR ALL JSON-serialised values written to LocalStorage, parsing the stored string SHALL produce a value semantically equivalent to the original object (round-trip property).
6. IF the value stored under the `tasks` or `quickLinks` key in LocalStorage is not valid JSON or does not parse to an array, THEN THE Dashboard SHALL treat that key as absent, render the corresponding widget with an empty array as its default state, and display a non-blocking warning message to the user.
7. WHEN the Dashboard writes a persisted value to LocalStorage and LocalStorage throws an error on write, THE Dashboard SHALL retain the last successfully persisted state for that key and display a non-blocking warning message to the user indicating that the latest change could not be saved.

---

### Requirement 9: Responsive Layout and Performance

**User Story:** As a user, I want the dashboard to load instantly and display correctly on any screen size, so that it is usable on both desktop and laptop screens.

#### Acceptance Criteria

1. THE Dashboard SHALL load and render all widgets within 1 second of the initial page load completing, as measured in the latest stable release of Chrome, Firefox, and Edge on a desktop operating system, with no additional network requests issued after the initial page load.
2. THE Dashboard SHALL adapt its layout so that at any viewport width between 320 px and 2560 px, no widget's content is clipped, overflows its container, or requires horizontal scrolling to access its controls.
3. THE Dashboard SHALL be delivered as a single CSS file and a single JavaScript file, with no external stylesheets, scripts, or fonts fetched at runtime.
4. THE Dashboard SHALL require no server-side processing, build tools, or external runtime dependencies to display or operate correctly.
