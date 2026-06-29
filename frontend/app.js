// =========================
// Utilities
// =========================

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("loadJSON error", key, e);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("saveJSON error", key, e);
  }
}

// =========================
// State
// =========================

const todayState = loadJSON("nyvron_today", {
  priorities: [],
  schedule: [],
  reminders: [],
  quickNotes: [],
  energy: "medium",
  countdowns: [], // {id, title, date, time, notes}
  northStar: {
    phase: "Phase 1: Foundation",
    direction: "Stability, consistency, and confidence.",
  },
});

const calendarState = loadJSON("nyvron_calendar", {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  events: [], // {id,title,type,date,time,notes}
});

const timerState = loadJSON("nyvron_timer", {
  running: false,
  startedAt: null,
  elapsedSeconds: 0,
  currentMode: "study",
  currentName: "",
  currentTags: "",
  sessions: [], // {id,date,time,mode,name,tags,seconds}
});

const scheduleState = loadJSON("nyvron_schedule", {
  day: [], // {id,text}
  week: [],
  month: [],
});

const memoryState = loadJSON("nyvron_memory", {
  memories: [], // {id,title,body,createdAt}
  fileName: null,
  fileContent: null,
  fileSize: null,
  fileWords: 0,
});

const reflectionState = loadJSON("nyvron_reflection", {
  entries: [], // {id,text,createdAt}
});

const profileState = loadJSON("nyvron_profile", {
  name: "User",
  memberSince: "Jun 2026",
  avatarDataUrl: null,
});

const settingsState = loadJSON("nyvron_settings", {
  theme: "dark",
  fontScale: 1,
  rememberChats: true,
  storeHistory: true,
  autoArchive: false,
});

const chatState = loadJSON("nyvron_chat", {
  sessions: [], // {id,createdAt,title,messages:[{who,text}]}
  activeId: null,
});

// =========================
// DOM references
// =========================

const screens = document.querySelectorAll(".screen");
const navItems = document.querySelectorAll(".nav-item");
const bottomNavItems = document.querySelectorAll(".bottom-nav-item, .dock-item");

const topbarTitle = document.getElementById("topbar-title");
const topbarClock = document.getElementById("topbar-clock");

const offlineBadge = document.getElementById("offline-badge");

// Today
const todayGreetingEl = document.getElementById("today-greeting");
const todaySubtitleEl = document.getElementById("today-subtitle");
const todayTimeEl = document.getElementById("today-time");
const todayDateEl = document.getElementById("today-date");

const todayPrioritiesEl = document.getElementById("today-priorities");
const todayAddPriorityBtn = document.getElementById("today-add-priority");

const todayScheduleListEl = document.getElementById("today-schedule-list");
const todayAddScheduleBtn = document.getElementById("today-add-schedule");

const todayRemindersEl = document.getElementById("today-reminders");

const energyButtons = document.querySelectorAll(".energy-btn");
const lowEnergyBannerEl = document.getElementById("low-energy-banner");
const lowEnergyDismissBtn = document.getElementById("low-energy-dismiss");

const quickNotesInput = document.getElementById("quick-notes-input");
const quickNotesSaveBtn = document.getElementById("quick-notes-save");
const quickNotesListEl = document.getElementById("quick-notes-list");

const countdownSetBtn = document.getElementById("countdown-set-btn");
const countdownLabelEl = document.getElementById("countdown-label");
const countdownTimeEl = document.getElementById("countdown-time");
const countdownMetaEl = document.getElementById("countdown-meta");

const northstarPhaseEl = document.getElementById("northstar-phase");
const northstarDirectionEl = document.getElementById("northstar-direction");
const northstarEditBtn = document.getElementById("northstar-edit-btn");

const reflectionQuoteEl = document.getElementById("reflection-quote");

// Dashboard
const dashboardGreetingEl = document.getElementById("dashboard-greeting");
const dashboardTimeEl = document.getElementById("dashboard-time");
const dashboardDateEl = document.getElementById("dashboard-date");

const dashboardUpcomingList = document.getElementById(
  "dashboard-upcoming-list"
);
const dashboardRemindersList = document.getElementById(
  "dashboard-reminders-list"
);
const dashboardProgressText = document.getElementById(
  "dashboard-progress-text"
);
const dashboardDeadlinesList = document.getElementById(
  "dashboard-deadlines-list"
);
const dashboardFocusList = document.getElementById("dashboard-focus-list");

// Chat
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const chatThinkingEl = document.getElementById("chat-thinking-status");

const chatHistoryListEl = document.getElementById("chat-history-list");
const chatNewBtn = document.getElementById("chat-new-btn");
const chatHistoryBtn = document.getElementById("chat-history-btn");

const quickPromptButtons = document.querySelectorAll("[data-quick-prompt]");

const chatObserveSummaryEl = document.getElementById("chat-observe-summary");
const chatObserveStateEl = document.getElementById("chat-observe-state");

// Calendar
const calendarCurrentLabel = document.getElementById("calendar-current-label");
const calendarDaysGrid = document.getElementById("calendar-days-grid");
const calendarPrevBtn = document.getElementById("calendar-prev-btn");
const calendarNextBtn = document.getElementById("calendar-next-btn");
const calendarSelectedDateEl = document.getElementById(
  "calendar-selected-date"
);
const calendarEventsListEl = document.getElementById("calendar-events-list");
const calendarNewEventBtn = document.getElementById("calendar-new-event-btn");

const calendarModal = document.getElementById("calendar-modal");
const calendarModalCloseBtn = document.getElementById("calendar-modal-close");
const calendarEventTitleInput = document.getElementById(
  "calendar-event-title"
);
const calendarEventTypeInput = document.getElementById("calendar-event-type");
const calendarEventDateInput = document.getElementById("calendar-event-date");
const calendarEventTimeInput = document.getElementById("calendar-event-time");
const calendarEventNotesInput = document.getElementById(
  "calendar-event-notes"
);
const calendarEventSaveBtn = document.getElementById("calendar-event-save");

const calendarQuickTypeButtons = document.querySelectorAll(
  "[data-calendar-add-type]"
);

// Optional "Saved events" card (another list)
const calendarSavedEventsListEl = document.getElementById(
  "calendar-saved-events-list"
);

// Time tracker
const timerDisplayEl = document.getElementById("timer-display");
const timerStartBtn = document.getElementById("timer-start-btn");
const timerPauseBtn = document.getElementById("timer-pause-btn");
const timerResetBtn = document.getElementById("timer-reset-btn");
const timerModeSelector = document.getElementById("timer-mode-selector");
const timerSessionNameInput = document.getElementById("timer-session-name");
const timerTagsInput = document.getElementById("timer-tags-input");
const timerSaveSessionBtn = document.getElementById("timer-save-session-btn");
const timerSessionsListEl = document.getElementById("timer-sessions-list");

// Time tracker mini calendar (2026–2032)
const timeCalendarContainer = document.getElementById(
  "time-calendar-container"
);
const timeCalendarSessionsList = document.getElementById(
  "time-calendar-sessions-list"
);

// Schedule
const scheduleDayListEl = document.getElementById("schedule-day-list");
const scheduleWeekListEl = document.getElementById("schedule-week-list");
const scheduleMonthListEl = document.getElementById("schedule-month-list");
const scheduleNewBlockBtn = document.getElementById("schedule-new-block-btn");

// Memory
const memoryTitleInput = document.getElementById("memory-title-input");
const memoryBodyInput = document.getElementById("memory-body-input");
const memorySaveBtn = document.getElementById("memory-save-btn");
const memoryListEl = document.getElementById("memory-list");
const memoryFileInput = document.getElementById("memory-file-input");
const memoryRemoveFileBtn = document.getElementById(
  "memory-remove-file-btn"
);

// Reflection
const reflectionInput = document.getElementById("reflection-input");
const reflectionSaveBtn = document.getElementById("reflection-save-btn");
const reflectionEntriesList = document.getElementById(
  "reflection-entries-list"
);

// Profile
const profileAvatarCircle = document.getElementById("profile-avatar-circle");
const profileNameEl = document.getElementById("profile-name");
const profileAvatarUploadBtn = document.getElementById(
  "profile-avatar-upload"
);

// Ambience
const ambienceRainBtn = document.getElementById("ambience-rain-btn");
const ambienceLofiBtn = document.getElementById("ambience-lofi-btn");
const ambienceSilentBtn = document.getElementById("ambience-silent-btn");
const ambienceUrlInputRain = document.getElementById("ambience-url-rain");
const ambienceUrlInputLofi = document.getElementById("ambience-url-lofi");
const ambienceAudio = document.getElementById("ambience-audio");

// Settings
const settingsThemeSelect = document.getElementById("settings-theme-select");
const settingsFontSizeInput = document.getElementById("settings-font-size");
const settingsLogoInput = document.getElementById("settings-logo-input");

const settingsRememberChatsInput = document.getElementById(
  "settings-remember-chats"
);
const settingsStoreHistoryInput = document.getElementById(
  "settings-store-history"
);
const settingsAutoArchiveInput = document.getElementById(
  "settings-auto-archive"
);

const settingsClearMemoryBtn = document.getElementById(
  "settings-clear-memory-btn"
);
const settingsForgetAllBtn = document.getElementById(
  "settings-forget-all-btn"
);

// Command bar
const commandbar = document.getElementById("commandbar");
const commandbarTrigger = document.getElementById("commandbar-trigger");
const commandbarInput = document.getElementById("commandbar-input");

// =========================
// Nav & screen switching
// =========================

