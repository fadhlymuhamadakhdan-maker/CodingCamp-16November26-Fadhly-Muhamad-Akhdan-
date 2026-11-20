/**
 * js/app.js — Personal Dashboard
 *
 * All application logic lives in this single file.
 * Sections are clearly delimited so each component is easy to locate.
 *
 * Delivery contract:
 *   - No external imports at runtime (no CDN, no npm bundles served).
 *   - Pure functions in Utils are exported (via `export`) so Vitest can
 *     import them directly in a Node/jsdom environment.
 *   - Everything else runs on DOMContentLoaded.
 */

'use strict';

/* ============================================================
   SECTION 1 — Utils
   Pure helper functions; no side effects, no DOM access.
   ============================================================ */

/**
 * Format a Date as "HH:MM" in 24-hour, zero-padded form.
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Format a Date as "Weekday, DD Month YYYY"
 * e.g. "Monday, 20 November 2026"
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const weekday = weekdays[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const yyyy = date.getFullYear();
  return `${weekday}, ${dd} ${month} ${yyyy}`;
}

/**
 * Return a greeting prefix based on the hour of the day (0–23).
 *   [0–4]   → "Good night"
 *   [5–11]  → "Good morning"
 *   [12–17] → "Good afternoon"
 *   [18–20] → "Good evening"
 *   [21–23] → "Good night"
 * @param {number} hour  integer in [0, 23]
 * @returns {string}
 */
export function greetingPrefix(hour) {
  if (hour >= 5 && hour <= 11) return 'Good morning';
  if (hour >= 12 && hour <= 17) return 'Good afternoon';
  if (hour >= 18 && hour <= 20) return 'Good evening';
  return 'Good night'; // covers [0–4] and [21–23]
}

/**
 * Format a number of seconds as "MM:SS" (zero-padded).
 * Minutes are not capped — 7200 s → "120:00".
 * @param {number} seconds  integer >= 0
 * @returns {string}
 */
export function formatCountdown(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Prepend "https://" to a URL string if it has no http:// or https:// scheme.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeURL(raw) {
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw) || /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

/**
 * Return false if the URL exceeds 2048 characters after normalization,
 * true otherwise.
 * @param {string} raw
 * @returns {boolean}
 */
export function isValidURL(raw) {
  const normalized = normalizeURL(raw);
  return /^https?:\/\//i.test(normalized) && normalized.length <= 2048;
}

export const Utils = {
  formatTime,
  formatDate,
  greetingPrefix,
  formatCountdown,
  normalizeURL,
  isValidURL,
};

/* ============================================================
   SECTION 2 — EventBus
   Lightweight publish/subscribe bus used for all cross-component
   communication.
   ============================================================ */

export const EventBus = (() => {
  const handlers = new Map();

  return {
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
    },
    off(event, handler) {
      if (handlers.has(event)) handlers.get(event).delete(handler);
    },
    emit(event, payload) {
      if (!handlers.has(event)) return;
      handlers.get(event).forEach((handler) => handler(payload));
    },
  };
})();

/* ============================================================
   SECTION 3 — Store
   Wraps localStorage reads and writes. All errors are caught
   and surfaced via EventBus rather than thrown.
   ============================================================ */

