// ================================
// NYVRON Frontend Controller
// ================================

// ---- AI CONFIG ----
// Single place to change your backend endpoint.
// No localhost:3001; just call Vercel function
const AI_ENDPOINT = "/api/chat";

// Optional: timeout for AI calls (ms)
const AI_TIMEOUT_MS = 60000;

// ---- UTILITIES ----
function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// ---- CHAT RENDERING ----
function appendMessage(role, text, options = {}) {
  const container = $("#chat-messages");
  if (!container) return;

  const msg = document.createElement("div");
  msg.classList.add("chat-msg");

  if (role === "user") {
    msg.classList.add("user");
  } else {
    msg.classList.add("assistant");
  }

  if (options.extraClass) {
    msg.classList.add(options.extraClass);
  }

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;

  const time = document.createElement("div");
  time.classList.add("msg-time");
  time.textContent = formatTime();

  msg.appendChild(bubble);
  msg.appendChild(time);
  container.appendChild(msg);

  container.scrollTop = container.scrollHeight;
  return msg;
}

// ---- THINKING BAR ----
function showThinkingBar() {
  const bar = $("#chat-thinking-status");
  if (bar) bar.classList.remove("hidden");
}

function hideThinkingBar() {
  const bar = $("#chat-thinking-status");
  if (bar) bar.classList.add("hidden");
}

// ---- AI STATUS (ONLINE / OFFLINE) ----
function setAIStatus(online) {
  const statusLabel = $("#ai-status-label");
  const offlineBadge = $("#offline-badge");
  const app = $("#app-root");

  if (statusLabel) {
    statusLabel.textContent = online ? "AI online" : "AI offline";
  }

  if (offlineBadge) {
    if (online) {
      offlineBadge.classList.add("hidden");
    } else {
      offlineBadge.classList.remove("hidden");
    }
  }

  if (app) {
    if (!online) {
      app.classList.add("emergency");
    } else {
      app.classList.remove("emergency");
    }
  }
}

// ---- FETCH WITH TIMEOUT ----
async function fetchWithTimeout(url, options = {}, timeout = AI_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ---- SEND MESSAGE TO AI ----
async function sendMessage() {
  const input = $("#chat-input");
  if (!input) return;

  const message = input.value.trim();
  if (!message) return;

  // User message
  appendMessage("user", message);
  input.value = "";

  // Show thinking bar
  showThinkingBar();

  // Optional: mark AI as busy later if you want
  try {
    const response = await fetchWithTimeout(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        mode: getCurrentChatMode(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.reply || "(no reply from AI)";

    appendMessage("assistant", reply);
    setAIStatus(true);
  } catch (err) {
    console.error("Error calling backend:", err);
    appendMessage("assistant", "Error talking to NYVRON backend. Check your connection or server.");
    setAIStatus(false);
  } finally {
    hideThinkingBar();
  }
}

// ---- CHAT MODE ----
function getCurrentChatMode() {
  const activeBtn = document.querySelector(".chat-mode-btn.active");
  return activeBtn ? activeBtn.dataset.chatMode || "default" : "default";
}

function setupChatModes() {
  $all(".chat-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $all(".chat-mode-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// ---- QUICK ACTIONS ----
function setupQuickActions() {
  $all(".chat-quick-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      if (!prompt) return;
      const input = $("#chat-input");
      if (!input) return;
      input.value = prompt;
      input.focus();
    });
  });
}

// ---- NAVIGATION (SIDEBAR + BOTTOM NAV) ----
function showScreen(targetId) {
  $all(".screen").forEach((screen) => {
    if (screen.id === targetId) {
      screen.classList.add("active");
    } else {
      screen.classList.remove("active");
    }
  });
}

function setupNavigation() {
  // Sidebar
  $all(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-screen-target");
      if (!target) return;

      $all(".nav-item").forEach((n) => n.classList.remove("active"));
      item.classList.add("active");

      showScreen(target);

      // Sync bottom nav if present
      $all(".bottom-nav-item").forEach((b) => {
        const t = b.getAttribute("data-screen-target");
        if (t === target) {
          b.classList.add("active");
        } else {
          b.classList.remove("active");
        }
      });
    });
  });

  // Bottom nav (mobile)
  $all(".bottom-nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-screen-target");
      if (!target) return;

      $all(".bottom-nav-item").forEach((b) => b.classList.remove("active"));
      item.classList.add("active");

      showScreen(target);

      // Sync sidebar
      $all(".nav-item").forEach((n) => {
        const t = n.getAttribute("data-screen-target");
        if (t === target) {
          n.classList.add("active");
        } else {
          n.classList.remove("active");
        }
      });
    });
  });
}