function setActiveScreen(targetId) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === targetId);
  });

  // Combine nav-item + tab-btn selectors for bottom tabs
  document.querySelectorAll("[data-screen-target]").forEach((btn) => {
    const target = btn.getAttribute("data-screen-target");
    btn.classList.toggle("active", target === targetId);
  });

  const label =
    targetId === "screen-today"
      ? "Today"
      : targetId === "screen-dashboard"
      ? "Dashboard"
      : targetId === "screen-chat"
      ? "Chat"
      : targetId === "screen-calendar"
      ? "Calendar"
      : targetId === "screen-time"
      ? "Track"
      : targetId === "screen-schedule"
      ? "Schedule"
      : targetId === "screen-memory"
      ? "Memory"
      : targetId === "screen-reflection"
      ? "Journal"
      : targetId === "screen-profile"
      ? "Me"
      : targetId === "screen-settings"
      ? "Settings"
      : "NYVRON";

  if (topbarTitle) topbarTitle.textContent = label;

  // Auto-show chat side panel on wider screens
  const sidePanel = document.getElementById("chat-side-panel");
  if (sidePanel) {
    if (window.innerWidth >= 768 && targetId === "screen-chat") {
      sidePanel.classList.remove("hidden");
    } else if (targetId !== "screen-chat") {
      sidePanel.classList.add("hidden");
    }
  }
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-screen-target");
    if (target) setActiveScreen(target);
  });
});

bottomNavItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-screen-target");
    if (target) setActiveScreen(target);
  });
});

// =========================
// Clock & greeting
// =========================

function updateTopbarClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-IN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  if (topbarClock) topbarClock.textContent = timeString;
  if (todayTimeEl) todayTimeEl.textContent = timeString;
  if (dashboardTimeEl) dashboardTimeEl.textContent = timeString;

  const menubarClock = document.getElementById("menubar-clock");
  if (menubarClock) {
    menubarClock.textContent = now.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }

  const dateString = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (todayDateEl) todayDateEl.textContent = dateString;
  if (dashboardDateEl) dashboardDateEl.textContent = dateString;
}

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = "GOOD DAY";
  if (hour < 12) greeting = "GOOD MORNING";
  else if (hour < 18) greeting = "GOOD AFTERNOON";
  else greeting = "GOOD EVENING";

  if (todayGreetingEl) todayGreetingEl.textContent = greeting;
  if (dashboardGreetingEl) dashboardGreetingEl.textContent = greeting;
}

setInterval(updateTopbarClock, 1000);
updateTopbarClock();
updateGreeting();

// =========================
// Today helpers
// =========================

function createChecklistItem(item, onDelete, onToggle, onFocus) {
  const li = document.createElement("li");
  const main = document.createElement("div");
  main.className = "checklist-main";

  const text = typeof item === "object" ? item.text : item;
  const completed = typeof item === "object" ? item.completed : false;

  const circle = document.createElement("button");
  circle.className = `checklist-circle ${completed ? "completed" : ""}`;
  circle.type = "button";
  if (completed) {
    circle.innerHTML = "✓";
  }

  if (onToggle) {
    circle.addEventListener("click", () => {
      onToggle();
    });
  }

  const label = document.createElement("span");
  label.className = `checklist-label ${completed ? "line-through" : ""}`;
  label.textContent = text;

  main.appendChild(circle);
  main.appendChild(label);
  li.appendChild(main);

  const actions = document.createElement("div");
  actions.className = "priority-item-actions";

  // Focus Button (only if onFocus is provided and task is not completed)
  if (onFocus && !completed) {
    const focusBtn = document.createElement("button");
    focusBtn.className = "priority-focus-btn";
    focusBtn.type = "button";
    focusBtn.innerHTML = "⏱️ Focus";
    focusBtn.addEventListener("click", () => {
      onFocus();
    });
    actions.appendChild(focusBtn);
  }

  // Delete Button
  const delBtn = document.createElement("button");
  delBtn.className = "checklist-delete";
  delBtn.type = "button";
  delBtn.textContent = "✕";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  });
  actions.appendChild(delBtn);
  li.appendChild(actions);

  return li;
}

// Priorities

function renderTodayPriorities() {
  if (!todayPrioritiesEl) return;
  todayPrioritiesEl.innerHTML = "";

  // Dynamic migration from string arrays to objects
  todayState.priorities = todayState.priorities.map((p, idx) => {
    if (typeof p === "string") {
      return { id: Date.now() + idx + Math.random(), text: p, completed: false };
    }
    return p;
  });

  todayState.priorities.forEach((p, idx) => {
    const li = createChecklistItem(
      p,
      // onDelete
      () => {
        todayState.priorities.splice(idx, 1);
        saveJSON("nyvron_today", todayState);
        renderTodayPriorities();
        renderDashboard();
      },
      // onToggle
      () => {
        p.completed = !p.completed;
        saveJSON("nyvron_today", todayState);
        renderTodayPriorities();
        renderDashboard();
      },
      // onFocus
      () => {
        startFocusSession(p);
      }
    );
    todayPrioritiesEl.appendChild(li);
  });
}

if (todayAddPriorityBtn) {
  todayAddPriorityBtn.addEventListener("click", () => {
    openInlineModal("Add Priority Task", "e.g. Finish project proposal", (text) => {
      if (!text) return;
      todayState.priorities.push({
        id: Date.now(),
        text: text.trim(),
        completed: false
      });
      saveJSON("nyvron_today", todayState);
      renderTodayPriorities();
      renderDashboard();
    });
  });
}

// Add Reminder button
const todayAddReminderBtn = document.getElementById("today-add-reminder");
if (todayAddReminderBtn) {
  todayAddReminderBtn.addEventListener("click", () => {
    openInlineModal("Add Reminder", "e.g. Take medication at 3pm", (text) => {
      if (!text) return;
      todayState.reminders.push(text.trim());
      saveJSON("nyvron_today", todayState);
      renderTodayReminders();
      renderDashboard();
    });
  });
}

// Schedule

function renderTodaySchedule() {
  if (!todayScheduleListEl) return;
  todayScheduleListEl.innerHTML = "";
  todayState.schedule.forEach((p, idx) => {
    const li = createChecklistItem(p, () => {
      todayState.schedule.splice(idx, 1);
      saveJSON("nyvron_today", todayState);
      renderTodaySchedule();
      renderScheduleAll();
      renderDashboard();
    });
    todayScheduleListEl.appendChild(li);
  });
}

if (todayAddScheduleBtn) {
  todayAddScheduleBtn.addEventListener("click", () => {
    openInlineModal("Add Schedule Item", "e.g. Team standup at 10am", (text) => {
      if (!text) return;
      todayState.schedule.push(text.trim());
      saveJSON("nyvron_today", todayState);
      renderTodaySchedule();
      renderScheduleAll();
      renderDashboard();
    });
  });
}

// Reminders (fix delete: key by text, not index)

function renderTodayReminders() {
  if (!todayRemindersEl) return;
  todayRemindersEl.innerHTML = "";

  // Stored reminders
  todayState.reminders.forEach((r) => {
    const li = createChecklistItem(r, () => {
      const idx = todayState.reminders.indexOf(r);
      if (idx !== -1) {
        todayState.reminders.splice(idx, 1);
        saveJSON("nyvron_today", todayState);
        renderTodayReminders();
        renderDashboard();
      }
    });
    todayRemindersEl.appendChild(li);
  });

  // Calendar reminder events
  const reminderEvents = calendarState.events.filter(
    (ev) => ev.type === "reminder"
  );

  reminderEvents.forEach((ev) => {
    const label = `${ev.date} ${ev.time || ""} · ${ev.title}`;
    const li = document.createElement("li");
    const main = document.createElement("div");
    main.className = "checklist-main";

    const circle = document.createElement("button");
    circle.className = "checklist-circle";
    circle.type = "button";

    const lbl = document.createElement("span");
    lbl.className = "checklist-label";
    lbl.textContent = label;

    const delBtn = document.createElement("button");
    delBtn.className = "checklist-delete";
    delBtn.type = "button";
    delBtn.textContent = "✕";

    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = calendarState.events.findIndex(
        (e2) => e2.id === ev.id
      );
      if (idx !== -1) {
        calendarState.events.splice(idx, 1);
        saveJSON("nyvron_calendar", calendarState);
        renderTodayReminders();
        renderCalendarDayDetails();
        renderDashboard();
      }
    });

    main.appendChild(circle);
    main.appendChild(lbl);
    li.appendChild(main);
    li.appendChild(delBtn);
    todayRemindersEl.appendChild(li);
  });
}

// Energy & low energy banner

function renderEnergy() {
  energyButtons.forEach((btn) => {
    const val = btn.getAttribute("data-energy");
    btn.classList.toggle("active", val === todayState.energy);
  });

  if (lowEnergyBannerEl) {
    lowEnergyBannerEl.classList.toggle(
      "hidden",
      todayState.energy !== "low"
    );
  }
}

energyButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const val = btn.getAttribute("data-energy");
    if (!val) return;
    todayState.energy = val;
    saveJSON("nyvron_today", todayState);
    renderEnergy();
  });
});

if (lowEnergyDismissBtn) {
  lowEnergyDismissBtn.addEventListener("click", () => {
    if (!lowEnergyBannerEl) return;
    lowEnergyBannerEl.classList.add("hidden");
  });
}

// Quick notes

function renderQuickNotes() {
  if (!quickNotesListEl) return;
  quickNotesListEl.innerHTML = "";

  todayState.quickNotes.forEach((note) => {
    const row = document.createElement("div");
    row.className = "checklist-note";

    const delBtn = document.createElement("button");
    delBtn.className = "checklist-delete";
    delBtn.type = "button";
    delBtn.textContent = "✕";

    const textSpan = document.createElement("span");
    textSpan.textContent = note;

    delBtn.addEventListener("click", () => {
      const idx = todayState.quickNotes.indexOf(note);
      if (idx !== -1) {
        todayState.quickNotes.splice(idx, 1);
        saveJSON("nyvron_today", todayState);
        renderQuickNotes();
      }
    });

    row.appendChild(delBtn);
    row.appendChild(textSpan);
    quickNotesListEl.appendChild(row);
  });
}

if (quickNotesSaveBtn) {
  quickNotesSaveBtn.addEventListener("click", () => {
    if (!quickNotesInput) return;
    const text = quickNotesInput.value.trim();
    if (!text) return;
    todayState.quickNotes.push(text);
    quickNotesInput.value = "";
    saveJSON("nyvron_today", todayState);
    renderQuickNotes();
  });
}

// Countdowns (Instagram Style Live Liquid Glass)

let countdownTickInterval = null;