export const Store = (() => {
  function get(key) {
    try {
      const storage = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
      return storage.getItem(key);
    } catch (_) {
      EventBus.emit('storageWarning', 'Local storage is unavailable. Changes cannot be saved.');
      return null;
    }
  }

  function set(key, value) {
    try {
      const storage = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
      storage.setItem(
        key,
        typeof value === 'string' ? value : JSON.stringify(value)
      );
      return { ok: true };
    } catch (_) {
      const message = 'The latest change could not be saved.';
      EventBus.emit('storageWarning', message);
      return { ok: false, error: message };
    }
  }

  function remove(key) {
    try {
      const storage = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
      storage.removeItem(key);
      return { ok: true };
    } catch (_) {
      const message = 'The latest change could not be saved.';
      EventBus.emit('storageWarning', message);
      return { ok: false, error: message };
    }
  }

  function loadAll() {
    const state = {
      userName: null,
      sessionDuration: 25,
      tasks: [],
      quickLinks: [],
      theme: 'light',
    };

    let readFailed = false;
    try {
      const userName = get('userName');
      if (userName !== null && userName.trim() !== '') state.userName = userName;

      const durationRaw = get('sessionDuration');
      if (durationRaw !== null) {
        const duration = Number(durationRaw);
        if (Number.isInteger(duration) && duration >= 1 && duration <= 120) {
          state.sessionDuration = duration;
        } else {
          state.sessionDuration = 25;
        }
      }

      const theme = get('theme');
      state.theme = theme === 'dark' || theme === 'light' ? theme : 'light';

      for (const [key, stateKey] of [['tasks', 'tasks'], ['quickLinks', 'quickLinks']]) {
        const raw = get(key);
        if (raw !== null) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) state[stateKey] = parsed;
            else EventBus.emit('storageWarning', `Saved ${key} data is invalid. An empty list was loaded.`);
          } catch (_) {
            EventBus.emit('storageWarning', `Saved ${key} data is invalid JSON. An empty list was loaded.`);
          }
        }
      }
    } catch (_) {
      readFailed = true;
    }

    if (readFailed) {
      EventBus.emit('storageWarning', 'Local storage is unavailable. Default settings were loaded.');
    }
    return state;
  }

  return { get, set, remove, loadAll };
})();

/* ============================================================
   SECTION 4 — ThemeManager
   Applies the active theme to the document root element.
   ============================================================ */

export const ThemeManager = {
  apply(theme) {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  },
};

/* ============================================================
   SECTION 5 — GreetingWidget
   Owns the #greeting DOM section.
   Updates on each minute boundary using a 1-second interval.
   ============================================================ */

export const GreetingWidget = (() => {
  let prefixEl, timeEl, dateEl, userName = null, clockId = null, lastMinute = null;

  function render(now = new Date()) {
    const prefix = greetingPrefix(now.getHours());
    prefixEl.textContent = userName ? `${prefix}, ${userName}` : prefix;
    timeEl.textContent = formatTime(now);
    dateEl.textContent = formatDate(now);
  }

  function init(state) {
    prefixEl = document.getElementById('greeting-prefix');
    timeEl = document.getElementById('greeting-time');
    dateEl = document.getElementById('greeting-date');
    userName = state && state.userName ? state.userName : null;
    render();
  }

  function startClock() {
    if (clockId) clearInterval(clockId);
    lastMinute = formatTime(new Date());
    clockId = setInterval(() => {
      const now = new Date();
      const minute = formatTime(now);
      if (minute !== lastMinute) {
        lastMinute = minute;
        render(now);
      }
    }, 1000);
  }

  EventBus.on('userNameChanged', (name) => {
    userName = name;
    render();
  });

  return { init, startClock, render };
})();

/* ============================================================
   SECTION 6 — TimerWidget
   Owns the #timer DOM section.
   Manages a Pomodoro countdown with start / stop / reset controls.
   ============================================================ */

