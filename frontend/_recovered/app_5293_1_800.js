// =========================
// FIREBASE SYNC INTEGRATION
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAW71Yvb9X5iigyEu6e9m2p19N54q9I52Y",
  authDomain: "nyvron-sync.firebaseapp.com",
  projectId: "nyvron-sync",
  storageBucket: "nyvron-sync.firebasestorage.app",
  messagingSenderId: "484077527702",
  appId: "1:484077527702:web:5c98ec95e9f412959f18b7"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let currentUser = null;
let isSyncing = false;

// Initialize UI
const authOverlay = document.getElementById("auth-overlay");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authError = document.getElementById("auth-error");
const authLoginBtn = document.getElementById("auth-login-btn");
const authSignupBtn = document.getElementById("auth-signup-btn");

if (authLoginBtn) {
  authLoginBtn.addEventListener("click", () => {
    signInWithEmailAndPassword(auth, authEmail.value, authPassword.value)
      .catch(err => { authError.innerText = err.message; authError.style.display = 'block'; });
  });
}

if (authSignupBtn) {
  authSignupBtn.addEventListener("click", () => {
    createUserWithEmailAndPassword(auth, authEmail.value, authPassword.value)
      .catch(err => { authError.innerText = err.message; authError.style.display = 'block'; });
  });
}

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    if (authOverlay) authOverlay.style.display = 'none';
    setupFirestoreSync();
  } else {
    currentUser = null;
    if (authOverlay) authOverlay.style.display = 'flex';
  }
});

function setupFirestoreSync() {
  const keys = [
    "nyvron_today", "nyvron_calendar", "nyvron_timer", "nyvron_schedule", 
    "nyvron_memory", "nyvron_reflection", "nyvron_profile", "nyvron_chat"
  ];
  
  keys.forEach(key => {
    onSnapshot(doc(db, "users", currentUser.uid, "data", key), (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data().data;
        if (JSON.stringify(cloudData) !== localStorage.getItem(key)) {
           isSyncing = true;
           localStorage.setItem(key, JSON.stringify(cloudData));
           
           if (key === "nyvron_today") Object.assign(todayState, cloudData);
           if (key === "nyvron_calendar") Object.assign(calendarState, cloudData);
           if (key === "nyvron_timer") Object.assign(timerState, cloudData);
           if (key === "nyvron_schedule") Object.assign(scheduleState, cloudData);
           if (key === "nyvron_memory") Object.assign(memoryState, cloudData);
           if (key === "nyvron_reflection") Object.assign(reflectionState, cloudData);
           if (key === "nyvron_profile") Object.assign(profileState, cloudData);
           if (key === "nyvron_chat") Object.assign(chatState, cloudData);
           
           reRenderAll();
           isSyncing = false;
        }
      }
    });
  });
}

function reRenderAll() {
  try {
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
  } catch(e) {
    console.error("Error during re-render sync:", e);
  }
}

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
    if (currentUser && !isSyncing && key.startsWith("nyvron_")) {
      setDoc(doc(db, "users", currentUser.uid, "data", key), { data: value }, { merge: true })
        .catch(err => console.error("Firestore sync error:", err));
    }
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