// Initialize Emoji Picker clicks in Countdown Modal
document.querySelectorAll(".cd-emoji-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cd-emoji-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

function renderCountdown() {
  const card = document.getElementById("countdown-card");
  const emptyEl = document.getElementById("countdown-empty");
  const liveEl = document.getElementById("countdown-live");

  if (!card || !emptyEl || !liveEl) return;

  if (countdownTickInterval) {
    clearInterval(countdownTickInterval);
    countdownTickInterval = null;
  }

  if (!todayState.countdowns || !todayState.countdowns.length) {
    emptyEl.classList.remove("hidden");
    liveEl.classList.add("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  liveEl.classList.remove("hidden");

  const next = todayState.countdowns[0];
  
  // Set headers
  const emojiEl = document.getElementById("countdown-emoji");
  const nameEl = document.getElementById("countdown-event-name");
  const dateEl = document.getElementById("countdown-event-date");

  if (emojiEl) emojiEl.textContent = next.emoji || "🎯";
  if (nameEl) nameEl.textContent = next.title || "Event";
  
  const dtString = `${next.date}T${next.time || "00:00"}`;
  const targetDate = new Date(dtString);
  if (dateEl) {
    dateEl.textContent = targetDate.toLocaleDateString("en-IN", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  // Set start/end labels on progress
  const startLabel = document.getElementById("cd-created-label");
  const endLabel = document.getElementById("cd-target-label");
  if (startLabel && next.createdAt) {
    startLabel.textContent = new Date(next.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }
  if (endLabel) {
    endLabel.textContent = targetDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }

  // Start tick
  tickCountdown(targetDate, next.createdAt || Date.now());
  countdownTickInterval = setInterval(() => {
    tickCountdown(targetDate, next.createdAt || Date.now());
  }, 1000);
}

function updateDigit(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  const strVal = String(val).padStart(2, "0");
  if (el.textContent !== strVal) {
    el.textContent = strVal;
    // Add flip animation
    el.classList.remove("flip");
    void el.offsetWidth; // trigger reflow
    el.classList.add("flip");
  }
}

function tickCountdown(targetDate, createdAt) {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const liveEl = document.getElementById("countdown-live");

  if (diffMs <= 0) {
    // Expired
    updateDigit("cd-days-num", 0);
    updateDigit("cd-hours-num", 0);
    updateDigit("cd-mins-num", 0);
    updateDigit("cd-secs-num", 0);
    
    const fill = document.getElementById("cd-progress-fill");
    const pctLabel = document.getElementById("cd-pct-label");
    if (fill) fill.style.width = "100%";
    if (pctLabel) pctLabel.textContent = "100%";
    
    if (liveEl) liveEl.classList.add("expired");
    return;
  }

  if (liveEl) liveEl.classList.remove("expired");

  // Calculate units
  const secsTotal = Math.floor(diffMs / 1000);
  const days = Math.floor(secsTotal / (3600 * 24));
  const hours = Math.floor((secsTotal % (3600 * 24)) / 3600);
  const mins = Math.floor((secsTotal % 3600) / 60);
  const secs = secsTotal % 60;

  updateDigit("cd-days-num", days);
  updateDigit("cd-hours-num", hours);
  updateDigit("cd-mins-num", mins);
  updateDigit("cd-secs-num", secs);

  // Progress calculations
  const totalDuration = targetDate.getTime() - createdAt;
  const elapsed = now.getTime() - createdAt;
  let pct = 0;
  if (totalDuration > 0) {
    pct = Math.max(0, Math.min(100, Math.round((elapsed / totalDuration) * 100)));
  }

  const fill = document.getElementById("cd-progress-fill");
  const pctLabel = document.getElementById("cd-pct-label");
  if (fill) fill.style.width = `${pct}%`;
  if (pctLabel) pctLabel.textContent = `${pct}%`;
}

// Bind Trigger buttons (Add & Edit) using Event Delegation or dynamic query
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("countdown-set-trigger")) {
    openModal("countdown-modal");
    
    // Set input values from current if edit
    const labelInput = document.getElementById("countdown-label-input");
    const datetimeInput = document.getElementById("countdown-datetime-input");
    
    if (todayState.countdowns && todayState.countdowns.length) {
      const next = todayState.countdowns[0];
      if (labelInput) labelInput.value = next.title || "";
      if (datetimeInput) {
        datetimeInput.value = `${next.date}T${next.time || "00:00"}`;
      }
      // Highlight correct emoji button
      const currentEmoji = next.emoji || "🎯";
      document.querySelectorAll(".cd-emoji-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-emoji") === currentEmoji);
      });
    } else {
      if (labelInput) labelInput.value = "";
      if (datetimeInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        datetimeInput.value = tomorrow.toISOString().slice(0, 16);
      }
      // Reset emoji
      document.querySelectorAll(".cd-emoji-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-emoji") === "🎯");
      });
    }
  }
});

// Delete countdown
const countdownDelBtn = document.getElementById("countdown-delete-btn");
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#countdown-delete-btn");
  if (btn) {
    todayState.countdowns = [];
    saveJSON("nyvron_today", todayState);
    renderCountdown();
  }
});

const countdownSaveModalBtn = document.getElementById("countdown-save-btn");
if (countdownSaveModalBtn) {
  countdownSaveModalBtn.addEventListener("click", () => {
    const labelInput = document.getElementById("countdown-label-input");
    const datetimeInput = document.getElementById("countdown-datetime-input");
    if (!labelInput || !datetimeInput) return;
    
    const title = labelInput.value.trim();
    const datetime = datetimeInput.value;
    if (!title || !datetime) { alert("Label and date are required."); return; }
    
    // Retrieve active emoji
    const activeEmojiEl = document.querySelector(".cd-emoji-btn.active");
    const emoji = activeEmojiEl ? activeEmojiEl.getAttribute("data-emoji") : "🎯";
    
    const [date, time] = datetime.split("T");
    
    // Keep previous createdAt if edit
    let createdAt = Date.now();
    if (todayState.countdowns && todayState.countdowns.length) {
      createdAt = todayState.countdowns[0].createdAt || Date.now();
    }

    todayState.countdowns = [{
      id: Date.now(),
      title,
      date,
      time: time || "",
      notes: "",
      emoji,
      createdAt
    }];
    
    saveJSON("nyvron_today", todayState);
    renderCountdown();
    closeModal("countdown-modal");
    labelInput.value = "";
    datetimeInput.value = "";
  });
}

const countdownModalClose = document.getElementById("countdown-modal-close");
if (countdownModalClose) countdownModalClose.addEventListener("click", () => closeModal("countdown-modal"));
const countdownModalBackdrop = document.getElementById("countdown-modal-backdrop");
if (countdownModalBackdrop) countdownModalBackdrop.addEventListener("click", () => closeModal("countdown-modal"));

// North star

function renderNorthStar() {
  if (northstarPhaseEl)
    northstarPhaseEl.textContent = todayState.northStar.phase;
  if (northstarDirectionEl)
    northstarDirectionEl.textContent = todayState.northStar.direction;
  const quoteEl = document.getElementById("reflection-quote");
  if (quoteEl && todayState.northStar.quote) {
    quoteEl.textContent = `"${todayState.northStar.quote}"`;
  }
}

// North Star Edit Button — modal flow
if (northstarEditBtn) {
  northstarEditBtn.addEventListener("click", () => {
    const phaseInput = document.getElementById("northstar-phase-input");
    const directionInput = document.getElementById("northstar-direction-input");
    const quoteInput = document.getElementById("northstar-quote-input");
    if (phaseInput) phaseInput.value = todayState.northStar.phase || "";
    if (directionInput) directionInput.value = todayState.northStar.direction || "";
    if (quoteInput) quoteInput.value = todayState.northStar.quote || "";
    openModal("northstar-modal");
  });
}

const northstarSaveBtn = document.getElementById("northstar-save-btn");
if (northstarSaveBtn) {
  northstarSaveBtn.addEventListener("click", () => {
    const phaseInput = document.getElementById("northstar-phase-input");
    const directionInput = document.getElementById("northstar-direction-input");
    const quoteInput = document.getElementById("northstar-quote-input");
    if (!phaseInput || !directionInput) return;
    todayState.northStar.phase = phaseInput.value.trim() || todayState.northStar.phase;
    todayState.northStar.direction = directionInput.value.trim() || todayState.northStar.direction;
    if (quoteInput) todayState.northStar.quote = quoteInput.value.trim();
    saveJSON("nyvron_today", todayState);
    renderNorthStar();
    closeModal("northstar-modal");
  });
}
const northstarModalClose = document.getElementById("northstar-modal-close");
if (northstarModalClose) northstarModalClose.addEventListener("click", () => closeModal("northstar-modal"));
const northstarModalBackdrop = document.getElementById("northstar-modal-backdrop");
if (northstarModalBackdrop) northstarModalBackdrop.addEventListener("click", () => closeModal("northstar-modal"));

// =========================
// Dashboard (with buttons)
// =========================