export const TimerWidget = (() => {
  const CIRCUMFERENCE = 2 * Math.PI * 52;

  let totalSeconds     = 25 * 60;
  let remainingSeconds = 25 * 60;
  let intervalId       = null;
  let isRunning        = false;
  let isPaused         = false;
  let pendingDuration  = null;

  let displayEl, startBtn, stopBtn, resetBtn, progressEl;

  function init(sessionDuration) {
    displayEl  = document.getElementById('timer-display');
    startBtn   = document.getElementById('timer-start');
    stopBtn    = document.getElementById('timer-stop');
    resetBtn   = document.getElementById('timer-reset');
    progressEl = document.getElementById('timer-ring-progress');

    if (Number.isInteger(sessionDuration) && sessionDuration >= 1 && sessionDuration <= 120) {
      totalSeconds = sessionDuration * 60;
    }

    remainingSeconds = totalSeconds;
    render();

    startBtn.addEventListener('click', start);
    stopBtn.addEventListener('click',  stop);
    resetBtn.addEventListener('click', reset);

    // Listen for duration changes from SettingsPanel
    document.addEventListener('dashboard:durationChanged', (e) => {
      const mins = e.detail && e.detail.minutes;
      if (!mins || isNaN(mins)) return;
      if (!isRunning) {
        updateDuration(mins);
      } else {
        pendingDuration = mins;
      }
    });

    EventBus.on('sessionDurationChanged', (mins) => {
      if (!isRunning && !isPaused) {
        updateDuration(mins);
      } else {
        pendingDuration = mins;
      }
    });
  }

  function render() {
    displayEl.textContent = formatCountdown(remainingSeconds);

    // Update SVG progress ring
    const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    progressEl.style.strokeDasharray  = CIRCUMFERENCE;
    progressEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);

    // Sync button disabled states
    if (isRunning) {
      startBtn.disabled = true;
      stopBtn.disabled  = false;
    } else {
      startBtn.disabled = remainingSeconds === 0;
      stopBtn.disabled  = true;
    }
  }

  function start() {
    if (isRunning || remainingSeconds === 0) return;
    isRunning  = true;
    isPaused   = false;
    intervalId = setInterval(tick, 1000);
    render();
  }

  function tick() {
    remainingSeconds -= 1;
    render();
    if (remainingSeconds === 0) {
      clearInterval(intervalId);
      intervalId = null;
      isRunning  = false;
      isPaused   = false;
      render();
      playAlert();
      // Apply any pending duration change now that the session ended
      if (pendingDuration !== null) {
        updateDuration(pendingDuration);
        pendingDuration = null;
      }
    }
  }

  function stop() {
    if (!isRunning) return;
    clearInterval(intervalId);
    intervalId = null;
    isRunning  = false;
    isPaused   = true;
    render();
  }

  function reset() {
    clearInterval(intervalId);
    intervalId       = null;
    isRunning        = false;
    isPaused         = false;
    remainingSeconds = totalSeconds;
    render();
  }

  function updateDuration(minutes) {
    totalSeconds     = minutes * 60;
    remainingSeconds = totalSeconds;
    isRunning        = false;
    isPaused         = false;
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    render();
  }

  function playAlert() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type            = 'sine';
      osc.frequency.value = 440;
      gain.gain.value     = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
      osc.onended = () => ctx.close();
    } catch (_) { /* AudioContext not available */ }
  }

  return { init, updateDuration };
})();

/* ============================================================
   SECTION 7 — TodoWidget
   Owns the #todo DOM section.
   Manages an in-memory task list that is persisted to localStorage.
   ============================================================ */