// ---- THEME TOGGLE ----
function getStoredTheme() {
  return localStorage.getItem("nyvron-theme");
}

function setTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  localStorage.setItem("nyvron-theme", theme);
}

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme") || "dark";
  setTheme(current === "dark" ? "light" : "dark");
}

function initTheme() {
  const stored = getStoredTheme();
  if (stored === "dark" || stored === "light") {
    setTheme(stored);
  } else {
    // default: dark
    setTheme("dark");
  }
}

// ---- CLOCK / TODAY INFO ----
function updateTopbarClock() {
  const el = $("#topbar-clock");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function updateTodayHeader() {
  const timeEl = $("#today-time");
  const tzEl = $("#today-timezone");
  const dateEl = $("#today-date");
  const greetingEl = $("#today-greeting");

  const now = new Date();

  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  if (tzEl) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
    tzEl.textContent = `${tz} · Auto-detected`;
  }

  if (dateEl) {
    const dateStr = now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    dateEl.textContent = dateStr;
  }

  if (greetingEl) {
    const hours = now.getHours();
    let greeting = "Hello";
    if (hours < 12) greeting = "Good morning.";
    else if (hours < 18) greeting = "Good afternoon.";
    else greeting = "Good evening.";
    greetingEl.textContent = greeting;
  }
}

// ---- ENERGY & LOW-ENERGY BANNER ----
function setupEnergySelector() {
  const energySelector = $("#energy-selector");
  const banner = $("#low-energy-banner");
  if (!energySelector || !banner) return;

  energySelector.addEventListener("click", (e) => {
    const btn = e.target.closest(".energy-btn");
    if (!btn) return;

    const energy = btn.dataset.energy;
    $all(".energy-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    if (energy === "low") {
      banner.classList.add("active");
    } else {
      banner.classList.remove("active");
    }
  });

  const dismiss = $("#low-energy-dismiss");
  if (dismiss) {
    dismiss.addEventListener("click", () => {
      banner.classList.remove("active");
    });
  }
}

// ---- TIMER ----
let timerInterval = null;
let timerSeconds = 0;

function formatTimer(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function updateTimerDisplay() {
  const display = $("#timer-display");
  if (!display) return;
  display.textContent = formatTimer(timerSeconds);
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timerSeconds += 1;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  stopTimer();
  timerSeconds = 0;
  updateTimerDisplay();
}

function setupTimerControls() {
  const startBtn = $("#timer-start-btn");
  const stopBtn = $("#timer-stop-btn");
  const resetBtn = $("#timer-reset-btn");

  if (startBtn) startBtn.addEventListener("click", startTimer);
  if (stopBtn) stopBtn.addEventListener("click", stopTimer);
  if (resetBtn) resetBtn.addEventListener("click", resetTimer);
}

// ---- COMMAND BAR (⌘K / Ctrl+K) ----
function openCommandBar() {
  const overlay = $("#commandbar-overlay");
  const input = $("#commandbar-input");
  if (!overlay || !input) return;
  overlay.classList.remove("hidden");
  input.value = "";
  input.focus();
}

function closeCommandBar() {
  const overlay = $("#commandbar-overlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
}

function setupCommandBar() {
  const trigger = $("#commandbar-trigger");
  if (trigger) {
    trigger.addEventListener("click", openCommandBar);
  }

  document.addEventListener("keydown", (e) => {
    const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
    if (isCmdK) {
      e.preventDefault();
      openCommandBar();
    }
    if (e.key === "Escape") {
      closeCommandBar();
    }
  });

  const overlay = $("#commandbar-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeCommandBar();
      }
    });
  }
}

// ---- INITIALISATION ----
document.addEventListener("DOMContentLoaded", () => {
  // Theme
  initTheme();
  const themeToggleBtn = $("#theme-toggle-btn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  // Navigation
  setupNavigation();

  // Chat
  const sendBtn = $("#chat-send-btn");
  const input = $("#chat-input");

  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  setupChatModes();
  setupQuickActions();

  // Energy / low-energy
  setupEnergySelector();

  // Timer
  setupTimerControls();
  updateTimerDisplay();

  // Command bar
  setupCommandBar();

  // Clocks
  updateTopbarClock();
  updateTodayHeader();
  setInterval(updateTopbarClock, 30000);
  setInterval(updateTodayHeader, 30000);

  // Initial AI status (assume online; will update on failure)
  setAIStatus(true);
});