function renderDashboard() {
  // Upcoming = next 3 calendar events
  if (dashboardUpcomingList) {
    dashboardUpcomingList.innerHTML = "";
    const sorted = [...calendarState.events].sort((a, b) => {
      const ad = `${a.date} ${a.time || "00:00"}`;
      const bd = `${b.date} ${b.time || "00:00"}`;
      return ad.localeCompare(bd);
    });
    sorted.slice(0, 3).forEach((ev) => {
      const li = document.createElement("li");
      li.textContent = `${ev.date} ${ev.time || ""} · ${ev.title}`;
      dashboardUpcomingList.appendChild(li);
    });
  }

  // Reminders
  if (dashboardRemindersList) {
    dashboardRemindersList.innerHTML = "";
    todayState.reminders.slice(0, 5).forEach((r) => {
      const li = createChecklistItem(r, null);
      dashboardRemindersList.appendChild(li);
    });

    const reminderEvents = calendarState.events.filter(
      (ev) => ev.type === "reminder"
    );
    reminderEvents.slice(0, 5).forEach((ev) => {
      const label = `${ev.date} ${ev.time || ""} · ${ev.title}`;
      const li = createChecklistItem(label, null);
      dashboardRemindersList.appendChild(li);
    });
  }

  // Progress from timer sessions (hour count)
  let loggedHoursStr = "0.0h logged today";
  const todayISO = new Date().toISOString().slice(0, 10);
  const todaySessions = timerState.sessions.filter(
    (s) => s.date === todayISO
  );
  const totalSec = todaySessions.reduce(
    (sum, s) => sum + (s.seconds || 0),
    0
  );
  const hours = (totalSec / 3600).toFixed(1);
  loggedHoursStr = todaySessions.length === 0
    ? "No sessions logged today"
    : `${todaySessions.length} sessions · ${hours}h logged`;

  if (dashboardProgressText) {
    dashboardProgressText.textContent = loggedHoursStr;
  }

  // Deadlines
  if (dashboardDeadlinesList) {
    dashboardDeadlinesList.innerHTML = "";
    const deadlines = calendarState.events.filter(
      (ev) => ev.type === "deadline"
    );
    deadlines.slice(0, 5).forEach((ev) => {
      const li = document.createElement("li");
      li.textContent = `${ev.date} ${ev.time || ""} · ${ev.title}`;
      dashboardDeadlinesList.appendChild(li);
    });
  }

  // Today's focus (priorities checklist with full interactive bindings)
  if (dashboardFocusList) {
    dashboardFocusList.innerHTML = "";
    todayState.priorities.slice(0, 3).forEach((p) => {
      const li = createChecklistItem(
        p,
        null,
        () => {
          p.completed = !p.completed;
          saveJSON("nyvron_today", todayState);
          renderTodayPriorities();
          renderDashboard();
        },
        () => {
          startFocusSession(p);
        }
      );
      dashboardFocusList.appendChild(li);
    });
  }

  // Trigger progress ring redraw
  updateProgressRing();
}

// Dashboard buttons wiring
// (Assumes you add buttons with IDs in HTML: dashboard-upcoming-add-btn, etc.)

const dashboardUpcomingAddBtn = document.getElementById(
  "dashboard-upcoming-add-btn"
);
const dashboardRemindersAddBtn = document.getElementById(
  "dashboard-reminders-add-btn"
);
const dashboardProgressSetBtn = document.getElementById(
  "dashboard-progress-set-btn"
);
const dashboardDeadlinesAddBtn = document.getElementById(
  "dashboard-deadlines-add-btn"
);
const dashboardFocusAddBtn = document.getElementById(
  "dashboard-focus-add-btn"
);

if (dashboardUpcomingAddBtn) {
  dashboardUpcomingAddBtn.addEventListener("click", () => {
    // Open calendar modal prefilled with today
    if (!calendarModal) return;
    calendarModal.classList.remove("hidden");
    if (calendarEventDateInput)
      calendarEventDateInput.value = new Date()
        .toISOString()
        .slice(0, 10);
  });
}

if (dashboardRemindersAddBtn) {
  dashboardRemindersAddBtn.addEventListener("click", () => {
    const text = prompt("Add reminder");
    if (!text || !text.trim()) return;
    todayState.reminders.push(text.trim());
    saveJSON("nyvron_today", todayState);
    renderTodayReminders();
    renderDashboard();
  });
}

if (dashboardProgressSetBtn) {
  dashboardProgressSetBtn.addEventListener("click", () => {
    setActiveScreen("screen-time");
  });
}

if (dashboardDeadlinesAddBtn) {
  dashboardDeadlinesAddBtn.addEventListener("click", () => {
    const title = prompt("Deadline title");
    if (!title || !title.trim()) return;
    const date = prompt("Date (YYYY-MM-DD)");
    if (!date || !date.trim()) return;
    const time = prompt("Time (HH:MM, optional)") || "";
    const notes = prompt("Notes (optional)") || "";
    const id = Date.now();
    calendarState.events.push({
      id,
      title: title.trim(),
      type: "deadline",
      date: date.trim(),
      time: time.trim(),
      notes: notes.trim(),
    });
    saveJSON("nyvron_calendar", calendarState);
    renderCalendarDayDetails();
    renderDashboard();
  });
}

if (dashboardFocusAddBtn) {
  dashboardFocusAddBtn.addEventListener("click", () => {
    const text = prompt("Add today's focus (priority)");
    if (!text || !text.trim()) return;
    todayState.priorities.push(text.trim());
    saveJSON("nyvron_today", todayState);
    renderTodayPriorities();
    renderDashboard();
  });
}

// =========================
// Chat: history, observe, local AI stub
// =========================

function ensureActiveChat() {
  if (!chatState.activeId) {
    const id = Date.now();
    chatState.sessions.push({
      id,
      createdAt: new Date().toISOString(),
      title: "New chat",
      messages: [],
    });
    chatState.activeId = id;
    saveJSON("nyvron_chat", chatState);
  }
}

function renderChatHistory() {
  if (!chatHistoryListEl) return;
  chatHistoryListEl.innerHTML = "";
  chatState.sessions.forEach((s) => {
    const li = document.createElement("li");
    li.textContent =
      s.title ||
      new Date(s.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    if (s.id === chatState.activeId) {
      li.style.fontWeight = "600";
    }
    li.addEventListener("click", () => {
      chatState.activeId = s.id;
      saveJSON("nyvron_chat", chatState);
      loadChatSessionToUI();
      renderChatHistory();
      // Auto-hide panel on mobile
      if (window.innerWidth < 768) {
        const sidePanel = document.getElementById("chat-side-panel");
        if (sidePanel) sidePanel.classList.add("hidden");
      }
    });
    chatHistoryListEl.appendChild(li);
  });
}

function appendMessage(text, who) {
  if (!chatMessages || !text.trim()) return;
  const msg = document.createElement("div");
  msg.className = `chat-msg chat-msg--${who}`;
  // Support markdown-like bold
  msg.innerHTML = text.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // save into session
  ensureActiveChat();
  const session = chatState.sessions.find(
    (s) => s.id === chatState.activeId
  );
  if (session) {
    session.messages.push({ who, text: text.trim() });
    if (!session.title && who === "user") {
      session.title = text.trim().slice(0, 40);
    }
    saveJSON("nyvron_chat", chatState);
    renderChatHistory();
  }
}

function loadChatSessionToUI() {
  ensureActiveChat();
  const session = chatState.sessions.find(
    (s) => s.id === chatState.activeId
  );
  if (!session || !chatMessages) return;
  chatMessages.innerHTML = "";
  session.messages.forEach((m) => {
    const msg = document.createElement("div");
    msg.className = `chat-msg chat-msg--${m.who}`;
    msg.innerHTML = m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    chatMessages.appendChild(msg);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChat() {
  if (!chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;
  appendMessage(text, "user");
  chatInput.value = "";

  if (chatThinkingEl) chatThinkingEl.classList.remove("hidden");

  // Retrieve chat history from the current session
  const session = chatState.sessions.find(
    (s) => s.id === chatState.activeId
  );
  // Send up to the last 10 messages for context, excluding the last user message we just appended
  const history = session ? session.messages.slice(0, -1).slice(-10) : [];

  // Gather active user dashboard context
  const context = {
    priorities: todayState.priorities || [],
    schedule: todayState.schedule || [],
    memories: memoryState.memories || [],
    knowledgeBase: memoryState.fileContent || ""
  };

  const modelSelect = document.getElementById("chat-model-select");
  const selectedModel = modelSelect ? modelSelect.value : "auto";

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        history: history,
        context: context,
        model: selectedModel,
      }),
    });

    const data = await response.json();

    if (chatThinkingEl) chatThinkingEl.classList.add("hidden");

    if (!response.ok) {
      appendMessage(
        `⚠️ Backend Error: ${data.error || "Something went wrong."}`,
        "ai"
      );
      return;
    }

    appendMessage(data.reply, "ai");

    // Apply AI-generated title to current session
    if (data.title) {
      const activeSession = chatState.sessions.find(s => s.id === chatState.activeId);
      if (activeSession) {
        activeSession.title = data.title.replace(/^["']|["']$/g, '').trim(); // strip quotes
        saveJSON("nyvron_chat", chatState);
        renderChatHistory();
      }
    }
  } catch (err) {
    if (chatThinkingEl) chatThinkingEl.classList.add("hidden");
    console.error("Network/Server Error:", err);
    appendMessage(
      "⚠️ NYVRON offline. Please start the backend server (run 'npm start' in the backend folder) and ensure your API key is pasted in the 'insert api key here' file.",
      "ai"
    );
  }
}

if (chatSendBtn) {
  chatSendBtn.addEventListener("click", sendChat);
}

if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
}

function handleCreateNewChat() {
  const id = Date.now();
  chatState.sessions.push({
    id,
    createdAt: new Date().toISOString(),
    title: "New chat",
    messages: [],
  });
  chatState.activeId = id;
  saveJSON("nyvron_chat", chatState);
  
  loadChatSessionToUI();
  renderChatHistory();
  
  if (chatInput) chatInput.value = "";
  
  // Auto-hide panel on mobile
  if (window.innerWidth < 768) {
    const sidePanel = document.getElementById("chat-side-panel");
    if (sidePanel) sidePanel.classList.add("hidden");
  }
}

if (chatNewBtn) {
  chatNewBtn.addEventListener("click", handleCreateNewChat);
}

const sidebarChatNewBtn = document.getElementById("sidebar-chat-new-btn");
if (sidebarChatNewBtn) {
  sidebarChatNewBtn.addEventListener("click", handleCreateNewChat);
}


if (chatHistoryBtn) {
  chatHistoryBtn.addEventListener("click", () => {
    const sidePanel = document.getElementById("chat-side-panel");
    if (sidePanel) {
      sidePanel.classList.toggle("hidden");
    }
  });
}

// Quick prompts
quickPromptButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const promptText = btn.getAttribute("data-quick-prompt");
    if (!promptText || !chatInput) return;
    chatInput.value = promptText;
    chatInput.focus();
  });
});