export const TodoWidget = (() => {
  let tasks = [];
  let editingId = null;
  let form, input, errorEl, list;

  function newId() {
    return window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function persist(nextTasks) {
    const result = Store.set('tasks', nextTasks);
    if (!result.ok) return false;
    tasks = nextTasks;
    EventBus.emit('tasksChanged', tasks);
    return true;
  }

  function init(initialTasks) {
    form = document.getElementById('todo-form');
    input = document.getElementById('todo-input');
    errorEl = document.getElementById('todo-error');
    list = document.getElementById('todo-list');
    tasks = Array.isArray(initialTasks) ? initialTasks : [];
    render();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      addTask(input.value);
    });
  }

  function addTask(description) {
    const trimmed = String(description).trim();
    if (!trimmed) {
      showError('Task text is required.');
      return;
    }
    if (trimmed.length > 200) {
      showError('Task text must be 200 characters or fewer.');
      return;
    }
    const next = [...tasks, { id: newId(), description: trimmed, completed: false }];
    if (persist(next)) {
      input.value = '';
      clearError();
      render();
    }
  }

  function toggleTask(id) {
    const next = tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
    if (persist(next)) render();
  }

  function deleteTask(id) {
    const next = tasks.filter((task) => task.id !== id);
    if (persist(next)) render();
  }

  function startEdit(id) {
    editingId = id;
    render();
  }

  function saveEdit(id, description) {
    const trimmed = String(description).trim();
    if (!trimmed) {
      editingId = null;
      render();
      return;
    }
    if (trimmed.length > 200) return;
    const next = tasks.map((task) => task.id === id ? { ...task, description: trimmed } : task);
    if (persist(next)) {
      editingId = null;
      render();
    }
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function render() {
    list.replaceChildren();
    tasks.forEach((task) => {
      const item = document.createElement('li');
      item.className = `todo-item${task.completed ? ' todo-item--completed' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Mark ${task.description} complete`);
      checkbox.addEventListener('change', () => toggleTask(task.id));

      if (editingId === task.id) {
        const editInput = document.createElement('input');
        editInput.className = 'input todo-item__edit-input';
        editInput.value = task.description;
        editInput.maxLength = 200;
        editInput.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') saveEdit(task.id, editInput.value);
          if (event.key === 'Escape') { editingId = null; render(); }
        });
        item.append(checkbox, editInput);

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn--primary';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', () => saveEdit(task.id, editInput.value));
        item.append(saveBtn);
      } else {
        const description = document.createElement('span');
        description.className = 'todo-item__description';
        description.textContent = task.description;
        item.append(checkbox, description);

        const actions = document.createElement('div');
        actions.className = 'todo-item__actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn--ghost';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => startEdit(task.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn--danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        actions.append(editBtn, deleteBtn);
        item.append(actions);
      }
      list.append(item);
    });
  }

  return { init, addTask, toggleTask, deleteTask, startEdit, saveEdit, render };
})();

/* ============================================================
   SECTION 8 — LinksWidget
   Owns the #links DOM section.
   Manages an in-memory link list (max 20) persisted to localStorage.
   ============================================================ */

export const LinksWidget = (() => {
  let links = [];
  let form, labelInput, urlInput, labelError, urlError, capacityError, saveError, list;

  function newId() {
    return window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function init(initialLinks) {
    form = document.getElementById('links-form');
    labelInput = document.getElementById('link-label');
    urlInput = document.getElementById('link-url');
    labelError = document.getElementById('link-label-error');
    urlError = document.getElementById('link-url-error');
    capacityError = document.getElementById('links-capacity-error');
    saveError = document.getElementById('links-save-error');
    list = document.getElementById('links-list');
    links = Array.isArray(initialLinks) ? initialLinks : [];
    render();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      addLink(labelInput.value, urlInput.value);
    });
  }

  function persist(nextLinks) {
    const result = Store.set('quickLinks', nextLinks);
    if (!result.ok) {
      saveError.textContent = 'Link could not be saved. The latest change was not applied.';
      saveError.hidden = false;
      return false;
    }
    links = nextLinks;
    saveError.hidden = true;
    EventBus.emit('linksChanged', links);
    return true;
  }

  function addLink(label, url) {
    const trimmedLabel = String(label).trim();
    const trimmedURL = String(url).trim();
    labelError.hidden = true;
    urlError.hidden = true;
    capacityError.hidden = true;

    let invalid = false;
    if (!trimmedLabel) {
      labelError.textContent = 'Link label is required.';
      labelError.hidden = false;
      invalid = true;
    } else if (trimmedLabel.length > 50) {
      labelError.textContent = 'Link label must be 50 characters or fewer.';
      labelError.hidden = false;
      invalid = true;
    }
    if (!trimmedURL) {
      urlError.textContent = 'URL is required.';
      urlError.hidden = false;
      invalid = true;
    }
    if (links.length >= 20) {
      capacityError.textContent = 'The maximum number of links (20) has been reached.';
      capacityError.hidden = false;
      return;
    }
    if (invalid) return;

    const normalized = normalizeURL(trimmedURL);
    if (!isValidURL(normalized)) {
      urlError.textContent = 'Enter a valid URL of 2048 characters or fewer.';
      urlError.hidden = false;
      return;
    }

    const next = [...links, { id: newId(), label: trimmedLabel, url: normalized }];
    if (persist(next)) {
      labelInput.value = '';
      urlInput.value = '';
      render();
    }
  }

  function deleteLink(id) {
    const next = links.filter((link) => link.id !== id);
    if (persist(next)) render();
  }

  function render() {
    list.replaceChildren();
    links.forEach((link) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'link-item';
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'link-btn';
      openBtn.textContent = link.label;
      openBtn.title = link.url;
      openBtn.addEventListener('click', () => window.open(link.url, '_blank', 'noopener,noreferrer'));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn--danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', `Delete ${link.label}`);
      deleteBtn.addEventListener('click', () => deleteLink(link.id));
      wrapper.append(openBtn, deleteBtn);
      list.append(wrapper);
    });
  }

  return { init, addLink, deleteLink, render };
})();

