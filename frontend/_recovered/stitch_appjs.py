import os

app_js_path = "/Users/onkarbhople/nyvron/frontend/app.js"
recovered_funcs_path = "/Users/onkarbhople/nyvron/frontend/_recovered/recovered_app_1783030855.js"

# Read the recovered functions
with open(recovered_funcs_path, "r") as f:
    recovered_funcs_content = f.read()

# Build the header content
header_content = """'use strict';

// ==========================================
// UNIFIED STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
const STATE = {
  activeTab: 'tab-home',
  priorities: JSON.parse(localStorage.getItem('nv-priorities')||'[]'),
  schedule:   JSON.parse(localStorage.getItem('nv-schedule')||'[]'),
  reminders:  JSON.parse(localStorage.getItem('nv-reminders')||'[]'),
  chatMsgs:   JSON.parse(localStorage.getItem('nv-chat')||'[]'),
  events:     JSON.parse(localStorage.getItem('nv-events')||'{}'),
  journalEntries: JSON.parse(localStorage.getItem('nv-journal')||'[]'),
  countdown: JSON.parse(localStorage.getItem('nv-countdown')||'{"title":"","target":""}'),
  books: JSON.parse(localStorage.getItem('nv-books')||'[]'),
  planner: JSON.parse(localStorage.getItem('nv-planner')||'{"Monday":"","Tuesday":"","Wednesday":"","Thursday":"","Friday":"","Saturday":"","Sunday":""}'),
  cascara:{
    subjects: JSON.parse(localStorage.getItem('nv-cascara-subjects')||JSON.stringify([
      {id:'s1',name:'Mathematics',color:'#E8652A',todayMs:0,totalMs:0,_baseMs:0},
      {id:'s2',name:'Physics',color:'#3B82F6',todayMs:0,totalMs:0,_baseMs:0},
    ])),
    sessions: JSON.parse(localStorage.getItem('nv-cascara-sessions')||'[]'),
    activeSubjectId:null, activeStart:null, activeInterval:null, maxFocusMs:0,
  },
  calendarYear:  new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedDate:  null,
  hmYear: new Date().getFullYear(),
  hmMonth: new Date().getMonth(),
  journalEditId: null, selectedMood: '🙂',
  direction: localStorage.getItem('nv-direction')||'Stability, consistency, and confidence.',
  profile: JSON.parse(localStorage.getItem('nv-profile')||'{"name":"User"}'),
};

const $ = id => document.getElementById(id);
const randomId = () => Math.random().toString(36).substring(2, 11);
const today = () => new Date().toLocaleDateString('sv').substring(0, 10);

const ms2hms = (ms) => {
  if (ms < 0) ms = 0;
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const h = Math.floor(ms / (1000 * 60 * 60));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const FALLBACKS = [
  {q:"The secret of getting ahead is getting started.",a:"Mark Twain"},
  {q:"It always seems impossible until it's done.",a:"Nelson Mandela"},
  {q:"Don't watch the clock; do what it does. Keep going.",a:"Sam Levenson"},
  {q:"The future depends on what you do today.",a:"Mahatma Gandhi"},
  {q:"Focus on the step in front of you, not the whole staircase.",a:"Unknown"},
];

const PROMPTS = [
  "What did you learn today?",
  "What went well today?",
  "What could have been better?",
  "What are you grateful for today?",
  "Describe a challenging moment and how you handled it."
];

const save = () => {
  localStorage.setItem('nv-priorities', JSON.stringify(STATE.priorities));
  localStorage.setItem('nv-schedule',   JSON.stringify(STATE.schedule));
  localStorage.setItem('nv-reminders',  JSON.stringify(STATE.reminders));
  localStorage.setItem('nv-chat',       JSON.stringify(STATE.chatMsgs));
  localStorage.setItem('nv-events',     JSON.stringify(STATE.events));
  localStorage.setItem('nv-journal',    JSON.stringify(STATE.journalEntries));
  localStorage.setItem('nv-countdown',  JSON.stringify(STATE.countdown));
  localStorage.setItem('nv-books',      JSON.stringify(STATE.books));
  localStorage.setItem('nv-planner',    JSON.stringify(STATE.planner));
  localStorage.setItem('nv-cascara-subjects', JSON.stringify(STATE.cascara.subjects));
  localStorage.setItem('nv-cascara-sessions', JSON.stringify(STATE.cascara.sessions));
  localStorage.setItem('nv-direction',  STATE.direction);
  localStorage.setItem('nv-profile',    JSON.stringify(STATE.profile));
};

// ==========================================
// INDEXEDDB DOCUMENT STORAGE
// ==========================================
const DB_NAME = 'NyvronFiles';
const STORE_NAME = 'files';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFile(id) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("getFile failed", e);
    return null;
  }
}

async function saveFile(id, blob) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("saveFile failed", e);
  }
}

async function deleteFile(id) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("deleteFile failed", e);
  }
}
"""