// Observe (summary from timer sessions)
function renderObserve() {
  if (!chatObserveSummaryEl || !chatObserveStateEl) return;
  if (!timerState.sessions.length) {
    chatObserveSummaryEl.textContent = "No sessions logged yet.";
    chatObserveStateEl.textContent = "Dominant mode: none.";
    return;
  }
  const modeCounts = {};
  timerState.sessions.forEach((s) => {
    modeCounts[s.mode] = (modeCounts[s.mode] || 0) + 1;
  });
  const dominant = Object.entries(modeCounts).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  const totalSec = timerState.sessions.reduce(
    (sum, s) => sum + (s.seconds || 0),
    0
  );
  const hours = (totalSec / 3600).toFixed(1);

  chatObserveSummaryEl.textContent = `${timerState.sessions.length} total sessions · ${hours}h logged.`;
  chatObserveStateEl.textContent = `Dominant mode: ${dominant}.`;
}

// =========================
// Calendar
// =========================

let selectedCalendarDate = new Date().toISOString().slice(0, 10);

function renderCalendarMonth() {
  if (!calendarDaysGrid || !calendarCurrentLabel) return;
  const year = calendarState.currentYear;
  const month = calendarState.currentMonth;

  const date = new Date(year, month, 1);
  const firstDayIdx = (date.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  calendarCurrentLabel.textContent = date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  calendarDaysGrid.innerHTML = "";

  for (let i = 0; i < firstDayIdx; i++) {
    const empty = document.createElement("div");
    calendarDaysGrid.appendChild(empty);
  }

  const todayISO2 = new Date().toISOString().slice(0, 10);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = document.createElement("button");
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const hasEvents = calendarState.events.some(ev => ev.date === iso);
    let cls = "cal-day";
    if (iso === todayISO2) cls += " today";
    if (iso === selectedCalendarDate) cls += " selected";
    if (hasEvents) cls += " has-event";
    d.className = cls;
    d.textContent = day;
    d.addEventListener("click", () => {
      selectedCalendarDate = iso;
      renderCalendarMonth();
      renderCalendarDayDetails();
    });
    calendarDaysGrid.appendChild(d);
  }
}

function renderCalendarDayDetails() {
  if (!calendarSelectedDateEl || !calendarEventsListEl) return;
  const date = new Date(selectedCalendarDate + "T00:00:00");
  calendarSelectedDateEl.textContent = date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  calendarEventsListEl.innerHTML = "";

  const events = calendarState.events.filter(
    (ev) => ev.date === selectedCalendarDate
  );

  events.forEach((ev) => {
    const li = document.createElement("li");
    const title = document.createElement("div");
    title.textContent = `${ev.time || ""} ${ev.title}`;
    const notes = document.createElement("div");
    notes.className = "list-section-label";
    notes.textContent = ev.notes || "";
    li.appendChild(title);
    if (ev.notes) li.appendChild(notes);

    const del = document.createElement("button");
    del.className = "checklist-delete";
    del.type = "button";
    del.textContent = "✕";
    del.addEventListener("click", () => {
      const idx = calendarState.events.findIndex(
        (e) => e.id === ev.id
      );
      if (idx !== -1) {
        calendarState.events.splice(idx, 1);
        saveJSON("nyvron_calendar", calendarState);
        renderCalendarDayDetails();
        renderTodayReminders();
        renderDashboard();
      }
    });
    li.appendChild(del);
    calendarEventsListEl.appendChild(li);
  });

  renderCalendarSavedEvents();
  renderCountdown();
}

// Saved events card (title,type,date,time,notes)

function renderCalendarSavedEvents() {
  if (!calendarSavedEventsListEl) return;
  calendarSavedEventsListEl.innerHTML = "";

  calendarState.events
    .slice()
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .forEach((ev) => {
      const li = document.createElement("li");
      const title = document.createElement("div");
      title.textContent = `${ev.title} (${ev.type})`;
      const meta = document.createElement("div");
      meta.className = "list-section-label";
      meta.textContent = `${ev.date} ${ev.time || ""} · ${ev.notes || ""}`;

      const del = document.createElement("button");
      del.className = "checklist-delete";
      del.type = "button";
      del.textContent = "✕";
      del.addEventListener("click", () => {
        const idx = calendarState.events.findIndex(
          (e) => e.id === ev.id
        );
        if (idx !== -1) {
          calendarState.events.splice(idx, 1);
          saveJSON("nyvron_calendar", calendarState);
          renderCalendarDayDetails();
          renderDashboard();
        }
      });

      li.appendChild(del);
      li.appendChild(title);
      li.appendChild(meta);
      calendarSavedEventsListEl.appendChild(li);
    });
}

if (calendarPrevBtn) {
  calendarPrevBtn.addEventListener("click", () => {
    calendarState.currentMonth -= 1;
    if (calendarState.currentMonth < 0) {
      calendarState.currentMonth = 11;
      calendarState.currentYear -= 1;
    }
    saveJSON("nyvron_calendar", calendarState);
    renderCalendarMonth();
    renderCalendarDayDetails();
  });
}

if (calendarNextBtn) {
  calendarNextBtn.addEventListener("click", () => {
    calendarState.currentMonth += 1;
    if (calendarState.currentMonth > 11) {
      calendarState.currentMonth = 0;
      calendarState.currentYear += 1;
    }
    saveJSON("nyvron_calendar", calendarState);
    renderCalendarMonth();
    renderCalendarDayDetails();
  });
}

if (calendarNewEventBtn) {
  calendarNewEventBtn.addEventListener("click", () => {
    openModal("calendar-modal");
    if (calendarEventDateInput)
      calendarEventDateInput.value = selectedCalendarDate;
  });
}

// Calendar modal backdrop close
const calendarModalBackdrop = document.getElementById("calendar-modal-backdrop");
if (calendarModalBackdrop) calendarModalBackdrop.addEventListener("click", () => closeModal("calendar-modal"));

if (calendarModalCloseBtn) {
  calendarModalCloseBtn.addEventListener("click", () => closeModal("calendar-modal"));
}

if (calendarEventSaveBtn) {
  calendarEventSaveBtn.addEventListener("click", () => {
    const title = calendarEventTitleInput.value.trim();
    const type = calendarEventTypeInput.value;
    const date = calendarEventDateInput.value;
    const time = calendarEventTimeInput.value;
    const notes = calendarEventNotesInput.value.trim();
    if (!title || !date) {
      alert("Title and date are required.");
      return;
    }
    const id = Date.now();
    calendarState.events.push({ id, title, type, date, time, notes });
    saveJSON("nyvron_calendar", calendarState);

    renderCalendarMonth(); // re-render month to show event dot
    renderCalendarDayDetails();
    renderTodayReminders();
    renderDashboard();

    closeModal("calendar-modal");
    calendarEventTitleInput.value = "";
    calendarEventNotesInput.value = "";
  });
}

// Quick add type
calendarQuickTypeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.getAttribute("data-calendar-add-type");
    if (!type) return;
    const title = prompt(`New ${type} title`);
    if (!title || !title.trim()) return;
    const time = prompt("Time (HH:MM, optional)") || "";
    const notes = prompt("Notes (optional)") || "";
    const id = Date.now();
    calendarState.events.push({
      id,
      title: title.trim(),
      type,
      date: selectedCalendarDate,
      time: time.trim(),
      notes: notes.trim(),
    });
    saveJSON("nyvron_calendar", calendarState);
    renderCalendarDayDetails();
    renderTodayReminders();
    renderDashboard();
  });
});

// =========================
// Time tracker
// =========================

let timerInterval = null;

function formatSeconds(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function updateTimerDisplay() {
  if (!timerDisplayEl) return;
  timerDisplayEl.textContent = formatSeconds(timerState.elapsedSeconds);
}

function startTimer() {
  if (timerState.running) return;
  timerState.running = true;
  timerState.startedAt = Date.now();
  saveJSON("nyvron_timer", timerState);

  timerInterval = setInterval(() => {
    const now = Date.now();
    const diff = Math.floor((now - timerState.startedAt) / 1000);
    timerState.elapsedSeconds += diff;
    timerState.startedAt = now;
    updateTimerDisplay();
    saveJSON("nyvron_timer", timerState);
    renderObserve();
  }, 1000);
}

function pauseTimer() {
  if (!timerState.running) return;
  timerState.running = false;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  saveJSON("nyvron_timer", timerState);
}

function resetTimer() {
  pauseTimer();
  timerState.elapsedSeconds = 0;
  timerState.startedAt = null;
  saveJSON("nyvron_timer", timerState);
  updateTimerDisplay();
}

if (timerStartBtn) timerStartBtn.addEventListener("click", startTimer);
if (timerPauseBtn) timerPauseBtn.addEventListener("click", pauseTimer);
if (timerResetBtn) timerResetBtn.addEventListener("click", resetTimer);

if (timerModeSelector) {
  timerModeSelector.addEventListener("click", (e) => {
    const btn = e.target.closest(".glass-chip");
    if (!btn) return;
    const mode = btn.getAttribute("data-mode");
    if (!mode) return;
    timerState.currentMode = mode;
    saveJSON("nyvron_timer", timerState);
    Array.from(timerModeSelector.children).forEach((child) => {
      child.classList.toggle("active", child === btn);
    });
  });
}

if (timerSaveSessionBtn) {
  timerSaveSessionBtn.addEventListener("click", () => {
    if (!timerSessionNameInput || !timerTagsInput) return;
    const name = timerSessionNameInput.value.trim();
    const tags = timerTagsInput.value.trim();
    if (!timerState.elapsedSeconds) {
      alert("No time logged.");
      return;
    }
    const now = new Date();
    const id = Date.now();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);
    timerState.sessions.push({
      id,
      date,
      time,
      mode: timerState.currentMode,
      name,
      tags,
      seconds: timerState.elapsedSeconds,
    });
    saveJSON("nyvron_timer", timerState);
    resetTimer();
    timerSessionNameInput.value = "";
    timerTagsInput.value = "";
    renderSessions();
    renderObserve();
    renderDashboard();
    renderTimeCalendarSessions(); // refresh calendar view
  });
}