/* ============================================================
   SECTION 9 — SettingsPanel
   Owns the #settings DOM section.
   Validates inputs, writes to Store, and emits change events.
   ============================================================ */

export const SettingsPanel = (() => {
  let nameInput, nameSave, nameError, durationInput, durationSave, durationError, themeToggle, themeLabel;
  let currentTheme = 'light';

  function init(state) {
    nameInput = document.getElementById('settings-name');
    nameSave = document.getElementById('settings-name-save');
    nameError = document.getElementById('settings-name-error');
    durationInput = document.getElementById('settings-duration');
    durationSave = document.getElementById('settings-duration-save');
    durationError = document.getElementById('settings-duration-error');
    themeToggle = document.getElementById('settings-theme-toggle');
    themeLabel = document.getElementById('theme-label');
    currentTheme = state.theme === 'dark' ? 'dark' : 'light';

    nameInput.value = state.userName || '';
    durationInput.value = String(state.sessionDuration);
    themeLabel.textContent = currentTheme === 'dark' ? 'Dark' : 'Light';

    nameSave.addEventListener('click', () => saveName(nameInput.value));
    durationSave.addEventListener('click', () => saveDuration(durationInput.value));
    themeToggle.addEventListener('click', toggleTheme);
  }

  function showError(field, message) {
    const error = field === 'name' ? nameError : durationError;
    error.textContent = message;
    error.hidden = false;
  }

  function clearError(field) {
    const error = field === 'name' ? nameError : durationError;
    error.textContent = '';
    error.hidden = true;
  }

  function saveName(raw) {
    const name = String(raw).trim();
    if (name.length > 50) {
      showError('name', 'Name must be 50 characters or fewer.');
      return;
    }
    clearError('name');
    if (!name) {
      const result = Store.remove('userName');
      if (result.ok) EventBus.emit('userNameChanged', null);
      return;
    }
    const result = Store.set('userName', name);
    if (result.ok) EventBus.emit('userNameChanged', name);
  }

  function saveDuration(raw) {
    const duration = Number(raw);
    if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
      showError('duration', 'Valid range: 1–120 minutes.');
      return;
    }
    clearError('duration');
    const result = Store.set('sessionDuration', String(duration));
    if (result.ok) EventBus.emit('sessionDurationChanged', duration);
  }

  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    const result = Store.set('theme', currentTheme);
    if (!result.ok) {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      return;
    }
    ThemeManager.apply(currentTheme);
    themeLabel.textContent = currentTheme === 'dark' ? 'Dark' : 'Light';
    EventBus.emit('themeChanged', currentTheme);
  }

  return { init, saveName, saveDuration, toggleTheme, showError, clearError };
})();

/* ============================================================
   SECTION 10 — Initialization (DOMContentLoaded)
   Wires all components together after the DOM is ready.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  EventBus.on('storageWarning', (message) => {
    const banner = document.getElementById('storage-warning');
    banner.textContent = message;
    banner.hidden = false;
  });

  const state = Store.loadAll();
  ThemeManager.apply(state.theme);

  GreetingWidget.init(state);
  TimerWidget.init(state.sessionDuration);
  TodoWidget.init(state.tasks);
  LinksWidget.init(state.quickLinks);
  SettingsPanel.init(state);

  GreetingWidget.startClock();
});