# Build the DOMContentLoaded content
dom_content = """
// ==========================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Theme selector
  const themeSel = $('settings-theme');
  const savedTheme = localStorage.getItem('nv-theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;
  if(themeSel) themeSel.value = savedTheme;
  themeSel?.addEventListener('change', () => {
    document.documentElement.dataset.theme = themeSel.value;
    localStorage.setItem('nv-theme', themeSel.value);
  });

  // Profile Edit
  const avatar = $('profile-avatar');
  avatar?.addEventListener('click', () => {
    const newName = prompt('Enter profile name:', STATE.profile.name || 'User');
    if(newName && newName.trim()) {
      STATE.profile.name = newName.trim();
      save();
      renderProfile();
    }
  });

  // Edit direction text
  $('edit-direction-btn')?.addEventListener('click', () => {
    const txtEl = $('direction-text');
    if(!txtEl) return;
    const isEditing = txtEl.contentEditable === 'true';
    if(isEditing) {
      txtEl.contentEditable = 'false';
      $('edit-direction-btn').textContent = '✏️ Edit';
      STATE.direction = txtEl.textContent.trim();
      save();
    } else {
      txtEl.contentEditable = 'true';
      txtEl.focus();
      $('edit-direction-btn').textContent = '💾 Save';
    }
  });

  // Tab switching
  document.querySelectorAll('.tb-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if(btn.dataset.tab) {
        switchTab(btn.dataset.tab);
      }
    });
  });

  // Add priority
  $('add-priority-btn')?.addEventListener('click', () => {
    openModal('Add Priority', `
      <input id="new-priority-inp" class="modal-input" placeholder="What is your priority?" style="width:100%; padding:10px; margin-bottom:12px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:#fff;" />
      <button id="save-priority-btn" class="btn-primary" style="width:100%; padding:10px; border-radius:8px; background:var(--cascara); color:#000; font-weight:bold; border:none; cursor:pointer;">Save Priority</button>
    `);
    setTimeout(() => {
      const inp = $('new-priority-inp');
      inp?.focus();
      inp?.addEventListener('keydown', e => {
        if(e.key === 'Enter') $('save-priority-btn')?.click();
      });
      $('save-priority-btn')?.addEventListener('click', () => {
        const txt = inp.value.trim();
        if(txt) {
          STATE.priorities.push({ id: randomId(), text: txt, done: false });
          save();
          renderPriorities();
          closeModal();
        }
      });
    }, 50);
  });

  // Add schedule
  $('add-schedule-btn')?.addEventListener('click', () => {
    openModal('Add Schedule Block', `
      <div style="margin-bottom:12px;">
        <label style="font-size:11px;color:var(--txt3);display:block;margin-bottom:4px;">TIME</label>
        <input id="new-schedule-time" type="time" class="modal-input" style="width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:#fff;" />
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:11px;color:var(--txt3);display:block;margin-bottom:4px;">EVENT TITLE</label>
        <input id="new-schedule-title" class="modal-input" placeholder="e.g., Mathematics Focus" style="width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:#fff;" />
      </div>
      <button id="save-schedule-btn" class="btn-primary" style="width:100%; padding:10px; border-radius:8px; background:var(--cascara); color:#000; font-weight:bold; border:none; cursor:pointer;">Save Block</button>
    `);
    setTimeout(() => {
      $('new-schedule-time').value = new Date().toTimeString().substring(0, 5);
      $('new-schedule-title').focus();
      $('new-schedule-title').addEventListener('keydown', e => {
        if(e.key === 'Enter') $('save-schedule-btn').click();
      });
      $('save-schedule-btn')?.addEventListener('click', () => {
        const time = $('new-schedule-time').value;
        const title = $('new-schedule-title').value.trim();
        if(title) {
          STATE.schedule.push({ id: randomId(), time: time || '09:00', title });
          save();
          renderSchedule();
          closeModal();
        }
      });
    }, 50);
  });

  // Add reminder
  $('add-reminder-btn')?.addEventListener('click', () => {
    openModal('Add Reminder', `
      <input id="new-reminder-inp" class="modal-input" placeholder="e.g., Drink water, Stretch..." style="width:100%; padding:10px; margin-bottom:12px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:#fff;" />
      <button id="save-reminder-btn" class="btn-primary" style="width:100%; padding:10px; border-radius:8px; background:var(--cascara); color:#000; font-weight:bold; border:none; cursor:pointer;">Save Reminder</button>
    `);
    setTimeout(() => {
      const inp = $('new-reminder-inp');
      inp?.focus();
      inp?.addEventListener('keydown', e => {
        if(e.key === 'Enter') $('save-reminder-btn').click();
      });
      $('save-reminder-btn')?.addEventListener('click', () => {
        const txt = inp.value.trim();
        if(txt) {
          STATE.reminders.push({ id: randomId(), text: txt, done: false });
          save();
          renderReminders();
          closeModal();
        }
      });
    }, 50);
  });

  // Add new journal entry
  $('new-entry-btn')?.addEventListener('click', () => openJournalWrite());

  // Close journal write modal
  $('jw-close')?.addEventListener('click', () => $('journal-write-overlay')?.classList.add('hidden'));

  // Save journal entry
  $('jw-save')?.addEventListener('click', saveJournalEntry);

  // Delete journal entry button in jw modal
  $('jw-tool-del')?.addEventListener('click', () => {
    if(STATE.journalEditId) {
      if(confirm('Are you sure you want to delete this journal entry?')) {
        STATE.journalEntries = STATE.journalEntries.filter(e => e.id !== STATE.journalEditId);
        save();
        renderJournal();
        $('journal-write-overlay')?.classList.add('hidden');
      }
    }
  });

  // Share journal entry button (just copies to clipboard)
  $('jw-tool-share')?.addEventListener('click', () => {
    const title = $('jw-title').value;
    const body = $('jw-body').value;
    if(navigator.clipboard) {
      navigator.clipboard.writeText(`${title}\\n\\n${body}`).then(() => alert('Copied to clipboard!'));
    }
  });

  // Calendar event creation
  $('cal-add-event-btn')?.addEventListener('click', openCalCreator);
  $('cal-close-panel')?.addEventListener('click', () => $('cal-day-panel')?.classList.remove('open'));
  $('cal-prev')?.addEventListener('click', () => {
    STATE.calendarMonth--;
    if(STATE.calendarMonth < 0) { STATE.calendarMonth = 11; STATE.calendarYear--; }
    renderCalendar();
  });
  $('cal-next')?.addEventListener('click', () => {
    STATE.calendarMonth++;
    if(STATE.calendarMonth > 11) { STATE.calendarMonth = 0; STATE.calendarYear++; }
    renderCalendar();
  });

  $('cc-cancel')?.addEventListener('click', closeCalCreator);
  $('cc-save')?.addEventListener('click', () => {
    const title = $('cc-title')?.value.trim();
    if(!title) return;
    const isAllDay = $('cc-allday')?.checked;
    const startTime = $('cc-start-time')?.value || '12:00';
    
    const dateStr = STATE.selectedDate || today();
    
    const newEv = {
      id: randomId(),
      title,
      allday: isAllDay,
      time: isAllDay ? 'All day' : startTime,
      notes: $('cc-notes')?.value || '',
    };
    
    if(!STATE.events[dateStr]) STATE.events[dateStr] = [];
    STATE.events[dateStr].push(newEv);
    
    save();
    renderCalendar();
    renderCalEvents(dateStr);
    closeCalCreator();
  });

  // Heatmap month navigation
  $('hm-prev')?.addEventListener('click', () => {
    STATE.hmMonth--;
    if(STATE.hmMonth < 0) { STATE.hmMonth = 11; STATE.hmYear--; }
    renderHeatmap();
  });
  $('hm-next')?.addEventListener('click', () => {
    STATE.hmMonth++;
    if(STATE.hmMonth > 11) { STATE.hmMonth = 0; STATE.hmYear++; }
    renderHeatmap();
  });

  // Cascara sub-tabs switching
  document.querySelectorAll('.ctab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.cascara-panel').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      const panelId = btn.dataset.ctab;
      $(panelId)?.classList.remove('hidden');
      if(panelId === 'ctab-stats') {
        renderHeatmap();
      }
    });
  });

  // Add study subject
  $('cascara-add-subject')?.addEventListener('click', () => {
    const name = prompt('Enter subject name:');
    if (name && name.trim()) {
      const colors = ['#E8652A', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      STATE.cascara.subjects.push({
        id: randomId(),
        name: name.trim(),
        color: randomColor,
        todayMs: 0,
        totalMs: 0,
        _baseMs: 0
      });
      save();
      renderCascaraSubjects();
    }
  });

  // Upload book
  $('cascara-new-book')?.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pdf,.txt';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.click();
    inp.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const id = randomId();
      const fileType = file.name.endsWith('.pdf') ? 'pdf' : 'txt';
      const title = file.name.replace(/\\.[^/.]+$/, "");
      
      if (fileType === 'pdf') {
        await saveFile(id, file);
        STATE.books.push({
          id,
          title,
          fileType,
          progress: 0,
          currentPage: 1,
          totalPages: 1
        });
      } else {
        const reader = new FileReader();
        reader.onload = function() {
          STATE.books.push({
            id,
            title,
            fileType,
            fileContent: this.result,
            progress: 0,
            currentPage: 1,
            totalPages: Math.ceil(this.result.split(/\\s+/).length / 200) || 1
          });
          save();
          renderBooks();
        };
        reader.readAsText(file);
        return;
      }
      save();
      renderBooks();
    });
  });

  // Global body click delegation
  document.body.addEventListener('click', e => {
    // Toggling checklists
    if (e.target.classList.contains('rem-check')) {
      const id = e.target.dataset.id;
      const priority = STATE.priorities.find(p => p.id === id);
      if (priority) {
        priority.done = !priority.done;
        save();
        renderPriorities();
        return;
      }
      const reminder = STATE.reminders.find(r => r.id === id);
      if (reminder) {
        reminder.done = !reminder.done;
        save();
        renderReminders();
        return;
      }
    }

    // Swipe delete buttons
    if (e.target.classList.contains('rem-del-swipe')) {
      const id = e.target.dataset.id;
      const pIdx = STATE.priorities.findIndex(p => p.id === id);
      if (pIdx > -1) {
        STATE.priorities.splice(pIdx, 1);
        save();
        renderPriorities();
        return;
      }
      const rIdx = STATE.reminders.findIndex(r => r.id === id);
      if (rIdx > -1) {
        STATE.reminders.splice(rIdx, 1);
        save();
        renderReminders();
        return;
      }
    }

    // Cascara subject play/stop Focus session
    if (e.target.closest('.cascara-play-btn')) {
      const btn = e.target.closest('.cascara-play-btn');
      const sid = btn.dataset.sid;
      if (STATE.cascara.activeSubjectId === sid) {
        stopCascaraSession();
      } else {
        startCascaraSession(sid);
      }
    }

    // Cascara subject more button
    if (e.target.closest('.cascara-more-btn')) {
      const btn = e.target.closest('.cascara-more-btn');
      const sid = btn.dataset.sid;
      const sname = btn.dataset.sname;
      openModal(`Manage Subject: ${sname}`, `
        <button id="del-subject-btn" class="btn-danger" style="width:100%; padding:10px; border-radius:8px; background:#b91c1c; color:#fff; font-weight:bold; border:none; cursor:pointer; margin-bottom:12px;">Delete Subject</button>
        <button id="rename-subject-btn" class="btn-primary" style="width:100%; padding:10px; border-radius:8px; background:var(--cascara); color:#000; font-weight:bold; border:none; cursor:pointer;">Rename Subject</button>
      `);
      setTimeout(() => {
        $('del-subject-btn')?.addEventListener('click', () => {
          if(confirm('Are you sure you want to delete this subject and all its sessions?')) {
            STATE.cascara.subjects = STATE.cascara.subjects.filter(s => s.id !== sid);
            STATE.cascara.sessions = STATE.cascara.sessions.filter(s => s.subjectId !== sid);
            save();
            renderCascaraSubjects();
            renderHeatmap();
            closeModal();
          }
        });
        $('rename-subject-btn')?.addEventListener('click', () => {
          const newName = prompt('Enter new subject name:', sname);
          if(newName && newName.trim()) {
            const sub = STATE.cascara.subjects.find(s => s.id === sid);
            if(sub) {
              sub.name = newName.trim();
              save();
              renderCascaraSubjects();
              closeModal();
            }
          }
        });
      }, 50);
    }

    // Book cover click to open reader
    if (e.target.closest('.book-cover-card')) {
      const bid = e.target.closest('.book-cover-card').dataset.id;
      const book = STATE.books.find(b => b.id === bid);
      if(book) {
        openBookReader(book);
      }
    }

    // Calendar day event deletion
    if (e.target.closest('.cal-event-del')) {
      const btn = e.target.closest('.cal-event-del');
      const evId = btn.dataset.id;
      const dateStr = STATE.selectedDate || today();
      if (STATE.events[dateStr]) {
        STATE.events[dateStr] = STATE.events[dateStr].filter(ev => ev.id !== evId);
        save();
        renderCalendar();
        renderCalEvents(dateStr);
      }
    }
  });

  // Spotlight search
  $('dock-search-btn')?.addEventListener('click', openSpotlight);
  $('spotlight-backdrop')?.addEventListener('click', closeSpotlight);
  
  const spotInp = $('spotlight-input');
  if(spotInp) {
    spotInp.addEventListener('input', (e) => {
      renderSpotlightResults(e.target.value);
    });
  }

  // Keyboard navigation / shortcut for search
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSpotlight();
    }
    if (e.key === 'Escape') {
      closeSpotlight();
    }
  });

  // Clock loop
  setInterval(updateClock, 1000);
  updateClock();

  // Initial renders
  renderPriorities();
  renderSchedule();
  renderReminders();
  renderCountdown();
  renderCalendar();
  renderJournal();
  renderBooks();
  renderProfile();
  
  // Load initial active tab
  switchTab(STATE.activeTab);
});
"""

# Stitch it all together
with open(app_js_path, "w") as f:
    f.write(header_content)
    f.write("\n")
    f.write(recovered_funcs_content)
    f.write("\n")
    f.write(dom_content)

print("Stitched and saved app.js perfectly!")