function renderSessions() {
  if (!timerSessionsListEl) return;
  timerSessionsListEl.innerHTML = "";
  if (!timerState.sessions.length) {
    timerSessionsListEl.innerHTML = '<div style="color:var(--txt-3);font-size:13px;padding:12px 0">No sessions logged yet.</div>';
    return;
  }
  timerState.sessions
    .slice()
    .reverse()
    .forEach((s) => {
      const item = document.createElement("div");
      item.className = "session-item";
      item.innerHTML = `
        <div>
          <div class="session-name">${s.name || s.mode}</div>
          <div class="session-meta">${s.date} · ${s.mode}${s.tags ? " · " + s.tags : ""}</div>
        </div>
        <span class="session-duration">${formatSeconds(s.seconds)}</span>
      `;
      timerSessionsListEl.appendChild(item);
    });
}

// Time tracker calendar 2026–2032

function renderTimeCalendar() {
  if (!timeCalendarContainer) return;
  timeCalendarContainer.innerHTML = "";

  // Show week from 2026-01-01 to 2032-12-31 as clickable dates
  const startYear = 2026;
  const endYear = 2032;

  for (let year = startYear; year <= endYear; year++) {
    const yearDiv = document.createElement("div");
    yearDiv.className = "list-section-label";
    yearDiv.textContent = year;
    timeCalendarContainer.appendChild(yearDiv);

    const monthsGrid = document.createElement("div");
    monthsGrid.style.display = "grid";
    monthsGrid.style.gridTemplateColumns = "repeat(12, 1fr)";
    monthsGrid.style.gap = "2px";

    for (let month = 0; month < 12; month++) {
      const monthBtn = document.createElement("button");
      monthBtn.className = "glass-chip";
      monthBtn.textContent = new Date(year, month, 1).toLocaleDateString(
        "en-IN",
        { month: "short" }
      );
      monthBtn.addEventListener("click", () => {
        // select first day of month
        const date = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        renderTimeCalendarSessions(date);
      });
      monthsGrid.appendChild(monthBtn);
    }

    timeCalendarContainer.appendChild(monthsGrid);
  }
}

function renderTimeCalendarSessions(dateFilter) {
  if (!timeCalendarSessionsList) return;
  timeCalendarSessionsList.innerHTML = "";

  const sessions = dateFilter
    ? timerState.sessions.filter((s) => s.date === dateFilter)
    : timerState.sessions;

  if (!sessions.length) {
    const li = document.createElement("li");
    li.textContent = dateFilter
      ? `No sessions on ${dateFilter}.`
      : "No sessions logged.";
    timeCalendarSessionsList.appendChild(li);
    return;
  }

  sessions
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((s) => {
      const li = document.createElement("li");
      li.textContent = `${s.date} ${s.time} · ${s.mode} · ${s.name ||
        ""} (${formatSeconds(s.seconds)})`;
      timeCalendarSessionsList.appendChild(li);
    });
}

// =========================
// Schedule (with delete icon)
// =========================

function renderScheduleList(listEl, arr) {
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!arr.length) {
    listEl.innerHTML = '<div style="color:var(--txt-3);font-size:12px;padding:8px 0">No items yet.</div>';
    return;
  }
  arr.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "schedule-item";

    const textSpan = document.createElement("span");
    textSpan.textContent = item.text || item;

    const delBtn = document.createElement("button");
    delBtn.className = "schedule-del";
    delBtn.type = "button";
    delBtn.textContent = "✕";

    delBtn.addEventListener("click", () => {
      arr.splice(idx, 1);
      saveJSON("nyvron_schedule", scheduleState);
      renderScheduleAll();
      renderTodaySchedule();
      renderDashboard();
    });

    row.appendChild(textSpan);
    row.appendChild(delBtn);
    listEl.appendChild(row);
  });
}

function renderScheduleAll() {
  renderScheduleList(scheduleDayListEl, scheduleState.day);
  renderScheduleList(scheduleWeekListEl, scheduleState.week);
  renderScheduleList(scheduleMonthListEl, scheduleState.month);
}

if (scheduleNewBlockBtn) {
  scheduleNewBlockBtn.addEventListener("click", () => openModal("schedule-modal"));
}

// Schedule modal wiring
const scheduleModalClose = document.getElementById("schedule-modal-close");
if (scheduleModalClose) scheduleModalClose.addEventListener("click", () => closeModal("schedule-modal"));
const scheduleModalBackdrop = document.getElementById("schedule-modal-backdrop");
if (scheduleModalBackdrop) scheduleModalBackdrop.addEventListener("click", () => closeModal("schedule-modal"));

const scheduleBlockSaveBtn = document.getElementById("schedule-block-save");
if (scheduleBlockSaveBtn) {
  scheduleBlockSaveBtn.addEventListener("click", () => {
    const titleInput = document.getElementById("schedule-block-title");
    const scopeInput = document.getElementById("schedule-block-scope");
    const timeInput = document.getElementById("schedule-block-time");
    if (!titleInput || !scopeInput) return;
    const text = titleInput.value.trim();
    const scope = scopeInput.value;
    const time = timeInput ? timeInput.value : "";
    if (!text) { alert("Title is required."); return; }
    const item = { id: Date.now(), text: time ? `${time} · ${text}` : text };
    if (scope === "day") scheduleState.day.push(item);
    else if (scope === "week") scheduleState.week.push(item);
    else if (scope === "month") scheduleState.month.push(item);
    saveJSON("nyvron_schedule", scheduleState);
    renderScheduleAll();
    renderTodaySchedule();
    renderDashboard();
    closeModal("schedule-modal");
    titleInput.value = "";
    if (timeInput) timeInput.value = "";
  });
}

// =========================
// Memory
// =========================

function renderMemories() {
  if (!memoryListEl) return;
  memoryListEl.innerHTML = "";
  memoryState.memories
    .slice()
    .reverse()
    .forEach((m) => {
      const li = document.createElement("li");
      const content = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = m.title || "(no title)";
      const body = document.createElement("div");
      body.textContent = m.body;
      const meta = document.createElement("div");
      meta.className = "list-section-label";
      meta.textContent = new Date(m.createdAt).toLocaleString("en-IN");

      const delBtn = document.createElement("button");
      delBtn.className = "checklist-delete";
      delBtn.type = "button";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        const idx = memoryState.memories.findIndex(
          (mm) => mm.id === m.id
        );
        if (idx !== -1) {
          memoryState.memories.splice(idx, 1);
          saveJSON("nyvron_memory", memoryState);
          renderMemories();
        }
      });

      content.appendChild(strong);
      content.appendChild(body);
      content.appendChild(meta);

      li.appendChild(delBtn);
      li.appendChild(content);
      memoryListEl.appendChild(li);
    });
}

if (memorySaveBtn) {
  memorySaveBtn.addEventListener("click", () => {
    if (!memoryBodyInput) return;
    const body = memoryBodyInput.value.trim();
    const title = memoryTitleInput
      ? memoryTitleInput.value.trim()
      : "";
    if (!body) {
      alert("Memory details cannot be empty.");
      return;
    }
    const id = Date.now();
    memoryState.memories.push({
      id,
      title,
      body,
      createdAt: new Date().toISOString(),
    });
    saveJSON("nyvron_memory", memoryState);
    memoryBodyInput.value = "";
    if (memoryTitleInput) memoryTitleInput.value = "";
    renderMemories();
  });
}

// Knowledge file (.txt) UI renderer
function renderKnowledgeBaseUI() {
  const statusCard = document.getElementById("knowledge-status-card");
  const fileNameEl = document.getElementById("knowledge-file-name");
  const fileSizeEl = document.getElementById("knowledge-file-size");
  const wordCountEl = document.getElementById("knowledge-word-count");
  const removeBtn = document.getElementById("memory-remove-file-btn");
  const labelText = document.getElementById("upload-label-text");

  if (!statusCard) return;

  if (memoryState.fileName && memoryState.fileContent) {
    statusCard.classList.remove("hidden");
    if (removeBtn) removeBtn.classList.remove("hidden");
    fileNameEl.textContent = memoryState.fileName;
    fileSizeEl.textContent = memoryState.fileSize || "0 KB";
    wordCountEl.textContent = `${memoryState.fileWords || 0} words`;
    if (labelText) labelText.textContent = "Change document...";
  } else {
    statusCard.classList.add("hidden");
    if (removeBtn) removeBtn.classList.add("hidden");
    if (labelText) labelText.textContent = "Choose a .txt document...";
    if (memoryFileInput) memoryFileInput.value = "";
  }
}

if (memoryFileInput) {
  memoryFileInput.addEventListener("change", () => {
    const file = memoryFileInput.files[0];
    if (!file) return;

    // Check size limit: 1MB
    if (file.size > 1024 * 1024) {
      alert("⚠️ File too large. Knowledge files must be under 1MB for local storage sync.");
      memoryFileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const sizeStr = (file.size / 1024).toFixed(1) + " KB";

      memoryState.fileName = file.name;
      memoryState.fileContent = text;
      memoryState.fileSize = sizeStr;
      memoryState.fileWords = wordCount;

      saveJSON("nyvron_memory", memoryState);
      renderKnowledgeBaseUI();
      alert(`Attached file: ${file.name} (${sizeStr})`);
    };

    reader.onerror = (err) => {
      console.error("File reading error:", err);
      alert("❌ Error reading text file.");
    };

    reader.readAsText(file);
  });
}

if (memoryRemoveFileBtn) {
  memoryRemoveFileBtn.addEventListener("click", () => {
    memoryState.fileName = null;
    memoryState.fileContent = null;
    memoryState.fileSize = null;
    memoryState.fileWords = 0;

    saveJSON("nyvron_memory", memoryState);
    renderKnowledgeBaseUI();
    alert("Knowledge file removed from memory.");
  });
}

// =========================
// Reflection
// =========================

function renderReflections() {
  if (!reflectionEntriesList) return;
  reflectionEntriesList.innerHTML = "";
  if (!reflectionState.entries.length) {
    reflectionEntriesList.innerHTML = '<div style="color:var(--txt-3);font-size:13px;padding:12px 0">No journal entries yet.</div>';
    return;
  }
  reflectionState.entries
    .slice()
    .reverse()
    .forEach((entry) => {
      const card = document.createElement("div");
      card.className = "reflection-entry";
      const dateStr = new Date(entry.createdAt).toLocaleDateString("en-IN", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
      const delBtn = document.createElement("button");
      delBtn.className = "reflection-del";
      delBtn.type = "button";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        const idx = reflectionState.entries.findIndex(e => e.id === entry.id);
        if (idx !== -1) {
          reflectionState.entries.splice(idx, 1);
          saveJSON("nyvron_reflection", reflectionState);
          renderReflections();
        }
      });
      card.innerHTML = `<div class="reflection-date">${dateStr}</div>`;
      card.appendChild(delBtn);
      const textEl = document.createElement("div");
      textEl.className = "reflection-text";
      textEl.textContent = entry.text;
      card.appendChild(textEl);
      reflectionEntriesList.appendChild(card);
    });
}

if (reflectionSaveBtn) {
  reflectionSaveBtn.addEventListener("click", () => {
    if (!reflectionInput) return;
    const text = reflectionInput.value.trim();
    if (!text) return;
    reflectionState.entries.push({
      id: Date.now(),
      text,
      createdAt: new Date().toISOString(),
    });
    saveJSON("nyvron_reflection", reflectionState);
    reflectionInput.value = "";
    renderReflections();
  });
}

// =========================
// Profile & ambience
// =========================

function renderProfile() {
  if (profileNameEl) profileNameEl.textContent = profileState.name;
  if (profileAvatarCircle) {
    if (profileState.avatarDataUrl) {
      profileAvatarCircle.style.backgroundImage = `url(${profileState.avatarDataUrl})`;
      profileAvatarCircle.style.backgroundSize = "cover";
      profileAvatarCircle.textContent = "";
    } else {
      profileAvatarCircle.style.backgroundImage = "";
      profileAvatarCircle.textContent = profileState.name
        .slice(0, 1)
        .toUpperCase();
    }
  }
}

if (profileAvatarUploadBtn) {
  profileAvatarUploadBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        profileState.avatarDataUrl = e.target.result;
        saveJSON("nyvron_profile", profileState);
        renderProfile();
      };
      reader.readAsDataURL(file);
    });
    input.click();
  });
}

// Name edit by clicking name field
if (profileNameEl) {
  profileNameEl.addEventListener("click", () => {
    const name = prompt("Edit name", profileState.name);
    if (name && name.trim()) {
      profileState.name = name.trim();
      saveJSON("nyvron_profile", profileState);
      renderProfile();
    }
  });
}

// Ambience player (rain/lofi/silent)
function playAmbience(url) {
  if (!ambienceAudio) return;
  if (!url) {
    ambienceAudio.pause();
    ambienceAudio.src = "";
    return;
  }
  ambienceAudio.src = url;
  ambienceAudio.loop = true;
  ambienceAudio.play().catch((e) => {
    console.error("Audio play failed", e);
  });
}

if (ambienceRainBtn) {
  ambienceRainBtn.addEventListener("click", () => {
    const url =
      ambienceUrlInputRain && ambienceUrlInputRain.value
        ? ambienceUrlInputRain.value
        : "";
    if (!url) {
      alert("Set a rain audio URL first.");
      return;
    }
    playAmbience(url);
  });
}

if (ambienceLofiBtn) {
  ambienceLofiBtn.addEventListener("click", () => {
    const url =
      ambienceUrlInputLofi && ambienceUrlInputLofi.value
        ? ambienceUrlInputLofi.value
        : "";
    if (!url) {
      alert("Set a lofi audio URL first.");
      return;
    }
    playAmbience(url);
  });
}

if (ambienceSilentBtn) {
  ambienceSilentBtn.addEventListener("click", () => {
    playAmbience(null);
  });
}

// =========================
// Settings & theme
// =========================

function applyTheme() {
  const html = document.documentElement;
  if (settingsState.theme === "dark") {
    html.setAttribute("data-theme", "dark");
  } else if (settingsState.theme === "light") {
    html.setAttribute("data-theme", "light");
  } else {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    html.setAttribute("data-theme", prefersDark ? "dark" : "light");
  }
}

function applyFontScale() {
  document.documentElement.style.setProperty(
    "--nyvron-font-scale",
    settingsState.fontScale
  );
}

function applyLogo() {
  const customLogo = localStorage.getItem("nyvron_custom_logo");
  if (customLogo) {
    const logo = document.getElementById("app-logo");
    if (logo) {
      logo.style.backgroundImage = `url(${customLogo})`;
      logo.style.backgroundSize = "cover";
      logo.style.backgroundPosition = "center";
      logo.textContent = "";
    }
  }
}

if (settingsThemeSelect) {
  settingsThemeSelect.value = settingsState.theme;
  settingsThemeSelect.addEventListener("change", () => {
    settingsState.theme = settingsThemeSelect.value;
    saveJSON("nyvron_settings", settingsState);
    applyTheme();
  });
}

if (settingsFontSizeInput) {
  settingsFontSizeInput.value = settingsState.fontScale || 1;
  settingsFontSizeInput.addEventListener("input", () => {
    settingsState.fontScale = parseFloat(
      settingsFontSizeInput.value
    );
    saveJSON("nyvron_settings", settingsState);
    applyFontScale();
  });
}

if (settingsRememberChatsInput) {
  settingsRememberChatsInput.checked = settingsState.rememberChats;
  settingsRememberChatsInput.addEventListener("change", () => {
    settingsState.rememberChats = settingsRememberChatsInput.checked;
    saveJSON("nyvron_settings", settingsState);
  });
}

if (settingsStoreHistoryInput) {
  settingsStoreHistoryInput.checked = settingsState.storeHistory;
  settingsStoreHistoryInput.addEventListener("change", () => {
    settingsState.storeHistory = settingsStoreHistoryInput.checked;
    saveJSON("nyvron_settings", settingsState);
  });
}

if (settingsAutoArchiveInput) {
  settingsAutoArchiveInput.checked = settingsState.autoArchive;
  settingsAutoArchiveInput.addEventListener("change", () => {
    settingsState.autoArchive = settingsAutoArchiveInput.checked;
    saveJSON("nyvron_settings", settingsState);
  });
}

// Export / import all localStorage

if (settingsClearMemoryBtn) {
  settingsClearMemoryBtn.addEventListener("click", () => {
    if (!confirm("Clear NYVRON memory (today, schedule, etc.)?")) return;
    localStorage.removeItem("nyvron_today");
    localStorage.removeItem("nyvron_calendar");
    localStorage.removeItem("nyvron_timer");
    localStorage.removeItem("nyvron_schedule");
    localStorage.removeItem("nyvron_memory");
    localStorage.removeItem("nyvron_reflection");
    localStorage.removeItem("nyvron_profile");
    localStorage.removeItem("nyvron_chat");
    alert("NYVRON memory cleared. Reload to reset.");
  });
}

if (settingsForgetAllBtn) {
  settingsForgetAllBtn.addEventListener("click", () => {
    if (!confirm("Forget everything (entire localStorage)?")) return;
    localStorage.clear();
    alert("All data cleared. Reload the page.");
  });
}

// Logo upload
if (settingsLogoInput) {
  settingsLogoInput.addEventListener("change", () => {
    const file = settingsLogoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      localStorage.setItem("nyvron_custom_logo", dataUrl);
      applyLogo();
    };
    reader.readAsDataURL(file);
  });
}

// =========================
// Command bar
// =========================

// Linear-style Command Palette
const commands = [
  { text: "Go to Today Dashboard", shortcut: "G T", action: () => setActiveScreen("screen-today") },
  { text: "Go to Analytics & Metrics", shortcut: "G D", action: () => setActiveScreen("screen-dashboard") },
  { text: "Go to NYVRON AI Chat", shortcut: "G C", action: () => setActiveScreen("screen-chat") },
  { text: "Go to Calendar Planner", shortcut: "G A", action: () => setActiveScreen("screen-calendar") },
  { text: "Go to Time Tracker", shortcut: "G M", action: () => setActiveScreen("screen-time") },
  { text: "Go to Week Schedule", shortcut: "G S", action: () => setActiveScreen("screen-schedule") },
  { text: "Go to Facts & Memories", shortcut: "G F", action: () => setActiveScreen("screen-memory") },
  { text: "Go to Reflection Journal", shortcut: "G R", action: () => setActiveScreen("screen-reflection") },
  { text: "Go to Profile Settings", shortcut: "G P", action: () => setActiveScreen("screen-profile") },
  { text: "Go to App Configurations", shortcut: "G O", action: () => setActiveScreen("screen-settings") },
  {
    text: "Toggle Light/Dark Theme",
    shortcut: "T T",
    action: () => {
      const select = document.getElementById("settings-theme-select");
      if (select) {
        select.value = select.value === "dark" ? "light" : "dark";
        select.dispatchEvent(new Event("change"));
      }
    }
  },
  {
    text: "Start Focus Session (25 min)",
    shortcut: "F S",
    action: () => {
      if (todayState.priorities.length > 0) {
        startFocusSession(todayState.priorities[0]);
      } else {
        alert("Add a priority task first!");
      }
    }
  }
];

let commandSelectedIndex = 0;
let filteredCommands = [...commands];

function renderCommandResults() {
  const resultsEl = document.getElementById("commandbar-results");
  if (!resultsEl) return;
  resultsEl.innerHTML = "";

  if (filteredCommands.length === 0) {
    const li = document.createElement("li");
    li.className = "command-item no-results";
    li.style.cursor = "default";
    li.textContent = "No matching commands found";
    resultsEl.appendChild(li);
    return;
  }

  filteredCommands.forEach((cmd, idx) => {
    const li = document.createElement("li");
    li.className = `command-item ${idx === commandSelectedIndex ? "selected" : ""}`;
    
    const label = document.createElement("span");
    label.textContent = cmd.text;

    const shortcut = document.createElement("span");
    shortcut.className = "command-shortcut";
    shortcut.textContent = cmd.shortcut;

    li.appendChild(label);
    li.appendChild(shortcut);

    li.addEventListener("click", () => {
      cmd.action();
      closeCommandBar();
    });

    resultsEl.appendChild(li);
  });

  const activeItem = resultsEl.querySelector(".command-item.selected");
  if (activeItem) {
    activeItem.scrollIntoView({ block: "nearest" });
  }
}

function openCommandBar() {
  if (!commandbar) return;
  commandbar.classList.remove("hidden");
  commandSelectedIndex = 0;
  filteredCommands = [...commands];
  if (commandbarInput) {
    commandbarInput.value = "";
    commandbarInput.focus();
  }
  renderCommandResults();
}

function closeCommandBar() {
  if (!commandbar) return;
  commandbar.classList.add("hidden");
}

if (commandbarTrigger) {
  commandbarTrigger.addEventListener("click", openCommandBar);
}

if (commandbarInput) {
  commandbarInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    filteredCommands = commands.filter(cmd => cmd.text.toLowerCase().includes(q));
    commandSelectedIndex = 0;
    renderCommandResults();
  });

  commandbarInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCommandBar();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        commandSelectedIndex = (commandSelectedIndex + 1) % filteredCommands.length;
        renderCommandResults();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        commandSelectedIndex = (commandSelectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
        renderCommandResults();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands.length > 0 && filteredCommands[commandSelectedIndex]) {
        filteredCommands[commandSelectedIndex].action();
        closeCommandBar();
      }
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    if (commandbar && commandbar.classList.contains("hidden"))
      openCommandBar();
    else closeCommandBar();
  }
});

// =========================
// SVG Progress Ring Calculator
// =========================
function updateProgressRing() {
  const ring = document.getElementById("today-progress-ring");
  const percentageEl = document.getElementById("progress-ring-percentage");
  const completedEl = document.getElementById("progress-stat-completed");

  if (!ring) return;

  const total = todayState.priorities.length;
  const completed = todayState.priorities.filter(p => p.completed).length;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // r=55: circumference = 2 * PI * 55 = 345.58
  const circ = 345.58;
  const strokeDashoffset = circ - (circ * percentage) / 100;
  ring.style.strokeDashoffset = strokeDashoffset;
  ring.setAttribute("stroke-dasharray", circ);

  if (percentageEl) percentageEl.textContent = `${percentage}%`;
  if (completedEl) completedEl.textContent = `${completed} / ${total}`;
  
  // Update priority count badge
  const badge = document.getElementById("priority-count");
  if (badge) badge.textContent = total;
}

// =========================
// Focus Mode Pomodoro Timer
// =========================
let focusTimerInterval = null;
let focusTimeRemaining = 25 * 60;
let focusTotalDuration = 25 * 60;
let focusActiveTask = null;
let focusIsPaused = false;

const focusOverlay = document.getElementById("focus-overlay");
const focusCloseBtn = document.getElementById("focus-close-btn");
const focusTaskTitle = document.getElementById("focus-task-title");
const focusTimerRing = document.getElementById("focus-timer-ring");
const focusTimerDisplay = document.getElementById("focus-timer-display");
const focusPlayBtn = document.getElementById("focus-play-btn");
const focusResetBtn = document.getElementById("focus-reset-btn");

function startFocusSession(task) {
  if (!focusOverlay) return;
  focusActiveTask = task;
  focusTimeRemaining = 25 * 60;
  focusTotalDuration = 25 * 60;
  focusIsPaused = false;

  if (focusTaskTitle) focusTaskTitle.textContent = task.text;
  focusOverlay.classList.remove("hidden");
  
  if (focusPlayBtn) focusPlayBtn.textContent = "Pause";
  updateFocusTimerUI();

  if (focusTimerInterval) clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(() => {
    if (!focusIsPaused) {
      focusTimeRemaining--;
      updateFocusTimerUI();

      if (focusTimeRemaining <= 0) {
        clearInterval(focusTimerInterval);
        alert(`🎉 Focus session completed: ${task.text}`);
        exitFocusSession();
      }
    }
  }, 1000);
}

function updateFocusTimerUI() {
  if (!focusTimerDisplay) return;
  const mins = Math.floor(focusTimeRemaining / 60);
  const secs = focusTimeRemaining % 60;
  const displayStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  focusTimerDisplay.textContent = displayStr;

  document.title = `[${displayStr}] Focus - NYVRON`;

  if (focusTimerRing) {
    // 2 * PI * r = 2 * 3.14159 * 100 = 628.32
    const offset = 628.32 - (628.32 * focusTimeRemaining) / focusTotalDuration;
    focusTimerRing.style.strokeDashoffset = offset;
  }
}

function exitFocusSession() {
  if (focusTimerInterval) clearInterval(focusTimerInterval);
  if (focusOverlay) focusOverlay.classList.add("hidden");
  document.title = "NYVRON";
  focusActiveTask = null;
}

if (focusCloseBtn) {
  focusCloseBtn.addEventListener("click", exitFocusSession);
}

if (focusPlayBtn) {
  focusPlayBtn.addEventListener("click", () => {
    focusIsPaused = !focusIsPaused;
    focusPlayBtn.textContent = focusIsPaused ? "Resume" : "Pause";
  });
}

if (focusResetBtn) {
  focusResetBtn.addEventListener("click", () => {
    focusTimeRemaining = focusTotalDuration;
    updateFocusTimerUI();
  });
}

// =========================
// Modal Utilities
// =========================

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

// Quick inline modal for simple single-input prompts
function openInlineModal(title, placeholder, callback) {
  // Remove any existing inline modal
  const existing = document.getElementById("_inline-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "_inline-modal";
  overlay.className = "modal-overlay";
  overlay.style.zIndex = "500";
  overlay.innerHTML = `
    <div class="modal-backdrop-tap" id="_inline-backdrop"></div>
    <div class="modal-sheet" style="max-width:420px">
      <div class="sheet-handle"></div>
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close-btn" id="_inline-close" type="button">✕</button>
      </div>
      <div class="modal-body">
        <input id="_inline-input" class="glass-input" type="text" placeholder="${placeholder}" autocomplete="off" />
        <button id="_inline-save" class="ios-action-btn" type="button" style="margin-top:12px">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById("_inline-input");
  const saveBtn = document.getElementById("_inline-save");
  const closeBtn = document.getElementById("_inline-close");
  const backdrop = document.getElementById("_inline-backdrop");

  setTimeout(() => { if (input) input.focus(); }, 100);

  function done() {
    const val = input ? input.value.trim() : "";
    overlay.remove();
    if (val) callback(val);
  }

  function cancel() { overlay.remove(); }

  if (saveBtn) saveBtn.addEventListener("click", done);
  if (closeBtn) closeBtn.addEventListener("click", cancel);
  if (backdrop) backdrop.addEventListener("click", cancel);
  if (input) input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); done(); }
    if (e.key === "Escape") cancel();
  });
}

// Dashboard buttons that used prompt() — upgrade to inline modals
if (dashboardRemindersAddBtn) {
  // Remove existing listeners by replacing the button
  const newBtn = dashboardRemindersAddBtn.cloneNode(true);
  dashboardRemindersAddBtn.parentNode.replaceChild(newBtn, dashboardRemindersAddBtn);
  newBtn.addEventListener("click", () => {
    openInlineModal("Add Reminder", "e.g. Check email at 3pm", (text) => {
      todayState.reminders.push(text);
      saveJSON("nyvron_today", todayState);
      renderTodayReminders();
      renderDashboard();
    });
  });
}

if (dashboardFocusAddBtn) {
  const newBtn = dashboardFocusAddBtn.cloneNode(true);
  dashboardFocusAddBtn.parentNode.replaceChild(newBtn, dashboardFocusAddBtn);
  newBtn.addEventListener("click", () => {
    openInlineModal("Add Focus Task", "e.g. Write chapter outline", (text) => {
      todayState.priorities.push({ id: Date.now(), text, completed: false });
      saveJSON("nyvron_today", todayState);
      renderTodayPriorities();
      renderDashboard();
    });
  });
}

if (dashboardDeadlinesAddBtn) {
  const newBtn = dashboardDeadlinesAddBtn.cloneNode(true);
  dashboardDeadlinesAddBtn.parentNode.replaceChild(newBtn, dashboardDeadlinesAddBtn);
  newBtn.addEventListener("click", () => {
    openModal("calendar-modal");
    const typeSelect = document.getElementById("calendar-event-type");
    if (typeSelect) typeSelect.value = "deadline";
    if (calendarEventDateInput) calendarEventDateInput.value = new Date().toISOString().slice(0, 10);
  });
}

// Dashboard upcoming button opens calendar modal
if (dashboardUpcomingAddBtn) {
  const newBtn = dashboardUpcomingAddBtn.cloneNode(true);
  dashboardUpcomingAddBtn.parentNode.replaceChild(newBtn, dashboardUpcomingAddBtn);
  newBtn.addEventListener("click", () => {
    openModal("calendar-modal");
    if (calendarEventDateInput) calendarEventDateInput.value = new Date().toISOString().slice(0, 10);
  });
}

// Responsive chat side panel
function updateChatSidePanel() {
  const sidePanel = document.getElementById("chat-side-panel");
  if (!sidePanel) return;
  const chatScreen = document.getElementById("screen-chat");
  const isChatActive = chatScreen && chatScreen.classList.contains("active");
  if (window.innerWidth >= 768 && isChatActive) {
    sidePanel.classList.remove("hidden");
  } else {
    sidePanel.classList.add("hidden");
  }
}

window.addEventListener("resize", updateChatSidePanel);

// =========================
// Init
// =========================

applyTheme();
applyFontScale();
applyLogo();

renderTodayPriorities();
renderTodaySchedule();
renderTodayReminders();
renderEnergy();
renderQuickNotes();
renderCountdown();
renderNorthStar();

renderDashboard();

renderCalendarMonth();
renderCalendarDayDetails();

updateTimerDisplay();
renderSessions();
renderObserve();

renderScheduleAll();

renderMemories();
renderKnowledgeBaseUI();
renderReflections();
renderProfile();

ensureActiveChat();
renderChatHistory();
loadChatSessionToUI();

renderTimeCalendar();
renderTimeCalendarSessions();