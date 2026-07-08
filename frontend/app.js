'use strict';



// ==========================================
// UNIFIED STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
const STATE = {
  activeTab: 'tab-ai',
  priorities: JSON.parse(localStorage.getItem('nv-priorities')||'[]'),
  schedule:   JSON.parse(localStorage.getItem('nv-schedule')||'[]'),
  reminders:  JSON.parse(localStorage.getItem('nv-reminders')||'[]'),
  chatMsgs:   JSON.parse(localStorage.getItem('nv-chat')||'[]'),
  events:     JSON.parse(localStorage.getItem('nv-events')||'{}'),
  journalEntries: [],
  ephemeralEntries: JSON.parse(localStorage.getItem('nv-ephemeral')||'[]'),
  flashcards: JSON.parse(localStorage.getItem('nv-flashcards') || '[]'),
  interactionLog: JSON.parse(localStorage.getItem('nv-interaction-log') || '[]'),
  reflowPatches: JSON.parse(localStorage.getItem('nv-reflow-patches') || '{}'),
  synthesisNotes: JSON.parse(localStorage.getItem('nv-synthesis-notes') || '[]'),
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
  isDecoySession: false,
  calendarYear:  new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedDate:  null,
  hmYear: new Date().getFullYear(),
  hmMonth: new Date().getMonth(),
  selectedMood: '🙂',
  journalEditId: null,
  journalEditAttachments: [],
  direction: localStorage.getItem('nv-direction')||'Stability, consistency, and confidence.',
  profile: JSON.parse(localStorage.getItem('nv-profile')||'{"name":"User"}'),
  
  // Passcode & Biometric security states
  passcodeEnabled: localStorage.getItem('nv-passcode-enabled') === 'true',
  facelockEnabled: localStorage.getItem('nv-facelock-enabled') === 'true',
  fingerprintlockEnabled: localStorage.getItem('nv-fingerprintlock-enabled') === 'true',
  passcode: localStorage.getItem('nv-passcode') || '1234',
  vaultLocked: true,
  lockTargetTab: null,
  lockTargetEditId: null,
  lockTargetAction: null,
};

const $ = id => document.getElementById(id);
const randomId = () => Math.random().toString(36).substring(2, 11);
let notifiedItems = JSON.parse(sessionStorage.getItem('nv-notified')) || [];
const today = () => new Date().toLocaleDateString('sv').substring(0, 10);

const logInteraction = (type, data = {}) => {
  const logEntry = {
    id: randomId(),
    type,
    data,
    timestamp: Date.now()
  };
  STATE.interactionLog = STATE.interactionLog || [];
  STATE.interactionLog.push(logEntry);
  localStorage.setItem('nv-interaction-log', JSON.stringify(STATE.interactionLog));
  if (typeof broadcastSyncEvent === 'function') {
    broadcastSyncEvent('sync-log', logEntry);
  }
};

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
  "Describe a challenging moment and how you handled it.",
  "What's something you've been avoiding? Why?",
  "Write about the last time you felt genuinely proud of yourself.",
  "What would make tomorrow better than today?",
  "Describe your current mood in exactly three words.",
  "What's one thing you want to remember about today?",
  "Who made you feel good recently, and why?",
  "What's a fear you're ready to face?",
  "Write about a small moment of beauty you noticed today.",
  "What does your ideal self look like one year from now?",
  "What do you need to let go of?",
];

const GRADIENTS = [
  'linear-gradient(135deg, #FF6B6B, #FF8E53)',
  'linear-gradient(135deg, #4E54C8, #8F94FB)',
  'linear-gradient(135deg, #11998e, #38ef7d)',
  'linear-gradient(135deg, #FC466B, #3F5EFB)',
  'linear-gradient(135deg, #7F00FF, #E100FF)',
  'linear-gradient(135deg, #00c6ff, #0072ff)',
  'linear-gradient(135deg, #f12711, #f5af19)'
];

let BLOOM = null;
let currentCreatorTab = 'event';

const COMMUTE_QUESTIONS = [
  "What's the one thing you absolutely must accomplish this week?",
  "Describe a recent moment that made you smile without expecting it.",
  "What's a belief you held last year that you've since changed?",
  "Who's someone you'd like to reconnect with, and what's stopping you?",
  "If you could change one thing about your daily routine, what would it be?",
  "What's something you've been learning that excites you?",
  "Describe the last time you stepped out of your comfort zone.",
  "What are three things you're grateful for right now?",
  "What would you do with a free, unplanned Saturday?",
  "What's a habit you want to build, and why haven't you started yet?",
];

const MOOD_MAP = {
  '😔': 'sad', '😐': 'neutral', '🙂': 'good', '😊': 'happy', '🤩': 'amazing',
  '😫': 'sad', '😀': 'happy', '🥱': 'neutral', '🎨': 'good',
};


// --- Swipe Gesture Utility ---
function setupSwipeGesture(element, options = {}) {
  const {
    direction = 'x', // 'x' or 'y'
    maxDistance = -80,
    containerSelector = '.swipe-content',
    deleteLayerSelector = '.book-delete-layer', // for y direction
    isJournalCard = false,
    onDeleteTrigger = null
  } = options;
  
  const content = element.querySelector(containerSelector);
  const deleteLayer = element.querySelector(deleteLayerSelector);
  if (!content) return;
  
  let startVal = 0;
  let currentVal = 0;
  let isDragging = false;
  let dragMultiplier = 1.0;
  let wheelTimeout;
  
  const setTransform = (val, immediate = false) => {
    content.style.transition = immediate ? 'none' : `transform 0.3s var(--spring)`;
    if (direction === 'x') {
      content.style.transform = `translateX(${val}px)`;
    } else {
      content.style.transform = `translateY(${val}px)`;
      if (deleteLayer) {
        deleteLayer.style.transition = immediate ? 'none' : 'opacity 0.2s ease';
        deleteLayer.style.opacity = immediate ? Math.min(1, Math.abs(val) / Math.abs(maxDistance)) : (val <= (maxDistance+20) ? '1' : '0');
        deleteLayer.style.pointerEvents = val <= (maxDistance+20) ? 'auto' : 'none';
      }
    }
  };
  
  const handleStart = (val, multiplier = 1.0) => {
    startVal = val;
    isDragging = false;
    dragMultiplier = multiplier;
    content.style.userSelect = 'none';
    content.style.webkitUserSelect = 'none';
    // Don't overwrite transform, start from whatever the current layout shift is
    const match = content.style.transform.match(/translateX\(([-\d.]+)px\)/);
    currentVal = match ? parseFloat(match[1]) : 0;
  };
  
  const handleMove = (val) => {
    const delta = (val - startVal) * dragMultiplier;
    if (Math.abs(delta) > 8) isDragging = true;
    if (isDragging) {
      if (isJournalCard) {
        // swipe left only
        if (delta < 0) {
          const move = delta;
          setTransform(move, true);
          currentVal = move;
        }
      } else {
        if (delta < 0 && delta > maxDistance - 20) {
          currentVal = delta;
          setTransform(delta, true);
        }
      }
    }
  };
  
  const handleEnd = () => {
    content.style.userSelect = '';
    content.style.webkitUserSelect = '';
    if (!isDragging) return;
    
    if (isJournalCard) {
      const width = element.offsetWidth || 300;
      const absVal = Math.abs(currentVal);
      
      if (absVal > width * 0.50) {
        // Swipe > 50%: Instantly slide out & collapse vertical height to 0px
        content.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        content.style.transform = 'translateX(-100%)';
        setTimeout(() => {
          element.style.transition = 'height 0.25s cubic-bezier(0.16, 1, 0.3, 1), padding 0.25s cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
          element.style.height = '0px';
          element.style.paddingTop = '0px';
          element.style.paddingBottom = '0px';
          element.style.marginBottom = '0px';
          element.style.overflow = 'hidden';
          setTimeout(() => {
            if (onDeleteTrigger) onDeleteTrigger();
          }, 250);
        }, 150);
      } else if (absVal >= width * 0.15) {
        // Swipe between 15% and 50%: Card snaps open to a fixed button width (120px)
        currentVal = -120;
        setTransform(currentVal, false);
      } else {
        // Swipe < 15%: Snaps back shut
        currentVal = 0;
        setTransform(currentVal, false);
      }
    } else {
      if (currentVal < maxDistance / 2) {
        currentVal = maxDistance;
      } else {
        currentVal = 0;
      }
      setTransform(currentVal, false);
    }
  };

  // Touch triggers
  element.addEventListener('touchstart', e => {
    if (e.target.closest('button, .rem-check, .book-dots-btn, .jc-hover-del')) return;
    handleStart(direction === 'x' ? e.touches[0].clientX : e.touches[0].clientY, 1.0);
  }, {passive: true});

  element.addEventListener('touchmove', e => {
    if (e.target.closest('button, .rem-check, .book-dots-btn, .jc-hover-del')) return;
    handleMove(direction === 'x' ? e.touches[0].clientX : e.touches[0].clientY);
  }, {passive: true});

  element.addEventListener('touchend', e => {
    if (e.target.closest('button, .rem-check, .book-dots-btn, .jc-hover-del')) return;
    handleEnd();
  });

  // Mouse triggers with scaled resistance (0.6x drag multiplier)
  element.addEventListener('mousedown', e => {
    if (e.target.closest('button, .rem-check, .book-dots-btn, .jc-hover-del')) return;
    handleStart(direction === 'x' ? e.clientX : e.clientY, 0.6);
    const onMouseMove = (moveE) => handleMove(direction === 'x' ? moveE.clientX : moveE.clientY);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      handleEnd();
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
  
  // Trackpad (Wheel)
  element.addEventListener('wheel', e => {
    if (e.target.closest('.jw-body, .scroll-area, .book-reader-content')) return;
    const delta = direction === 'x' ? e.deltaX : e.deltaY;
    const crossDelta = direction === 'x' ? e.deltaY : e.deltaX;
    
    if (Math.abs(delta) > Math.abs(crossDelta) && Math.abs(delta) > 5) {
      e.preventDefault();
      currentVal -= delta;
      if (currentVal > 0) currentVal = 0;
      if (currentVal < maxDistance - 20) currentVal = maxDistance - 20;
      
      setTransform(currentVal, true);
      
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        isDragging = true;
        handleEnd();
      }, 50);
    }
  }, {passive: false});
}

// --- ZERO-KNOWLEDGE CRYPTOGRAPHY & DECOY STATE ---
const DECOY_ENTRIES = [
  {
    id: 'decoy-1',
    date: new Date().toISOString(),
    title: 'Morning Yoga and Meditation',
    body: '<p>Felt very calm and relaxed today during the morning stretching sequence. Highly recommend this routine.</p>',
    mood: '😊',
    gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
    attachments: []
  },
  {
    id: 'decoy-2',
    date: new Date(Date.now() - 86400000).toISOString(),
    title: 'Guitar Practice Goals',
    body: '<p>Practiced the pentatonic scale for 30 minutes. Finger speed is slowly improving. Next up is working on chord changes.</p>',
    mood: '🙂',
    gradient: 'linear-gradient(135deg, #4E54C8, #8F94FB)',
    attachments: []
  }
];

function encryptData(text, key) {
  if (!text) return '';
  // v2: encode first so emojis become ASCII, avoiding invalid surrogate pairs during XOR
  const safeText = encodeURIComponent(text);
  let res = '';
  for (let i = 0; i < safeText.length; i++) {
    res += String.fromCharCode(safeText.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return 'v2|' + btoa(res);
}

function decryptData(encoded, key) {
  if (!encoded) return '';
  try {
    if (encoded.startsWith('v2|')) {
      const text = atob(encoded.substring(3));
      let res = '';
      for (let i = 0; i < text.length; i++) {
        res += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return decodeURIComponent(res);
    } else {
      // Legacy decryption
      const text = decodeURIComponent(atob(encoded));
      let res = '';
      for (let i = 0; i < text.length; i++) {
        res += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return res;
    }
  } catch(e) {
    return '';
  }
}

const save = () => {
  localStorage.setItem('nv-priorities', JSON.stringify(STATE.priorities));
  localStorage.setItem('nv-schedule',   JSON.stringify(STATE.schedule));
  localStorage.setItem('nv-reminders',  JSON.stringify(STATE.reminders));
  localStorage.setItem('nv-chat',       JSON.stringify(STATE.chatMsgs));
  localStorage.setItem('nv-events',     JSON.stringify(STATE.events));
  localStorage.setItem('nv-countdown',  JSON.stringify(STATE.countdown));
  localStorage.setItem('nv-books',      JSON.stringify(STATE.books));
  localStorage.setItem('nv-planner',    JSON.stringify(STATE.planner));
  localStorage.setItem('nv-cascara-subjects', JSON.stringify(STATE.cascara.subjects));
  localStorage.setItem('nv-cascara-sessions', JSON.stringify(STATE.cascara.sessions));
  localStorage.setItem('nv-direction',  STATE.direction);
  localStorage.setItem('nv-profile',    JSON.stringify(STATE.profile));
  
  // Encrypt journal entries with current passcode
  if (!STATE.isDecoySession) {
    const serialized = JSON.stringify(STATE.journalEntries);
    localStorage.setItem('nv-journal-enc', encryptData(serialized, STATE.passcode));
  }
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
  console.log("getFile: request initiated for ID:", id);
  try {
    const db = await Promise.race([
      getDB(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("IndexedDB connection timeout")), 2000))
    ]);
    console.log("getFile: database connection obtained");
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("IndexedDB query timeout"));
      }, 2000);
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        clearTimeout(timeout);
        console.log("getFile: query succeeded");
        resolve(req.result);
      };
      req.onerror = () => {
        clearTimeout(timeout);
        console.log("getFile: query failed");
        reject(req.error);
      };
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

// --- openCalCreator ---
function openCalCreator() {
  const modal = $('cal-creator-modal'); if (!modal) return;
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('open'), 10);
  
  $('cc-title').value = '';
  $('cc-location').value = '';
  $('cc-allday').checked = false;
  
  const selDate = STATE.selectedDate || today();
  $('cc-start-date').value = selDate;
  $('cc-end-date').value = selDate;
  
  const now = new Date();
  const currentH = now.getHours();
  $('cc-start-time').value = `${String(currentH).padStart(2,'0')}:00`;
  $('cc-end-time').value = `${String((currentH + 1)%24).padStart(2,'0')}:00`;
  
  $('cc-repeat').value = 'never';
  $('cc-calendar-type').value = 'personal';
  $('cc-alert').value = 'none';
  $('cc-url').value = '';
  $('cc-notes').value = '';
  
  switchCreatorTab('event');
}

// --- renderSchedule ---
function renderSchedule(){
  const list=$('schedule-list'); if(!list)return;
  list.innerHTML='';
  if(!STATE.schedule.length){list.innerHTML='<li class="empty-hint">No schedule yet.</li>';return;}
  STATE.schedule.sort((a,b)=>a.time.localeCompare(b.time)).forEach((s,i)=>{
    const li=document.createElement('li'); li.className='day-block swipe-wrap'; li.style.animationDelay=`${i*.05}s`;
    li.style.padding = '0'; // reset padding since it's now a wrapper
    li.innerHTML=`
      <div class="swipe-content" style="display:flex;align-items:center;width:100%;transition:transform 0.3s var(--spring);padding:14px 16px;">
        <span class="day-block-time" style="width:70px">${s.time}</span><span class="day-block-title" style="flex:1">${s.title}</span>
      </div>
      <button class="rem-del-swipe" data-id="${s.id}" data-type="schedule" aria-label="Delete"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    `;
    setupSwipeGesture(li, { direction: 'x', maxDistance: -80 });
    list.appendChild(li);
  });
}

// --- renderPriorities ---
function renderPriorities(){
  const list=$('priorities-list'),empty=$('priorities-empty'),badge=$('priority-count'); if(!list)return;
  badge&&(badge.textContent=STATE.priorities.length);
  list.innerHTML='';
  if(!STATE.priorities.length){empty?.classList.remove('hidden');return;}
  empty?.classList.add('hidden');
  STATE.priorities.forEach((p,i)=>{
    const li=document.createElement('li'); li.className='rem-item swipe-wrap'; li.style.animationDelay=`${i*.05}s`;
    li.innerHTML=`
      <div class="swipe-content" style="display:flex;align-items:center;gap:12px;width:100%;transition:transform 0.3s var(--spring)">
        <div class="rem-check${p.done?' done':''}" data-id="${p.id}" role="checkbox" aria-checked="${p.done}" tabindex="0"></div>
        <span class="rem-text${p.done?' done':''}" style="flex:1">${p.text}</span>
      </div>
      <button class="rem-del-swipe" data-id="${p.id}" aria-label="Delete"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    `;
    setupSwipeGesture(li, { direction: 'x', maxDistance: -80 });
    list.appendChild(li);
  });
}

// --- renderCascaraSubjects ---
function renderCascaraSubjects(){
  const list=$('cascara-subject-list'); if(!list)return;
  list.innerHTML='';
  STATE.cascara.subjects.forEach((s,i)=>{
    const li=document.createElement('li'); li.className='cascara-subject-item'; li.style.animationDelay=`${i*.06}s`;
    const running=STATE.cascara.activeSubjectId===s.id;
    li.innerHTML=`<button class="cascara-play-btn${running?' running':''}" data-sid="${s.id}">${running?'⏹':'▶'}</button><div><div class="cascara-subject-name">${s.name}</div></div><div class="cascara-subject-time">${ms2hms(s.todayMs)}</div><button class="cascara-more-btn" data-sid="${s.id}" data-sname="${s.name}">⋮</button>`;
    list.appendChild(li);
  });
  const total=STATE.cascara.subjects.reduce((a,s)=>a+s.todayMs,0);
  $('cascara-today-total').textContent=ms2hms(total);
}

// --- showBloomTyping ---
function showBloomTyping(){BLOOM?.classList.add('typing');$('ai-typing')?.classList.remove('hidden');}

// --- closeSpotlight ---
function closeSpotlight(){$('spotlight').classList.add('hidden');}

// --- triggerNotification ---
function triggerNotification(title, body) {
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') new Notification(title, { body });
      });
    }
  }
}

// --- renderHeatmap ---
function renderHeatmap(){
  const grid=$('hm-grid');if(!grid)return;
  $('hm-month').textContent=new Date(STATE.hmYear,STATE.hmMonth).toLocaleString('default',{month:'long',year:'numeric'});
  const year=STATE.hmYear,month=STATE.hmMonth;
  const firstDay=new Date(year,month,1);
  let startDow=firstDay.getDay(); startDow=(startDow+6)%7;
  const daysInMonth=new Date(year,month+1,0).getDate(),todayStr=today();
  const dayMs={};
  STATE.cascara.sessions.forEach(sess=>{if(!dayMs[sess.date])dayMs[sess.date]=0;dayMs[sess.date]+=sess.durationMs;});
  grid.innerHTML='';
  for(let i=0;i<startDow;i++){const e=document.createElement('div');e.style.aspectRatio='1';grid.appendChild(e);}
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const ms=dayMs[dateStr]||0,hours=ms/3600000;
    const intensity=hours===0?0:hours<1?1:hours<2?2:hours<4?3:hours<6?4:5;
    const timeLabel=ms>0?(hours>=1?`${Math.floor(hours)}h`:`${Math.floor(hours*60)}m`):'';
    const cell=document.createElement('div');
    cell.className=`hm-cell${dateStr===todayStr?' today':''}`;
    cell.dataset.h=intensity;cell.dataset.date=dateStr;
    cell.style.animationDelay=`${d*.018}s`;
    cell.innerHTML=`<div class="hm-cell-date">${d}</div>${timeLabel?`<div class="hm-cell-time">${timeLabel}</div>`:''}`;
    cell.addEventListener('click',()=>showHeatmapDay(dateStr,dayMs[dateStr]||0));
    grid.appendChild(cell);
  }
}

// --- sendAI ---
async function sendAI(userText){
  if(!userText.trim())return;
  $('ai-empty-state').style.display='none';
  STATE.chatMsgs.push({role:'user',text:userText});appendMsg('user',userText);
  showBloomTyping();$('ai-typing')?.scrollIntoView({behavior:'smooth',block:'end'});
  await new Promise(r=>setTimeout(r,1100+Math.random()*700));
  const REPLIES={
    'focus':'Start with your hardest task. You\'ve already done it once you begin. Try the 25-minute Cascara timer.',
    'study':'Great choice. Pick one subject, set Cascara, eliminate distractions. Progress beats perfection.',
    'motivat':'You don\'t have to feel motivated to start. Start, and motivation follows.',
    'reflect':'What was the best moment of your day? What would you do differently? Journal your thoughts.',
    'plan':'Block your morning for deep work. Use Cascara for timed sessions. Review your priorities each evening.',
    'default':'I\'m here to help with studying, planning, journaling, and focus. What would you like to do?',
  };
  const key=Object.keys(REPLIES).find(k=>userText.toLowerCase().includes(k))||'default';
  hideBloomTyping();
  STATE.chatMsgs.push({role:'ai',text:REPLIES[key]});appendMsg('ai',REPLIES[key]);
  if(localStorage.getItem('nv-remember')!=='false')save();
}

// ==========================================
// APPLE-STYLE DIALOG HELPERS
// ==========================================
let _dialogResolve = null;

function _openAppleDialog({ title, message, hasInput, inputDefault, okLabel, cancelLabel, onOk, onCancel }) {
  const overlay = $('apple-dialog-overlay');
  const box = overlay?.querySelector('.apple-dialog-box');
  if (!overlay) return;

  $('apple-dialog-title').textContent = title || 'Alert';
  $('apple-dialog-msg').textContent = message || '';

  const inputContainer = $('apple-dialog-input-container');
  const inputEl = $('apple-dialog-input');

  if (hasInput) {
    inputContainer.classList.remove('hidden');
    inputEl.value = inputDefault || '';
    setTimeout(() => inputEl.focus(), 120);
  } else {
    inputContainer.classList.add('hidden');
  }

  const okBtn = $('apple-dialog-btn-ok');
  const cancelBtn = $('apple-dialog-btn-cancel');

  okBtn.textContent = okLabel || 'OK';
  cancelBtn.textContent = cancelLabel || 'Cancel';

  if (onCancel) {
    cancelBtn.style.display = '';
  } else {
    cancelBtn.style.display = 'none';
  }

  // Clear old listeners
  const newOk = okBtn.cloneNode(true);
  const newCancel = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

  newOk.addEventListener('click', () => {
    overlay.classList.add('hidden');
    if (box) box.style.transform = 'scale(0.85)';
    if (onOk) onOk(hasInput ? inputEl.value : undefined);
  });

  newCancel.addEventListener('click', () => {
    overlay.classList.add('hidden');
    if (box) box.style.transform = 'scale(0.85)';
    if (onCancel) onCancel();
  });

  overlay.classList.remove('hidden');
  // Animate in
  overlay.style.opacity = '0';
  if (box) box.style.transform = 'scale(0.85)';
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    if (box) box.style.transform = 'scale(1)';
  });
}

function showAlert(title, message) {
  _openAppleDialog({ title, message, hasInput: false, okLabel: 'OK' });
}

function showConfirm(title, message, onOk, onCancel) {
  _openAppleDialog({ title, message, hasInput: false, okLabel: 'Confirm', cancelLabel: 'Cancel', onOk, onCancel: onCancel || (() => {}) });
}

function showPrompt(title, message, defaultValue, onOk, onCancel) {
  _openAppleDialog({ title, message, hasInput: true, inputDefault: defaultValue, okLabel: 'Done', cancelLabel: 'Cancel', onOk, onCancel: onCancel || (() => {}) });
}

// --- openModal ---
function openModal(title,bodyHTML){
  const m=$('generic-modal'); if(!m)return;
  $('modal-title').textContent=title;
  $('modal-body').innerHTML=bodyHTML;
  m.classList.add('open');
}

let triggerBiometricOrPasscodeLock = () => {};

// --- switchTab ---
function switchTab(tabId){
  if (STATE.activeTab === tabId && document.querySelector(`.tb-item[data-tab="${tabId}"]`)?.classList.contains('active')) return;
  _switchTab(tabId);
}
function _switchTab(tabId){
  // Scoped Passcode Lock: if opening journal and lock is active, prompt first
  if (tabId === 'tab-journal') {
    if ((STATE.passcodeEnabled || STATE.facelockEnabled || STATE.fingerprintlockEnabled) && STATE.vaultLocked) {
      STATE.lockTargetTab = 'tab-journal';
      triggerBiometricOrPasscodeLock();
      return;
    }
  }

  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.remove('active'));
  const tab=$(tabId);
  if(tab){tab.classList.add('active');}
  document.querySelectorAll(`[data-tab="${tabId}"]`).forEach(b=>b.classList.add('active'));
  STATE.activeTab=tabId;
  updateDockIndicator(tabId);
  if(tabId==='tab-ai'){
    const isEmpty=STATE.chatMsgs.length===0;
    $('ai-empty-state').style.display=isEmpty?'flex':'none';
  }
  if(tabId==='tab-cascara') renderCascaraSubjects();
  if(tabId==='tab-me') renderProfile();
}

// --- switchCreatorTab ---
function switchCreatorTab(type) {
  currentCreatorTab = type;
  if (type === 'event') {
    $('cc-tab-event')?.classList.add('active');
    $('cc-tab-reminder')?.classList.remove('active');
    const endsRow = $('cc-ends-row'); if (endsRow) endsRow.style.display = 'flex';
    const repCard = $('cc-repeat')?.closest('.cc-card'); if (repCard) repCard.style.display = 'flex';
    const calGroup = $('cc-calendar-group'); if (calGroup) calGroup.style.display = 'flex';
  } else {
    $('cc-tab-event')?.classList.remove('active');
    $('cc-tab-reminder')?.classList.add('active');
    const endsRow = $('cc-ends-row'); if (endsRow) endsRow.style.display = 'none';
    const repCard = $('cc-repeat')?.closest('.cc-card'); if (repCard) repCard.style.display = 'none';
    const calGroup = $('cc-calendar-group'); if (calGroup) calGroup.style.display = 'none';
  }
}

// --- renderProfile ---
function renderProfile(){
  const av=$('profile-avatar'),nm=$('profile-name');
  if(av)av.textContent=STATE.profile.name?.charAt(0)?.toUpperCase()||'N';
  if(nm)nm.textContent=STATE.profile.name||'User';
  const ss = $('stat-sessions'); if (ss) ss.textContent=STATE.cascara.sessions.length;
  const st = $('stat-tasks'); if (st) st.textContent=STATE.priorities.filter(p=>p.done).length;
  const se = $('stat-entries'); if (se) se.textContent=STATE.journalEntries.length;
}

// --- updateDockIndicator ---
function updateDockIndicator(tabId) {
  const btn = document.querySelector(`.tb-item[data-tab="${tabId}"]`);
  if(btn) {
    const left = btn.offsetLeft;
    const width = btn.offsetWidth;
    if (window.dockEngine) {
       window.dockEngine.targetX = left;
       window.dockEngine.targetWidth = width;
    } else {
       const ind = document.getElementById('dock-indicator');
       if(ind) {
         ind.style.transform = `translateX(${left}px)`;
         ind.style.width = `${width}px`;
       }
    }
  }
}

// --- selectCalDate ---
function selectCalDate(dateStr){
  STATE.selectedDate=dateStr;
  document.querySelectorAll('.cal-cell').forEach(c=>c.classList.remove('selected'));
  document.querySelectorAll('.cal-cell').forEach(c=>{if(c.querySelector('.cal-num')?.textContent==String(parseInt(dateStr.slice(8))))c.classList.add('selected');});
  const d=new Date(dateStr+'T00:00:00');
  const panel = $('cal-day-panel');
  if(panel){
    panel.classList.remove('hidden');
    // small delay to allow display block to apply before transform transition
    setTimeout(() => panel.classList.add('open'), 10);
  }
  $('cdp-date-label').textContent=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  renderCalEvents(dateStr);
}

// --- renderPlanner ---
function renderPlanner() {
  const wrap = $('planner-wrap'); if (!wrap) return;
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  wrap.innerHTML = '';
  DAYS.forEach(day => {
    const plan = STATE.planner[day] || "No plans scheduled. Tap Edit to add your plan.";
    const div = document.createElement('div');
    div.style = 'background:var(--surface); border-radius:12px; padding:14px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid var(--border); margin-bottom: 8px;';
    const editBtn = document.createElement('button');
    editBtn.className = 'planner-edit-btn';
    editBtn.dataset.day = day;
    editBtn.style = 'background:var(--surface2); border:none; border-radius:8px; color:inherit; opacity:0.8; font-size:12px; padding:6px 12px; cursor:pointer;';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      showPrompt(`Edit ${day}`, `Enter plan for ${day}:`, STATE.planner[day] || '', (val) => {
        if (val !== null && val !== undefined) {
          STATE.planner[day] = val.trim();
          save();
          renderPlanner();
        }
      });
    });
    div.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:700; color:var(--cascara); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">${day}</div>
        <div style="color:var(--txt1); font-size:15px; margin-top:4px;">${plan}</div>
      </div>
    `;
    div.appendChild(editBtn);
    wrap.appendChild(div);
  });
}

// --- hideBloomTyping ---
function hideBloomTyping(){BLOOM?.classList.remove('typing');$('ai-typing')?.classList.add('hidden');}

// --- renderCalendar ---
function renderCalendar(){
  const year=STATE.calendarYear,month=STATE.calendarMonth;
  $('cal-month-label').textContent=new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});
  const firstDay=new Date(year,month,1).getDay(),daysInMonth=new Date(year,month+1,0).getDate(),todayStr=today();
  const grid=$('cal-grid');grid.innerHTML='';
  for(let i=0;i<firstDay;i++){const d=document.createElement('div');d.className='cal-cell other-month';grid.appendChild(d);}
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasEv=(STATE.events[dateStr]||[]).length>0;
    const cell=document.createElement('div');
    cell.className=`cal-cell${dateStr===todayStr?' today':''}${STATE.selectedDate===dateStr?' selected':''}`;
    cell.style.animationDelay=`${d*.012}s`;
    cell.innerHTML=`<span class="cal-num">${d}</span>${hasEv?'<div class="cal-dot-row"><div class="cal-dot"></div></div>':''}`;
    cell.addEventListener('click',()=>selectCalDate(dateStr));
    grid.appendChild(cell);
  }
  if(STATE.selectedDate)renderCalEvents(STATE.selectedDate);
}

// --- showHeatmapDay ---
function showHeatmapDay(dateStr,totalMs){
  document.querySelectorAll('.hm-cell').forEach(c=>c.classList.remove('selected'));
  document.querySelector(`.hm-cell[data-date="${dateStr}"]`)?.classList.add('selected');
  const detail=$('hm-day-detail');if(!detail)return;
  const d=new Date(dateStr+'T00:00:00'),label=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const subjMs={};
  STATE.cascara.sessions.filter(s=>s.date===dateStr).forEach(s=>{if(!subjMs[s.subjectName])subjMs[s.subjectName]=0;subjMs[s.subjectName]+=s.durationMs;});
  const rows=Object.entries(subjMs).map(([name,ms])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--separator)"><span style="color:inherit; opacity:0.8;font-size:15px">${name}</span><span style="color:var(--cascara);font-weight:600">${ms2hms(ms)}</span></div>`).join('');
  const sessions=STATE.cascara.sessions.filter(s=>s.date===dateStr);
  const startT=sessions.length?new Date(sessions[0].start).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'—';
  const endT=sessions.length?new Date(sessions[sessions.length-1].start+sessions[sessions.length-1].durationMs).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'—';
  detail.innerHTML=`<div class="hm-detail-date">${label}</div><div class="hm-stats-grid"><div class="hm-stat"><div class="hm-stat-label">Total</div><div class="hm-stat-val">${ms2hms(totalMs)}</div></div><div class="hm-stat"><div class="hm-stat-label">Max Focus</div><div class="hm-stat-val">${ms2hms(STATE.cascara.maxFocusMs)}</div></div><div class="hm-stat"><div class="hm-stat-label">Start</div><div class="hm-stat-val" style="font-size:18px">${startT}</div></div><div class="hm-stat"><div class="hm-stat-label">End</div><div class="hm-stat-val" style="font-size:18px">${endT}</div></div></div>${rows?`<div style="margin-top:12px">${rows}</div>`:''}`;
  detail.classList.remove('hidden');
}

// --- appendMsg ---
function appendMsg(role,text){
  const feed=$('ai-feed');if(!feed)return;
  const div=document.createElement('div');div.className=`msg ${role}`;
  if(role==='ai'){div.innerHTML=`<div class="msg-avatar"><svg viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg"><g><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71"/><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(60)"/><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71" transform="rotate(120)"/><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(180)"/><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71" transform="rotate(240)"/><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(300)"/></g></svg></div><div class="msg-bubble">${text.replace(/\n/g,'<br>')}</div>`;}
  else{div.innerHTML=`<div class="msg-bubble">${text}</div>`;}
  feed.appendChild(div);feed.scrollTop=feed.scrollHeight;
}

// --- saveJournalEntry ---
function saveJournalEntry(){
  const titleEl=$('jw-title'), bodyEl=$('jw-body');
  const title=titleEl?.value.trim()||'', body=bodyEl?.innerHTML.trim()||'';
  if(!title&&!body&&STATE.journalEditAttachments.length===0)return;

  // Check if Vent Mode is active
  const isVent = $('jw-tool-burn-toggle')?.classList.contains('active');
  if (isVent) {
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    STATE.ephemeralEntries.push({ id: randomId(), title, body, expiry, createdAt: Date.now() });
    saveEphemeral();
    checkEphemeralExpiry();
    
    // Play digital incinerator animation
    bodyEl?.classList.add('burning-text');
    if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
    setTimeout(() => {
      bodyEl?.classList.remove('burning-text');
      if (titleEl) titleEl.value = '';
      if (bodyEl) bodyEl.innerHTML = '';
      $('journal-write-overlay')?.classList.add('hidden');
      document.body.classList.remove('theme-crimson');
      $('jw-tool-burn-toggle')?.classList.remove('active');
    }, 1600);
    return;
  }

  const grad=GRADIENTS[STATE.journalEntries.length%GRADIENTS.length];
  if(STATE.journalEditId){
    const e=STATE.journalEntries.find(x=>x.id===STATE.journalEditId);
    if(e){
      e.title=title;e.body=body;e.mood=STATE.selectedMood;
      e.attachments=[...STATE.journalEditAttachments];
    }
  } else {
    STATE.journalEntries.push({id:randomId(),date:new Date().toISOString(),title,body,mood:STATE.selectedMood,gradient:grad,attachments:[...STATE.journalEditAttachments]});
  }
  save();renderJournal();
  $('journal-write-overlay')?.classList.add('hidden');
}

// --- closeModal ---
function closeModal(){
  const m=$('generic-modal'); if(!m)return;
  m.classList.remove('open');
}

// --- stopCascaraSession ---
function stopCascaraSession(){
  if(!STATE.cascara.activeSubjectId)return;
  clearInterval(STATE.cascara.activeInterval);
  const elapsed=Date.now()-STATE.cascara.activeStart;
  const sub=STATE.cascara.subjects.find(s=>s.id===STATE.cascara.activeSubjectId);
  if(sub){sub._baseMs=sub.todayMs;sub.totalMs=(sub.totalMs||0)+elapsed;STATE.cascara.sessions.push({subjectId:sub.id,subjectName:sub.name,date:today(),durationMs:elapsed,start:STATE.cascara.activeStart});}
  STATE.cascara.activeSubjectId=null;STATE.cascara.activeStart=null;STATE.cascara.activeInterval=null;
  $('cascara-main-timer').textContent='0:00:00';
  $('cascara-focus-overlay')?.classList.add('hidden');
  save();renderCascaraSubjects();renderHeatmap();
}

// --- openBookReader ---
function openBookReader(book) {
  console.log("openBookReader: function invoked");
  // Restore default HTML layout for cr-page-container
  const containerDiv = $('cr-page-container');
  if (containerDiv) {
    containerDiv.innerHTML = `
      <div id="cr-page-wrapper" class="cr-page-wrapper">
        <div id="cr-zoom-layer" style="position:absolute;top:0;left:0;transform-origin:top left;">
          <canvas id="cr-pdf-canvas" class="cr-pdf-canvas" width="600" height="780" style="position:absolute;left:0;top:0;z-index:1;"></canvas>
          <div id="cr-page-content" class="cr-page-content" style="position:absolute;inset:0;z-index:2;background:none;padding:0;overflow:hidden;"></div>
          <canvas id="cr-markup-canvas" class="cr-markup-canvas cr-canvas" width="600" height="780" style="position:absolute;left:0;top:0;z-index:5;"></canvas>
        </div>
      </div>
      <div id="cr-page-wrapper-right" class="cr-page-wrapper hidden">
        <div id="cr-zoom-layer-right" style="position:absolute;top:0;left:0;transform-origin:top left;">
          <canvas id="cr-pdf-canvas-right" class="cr-pdf-canvas" width="600" height="780" style="position:absolute;left:0;top:0;z-index:1;"></canvas>
          <div id="cr-page-content-right" class="cr-page-content" style="position:absolute;inset:0;z-index:2;background:none;padding:0;overflow:hidden;"></div>
          <canvas id="cr-markup-canvas-right" class="cr-markup-canvas cr-canvas" width="600" height="780" style="position:absolute;left:0;top:0;z-index:5;"></canvas>
        </div>
      </div>
    `;
    containerDiv.style.transform = 'none';
    containerDiv.style.width = '';
    containerDiv.style.height = '';
    containerDiv.style.display = '';
    containerDiv.style.flexDirection = '';
    containerDiv.style.gap = '';
    containerDiv.style.alignItems = '';
  }

  // Start Time tracker
  if (window.crTimeTracker) clearInterval(window.crTimeTracker);
  window.crTimeTracker = setInterval(() => {
    if (!$('cascara-reader-overlay').classList.contains('hidden')) {
      book.timeRead = (book.timeRead || 0) + 1;
      save();
      if ($('cascara-books-grid')) renderBooks(); // update stats live!
    }
  }, 60000);
  const overlay = $('cascara-reader-overlay'); 
  if(!overlay) {
    console.log("openBookReader: overlay element not found!");
    return;
  }
  console.log("openBookReader: overlay element found, removing hidden class");

  if (!document.startViewTransition) {
    overlay.classList.remove('hidden');
    document.querySelector('.tab-bar')?.classList.add('hidden');
  } else {
    // Set view-transition-name on the clicked card dynamically if possible, or just the overlay
    overlay.style.viewTransitionName = 'reader-overlay';
    document.startViewTransition(() => {
      overlay.classList.remove('hidden');
      document.querySelector('.tab-bar')?.classList.add('hidden');
    });
  }

  const selectedTheme = $('cr-theme-select')?.value || 'dark';
  overlay.className = `cascara-reader-overlay theme-${selectedTheme}`;
  
  // Set global reference

  currentReaderBook = book;
  
  $('cr-doc-title').textContent = book.title;
  $('cr-doc-author').textContent = 'by ' + (book.author || 'Unknown');
  
  let canvas = $('cr-markup-canvas');
  let ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0, lastY = 0;
  let activeTool = 'text';
  let isTwoPage = false;
  overlay.dataset.activeTool = activeTool;

  // Restore default Text selection state
  document.querySelectorAll('.cr-tool-btn').forEach(btn => btn.classList.remove('active'));
  $('cr-tool-text')?.classList.add('active');
  canvas.classList.remove('active');

  const contentDiv = $('cr-page-content');
  if (contentDiv) {
    if (book.fileType === 'pdf') {
      contentDiv.style.position = 'absolute';
      contentDiv.style.inset = '0';
      contentDiv.style.padding = '0';
      contentDiv.style.overflow = 'hidden';
    } else {
      contentDiv.style.position = '';
      contentDiv.style.inset = '';
      contentDiv.style.padding = '40px';
      contentDiv.style.overflowY = 'auto';
    }
  }

  let currentZoom = 1.0;
  
  function adjustReaderResponsiveScale() {
    const container = $('cr-page-view');
    const wrapper = container ? (container.querySelector('.cr-page-wrapper') || $('cr-page-wrapper')) : null;
    if (!container) return;

    const isMobile = window.innerWidth <= 768;
    const containerDiv = $('cr-page-container');

    if (isMobile) {
      if (!window.isContinuousScrollActive) {
        window.isContinuousScrollActive = true;
        setupMobileContinuousScroll();
        return;
      }

      // Remove desktop-specific styles
      const mSpacer = container.querySelector('#cr-mobile-scroll-spacer');
      let spacer = mSpacer;
      if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'cr-mobile-scroll-spacer';
        spacer.style.cssText = 'pointer-events:none;z-index:0;display:block;';
        container.appendChild(spacer);
      }

      // Base fit scale: fits the 600px wide page to screen (occupies 80% width, 10% margins on sides)
      const availW = container.clientWidth * 0.8;
      const baseScale = availW / 600;
      const finalScale = baseScale * currentZoom;

      if (containerDiv) {
        containerDiv.style.position = 'absolute';
        containerDiv.style.top = '0';
        containerDiv.style.left = '50%';
        containerDiv.style.transform = `translateX(-50%) scale(${finalScale})`;
        containerDiv.style.transformOrigin = 'top center';
        containerDiv.style.width = '600px';
        containerDiv.style.height = 'auto';
        containerDiv.style.display = 'flex';
        containerDiv.style.flexDirection = 'column';
        containerDiv.style.gap = '15px';
        containerDiv.style.alignItems = 'center';
      }

      // Make page view scrollable on mobile
      container.style.overflow = 'auto';
      container.style.position = 'relative';

      // Update spacer to match visual scaled dimensions
      const naturalHeight = containerDiv ? containerDiv.scrollHeight : 780;
      spacer.style.width = `${Math.ceil(600 * finalScale)}px`;
      spacer.style.height = `${Math.ceil(naturalHeight * finalScale + 120)}px`;
      return;
    }

    // Switch back to desktop layout if continuous scroll was active
    if (window.isContinuousScrollActive) {
      window.isContinuousScrollActive = false;
      if (containerDiv) {
        containerDiv.innerHTML = `
          <div id="cr-page-wrapper" class="cr-page-wrapper">
            <div id="cr-zoom-layer" style="position:absolute;top:0;left:0;transform-origin:top left;">
              <canvas id="cr-pdf-canvas" class="cr-pdf-canvas" width="600" height="780" style="position:absolute;left:0;top:0;z-index:1;"></canvas>
              <div id="cr-page-content" class="cr-page-content" style="position:absolute;inset:0;z-index:2;background:none;padding:0;overflow:hidden;"></div>
              <canvas id="cr-markup-canvas" class="cr-markup-canvas cr-canvas" width="600" height="780" style="position:absolute;left:0;top:0;z-index:5;"></canvas>
            </div>
          </div>
          <div id="cr-page-wrapper-right" class="cr-page-wrapper hidden">
            <div id="cr-zoom-layer-right" style="position:absolute;top:0;left:0;transform-origin:top left;">
              <canvas id="cr-pdf-canvas-right" class="cr-pdf-canvas" width="600" height="780" style="position:absolute;left:0;top:0;z-index:1;"></canvas>
              <div id="cr-page-content-right" class="cr-page-content" style="position:absolute;inset:0;z-index:2;background:none;padding:0;overflow:hidden;"></div>
              <canvas id="cr-markup-canvas-right" class="cr-markup-canvas cr-canvas" width="600" height="780" style="position:absolute;left:0;top:0;z-index:5;"></canvas>
            </div>
          </div>
        `;
        containerDiv.style.transform = 'none';
        containerDiv.style.width = '';
        containerDiv.style.height = '';
        containerDiv.style.display = '';
        containerDiv.style.flexDirection = '';
        containerDiv.style.gap = '';
        containerDiv.style.alignItems = '';
      }
      renderReaderPage(book.currentPage || 1);
      return;
    }

    if (!wrapper) return;

    // Clean up mobile scroll spacer on desktop
    const mSpacer = container.querySelector('#cr-mobile-scroll-spacer');
    if (mSpacer) mSpacer.remove();

    // ── STEP 1: Size the wrapper to perfectly fill the available space ──
    // This is the FIXED book rectangle — it never changes size when zooming.
    const padH = 32, padV = 24;
    const availW = Math.max(100, container.clientWidth - padH);
    const availH = Math.max(100, container.clientHeight - padV);

    // PDF native dimensions (600×780). Fit by aspect ratio.
    const pdfW = 600;
    const pdfH = parseInt(wrapper.dataset.pdfHeight || '780');
    const fitScale = Math.min(availW / pdfW, availH / pdfH);

    const wrapperW = Math.floor(pdfW * fitScale);
    const wrapperH = Math.floor(pdfH * fitScale);

    // Lock the wrapper size — this IS the book surface
    wrapper.style.width  = `${wrapperW}px`;
    wrapper.style.height = `${wrapperH}px`;
    wrapper.style.overflow = 'auto';
    wrapper.style.transform = 'none';  // wrapper itself NEVER scales

    // ── STEP 2: Scale content INSIDE the wrapper ──
    // The zoom layer is always 600×pdfH native. We scale it so:
    //   At currentZoom=1 → fills wrapper exactly
    //   At currentZoom=2 → 2× larger, wrapper scrolls to reveal
    const contentScale = fitScale * currentZoom;
    const zoomLayer = wrapper.querySelector('#cr-zoom-layer') || wrapper.querySelector('[id^="cr-zoom-layer"]');
    if (zoomLayer) {
      zoomLayer.style.width  = `${pdfW}px`;
      zoomLayer.style.height = `${pdfH}px`;
      zoomLayer.style.transform = `scale(${contentScale})`;
      zoomLayer.style.transformOrigin = 'top left';

      // Spacer: makes overflow:auto on wrapper actually show scrollbars
      // (CSS transform doesn't affect layout flow, so we need a spacer)
      let spacer = wrapper.querySelector('.cr-zoom-spacer');
      if (!spacer) {
        spacer = document.createElement('div');
        spacer.className = 'cr-zoom-spacer';
        spacer.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:0;';
        wrapper.appendChild(spacer);
      }
      spacer.style.width  = `${Math.ceil(pdfW * contentScale)}px`;
      spacer.style.height = `${Math.ceil(pdfH * contentScale)}px`;
    }

    // ── STEP 3: Handle spread (right page) identically ──
    const rightWrapper = $('cr-page-wrapper-right');
    if (rightWrapper && !rightWrapper.classList.contains('hidden')) {
      rightWrapper.style.width  = `${wrapperW}px`;
      rightWrapper.style.height = `${wrapperH}px`;
      rightWrapper.style.overflow = 'auto';
      rightWrapper.style.transform = 'none';
      const rzl = rightWrapper.querySelector('#cr-zoom-layer-right');
      if (rzl) {
        rzl.style.width  = `${pdfW}px`;
        rzl.style.height = `${pdfH}px`;
        rzl.style.transform = `scale(${contentScale})`;
        rzl.style.transformOrigin = 'top left';
        let rSpacer = rightWrapper.querySelector('.cr-zoom-spacer');
        if (!rSpacer) {
          rSpacer = document.createElement('div');
          rSpacer.className = 'cr-zoom-spacer';
          rSpacer.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:0;';
          rightWrapper.appendChild(rSpacer);
        }
        rSpacer.style.width  = `${Math.ceil(pdfW * contentScale)}px`;
        rSpacer.style.height = `${Math.ceil(pdfH * contentScale)}px`;
      }
    }

    // cr-page-container: apply the fixed area zoom scale
    if (containerDiv) {
      containerDiv.style.transform = `scale(${window.fixedAreaZoom || 1.0})`;
      containerDiv.style.transformOrigin = 'center center';
      containerDiv.style.display = 'flex';
      containerDiv.style.justifyContent = 'center';
      containerDiv.style.alignItems = 'center';
      containerDiv.style.position = 'relative';
      containerDiv.style.left = 'auto';
    }
    container.style.overflow = 'hidden';
    container.style.paddingBottom = '';
  }



  function updateZoom(sourceSlider = null) {
    adjustReaderResponsiveScale();
    const percent = Math.round(currentZoom * 100);
    const zoomValDesktopEl = $('cr-zoom-val');
    if (zoomValDesktopEl) zoomValDesktopEl.textContent = `${percent}%`;
    const dSlider = $('cr-zoom-slider');
    if (dSlider && sourceSlider !== dSlider) dSlider.value = percent;
  }

  function highlightSelection(color) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    
    let contentDiv = $('cr-page-content');
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const node = range.commonAncestorContainer;
      const pageWrapper = node.nodeType === Node.ELEMENT_NODE ? node.closest('.cr-page-wrapper') : node.parentElement?.closest('.cr-page-wrapper');
      if (pageWrapper) {
        contentDiv = pageWrapper.querySelector('.cr-page-content');
      }
    }
    if (!contentDiv || !contentDiv.contains(range.commonAncestorContainer)) return;
    
    if (book.fileType === 'pdf') {
      const spans = contentDiv.querySelectorAll('span');
      spans.forEach(span => {
        if (selection.containsNode(span, true)) {
          span.style.backgroundColor = color;
          span.className = 'cr-highlight';
        }
      });
    } else {
      if (range.startContainer === range.endContainer) {
        const span = document.createElement('span');
        span.style.backgroundColor = color;
        span.className = 'cr-highlight';
        try {
          range.surroundContents(span);
        } catch (e) {
          console.warn("surroundContents failed", e);
        }
      } else {
        const documentFragment = range.extractContents();
        const wrapper = document.createElement('span');
        wrapper.style.backgroundColor = color;
        wrapper.className = 'cr-highlight';
        wrapper.appendChild(documentFragment);
        range.insertNode(wrapper);
      }
    }
    
    book.highlights = book.highlights || {};
    let pageNum = book.currentPage;
    if (isMobile && contentDiv) {
      const pw = contentDiv.closest('.cr-page-wrapper');
      if (pw) pageNum = parseInt(pw.dataset.page) || pageNum;
    }
    book.highlights[pageNum] = contentDiv.innerHTML;
    save();
    selection.removeAllRanges();
    $('cr-selection-menu')?.classList.remove('active');
  }

  // iOS-Style Text Selection Handling
  const selMenu = $('cr-selection-menu');
  let currentSelectionText = '';
  
  const handleSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (!text || !selMenu || activeTool === 'pen' || activeTool === 'eraser') {
      selMenu?.classList.remove('active');
      currentSelectionText = '';
      return;
    }
    currentSelectionText = text;
    
    // Get bounding box of the selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Position menu above selection
    // Add offset for the reader container if it is absolutely positioned
    const wrapperRect = $('cascara-reader-overlay').getBoundingClientRect();
    const top = rect.top - wrapperRect.top - 50; 
    const left = rect.left - wrapperRect.left + (rect.width / 2);
    
    selMenu.style.top = `${Math.max(10, top)}px`;
    selMenu.style.left = `${left}px`;
    selMenu.style.transform = '';
    selMenu.classList.add('active');
  };

  document.addEventListener('selectionchange', () => {
    // Debounce slightly to wait for mouseup, handled below
  });

  const contentDivEl = $('cr-page-container');
  if (contentDivEl) {
    contentDivEl.addEventListener('mouseup', () => setTimeout(handleSelection, 50));
    contentDivEl.addEventListener('touchend', () => setTimeout(handleSelection, 50));
  }
  document.addEventListener('mousedown', (e) => {
    if (selMenu && !selMenu.contains(e.target) && !e.target.closest('.cr-tool-btn')) {
      setTimeout(() => {
        const text = window.getSelection().toString().trim();
        if (!text) selMenu.classList.remove('active');
      }, 100);
    }
  });

  // Hook up menu buttons

  // Initialize Build Date
  const buildDateEl = $('cr-build-date');
  if (buildDateEl) {
    buildDateEl.textContent = new Date(document.lastModified).toLocaleString();
  }
  $('cr-sel-highlight')?.addEventListener('click', () => {
    highlightSelection('rgba(255, 213, 79, 0.45)');
  });
  
  $('cr-sel-speak')?.addEventListener('click', () => {
    if ('speechSynthesis' in window && currentSelectionText) {
      window.speechSynthesis.cancel();
      ttsUtterance = new SpeechSynthesisUtterance(currentSelectionText);
      const voiceVal = $('cr-speech-voice-select')?.value;
      if (voiceVal) {
        const foundVoice = window.speechSynthesis.getVoices().find(v => v.name === voiceVal);
        if (foundVoice) ttsUtterance.voice = foundVoice;
      }
      window.speechSynthesis.speak(ttsUtterance);
      selMenu?.classList.remove('active');
    }
  });
  
  $('cr-sel-copy')?.addEventListener('click', () => {
    if (currentSelectionText) {
      navigator.clipboard.writeText(currentSelectionText);
      selMenu?.classList.remove('active');
      showAlert('Copied', 'Text copied to clipboard!');
    }
  });
  
  async function performWikipediaLookup(query) {
    const term = query.trim();
    if (!term) return;
    
    $('cr-lookup-term').textContent = term;
    const body = $('cr-lookup-body');
    if (body) body.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner" style="border:3px solid rgba(255,255,255,0.1); border-radius:50%; border-top:3px solid var(--cascara); width:24px; height:24px; animation:spin 1s linear infinite; margin:0 auto;"></div></div>';
    
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      if (body) body.innerHTML = `<p><strong>${data.title}</strong></p><p>${data.extract || 'No summary available.'}</p>`;
      const link = $('cr-lookup-link');
      if (link) link.href = data.content_urls?.desktop?.page || '#';
    } catch (err) {
      if (body) body.innerHTML = `<p>No direct Wikipedia article summary found for "<strong>${term}</strong>". You can search it directly below or view search results on Wikipedia.</p>`;
      const link = $('cr-lookup-link');
      if (link) link.href = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(term)}`;
    }
  }

  $('cr-sel-lookup')?.addEventListener('click', () => {
    selMenu?.classList.remove('active');
    if (!currentSelectionText) return;
    
    const popover = $('cr-lookup-popover');
    const searchInput = $('cr-lookup-search-input');
    if (searchInput) searchInput.value = currentSelectionText;
    
    // Position popover roughly in center
    popover.style.top = '20%';
    popover.style.left = '50%';
    popover.style.transform = 'translateX(-50%)';
    popover.classList.add('active');
    
    performWikipediaLookup(currentSelectionText);
  });

  $('cr-lookup-search-btn')?.addEventListener('click', () => {
    const q = $('cr-lookup-search-input')?.value;
    if (q) performWikipediaLookup(q);
  });

  $('cr-lookup-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value;
      if (q) performWikipediaLookup(q);
    }
  });

  $('cr-lookup-close')?.addEventListener('click', () => {
    $('cr-lookup-popover')?.classList.remove('active');
  });

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
  }
  let pdfDoc = null;
  const outline = $('cr-sidebar-outline');

  function setupMobileContinuousScroll() {
    const container = $('cr-page-view');
    const containerDiv = $('cr-page-container');
    if (!container || !containerDiv) return;
    
    containerDiv.style.transform = 'none';
    containerDiv.style.width = '100%';
    containerDiv.style.height = 'auto';
    containerDiv.style.display = 'flex';
    containerDiv.style.flexDirection = 'column';
    containerDiv.style.gap = '15px';
    containerDiv.style.alignItems = 'center';
    containerDiv.style.paddingBottom = '80px';
    
    containerDiv.innerHTML = '';
    const nativeWidth = 600;
    
    if (book.fileType === 'pdf') {
      const defaultPageHeight = 780;
      
      for (let pageNum = 1; pageNum <= book.totalPages; pageNum++) {
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'cr-page-wrapper';
        pageWrapper.dataset.page = pageNum;
        pageWrapper.style.position = 'relative';
        pageWrapper.style.width = `${nativeWidth}px`;
        pageWrapper.style.height = `${defaultPageHeight}px`;
        pageWrapper.style.marginBottom = '15px';
        pageWrapper.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        pageWrapper.style.background = 'var(--surface2)';
        pageWrapper.style.borderRadius = '8px';
        pageWrapper.style.overflow = 'hidden';
        
        pageWrapper.innerHTML = `
          <canvas class="cr-pdf-canvas" style="position: absolute; left:0; top:0; z-index:1; width: 100%; height: 100%;"></canvas>
          <div class="cr-page-content" style="position: absolute; inset:0; z-index: 2; background: none; padding: 0; overflow: hidden;"></div>
          <canvas class="cr-markup-canvas cr-canvas" style="position: absolute; left:0; top:0; z-index:5; width: 100%; height: 100%;"></canvas>
        `;
        containerDiv.appendChild(pageWrapper);
        
        if (pdfDoc) {
          pdfDoc.getPage(pageNum).then(page => {
            const vp = page.getViewport({ scale: 1 });
            const ar = vp.width / vp.height;
            const actualHeight = nativeWidth / ar;
            pageWrapper.style.height = `${actualHeight}px`;
            adjustReaderResponsiveScale();
          });
        }
      }
    } else {
      for (let pageNum = 1; pageNum <= book.totalPages; pageNum++) {
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'cr-page-wrapper';
        pageWrapper.dataset.page = pageNum;
        pageWrapper.style.position = 'relative';
        pageWrapper.style.width = `${nativeWidth}px`;
        pageWrapper.style.minHeight = '200px';
        pageWrapper.style.height = 'auto';
        pageWrapper.style.marginBottom = '15px';
        pageWrapper.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        pageWrapper.style.background = 'var(--surface2)';
        pageWrapper.style.borderRadius = '8px';
        pageWrapper.style.padding = '20px';
        pageWrapper.style.boxSizing = 'border-box';
        
        pageWrapper.innerHTML = `
          <div class="cr-page-content" style="position: static; inset: auto; background: none; padding: 0; overflow: visible;"></div>
        `;
        containerDiv.appendChild(pageWrapper);
      }
    }
    
    const observerOptions = {
      root: container,
      rootMargin: '100% 0px 100% 0px',
      threshold: 0.05
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const pw = entry.target;
        const pageNum = parseInt(pw.dataset.page);
        if (entry.isIntersecting) {
          if (!pw.dataset.rendered) {
            renderMobilePageContent(pw, pageNum);
          }
        }
      });
    }, observerOptions);
    
    containerDiv.querySelectorAll('.cr-page-wrapper').forEach(pw => {
      observer.observe(pw);
    });
    
    let activePageTimeout = null;
    container.addEventListener('scroll', () => {
      if (activePageTimeout) clearTimeout(activePageTimeout);
      activePageTimeout = setTimeout(() => {
        const wrappers = containerDiv.querySelectorAll('.cr-page-wrapper');
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        
        let closestPageNum = 1;
        let minDistance = Infinity;
        
        wrappers.forEach(pw => {
          const rect = pw.getBoundingClientRect();
          const pageCenter = rect.top + rect.height / 2;
          const distance = Math.abs(containerCenter - pageCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestPageNum = parseInt(pw.dataset.page);
          }
        });
        
        if (closestPageNum && book.currentPage !== closestPageNum) {
          book.currentPage = closestPageNum;
          book.progress = Math.round((book.currentPage / book.totalPages) * 100);
          save();
          
          const slider = $('cr-page-slider');
          if (slider) slider.value = closestPageNum;
          
          const label = $('cr-page-label');
          if (label) label.textContent = `Page ${closestPageNum} of ${book.totalPages} (${book.progress}%)`;
          
          document.querySelectorAll('.cr-outline-item').forEach(li => {
            const p = parseInt(li.dataset.page);
            if (p) {
              const step = Math.max(5, Math.ceil(book.totalPages / 5));
              li.classList.toggle('active', closestPageNum >= p && closestPageNum < p + step);
            }
          });
        }
      }, 100);
    });
    adjustReaderResponsiveScale();
  }

  function renderMobilePageContent(pageWrapper, pageNum) {
    pageWrapper.dataset.rendered = "true";
    
    const canvasPdf = pageWrapper.querySelector('.cr-pdf-canvas');
    const contentDiv = pageWrapper.querySelector('.cr-page-content');
    const canvasMarkup = pageWrapper.querySelector('.cr-markup-canvas');
    
    if (book.fileType === 'pdf') {
      if (pdfDoc) {
        pdfDoc.getPage(pageNum).then(page => {
          const viewport = page.getViewport({ scale: 1 });
          const targetWidth = pageWrapper.clientWidth || ($('cr-page-view').clientWidth - 20);
          const scale = targetWidth / viewport.width;
          const scaledViewport = page.getViewport({ scale: scale });
          
          canvasPdf.width = targetWidth;
          canvasPdf.height = targetWidth / (viewport.width / viewport.height);
          
          const ctxPdf = canvasPdf.getContext('2d');
          ctxPdf.clearRect(0, 0, canvasPdf.width, canvasPdf.height);
          
          page.render({
            canvasContext: ctxPdf,
            viewport: scaledViewport
          }).promise.then(() => {
            book.highlights = book.highlights || {};
            const highlightKey = `${book.id}-${pageNum}`;
            if (book.highlights[highlightKey]) {
              contentDiv.innerHTML = book.highlights[highlightKey];
              applyCanvaReflowStyleToSpans(contentDiv, pageNum, canvasPdf);
            } else {
              page.getTextContent().then(textContent => {
                const nativeText = textContent.items.map(item => item.str).join(' ').trim();
                book.pdfTextCache = book.pdfTextCache || {};
                book.pdfTextCache[pageNum] = nativeText;
                
                if (nativeText.length > 10) {
                  contentDiv.innerHTML = '';
                  let charCounter = 0;
                  let spanIdx = 0;
                  textContent.items.forEach(item => {
                    const len = item.str.length;
                    const spanStart = charCounter;
                    const spanEnd = charCounter + len;
                    
                    let isMatch = false;
                    if (book.selectedSearchMatch && book.selectedSearchMatch.page === pageNum) {
                      const mStart = book.selectedSearchMatch.charOffset;
                      const mEnd = mStart + book.selectedSearchMatch.query.length;
                      if (spanStart < mEnd && spanEnd > mStart) {
                        isMatch = true;
                      }
                    }

                    const [left, top] = scaledViewport.convertToViewportPoint(item.transform[4], item.transform[5]);
                    const fontHeight = Math.abs(item.transform[3] * scale);
                    
                    const span = document.createElement('span');
                    span.setAttribute('data-span-id', spanIdx);
                    span.textContent = item.str;
                    span.style.position = 'absolute';
                    span.style.fontFamily = 'sans-serif';
                    span.style.fontSize = fontHeight + 'px';
                    span.style.left = left + 'px';
                    span.style.top = (top - fontHeight) + 'px';
                    span.style.color = 'transparent';
                    span.style.whiteSpace = 'pre';
                    span.style.cursor = 'text';
                    if (item.width) {
                      span.style.width = (item.width * scale) + 'px';
                    }
                    if (isMatch) {
                      span.style.backgroundColor = 'rgba(0, 122, 255, 0.38)';
                    }
                    
                    contentDiv.appendChild(span);
                    charCounter += len + 1;
                    spanIdx++;
                  });

                  applyCanvaReflowStyleToSpans(contentDiv, pageNum, canvasPdf);
                } else {
                  book.ocrData = book.ocrData || {};
                  if (book.ocrData[pageNum]) {
                    renderMobileOcrTextOverlay(pageWrapper, book.ocrData[pageNum], book.selectedSearchMatch, scale);
                  } else {
                    runMobileOcrOnCanvas(pageWrapper, pageNum, scale);
                  }
                }
              });
            }          });
          
          if (canvasMarkup) {
            canvasMarkup.width = canvasPdf.width;
            canvasMarkup.height = canvasPdf.height;
            const ctxMarkup = canvasMarkup.getContext('2d');
            ctxMarkup.clearRect(0, 0, canvasMarkup.width, canvasMarkup.height);
            book.drawings = book.drawings || {};
            if (book.drawings[pageNum]) {
              const img = new Image();
              img.onload = () => {
                ctxMarkup.drawImage(img, 0, 0, canvasMarkup.width, canvasMarkup.height);
              };
              img.src = book.drawings[pageNum];
            }
            
            // Re-bind touch/mouse drawing to this page canvas
            let pageIsDrawing = false;
            let pLastX = 0, pLastY = 0;
            
            const startDrawPage = (e) => {
              if (activeTool !== 'pen' && activeTool !== 'eraser') return;
              pageIsDrawing = true;
              const rect = canvasMarkup.getBoundingClientRect();
              const clientX = e.clientX || (e.touches && e.touches[0].clientX);
              const clientY = e.clientY || (e.touches && e.touches[0].clientY);
              pLastX = clientX - rect.left;
              pLastY = clientY - rect.top;
            };
            
            const drawPage = (e) => {
              if (!pageIsDrawing) return;
              const ctxM = canvasMarkup.getContext('2d');
              const rect = canvasMarkup.getBoundingClientRect();
              const clientX = e.clientX || (e.touches && e.touches[0].clientX);
              const clientY = e.clientY || (e.touches && e.touches[0].clientY);
              const x = clientX - rect.left;
              const y = clientY - rect.top;
              
              ctxM.beginPath();
              ctxM.moveTo(pLastX, pLastY);
              ctxM.lineTo(x, y);
              if (activeTool === 'eraser') {
                ctxM.globalCompositeOperation = 'destination-out';
                ctxM.lineWidth = 20;
              } else {
                ctxM.globalCompositeOperation = 'source-over';
                ctxM.strokeStyle = '#e8652a';
                ctxM.lineWidth = 3;
              }
              ctxM.lineCap = 'round';
              ctxM.stroke();
              
              pLastX = x;
              pLastY = y;
            };
            
            const endDrawPage = () => {
              if (pageIsDrawing) {
                pageIsDrawing = false;
                book.drawings = book.drawings || {};
                book.drawings[pageNum] = canvasMarkup.toDataURL();
                save();
              }
            };
            
            canvasMarkup.addEventListener('mousedown', startDrawPage);
            canvasMarkup.addEventListener('mousemove', drawPage);
            canvasMarkup.addEventListener('mouseup', endDrawPage);
            canvasMarkup.addEventListener('mouseleave', endDrawPage);
            
            canvasMarkup.addEventListener('touchstart', (e) => {
              if (activeTool === 'pen' || activeTool === 'eraser') {
                startDrawPage(e);
                e.preventDefault();
              }
            }, {passive: false});
            canvasMarkup.addEventListener('touchmove', (e) => {
              if (pageIsDrawing) {
                drawPage(e);
                e.preventDefault();
              }
            }, {passive: false});
            canvasMarkup.addEventListener('touchend', endDrawPage);
          }
        });
      }
    } else {
      if (contentDiv) {
        book.highlights = book.highlights || {};
        if (book.highlights[pageNum]) {
          contentDiv.innerHTML = book.highlights[pageNum];
        } else if (book.fileContent) {
          const words = book.fileContent.split(/\s+/);
          const startIdx = (pageNum - 1) * 200;
          const pageWords = words.slice(startIdx, startIdx + 200);
          
          let htmlContent = pageWords.join(' ');
          if (book.selectedSearchMatch && book.selectedSearchMatch.page === pageNum) {
            const query = book.selectedSearchMatch.query;
            const matchIndex = book.selectedSearchMatch.matchIndex;
            let occ = 0;
            htmlContent = htmlContent.replace(new RegExp(escapeRegExp(query), 'gi'), match => {
              if (occ === matchIndex) {
                occ++;
                return `<span class="cr-highlight" style="background-color:rgba(0, 122, 255, 0.38);">${match}</span>`;
              }
              occ++;
              return match;
            });
          }
          contentDiv.innerHTML = `<h3 style="margin-top:0; color:var(--cascara); font-family:var(--font);">${book.title}</h3><p style="white-space: pre-wrap; font-family:Georgia, serif; font-size:16px;">${htmlContent}</p>`;
        }
      }
    }
  }
  function renderMobileOcrTextOverlay(pageWrapper, words, selectedMatch, scale) {
    const contentDiv = pageWrapper.querySelector('.cr-page-content');
    if (!contentDiv) return;
    contentDiv.innerHTML = '';
    let charCounter = 0;
    let spanIdx = 0;
    const pageNum = parseInt(pageWrapper.dataset.page);
    words.forEach(w => {
      const len = w.text.length;
      const spanStart = charCounter;
      const spanEnd = charCounter + len;
      
      let isMatch = false;
      if (selectedMatch && selectedMatch.page === pageNum) {
        const mStart = selectedMatch.charOffset;
        const mEnd = mStart + selectedMatch.query.length;
        if (spanStart < mEnd && spanEnd > mStart) {
          isMatch = true;
        }
      }
      
      const span = document.createElement('span');
      span.setAttribute('data-span-id', spanIdx);
      span.textContent = w.text + ' ';
      span.style.position = 'absolute';
      span.style.fontFamily = 'sans-serif';
      span.style.left = (w.left * scale) + 'px';
      span.style.top = (w.top * scale) + 'px';
      span.style.width = (w.width * scale) + 'px';
      span.style.height = (w.height * scale) + 'px';
      span.style.fontSize = (w.height * scale * 0.95) + 'px';
      span.style.color = 'transparent';
      span.style.whiteSpace = 'nowrap';
      span.style.cursor = 'text';
      span.style.transformOrigin = '0 0';
      if (isMatch) {
        span.style.backgroundColor = 'rgba(0, 122, 255, 0.38)';
      }
      
      contentDiv.appendChild(span);
      charCounter += len + 1;
      spanIdx++;
    });

    const canvasPdf = pageWrapper.querySelector('.cr-pdf-canvas');
    applyCanvaReflowStyleToSpans(contentDiv, pageNum, canvasPdf);
  }
  function runMobileOcrOnCanvas(pageWrapper, pageNum, scale) {
    const canvasPdf = pageWrapper.querySelector('.cr-pdf-canvas');
    const contentDiv = pageWrapper.querySelector('.cr-page-content');
    if (!canvasPdf || !contentDiv || typeof Tesseract === 'undefined') return;
    
    const ocrIndicator = document.createElement('div');
    ocrIndicator.className = 'cr-ocr-status';
    ocrIndicator.style.cssText = 'position:absolute; bottom:16px; right:16px; background:rgba(0,0,0,0.75); color:#fff; font-size:11px; padding:6px 12px; border-radius:6px; z-index:100; font-family:sans-serif; backdrop-filter:blur(5px); display:flex; align-items:center; gap:6px; border:1px solid rgba(255,255,255,0.1);';
    ocrIndicator.innerHTML = `<span class="spinner" style="width:10px; height:10px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation:spin 1s linear infinite;"></span> Extracting text...`;
    contentDiv.appendChild(ocrIndicator);
    
    Tesseract.recognize(
      canvasPdf,
      'eng'
    ).then(({ data: { words } }) => {
      book.ocrData = book.ocrData || {};
      const normFactor = 600 / canvasPdf.width;
      book.ocrData[pageNum] = words.map(w => ({
        text: w.text,
        left: w.bbox.x0 * normFactor,
        top: w.bbox.y0 * normFactor,
        width: (w.bbox.x1 - w.bbox.x0) * normFactor,
        height: (w.bbox.y1 - w.bbox.y0) * normFactor
      }));
      save();
      ocrIndicator.remove();
      renderMobileOcrTextOverlay(pageWrapper, book.ocrData[pageNum], book.selectedSearchMatch, scale);
    }).catch(err => {
      console.error("OCR failed", err);
      ocrIndicator.innerHTML = "⚠️ Extraction failed";
      setTimeout(() => ocrIndicator.remove(), 2000);
    });
  }

  function renderPageSide(pageNum, isRightSide) {
    const sideContentDiv = isRightSide ? $('cr-page-content-right') : $('cr-page-content');
    const sideCanvasPdf = isRightSide ? $('cr-pdf-canvas-right') : $('cr-pdf-canvas');
    const sideCtxPdf = sideCanvasPdf?.getContext('2d');
    const sideCanvasMarkup = isRightSide ? $('cr-markup-canvas-right') : $('cr-markup-canvas');
    const sideCtxMarkup = sideCanvasMarkup?.getContext('2d');

    if (!sideContentDiv) return;

    if (pageNum > book.totalPages) {
      sideContentDiv.innerHTML = '';
      if (sideCtxPdf) {
        sideCanvasPdf.width = 600;
        sideCanvasPdf.height = 780;
        sideCtxPdf.clearRect(0, 0, 600, 780);
      }
      if (sideCtxMarkup) {
        sideCanvasMarkup.width = 600;
        sideCanvasMarkup.height = 780;
        sideCtxMarkup.clearRect(0, 0, 600, 780);
      }
      return;
    }

    if (book.fileType === 'pdf') {
      if (pdfDoc) {
        pdfDoc.getPage(pageNum).then(page => {
          const viewport = page.getViewport({ scale: 1 });
          const scaleX = 600 / viewport.width;
          const scaleY = 780 / viewport.height;
          const scale = Math.min(scaleX, scaleY);
          const scaledViewport = page.getViewport({ scale: scale });
          
          if (sideCanvasPdf) {
            sideCanvasPdf.width = 600;
            sideCanvasPdf.height = 780;
            sideCtxPdf.clearRect(0, 0, 600, 780);
            page.render({
              canvasContext: sideCtxPdf,
              viewport: scaledViewport
            }).promise.then(() => {
              book.highlights = book.highlights || {};
              const highlightKey = `${book.id}-${pageNum}`;
              
              page.getTextContent().then(textContent => {
                const nativeText = textContent.items.map(item => item.str).join(' ').trim();
                book.pdfTextCache = book.pdfTextCache || {};
                book.pdfTextCache[pageNum] = nativeText;
                
                if (pageNum === book.currentPage) {
                  if (window.reflowModeActive && typeof renderReflowContent === 'function') {
                    renderReflowContent();
                  }
                }
                
                if (book.highlights[highlightKey]) {
                  sideContentDiv.innerHTML = book.highlights[highlightKey];
                  applyCanvaReflowStyleToSpans(sideContentDiv, pageNum, sideCanvasPdf);
                } else {
                  if (nativeText.length > 10) {
                    sideContentDiv.innerHTML = '';
                    let charCounter = 0;
                    let spanIdx = 0;
                    textContent.items.forEach(item => {
                      const len = item.str.length;
                      const spanStart = charCounter;
                      const spanEnd = charCounter + len;
                      
                      let isMatch = false;
                      if (book.selectedSearchMatch && book.selectedSearchMatch.page === pageNum) {
                        const mStart = book.selectedSearchMatch.charOffset;
                        const mEnd = mStart + book.selectedSearchMatch.query.length;
                        if (spanStart < mEnd && spanEnd > mStart) {
                          isMatch = true;
                        }
                      }

                      const [left, top] = scaledViewport.convertToViewportPoint(item.transform[4], item.transform[5]);
                      const fontHeight = Math.abs(item.transform[3] * scale);
                      
                      const span = document.createElement('span');
                      span.setAttribute('data-span-id', spanIdx);
                      span.textContent = item.str;
                      span.style.position = 'absolute';
                      span.style.fontFamily = 'sans-serif';
                      span.style.fontSize = fontHeight + 'px';
                      span.style.left = left + 'px';
                      span.style.top = (top - fontHeight) + 'px';
                      span.style.color = 'transparent';
                      span.style.whiteSpace = 'pre';
                      span.style.cursor = 'text';
                      if (item.width) {
                        span.style.width = (item.width * scale) + 'px';
                      }
                      if (isMatch) {
                        span.style.backgroundColor = 'rgba(0, 122, 255, 0.38)';
                      }
                      
                      sideContentDiv.appendChild(span);
                      charCounter += len + 1;
                      spanIdx++;
                    });
                    applyCanvaReflowStyleToSpans(sideContentDiv, pageNum, sideCanvasPdf);
                  } else {
                    book.ocrData = book.ocrData || {};
                    if (book.ocrData[pageNum]) {
                      renderOcrTextOverlayForSide(book.ocrData[pageNum], book.selectedSearchMatch, sideContentDiv, pageNum);
                      applyCanvaReflowStyleToSpans(sideContentDiv, pageNum, sideCanvasPdf);
                    } else {
                      runOcrOnCanvasForSide(pageNum, sideCanvasPdf, sideContentDiv);
                    }
                  }
                }
                
                if (typeof window.renderPageAnnotations === 'function') {
                  window.renderPageAnnotations();
                }
              });
            });
          }
        });
      } else {
        sideContentDiv.innerHTML = `<p class="empty-hint" style="padding: 40px; font-size: 16px;">Loading PDF contents...</p>`;
      }
    } else {
      // TXT mode
      if (sideCanvasPdf && sideCtxPdf) {
        sideCanvasPdf.width = 600;
        sideCanvasPdf.height = 780;
        sideCtxPdf.clearRect(0, 0, 600, 780);
      }
      book.highlights = book.highlights || {};
      const highlightKey = `${book.id}-${pageNum}`;
      if (book.highlights[highlightKey]) {
        sideContentDiv.innerHTML = book.highlights[highlightKey];
      } else if (book.fileContent) {
        renderCanvaTxtContent(sideContentDiv, pageNum, isRightSide);
      }
    }

    // Load drawings on markup canvas
    if (sideCtxMarkup) {
      sideCanvasMarkup.width = 600;
      sideCanvasMarkup.height = 780;
      sideCtxMarkup.clearRect(0, 0, 600, 780);
      const docId = book.id;
      const key = `${docId}-${pageNum}-${isRightSide ? 'right' : 'left'}`;
      const vectors = drawingVectors[key];
      if (vectors) {
        vectors.forEach(v => {
          sideCtxMarkup.beginPath();
          sideCtxMarkup.moveTo(v.x1 * sideCanvasMarkup.width, v.y1 * sideCanvasMarkup.height);
          sideCtxMarkup.lineTo(v.x2 * sideCanvasMarkup.width, v.y2 * sideCanvasMarkup.height);
          sideCtxMarkup.lineWidth = v.tool === 'eraser' ? 24 : 6;
          sideCtxMarkup.strokeStyle = v.tool === 'eraser' ? 'rgba(0,0,0,0)' : '#ff453a';
          if (v.tool === 'eraser') {
            sideCtxMarkup.globalCompositeOperation = 'destination-out';
          } else {
            sideCtxMarkup.globalCompositeOperation = 'source-over';
          }
          sideCtxMarkup.lineCap = 'round';
          sideCtxMarkup.stroke();
        });
        sideCtxMarkup.globalCompositeOperation = 'source-over';
      }
    }
  }

  function runOcrOnCanvasForSide(pageNum, canvasPdf, sideContentDiv) {
    if (!canvasPdf || typeof Tesseract === 'undefined') return;
    
    const ocrIndicator = document.createElement('div');
    ocrIndicator.className = 'cr-ocr-status';
    ocrIndicator.style.cssText = 'position:absolute; bottom:16px; right:16px; background:rgba(0,0,0,0.75); color:#fff; font-size:11px; padding:6px 12px; border-radius:6px; z-index:100; font-family:sans-serif; backdrop-filter:blur(5px); display:flex; align-items:center; gap:6px; border:1px solid rgba(255,255,255,0.1);';
    ocrIndicator.innerHTML = `<span class="spinner" style="width:10px; height:10px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation:spin 1s linear infinite;"></span> Extracting text...`;
    sideContentDiv.appendChild(ocrIndicator);
    
    Tesseract.recognize(
      canvasPdf,
      'eng'
    ).then(({ data: { words } }) => {
      book.ocrData = book.ocrData || {};
      book.ocrData[pageNum] = words.map(w => ({
        text: w.text,
        left: w.bbox.x0,
        top: w.bbox.y0,
        width: w.bbox.x1 - w.bbox.x0,
        height: w.bbox.y1 - w.bbox.y0
      }));
      save();
      ocrIndicator.remove();
      renderOcrTextOverlayForSide(book.ocrData[pageNum], book.selectedSearchMatch, sideContentDiv, pageNum);
      
      if (pageNum === book.currentPage) {
        if (window.reflowModeActive && typeof renderReflowContent === 'function') {
          renderReflowContent();
        }
      }
      
      if (typeof window.renderPageAnnotations === 'function') {
        window.renderPageAnnotations();
      }
    }).catch(err => {
      console.error("OCR failed for side page " + pageNum, err);
      ocrIndicator.innerHTML = "⚠️ Extraction failed";
      setTimeout(() => ocrIndicator.remove(), 2000);
    });
  }

  function renderOcrTextOverlayForSide(words, selectedMatch, sideContentDiv, pageNum) {
    sideContentDiv.innerHTML = '';
    let charCounter = 0;
    words.forEach(w => {
      const len = w.text.length;
      const spanStart = charCounter;
      const spanEnd = charCounter + len;
      
      let isMatch = false;
      if (selectedMatch && selectedMatch.page === pageNum) {
        const mStart = selectedMatch.charOffset;
        const mEnd = mStart + selectedMatch.query.length;
        if (spanStart < mEnd && spanEnd > mStart) {
          isMatch = true;
        }
      }
      
      const span = document.createElement('span');
      span.textContent = w.text + ' ';
      span.style.position = 'absolute';
      span.style.fontFamily = 'sans-serif';
      span.style.left = w.left + 'px';
      span.style.top = w.top + 'px';
      span.style.width = w.width + 'px';
      span.style.height = w.height + 'px';
      span.style.fontSize = (w.height * 0.95) + 'px';
      span.style.color = 'transparent';
      span.style.whiteSpace = 'nowrap';
      span.style.cursor = 'text';
      span.style.transformOrigin = '0 0';
      if (isMatch) {
        span.style.backgroundColor = 'rgba(0, 122, 255, 0.38)';
      }
      
      sideContentDiv.appendChild(span);
      charCounter += len + 1;
    });
  }

  function renderPageAnnotationsForSide(pageNum) {
    const list = $('cr-notes-list');
    if (!list) return;
    list.innerHTML = '';
    
    book.annotations = book.annotations || {};
    // Combine notes if in 2-page view
    let notes = book.annotations[pageNum] || [];
    if (isTwoPage) {
      const rightNotes = book.annotations[pageNum + 1] || [];
      notes = notes.concat(rightNotes);
    }
    
    if (notes.length === 0) {
      list.innerHTML = '<div style="color:var(--txt3); padding:16px;">No marginal notes for this section. Select text and click Highlight to add one.</div>';
      return;
    }

    notes.forEach(n => {
      const li = document.createElement('li');
      li.style.padding = '12px';
      li.style.background = 'rgba(255, 235, 59, 0.1)';
      li.style.borderLeft = '3px solid #ffeb3b';
      li.style.borderRadius = '0 6px 6px 0';
      li.style.marginBottom = '8px';
      
      const content = document.createElement('div');
      content.textContent = n.text;
      content.style.marginBottom = '8px';
      
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete Note';
      delBtn.style.fontSize = '11px';
      delBtn.style.color = 'var(--danger)';
      delBtn.style.background = 'none';
      delBtn.style.border = 'none';
      delBtn.style.cursor = 'pointer';
      delBtn.style.padding = '0';
      delBtn.onclick = () => {
        book.annotations[pageNum] = (book.annotations[pageNum] || []).filter(an => an.id !== n.id);
        if (isTwoPage) {
          book.annotations[pageNum + 1] = (book.annotations[pageNum + 1] || []).filter(an => an.id !== n.id);
        }
        renderPageAnnotationsForSide(pageNum);
      };
      
      li.appendChild(content);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }

  window.renderPageAnnotations = () => {
    renderPageAnnotationsForSide(book.currentPage);
  };

  function initPageAnnotationHandlers(sideContentDiv, isRightSide) {
    if (!sideContentDiv) return;

    sideContentDiv.addEventListener('dblclick', e => {
      if (activeTool !== 'text') return;
      if (e.target.classList.contains('cr-text-note') || e.target.closest('.cr-text-note')) return;
      
      const pageNum = isRightSide ? book.currentPage + 1 : book.currentPage;
      if (pageNum > book.totalPages) return;

      const rect = sideContentDiv.getBoundingClientRect();
      const container = $('cr-page-view');
      const containerWidth = container.clientWidth - 20;
      const containerHeight = container.clientHeight - 20;
      const scaleX = containerWidth / 600;
      const scaleY = containerHeight / 780;
      const scaleFactor = Math.min(scaleX, scaleY, 1.0);
      const finalScale = scaleFactor * currentZoom;

      const left = (e.clientX - rect.left) / finalScale;
      const top = (e.clientY - rect.top) / finalScale;
      
      const note = document.createElement('div');
      note.className = 'cr-text-note';
      note.style.position = 'absolute';
      note.style.left = left + 'px';
      note.style.top = top + 'px';
      note.style.background = 'rgba(255, 235, 59, 0.95)';
      note.style.color = '#000000';
      note.style.padding = '6px 10px';
      note.style.borderRadius = '6px';
      note.style.fontSize = '12px';
      note.style.minWidth = '80px';
      note.style.outline = 'none';
      note.style.border = '1px solid rgba(0,0,0,0.15)';
      note.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
      note.style.zIndex = '30';
      note.contentEditable = 'true';
      
      sideContentDiv.appendChild(note);
      note.focus();
      
      const saveNote = () => {
        const txt = note.textContent.trim();
        if (!txt) {
          note.remove();
        } else {
          const noteId = Math.random().toString(36).substring(2, 9);
          book.annotations = book.annotations || {};
          book.annotations[pageNum] = book.annotations[pageNum] || [];
          book.annotations[pageNum].push({
            id: noteId,
            left,
            top,
            text: txt
          });
          save();
          note.remove(); // Remove from page since it will be in the sidebar
          if (window.renderPageAnnotations) window.renderPageAnnotations();
        }
      };
      
      note.addEventListener('blur', saveNote, {once: true});
      note.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' && !ev.shiftKey) {
          ev.preventDefault();
          note.blur();
        }
      });
    });

    sideContentDiv.addEventListener('click', e => {
      if (activeTool === 'eraser') {
        const note = e.target.closest('.cr-text-note');
        if (note) {
          const pageNum = isRightSide ? book.currentPage + 1 : book.currentPage;
          const noteId = note.dataset.id;
          book.annotations = book.annotations || {};
          book.annotations[pageNum] = (book.annotations[pageNum] || []).filter(x => x.id !== noteId);
          save();
          note.remove();
        }
      }
    });
  }

  function renderReaderPage(pageNum) {
    if (pageNum < 1) pageNum = 1;
    if (pageNum > book.totalPages) pageNum = book.totalPages;
    
    if (isTwoPage && pageNum % 2 === 0 && pageNum > 1) {
      pageNum--;
    }

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const pw = $('cr-page-container')?.querySelector(`.cr-page-wrapper[data-page="${pageNum}"]`);
      if (pw) {
        pw.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        book.currentPage = pageNum;
        book.progress = Math.round((book.currentPage / book.totalPages) * 100);
        save();
        
        const slider = $('cr-page-slider');
        if (slider) slider.value = pageNum;
        const label = $('cr-page-label');
        if (label) label.textContent = `Page ${pageNum} of ${book.totalPages} (${book.progress}%)`;
      }
      return;
    }

    book.currentPage = pageNum;
    book.progress = Math.round((book.currentPage / book.totalPages) * 100);
    save();

    document.querySelectorAll('.cr-outline-item').forEach(li => {
      const p = parseInt(li.dataset.page);
      if (p) {
        const step = Math.max(5, Math.ceil(book.totalPages / 5));
        li.classList.toggle('active', pageNum >= p && pageNum < p + step);
      }
    });

    const slider = $('cr-page-slider');
    if (slider) {
      slider.max = book.totalPages;
      slider.value = pageNum;
    }
    const label = $('cr-page-label');
    if (label) {
      label.textContent = isTwoPage && pageNum < book.totalPages
        ? `Page ${pageNum} - ${pageNum + 1} of ${book.totalPages} (${book.progress}%)`
        : `Page ${pageNum} of ${book.totalPages} (${book.progress}%)`;
    }

    renderPageSide(pageNum, false);

    if (isTwoPage) {
      renderPageSide(pageNum + 1, true);
    } else {
      renderPageSide(book.totalPages + 999, true);
    }
    
    if (typeof window.renderPageAnnotations === 'function') {
      window.renderPageAnnotations();
    }
    setTimeout(adjustReaderResponsiveScale, 100);

    if (typeof logInteraction === 'function') {
      logInteraction('page-turn', { bookTitle: book.title, page: pageNum });
    }
    if (window.reflowModeActive && typeof renderReflowContent === 'function') {
      renderReflowContent();
    }
  }

  function applyCanvaReflowStyleToSpans(sideContentDiv, pageNum, pdfCanvas) {
    if (!sideContentDiv) return;
    const spans = sideContentDiv.querySelectorAll('span[data-span-id]');
    const docId = book.id;

    // Helper: sample average background color from PDF canvas at a span's position
    function sampleCanvasBg(span) {
      if (!pdfCanvas) return { bg: 'transparent', fg: '#111' };
      try {
        const ctx = pdfCanvas.getContext('2d');
        const x = Math.max(0, parseInt(span.style.left) || 0);
        const y = Math.max(0, parseInt(span.style.top) || 0);
        const w = Math.max(4, parseInt(span.style.width) || 20);
        const h = Math.max(4, parseInt(span.style.height) || 14);
        // Sample a small patch from the canvas background
        const data = ctx.getImageData(x, Math.max(0, y - 2), Math.min(w, 60), Math.min(h, 20)).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i+1]; b += data[i+2]; count++;
        }
        if (count === 0) return { bg: '#fff', fg: '#111' };
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // Perceptual brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const bg = `rgb(${r},${g},${b})`;
        const fg = brightness > 140 ? '#111111' : '#f0f0f0';
        return { bg, fg };
      } catch (_) {
        return { bg: '#fff', fg: '#111' };
      }
    }

    spans.forEach((span) => {
      const spanId = span.getAttribute('data-span-id');
      const patchKey = `${docId}-${pageNum}-${spanId}`;
      const hasPatch = !!(STATE.reflowPatches && STATE.reflowPatches[patchKey]);

      // Always show saved patch text
      if (hasPatch) {
        span.textContent = STATE.reflowPatches[patchKey];
      }

      if (window.reflowModeActive) {
        // ── EDIT MODE: Canva-style editable box ──
        span.contentEditable = 'true';
        span.style.color = '#111';
        span.style.background = hasPatch ? 'rgba(255,200,80,0.18)' : 'rgba(255,255,255,0.82)';
        span.style.border = hasPatch ? '1.5px solid rgba(255,149,0,0.7)' : '1px dashed rgba(80,80,80,0.45)';
        span.style.borderRadius = '2px';
        span.style.padding = '0 2px';
        span.style.zIndex = '15';
        span.style.pointerEvents = 'auto';
        span.style.cursor = 'text';
        span.style.outline = 'none';
        span.style.minWidth = '4px';
        span.style.display = 'inline-block';
        span.style.textDecoration = '';
        span.style.boxShadow = hasPatch ? '0 0 0 2px rgba(255,149,0,0.15)' : '';

        span.onmouseenter = () => {
          span.style.border = '1.5px solid #ff9500';
          span.style.background = 'rgba(255,149,0,0.14)';
          span.style.boxShadow = '0 0 0 3px rgba(255,149,0,0.2)';
        };
        span.onmouseleave = () => {
          span.style.border = hasPatch ? '1.5px solid rgba(255,149,0,0.7)' : '1px dashed rgba(80,80,80,0.45)';
          span.style.background = hasPatch ? 'rgba(255,200,80,0.18)' : 'rgba(255,255,255,0.82)';
          span.style.boxShadow = hasPatch ? '0 0 0 2px rgba(255,149,0,0.15)' : '';
        };

        span.oninput = () => {
          const txt = span.textContent.trim();
          if (txt) {
            STATE.reflowPatches = STATE.reflowPatches || {};
            STATE.reflowPatches[patchKey] = txt;
            localStorage.setItem('nv-reflow-patches', JSON.stringify(STATE.reflowPatches));
            save();
          }
        };

        span.onkeydown = (e) => {
          if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
        };

        span.onblur = () => {
          const txt = span.textContent.trim();
          if (txt) {
            STATE.reflowPatches = STATE.reflowPatches || {};
            STATE.reflowPatches[patchKey] = txt;
            localStorage.setItem('nv-reflow-patches', JSON.stringify(STATE.reflowPatches));
            const highlightKey = `${book.id}-${pageNum}`;
            book.highlights = book.highlights || {};
            book.highlights[highlightKey] = sideContentDiv.innerHTML;
            save();
            span.style.border = '1.5px solid rgba(255,149,0,0.7)';
            span.style.background = 'rgba(255,200,80,0.18)';
            if (typeof broadcastSyncEvent === 'function') {
              broadcastSyncEvent('sync-reflow', { patchKey, text: txt });
            }
          }
        };

      } else {
        // ── VIEW MODE ──
        span.contentEditable = 'false';
        span.onmouseenter = null;
        span.onmouseleave = null;
        span.oninput = null;
        span.onkeydown = null;
        span.onblur = null;
        span.style.boxShadow = '';
        span.style.display = '';
        span.style.minWidth = '';
        span.style.outline = '';

        if (hasPatch) {
          // Sample the actual PDF canvas pixel at this word's location
          // so we cover the original text with EXACTLY the page background color,
          // then draw the new text in the matching foreground color.
          const { bg, fg } = sampleCanvasBg(span);
          span.style.background = bg;
          span.style.color = fg;
          span.style.border = 'none';
          span.style.padding = '0';
          span.style.zIndex = '8';
          span.style.pointerEvents = 'none';
          span.style.cursor = 'default';
          span.style.borderRadius = '0';
          // Subtle orange dotted underline — only visual cue that this word was edited
          span.style.textDecoration = 'underline';
          span.style.textDecorationColor = 'rgba(255,149,0,0.6)';
          span.style.textDecorationStyle = 'dotted';
        } else {
          // Unedited — fully transparent, PDF canvas shows through
          span.style.color = 'transparent';
          span.style.background = 'transparent';
          span.style.border = 'none';
          span.style.padding = '0';
          span.style.zIndex = '';
          span.style.pointerEvents = '';
          span.style.cursor = 'default';
          span.style.textDecoration = '';
          span.style.borderRadius = '';
        }
      }
    });
  }

  function renderCanvaTxtContent(sideContentDiv, pageNum, isRightSide) {
    if (!book.fileContent) return;
    
    const words = book.fileContent.split(/\s+/);
    const startIdx = (pageNum - 1) * 200;
    const pageWords = words.slice(startIdx, startIdx + 200);
    const htmlContent = pageWords.join(' ');
    
    const sentences = htmlContent.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const docId = book.id;
    
    sideContentDiv.innerHTML = `<h3 style="margin-top:0; color:var(--cascara); font-family:var(--font);">${isRightSide ? '' : book.title}</h3>`;
    const containerPara = document.createElement('p');
    containerPara.style.cssText = 'white-space: pre-wrap; font-family:Georgia, serif; font-size:16px; line-height:1.8;';
    
    sentences.forEach((s, idx) => {
      const patchKey = `${docId}-${pageNum}-${idx}`;
      const savedText = (STATE.reflowPatches && STATE.reflowPatches[patchKey]) || s.trim();
      
      const span = document.createElement('span');
      span.textContent = savedText + ' ';
      span.className = 'canva-txt-node';
      span.style.transition = '0.2s';
      
      if (window.reflowModeActive) {
        span.contentEditable = 'true';
        span.style.color = 'var(--txt1)';
        span.style.background = 'rgba(255,255,255,0.04)';
        span.style.border = '1px dashed var(--cascara)';
        span.style.borderRadius = '4px';
        span.style.padding = '2px 4px';
        span.style.margin = '0 2px';
        span.style.cursor = 'text';
        span.style.display = 'inline-block';
        
        span.onmouseenter = () => {
          span.style.border = '1px dashed #ff9500';
          span.style.background = 'rgba(255, 149, 0, 0.1)';
        };
        span.onmouseleave = () => {
          span.style.border = '1px dashed var(--cascara)';
          span.style.background = 'rgba(255,255,255,0.04)';
        };

        span.oninput = () => {
          const txt = span.textContent.trim();
          if (txt) {
            STATE.reflowPatches = STATE.reflowPatches || {};
            STATE.reflowPatches[patchKey] = txt;
            localStorage.setItem('nv-reflow-patches', JSON.stringify(STATE.reflowPatches));
            save();
          }
        };

        span.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            span.blur();
          }
        };

        span.onblur = () => {
          const txt = span.textContent.trim();
          if (txt) {
            STATE.reflowPatches = STATE.reflowPatches || {};
            STATE.reflowPatches[patchKey] = txt;
            localStorage.setItem('nv-reflow-patches', JSON.stringify(STATE.reflowPatches));
            save();
            if (typeof broadcastSyncEvent === 'function') {
              broadcastSyncEvent('sync-reflow', { patchKey, text: txt });
            }
          }
        };
      }
      
      containerPara.appendChild(span);
    });
    
    sideContentDiv.appendChild(containerPara);
  }

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDraw = (e) => {
    if (activeTool !== 'pen' && activeTool !== 'eraser') return;
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    
    if (activeTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(232, 101, 42, 0.45)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    lastX = pos.x;
    lastY = pos.y;
  };

  const endDraw = () => {
    if (isDrawing) {
      isDrawing = false;
      book.drawings = book.drawings || {};
      book.drawings[book.currentPage] = canvas.toDataURL();
      save();
    }
  };

  // Clone left canvas to clear old drawing listeners and initialize modern drawing logic
  const canvasLeft = $('cr-markup-canvas');
  if (canvasLeft) {
    const newLeftCanvas = canvasLeft.cloneNode(true);
    canvasLeft.parentNode.replaceChild(newLeftCanvas, canvasLeft);
    if (typeof initMarkupCanvasDrawing === 'function') {
      initMarkupCanvasDrawing('cr-markup-canvas', false);
    } else if (typeof window.initMarkupCanvasDrawing === 'function') {
      window.initMarkupCanvasDrawing('cr-markup-canvas', false);
    }
  }

  // Clone right canvas to clear old drawing listeners and initialize modern drawing logic
  const canvasRight = $('cr-markup-canvas-right');
  if (canvasRight) {
    const newRightCanvas = canvasRight.cloneNode(true);
    canvasRight.parentNode.replaceChild(newRightCanvas, canvasRight);
    if (typeof initMarkupCanvasDrawing === 'function') {
      initMarkupCanvasDrawing('cr-markup-canvas-right', true);
    } else if (typeof window.initMarkupCanvasDrawing === 'function') {
      window.initMarkupCanvasDrawing('cr-markup-canvas-right', true);
    }
  }
  canvas = $('cr-markup-canvas') || canvas;
  ctx = canvas.getContext('2d');

  // Wire Summarization Panel controls dynamically
  const summarizerClose = $('cr-summarization-close');
  if (summarizerClose) {
    summarizerClose.onclick = () => {
      $('cr-summarization-panel')?.classList.add('hidden');
      $('cr-btn-summary')?.classList.remove('active');
      setTimeout(adjustReaderResponsiveScale, 200);
    };
  }

  const summarizerGenerate = $('cr-summary-generate-btn');
  if (summarizerGenerate) {
    summarizerGenerate.onclick = () => {
      if (currentReaderBook) {
        window.updatePageSummaryDisplay(currentReaderBook.currentPage || 1, true);
      }
    };
  }

  const summarizerSlider = $('cr-summary-depth');
  if (summarizerSlider) {
    const handleSliderInput = () => {
      const val = parseInt(summarizerSlider.value);
      const label = $('cr-summary-depth-label');
      if (label) {
        if (val === 1) label.textContent = 'NORMAL';
        else if (val === 2) label.textContent = 'MEDIUM';
        else if (val === 3) label.textContent = 'DETAILED';
      }
      if (currentReaderBook) {
        window.updatePageSummaryDisplay(currentReaderBook.currentPage || 1, true);
      }
    };
    summarizerSlider.oninput = handleSliderInput;
    summarizerSlider.onchange = handleSliderInput;
  }

  document.querySelectorAll('.cr-tool-btn').forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', () => {
      const toolId = newBtn.id;
      
      if (toolId === 'cr-tool-find') {
        const sidebar = $('cr-sidebar');
        if (sidebar) {
          sidebar.classList.remove('hidden');
          const input = $('cr-search-input');
          if (input) input.focus();
        }
        return;
      }

      if (toolId === 'cr-tool-spread') {
        isTwoPage = !isTwoPage;
        newBtn.classList.toggle('active', isTwoPage);
        const viewport = $('cr-page-view');
        if (viewport) {
          viewport.classList.toggle('cr-spread-view', isTwoPage);
        }
        const rightWrapper = $('cr-page-wrapper-right');
        if (rightWrapper) {
          if (isTwoPage) rightWrapper.classList.remove('hidden');
          else rightWrapper.classList.add('hidden');
        }
        renderReaderPage(book.currentPage);
        return;
      }

      if (toolId === 'cr-mic-capture-btn') {
        triggerSmartMicCapture(newBtn);
        return;
      }
      if (toolId === 'cr-btn-reflow') {
        window.reflowModeActive = !window.reflowModeActive;
        newBtn.classList.toggle('active', window.reflowModeActive);
        
        $('cr-reflow-container')?.classList.add('hidden');
        $('cr-page-view')?.classList.remove('hidden');

        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          document.querySelectorAll('.cr-page-wrapper').forEach(pw => {
            const pageNum = parseInt(pw.dataset.page);
            const contentDiv = pw.querySelector('.cr-page-content');
            const canvasPdf = pw.querySelector('.cr-pdf-canvas');
            if (contentDiv && pageNum) {
              applyCanvaReflowStyleToSpans(contentDiv, pageNum, canvasPdf);
            }
          });
        }

        renderReaderPage(book.currentPage);
        triggerNotification('Sentence Editor Active', window.reflowModeActive ? 'Canva-style visual text boxes active 🪄' : 'Restored standard selection overlay');
        return;
      }
      if (toolId === 'cr-btn-summary') {
        const summaryPanel = $('cr-summarization-panel');
        if (summaryPanel) {
          const isHidden = summaryPanel.classList.toggle('hidden');
          newBtn.classList.toggle('active', !isHidden);
          if (!isHidden && currentReaderBook) {
            window.updatePageSummaryDisplay(book.currentPage || 1, true);
          }
          setTimeout(adjustReaderResponsiveScale, 200);
        }
        return;
      }
      
      activeTool = toolId.replace('cr-tool-', '');
      overlay.dataset.activeTool = activeTool;
      
      if (activeTool === 'hl-yellow') { highlightSelection('rgba(255, 213, 79, 0.45)'); return; }
      if (activeTool === 'hl-green') { highlightSelection('rgba(129, 199, 132, 0.45)'); return; }
      if (activeTool === 'hl-blue') { highlightSelection('rgba(100, 181, 246, 0.45)'); return; }
      if (activeTool === 'zoom-in') { if (currentZoom < 2.0) { currentZoom += 0.15; updateZoom(); } return; }
      if (activeTool === 'zoom-out') { if (currentZoom > 0.5) { currentZoom -= 0.15; updateZoom(); } return; }

      document.querySelectorAll('.cr-tool-btn').forEach(b => b.classList.remove('active'));
      newBtn.classList.add('active');
      if (activeTool === 'pen' || activeTool === 'eraser') {
        canvas.classList.add('active');
      } else {
        canvas.classList.remove('active');
      }
    });
  });

  // Summary close button wired in main initialization block

  // Keyboard navigation
  const handleKeyboardNav = e => {
    if (overlay.classList.contains('hidden')) return;
    if (document.activeElement && (document.activeElement.id === 'cr-search-input' || document.activeElement.id === 'cr-chat-input')) return;
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      if (book.currentPage < book.totalPages) {
        renderReaderPage(book.currentPage + (isTwoPage ? 2 : 1));
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (book.currentPage > 1) {
        renderReaderPage(book.currentPage - (isTwoPage ? 2 : 1));
        e.preventDefault();
      }
    }
  };
  if (window._handleKeyboardNav) {
    window.removeEventListener('keydown', window._handleKeyboardNav);
  }
  if (window._adjustReaderResponsiveScale) {
    window.removeEventListener('resize', window._adjustReaderResponsiveScale);
  }
  window._handleKeyboardNav = handleKeyboardNav;
  window._adjustReaderResponsiveScale = adjustReaderResponsiveScale;

  window.addEventListener('keydown', window._handleKeyboardNav);
  window.addEventListener('resize', window._adjustReaderResponsiveScale);

  // Clone page content containers to strip accumulated event listeners
  const pageContentLeft = $('cr-page-content');
  if (pageContentLeft) {
    const newLeft = pageContentLeft.cloneNode(true);
    pageContentLeft.parentNode.replaceChild(newLeft, pageContentLeft);
  }
  const pageContentRight = $('cr-page-content-right');
  if (pageContentRight) {
    const newRight = pageContentRight.cloneNode(true);
    pageContentRight.parentNode.replaceChild(newRight, pageContentRight);
  }

  // Initialize annotations double click and delete actions on both page content overlays
  initPageAnnotationHandlers($('cr-page-content'), false);
  initPageAnnotationHandlers($('cr-page-content-right'), true);

  // Close handlers for reflow and summarization panels
  const reflowClose = $('cr-reflow-close-btn');
  if (reflowClose) {
    reflowClose.onclick = () => {
      window.reflowModeActive = false;
      const reflowBtn = $('cr-btn-reflow');
      if (reflowBtn) reflowBtn.classList.remove('active');
      $('cr-reflow-container')?.classList.add('hidden');
      $('cr-page-view')?.classList.remove('hidden');
    };
  }

  // Summary close handled by main initialization block above
  function triggerSmartMicCapture(buttonElement) {
    let recognition = null;
    const isRecording = buttonElement.classList.toggle('active');
    if (!isRecording) {
      buttonElement.style.color = '';
      return;
    }
    
    buttonElement.style.color = '#ff3b30';
    triggerNotification('Smart Capture Active', 'Listening to ambient audio logs... 🎙');
    
    const recOverlay = document.createElement('div');
    recOverlay.id = 'cr-rec-overlay';
    recOverlay.style = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:2000; color:#fff; font-family:sans-serif; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);';
    recOverlay.innerHTML = `
      <div style="font-size:16px; font-weight:700; color:#ff9500; margin-bottom:10px;">🎙 WEB SPEECH SMART CAPTURE</div>
      <div id="cr-rec-wave" style="display:flex; gap:6px; align-items:center; height:50px; margin-bottom:20px;">
        <span style="display:block; width:4px; height:15px; background:#ff453a; border-radius:2px; animation:bounce 0.8s infinite alternate;"></span>
        <span style="display:block; width:4px; height:35px; background:#ff453a; border-radius:2px; animation:bounce 0.8s infinite alternate 0.2s;"></span>
        <span style="display:block; width:4px; height:20px; background:#ff453a; border-radius:2px; animation:bounce 0.8s infinite alternate 0.4s;"></span>
        <span style="display:block; width:4px; height:40px; background:#ff453a; border-radius:2px; animation:bounce 0.8s infinite alternate 0.1s;"></span>
        <span style="display:block; width:4px; height:15px; background:#ff453a; border-radius:2px; animation:bounce 0.8s infinite alternate 0.3s;"></span>
      </div>
      <div id="cr-rec-transcript" style="font-size:15px; max-width:80%; text-align:center; min-height:40px; margin-bottom:30px; line-height:1.5; color:#fff; font-style:italic;">
        "Say something to take a note..."
      </div>
      <div style="display:flex; gap:12px;">
        <button id="cr-rec-save-journal" class="btn-primary" style="padding:10px 20px; border-radius:30px; border:none; background:#007aff; color:#fff; font-weight:600; cursor:pointer; display:none;">Save to Journal</button>
        <button id="cr-rec-save-note" class="btn-primary" style="padding:10px 20px; border-radius:30px; border:none; background:#ff9500; color:#fff; font-weight:600; cursor:pointer; display:none;">Save to Margin Note</button>
        <button id="cr-rec-stop-btn" class="btn-primary" style="padding:10px 24px; border-radius:30px; border:none; background:#ff453a; color:#fff; font-weight:600; cursor:pointer;">Stop Capture</button>
      </div>
    `;
    document.body.appendChild(recOverlay);

    if (!document.getElementById('rec-wave-style')) {
      const style = document.createElement('style');
      style.id = 'rec-wave-style';
      style.innerHTML = `
        @keyframes bounce {
          0% { transform: scaleY(1); }
          100% { transform: scaleY(2.2); }
        }
      `;
      document.head.appendChild(style);
    }

    let finalTranscript = "";
    try {
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          $('cr-rec-transcript').textContent = finalTranscript || interimTranscript || '"Say something..."';
        };

        recognition.onerror = (e) => {
          console.error("Speech Recognition Error", e);
          $('cr-rec-transcript').innerHTML = `
            <div style="font-size:12px; color:#ff9500; margin-bottom:8px;">⚠️ Mic error or permission denied. Enter note manually:</div>
            <textarea id="cr-rec-manual-input" style="width:260px; height:80px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#fff; border-radius:8px; padding:8px; outline:none; resize:none; font-family:inherit; font-size:13px;" placeholder="Type your note here...">Reviewing this section guideline for study notes.</textarea>
          `;
          $('cr-rec-wave').style.display = 'none';
          $('cr-rec-stop-btn').style.display = 'none';
          
          const jBtn = $('cr-rec-save-journal');
          const nBtn = $('cr-rec-save-note');
          if (jBtn) jBtn.style.display = 'block';
          if (nBtn) nBtn.style.display = 'block';

          setupManualSaveHandlers(jBtn, nBtn, recOverlay, buttonElement);
        };

        recognition.start();
      } else {
        showManualInputOnly();
      }
    } catch (err) {
      console.error("Failed to start SpeechRecognition", err);
      showManualInputOnly();
    }

    function showManualInputOnly() {
      $('cr-rec-transcript').innerHTML = `
        <div style="font-size:12px; color:#ff9500; margin-bottom:8px;">Speech recognition not supported in this browser.</div>
        <textarea id="cr-rec-manual-input" style="width:260px; height:80px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#fff; border-radius:8px; padding:8px; outline:none; resize:none; font-family:inherit; font-size:13px;" placeholder="Type your note here instead...">Reviewing this section guideline for study notes.</textarea>
      `;
      $('cr-rec-wave').style.display = 'none';
      $('cr-rec-stop-btn').style.display = 'none';
      
      const jBtn = $('cr-rec-save-journal');
      const nBtn = $('cr-rec-save-note');
      if (jBtn) jBtn.style.display = 'block';
      if (nBtn) nBtn.style.display = 'block';

      setupManualSaveHandlers(jBtn, nBtn, recOverlay, buttonElement);
    }

    function setupManualSaveHandlers(jBtn, nBtn, recOverlay, buttonElement) {
      const getManualText = () => {
        const manualInput = $('cr-rec-manual-input');
        return manualInput ? manualInput.value.trim() : "";
      };

      const docTitle = currentReaderBook ? currentReaderBook.title : 'Document';
      const pageNum = currentReaderBook ? (currentReaderBook.currentPage || 1) : 1;

      jBtn.onclick = () => {
        const text = getManualText() || "Reviewing this section guideline for study notes.";
        const newEntry = {
          id: randomId(),
          title: `🎙 Smart Capture: Page ${pageNum}`,
          body: `<p>${text}</p>`,
          date: today(),
          timestamp: Date.now(),
          mood: '🙂',
          attachments: [{ type: 'location', name: `Captured in: ${docTitle}, Page ${pageNum}` }]
        };
        STATE.journalEntries.push(newEntry);
        save();
        renderJournal();
        renderSmartCaptureList();
        logInteraction('smart-capture', { bookTitle: docTitle, page: pageNum, transcription: text });
        triggerNotification('Micro-Journal Created', 'Smart capture note successfully saved 🔥');
        recOverlay.remove();
        buttonElement.classList.remove('active');
        buttonElement.style.color = '';
      };

      nBtn.onclick = () => {
        const text = getManualText() || "Reviewing this section guideline for study notes.";
        if (currentReaderBook) {
          currentReaderBook.annotations = currentReaderBook.annotations || {};
          currentReaderBook.annotations[pageNum] = currentReaderBook.annotations[pageNum] || [];
          const noteId = Math.random().toString(36).substring(2, 9);
          currentReaderBook.annotations[pageNum].push({
            id: noteId,
            left: 150,
            top: 300,
            text: text
          });
        }
        save();
        if (typeof window.renderPageAnnotations === 'function') window.renderPageAnnotations();
        logInteraction('margin-note-dictation', { bookTitle: docTitle, page: pageNum, transcription: text });
        triggerNotification('Note Saved to Page', 'Transcribed note placed on page 📝');
        recOverlay.remove();
        buttonElement.classList.remove('active');
        buttonElement.style.color = '';
      };
    }
    const stopCapture = () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (_) {}
      }
      
      const manualInput = $('cr-rec-manual-input');
      if (manualInput) {
        finalTranscript = manualInput.value.trim();
      }

      const textToShow = finalTranscript || "Reviewing this section guideline for study notes.";

      $('cr-rec-transcript').innerHTML = `
        <div style="font-size:12px; color:#ff9500; margin-bottom:8px;">EDIT NOTE IN CARD:</div>
        <textarea id="cr-rec-manual-input" style="width:260px; height:80px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#fff; border-radius:8px; padding:8px; outline:none; resize:none; font-family:inherit; font-size:13px;" placeholder="Type your note here...">${textToShow}</textarea>
      `;
      $('cr-rec-wave').style.display = 'none';
      $('cr-rec-stop-btn').style.display = 'none';
      
      const jBtn = $('cr-rec-save-journal');
      const nBtn = $('cr-rec-save-note');
      if (jBtn) jBtn.style.display = 'block';
      if (nBtn) nBtn.style.display = 'block';

      const docTitle = currentReaderBook ? currentReaderBook.title : 'Document';
      const pageNum = currentReaderBook ? (currentReaderBook.currentPage || 1) : 1;

      jBtn.onclick = () => {
        const manualInput = $('cr-rec-manual-input');
        const text = manualInput ? manualInput.value.trim() : finalTranscript;
        const newEntry = {
          id: randomId(),
          title: `🎙 Smart Capture: Page ${pageNum}`,
          body: `<p>${text}</p>`,
          date: today(),
          timestamp: Date.now(),
          mood: '🙂',
          attachments: [
            { type: 'location', name: `Captured in: ${docTitle}, Page ${pageNum}` }
          ]
        };
        STATE.journalEntries.push(newEntry);
        save();
        renderJournal();
        renderSmartCaptureList();
        logInteraction('smart-capture', { bookTitle: docTitle, page: pageNum, transcription: text });
        triggerNotification('Micro-Journal Created', 'Smart capture note successfully saved 🔥');
        recOverlay.remove();
        buttonElement.classList.remove('active');
        buttonElement.style.color = '';
      };

      nBtn.onclick = () => {
        const manualInput = $('cr-rec-manual-input');
        const text = manualInput ? manualInput.value.trim() : finalTranscript;
        if (currentReaderBook) {
          currentReaderBook.annotations = currentReaderBook.annotations || {};
          currentReaderBook.annotations[pageNum] = currentReaderBook.annotations[pageNum] || [];
          const noteId = Math.random().toString(36).substring(2, 9);
          currentReaderBook.annotations[pageNum].push({
            id: noteId,
            left: 150,
            top: 300,
            text: text
          });
        }
        save();
        if (typeof window.renderPageAnnotations === 'function') window.renderPageAnnotations();
        logInteraction('margin-note-dictation', { bookTitle: docTitle, page: pageNum, transcription: text });
        triggerNotification('Note Saved to Page', 'Transcribed note placed on page 📝');
        recOverlay.remove();
        buttonElement.classList.remove('active');
        buttonElement.style.color = '';
      };
    };

    $('cr-rec-stop-btn').onclick = stopCapture;
  }

  window.renderReflowContent = () => {
    const reflowBody = $('cr-reflow-body');
    if (!reflowBody) return;

    const pageNum = currentReaderBook ? (currentReaderBook.currentPage || 1) : 1;
    const docId = currentReaderBook ? currentReaderBook.id : 'default';

    let defaultText = "";
    if (currentReaderBook) {
      if (currentReaderBook.fileType === 'pdf') {
        defaultText = (currentReaderBook.pdfTextCache && currentReaderBook.pdfTextCache[pageNum]) || "";
        if (!defaultText && currentReaderBook.ocrData && currentReaderBook.ocrData[pageNum]) {
          defaultText = currentReaderBook.ocrData[pageNum].map(w => w.text).join(' ');
        }
      } else {
        if (currentReaderBook.fileContent) {
          const words = currentReaderBook.fileContent.split(/\s+/);
          const startIdx = (pageNum - 1) * 200;
          defaultText = words.slice(startIdx, startIdx + 200).join(' ');
        }
      }
    }

    if (!defaultText || defaultText.trim().length < 5) {
      defaultText = "No text content available on this page to reflow. If this is a scanned document, please wait for automatic OCR text extraction to finish.";
    }

    // Split into sentences
    const sentences = defaultText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    reflowBody.innerHTML = sentences.map((s, idx) => {
      const patchKey = `${docId}-${pageNum}-${idx}`;
      const isEdited = STATE.reflowPatches && STATE.reflowPatches[patchKey];
      const savedText = isEdited || s.trim();
      
      return `
        <div class="reflow-sentence-card" style="display:flex; flex-direction:column; gap:8px; padding:12px 16px; background:${isEdited ? 'rgba(48,209,88,0.06)' : 'rgba(255,255,255,0.02)'}; border:1px solid ${isEdited ? '#30d158' : 'rgba(255,255,255,0.05)'}; border-radius:12px; transition:0.2s;">
          <div class="reflow-para" contenteditable="true" data-index="${idx}" style="font-size:14px; line-height:1.6; color:#fff; outline:none; cursor:text;" onblur="appSaveReflowEdit(this, '${docId}', ${pageNum}, ${idx})">${savedText}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.04); padding-top:8px;">
            <span style="font-size:10px; color:${isEdited ? '#30d158' : 'var(--txt3)'}; font-weight:600;">${isEdited ? '✓ Edited & Saved' : 'Sentence ' + (idx + 1)}</span>
            <div style="display:flex; gap:8px;">
              <button onclick="simplifyReflowSentence(this, '${docId}', ${pageNum}, ${idx})" style="background:rgba(255,149,0,0.12); border:none; color:#ff9500; font-size:10px; padding:4px 8px; border-radius:6px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:4px;">🪄 Simplify</button>
              <button onclick="speakReflowSentence('${docId}-${pageNum}-${idx}')" style="background:rgba(0,122,255,0.12); border:none; color:#007aff; font-size:10px; padding:4px 8px; border-radius:6px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:4px;">🔊 Speak</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  window.speakReflowSentence = (key) => {
    const el = document.querySelector(`.reflow-para[onblur*="${key.split('-')[0]}"][onblur*="${key.split('-')[1]}"][onblur*="${key.split('-')[2]}"]`) || document.querySelector(`[onblur*="${key.split('-')[1]}"][onblur*="${key.split('-')[2]}"]`);
    const txt = el ? el.textContent.trim() : "";
    if (!txt) return;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(txt);
      window.speechSynthesis.speak(utterance);
    }
  };

  window.simplifyReflowSentence = async (buttonElement, docId, pageNum, idx) => {
    const card = buttonElement.closest('.reflow-sentence-card');
    const editable = card.querySelector('.reflow-para');
    const originalText = editable.textContent.trim();

    buttonElement.disabled = true;
    buttonElement.innerHTML = `⏳ Simplifying...`;

    try {
      const apiKey = "AQ.Ab8RN6JelORN2ShF8wyQwg1gOMFY5a2NyugV2xw-zEsa3piVvg";
      const payload = {
        contents: [{ role: "user", parts: [{ text: `Please rewrite this textbook sentence in extremely simple, easy-to-understand student language (1 sentence maximum, do not include any prefixes or meta-text, just output the simplified sentence): "${originalText}"` }] }],
        generationConfig: { temperature: 0.6 }
      };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Simplification failed");
      const data = await res.json();
      const simplifiedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (simplifiedText) {
        editable.textContent = simplifiedText.replace(/"/g, '').trim();
        editable.blur();
        buttonElement.innerHTML = `🪄 Simplified`;
        card.style.background = 'rgba(48,209,88,0.06)';
        card.style.borderColor = '#30d158';
      } else {
        throw new Error();
      }
    } catch (e) {
      const simplifiedText = originalText
        .replace(/boundaries map directly/g, "borders align")
        .replace(/proposed conservation strategy/g, "protection plan")
        .replace(/zonal buffer corridors outline/g, "safety pathways show")
        .replace(/migration channels across regional sectors/g, "animal travel routes");
      
      editable.textContent = simplifiedText;
      editable.blur();
      buttonElement.innerHTML = `🪄 Simplified (Local)`;
    } finally {
      buttonElement.disabled = false;
    }
  };

  // ==========================================
  // Restored Advanced Reader Features Wiring
  // ==========================================
  
  // Default reader theme state check
  const loadDefaultTheme = () => {
    const themeVal = $('cr-theme-select')?.value || 'light';
    overlay.className = `cascara-reader-overlay theme-${themeVal}`;
  };
  loadDefaultTheme();

  // Popover Manager
  const hideAllPopovers = () => {
    $('cr-speech-settings')?.classList.add('hidden');
    $('cr-font-settings')?.classList.add('hidden');
    $('cr-pen-settings')?.classList.add('hidden');
  };

  // Typography Preferences
  document.querySelectorAll('.cr-font-family-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cr-font-family-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const fam = btn.dataset.family;
      if (contentDiv) {
        const textContainer = contentDiv.querySelector('p');
        if (textContainer) textContainer.style.fontFamily = fam;
      }
    });
  });

  const fontSlider = $('cr-font-size-slider');
  if (fontSlider) {
    fontSlider.addEventListener('input', (e) => {
      if (contentDiv) {
        const textContainer = contentDiv.querySelector('p');
        if (textContainer) textContainer.style.fontSize = e.target.value + 'px';
      }
    });
  }

  const spacingSlider = $('cr-line-height-slider');
  if (spacingSlider) {
    spacingSlider.addEventListener('input', (e) => {
      if (contentDiv) {
        const textContainer = contentDiv.querySelector('p');
        if (textContainer) textContainer.style.lineHeight = e.target.value;
      }
    });
  }

  // Active Tool bindings
  document.querySelectorAll('.cr-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const toolId = btn.id;
      if (['cr-tool-speech', 'cr-tool-font', 'cr-tool-pen'].includes(toolId)) {
        const targetPopoverId = toolId.replace('cr-tool-', 'cr-') + '-settings';
        const popover = $(targetPopoverId);
        const wasHidden = popover?.classList.contains('hidden');
        hideAllPopovers();
        if (wasHidden && popover) popover.classList.remove('hidden');
      } else {
        hideAllPopovers();
      }
    });
  });

  // Two-page Spread handled dynamically inside openBookReader

  // Pen settings (color and brush width)
  document.querySelectorAll('.cr-pen-color').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.cr-pen-color').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const col = dot.dataset.color;
      ctx.strokeStyle = col;
    });
  });

  $('cr-pen-width')?.addEventListener('input', (e) => {
    ctx.lineWidth = parseInt(e.target.value);
  });

  // Text-To-Speech (TTS) Integration
  let synthesis = window.speechSynthesis;
  let isSpeaking = false;
  let ttsUtterance = null;

  function getCurrentPageText() {
    if (book.fileType === 'pdf') {
      return (book.pdfTextCache && book.pdfTextCache[book.currentPage]) ? book.pdfTextCache[book.currentPage] : "";
    } else {
      if (!book.fileContent) return "";
      const words = book.fileContent.split(/\s+/);
      const startIdx = (book.currentPage - 1) * 200;
      return words.slice(startIdx, startIdx + 200).join(' ');
    }
  }

  function populateVoiceList() {
    const select = $('cr-speech-voice-select');
    if (!select || !synthesis || !synthesis.getVoices) return;
    const voices = synthesis.getVoices();
    if (voices.length === 0) return;
    select.innerHTML = '';

    const femaleNames = ["samantha", "siri", "victoria", "fiona", "hazel", "susan", "zira", "google us english", "karen", "moira", "tessa", "veena"];
    const femaleSorted = [];
    const otherVoices = [];

    voices.forEach(v => {
      const nameL = v.name.toLowerCase();
      const isFemale = femaleNames.some(f => nameL.includes(f)) || nameL.includes("female");
      if (isFemale) {
        femaleSorted.push({ voice: v, label: `✨ [Female] ${v.name} (${v.lang})` });
      } else {
        otherVoices.push({ voice: v, label: `${v.name} (${v.lang})` });
      }
    });

    const allVoices = [...femaleSorted, ...otherVoices];
    allVoices.forEach(vObj => {
      const opt = document.createElement('option');
      opt.value = vObj.voice.name;
      opt.textContent = vObj.label;
      select.appendChild(opt);
    });

    const defaultVoice = allVoices.find(vObj => vObj.voice.name.toLowerCase().includes("google us english") || vObj.voice.name.toLowerCase().includes("samantha"));
    if (defaultVoice) {
      select.value = defaultVoice.voice.name;
    }
  }

  if (synthesis && 'onvoiceschanged' in synthesis) {
    synthesis.onvoiceschanged = populateVoiceList;
  }
  populateVoiceList();
  let voiceCheckInterval = setInterval(() => {
    if(synthesis && synthesis.getVoices && synthesis.getVoices().length > 0) {
      clearInterval(voiceCheckInterval);
      populateVoiceList();
    }
  }, 500);

  const speechPlayBtn = $('cr-speech-play-btn');
  const speechPlayText = $('cr-speech-play-text');

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      if (speechPlayText) speechPlayText.textContent = "Start Reading";
      if (speechPlayBtn) speechPlayBtn.querySelector('svg').innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    } else {
      window.speechSynthesis.cancel(); // Flush queue
      
      let text = "";
      if (book.fileType === 'pdf') {
        text = (book.pdfTextCache && book.pdfTextCache[book.currentPage]) ? book.pdfTextCache[book.currentPage] : "";
      } else {
        if (book.fileContent) {
          const words = book.fileContent.split(/\s+/);
          const startIdx = (book.currentPage - 1) * 200;
          text = words.slice(startIdx, startIdx + 200).join(' ');
        }
      }

      if (!text || text.trim().length === 0) {
        alert("No text detected. Try waiting a moment or reading another page.");
        return;
      }
      
      console.log('Speaking text of length:', text.length);
      const utterance = new SpeechSynthesisUtterance(text);
      const voiceSelect = document.getElementById('cr-speech-voice-select');
      if (voiceSelect && voiceSelect.value) {
        const selectedVoice = window.speechSynthesis.getVoices().find(v => v.name === voiceSelect.value);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      utterance.onend = () => {
        isSpeaking = false;
        if (speechPlayText) speechPlayText.textContent = "Start Reading";
        if (speechPlayBtn) speechPlayBtn.querySelector('svg').innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      };

      utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        window.speechSynthesis.cancel();
        isSpeaking = false;
        if (speechPlayText) speechPlayText.textContent = "Start Reading";
        if (speechPlayBtn) speechPlayBtn.querySelector('svg').innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      };

      window.speechSynthesis.speak(utterance);
      isSpeaking = true;
      if (speechPlayText) speechPlayText.textContent = "Stop Reading";
      if (speechPlayBtn) speechPlayBtn.querySelector('svg').innerHTML = '<rect x="6" y="6" width="12" height="12"/>';
    }
  };

  if (speechPlayBtn) speechPlayBtn.onclick = toggleSpeech;

  // MCQ Practice Quiz Generator Sidebar
  const generateMCQs = () => {
    const content = $('cr-mcq-content');
    if (!content) return;

    const pageText = getCurrentPageText().trim();
    if (pageText.length < 50) {
      content.innerHTML = '<div style="color:inherit; opacity:0.7; font-size:12px; padding:20px;">Not enough text on this page to generate questions.</div>';
      return;
    }

    content.innerHTML = '<div style="color:inherit; opacity:0.8; font-size:12px; padding:20px; text-align:center;">Generating 10 questions using NYVRON Intelligence...</div>';

    setTimeout(() => {
      let sentences = pageText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 25);
      if (sentences.length === 0) {
        content.innerHTML = '<div style="color:inherit; opacity:0.7; font-size:12px; padding:20px;">Could not identify clear sentences to generate quiz questions.</div>';
        return;
      }

      while (sentences.length < 10) {
        sentences = sentences.concat(sentences);
      }
      sentences = sentences.slice(0, 10);

      content.innerHTML = '';

      sentences.forEach((sentence, idx) => {
        const words = sentence.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, ''));
        const longWords = words.filter(w => w.length > 5);
        const answer = longWords[Math.floor(Math.random() * longWords.length)] || words[0];
        
        if (!answer) return;

        const question = sentence.replace(new RegExp('\\b' + answer + '\\b', 'i'), '_____');

        const otherWords = [...new Set(words.filter(w => w.toLowerCase() !== answer.toLowerCase() && w.length > 4))];
        const distractors = [];
        while (distractors.length < 3) {
          if (otherWords.length > distractors.length) {
            distractors.push(otherWords[distractors.length]);
          } else {
            const fallbacks = ["analysis", "system", "structure", "theory", "method", "process", "function", "concept"];
            const f = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            if (!distractors.includes(f) && f.toLowerCase() !== answer.toLowerCase()) distractors.push(f);
          }
        }

        const options = [answer, ...distractors];
        options.sort(() => Math.random() - 0.5);

        const card = document.createElement('div');
        card.style.cssText = 'background:rgba(127,127,127,0.05); border:1px solid rgba(127,127,127,0.1); padding:14px; border-radius:10px; display:flex; flex-direction:column; gap:10px; margin-bottom:12px;';
        card.innerHTML = `
          <div style="font-size:11px; color:var(--cascara); font-weight:700;">QUESTION ${idx + 1} OF 10</div>
          <div style="font-size:12px; line-height:1.4; color:inherit;">"${question}"</div>
          <div class="mcq-opts-list" style="display:flex; flex-direction:column; gap:6px;">
            ${options.map((opt, i) => `
              <button class="mcq-opt" data-opt="${opt}" style="padding:10px; border-radius:8px; border:1px solid rgba(127,127,127,0.1); background:rgba(127,127,127,0.05); color:inherit; opacity:0.85; text-align:left; cursor:pointer; font-size:12px; transition:0.2s;">
                ${String.fromCharCode(65 + i)}. ${opt}
              </button>
            `).join('')}
          </div>
        `;

        const optButtons = card.querySelectorAll('.mcq-opt');
        optButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const selected = btn.dataset.opt;
            if (selected.toLowerCase() === answer.toLowerCase()) {
              btn.classList.add('correct');
              optButtons.forEach(b => b.style.pointerEvents = 'none');
            } else {
              btn.classList.add('incorrect');
              optButtons.forEach(b => {
                if (b.dataset.opt.toLowerCase() === answer.toLowerCase()) {
                  b.classList.add('correct');
                }
              });
            }
          });
        });

        content.appendChild(card);
      });
    }, 800);
  };
  $('cr-mcq-refresh-btn') && ($('cr-mcq-refresh-btn').onclick = generateMCQs);

  const mcqCloseBtn = $('cr-mcq-close-btn');
  if (mcqCloseBtn) {
    mcqCloseBtn.onclick = () => {
      $('cr-mcq-sidebar')?.classList.add('hidden');
      $('cr-tool-mcq')?.classList.remove('active');
    };
  }

  // Toggle MCQ sidebar
  $('cr-tool-mcq')?.addEventListener('click', () => {
    const side = $('cr-mcq-sidebar');
    if (!side) return;
    const isOpen = !side.classList.contains('hidden');
    if (isOpen) {
      side.classList.add('hidden');
      $('cr-tool-mcq').classList.remove('active');
    } else {
      side.classList.remove('hidden');
      $('cr-tool-mcq').classList.add('active');
      generateMCQs();
    }
  });

  // AI Study Buddy Chatbot Widget
  const chatFab = $('cr-chat-fab');
  const chatWidget = $('cr-chat-widget');
  const chatClose = $('cr-chat-close-btn');
  const chatSend = $('cr-chat-send');
  const chatInput = $('cr-chat-input');
  const chatMessages = $('cr-chat-messages');

  let chatHistory = [];

  const toggleChat = () => {
    chatWidget?.classList.toggle('hidden');
    if (chatWidget && !chatWidget.classList.contains('hidden')) {
      chatInput?.focus();
    }
  };

  if (chatFab) chatFab.onclick = toggleChat;
  if (chatClose) chatClose.onclick = () => chatWidget?.classList.add('hidden');

  const appendChatMessage = (sender, text) => {
    if (!chatMessages) return;
    const bubble = document.createElement('div');
    bubble.className = sender === 'user' ? 'chat-msg-user' : 'chat-msg-buddy';
    
    if (sender === 'buddy-typing') {
      bubble.id = 'buddy-typing-indicator';
      bubble.innerHTML = '<div class="bloom-mini" style="margin: 4px;">             <svg viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg">               <g class="bloom-inner-mini">                 <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71"></path>                 <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(60)"></path>                 <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71" transform="rotate(120)"></path>                 <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(180)"></path>                 <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71" transform="rotate(240)"></path>                 <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(300)"></path>               </g>               <circle cx="0" cy="0" r="3" fill="#2ECC71"></circle>             </svg>           </div>';
    } else {
      bubble.textContent = text;
    }
    
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
  };

  const typeMessageOut = (text, callback) => {
    const bubble = document.createElement('div');
    bubble.className = 'chat-msg-buddy';
    chatMessages?.appendChild(bubble);
    
    let index = 0;
    const interval = setInterval(() => {
      bubble.textContent += text[index];
      index++;
      if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
      if (index >= text.length) {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 15);
  };

  const handleSendChatMessage = async () => {
    const msg = chatInput?.value.trim();
    if (!msg) return;
    
    chatInput.value = '';
    appendChatMessage('user', msg);
    appendChatMessage('buddy-typing');

    const pageText = getCurrentPageText();

    try {
      const apiKey = "AQ.Ab8RN6JelORN2ShF8wyQwg1gOMFY5a2NyugV2xw-zEsa3piVvg";
      const contents = [];
      if (chatHistory && chatHistory.length > 0) {
        chatHistory.forEach((h) => {
          contents.push({
            role: h.who === "user" ? "user" : "model",
            parts: [{ text: h.text }]
          });
        });
      }
      contents.push({ role: "user", parts: [{ text: msg }] });

      const payload = {
        systemInstruction: {
          parts: [{ text: "You are the user's friendly AI Study Buddy. Help them study the current book page. Keep your responses concise, sharp, and structured. Always answer page-specific questions using the context provided below:\n\n" + pageText }]
        },
        contents: contents,
        generationConfig: { temperature: 0.7 }
      };

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      document.getElementById('buddy-typing-indicator')?.remove();

      const data = await res.json();
      
      if (!res.ok) {
        const bubble = appendChatMessage('buddy', `Error: Failed to connect to Gemini API.`);
        if (bubble) bubble.appendChild(window.createMainAIBanner('fire'));
        return;
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
      
      typeMessageOut(reply, () => {
        chatHistory.push({ who: 'user', text: msg });
        chatHistory.push({ who: 'buddy', text: reply });
      });

    } catch (err) {
      document.getElementById('buddy-typing-indicator')?.remove();
      appendChatMessage('buddy', "Connection error. Make sure the backend server is running.");
    }
  };

  if (chatSend) chatSend.onclick = handleSendChatMessage;
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSendChatMessage();
    });
  }

  // Controls bindings
  $('cr-back-btn').onclick = () => {
    window.removeEventListener('keydown', handleKeyboardNav);
    window.removeEventListener('resize', adjustReaderResponsiveScale);
    overlay.classList.add('hidden');
    document.querySelector('.tab-bar')?.classList.remove('hidden');
    $('cr-chat-widget')?.classList.add('hidden');
    $('cr-chat-fab')?.classList.add('hidden');
    renderBooks();
  };

  $('cr-delete-book-btn').onclick = () => {
    showConfirm('Delete Book', 'Delete this book from library?', () => {
      window.removeEventListener('keydown', handleKeyboardNav);
      window.removeEventListener('resize', adjustReaderResponsiveScale);
      const bookId = book.id;
      STATE.books = STATE.books.filter(b => b.id !== bookId);
      save();
      deleteFile(bookId).then(() => {
        overlay.classList.add('hidden');
        document.querySelector('.tab-bar')?.classList.remove('hidden');
        renderBooks();
      });
    });
  };

  $('cr-sidebar-toggle').onclick = () => {
    $('cr-sidebar')?.classList.toggle('hidden');
    $('cr-notes-sidebar')?.classList.add('hidden'); // close the other
  };

  $('cr-sidebar-close').onclick = () => {
    $('cr-sidebar')?.classList.add('hidden');
  };

  const notesToggleBtn = $('cr-notes-toggle');
  if (notesToggleBtn) {
    notesToggleBtn.onclick = () => {
      $('cr-notes-sidebar')?.classList.toggle('hidden');
      $('cr-sidebar')?.classList.add('hidden'); // close the other
    };
  }

  const notesCloseBtn = $('cr-notes-close');
  if (notesCloseBtn) {
    notesCloseBtn.onclick = () => {
      $('cr-notes-sidebar')?.classList.add('hidden');
    };
  }

  $('cr-theme-select').onchange = function() {
  if (!document.startViewTransition) {
    overlay.className = `cascara-reader-overlay theme-${this.value}`;
    return;
  }
  document.startViewTransition(() => {
    overlay.className = `cascara-reader-overlay theme-${this.value}`;
  });
};

  $('cr-prev-page').onclick = () => {
    if (book.currentPage > 1) renderReaderPage(book.currentPage - (isTwoPage ? 2 : 1));
  };

  $('cr-next-page').onclick = () => {
    if (book.currentPage < book.totalPages) renderReaderPage(book.currentPage + (isTwoPage ? 2 : 1));
  };

  $('cr-page-slider').oninput = function() {
    renderReaderPage(parseInt(this.value));
  };

  const bottomBar = document.querySelector('.cr-bottom-bar');
  if (bottomBar) {
    bottomBar.addEventListener('click', (e) => {
      if (e.target.closest('#cr-page-slider, .cr-page-nav-btn')) return;
      bottomBar.classList.toggle('expanded');
      setTimeout(adjustReaderResponsiveScale, 150);
    });
  }

  // Fixed Area Zoom (Capsule zoom controls)
  window.fixedAreaZoom = 1.0;
  function updateFixedAreaZoom(sourceSlider = null) {
    const percent = Math.round(window.fixedAreaZoom * 100);
    const label = $('cr-mzoom-val');
    if (label) label.textContent = `${percent}%`;

    const slider = $('cr-mzoom-slider');
    if (slider && sourceSlider !== slider) slider.value = percent;

    adjustReaderResponsiveScale();
  }

  const mSlider = $('cr-mzoom-slider');
  if (mSlider) {
    mSlider.oninput = function() {
      window.fixedAreaZoom = parseInt(this.value) / 100;
      updateFixedAreaZoom(this);
    };
  }

  const mZoomIn = $('cr-mzoom-in');
  if (mZoomIn) {
    mZoomIn.onclick = (e) => {
      e.stopPropagation();
      window.fixedAreaZoom = Math.min(3.0, parseFloat((window.fixedAreaZoom + 0.15).toFixed(2)));
      updateFixedAreaZoom();
    };
  }

  const mZoomOut = $('cr-mzoom-out');
  if (mZoomOut) {
    mZoomOut.onclick = (e) => {
      e.stopPropagation();
      window.fixedAreaZoom = Math.max(0.3, parseFloat((window.fixedAreaZoom - 0.15).toFixed(2)));
      updateFixedAreaZoom();
    };
  }

  const dSlider = $('cr-zoom-slider');
  if (dSlider) {
    dSlider.oninput = function() {
      currentZoom = parseInt(this.value) / 100;
      updateZoom(this);
    };
  }
  const dZoomIn = $('cr-tool-zoom-in');
  if (dZoomIn) {
    dZoomIn.onclick = (e) => {
      e.stopPropagation();
      currentZoom = Math.min(3.0, parseFloat((currentZoom + 0.15).toFixed(2)));
      updateZoom();
    };
  }

  const dZoomOut = $('cr-tool-zoom-out');
  if (dZoomOut) {
    dZoomOut.onclick = (e) => {
      e.stopPropagation();
      currentZoom = Math.max(0.3, parseFloat((currentZoom - 0.15).toFixed(2)));
      updateZoom();
    };
  }

  // Prevent default browser zoom inside the reader overlay on mobile & desktop
  const isReaderOpen = () => {
    const overlay = $('cascara-reader-overlay');
    return overlay && !overlay.classList.contains('hidden');
  };

  window.addEventListener('touchmove', (e) => {
    if (isReaderOpen() && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  let lastTap = 0;
  window.addEventListener('touchend', (e) => {
    if (isReaderOpen()) {
      const now = Date.now();
      if (now - lastTap < 300) {
        e.preventDefault();
      }
      lastTap = now;
    }
  });

  window.addEventListener('wheel', (e) => {
    if (isReaderOpen() && e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (isReaderOpen()) {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '-' || e.key === '0' || e.key === '+' || e.code === 'NumpadAdd' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
      }
    }
  });

  // Searching Inside Book
  let searchTimeout = null;
  const searchInput = $('cr-search-input');
  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = function() {
      const query = this.value.trim().toLowerCase();
      if (searchTimeout) clearTimeout(searchTimeout);
      
      if (!query) {
        renderOutline();
        return;
      }
      
      searchTimeout = setTimeout(() => {
        searchBook(query);
      }, 400);
    };
  }

  function renderOutline() {
    if (!outline) return;
    outline.innerHTML = '';
    const step = Math.max(5, Math.ceil(book.totalPages / 5));
    for (let page = 1; page <= book.totalPages; page += step) {
      const li = document.createElement('li');
      li.className = 'cr-outline-item';
      li.textContent = `Chapter ${Math.ceil(page / step)} (Page ${page})`;
      li.dataset.page = page;
      li.addEventListener('click', () => {
        renderReaderPage(page);
      });
      outline.appendChild(li);
    }
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async function searchBook(query) {
    if (!outline) return;
    outline.innerHTML = `<li class="cr-outline-item" style="color:inherit; opacity:0.7; pointer-events:none; padding:12px;">Searching...</li>`;
    
    if (book.fileType === 'pdf') {
      if (!pdfDoc) return;
      const matches = [];
      const totalPages = pdfDoc.numPages;
      book.pdfTextCache = book.pdfTextCache || {};
      
      for (let i = 1; i <= totalPages; i++) {
        if (i % 20 === 0) {
          await new Promise(r => setTimeout(r, 10));
        }
        
        let pageText = "";
        if (book.pdfTextCache[i]) {
          pageText = book.pdfTextCache[i];
        } else if (book.ocrData && book.ocrData[i]) {
          pageText = book.ocrData[i].map(w => w.text).join(' ');
          book.pdfTextCache[i] = pageText;
        } else {
          try {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            pageText = content.items.map(item => item.str).join(' ');
            book.pdfTextCache[i] = pageText;
          } catch (err) {
            console.warn("Failed to extract page text for page " + i, err);
          }
        }
        
        let pos = pageText.toLowerCase().indexOf(query);
        let occurrenceCount = 0;
        while (pos !== -1) {
          matches.push({
            page: i,
            snippet: pageText,
            query: query,
            matchIndex: occurrenceCount,
            charOffset: pos
          });
          occurrenceCount++;
          pos = pageText.toLowerCase().indexOf(query, pos + 1);
        }
      }
      
      outline.innerHTML = '';
      if (!matches.length) {
        outline.innerHTML = `<li class="cr-outline-item" style="color:inherit; opacity:0.7; pointer-events:none; padding:12px;">No matches found</li>`;
        return;
      }
      
      matches.sort((a, b) => a.page - b.page || a.charOffset - b.charOffset);
      matches.forEach(m => {
        const li = document.createElement('li');
        li.className = 'cr-outline-item';
        const matchIdx = m.charOffset;
        const snippet = m.snippet.slice(Math.max(0, matchIdx - 15), matchIdx + query.length + 20);
        li.innerHTML = `<div style="font-weight:bold; color:var(--cascara);">Page ${m.page}</div><div style="font-size:11px; color:inherit; opacity:0.7; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">...${snippet}...</div>`;
        li.addEventListener('click', () => {
          book.selectedSearchMatch = {
            page: m.page,
            query: query,
            matchIndex: m.matchIndex,
            charOffset: m.charOffset
          };
          renderReaderPage(m.page);
        });
        outline.appendChild(li);
      });
    } else {
      outline.innerHTML = '';
      if (!book.fileContent) return;
      const words = book.fileContent.split(/\s+/);
      const matches = [];
      for (let i = 1; i <= book.totalPages; i++) {
        const startIdx = (i - 1) * 200;
        const pageText = words.slice(startIdx, startIdx + 200).join(' ');
        
        let pos = pageText.toLowerCase().indexOf(query);
        let occurrenceCount = 0;
        while (pos !== -1) {
          matches.push({
            page: i,
            snippet: pageText,
            query: query,
            matchIndex: occurrenceCount,
            charOffset: pos
          });
          occurrenceCount++;
          pos = pageText.toLowerCase().indexOf(query, pos + 1);
        }
      }
      if (!matches.length) {
        outline.innerHTML = `<li class="cr-outline-item" style="color:inherit; opacity:0.7; pointer-events:none; padding:12px;">No matches found</li>`;
        return;
      }
      matches.sort((a, b) => a.page - b.page || a.charOffset - b.charOffset);
      matches.forEach(m => {
        const li = document.createElement('li');
        li.className = 'cr-outline-item';
        const matchIdx = m.charOffset;
        const snippet = m.snippet.slice(Math.max(0, matchIdx - 15), matchIdx + query.length + 20);
        li.innerHTML = `<div style="font-weight:bold; color:var(--cascara);">Page ${m.page}</div><div style="font-size:11px; color:inherit; opacity:0.7; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">...${snippet}...</div>`;
        li.addEventListener('click', () => {
          book.selectedSearchMatch = {
            page: m.page,
            query: query,
            matchIndex: m.matchIndex,
            charOffset: m.charOffset
          };
          renderReaderPage(m.page);
        });
        outline.appendChild(li);
      });
    }
  }

  // Load and render
  console.log("openBookReader: starting file load for type:", book.fileType);
  if (book.fileType === 'pdf') {
    if (!window.pdfjsLib) {
      showAlert("PDF Library Error", "The PDF rendering library is not loaded. Please check your network connection and reload.");
      overlay.classList.add('hidden');
      return;
    }
    getFile(book.id).then(blob => {
      console.log("openBookReader: getFile resolved. Blob truthy:", !!blob, "Blob type:", blob ? blob.constructor.name : "null");
      if (!blob) {
        showAlert("Missing File", "PDF file not found in local storage database (IndexedDB).");
        overlay.classList.add('hidden');
        return;
      }
      const fileReader = new FileReader();
      fileReader.onerror = function(err) {
        console.error("FileReader error:", err);
        showAlert("File Reader Error", "Failed to read the file: " + err.message);
        overlay.classList.add('hidden');
      };
      fileReader.onload = function() {
        console.log("openBookReader: FileReader loaded successfully. result size:", this.result ? this.result.byteLength : "null");
        const typedarray = new Uint8Array(this.result);
        console.log("openBookReader: invoking pdfjsLib.getDocument");
        pdfjsLib.getDocument({
          data: typedarray,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/',
          cMapPacked: true,
        }).promise.then(pdf => {
          console.log("openBookReader: pdfjsLib.getDocument resolved successfully, pages:", pdf.numPages);
          pdfDoc = pdf;
          window._currentPdfDoc = pdf; // Expose for on-demand text extraction in summary
          book.totalPages = pdf.numPages;
          save();

          // Generate Outline Chapters
          if (outline) {
            outline.innerHTML = '';
            const step = Math.max(5, Math.ceil(book.totalPages / 5));
            for (let page = 1; page <= book.totalPages; page += step) {
              const li = document.createElement('li');
              li.className = 'cr-outline-item';
              li.textContent = `Chapter ${Math.ceil(page / step)} (Page ${page})`;
              li.dataset.page = page;
              li.addEventListener('click', () => {
                renderReaderPage(page);
              });
              outline.appendChild(li);
            }
          }

          if (window.innerWidth <= 768) {
            setupMobileContinuousScroll();
            setTimeout(() => {
              const pw = $('cr-page-container')?.querySelector(`.cr-page-wrapper[data-page="${book.currentPage || 1}"]`);
              if (pw) pw.scrollIntoView({ block: 'start' });
            }, 300);
          } else {
            renderReaderPage(book.currentPage || 1);
          }
        }).catch(err => {
          console.error("PDFJS getDocument promise failed:", err);
          showAlert("PDF Render Error", "Failed to parse the PDF document: " + err.message);
          overlay.classList.add('hidden');
        });
      };
      fileReader.readAsArrayBuffer(blob);
    }).catch(err => {
      console.error("IndexedDB getFile failed:", err);
      showAlert("Storage Error", "Failed to retrieve the file from local storage: " + err.message);
      overlay.classList.add('hidden');
    });
  } else {
    // Text Outline
    if (outline) {
      outline.innerHTML = '';
      const step = Math.max(5, Math.ceil(book.totalPages / 5));
      for (let page = 1; page <= book.totalPages; page += step) {
        const li = document.createElement('li');
        li.className = 'cr-outline-item';
        li.textContent = `Chapter ${Math.ceil(page / step)} (Page ${page})`;
        li.dataset.page = page;
        li.addEventListener('click', () => {
          renderReaderPage(page);
        });
        outline.appendChild(li);
      }
    }
    if (window.innerWidth <= 768) {
      setupMobileContinuousScroll();
      setTimeout(() => {
        const pw = $('cr-page-container')?.querySelector(`.cr-page-wrapper[data-page="${book.currentPage || 1}"]`);
        if (pw) pw.scrollIntoView({ block: 'start' });
      }, 300);
    } else {
      renderReaderPage(book.currentPage || 1);
    }
  }
}

// --- renderSpotlightResults ---
const SEARCH_ITEMS = [
  { label: 'Cascara Home', tab: 'home', icon: '⌂' },
  { label: 'Journal & Logs', tab: 'journal', icon: '◫' },
  { label: 'Calendar Events', tab: 'calendar', icon: '🗓' },
  { label: 'Settings & Sync', tab: 'settings', icon: '⚙' },
  { label: 'Cortex Data', tab: 'cortex', icon: '🧠' },
  { label: 'Canopy Strategy', tab: 'canopy', icon: '🌳' },
  { label: 'Prism Ideation', tab: 'prism', icon: '🔮' },
  { label: 'Ledger Analytics', tab: 'ledger', icon: '📊' }
];

function renderSpotlightResults(q){
  const list=$('spotlight-results');list.innerHTML='';
  const filtered=q?SEARCH_ITEMS.filter(x=>x.label.toLowerCase().includes(q.toLowerCase())):SEARCH_ITEMS;
  filtered.forEach((item,i)=>{
    const li=document.createElement('li');
    li.className='sresult';
    li.dataset.tab=item.tab;
    li.innerHTML=`<span class="sresult-icon">${item.icon}</span><span>${item.label}</span>`;
    li.addEventListener('click',()=>{
      if (['cortex', 'canopy', 'prism', 'ledger'].includes(item.tab)) {
        openSubApp(item.tab);
      } else {
        switchTab(item.tab);
      }
      closeSpotlight();
    });
    list.appendChild(li);
  });
}

// --- renderJournalAttachments ---
function renderJournalAttachments() {
  const grid = $('jw-attachments-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  STATE.journalEditAttachments.forEach(att => {
    const wrap = document.createElement('div');
    wrap.className = 'jw-attach-item';
    wrap.tabIndex = 0; // make it focusable for keyboard events
    
    // Support backspace/delete keys to remove attachment
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        STATE.journalEditAttachments = STATE.journalEditAttachments.filter(a => a.id !== att.id);
        renderJournalAttachments();
      }
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'jw-attach-del';
    delBtn.textContent = '✕';
    delBtn.setAttribute('aria-label', 'Delete attachment');
    delBtn.onclick = (e) => {
      e.stopPropagation(); // prevent focus trigger
      STATE.journalEditAttachments = STATE.journalEditAttachments.filter(a => a.id !== att.id);
      renderJournalAttachments();
    };
    
    if (att.type === 'image') {
      const img = document.createElement('img');
      getFile(att.fileId).then(blob => {
        if(blob) img.src = URL.createObjectURL(blob);
      });
      wrap.appendChild(img);
    } else if (att.type === 'audio') {
      wrap.className = 'jw-attach-item jw-attach-audio';
      const playBtn = document.createElement('button');
      playBtn.className = 'jw-audio-play';
      playBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      
      const wave = document.createElement('div');
      wave.className = 'jw-audio-wave';
      wave.innerHTML = '<span></span><span></span><span></span><span></span><span></span>';
      
      let audio = null;
      playBtn.onclick = async () => {
        if(!audio) {
          const blob = await getFile(att.fileId);
          if(blob) audio = new Audio(URL.createObjectURL(blob));
        }
        if(audio) {
          if (audio.paused) audio.play();
          else { audio.pause(); audio.currentTime = 0; }
        }
      };
      
      wrap.appendChild(playBtn);
      wrap.appendChild(wave);
    } else if (att.type === 'location') {
      wrap.className = 'jw-attach-item jw-attach-loc';
      wrap.innerHTML = `
        <div class="jw-loc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <div style="color:#fff; font-size:15px; font-weight:500;">${att.name}</div>
      `;
    }
    
    wrap.appendChild(delBtn);
    grid.appendChild(wrap);
  });
}

// --- openJournalWrite ---
function openJournalWrite(entryId){
  // Scoped Passcode Lock: if opening journal editor and lock is active, prompt first
  if ((STATE.passcodeEnabled || STATE.facelockEnabled || STATE.fingerprintlockEnabled) && STATE.vaultLocked) {
    STATE.lockTargetEditId = entryId || 'new';
    triggerBiometricOrPasscodeLock();
    return;
  }

  const overlay=$('journal-write-overlay');if(!overlay)return;
  const ex=entryId?STATE.journalEntries.find(e=>e.id===entryId):null;
  STATE.journalEditId=entryId||null;
  STATE.journalEditAttachments=ex?.attachments ? [...ex.attachments] : [];

  // Always do a clean reset of all fields
  const dateEl = $('jw-date-display') || $('jw-date-header');
  if (dateEl) dateEl.textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const titleEl = $('jw-title');
  if (titleEl) titleEl.value = ex?.title || '';
  const bodyEl = $('jw-body');
  if (bodyEl) bodyEl.innerHTML = ex?.body || '';  // Always clear/reset

  STATE.selectedMood = ex?.mood || '🙂';
  document.querySelectorAll('.mood-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.mood === STATE.selectedMood);
    c.onclick = () => {
      STATE.selectedMood = c.dataset.mood;
      document.querySelectorAll('.mood-chip').forEach(ch => ch.classList.toggle('active', ch.dataset.mood === STATE.selectedMood));
    };
  });
  renderJournalAttachments();
  const promptEl = $('jw-prompt');
  if (promptEl) promptEl.textContent = PROMPTS[Math.floor(Math.random()*PROMPTS.length)];
  // Make sure format toolbar starts hidden
  $('jw-format-toolbar')?.classList.add('hidden');
  $('jw-mention-dropdown')?.classList.add('hidden');
  $('jw-tag-suggestions')?.classList.add('hidden');
  $('jw-drop-zone')?.classList.add('hidden');
  overlay.classList.remove('hidden');
  setTimeout(()=>titleEl?.focus(), 350);
}

// --- startCascaraSession ---
function startCascaraSession(sid){
  showPrompt('Study Topic', 'What topic are you studying right now?', 'General Study', (heading) => {
    const studyHeading = heading && heading.trim() ? heading.trim() : 'General Study';
    continueCascaraStart(sid, studyHeading);
  }, () => {
    continueCascaraStart(sid, 'General Study');
  });
}

function continueCascaraStart(sid, studyHeading) {
  if(STATE.cascara.activeSubjectId)stopCascaraSession();
  STATE.cascara.activeSubjectId=sid; STATE.cascara.activeStart=Date.now();
  const sub=STATE.cascara.subjects.find(s=>s.id===sid);
  if(sub){sub._baseMs=sub.todayMs;}
  const overlay=$('cascara-focus-overlay');
  
  if(overlay){
    $('cfo-subject-name').textContent=sub?.name||'Subject';
    const statusEl = overlay.querySelector('.cfo-status');
    if (statusEl) statusEl.textContent = studyHeading;
    $('cfo-start').textContent=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    overlay.classList.remove('hidden');
  }
  STATE.cascara.activeInterval=setInterval(()=>{
    const elapsed=Date.now()-STATE.cascara.activeStart;
    const s=STATE.cascara.subjects.find(x=>x.id===sid);
    if(s)s.todayMs=(s._baseMs||0)+elapsed;
    const total=STATE.cascara.subjects.reduce((a,x)=>a+x.todayMs,0);
    $('cascara-main-timer').textContent=ms2hms(elapsed);
    $('cascara-today-total').textContent=ms2hms(total);
    $('cfo-elapsed').textContent=ms2hms(elapsed);
    $('cfo-total').textContent=ms2hms(total);
    if(elapsed>STATE.cascara.maxFocusMs)STATE.cascara.maxFocusMs=elapsed;
    $('cfo-maxfocus').textContent=ms2hms(STATE.cascara.maxFocusMs);
    // Update subject row
    document.querySelectorAll('.cascara-subject-time').forEach((el,i)=>{el.textContent=ms2hms(STATE.cascara.subjects[i]?.todayMs||0);});
  },1000);
  renderCascaraSubjects();
}

// --- renderCountdown ---
function renderCountdown() {
  const wrap = $('countdown-wrap'); if (!wrap) return;
  if (!STATE.countdown || !STATE.countdown.target || !STATE.countdown.title) {
    wrap.innerHTML = `<p class="empty-hint" style="padding:10px 0;">No active countdown. Tap + to set one.</p>`;
    return;
  }
  const now = Date.now();
  const target = new Date(STATE.countdown.target).getTime();
  const diff = target - now;
  if (diff <= 0) {
    triggerNotification(`Countdown Reached!`, `"${STATE.countdown.title}" timer has finished!`);
    STATE.countdown = { title: "", target: "" };
    save();
    renderCountdown();
    return;
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  const dStr = String(days).padStart(2, '0');
  const hStr = String(hours).padStart(2, '0');
  const mStr = String(mins).padStart(2, '0');
  const sStr = String(secs).padStart(2, '0');

  wrap.innerHTML = `
    <div class="ig-countdown">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div class="ig-countdown-title" style="margin-bottom:0">${STATE.countdown.title}</div>
        <div style="display:flex;gap:12px;z-index:5;">
          <button id="edit-countdown-btn" class="btn-ghost" style="padding:4px;font-size:14px;background:none;border:none;cursor:pointer;">✏️</button>
          <button id="del-countdown-btn" class="btn-ghost" style="padding:4px;display:flex;align-items:center;background:none;border:none;cursor:pointer;color:var(--danger);" title="Delete Countdown"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        </div>
      </div>
      <div class="ig-countdown-grid">
        <div class="ig-countdown-item">
          <div class="ig-countdown-val">${dStr}</div>
          <div class="ig-countdown-label">days</div>
        </div>
        <div class="ig-countdown-item">
          <div class="ig-countdown-val">${hStr}</div>
          <div class="ig-countdown-label">hours</div>
        </div>
        <div class="ig-countdown-item">
          <div class="ig-countdown-val">${mStr}</div>
          <div class="ig-countdown-label">mins</div>
        </div>
        <div class="ig-countdown-item">
          <div class="ig-countdown-val">${sStr}</div>
          <div class="ig-countdown-label">secs</div>
        </div>
      </div>
    </div>
  `;

  $('edit-countdown-btn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    openModal('Edit Countdown', `
      <input class="modal-input" id="cd-title-inp" placeholder="Countdown Title" value="${STATE.countdown.title}" autofocus style="margin-bottom:12px;" />
      <input class="modal-input" id="cd-datetime-inp" type="datetime-local" value="${STATE.countdown.target}" style="margin-bottom:12px;" />
      <button class="btn-primary" id="cd-ok">Save Changes</button>
    `);
    setTimeout(() => {
      $('cd-title-inp')?.focus();
      $('cd-ok')?.addEventListener('click', () => {
        const title = $('cd-title-inp')?.value.trim();
        const target = $('cd-datetime-inp')?.value;
        if (!title || !target) return;
        STATE.countdown = { title, target };
        save();
        renderCountdown();
        closeModal();
      });
    }, 100);
  });

  $('del-countdown-btn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    showConfirm('Delete Countdown', 'Delete this countdown?', () => {
      STATE.countdown = { title: "", target: "" };
      save();
      renderCountdown();
    });
  });
}

// --- renderReminders ---
function renderReminders(){
  const list=$('reminders-list'); if(!list)return;
  list.innerHTML='';
  if(!STATE.reminders.length){list.innerHTML='<li class="empty-hint">No reminders yet.</li>';return;}
  STATE.reminders.forEach((r,i)=>{
    const li=document.createElement('li'); li.className='rem-item swipe-wrap'; li.style.animationDelay=`${i*.05}s`;
    li.innerHTML=`
      <div class="swipe-content" style="display:flex;align-items:center;gap:12px;width:100%;transition:transform 0.3s var(--spring)">
        <div class="rem-check${r.done?' done':''}" data-id="${r.id}" role="checkbox" aria-checked="${r.done}" tabindex="0"></div>
        <span class="rem-text${r.done?' done':''}" style="flex:1">${r.text}${r.time ? ` <span style="font-size:12px;color:inherit; opacity:0.7;">(${r.time})</span>` : ''}</span>
      </div>
      <button class="rem-del-swipe" data-id="${r.id}" aria-label="Delete"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    `;
    setupSwipeGesture(li, { direction: 'x', maxDistance: -80 });
    list.appendChild(li);
  });
}

// --- openSpotlight ---
function openSpotlight(){$('spotlight').classList.remove('hidden');setTimeout(()=>$('spotlight-input')?.focus(),50);renderSpotlightResults('');}

// --- renderCalEvents ---
function renderCalEvents(dateStr){
  const list=$('cal-events-list'),empty=$('cal-events-empty');if(!list)return;
  const events=STATE.events[dateStr]||[];list.innerHTML='';

  // Also collect any journal entries, captures, highlights from this date
  const dateStrMatch = dateStr; // e.g. "2026-07-02"

  const allEvents = [...events];

  // Add journal entries as events
  STATE.journalEntries.forEach(entry => {
    const entryDateStr = new Date(entry.timestamp || entry.date).toISOString().split('T')[0];
    if (entryDateStr === dateStrMatch) {
       allEvents.push({
           type: 'journal',
           time: new Date(entry.timestamp || entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
           title: entry.title || 'Journal Entry',
           color: '#0a84ff', // blue
           id: entry.id,
           timestamp: entry.timestamp || entry.date
       });
    }
  });

  // Include Interaction Log events (highlights, margin drawings, voice captures, etc)
  STATE.interactionLog.forEach(log => {
      const logDate = new Date(log.timestamp);
      if (logDate.toISOString().split('T')[0] === dateStrMatch) {
          allEvents.push({
              type: log.action || 'interaction',
              time: logDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              title: log.action === 'highlight' ? 'Highlight Created' :
                     log.action === 'dictation' ? 'Voice Capture' :
                     log.action === 'margin' ? 'Margin Drawing' : log.action,
              desc: log.payload || '',
              color: log.action === 'highlight' ? '#ffcc00' :
                     log.action === 'dictation' ? '#30d158' : '#ff9500',
              timestamp: log.timestamp
          });
      }
  });

  if(!allEvents.length){empty?.classList.remove('hidden');return;}
  empty?.classList.add('hidden');

  // Sort by timestamp
  allEvents.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));

  allEvents.forEach((ev,i)=>{
    const li=document.createElement('li');
    li.className = 'cal-timeline-item';
    li.style.animationDelay = `${i * 0.05}s`;
    
    // Determine color based on event type if not provided
    let glowColor = ev.color || '#30d158'; // default green
    if (ev.type === 'journal') glowColor = '#0a84ff';
    if (ev.type === 'margin') glowColor = '#ff9500'; // orange
    if (ev.type === 'highlight') glowColor = '#ffcc00'; // yellow
    
    const timeText = ev.time || '12:00 PM';

    li.innerHTML = `
      <div class="cal-timeline-track">
        <div class="cal-timeline-dot" style="background: ${glowColor}; box-shadow: 0 0 10px ${glowColor};"></div>
        <div class="cal-timeline-line"></div>
      </div>
      <div class="cal-timeline-card">
        <div class="cal-timeline-time">${timeText}</div>
        <div class="cal-timeline-title">${ev.title}</div>
        ${ev.desc ? `<div class="cal-timeline-desc">${ev.desc}</div>` : ''}
      </div>
    `;
    list.appendChild(li);
  });
}



function applyManualTheme(theme) {
  const currentThemeClass = theme === 'light' ? 'theme-paper' : 'theme-dark-vault';
  if (document.body.classList.contains(currentThemeClass)) {
    return;
  }
  
  if (!document.startViewTransition) {
    document.body.classList.remove('theme-paper', 'theme-dark-vault', 'theme-crimson');
    document.body.classList.add(currentThemeClass);
    return;
  }
  
  document.startViewTransition(() => {
    document.body.classList.remove('theme-paper', 'theme-dark-vault', 'theme-crimson');
    document.body.classList.add(currentThemeClass);
  });
}

function applyAutoTheme() {
  const h = new Date().getHours();
  const desiredThemeClass = (h >= 6 && h < 18) ? 'theme-paper' : 'theme-dark-vault';
  
  if (document.body.classList.contains(desiredThemeClass)) {
    return;
  }
  
  if (!document.startViewTransition) {
    document.body.classList.remove('theme-paper', 'theme-dark-vault', 'theme-crimson');
    document.body.classList.add(desiredThemeClass);
    return;
  }
  
  document.startViewTransition(() => {
    document.body.classList.remove('theme-paper', 'theme-dark-vault', 'theme-crimson');
    document.body.classList.add(desiredThemeClass);
  });
}

// --- updateClock ---
function updateClock(){
  const now=new Date();
  const hh=String(now.getHours()).padStart(2,'0');
  const mm=String(now.getMinutes()).padStart(2,'0');
  const hm=`${hh}:${mm}`;
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  // Contextual Theming
  const h=now.getHours();
  // Don't override if user is in a forced mode (like crimson for venting)
  if (!document.body.classList.contains('theme-crimson')) {
    const savedTheme = localStorage.getItem('nv-theme') || 'auto';
    if (savedTheme === 'auto') {
      applyAutoTheme();
    } else {
      applyManualTheme(savedTheme);
    }
  }

  const el=$('home-time'),de=$('home-date');
  if(el)el.textContent=hm;
  if(de)de.textContent=`${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;
  const greet=h<5?'Good night':h<12?'Good morning':h<17?'Good afternoon':h<21?'Good evening':'Good night';
  const ge=$('home-greeting'); if(ge&&ge.textContent!==greet)ge.textContent=greet;
  const cd=$('cascara-date'); if(cd)cd.textContent=`${DAYS[now.getDay()].slice(0,3)}, ${now.getMonth()+1}/${now.getDate()}`;
  const cdB=$('cascara-dday-btn'); if(cdB)cdB.textContent=DAYS[now.getDay()];

  // Live countdown update
  renderCountdown();

  // Notification checks
  const todayStr = today();
  
  // 1. Schedule checks
  STATE.schedule.forEach(s => {
    if (s.time === hm) {
      const key = `schedule-${s.id}-${todayStr}-${hm}`;
      if (!notifiedItems.includes(key)) {
        notifiedItems.push(key);
        sessionStorage.setItem('nv-notified', JSON.stringify(notifiedItems));
        triggerNotification(`Schedule Alert: ${s.time}`, s.title);
      }
    }
  });

  // 2. Reminder checks
  STATE.reminders.forEach(r => {
    if (r.time && r.time === hm && !r.done) {
      const key = `reminder-${r.id}-${todayStr}-${hm}`;
      if (!notifiedItems.includes(key)) {
        notifiedItems.push(key);
        sessionStorage.setItem('nv-notified', JSON.stringify(notifiedItems));
        triggerNotification(`Reminder Alert`, r.text);
      }
    }
  });
}

// --- renderJournal ---
function renderJournal(){
  const grid=$('journal-entries'),empty=$('journal-empty');if(!grid)return;
  grid.innerHTML='';
  const entries=[...STATE.journalEntries].reverse();
  if(!entries.length){empty?.classList.remove('hidden');return;}
  empty?.classList.add('hidden');
  entries.forEach((e,i)=>{
    const wrapper=document.createElement('div'); wrapper.className='journal-card-wrapper swipe-wrap';
    wrapper.style.animationDelay=`${i*.07}s`;
    
    let attachHtml = '';
    if (e.attachments && e.attachments.length > 0) {
      attachHtml = '<div class="card-attachments">';
      e.attachments.forEach(att => {
        if (att.type === 'image') {
          attachHtml += `<img class="card-attach-img" src="" data-fileid="${att.fileId}" />`;
        } else if (att.type === 'audio') {
          attachHtml += `
            <div class="card-attach-audio">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <div style="flex:1; height:4px; background:rgba(255,255,255,0.2); border-radius:2px;"></div>
            </div>`;
        } else if (att.type === 'location') {
          attachHtml += `
            <div class="card-attach-loc">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${att.name}
            </div>`;
        }
      });
      attachHtml += '</div>';
    }

    const moodColors = {
      '😆': '#E8652A',
      '😊': '#30D158',
      '🙂': '#0A84FF',
      '😐': '#8E8E93',
      '😔': '#FF453A',
      '😢': '#FF453A'
    };
    const cardBorderColor = moodColors[e.mood] || '#E8652A';
    const parsedDate = e.date ? new Date(e.date) : new Date();
    const dateText = isNaN(parsedDate.getTime()) ? 'Today' : parsedDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});

    wrapper.innerHTML=`
      <div class="journal-card swipe-content" style="background:#FFFFFF; border:1px solid rgba(0,0,0,0.08); border-left:3.5px solid ${cardBorderColor} !important; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.02); transition:transform 0.3s var(--spring); padding:20px; cursor:pointer; position:relative; z-index:2; margin-bottom:0 !important; color:#121214;">
        <button class="glassy-del-btn jc-hover-del" style="z-index:15;" title="Delete Entry"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        <div class="jc-top"><span class="jc-date" style="color:rgba(18,18,20,0.55);">${dateText}</span><span class="jc-mood">${e.mood||'🙂'}</span></div>
        <div class="jc-title" style="color:#121214; font-weight:700;">${e.title||'Untitled'}</div>
        <div class="jc-preview" style="color:rgba(18,18,20,0.7);">${e.body||''}</div>
        ${attachHtml}
      </div>
      </div>
      <div class="ios-swipe-actions">
        <button class="ios-swipe-btn delete journal-swipe-del" data-id="${e.id}" title="Delete">
          <div class="ios-swipe-btn-icon delete"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div>
        </button>
      </div>
    `;

    const content = wrapper.querySelector('.journal-card');
    const delBtn = wrapper.querySelector('.journal-swipe-del');
    const hoverDelBtn = wrapper.querySelector('.jc-hover-del');

    // Load images async
    wrapper.querySelectorAll('img[data-fileid]').forEach(img => {
      getFile(img.dataset.fileid).then(blob => {
        if(blob) img.src = URL.createObjectURL(blob);
      });
    });

    // Swipe Gesture (Touch: raw physics, Mouse: scaled down friction)
    setupSwipeGesture(wrapper, {
      direction: 'x',
      maxDistance: -80,
      containerSelector: '.journal-card',
      deleteLayerSelector: '.ios-swipe-actions',
      isJournalCard: true,
      onDeleteTrigger: () => {
        STATE.journalEntries = STATE.journalEntries.filter(x => x.id !== e.id);
        save(); renderJournal();
      }
    });

    content.addEventListener('click', (ev) => {
      if (content.style.transform === 'translateX(-80px)') {
        content.style.transform = 'translateX(0)';
        ev.stopPropagation();
        return;
      }
      openJournalWrite(e.id);
    });

    delBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      showConfirm('Delete Entry', 'Are you sure you want to delete this journal entry?', () => {
        STATE.journalEntries = STATE.journalEntries.filter(x => x.id !== e.id);
        save(); renderJournal();
      }, () => {
        content.style.transform = 'translateX(0)';
      });
    });

    hoverDelBtn?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      showConfirm('Delete Entry', 'Are you sure you want to delete this journal entry?', () => {
        STATE.journalEntries = STATE.journalEntries.filter(x => x.id !== e.id);
        save(); renderJournal();
      });
    });

    grid.appendChild(wrapper);
  });
  const se = $('stat-entries'); if (se) se.textContent=STATE.journalEntries.length;
}

// --- fetchNorthStar ---
async function fetchNorthStar(force = false){
  const qt=$('ns-quote-text'),qa=$('ns-quote-author'); if(!qt)return;
  const cached=JSON.parse(localStorage.getItem('nv-ns-cache')||'null');
  if(!force && cached && Date.now()-cached.ts<86400000){
    qt.classList.remove('skeleton'); qt.textContent=`"${cached.q}"`; qa.textContent=`— ${cached.a}`; return;
  }
  qt.classList.add('skeleton'); qt.textContent='⠀'; qa.textContent='';
  try{
    // Fetch from DummyJSON as a reliable alternative
    const r=await fetch('https://dummyjson.com/quotes/random',{signal:AbortSignal.timeout(5000)});
    if(!r.ok)throw new Error();
    const d=await r.json();
    const data={q:d.quote,a:d.author,ts:Date.now()};
    localStorage.setItem('nv-ns-cache',JSON.stringify(data));
    qt.classList.remove('skeleton'); qt.textContent=`"${data.q}"`; qa.textContent=`— ${data.a}`;
  }catch{
    const fb=FALLBACKS[Math.floor(Math.random()*FALLBACKS.length)];
    qt.classList.remove('skeleton'); qt.textContent=`"${fb.q}"`; qa.textContent=`— ${fb.a}`;
  }
}

// --- renderBooks ---
function renderBooks() {

  // Update Reading Stats
  const statProgress = $('stat-total-progress');
  const statTime = $('stat-time-read');
  const statPages = $('stat-pages-read');
  if (statProgress && statTime && statPages) {
    if (!STATE.books.length) {
      statProgress.textContent = '0%';
      statTime.textContent = '0h';
      statPages.textContent = '0';
    } else {
      let totalProgress = 0;
      let totalPagesRead = 0;
      let totalTimeMin = 0;
      STATE.books.forEach(b => {
        totalProgress += b.progress || 0;
        totalPagesRead += (b.currentPage > 1 ? b.currentPage - 1 : 0);
        totalTimeMin += b.timeRead || 0;
      });
      
      const avgProgress = Math.round(totalProgress / STATE.books.length);
      statProgress.textContent = avgProgress + '%';
      statPages.textContent = totalPagesRead;
      
      const hours = Math.floor(totalTimeMin / 60);
      const mins = totalTimeMin % 60;
      statTime.textContent = hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm';
    }
  }


  const grid = $('cascara-books-grid'); if (!grid) return;
  grid.innerHTML = '';
  if (!STATE.books.length) {
    grid.innerHTML = `<p class="panel-hint" style="grid-column: 1/-1; padding: 20px 0;">No books in library. Tap + New Book to add one.</p>`;
    return;
  }
  
  STATE.books.forEach(b => {
    // Outer swipe container matching grid layout cells
    const container = document.createElement('div');
    container.className = 'book-swipe-container';
    
    // Delete layer behind the card
    const deleteLayer = document.createElement('div');
    deleteLayer.className = 'book-delete-layer';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'book-swipe-delete-btn';
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ff3b30" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
    
    deleteLayer.appendChild(deleteBtn);
    container.appendChild(deleteLayer);
    
    // Actual card overlay
    const card = document.createElement('div');
    card.className = 'book-cover-card';
    card.dataset.id = b.id;
    card.style.transformStyle = 'preserve-3d';
    card.style.perspective = '1000px';

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });

    card.innerHTML = `
      <div class="book-cover-art" style="background: linear-gradient(135deg, ${b.fileType === 'pdf' ? '#7f1d1d, #b91c1c' : '#1e3c72, #2a5298'})">
        <span class="book-type-badge">${b.fileType.toUpperCase()}</span>
        <button class="glassy-del-btn book-dots-btn" data-id="${b.id}" style="z-index:10;" title="Delete Book"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        <div style="font-size: 13px; line-height: 1.2; font-weight:700; word-break:break-word;">${b.title}</div>
      </div>
      <div class="book-meta">
        <div class="book-title">${b.title}</div>
        <div class="book-author">${b.author || 'Unknown'}</div>
        <div class="book-progress-bar">
          <div class="book-progress-fill" style="width: ${b.progress || 0}%"></div>
        </div>
        <div style="font-size: 10px; color: var(--txt3); margin-top: 2px;">${b.progress || 0}% completed</div>
      </div>
    `;
    
    container.appendChild(card);
    grid.appendChild(container);
    
    // Swipe Gesture (Touch, Mouse, Trackpad)
    setupSwipeGesture(card, {
      direction: 'y',
      maxDistance: -60,
      containerSelector: '.book-cover-card',
      deleteLayerSelector: '.book-delete-layer'
    });
  
  // Wire dots button click
  const dotsBtn = card.querySelector('.book-dots-btn');
  if (dotsBtn) {
    dotsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirm('Delete Book', 'Are you sure you want to delete this book? (Dots)', () => {
        const bookId = b.id;
        STATE.books = STATE.books.filter(x => x.id !== bookId);
        save();
        deleteFile(bookId).then(() => {
          renderBooks();
        });
      });
    });
  }
  
  // Wire Delete action
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showConfirm('Delete Book', 'Are you sure you want to delete this book? (Swipe)', () => {
      const bookId = b.id;
      STATE.books = STATE.books.filter(x => x.id !== bookId);
      save();
      deleteFile(bookId).then(() => {
        renderBooks();
      });
    });
  });

  // DIRECT click and touch handler to guarantee opening on all devices
  let wasSwipe = false;
  card.addEventListener('touchstart', () => {
    wasSwipe = false;
  }, { passive: true });
  card.addEventListener('touchmove', () => {
    wasSwipe = true;
  }, { passive: true });

  const tryOpenBook = (e) => {
    if (e.target.closest('.book-dots-btn') || e.target.closest('.book-swipe-delete-btn')) return;
    console.log("Attempting to open book:", b.title, "ID:", b.id, "Type:", b.fileType);
    try {
      openBookReader(b);
    } catch (err) {
      console.error('Error opening book:', err);
      showAlert('Error', 'Could not open book: ' + err.message);
    }
  };

  card.addEventListener('click', (e) => {
    console.log("Card click event detected for:", b.title);
    tryOpenBook(e);
  });

  card.addEventListener('touchend', (e) => {
    console.log("Card touchend event detected for:", b.title, "wasSwipe:", wasSwipe);
    if (!wasSwipe) {
      e.preventDefault();
      tryOpenBook(e);
    }
  });
  });
}

// --- closeCalCreator ---
function closeCalCreator() {
  const modal = $('cal-creator-modal'); if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => modal.classList.add('hidden'), 400);
}

// ==========================================
// PHASE 2: ALL JOURNAL FEATURE FUNCTIONS
// ==========================================

// --- save extended (ephemeral) ---
function saveEphemeral() {
  localStorage.setItem('nv-ephemeral', JSON.stringify(STATE.ephemeralEntries));
}

// --- BURN AFTER READING ---
let burnTimerInterval = null;
function openBurnOverlay() {
  if ((STATE.passcodeEnabled || STATE.facelockEnabled || STATE.fingerprintlockEnabled) && STATE.vaultLocked) {
    STATE.lockTargetAction = 'burn';
    triggerBiometricOrPasscodeLock();
    return;
  }
  const overlay = $('journal-burn-overlay'); if (!overlay) return;
  document.body.classList.add('theme-crimson');
  document.body.classList.remove('theme-paper','theme-dark-vault');
  $('burn-title').value = '';
  $('burn-body').innerHTML = '';
  overlay.classList.remove('hidden');
  
  checkEphemeralExpiry();

  // Start fresh 24h timer for this new vent
  clearInterval(burnTimerInterval);
  const ventStartTime = Date.now();
  const updateVentClock = () => {
    const remaining = 24 * 3600 * 1000 - (Date.now() - ventStartTime);
    if (remaining <= 0) {
      clearInterval(burnTimerInterval);
      return;
    }
    const h = Math.floor(remaining/3600000);
    const m = Math.floor((remaining%3600000)/60000);
    const s = Math.floor((remaining%60000)/1000);
    const el = $('burn-countdown-display');
    if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  updateVentClock();
  burnTimerInterval = setInterval(updateVentClock, 1000);
}
function closeBurnOverlay() {
  $('journal-burn-overlay')?.classList.add('hidden');
  document.body.classList.remove('theme-crimson');
  clearInterval(burnTimerInterval);
}
function burnNow() {
  const body = $('burn-body');
  if (!body) return;
  body.classList.add('burning-text');
  if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
  setTimeout(() => {
    body.innerHTML = '';
    body.classList.remove('burning-text');
    $('burn-title').value = '';
    closeBurnOverlay();
  }, 1600);
}
function saveBurnEntry() {
  const title = $('burn-title')?.value.trim() || '';
  const body = $('burn-body')?.innerHTML.trim() || '';
  if (!title && !body) return;
  const expiry = Date.now() + 24 * 60 * 60 * 1000;
  STATE.ephemeralEntries.push({ id: randomId(), title, body, expiry, createdAt: Date.now() });
  saveEphemeral();
  checkEphemeralExpiry();
  closeBurnOverlay();
  triggerNotification('Ephemeral Entry Saved', 'It will self-destruct in 24 hours 🔥');
}
let storyInterval = null;
let storySlideTimer = null;
let currentStoryIndex = 0;
let activeVents = [];

function checkEphemeralExpiry() {
  const now = Date.now();
  const before = STATE.ephemeralEntries.length;
  STATE.ephemeralEntries = STATE.ephemeralEntries.filter(e => e.expiry > now);
  if (STATE.ephemeralEntries.length !== before) saveEphemeral();

  // Active status stories sorted chronologically (oldest created first so they view them in order)
  activeVents = [...STATE.ephemeralEntries].sort((a,b)=>a.createdAt-b.createdAt);
  
  const storiesBar = $('journal-stories-bar');
  const storyRing = document.querySelector('.story-ring');
  
  if (!STATE.vaultLocked && !STATE.isDecoySession) {
    storiesBar?.classList.remove('hidden');
    
    // Wire active story click trigger
    const storyItem = $('active-story-item');
    if (storyItem) {
      if (activeVents.length > 0) {
        storyRing?.classList.add('active');
        storyItem.onclick = () => {
          openStoryViewer(0);
        };
      } else {
        storyRing?.classList.remove('active');
        storyItem.onclick = () => {
          openBurnOverlay();
        };
      }
    }
  } else {
    storiesBar?.classList.add('hidden');
    closeStoryViewer();
  }
}

function openStoryViewer(index) {
  if ((STATE.passcodeEnabled || STATE.facelockEnabled || STATE.fingerprintlockEnabled) && STATE.vaultLocked) {
    STATE.lockTargetAction = 'story';
    triggerBiometricOrPasscodeLock();
    return;
  }
  const overlay = $('story-viewer-overlay'); if (!overlay) return;
  
  if (activeVents.length === 0) {
    closeStoryViewer();
    return;
  }
  
  // Wrap or bounds check
  if (index < 0) index = 0;
  if (index >= activeVents.length) {
    closeStoryViewer();
    return;
  }
  
  currentStoryIndex = index;
  const entry = activeVents[currentStoryIndex];
  
  const titleEl = $('story-viewer-title');
  const bodyEl = $('story-viewer-body');
  if (titleEl) titleEl.textContent = entry.title || 'My Ephemeral Vent';
  if (bodyEl) bodyEl.innerHTML = entry.body || '';
  
  overlay.classList.remove('hidden');
  
  // Render WhatsApp-style progress bar indicators
  const indicators = $('story-indicators-container');
  if (indicators) {
    indicators.innerHTML = activeVents.map((v, i) => `
      <div class="story-indicator-track" style="flex:1; height:3px; background:rgba(255,255,255,0.25); border-radius:2px; overflow:hidden; position:relative;">
        <div class="story-indicator-fill" id="story-fill-${i}" style="position:absolute; left:0; top:0; bottom:0; background:#ff453a; width:${i < currentStoryIndex ? '100%' : '0%'}; transition:none;"></div>
      </div>
    `).join('');
  }

  // Ticking specific entry countdown timer
  clearInterval(storyInterval);
  storyInterval = setInterval(() => {
    const remaining = entry.expiry - Date.now();
    if (remaining <= 0) {
      nextStory();
      return;
    }
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    
    const countEl = $('story-countdown-display');
    if (countEl) countEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    
    const timeEl = $('story-time-display');
    if (timeEl) timeEl.textContent = `${h}h ${m}m remaining`;
  }, 1000);
  
  const remaining = entry.expiry - Date.now();
  if (remaining > 0) {
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const countEl = $('story-countdown-display');
    if (countEl) countEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const timeEl = $('story-time-display');
    if (timeEl) timeEl.textContent = `${h}h ${m}m remaining`;
  }

  // Animate status bar slide for 5 seconds
  clearInterval(storySlideTimer);
  let elapsed = 0;
  const slideDuration = 5000;
  storySlideTimer = setInterval(() => {
    elapsed += 50;
    const fillEl = $(`story-fill-${currentStoryIndex}`);
    if (fillEl) {
      fillEl.style.width = Math.min(100, (elapsed / slideDuration) * 100) + '%';
    }
    if (elapsed >= slideDuration) {
      nextStory();
    }
  }, 50);
}

function nextStory() {
  openStoryViewer(currentStoryIndex + 1);
}

function prevStory() {
  openStoryViewer(currentStoryIndex - 1);
}

function closeStoryViewer() {
  $('story-viewer-overlay')?.classList.add('hidden');
  clearInterval(storyInterval);
  clearInterval(storySlideTimer);
}

window.closeStoryViewer = closeStoryViewer;

// Register story tapping navigation actions
$('story-nav-left')?.addEventListener('click', (e) => {
  e.stopPropagation();
  prevStory();
});
$('story-nav-right')?.addEventListener('click', (e) => {
  e.stopPropagation();
  nextStory();
});

// Wire Story Viewer Close button
$('story-viewer-close')?.addEventListener('click', closeStoryViewer);

// --- COMMUTE THERAPY (Voice Mode) ---
let commuteMediaRecorder = null;
let commuteAudioCtx = null;
let commuteAnimFrame = null;
let commuteRecording = false;
let commuteSpeechRec = null;
let commuteTranscript = '';

function openCommuteTherapy() {
  if ((STATE.passcodeEnabled || STATE.facelockEnabled || STATE.fingerprintlockEnabled) && STATE.vaultLocked) {
    STATE.lockTargetAction = 'commute';
    triggerBiometricOrPasscodeLock();
    return;
  }
  const overlay = $('commute-therapy-overlay'); if (!overlay) return;
  document.body.classList.add('theme-dark-vault');
  overlay.classList.remove('hidden');
  const q = COMMUTE_QUESTIONS[Math.floor(Math.random() * COMMUTE_QUESTIONS.length)];
  const qEl = $('commute-question');
  if (qEl) qEl.textContent = q;
  // TTS - read the question aloud
  if (window.speechSynthesis) {
    const utt = new SpeechSynthesisUtterance(q);
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  }
  // Draw idle wave
  drawIdleWave();
  commuteTranscript = '';
  const t = $('commute-transcript');
  if (t) { t.style.display = 'none'; t.textContent = ''; }
  $('commute-save-btn')?.classList.add('hidden');
  $('commute-record-label').textContent = 'Tap to speak';
}

function closeCommuteTherapy() {
  window.speechSynthesis?.cancel();
  stopCommuteRecording();
  cancelAnimationFrame(commuteAnimFrame);
  commuteAudioCtx?.close();
  commuteAudioCtx = null;
  $('commute-therapy-overlay')?.classList.add('hidden');
}

function drawIdleWave() {
  const canvas = $('commute-wave-canvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600;
  canvas.height = canvas.offsetHeight * window.devicePixelRatio || 240;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  let t = 0;
  function frame() {
    if (!commuteRecording) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(168,85,247,0.5)';
      ctx.lineWidth = 2;
      for (let x = 0; x < canvas.offsetWidth; x++) {
        const y = (canvas.offsetHeight / 2) + Math.sin((x * 0.02) + t) * 8;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      t += 0.05;
      commuteAnimFrame = requestAnimationFrame(frame);
    }
  }
  frame();
}

function startCommuteRecording() {
  commuteRecording = true;
  $('commute-record-btn')?.classList.add('recording');
  $('commute-record-label').textContent = 'Listening... (tap to stop)';
  cancelAnimationFrame(commuteAnimFrame);

  // Web Speech API transcription
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    commuteSpeechRec = new SpeechRecognition();
    commuteSpeechRec.continuous = true;
    commuteSpeechRec.interimResults = true;
    commuteSpeechRec.onresult = (e) => {
      commuteTranscript = Array.from(e.results).map(r => r[0].transcript).join(' ');
      const t = $('commute-transcript');
      if (t) { t.style.display = 'block'; t.textContent = commuteTranscript; }
    };
    commuteSpeechRec.start();
  }

  // Visualizer using Web Audio
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    commuteAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = commuteAudioCtx.createAnalyser();
    commuteAudioCtx.createMediaStreamSource(stream).connect(analyser);
    analyser.fftSize = 256;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const canvas = $('commute-wave-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio || 240;
    function drawFrame() {
      if (!commuteRecording) return;
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      const barW = W / data.length * 2.5;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const h = (data[i] / 255) * H;
        const hue = 260 + (data[i] / 255) * 60;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
        ctx.fillRect(x, H - h, barW, h);
        x += barW + 1;
      }
      commuteAnimFrame = requestAnimationFrame(drawFrame);
    }
    drawFrame();
  }).catch(() => {
    // No mic permission - just draw a fake animated wave
    const canvas = $('commute-wave-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let t = 0;
    function frame() {
      if (!commuteRecording) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,68,68,0.7)';
      ctx.lineWidth = 3;
      for (let x = 0; x < canvas.offsetWidth; x++) {
        const amp = 15 + Math.random() * 20;
        const y = (canvas.offsetHeight / 2) + Math.sin((x * 0.03) + t) * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      t += 0.12;
      commuteAnimFrame = requestAnimationFrame(frame);
    }
    frame();
  });
}

function stopCommuteRecording() {
  commuteRecording = false;
  commuteSpeechRec?.stop();
  commuteMediaRecorder?.stop();
  $('commute-record-btn')?.classList.remove('recording');
  $('commute-record-label').textContent = 'Tap to speak';
  cancelAnimationFrame(commuteAnimFrame);
  if (commuteTranscript.trim()) {
    $('commute-save-btn')?.classList.remove('hidden');
  }
  drawIdleWave();
}

function saveCommuteEntry() {
  if (!commuteTranscript.trim()) return;
  const q = $('commute-question')?.textContent || 'Commute Reflection';
  STATE.journalEntries.push({
    id: randomId(),
    date: new Date().toISOString(),
    title: q,
    body: `<p>${commuteTranscript}</p>`,
    mood: '🎙️',
    tags: ['#CommuteTherapy', '#AudioEntry'],
    gradient: GRADIENTS[STATE.journalEntries.length % GRADIENTS.length],
    attachments: [],
    timestamp: Date.now(),
  });
  save();
  renderJournal();
  closeCommuteTherapy();
  triggerNotification('Voice Entry Saved', 'Your commute therapy session is in your journal.');
}

// --- LIFE CONSTELLATIONS ---
let constellationScale = 1, constellationOffsetX = 0, constellationOffsetY = 0;
let constellationDragging = false, constellationDragStart = null;
let constellationNodes = [];

function openConstellation() {
  if ((STATE.passcodeEnabled || STATE.facelockEnabled || STATE.fingerprintlockEnabled) && STATE.vaultLocked) {
    STATE.lockTargetAction = 'map';
    triggerBiometricOrPasscodeLock();
    return;
  }
  const overlay = $('constellation-overlay'); if (!overlay) return;
  document.body.classList.add('theme-dark-vault');
  overlay.classList.remove('hidden');
  setTimeout(drawConstellation, 100);
}

function drawConstellation() {
  const canvas = $('constellation-canvas'); if (!canvas) return;
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Build nodes from journal entries
  constellationNodes = STATE.journalEntries.map((e, i) => {
    const angle = (i / STATE.journalEntries.length) * Math.PI * 2;
    const radius = 80 + Math.random() * (Math.min(W,H) * 0.3);
    return {
      x: W/2 + Math.cos(angle) * radius,
      y: H/2 + Math.sin(angle) * radius,
      entry: e,
      radius: 6 + (e.body?.length || 0) * 0.01,
    };
  });

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(constellationOffsetX, constellationOffsetY);
    ctx.scale(constellationScale, constellationScale);

    // Draw starfield
    for (let i = 0; i < 80; i++) {
      ctx.beginPath();
      ctx.arc(Math.sin(i*1.7)*W, Math.cos(i*2.3)*H, Math.random()*1.5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random()*0.2})`;
      ctx.fill();
    }

    // Draw connecting lines between linked entries
    constellationNodes.forEach((n, i) => {
      if (i < constellationNodes.length - 1) {
        const n2 = constellationNodes[i+1];
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = 'rgba(168,85,247,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Draw nodes
    constellationNodes.forEach(n => {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 2);
      grad.addColorStop(0, 'rgba(168,85,247,0.9)');
      grad.addColorStop(1, 'rgba(59,130,246,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,150,255,0.95)';
      ctx.fill();
      // Label
      if (constellationScale > 0.5 && n.entry.title) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `${11 / constellationScale}px -apple-system, sans-serif`;
        ctx.fillText(n.entry.title.slice(0, 20), n.x + n.radius + 4, n.y + 4);
      }
    });
    ctx.restore();
  }
  render();

  // Drag interaction
  canvas.onmousedown = canvas.ontouchstart = (e) => {
    constellationDragging = true;
    const pt = e.touches ? e.touches[0] : e;
    constellationDragStart = { x: pt.clientX - constellationOffsetX, y: pt.clientY - constellationOffsetY };
  };
  canvas.onmousemove = canvas.ontouchmove = (e) => {
    if (!constellationDragging) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    constellationOffsetX = pt.clientX - constellationDragStart.x;
    constellationOffsetY = pt.clientY - constellationDragStart.y;
    render();
  };
  canvas.onmouseup = canvas.ontouchend = () => { constellationDragging = false; };
  canvas.onwheel = (e) => {
    e.preventDefault();
    constellationScale = Math.max(0.2, Math.min(3, constellationScale - e.deltaY * 0.001));
    render();
  };

  // Tap to read entry
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - constellationOffsetX) / constellationScale;
    const my = (e.clientY - rect.top - constellationOffsetY) / constellationScale;
    const hit = constellationNodes.find(n => Math.hypot(n.x - mx, n.y - my) < n.radius * 2 + 10);
    if (hit) openJournalWrite(hit.entry.id);
  };
}

// --- JOURNAL AI CHAT (Talk to Past Self) ---
function openJournalAI() {
  if ((STATE.passcodeEnabled || STATE.facelockEnabled || STATE.fingerprintlockEnabled) && STATE.vaultLocked) {
    STATE.lockTargetAction = 'ai';
    triggerBiometricOrPasscodeLock();
    return;
  }
  const overlay = $('journal-ai-overlay'); if (!overlay) return;
  overlay.classList.remove('hidden');
  document.querySelector('.tab-bar')?.classList.add('hidden');
  document.body.classList.add('theme-dark-vault');
  const feed = $('jai-feed');
  if (feed && feed.children.length === 0) {
    addJAIMessage('ai', "Hi! I can search through your journal history. Ask me anything — like \"When was the last time I felt burned out?\" or \"Summarize my entries about growth.\"");
  }
}

window.createMainAIBanner = function(contextTheme = 'emerald') {
  const btnContainer = document.createElement('div');
  btnContainer.style.cssText = 'display:flex; justify-content:center; margin-top:32px; margin-bottom:16px; width: 100%;';
  
  const particleColors = ['#FFD700', '#FF3B30', '#007AFF', '#AF52DE'];
  const gemColors = ['#2ECC71', '#30B0C7', '#52D68A']; // Green gems for the button

  btnContainer.innerHTML = `
    <div class="main-ai-glass-card" style="position:relative; overflow:hidden; background:rgba(255,255,255,0.85); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,1); width: 100%; max-width: 640px; border-radius:32px; box-shadow:0 16px 50px rgba(0,0,0,0.08); display:flex; flex-direction:column; align-items:center; padding: 60px 32px; text-align:center;">
      
      <!-- Particle Background for Card -->
      <canvas class="main-ai-card-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1; mix-blend-mode:multiply;"></canvas>
      
      <!-- Rotating Logo (Original) -->
      <div style="position:relative; z-index:2; margin-bottom:40px; display:flex; justify-content:center; align-items:center;">
        <svg style="width:96px;height:96px;" viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="card-bgr" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(46,204,113,0.15)"></stop><stop offset="100%" stop-color="transparent"></stop></radialGradient>
            <linearGradient id="card-pg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1a9e4e"></stop><stop offset="100%" stop-color="#2ECC71"></stop></linearGradient>
            <linearGradient id="card-pg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2ECC71"></stop><stop offset="100%" stop-color="#52D68A"></stop></linearGradient>
          </defs>
          <circle cx="0" cy="0" r="45" fill="url(#card-bgr)"></circle>
          <g class="bloom-inner" style="animation: bloom-rotate 3s linear infinite; transform-origin: center center;">
            <path class="bloom-petal p1" d="M0,0 C-9,-16 9,-16 0,-38 C14,-22 14,-9 0,0" fill="url(#card-pg1)"></path>
            <path class="bloom-petal p2" d="M0,0 C-9,-16 9,-16 0,-38 C14,-22 14,-9 0,0" fill="url(#card-pg2)" transform="rotate(60)"></path>
            <path class="bloom-petal p3" d="M0,0 C-9,-16 9,-16 0,-38 C14,-22 14,-9 0,0" fill="url(#card-pg1)" transform="rotate(120)"></path>
            <path class="bloom-petal p4" d="M0,0 C-9,-16 9,-16 0,-38 C14,-22 14,-9 0,0" fill="url(#card-pg2)" transform="rotate(180)"></path>
            <path class="bloom-petal p5" d="M0,0 C-9,-16 9,-16 0,-38 C14,-22 14,-9 0,0" fill="url(#card-pg1)" transform="rotate(240)"></path>
            <path class="bloom-petal p6" d="M0,0 C-9,-16 9,-16 0,-38 C14,-22 14,-9 0,0" fill="url(#card-pg2)" transform="rotate(300)"></path>
          </g>
        </svg>
      </div>
      
      <!-- Big Button -->
      <button class="switch-main-ai-btn" style="position:relative; z-index:2; overflow:hidden; background:#111; color:#fff; width:100%; max-width:340px; padding:24px 32px; border-radius:100px; border:none; cursor:pointer; font-size:18px; font-weight:600; box-shadow:0 8px 32px rgba(0,0,0,0.15); transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); display:flex; align-items:center; justify-content:center; gap:8px;">
        <canvas class="main-ai-btn-gems-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1; mix-blend-mode:screen;"></canvas>
        <span style="position:relative; z-index:2;">Consult Main AI</span>
      </button>
    </div>
  `;
  
  const btn = btnContainer.querySelector('.switch-main-ai-btn');
  const cardCanvas = btnContainer.querySelector('.main-ai-card-canvas');
  const btnCanvas = btnContainer.querySelector('.main-ai-btn-gems-canvas');
  const card = btnContainer.querySelector('.main-ai-glass-card');
  
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.02) translateY(-2px)';
    btn.style.background = '#0a2a16'; // darker green background so gems pop
    btn.style.boxShadow = '0 16px 36px rgba(48, 209, 88, 0.4)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1) translateY(0)';
    btn.style.background = '#111';
    btn.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)';
  });
  btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.97)');
  
  btn.addEventListener('click', () => {
    document.getElementById('journal-ai-overlay')?.classList.add('hidden');
    document.getElementById('cr-chat-widget')?.classList.add('hidden');
    document.getElementById('jw-editor-ai-panel')?.classList.add('hidden');
    switchTab('tab-ai');
  });
  
  // Card background canvas
  setTimeout(() => {
    if(!cardCanvas) return;
    const ctx = cardCanvas.getContext('2d');
    cardCanvas.width = card.offsetWidth * 2 || 1280;
    cardCanvas.height = card.offsetHeight * 2 || 640;
    let w = cardCanvas.width, h = cardCanvas.height;
    let particles = [];
    let mouseX = w/2, mouseY = h/2;
    
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * w;
      mouseY = ((e.clientY - rect.top) / rect.height) * h;
      for(let k=0; k<4; k++) {
        particles.push({
          x: mouseX + (Math.random()-0.5)*50, y: mouseY + (Math.random()-0.5)*50, 
          vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, 
          life: 1, color: particleColors[Math.floor(Math.random() * particleColors.length)]
        });
      }
    });
    
    function animateCard() {
      if (!document.body.contains(cardCanvas)) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      for(let i=0; i<30; i++) {
         ctx.beginPath();
         ctx.arc((i*157)%w, (i*211)%h, 1.5, 0, Math.PI*2);
         ctx.fill();
      }
      for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.02;
        if(p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.life * 5.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(animateCard);
    }
    animateCard();
  }, 100);

  // Button gems canvas
  setTimeout(() => {
    if(!btnCanvas) return;
    const ctx = btnCanvas.getContext('2d');
    btnCanvas.width = btn.offsetWidth * 2 || 680;
    btnCanvas.height = btn.offsetHeight * 2 || 160;
    let w = btnCanvas.width, h = btnCanvas.height;
    let particles = [];
    let mouseX = w/2, mouseY = h/2;
    
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * w;
      mouseY = ((e.clientY - rect.top) / rect.height) * h;
      for(let k=0; k<5; k++) {
        particles.push({
          x: mouseX + (Math.random()-0.5)*40, y: mouseY + (Math.random()-0.5)*40, 
          vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, 
          life: 1, color: gemColors[Math.floor(Math.random() * gemColors.length)]
        });
      }
    });
    
    function animateBtn() {
      if (!document.body.contains(btnCanvas)) return;
      ctx.clearRect(0, 0, w, h);
      for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.03;
        if(p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.life * 4.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(animateBtn);
    }
    animateBtn();
  }, 100);
  
  return btnContainer;
};

function addJAIMessage(role, text, sourceEntry) {
  const feed = $('jai-feed'); if (!feed) return null;
  const div = document.createElement('div');
  div.className = `jai-msg ${role}`;
  div.textContent = text;
  if (sourceEntry && role === 'ai') {
    const src = document.createElement('div');
    src.className = 'jai-source';
    src.textContent = `📖 From entry: "${sourceEntry.title || 'Untitled'}" — ${new Date(sourceEntry.date || sourceEntry.timestamp).toLocaleDateString()}`;
    div.appendChild(src);
  }
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
  return div;
}

function sendJournalAIQuery(query) {
  if (!query.trim()) return;
  addJAIMessage('user', query);
  // Set shimmer thinking state
  $('jai-shimmer-dot')?.classList.add('thinking');
  // Search journal entries locally (on-device, privacy-first)
  setTimeout(() => {
    const lq = query.toLowerCase();
    const keywords = lq.split(' ').filter(w => w.length > 3);
    const scored = STATE.journalEntries.map(e => {
      const text = ((e.title || '') + ' ' + (e.body || '').replace(/<[^>]*>/g,'') + ' ' + (e.tags||[]).join(' ')).toLowerCase();
      let score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
      // Mood matching
      if (lq.includes('burned out') || lq.includes('stress') || lq.includes('tired')) {
        if (['😔','😫','🥱'].includes(e.mood)) score += 2;
      }
      if (lq.includes('happy') || lq.includes('great') || lq.includes('amazing')) {
        if (['🤩','😊','😀'].includes(e.mood)) score += 2;
      }
      return { entry: e, score };
    }).filter(x => x.score > 0).sort((a,b) => b.score - a.score);

    $('jai-shimmer-dot')?.classList.remove('thinking');

    if (scored.length === 0) {
      const bubble = addJAIMessage('ai', "My powers are strictly limited to your journal, as intended by my developer. For general questions, please consult the main NYVRON AI.");
      if (bubble) bubble.appendChild(window.createMainAIBanner('emerald'));
      return;
    }

    // Summarize based on query type
    let response = '';
    const top = scored[0].entry;
    if (lq.includes('summarize') || lq.includes('all entries')) {
      response = `I found ${scored.length} related entries. The most relevant: "${top.title || 'Untitled'}" from ${new Date(top.date||top.timestamp).toLocaleDateString()}. Common themes: ${scored.slice(0,3).map(s=>s.entry.title||'Untitled').join(', ')}.`;
    } else if (lq.includes('last time') || lq.includes('when')) {
      response = `The most recent matching entry is "${top.title || 'Untitled'}" from ${new Date(top.date||top.timestamp).toLocaleDateString()}. ${top.mood ? 'Mood: ' + top.mood : ''}.`;
    } else {
      response = `I found ${scored.length} related entries. The closest match: "${top.title || 'Untitled'}" from ${new Date(top.date||top.timestamp).toLocaleDateString()}.`;
    }
    addJAIMessage('ai', response, top);
  }, 1200);
}

// --- ON THIS DAY ---
function openOnThisDay() {
  if ((STATE.passcodeEnabled || STATE.facelockEnabled || STATE.fingerprintlockEnabled) && STATE.vaultLocked) {
    STATE.lockTargetAction = 'otd';
    triggerBiometricOrPasscodeLock();
    return;
  }
  const overlay = $('on-this-day-overlay'); if (!overlay) return;
  overlay.classList.remove('hidden');
  const stack = $('otd-stack');
  if (!stack) return;
  stack.innerHTML = '';
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisDay = now.getDate();
  const thisYear = now.getFullYear();
  const throwbacks = STATE.journalEntries.filter(e => {
    const d = new Date(e.date || e.timestamp);
    return d.getMonth() === thisMonth && d.getDate() === thisDay && d.getFullYear() < thisYear;
  }).sort((a,b) => new Date(b.date||b.timestamp) - new Date(a.date||a.timestamp));

  if (throwbacks.length === 0) {
    stack.innerHTML = '<p style="text-align:center;color:var(--txt3);padding:40px 20px;">No memories from this day in past years yet. Keep journaling!</p>';
    return;
  }
  throwbacks.forEach((e, i) => {
    const card = document.createElement('div');
    card.className = 'otd-card';
    card.style.animationDelay = `${i * 0.08}s`;
    const d = new Date(e.date || e.timestamp);
    const yearsAgo = thisYear - d.getFullYear();
    const bodyText = (e.body || '').replace(/<[^>]*>/g,'').slice(0, 180);
    card.innerHTML = `
      <div class="otd-year-badge">${yearsAgo} year${yearsAgo !== 1 ? 's' : ''} ago — ${d.getFullYear()}</div>
      <div class="otd-card-title">${e.title || 'Untitled Entry'}</div>
      <div class="otd-card-body">${bodyText}${bodyText.length >= 180 ? '...' : ''}</div>
      <div style="margin-top:12px;font-size:20px;">${e.mood || '📖'}</div>
    `;
    card.addEventListener('click', () => {
      $('on-this-day-overlay')?.classList.add('hidden');
      openJournalWrite(e.id);
    });
    stack.appendChild(card);
  });
}

function checkOnThisDay() {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisDay = now.getDate();
  const thisYear = now.getFullYear();
  const throwbacks = STATE.journalEntries.filter(e => {
    const d = new Date(e.date || e.timestamp);
    return d.getMonth() === thisMonth && d.getDate() === thisDay && d.getFullYear() < thisYear;
  });
  const banner = $('otd-banner');
  if (banner && throwbacks.length > 0) {
    banner.classList.remove('hidden');
    const yearsBack = [...new Set(throwbacks.map(e => thisYear - new Date(e.date||e.timestamp).getFullYear()))];
    $('otd-banner-text').textContent = `${throwbacks.length} memor${throwbacks.length > 1 ? 'ies' : 'y'} from ${yearsBack.join(', ')} year${yearsBack.length > 1 ? 's' : ''} ago`;
  } else if (banner) {
    banner.classList.add('hidden');
  }
}

// --- MOOD HEATMAP ---
function openMoodHeatmap() {
  if ((STATE.passcodeEnabled || STATE.facelockEnabled || STATE.fingerprintlockEnabled) && STATE.vaultLocked) {
    STATE.lockTargetAction = 'mood';
    triggerBiometricOrPasscodeLock();
    return;
  }
  const overlay = $('mood-heatmap-overlay'); if (!overlay) return;
  overlay.classList.remove('hidden');
  renderMoodHeatmap();
}

function renderMoodHeatmap() {
  const grid = $('mood-heatmap-grid'); if (!grid) return;
  grid.innerHTML = '';
  const now = new Date();
  // Build last 84 days (12 weeks × 7 days)
  for (let i = 83; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('sv').slice(0, 10);
    const dayEntries = STATE.journalEntries.filter(e => {
      const ed = new Date(e.date || e.timestamp);
      return ed.toLocaleDateString('sv').slice(0, 10) === dateStr;
    });
    const cell = document.createElement('div');
    cell.className = 'mh-cell';
    if (dayEntries.length === 0) {
      cell.classList.add('mh-cell-empty');
    } else {
      const mood = dayEntries[dayEntries.length-1].mood || '🙂';
      const moodClass = { sad: 'mh-cell-sad', neutral: 'mh-cell-neutral', good: 'mh-cell-good', happy: 'mh-cell-happy', amazing: 'mh-cell-amazing' }[MOOD_MAP[mood] || 'good'];
      cell.classList.add(moodClass || 'mh-cell-good');
    }
    cell.title = `${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} — ${dayEntries.length} entr${dayEntries.length !== 1 ? 'ies' : 'y'}`;
    grid.appendChild(cell);
  }

  // Calculate and render mood breakdown percentages
  const totals = { sad: 0, neutral: 0, good: 0, happy: 0, amazing: 0 };
  let grandTotal = 0;
  STATE.journalEntries.forEach(e => {
    const moodLabel = MOOD_MAP[e.mood || '🙂'] || 'good';
    if (totals[moodLabel] !== undefined) {
      totals[moodLabel]++;
      grandTotal++;
    }
  });

  const listEl = $('mood-breakdown-list');
  if (listEl) {
    listEl.innerHTML = '';
    const moodNames = { sad: '😔 Sad', neutral: '😐 Neutral', good: '🙂 Good', happy: '😊 Happy', amazing: '🤩 Amazing' };
    const moodColors = { sad: '#5856D6', neutral: '#8E8E93', good: '#4CD964', happy: '#34C759', amazing: '#af52de' };
    
    Object.keys(totals).forEach(key => {
      const count = totals[key];
      const pct = grandTotal > 0 ? Math.round((count / grandTotal) * 100) : 0;
      
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.fontSize = '13px';
      row.style.fontWeight = '500';
      row.innerHTML = `
        <span style="width:90px; text-align:left;">${moodNames[key]}</span>
        <div style="flex:1; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; margin:0 12px; overflow:hidden;">
          <div style="width:${pct}%; height:100%; background:${moodColors[key]}; border-radius:4px; box-shadow:0 0 8px ${moodColors[key]}; transition:width 0.6s ease;"></div>
        </div>
        <span style="width:70px; text-align:right; color:var(--txt2);">${pct}% (${count})</span>
      `;
      listEl.appendChild(row);
    });
  }
}

// --- SMART TAGGING & @MENTIONS in Editor ---
function initJournalEditorIntelligence() {
  const body = $('jw-body');
  const mentionDropdown = $('jw-mention-dropdown');
  const tagDropdown = $('jw-tag-suggestions');
  const slashMenu = $('jw-slash-menu');
  const wikiDropdown = $('jw-wiki-dropdown');
  const awarenessDrawer = $('jw-awareness-drawer');
  const metaPillsContainer = $('jw-meta-pills-container');
  
  if (!body) return;

  // Hidden by default, slides up from bottom ONLY when text inside jw-body is highlighted/selected
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const toolbar = $('jw-format-toolbar');
    if (!toolbar) return;
    
    if (selection && selection.toString().trim().length > 0) {
      const anchor = selection.anchorNode;
      if (anchor && body.contains(anchor)) {
        toolbar.classList.remove('hidden');
        void toolbar.offsetWidth;
        toolbar.style.opacity = '1';
        toolbar.style.pointerEvents = 'auto';
        toolbar.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        return;
      }
    }
    
    toolbar.style.opacity = '0';
    toolbar.style.pointerEvents = 'none';
    toolbar.style.transform = 'translateX(-50%) translateY(15px) scale(0.95)';
    setTimeout(() => {
      if (window.getSelection().toString().trim().length === 0) {
        toolbar.classList.add('hidden');
      }
    }, 250);
  });
  
  const formatToggle = $('jw-tool-format-toggle');
  if (formatToggle) {
    formatToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const toolbar = $('jw-format-toolbar');
      if (!toolbar) return;
      
      const isVisible = toolbar.style.opacity === '1';
      if (isVisible) {
        toolbar.style.opacity = '0';
        toolbar.style.pointerEvents = 'none';
        toolbar.style.transform = 'translateX(-50%) translateY(15px) scale(0.95)';
        setTimeout(() => {
          toolbar.classList.add('hidden');
        }, 250);
      } else {
        toolbar.classList.remove('hidden');
        void toolbar.offsetWidth; // trigger reflow
        toolbar.style.opacity = '1';
        toolbar.style.pointerEvents = 'auto';
        toolbar.style.transform = 'translateX(-50%) translateY(0) scale(1)';
      }
    });
  }

  // Render meta-pills container contents initially with user action prompts
  let stepCount = parseInt(localStorage.getItem('nv-today-steps') || '0');
  if (metaPillsContainer) {
    metaPillsContainer.innerHTML = `
      <span class="jw-meta-pill" draggable="true" data-type="location" style="cursor:pointer;">📍 Click to show Location</span>
      <span class="jw-meta-pill" draggable="true" data-type="weather" style="cursor:pointer;">🌦 Click to show Weather</span>
      <span class="jw-meta-pill" draggable="true" data-type="steps" style="cursor:pointer;">👣 Click to track Steps</span>
      <span class="jw-meta-pill" draggable="true" data-type="music" style="cursor:pointer;">🎵 Click to scan Audio</span>
    `;

    // Step UI update helper
    const updateStepsUI = () => {
      const stepPill = metaPillsContainer.querySelector('[data-type="steps"]');
      if (stepPill) stepPill.textContent = `👣 ${stepCount} steps`;
      localStorage.setItem('nv-today-steps', stepCount);
    };

    // Helper to query Open-Meteo current forecast
    const fetchWeather = async (lat, lon, cityName) => {
      try {
        const locPill = metaPillsContainer.querySelector('[data-type="location"]');
        if (locPill) locPill.textContent = `📍 ${cityName}`;

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`);
        const weatherData = await weatherRes.json();
        const temp = Math.round(weatherData.current_weather?.temperature || 72);
        const code = weatherData.current_weather?.weathercode || 0;
        let cond = 'Sunny';
        if (code >= 1 && code <= 3) cond = 'Partly Cloudy';
        else if (code >= 45 && code <= 48) cond = 'Foggy';
        else if (code >= 51 && code <= 67) cond = 'Rainy';
        else if (code >= 71 && code <= 77) cond = 'Snowy';
        else if (code >= 80 && code <= 82) cond = 'Showers';
        else if (code >= 95 && code <= 99) cond = 'Stormy';

        const wPill = metaPillsContainer.querySelector('[data-type="weather"]');
        if (wPill) wPill.textContent = `🌦 ${temp}°F ${cond}`;
      } catch (err) {
        console.warn('Weather sensor query error', err);
      }
    };

    // Location Pill handler: triggers Geolocation prompt
    const triggerLocation = () => {
      const locPill = metaPillsContainer.querySelector('[data-type="location"]');
      if (locPill) locPill.textContent = `📍 Requesting GPS...`;

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || 'Local Area';
          if (locPill) locPill.textContent = `📍 ${city}`;
        } catch(err) {
          if (locPill) locPill.textContent = `📍 Local Area`;
        }
      }, () => {
        if (locPill) locPill.textContent = `📍 Access Denied`;
      });
    };

    // Weather Pill handler: triggers Geolocation prompt and queries weather
    const triggerWeather = () => {
      const wPill = metaPillsContainer.querySelector('[data-type="weather"]');
      if (wPill) wPill.textContent = `🌦 Requesting GPS...`;

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || 'Local Area';
          fetchWeather(lat, lon, city);
        } catch(err) {
          fetchWeather(lat, lon, 'Local Area');
        }
      }, () => {
        if (wPill) wPill.textContent = `🌦 Access Denied`;
      });
    };

    // Steps Pill handler: triggers iOS motion permission or activates listener immediately
    let motionActive = false;
    const triggerSteps = async () => {
      const stepPill = metaPillsContainer.querySelector('[data-type="steps"]');
      if (motionActive) return;

      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const state = await DeviceMotionEvent.requestPermission();
          if (state === 'granted') {
            activateMotionListener();
          } else {
            if (stepPill) stepPill.textContent = `👣 Access Denied`;
          }
        } catch(e) {
          if (stepPill) stepPill.textContent = `👣 Access Denied`;
        }
      } else {
        activateMotionListener();
      }
    };

    const activateMotionListener = () => {
      motionActive = true;
      updateStepsUI();
      window.addEventListener('devicemotion', (ev) => {
        const acc = ev.accelerationIncludingGravity;
        if (acc) {
          const mag = Math.sqrt(acc.x*acc.x + acc.y*acc.y + acc.z*acc.z);
          if (mag > 12.5) {
            stepCount++;
            updateStepsUI();
          }
        }
      });
    };

    // Keystroke steps fallback (always active as backup)
    let keystrokes = 0;
    body.addEventListener('keydown', () => {
      keystrokes++;
      if (keystrokes % 20 === 0) {
        stepCount++;
        if (motionActive) updateStepsUI();
      }
    });

    // Active music check handler (Media Session API + HTML5 Audio tag fallback)
    const updateMusicPill = () => {
      const musicPill = metaPillsContainer.querySelector('[data-type="music"]');
      if (!musicPill) return;
      if (navigator.mediaSession && navigator.mediaSession.metadata) {
        musicPill.textContent = `🎵 ${navigator.mediaSession.metadata.title} - ${navigator.mediaSession.metadata.artist}`;
      } else {
        const audios = document.querySelectorAll('audio');
        let playing = false;
        for (let aud of audios) {
          if (!aud.paused) {
            musicPill.textContent = `🎵 Audio Recording Playback`;
            playing = true;
            break;
          }
        }
        if (!playing) {
          musicPill.textContent = `🎵 No Active Music`;
        }
      }
    };

    // Run music checks dynamically every 2.5 seconds
    updateMusicPill();
    setInterval(updateMusicPill, 2500);

    // Wire clicks to activate permissions and query data
    metaPillsContainer.querySelector('[data-type="location"]')?.addEventListener('click', triggerLocation);
    metaPillsContainer.querySelector('[data-type="weather"]')?.addEventListener('click', triggerWeather);
    metaPillsContainer.querySelector('[data-type="steps"]')?.addEventListener('click', triggerSteps);
    metaPillsContainer.querySelector('[data-type="music"]')?.addEventListener('click', updateMusicPill);

    // Setup drag event listeners
    metaPillsContainer.querySelectorAll('.jw-meta-pill').forEach(pill => {
      pill.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/html', pill.outerHTML);
        e.dataTransfer.setData('text/plain', pill.textContent);
      });
    });
  }

  // --- Sticky notes / Scratchpad sidebar handlers ---
  let quickNotes = JSON.parse(localStorage.getItem('nv-quick-notes') || '[]');
  const renderQuickNotes = () => {
    const listEl = $('jw-notes-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    quickNotes.forEach(note => {
      const card = document.createElement('div');
      card.className = `sticky-note-card ${note.color}`;
      card.dataset.id = note.id;
      card.innerHTML = `
        <textarea class="note-card-textarea" placeholder="Draft a quick thought...">${note.text}</textarea>
        <div class="note-card-actions">
          <div style="display:flex; gap:6px;">
            <span class="color-dot orange" style="width:10px;height:10px;border-radius:50%;background:#e8652a;display:inline-block;cursor:pointer;"></span>
            <span class="color-dot purple" style="width:10px;height:10px;border-radius:50%;background:#a855f7;display:inline-block;cursor:pointer;"></span>
            <span class="color-dot green" style="width:10px;height:10px;border-radius:50%;background:#34c759;display:inline-block;cursor:pointer;"></span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="note-btn-action convert-btn">➕ Convert</button>
            <button class="note-btn-action delete-btn" style="display:inline-flex; align-items:center; justify-content:center; padding:4px;" title="Delete Note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
          </div>
        </div>
      `;
      
      const tx = card.querySelector('.note-card-textarea');
      tx.addEventListener('input', () => {
        note.text = tx.value;
        localStorage.setItem('nv-quick-notes', JSON.stringify(quickNotes));
      });
      
      card.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          card.className = 'sticky-note-card';
          if (dot.classList.contains('orange')) note.color = 'note-orange';
          else if (dot.classList.contains('purple')) note.color = 'note-purple';
          else note.color = 'note-green';
          card.classList.add(note.color);
          localStorage.setItem('nv-quick-notes', JSON.stringify(quickNotes));
        });
      });
      
      card.querySelector('.convert-btn').addEventListener('click', () => {
        if (!note.text.trim()) {
          showAlert('Convert Note', 'Cannot convert an empty note.');
          return;
        }
        $('jw-title').value = 'Quick Scratchpad Note';
        body.innerHTML = `<p>${note.text}</p>`;
        body.focus();
        $('jw-notes-panel')?.classList.add('hidden');
        triggerNotification('Converted', 'Sticky note loaded into editor.');
      });
      
      card.querySelector('.delete-btn').addEventListener('click', () => {
        quickNotes = quickNotes.filter(n => n.id !== note.id);
        localStorage.setItem('nv-quick-notes', JSON.stringify(quickNotes));
        renderQuickNotes();
      });
      
      listEl.appendChild(card);
    });
  };

  $('jw-notes-add')?.addEventListener('click', () => {
    quickNotes.push({ id: randomId(), text: '', color: 'note-orange', timestamp: Date.now() });
    localStorage.setItem('nv-quick-notes', JSON.stringify(quickNotes));
    renderQuickNotes();
  });
  
  $('jw-notes-toggle')?.addEventListener('click', () => {
    $('jw-notes-panel')?.classList.toggle('hidden');
    renderQuickNotes();
  });
  
  $('jw-notes-close')?.addEventListener('click', () => {
    $('jw-notes-panel')?.classList.add('hidden');
  });

  // --- Highlights and Callout block toggles ---
  $('jw-tool-highlight')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.execCommand('backColor', false, '#ffef7a');
  });
  $('jw-tool-callout')?.addEventListener('click', (e) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const selected = sel.toString() || 'Callout insight...';
      document.execCommand('insertHTML', false, `<div class="jw-callout" contenteditable="true">💡 ${selected}</div><p><br></p>`);
    }
  });

  // --- HTML5 Drag & Drop inline snap placement ---
  body.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  body.addEventListener('drop', (e) => {
    e.preventDefault();
    const htmlData = e.dataTransfer.getData('text/html');
    const textData = e.dataTransfer.getData('text/plain');
    
    // Check if it is a meta pill or image file
    if (htmlData && htmlData.includes('jw-meta-pill')) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        range.insertNode(document.createRange().createContextualFragment(htmlData + '&nbsp;'));
        if (navigator.vibrate) navigator.vibrate(20); // haptic feedback snap
      }
    }
  });

  // --- Click handlers on collapsible heading chevrons ---
  body.addEventListener('click', (e) => {
    if (e.target.classList.contains('jw-collapse-chevron')) {
      const chevron = e.target;
      chevron.classList.toggle('collapsed');
      const isCollapsed = chevron.classList.contains('collapsed');
      
      // Toggle display of siblings until next header
      let next = chevron.closest('.jw-collapse-hdr')?.nextElementSibling;
      while (next) {
        if (next.classList.contains('jw-collapse-hdr') || next.tagName.match(/^H[1-3]$/)) {
          break;
        }
        next.style.display = isCollapsed ? 'none' : '';
        next = next.nextElementSibling;
      }
    }
  });

  // --- Event listener for keystrokes: Markdown, Slash Command, Wiki-links ---
  let debouncedAwarenessTimeout = null;
  body.addEventListener('keyup', (e) => {
    const text = body.textContent || '';
    const html = body.innerHTML;
    const cursorPos = getCaretCharOffset(body);
    const textBefore = text.slice(0, cursorPos);
    
    // 1. WYSIWYG Markdown Sync
    if (e.key === ' ' || e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        let blockNode = sel.anchorNode;
        while (blockNode && blockNode.parentNode !== body) {
          blockNode = blockNode.parentNode;
        }
        if (blockNode) {
          const txtVal = blockNode.textContent;
          if (txtVal.startsWith('# ')) {
            blockNode.innerHTML = `<span class="jw-collapse-chevron" contenteditable="false">▼</span>&nbsp;${txtVal.slice(2)}`;
            blockNode.className = 'jw-collapse-hdr';
            // Set tag type to H1 internally if we want, or keep it styled
            document.execCommand('formatBlock', false, 'H1');
          } else if (txtVal.startsWith('## ')) {
            blockNode.innerHTML = `<span class="jw-collapse-chevron" contenteditable="false">▼</span>&nbsp;${txtVal.slice(3)}`;
            blockNode.className = 'jw-collapse-hdr';
            document.execCommand('formatBlock', false, 'H2');
          } else if (txtVal.startsWith('### ')) {
            blockNode.innerHTML = `<span class="jw-collapse-chevron" contenteditable="false">▼</span>&nbsp;${txtVal.slice(4)}`;
            blockNode.className = 'jw-collapse-hdr';
            document.execCommand('formatBlock', false, 'H3');
          } else if (txtVal.startsWith('> ')) {
            blockNode.innerHTML = `&nbsp;${txtVal.slice(2)}`;
            document.execCommand('formatBlock', false, 'blockquote');
          }
        }
      }
    }

    // 2. Slash command menu popup trigger
    const slashMatch = textBefore.match(/\/(\w*)$/);
    if (slashMatch && slashMenu) {
      // Position menu near cursor
      const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
      const parentRect = body.getBoundingClientRect();
      slashMenu.style.left = `${rect.left - parentRect.left}px`;
      slashMenu.style.top = `${rect.bottom - parentRect.top + body.scrollTop + 10}px`;
      slashMenu.classList.remove('hidden');
      
      // Filter list based on type
      const query = slashMatch[1].toLowerCase();
      slashMenu.querySelectorAll('.jw-slash-item').forEach(item => {
        const cmd = item.dataset.cmd;
        item.style.display = cmd.includes(query) ? 'flex' : 'none';
      });
    } else {
      slashMenu?.classList.add('hidden');
    }

    // 3. Wiki notes linking [[ query trigger
    const wikiMatch = textBefore.match(/\[\[([^\]]*)$/);
    if (wikiMatch && wikiDropdown) {
      const query = wikiMatch[1].toLowerCase();
      const matches = STATE.journalEntries.filter(entry => entry.title && entry.title.toLowerCase().includes(query)).slice(0, 5);
      
      const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
      const parentRect = body.getBoundingClientRect();
      wikiDropdown.style.left = `${rect.left - parentRect.left}px`;
      wikiDropdown.style.top = `${rect.bottom - parentRect.top + body.scrollTop + 10}px`;
      
      if (matches.length > 0) {
        wikiDropdown.innerHTML = matches.map(entry =>
          `<div class="jw-wiki-item" data-id="${entry.id}">
            <span>🔗 [[${entry.title}]]</span>
            <span style="font-size:11px;color:var(--txt3);">${new Date(entry.date||entry.timestamp).toLocaleDateString()}</span>
          </div>`
        ).join('');
        wikiDropdown.classList.remove('hidden');
        
        wikiDropdown.querySelectorAll('.jw-wiki-item').forEach(item => {
          item.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            const entry = STATE.journalEntries.find(x => x.id === item.dataset.id);
            if (entry) {
              const bodyVal = body.innerHTML;
              // Replace [[ query with link
              const replaced = bodyVal.replace(/\[\[([^\]]*)$/, `<a href="#" class="wiki-link" data-link-id="${entry.id}">[[${entry.title}]]</a>&nbsp;`);
              body.innerHTML = replaced;
            }
            wikiDropdown.classList.add('hidden');
          });
        });
      } else {
        wikiDropdown.classList.add('hidden');
      }
    } else {
      wikiDropdown?.classList.add('hidden');
    }

    // 4. Live Awareness prompts debounced check
    clearTimeout(debouncedAwarenessTimeout);
    debouncedAwarenessTimeout = setTimeout(() => {
      const val = body.textContent.toLowerCase();
      const triggers = ['stress', 'tired', 'burnout', 'exhausted', 'anxious', 'sad', 'angry', 'boundaries'];
      const matched = triggers.find(t => val.includes(t));
      if (matched && awarenessDrawer) {
        const prompts = {
          stress: "You wrote about stress. What is one small thing you can control right now to relieve it?",
          tired: "Feeling tired? Is there a way you can clear 15 minutes of your schedule today to just rest?",
          burnout: "Burnout is real. What boundary can you set with work or expectations today?",
          exhausted: "When exhausted, even tiny steps matter. How can you treat yourself gently today?",
          anxious: "Anxiety can feel heavy. Breathe deeply for 4 seconds and write down what you hear around you.",
          sad: "It's okay to feel sad. Can you name one person or memory that brings a little comfort?",
          boundaries: "Boundaries protect your peace. What is one thing you can say 'no' to today?"
        };
        const textPrompt = prompts[matched] || "Take a deep breath. Focus on your boundaries and peace.";
        $('jw-awareness-content').innerHTML = `
          <div>${textPrompt}</div>
          <button class="editor-ai-insert-btn" id="jw-awareness-insert-btn">🌱 Insert reflection into note</button>
        `;
        awarenessDrawer.classList.remove('hidden');
        $('jw-awareness-insert-btn')?.addEventListener('click', () => {
          body.focus();
          document.execCommand('insertText', false, `\n\n[Reflecting on ${matched}]: ${textPrompt}\n`);
          awarenessDrawer.classList.add('hidden');
        });
      }
    }, 1200);

    // 5. Typewriter Mode line-centering logic
    if (body.classList.contains('typewriter-mode')) {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        let activeEl = sel.anchorNode;
        while (activeEl && activeEl.parentNode !== body) {
          activeEl = activeEl.parentNode;
        }
        if (activeEl && activeEl.nodeType === 1) {
          body.querySelectorAll('.active-block').forEach(b => b.classList.remove('active-block'));
          activeEl.classList.add('active-block');
          
          // Scroll container to center active item vertically
          const containerHeight = body.clientHeight;
          const elTop = activeEl.offsetTop;
          const elHeight = activeEl.clientHeight;
          body.scrollTop = elTop - (containerHeight / 2) + (elHeight / 2);
        }
      }
    }
  });

  // --- Slash Command click handler ---
  slashMenu?.querySelectorAll('.jw-slash-item')?.forEach(item => {
    item.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      const cmd = item.dataset.cmd;
      body.focus();
      
      // Erase the slash
      const range = window.getSelection().getRangeAt(0);
      range.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
      range.deleteContents();
      
      if (cmd === 'h1') {
        document.execCommand('formatBlock', false, 'H1');
        const sel = window.getSelection();
        if (sel.anchorNode && sel.anchorNode.parentNode) {
          const parent = sel.anchorNode.parentNode;
          if (parent.tagName === 'H1' && !parent.querySelector('.jw-collapse-chevron')) {
            parent.innerHTML = `<span class="jw-collapse-chevron" contenteditable="false">▼</span>&nbsp;` + parent.innerHTML;
            parent.className = 'jw-collapse-hdr';
          }
        }
      } else if (cmd === 'h2') {
        document.execCommand('formatBlock', false, 'H2');
      } else if (cmd === 'todo') {
        document.execCommand('insertHTML', false, '<div><input type="checkbox" style="margin-right:8px;" /> &nbsp;</div>');
      } else if (cmd === 'bullet') {
        document.execCommand('insertUnorderedList', false, null);
      } else if (cmd === 'table') {
        document.execCommand('insertHTML', false, `
          <table class="editor-table">
            <tr><th>Header 1</th><th>Header 2</th></tr>
            <tr><td contenteditable="true">Cell</td><td contenteditable="true">Cell</td></tr>
            <tr><td contenteditable="true">Cell</td><td contenteditable="true">Cell</td></tr>
          </table><p><br></p>
        `);
      } else if (cmd === 'pill') {
        body.innerHTML += ` <span class="jw-meta-pill" contenteditable="false">📍 Location Tag</span>&nbsp;`;
      }
      slashMenu.classList.add('hidden');
    });
  });

  // --- Close button on Awareness Prompts Drawer ---
  $('jw-awareness-close')?.addEventListener('click', () => {
    awarenessDrawer?.classList.add('hidden');
  });

  // Smart tagSuggestions/mentions click bindings from previous code
  const dropZone = $('jw-drop-zone');
  if (dropZone) {
    body.addEventListener('dragenter', () => dropZone.classList.remove('hidden'));
    body.addEventListener('dragleave', (e) => { if (!body.contains(e.relatedTarget)) dropZone.classList.add('hidden'); });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      dropZone.classList.add('hidden');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      for (const file of files) {
        const id = randomId();
        await saveFile(id, file);
        const att = { id: randomId(), type: 'image', fileId: id };
        STATE.journalEditAttachments.push(att);
        
        // Snap layout alignment with haptic tick
        const img = document.createElement('div');
        img.className = 'attachment-snap';
        $('jw-attachments-grid')?.appendChild(img);
        if (navigator.vibrate) navigator.vibrate(30);
      }
      renderJournalAttachments();
    });
  }
}

function getCaretCharOffset(el) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return range.toString().length;
}

// --- EXPORT ---
function openExport() {
  $('export-backdrop')?.classList.remove('hidden');
  $('journal-export-panel')?.classList.remove('hidden');
}
function closeExport() {
  $('export-backdrop')?.classList.add('hidden');
  $('journal-export-panel')?.classList.add('hidden');
}
function exportAsJSON() {
  const blob = new Blob([JSON.stringify(STATE.journalEntries, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `nyvron-journal-${today()}.json`; a.click();
  URL.revokeObjectURL(url);
  closeExport();
}
function exportAsMarkdown() {
  const md = STATE.journalEntries.map(e => {
    const body = (e.body || '').replace(/<[^>]*>/g, '');
    return `# ${e.title || 'Untitled'}\n*${new Date(e.date||e.timestamp).toLocaleDateString()}* ${e.mood||''}\n\n${body}\n\n---`;
  }).join('\n\n');
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `nyvron-journal-${today()}.md`; a.click();
  URL.revokeObjectURL(url);
  closeExport();
}

// --- initSmartCapture ---
function initSmartCapture() {
  const smartContainer = $('journal-smart-capture');
  if (smartContainer) {
    const h = new Date().getHours();
    let suggestionText = "Any thoughts on today?";
    if (h < 10) suggestionText = "Morning brain dump?";
    else if (h > 20) suggestionText = "Late night thoughts?";
    
    smartContainer.innerHTML = `
      <div class="smart-suggestion-card" id="smart-suggestion-btn">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:24px;">✨</div>
          <div>
            <h3 style="font-size:16px; font-weight:600; margin-bottom:4px;">${suggestionText}</h3>
            <p style="font-size:13px; color:var(--txt2);">Tap to write a frictionless entry</p>
          </div>
        </div>
      </div>
    `;

    $('smart-suggestion-btn')?.addEventListener('click', (e) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const bloom = document.createElement('div');
      bloom.className = 'anim-bloom-reveal';
      bloom.style.left = rect.left + 'px';
      bloom.style.top = rect.top + 'px';
      bloom.style.width = rect.width + 'px';
      bloom.style.height = rect.height + 'px';
      bloom.style.background = 'var(--surface)';
      document.body.appendChild(bloom);
      setTimeout(() => {
        openJournalWrite();
        bloom.remove();
      }, 450);
    });
  }

  // Micro Journal Zero-Typing logic
  document.querySelectorAll('.micro-bubble').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tag = e.currentTarget.dataset.tag;
      const emoji = e.currentTarget.textContent;
      
      // Play Haptic Bubble animation
      e.currentTarget.classList.remove('anim-haptic-pop');
      void e.currentTarget.offsetWidth; // trigger reflow
      e.currentTarget.classList.add('anim-haptic-pop');
      if (navigator.vibrate) navigator.vibrate(40);
      
      // Create a zero-typing entry instantly
      STATE.journalEntries.push({
        id: randomId(),
        title: "",
        body: `<p>${emoji} ${tag}</p>`,
        mood: emoji,
        attachments: [],
        timestamp: Date.now()
      });
      save();
      renderJournal();
    });
  });
}

// ==========================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initSmartCapture();
  BLOOM = $('nyvron-bloom-svg');
  // Theme selector
  const themeSel = $('settings-theme');
  const savedTheme = localStorage.getItem('nv-theme') || 'auto';
  if(themeSel) themeSel.value = savedTheme;
  if (savedTheme === 'auto') {
    applyAutoTheme();
  } else {
    applyManualTheme(savedTheme);
  }
  themeSel?.addEventListener('change', () => {
    const val = themeSel.value;
    localStorage.setItem('nv-theme', val);
    if (val === 'auto') {
      applyAutoTheme();
    } else {
      applyManualTheme(val);
    }
  });

  // Motivation/North Star refresh click binding with spin loading animation
  $('ns-refresh')?.addEventListener('click', async () => {
    const btn = $('ns-refresh');
    if (btn) {
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
      btn.classList.add('loading-spin');
    }
    await fetchNorthStar(true);
    if (btn) {
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      btn.classList.remove('loading-spin');
    }
  });

  // Energy buttons wiring
  const esegBtns = document.querySelectorAll('.eseg-btn');
  const savedEnergy = localStorage.getItem('nv-energy') || 'high';
  esegBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.energy === savedEnergy);
    btn.addEventListener('click', () => {
      esegBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.energy = btn.dataset.energy;
      localStorage.setItem('nv-energy', btn.dataset.energy);
    });
  });

  // Profile edit row triggers (Card, Avatar, Name)
  const triggerProfileEdit = () => {
    showPrompt('Profile Name', 'Enter profile name:', STATE.profile.name || 'User', (newName) => {
      if(newName && newName.trim()) {
        STATE.profile.name = newName.trim();
        save();
        renderProfile();
      }
    });
  };
  $('profile-card-btn')?.addEventListener('click', triggerProfileEdit);
  $('profile-avatar')?.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerProfileEdit();
  });
  $('profile-name')?.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerProfileEdit();
  });

  // Wire backdrop close triggers
  $('modal-close')?.addEventListener('click', closeModal);
  $('modal-backdrop')?.addEventListener('click', closeModal);
  $('cal-creator-backdrop')?.addEventListener('click', closeCalCreator);
  // Focus overlay close button
  $('cfo-close')?.addEventListener('click', () => {
    showConfirm('Stop Session', 'Are you sure you want to stop this study session?', () => {
      stopCascaraSession();
    });
  });
  
  $('cfo-minimize')?.addEventListener('click', () => {
    $('cascara-focus-overlay')?.classList.add('hidden');
  });

  // Journal Editor text formatting buttons
  document.querySelectorAll('.jw-tool-btn[data-fmt]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); // prevent loss of focus
      const fmt = btn.dataset.fmt;
      const editor = $('jw-body');
      if (editor) editor.focus();
      
      if (fmt === 'list') {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          const container = document.createElement('div');
          container.appendChild(range.cloneContents());
          
          const htmlContent = container.innerHTML;
          const lines = htmlContent
            .split(/<br\/?>|<\/?div>|<\/?p>|<li>/i)
            .map(line => line.replace(/<\/?[^>]+(>|$)/g, "").trim())
            .filter(line => line.length > 0);
            
          if (lines.length > 0) {
            const listHTML = '<ul>' + lines.map(line => `<li>${line}</li>`).join('') + '</ul>';
            document.execCommand('insertHTML', false, listHTML);
          } else {
            document.execCommand('insertUnorderedList', false, null);
          }
        } else {
          document.execCommand('insertUnorderedList', false, null);
        }
      } else if (fmt.startsWith('h')) {
        document.execCommand('formatBlock', false, `<${fmt}>`);
      } else {
        document.execCommand(fmt, false, null);
      }
    });
  });

  // Toggle highlight color picker display
  $('jw-tool-highlight')?.addEventListener('click', (e) => {
    e.preventDefault();
    const picker = $('jw-highlight-colors');
    if (picker) picker.classList.toggle('hidden');
  });

  // Wire highlight color dots selection
  document.querySelectorAll('.hl-color-dot').forEach(dot => {
    dot.addEventListener('mousedown', (e) => {
      e.preventDefault(); // keep text selection
      const color = dot.dataset.color;
      const editor = $('jw-body');
      if (editor) editor.focus();
      document.execCommand('backColor', false, color);
      $('jw-highlight-colors')?.classList.add('hidden');
    });
  });

  $('jw-tool-todo')?.addEventListener('click', (e) => {
    e.preventDefault();
    const txt = $('jw-body');
    if (!txt) return;
    txt.focus();
    document.execCommand('insertHTML', false, '<div><input type="checkbox" style="margin-right:8px;" /> &nbsp;</div>');
  });

  // Main AI Tab Submit Buttons wiring
  const handleAISend = () => {
    const inp = $('ai-input'); if (!inp) return;
    const text = inp.value.trim();
    if (text) {
      inp.value = '';
      sendAI(text);
    }
  };

  $('ai-send')?.addEventListener('click', handleAISend);
  $('ai-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAISend();
    }
  });

  // Prompt chips
  document.querySelectorAll('.ai-prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      sendAI(chip.dataset.prompt);
    });
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
      <input id="new-priority-inp" class="modal-input" placeholder="What is your priority?" style="width:100%; padding:10px; margin-bottom:12px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--txt1);" />
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
        <label style="font-size:11px;color:inherit; opacity:0.7;display:block;margin-bottom:4px;">TIME</label>
        <input id="new-schedule-time" type="time" class="modal-input" style="width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--txt1);" />
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:11px;color:inherit; opacity:0.7;display:block;margin-bottom:4px;">EVENT TITLE</label>
        <input id="new-schedule-title" class="modal-input" placeholder="e.g., Mathematics Focus" style="width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--txt1);" />
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
      <input id="new-reminder-inp" class="modal-input" placeholder="e.g., Drink water, Stretch..." style="width:100%; padding:10px; margin-bottom:12px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--txt1);" />
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
  // Toggle format toolbar

  // ==========================================
  // PHASE 2: NEW FEATURE BUTTON WIRING
  // ==========================================
  $('jfb-burn')?.addEventListener('click', openBurnOverlay);
  $('jfb-commute')?.addEventListener('click', openCommuteTherapy);
  $('jfb-constellation')?.addEventListener('click', openConstellation);
  $('jfb-ai')?.addEventListener('click', openJournalAI);
  $('jfb-otd')?.addEventListener('click', openOnThisDay);
  $('jfb-export')?.addEventListener('click', openExport);
  $('jfb-heatmap')?.addEventListener('click', openMoodHeatmap);
  $('otd-banner-btn')?.addEventListener('click', openOnThisDay);
  $('burn-close-btn')?.addEventListener('click', closeBurnOverlay);
  $('burn-save-btn')?.addEventListener('click', saveBurnEntry);
  $('burn-now-btn')?.addEventListener('click', burnNow);
  $('commute-close-btn')?.addEventListener('click', closeCommuteTherapy);
  $('commute-record-btn')?.addEventListener('click', () => {
    if (commuteRecording) stopCommuteRecording(); else startCommuteRecording();
  });
  $('commute-save-btn')?.addEventListener('click', saveCommuteEntry);
  $('constellation-close')?.addEventListener('click', () => {
    $('constellation-overlay')?.classList.add('hidden');
  });
  $('jai-close')?.addEventListener('click', () => {
    $('journal-ai-overlay')?.classList.add('hidden');
    document.querySelector('.tab-bar')?.classList.remove('hidden');
  });
  $('jai-close-floating')?.addEventListener('click', () => {
    $('journal-ai-overlay')?.classList.add('hidden');
    document.querySelector('.tab-bar')?.classList.remove('hidden');
  });
  $('jai-send')?.addEventListener('click', () => {
    const inp = $('jai-input');
    if (inp?.value.trim()) { sendJournalAIQuery(inp.value.trim()); inp.value = ''; }
  });
  $('jai-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const inp = $('jai-input');
      if (inp?.value.trim()) { sendJournalAIQuery(inp.value.trim()); inp.value = ''; }
    }
  });
  $('otd-close')?.addEventListener('click', () => $('on-this-day-overlay')?.classList.add('hidden'));
  $('mh-close')?.addEventListener('click', () => $('mood-heatmap-overlay')?.classList.add('hidden'));
  $('jfb-export')?.addEventListener('click', () => {
    $('export-overlay').classList.remove('hidden');
    $('export-backdrop').classList.remove('hidden');
  });

  $('export-close')?.addEventListener('click', closeExport);

  function exportAsPDF() {
    const printWindow = window.open('', '_blank');
    const entriesHtml = STATE.journalEntries.map(e => `
      <div style="page-break-after:always; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:40px; color:#2c3e50;">
        <div style="font-size:14px;color:#7f8c8d;margin-bottom:10px;">${new Date(e.date||e.timestamp).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        <h1 style="font-size:28px;color:#2c3e50;margin-top:0;margin-bottom:20px;">${e.title || 'Untitled Entry'}</h1>
        <div style="font-size:16px;line-height:1.6;color:#34495e;">${e.body || ''}</div>
      </div>
    `).join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>NYVRON Journal Export</title>
        </head>
        <body onload="window.print();window.close();">
          ${entriesHtml || '<h3>No journal entries found.</h3>'}
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // --- ZK Passcode & Decoy logic ---
  let inputPasscode = '';
  const dialBtns = document.querySelectorAll('.dial-btn[data-val]');
  const dots = document.querySelectorAll('#passcode-dots .dot');
  
  dialBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (inputPasscode.length < 4) {
        inputPasscode += btn.dataset.val;
        updatePasscodeDots();
        
        if (inputPasscode.length === 4) {
          setTimeout(verifyPasscode, 300);
        }
      }
    });
  });
  
  $('lock-clear-btn')?.addEventListener('click', () => {
    if (inputPasscode.length > 0) {
      inputPasscode = inputPasscode.slice(0, -1);
      updatePasscodeDots();
    }
  });

  function updatePasscodeDots() {
    dots.forEach((dot, idx) => {
      dot.classList.toggle('filled', idx < inputPasscode.length);
    });
  }

  // Sync passcode and Face Lock checkbox states on load
  const pToggle = $('settings-passcode-toggle');
  const fToggle = $('settings-facelock-toggle');
  const fingerToggle = $('settings-fingerprint-toggle');
  
  if (pToggle) pToggle.checked = STATE.passcodeEnabled;
  if (fToggle) fToggle.checked = STATE.facelockEnabled;
  if (fingerToggle) fingerToggle.checked = STATE.fingerprintlockEnabled;

  // General Privacy Settings wiring
  const remChatsToggle = $('settings-remember-chats');
  const storeHistToggle = $('settings-store-history');
  const notifToggle = $('settings-notifications');

  if (remChatsToggle) remChatsToggle.checked = localStorage.getItem('nv-remember-chats') !== 'false';
  if (storeHistToggle) storeHistToggle.checked = localStorage.getItem('nv-store-history') !== 'false';
  if (notifToggle) notifToggle.checked = localStorage.getItem('nv-notifications') !== 'false';

  remChatsToggle?.addEventListener('change', () => {
    localStorage.setItem('nv-remember-chats', remChatsToggle.checked);
    triggerNotification('Settings Saved', `Remember Chats preference is now ${remChatsToggle.checked ? 'Enabled' : 'Disabled'}`);
  });
  storeHistToggle?.addEventListener('change', () => {
    localStorage.setItem('nv-store-history', storeHistToggle.checked);
    triggerNotification('Settings Saved', `Store History preference is now ${storeHistToggle.checked ? 'Enabled' : 'Disabled'}`);
  });
  notifToggle?.addEventListener('change', () => {
    localStorage.setItem('nv-notifications', notifToggle.checked);
    triggerNotification('Settings Saved', `Notifications preference is now ${notifToggle.checked ? 'Enabled' : 'Disabled'}`);
  });

  pToggle?.addEventListener('change', () => {
    STATE.passcodeEnabled = pToggle.checked;
    localStorage.setItem('nv-passcode-enabled', STATE.passcodeEnabled);
    triggerNotification('Settings Saved', `Passcode Protection is now ${STATE.passcodeEnabled ? 'Enabled' : 'Disabled'}`);
  });
  
  fToggle?.addEventListener('change', () => {
    STATE.facelockEnabled = fToggle.checked;
    localStorage.setItem('nv-facelock-enabled', STATE.facelockEnabled);
    if (STATE.facelockEnabled && fingerToggle) {
      fingerToggle.checked = false;
      STATE.fingerprintlockEnabled = false;
      localStorage.setItem('nv-fingerprintlock-enabled', false);
    }
    triggerNotification('Settings Saved', `Face Lock is now ${STATE.facelockEnabled ? 'Enabled' : 'Disabled'}`);
  });

  fingerToggle?.addEventListener('change', () => {
    STATE.fingerprintlockEnabled = fingerToggle.checked;
    localStorage.setItem('nv-fingerprintlock-enabled', STATE.fingerprintlockEnabled);
    if (STATE.fingerprintlockEnabled && fToggle) {
      fToggle.checked = false;
      STATE.facelockEnabled = false;
      localStorage.setItem('nv-facelock-enabled', false);
    }
    triggerNotification('Settings Saved', `Fingerprint Lock is now ${STATE.fingerprintlockEnabled ? 'Enabled' : 'Disabled'}`);
  });

  // Cancel biometrics scanner overlay
  $('bio-cancel-btn')?.addEventListener('click', () => {
    $('biometric-scan-overlay')?.classList.add('hidden');
    STATE.lockTargetTab = null;
    STATE.lockTargetEditId = null;
    STATE.lockTargetAction = null;
  });

  // Simulated Biometric Scanner execution routing
  triggerBiometricOrPasscodeLock = function() {
    const overlay = $('biometric-scan-overlay');
    const fSvg = $('fingerprint-scan-svg');
    const fSquare = $('faceid-scan-square');
    
    if (STATE.facelockEnabled && overlay) {
      overlay.classList.remove('hidden');
      fSquare.classList.remove('hidden');
      fSvg.classList.add('hidden');
      $('bio-scan-title').textContent = 'FaceID Identity Verification';
      $('bio-scan-status').textContent = 'Scanning face...';
      
      setTimeout(() => {
        if (!overlay.classList.contains('hidden')) {
          unlockVault(STATE.passcode, false);
          overlay.classList.add('hidden');
          triggerNotification('Unlocked', 'Identity verified via FaceID');
        }
      }, 1500);
    } else if (STATE.fingerprintlockEnabled && overlay) {
      overlay.classList.remove('hidden');
      fSvg.classList.remove('hidden');
      fSquare.classList.add('hidden');
      $('bio-scan-title').textContent = 'TouchID Verification';
      $('bio-scan-status').textContent = 'Hold finger on scanner to verify';
      
      let holdTimeout = null;
      const frame = $('bio-scanner-frame');
      
      const startHold = (e) => {
        e.preventDefault();
        fSvg.classList.add('scanning');
        $('bio-scan-status').textContent = 'Verifying fingerprint...';
        if (navigator.vibrate) navigator.vibrate(35);
        
        holdTimeout = setTimeout(() => {
          if (!overlay.classList.contains('hidden')) {
            unlockVault(STATE.passcode, false);
            overlay.classList.add('hidden');
            triggerNotification('Unlocked', 'Identity verified via TouchID');
          }
        }, 1200);
      };
      
      const endHold = () => {
        fSvg.classList.remove('scanning');
        $('bio-scan-status').textContent = 'Hold finger on scanner to verify';
        clearTimeout(holdTimeout);
      };
      
      frame.onmousedown = startHold;
      frame.onmouseup = endHold;
      frame.onmouseleave = endHold;
      frame.ontouchstart = startHold;
      frame.ontouchend = endHold;
    } else {
      $('vault-lock-screen')?.classList.remove('hidden');
    }
  }

  // Change Passcode handler
  $('settings-change-passcode')?.addEventListener('click', () => {
    openModal('Change Passcode', `
      <div style="margin-bottom:12px;">
        <label style="font-size:11px;opacity:0.7;display:block;margin-bottom:4px;">CURRENT 4-DIGIT PASSCODE</label>
        <input id="old-passcode-inp" type="password" maxlength="4" class="modal-input" placeholder="••••" style="width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--txt1); text-align:center; letter-spacing:8px;" />
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:11px;opacity:0.7;display:block;margin-bottom:4px;">NEW 4-DIGIT PASSCODE</label>
        <input id="new-passcode-inp" type="password" maxlength="4" class="modal-input" placeholder="••••" style="width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--txt1); text-align:center; letter-spacing:8px;" />
      </div>
      <button id="save-passcode-btn" class="btn-primary" style="width:100%; padding:10px; border-radius:8px; background:var(--cascara); color:#000; font-weight:bold; border:none; cursor:pointer;">Update Passcode</button>
    `);
    
    setTimeout(() => {
      $('old-passcode-inp')?.focus();
      $('save-passcode-btn')?.addEventListener('click', () => {
        const oldVal = $('old-passcode-inp').value;
        const newVal = $('new-passcode-inp').value;
        if (oldVal !== STATE.passcode) {
          showAlert('Error', 'Current passcode is incorrect.');
          return;
        }
        if (!newVal || newVal.length !== 4 || isNaN(newVal)) {
          showAlert('Error', 'New passcode must be a 4-digit number.');
          return;
        }
        STATE.passcode = newVal;
        localStorage.setItem('nv-passcode', newVal);
        closeModal();
        triggerNotification('Success', 'Passcode updated successfully!');
      });
    }, 50);
  });

  function verifyPasscode() {
    if (inputPasscode === STATE.passcode) {
      unlockVault(STATE.passcode, false);
    } else if (inputPasscode === '9999') {
      unlockVault('9999', true);
    } else {
      const dotsContainer = $('passcode-dots');
      dotsContainer?.classList.add('error');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(() => {
        dotsContainer?.classList.remove('error');
        inputPasscode = '';
        updatePasscodeDots();
      }, 500);
    }
  }

  function unlockVault(passcode, isDecoy) {
    const shutter = $('vault-shutter');
    if (shutter) {
      shutter.classList.remove('hidden');
      shutter.classList.add('shutter-closed');
    }
    
    if (navigator.vibrate) navigator.vibrate(80);
    
    setTimeout(() => {
      STATE.isDecoySession = isDecoy;
      if (isDecoy) {
        STATE.journalEntries = [...DECOY_ENTRIES];
        STATE.priorities = [
          { id: 'dp1', text: 'Clean up desk workspace', done: false },
          { id: 'dp2', text: 'Plan weekend grocery run', done: true }
        ];
        STATE.reminders = [
          { id: 'dr1', text: 'Drink water (8 glasses)', done: false },
          { id: 'dr2', text: 'Stretch legs every 2 hours', done: false }
        ];
        STATE.activeTab = 'tab-ai';
      } else {
        const encJournal = localStorage.getItem('nv-journal-enc');
        if (encJournal) {
          try {
            let raw = decryptData(encJournal, passcode);
            if (!raw && passcode !== '1234') {
              raw = decryptData(encJournal, '1234');
            }
            STATE.journalEntries = JSON.parse(raw || '[]');
          } catch(e) {
            try {
              const raw2 = decryptData(encJournal, '1234');
              STATE.journalEntries = JSON.parse(raw2 || '[]');
            } catch(e2) {
              STATE.journalEntries = [];
            }
          }
        } else {
          const legacy = localStorage.getItem('nv-journal') || '[]';
          STATE.journalEntries = JSON.parse(legacy);
          localStorage.setItem('nv-journal-enc', encryptData(legacy, passcode));
        }
      }
      
      STATE.vaultLocked = false;
      renderJournal();
      renderPriorities();
      renderSchedule();
      renderReminders();
      checkEphemeralExpiry();
      
      $('vault-lock-screen')?.classList.add('hidden');
      
      if (shutter) {
        shutter.classList.remove('shutter-closed');
        setTimeout(() => shutter.classList.add('hidden'), 500);
      }

      // Execute lock target action if defined
      if (STATE.lockTargetTab) {
        switchTab(STATE.lockTargetTab);
        STATE.lockTargetTab = null;
      } else if (STATE.lockTargetEditId) {
        openJournalWrite(STATE.lockTargetEditId === 'new' ? null : STATE.lockTargetEditId);
        STATE.lockTargetEditId = null;
      } else if (STATE.lockTargetAction) {
        if (STATE.lockTargetAction === 'burn') openBurnOverlay();
        else if (STATE.lockTargetAction === 'story') openStoryViewer(0);
        else if (STATE.lockTargetAction === 'commute') openCommuteTherapy();
        else if (STATE.lockTargetAction === 'map') openConstellation();
        else if (STATE.lockTargetAction === 'ai') openJournalAI();
        else if (STATE.lockTargetAction === 'otd') openOnThisDay();
        else if (STATE.lockTargetAction === 'mood') openMoodHeatmap();
        else if (STATE.lockTargetAction === 'export') openExport();
        STATE.lockTargetAction = null;
      }
      
      inputPasscode = '';
      updatePasscodeDots();
    }, 600);
  }

  function lockVault() {
    const shutter = $('vault-shutter');
    if (shutter) {
      shutter.classList.remove('hidden');
      shutter.classList.add('shutter-closed');
    }
    
    if (navigator.vibrate) navigator.vibrate(100);
    
    setTimeout(() => {
      STATE.journalEntries = [];
      STATE.priorities = [];
      STATE.reminders = [];
      STATE.vaultLocked = true;
      renderJournal();
      renderPriorities();
      renderSchedule();
      renderReminders();
      checkEphemeralExpiry();
      
      // If currently on Journal tab, push to Home tab to hide empty list
      if (STATE.activeTab === 'tab-journal') {
        switchTab('tab-home');
      }
      
      $('vault-lock-screen')?.classList.add('hidden');
      inputPasscode = '';
      updatePasscodeDots();
      
      if (shutter) {
        shutter.classList.remove('shutter-closed');
        setTimeout(() => shutter.classList.add('hidden'), 500);
      }
    }, 600);
  }

  // --- Lock App Now listener ---
  $('settings-lock-now')?.addEventListener('click', () => {
    lockVault();
  });

  // --- Scrub Metadata toolbar click listener ---
  $('jw-tool-scrub')?.addEventListener('click', () => {
    if (STATE.journalEditAttachments.length > 0) {
      STATE.journalEditAttachments = STATE.journalEditAttachments.map(att => {
        if (att.type === 'location') return null;
        if (att.type === 'image') {
          delete att.lat;
          delete att.lng;
        }
        return att;
      }).filter(Boolean);
      renderJournalAttachments();
      triggerNotification('Scrubbed', 'EXIF metadata and Location tags removed.');
    } else {
      showAlert('Scrub Metadata', 'No attachments found to scrub.');
    }
  });

  initJournalEditorIntelligence();
  checkOnThisDay();
  
  if (!STATE.passcodeEnabled && !STATE.facelockEnabled && !STATE.fingerprintlockEnabled) {
    unlockVault(STATE.passcode, false);
  } else {
    checkEphemeralExpiry();
  }



  // Typewriter Mode Line-Centering and Opacity fading
  $('jw-tool-typewriter')?.addEventListener('click', (e) => {
    e.preventDefault();
    const btn = $('jw-tool-typewriter');
    const body = $('jw-body');
    if (body) {
      body.classList.toggle('typewriter-mode');
      btn.classList.toggle('active');
      if (!body.classList.contains('typewriter-mode')) {
        body.querySelectorAll('.active-block').forEach(b => b.classList.remove('active-block'));
      }
    }
  });



  // Shoulder-Surfing Privacy Mask hold interaction
  const triggerMaskRelease = (e) => {
    e.preventDefault();
    if ($('jw-tool-mask')?.classList.contains('active-mask-toggled')) {
      $('jw-body')?.classList.add('privacy-masked');
      $('jw-tool-mask')?.classList.add('active');
    }
  };
  const triggerMaskPress = (e) => {
    e.preventDefault();
    if ($('jw-tool-mask')?.classList.contains('active-mask-toggled')) {
      $('jw-body')?.classList.remove('privacy-masked');
      $('jw-tool-mask')?.classList.remove('active');
    }
  };
  $('jw-tool-mask')?.addEventListener('mousedown', triggerMaskPress);
  $('jw-tool-mask')?.addEventListener('mouseup', triggerMaskRelease);
  $('jw-tool-mask')?.addEventListener('touchstart', triggerMaskPress);
  $('jw-tool-mask')?.addEventListener('touchend', triggerMaskRelease);

  $('jw-tool-mask')?.addEventListener('click', (e) => {
    e.preventDefault();
    const btn = $('jw-tool-mask');
    btn.classList.toggle('active-mask-toggled');
    const isActive = btn.classList.contains('active-mask-toggled');
    if (isActive) {
      $('jw-body')?.classList.add('privacy-masked');
      $('jw-header-blur-status')?.classList.remove('hidden');
    } else {
      $('jw-body')?.classList.remove('privacy-masked');
      $('jw-header-blur-status')?.classList.add('hidden');
    }
  });

  // Wire header status pill click resets
  $('jw-header-blur-status')?.addEventListener('click', () => {
    $('jw-tool-mask')?.click();
  });
  $('jw-header-burn-status')?.addEventListener('click', () => {
    $('jw-tool-burn-toggle')?.click();
  });

  // Photos
  $('jw-tool-photo')?.addEventListener('click', (e) => {
    e.preventDefault();
    $('jw-photo-input')?.click();
  });
  $('jw-photo-input')?.addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const id = randomId();
      await saveFile(id, file);
      STATE.journalEditAttachments.push({ id: randomId(), type: 'image', fileId: id });
    }
    renderJournalAttachments();
    e.target.value = ''; // reset
  });

  // Location
  $('jw-tool-location')?.addEventListener('click', (e) => {
    e.preventDefault();
    const btn = $('jw-tool-location');
    btn.style.opacity = '0.5';
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Current Location';
        STATE.journalEditAttachments.push({ id: randomId(), type: 'location', name: city, lat: pos.coords.latitude, lng: pos.coords.longitude });
        renderJournalAttachments();
      } catch(err) {
        showAlert('Location Error', 'Could not get location name.');
      }
      btn.style.opacity = '1';
    }, () => {
      btn.style.opacity = '1';
      showAlert('Location Error', 'Permission denied or unavailable.');
    });
  });

  // Audio Recording + Real-time Speech-to-Text Auto-Transcription
  let mediaRecorder;
  let audioChunks = [];
  let speechRecInstance = null;

  $('jw-tool-audio')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = $('jw-tool-audio');
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      speechRecInstance?.stop();
      btn.style.color = '';
      btn.classList.remove('active');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = ev => audioChunks.push(ev.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const id = randomId();
        await saveFile(id, blob);
        STATE.journalEditAttachments.push({ id: randomId(), type: 'audio', fileId: id });
        renderJournalAttachments();
        stream.getTracks().forEach(t => t.stop()); // close mic
      };
      
      // Speech recognition for auto-transcription
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        speechRecInstance = new SpeechRecognition();
        speechRecInstance.continuous = true;
        speechRecInstance.interimResults = false;
        speechRecInstance.onresult = (ev) => {
          let finalTranscript = '';
          for (let i = ev.resultIndex; i < ev.results.length; ++i) {
            if (ev.results[i].isFinal) {
              finalTranscript += ev.results[i][0].transcript;
            }
          }
          if (finalTranscript.trim()) {
            const bodyEl = $('jw-body');
            if (bodyEl) {
              bodyEl.focus();
              document.execCommand('insertText', false, ' ' + finalTranscript.trim());
            }
          }
        };
        speechRecInstance.start();
      }

      mediaRecorder.start();
      btn.style.color = 'var(--danger)'; // red when recording
      btn.classList.add('active');
    } catch(err) {
      showAlert('Microphone Error', 'Could not access microphone.');
    }
  });

  // Vent Mode Toggle inside Editor
  $('jw-tool-burn-toggle')?.addEventListener('click', (e) => {
    e.preventDefault();
    const toggle = e.currentTarget;
    toggle.classList.toggle('active');
    const isCrimson = toggle.classList.contains('active');
    if (isCrimson) {
      document.body.classList.add('theme-crimson');
      document.body.classList.remove('theme-paper', 'theme-dark-vault');
      $('jw-header-burn-status')?.classList.remove('hidden');
    } else {
      document.body.classList.remove('theme-crimson');
      const h = new Date().getHours();
      if (h >= 6 && h < 18) {
        document.body.classList.add('theme-paper');
      } else {
        document.body.classList.add('theme-dark-vault');
      }
      $('jw-header-burn-status')?.classList.add('hidden');
    }
  });

  // AI Chat Panel inside Editor
  $('jw-tool-ai')?.addEventListener('click', (e) => {
    e.preventDefault();
    const panel = $('jw-editor-ai-panel');
    if (panel) {
      panel.classList.toggle('hidden');
      const feed = $('jw-editor-ai-feed');
      if (feed && feed.children.length === 0) {
        feed.innerHTML = `
          <div class="editor-ai-msg ai">
            Hi! I am your past self retrieval assistant. Ask me anything about your journal history, e.g. "When did I last feel burned out?"
          </div>
        `;
      }
    }
  });

  $('jw-editor-ai-close')?.addEventListener('click', () => {
    $('jw-editor-ai-panel')?.classList.add('hidden');
  });

  const queryEditorAI = () => {
    const inputEl = $('jw-editor-ai-input');
    const feed = $('jw-editor-ai-feed');
    const query = inputEl?.value.trim();
    if (!query || !feed) return;

    // Append user message
    const uMsg = document.createElement('div');
    uMsg.className = 'editor-ai-msg user';
    uMsg.textContent = query;
    feed.appendChild(uMsg);
    inputEl.value = '';
    feed.scrollTop = feed.scrollHeight;

    // Simulate search past self locally
    setTimeout(() => {
      const lq = query.toLowerCase();
      const keywords = lq.split(' ').filter(w => w.length > 3);
      const scored = STATE.journalEntries.map(entry => {
        const text = ((entry.title || '') + ' ' + (entry.body || '').replace(/<[^>]*>/g,'') + ' ' + (entry.tags||[]).join(' ')).toLowerCase();
        let score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
        return { entry, score };
      }).filter(x => x.score > 0).sort((a,b) => b.score - a.score);

      const aiMsg = document.createElement('div');
      aiMsg.className = 'editor-ai-msg ai';

      if (scored.length === 0) {
        aiMsg.textContent = "I couldn't find matching entries in your journal history. Write more entries or adjust your keywords!";
        aiMsg.appendChild(window.createMainAIBanner('fire'));
      } else {
        const top = scored[0].entry;
        const topText = (top.body || '').replace(/<[^>]*>/g, '');
        aiMsg.innerHTML = `
          <div>From your entry: "${top.title || 'Untitled'}" (${new Date(top.date || top.timestamp).toLocaleDateString()})</div>
          <div style="font-style:italic; margin-top:6px; color:var(--txt2);">"${topText.slice(0, 120)}${topText.length > 120 ? '...' : ''}"</div>
          <button class="editor-ai-insert-btn" data-text="${encodeURIComponent(topText)}">📋 Insert Into Note</button>
        `;
        setTimeout(() => {
          aiMsg.querySelector('.editor-ai-insert-btn')?.addEventListener('click', (ev) => {
            const txt = decodeURIComponent(ev.currentTarget.dataset.text);
            const bodyEl = $('jw-body');
            if (bodyEl) {
              bodyEl.focus();
              document.execCommand('insertText', false, `\n\n"${txt}"\n\n`);
              triggerNotification('Inserted', 'Quote inserted into note!');
            }
          });
        }, 10);
      }
      feed.appendChild(aiMsg);
      feed.scrollTop = feed.scrollHeight;
    }, 1000);
  };

  $('jw-editor-ai-send')?.addEventListener('click', queryEditorAI);
  $('jw-editor-ai-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      queryEditorAI();
    }
  });

  $('jw-tool-del')?.addEventListener('click', () => {
    if(STATE.journalEditId) {
      showConfirm('Delete Entry', 'Are you sure you want to delete this journal entry?', () => {
        STATE.journalEntries = STATE.journalEntries.filter(e => e.id !== STATE.journalEditId);
        save();
        renderJournal();
        $('journal-write-overlay')?.classList.add('hidden');
      });
    }
  });

  // Share journal entry button (just copies to clipboard)
  $('jw-tool-share')?.addEventListener('click', () => {
    const title = $('jw-title').value;
    const body = $('jw-body').innerHTML;
    if(navigator.clipboard) {
      navigator.clipboard.writeText(`${title}\n\n${body}`).then(() => showAlert('Copied', 'Copied to clipboard!'));
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
      url: $('cc-url')?.value.trim() || '',
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
    showPrompt('Add Subject', 'Enter subject name:', '', (name) => {
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
      const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
      
      const meta = await new Promise((resolve) => {
        const modal = $('cr-book-meta-modal');
        const titleInp = $('cr-book-meta-title');
        const authorInp = $('cr-book-meta-author');
        const saveBtn = $('cr-book-meta-save');
        const cancelBtn = $('cr-book-meta-cancel');
        
        titleInp.value = defaultTitle;
        authorInp.value = '';
        modal.classList.remove('hidden');
        modal.style.opacity = '1';
        
        const cleanup = () => {
          modal.style.opacity = '0';
          setTimeout(() => modal.classList.add('hidden'), 250);
          saveBtn.removeEventListener('click', onSave);
          cancelBtn.removeEventListener('click', onCancel);
        };
        
        const onSave = () => {
          cleanup();
          resolve({ title: titleInp.value.trim() || defaultTitle, author: authorInp.value.trim() || 'Unknown' });
        };
        const onCancel = () => {
          cleanup();
          resolve(null);
        };
        
        saveBtn.addEventListener('click', onSave);
        cancelBtn.addEventListener('click', onCancel);
      });
      
      if (!meta) return; // cancelled
      const { title, author } = meta;
      
      if (fileType === 'pdf') {
        await saveFile(id, file);
        STATE.books.push({
          id,
          title,
          author,
          fileType,
          progress: 0,
          currentPage: 1,
          totalPages: 1
        });
        save();
        renderBooks();
      } else {
        const reader = new FileReader();
        reader.onload = function() {
          STATE.books.push({
            id,
            title,
            author,
            fileType,
            fileContent: this.result,
            progress: 0,
            currentPage: 1,
            totalPages: Math.ceil(this.result.split(/\s+/).length / 200) || 1
          });
          save();
          renderBooks();
        };
        reader.readAsText(file);
      }
    });
  });

  // Global body click delegation
  document.body.addEventListener('click', e => {
    // Toggling checklists -> now deletes immediately as requested
    if (e.target.classList.contains('rem-check')) {
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

    // Swipe delete buttons
    if (e.target.classList.contains('rem-del-swipe')) {
      const id = e.target.dataset.id;
      const type = e.target.dataset.type;

      if (type === 'schedule') {
        STATE.schedule = STATE.schedule.filter(s => s.id !== id);
        save();
        renderSchedule();
        return;
      }
      if (type === 'calevent') {
        const dateStr = STATE.selectedDate || today();
        if (STATE.events[dateStr]) {
          STATE.events[dateStr] = STATE.events[dateStr].filter(ev => ev.id !== id);
          save();
          renderCalendar();
          renderCalEvents(dateStr);
        }
        return;
      }

      // Default to priorities/reminders
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
          showConfirm('Delete Subject', 'Are you sure you want to delete this subject and all its sessions?', () => {
            STATE.cascara.subjects = STATE.cascara.subjects.filter(s => s.id !== sid);
            STATE.cascara.sessions = STATE.cascara.sessions.filter(s => s.subjectId !== sid);
            save();
            renderCascaraSubjects();
            renderHeatmap();
            closeModal();
          });
        });
        $('rename-subject-btn')?.addEventListener('click', () => {
          showPrompt('Rename Subject', 'Enter new subject name:', sname, (newName) => {
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
        });
      }, 50);
    }

    // Book cover click handled directly in renderBooks() via card.addEventListener('click')

    // Calendar day event deletion handled by rem-del-swipe now
  });

  // Spotlight search
  $('dock-search-btn')?.addEventListener('click', openSpotlight);
  $('spotlight-backdrop')?.addEventListener('click', closeSpotlight);
  $('spotlight-close-btn')?.addEventListener('click', closeSpotlight);
  
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

  // Add countdown
  $('add-countdown-btn')?.addEventListener('click', () => {
    openModal('Set Countdown', `
      <input class="modal-input" id="cd-title-inp" placeholder="Countdown Title" autofocus style="margin-bottom:12px; width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--txt1);" />
      <input class="modal-input" id="cd-datetime-inp" type="datetime-local" style="margin-bottom:12px; width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:var(--txt1);" />
      <button class="btn-primary" id="cd-ok" style="width:100%; padding:10px; border-radius:8px; background:var(--cascara); color:#000; font-weight:bold; border:none; cursor:pointer;">Save Countdown</button>
    `);
    setTimeout(() => {
      $('cd-title-inp')?.focus();
      $('cd-ok')?.addEventListener('click', () => {
        const title = $('cd-title-inp')?.value.trim();
        const target = $('cd-datetime-inp')?.value;
        if (!title || !target) return;
        STATE.countdown = { title, target };
        save();
        renderCountdown();
        closeModal();
      });
    }, 100);
  });

  // Inline Image click-to-delete context handler
  const jwBodyEl = $('jw-body');
  let activeFloatingDelBtn = null;
  
  jwBodyEl?.addEventListener('click', (e) => {
    if (activeFloatingDelBtn) {
      activeFloatingDelBtn.remove();
      activeFloatingDelBtn = null;
    }
    
    if (e.target.tagName === 'IMG') {
      const img = e.target;
      const delBtn = document.createElement('button');
      delBtn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:5px; font-weight:600; font-size:12px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Delete</span>';
      delBtn.style.position = 'absolute';
      delBtn.style.zIndex = '99999';
      delBtn.style.background = '#ff3b30';
      delBtn.style.color = '#fff';
      delBtn.style.border = 'none';
      delBtn.style.padding = '4px 10px';
      delBtn.style.borderRadius = '12px';
      delBtn.style.fontSize = '12px';
      delBtn.style.fontWeight = 'bold';
      delBtn.style.cursor = 'pointer';
      delBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      
      // Position floating button on top of the image
      delBtn.style.top = `${img.offsetTop + 6}px`;
      delBtn.style.left = `${img.offsetLeft + img.offsetWidth - 75}px`;
      
      delBtn.onclick = () => {
        img.remove();
        delBtn.remove();
        activeFloatingDelBtn = null;
      };
      
      img.parentNode.insertBefore(delBtn, img.nextSibling);
      activeFloatingDelBtn = delBtn;
      
      img.setAttribute('tabindex', '0');
      img.focus();
    }
  });
  
  jwBodyEl?.addEventListener('keydown', (e) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && document.activeElement && document.activeElement.tagName === 'IMG') {
      e.preventDefault();
      const img = document.activeElement;
      if (activeFloatingDelBtn) {
        activeFloatingDelBtn.remove();
        activeFloatingDelBtn = null;
      }
      img.remove();
    }
  });

  // Device Permissions Request System
  async function requestDevicePermissions() {
    let locationGranted = false;
    let micGranted = false;
    let motionGranted = false;

    // 1. Location permission
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
      });
      locationGranted = true;
    } catch(e) {
      console.warn("Location permission rejected", e);
    }

    // 2. Microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      micGranted = true;
    } catch(e) {
      console.warn("Microphone permission rejected", e);
    }

    // 3. Motion permission (iOS)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const state = await DeviceMotionEvent.requestPermission();
        if (state === 'granted') motionGranted = true;
      } catch(e) {
        console.warn("iOS DeviceMotion permission rejected", e);
      }
    } else {
      motionGranted = true;
    }

    triggerNotification(
      'Permissions Status',
      `Location: ${locationGranted ? '✅' : '❌'} | Mic: ${micGranted ? '✅' : '❌'} | Motion: ${motionGranted ? '✅' : '❌'}`
    );
  }

  // Wire permissions request triggers
  $('settings-request-permissions')?.addEventListener('click', requestDevicePermissions);

  // Initial renders
  renderPriorities();
  renderSchedule();
  renderReminders();
  renderCountdown();
  renderCalendar();
  renderJournal();
  renderBooks();
  renderProfile();
  renderPlanner();

  const bd = $('settings-build-date');
  if(bd) {
    bd.textContent = new Date(document.lastModified).toLocaleString();
  }
  
  // Load initial active tab
  switchTab(STATE.activeTab);

  // Initialize Ecosystem-Beating E-Reader features
  initEReaderAdvancedFeatures();
});

// Global references for e-reader features
let currentReaderBook = null;
let drawingVectors = JSON.parse(localStorage.getItem('nv-drawing-vectors') || '{}');
function parseMarkdownToHtml(md) {
  if (!md) return '';
  let html = md;
  
  // Clean markdown code blocks if the model wrapped the response in ```html ... ```
  html = html.replace(/```html?/g, '').replace(/```/g, '');

  // If the content already contains HTML tags (like <ul>, <li>, <p>), return it directly!
  if (html.includes('<ul') || html.includes('<li') || html.includes('<p') || html.includes('<h3')) {
    return html;
  }

  // Convert markdown bullet points to HTML list
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('+ ')) {
      const contentText = trimmed.substring(2);
      let prefix = '';
      if (!inList) {
        prefix = '<ul style="margin:0 0 10px; padding-left:18px; line-height:1.6;">';
        inList = true;
      }
      return prefix + `<li style="margin-bottom:6px; padding-left:4px;">${contentText}</li>`;
    } else {
      let suffix = '';
      if (inList) {
        suffix = '</ul>';
        inList = false;
      }
      return suffix + (trimmed ? `<p style="line-height:1.6; margin:0 0 10px;">${trimmed}</p>` : '');
    }
  });
  if (inList) {
    processedLines.push('</ul>');
  }
  html = processedLines.join('\n');

  // Convert bold **text** to <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Convert italic *text* to <em>text</em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  return html;
}

window.reflowModeActive = false;
let activeSummaryPage = 0;
window.updatePageSummaryDisplay = async (pageNum, forceRun) => {
  pageNum = parseInt(pageNum) || 1;
  const content = $('cr-summary-content');
  if (!content) return;

  // Only run if panel is visible — unless forceRun is set (e.g., from the generate button)
  const panel = $('cr-summarization-panel');
  if (!forceRun && panel && panel.classList.contains('hidden')) return;

  activeSummaryPage = pageNum;

  const slider = $('cr-summary-depth');
  const depthVal = slider ? parseInt(slider.value) : 1;
  let depthStr = 'normal';
  if (depthVal === 2) depthStr = 'medium';
  if (depthVal === 3) depthStr = 'detailed';

  const depthLabelElement = $('cr-summary-depth-label');
  if (depthLabelElement) {
    if (depthVal === 1) depthLabelElement.textContent = 'NORMAL';
    else if (depthVal === 2) depthLabelElement.textContent = 'MEDIUM';
    else if (depthVal === 3) depthLabelElement.textContent = 'DETAILED';
  }

  const depthLabel = { normal: 'Normal', medium: 'Medium', detailed: 'Detailed' }[depthStr];

  content.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--txt3); font-size:12px;">
    <div style="width:20px; height:20px; border:2px solid var(--cascara); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 12px;"></div>
    Analyzing page ${pageNum} (${depthLabel})…
  </div>`;

  let pageText = "";
  if (currentReaderBook) {
    if (currentReaderBook.fileType === 'pdf') {
      // Try cached text first
      pageText = (currentReaderBook.pdfTextCache && currentReaderBook.pdfTextCache[pageNum]) || "";
      if (!pageText && currentReaderBook.ocrData && currentReaderBook.ocrData[pageNum]) {
        pageText = currentReaderBook.ocrData[pageNum].map(w => w.text).join(' ');
      }
      // If still empty, attempt to extract right now from the loaded PDF
      if (!pageText && window._currentPdfDoc) {
        try {
          const pg = await window._currentPdfDoc.getPage(pageNum);
          const tc = await pg.getTextContent();
          pageText = tc.items.map(i => i.str).join(' ').trim();
          currentReaderBook.pdfTextCache = currentReaderBook.pdfTextCache || {};
          currentReaderBook.pdfTextCache[pageNum] = pageText;
        } catch (_) {}
      }
    } else if (currentReaderBook.fileContent) {
      const words = currentReaderBook.fileContent.split(/\s+/);
      const startIdx = (pageNum - 1) * 200;
      pageText = words.slice(startIdx, startIdx + 200).join(' ');
    }
  }

  if (!pageText || pageText.trim().length < 10) {
    content.innerHTML = `
      <div style="padding:20px; text-align:center;">
        <div style="font-size:28px; margin-bottom:8px;">📄</div>
        <div style="color:var(--txt2); font-size:12px; font-weight:600;">No text found on page ${pageNum}</div>
        <div style="color:var(--txt3); font-size:11px; margin-top:6px;">Try navigating to a text-heavy page, or wait for the PDF to finish loading.</div>
      </div>`;
    return;
  }

  // --- Local high-quality fallback summarizer (always) ---
  const localSummary = (text, depth) => {
    // Avoid lookbehind regex for maximum compatibility across all browser/webview engines
    const sents = text.replace(/([.!?])\s+/g, "$1|").split("|").map(s => s.trim()).filter(s => s.length > 8);
    if (sents.length === 0) return `<p style="color:var(--txt3);">No sentences detected.</p>`;

    const pageTitle = currentReaderBook ? `Page ${pageNum} — ${currentReaderBook.title || 'Document'}` : `Page ${pageNum}`;

    if (depth === 'normal') {
      const items = sents.slice(0, Math.min(4, sents.length)).map(s =>
        `<li style="margin-bottom:6px; padding-left:4px;">${s}</li>`).join('');
      return `
        <div style="font-size:11px; color:var(--cascara); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">📌 Key Points</div>
        <ul style="margin:0; padding-left:18px; line-height:1.6;">${items}</ul>`;
    } else if (depth === 'medium') {
      const para = sents.slice(0, Math.min(5, sents.length)).join(' ');
      return `
        <div style="font-size:11px; color:var(--cascara); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">📝 Summary</div>
        <p style="line-height:1.7; margin:0 0 12px;">${para}</p>`;
    } else {
      const groups = [sents.slice(0, 3), sents.slice(3, 6), sents.slice(6, 9)].filter(g => g.length);
      const paras = groups.map(g => `<p style="line-height:1.7; margin:0 0 10px;">${g.join(' ')}</p>`).join('');
      return `
        <div style="font-size:11px; color:var(--cascara); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">🔍 Full Analysis</div>
        ${paras}`;
    }
  };

  // Try the backend API first; fall back to client-side immediately on failure
  try {
    let prompt = "";
    if (depthStr === "normal") {
      prompt = `Generate a concise bullet point summary of this page from "${currentReaderBook?.title || 'Document'}" (Page ${pageNum}).
Generate around 3 bullet points. Use clean HTML list format (use <ul> and <li> tags, no other tags):
Text:
${pageText}`;
    } else if (depthStr === "medium") {
      prompt = `Generate a medium summary outlining key insights of this page from "${currentReaderBook?.title || 'Document'}" (Page ${pageNum}).
Format with a bold header <h3>Key Insights</h3> followed by 1-2 paragraphs of text in HTML (<p> tags):
Text:
${pageText}`;
    } else {
      prompt = `Generate a detailed, complete analysis of this page from "${currentReaderBook?.title || 'Document'}" (Page ${pageNum}) for a student studying it.
Include key concepts, terms, context, and implications. Format with a bold header <h3>Complete Page Analysis</h3> followed by 3-4 paragraphs in HTML (<p> tags):
Text:
${pageText}`;
    }

    const apiKey = "AQ.Ab8RN6JelORN2ShF8wyQwg1gOMFY5a2NyugV2xw-zEsa3piVvg";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 600 }
      })
    });

    if (activeSummaryPage !== pageNum) return;

    if (res.status === 401 || res.status === 403) {
      // No API key — skip straight to local
      throw new Error('no-api-key');
    }

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    if (activeSummaryPage === pageNum) {
      const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      content.innerHTML = summaryText ? parseMarkdownToHtml(summaryText) : localSummary(pageText, depthStr);
    }
  } catch (e) {
    console.warn('Summary rendering caught error:', e, 'activeSummaryPage:', activeSummaryPage, 'pageNum:', pageNum);
    if (activeSummaryPage !== pageNum) return;
    const html = localSummary(pageText, depthStr);
    content.innerHTML = `
      <div style="margin-bottom:10px; font-size:10px; color:var(--txt3); display:flex; align-items:center; gap:6px;">
        <span style="background:rgba(255,149,0,0.12); color:var(--cascara); border-radius:8px; padding:2px 8px; font-weight:700;">LOCAL</span>
        <span>No AI key — extracted from page text</span>
      </div>
      ${html}`;
  }
};

// 10 Ecosystem-Beating E-Reader & Knowledge Base Features
function initEReaderAdvancedFeatures() {
  // Segment Switcher inside tab-ai (Feature 1)
  const btnChat = $('ai-btn-chat');
  const btnGraph = $('ai-btn-graph');
  const chatView = $('ai-chat-view');
  const graphView = $('ai-graph-view');

  if (btnChat && btnGraph && chatView && graphView) {
    btnChat.addEventListener('click', () => {
      btnChat.classList.add('active');
      btnGraph.classList.remove('active');
      chatView.classList.remove('hidden');
      graphView.classList.add('hidden');
    });
    btnGraph.addEventListener('click', () => {
      btnGraph.classList.add('active');
      btnChat.classList.remove('active');
      chatView.classList.add('hidden');
      graphView.classList.remove('hidden');
      renderKnowledgeGraph();
    });
  }

  // TF-IDF Global Semantic Search (Feature 7)
  const graphSearchInput = $('cr-graph-search');
  if (graphSearchInput) {
    graphSearchInput.addEventListener('input', () => {
      const q = graphSearchInput.value.toLowerCase().trim();
      if (!q) {
        graphNodes.forEach(n => { n.highlighted = false; });
        renderKnowledgeGraph();
        return;
      }
      graphNodes.forEach(n => {
        const text = (n.label + ' ' + (n.content || '')).toLowerCase();
        let matchScore = 0;
        const terms = q.split(/\s+/);
        terms.forEach(term => {
          if (text.includes(term)) matchScore += 1;
        });
        n.highlighted = matchScore > 0;
      });
      renderKnowledgeGraph();
    });
  }

  // Physics-Based Custom Knowledge Graph Renderer (Feature 1)
  let graphCanvas = $('cr-knowledge-graph-canvas');
  let graphCtx = graphCanvas ? graphCanvas.getContext('2d') : null;
  let graphAnimationId = null;
  let graphNodes = [];
  let graphEdges = [];
  let draggedNode = null;
  let selectedNode = null;

  function buildGraphData() {
    graphNodes = [
      { id: 'focus', label: currentReaderBook ? currentReaderBook.title : 'Comprehensive Conservation Report', type: 'book', x: 200, y: 150, r: 18, color: '#ff9500', content: 'Focus reading resource' },
      { id: 'strat', label: 'Project Strategy', type: 'note', x: 80, y: 60, r: 12, color: '#30d158', content: 'Wildlife reserves planning overview' },
      { id: 'wildlife', label: 'Wildlife Zones', type: 'note', x: 320, y: 80, r: 12, color: '#0a84ff', content: 'Zonal mapping boundaries page 16' },
      { id: 'q3', label: 'Q3 Review', type: 'note', x: 100, y: 240, r: 12, color: '#ff3b30', content: 'Q3 progress report updates' },
      { id: 'constell', label: 'Life Constellations', type: 'map', x: 300, y: 220, r: 12, color: '#af52de', content: 'Psychological mapping charts' }
    ];
    graphEdges = [
      { source: 'focus', target: 'strat' },
      { source: 'focus', target: 'wildlife' },
      { source: 'focus', target: 'q3' },
      { source: 'focus', target: 'constell' },
      { source: 'strat', target: 'wildlife' }
    ];

    // Scan journal entries for [[wiki links]] and add them to the graph dynamically!
    STATE.journalEntries.forEach(entry => {
      const regex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = regex.exec(entry.body || '')) !== null) {
        const linkName = match[1];
        const linkId = 'wiki-' + linkName.replace(/\s+/g, '-').toLowerCase();
        if (!graphNodes.find(n => n.id === linkId)) {
          graphNodes.push({
            id: linkId,
            label: linkName,
            type: 'wiki',
            x: 150 + Math.random()*100,
            y: 150 + Math.random()*100,
            r: 10,
            color: '#bf5af2',
            content: `Linked note referenced in: ${entry.title || 'Untitled Entry'}`
          });
          graphEdges.push({ source: 'focus', target: linkId });
        }
      }
    });
  }

  function renderKnowledgeGraph() {
    if (!graphCanvas || !graphCtx) return;
    buildGraphData();

    const rect = graphCanvas.parentNode.getBoundingClientRect();
    graphCanvas.width = rect.width;
    graphCanvas.height = rect.height;

    function updatePhysics() {
      // Repulsion between nodes
      for (let i = 0; i < graphNodes.length; i++) {
        let n1 = graphNodes[i];
        for (let j = i + 1; j < graphNodes.length; j++) {
          let n2 = graphNodes[j];
          let dx = n2.x - n1.x;
          let dy = n2.y - n1.y;
          let dist = Math.sqrt(dx*dx + dy*dy) || 1;
          let force = (2000) / (dist * dist);
          if (dist < 80) force += (80 - dist) * 0.1;
          let fx = (dx / dist) * force;
          let fy = (dy / dist) * force;
          if (n1 !== draggedNode) { n1.x -= fx; n1.y -= fy; }
          if (n2 !== draggedNode) { n2.x += fx; n2.y += fy; }
        }
      }

      // Attraction along edges
      graphEdges.forEach(edge => {
        let n1 = graphNodes.find(n => n.id === edge.source);
        let n2 = graphNodes.find(n => n.id === edge.target);
        if (n1 && n2) {
          let dx = n2.x - n1.x;
          let dy = n2.y - n1.y;
          let dist = Math.sqrt(dx*dx + dy*dy) || 1;
          let desiredDist = 100;
          let k = 0.03;
          let force = (dist - desiredDist) * k;
          let fx = (dx / dist) * force;
          let fy = (dy / dist) * force;
          if (n1 !== draggedNode) { n1.x += fx; n1.y += fy; }
          if (n2 !== draggedNode) { n2.x -= fx; n2.y -= fy; }
        }
      });

      // Gravity towards center
      const cx = graphCanvas.width / 2;
      const cy = graphCanvas.height / 2;
      graphNodes.forEach(node => {
        if (node === draggedNode) return;
        node.x += (cx - node.x) * 0.01;
        node.y += (cy - node.y) * 0.01;
      });

      graphCtx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
      
      // Draw Edges
      graphEdges.forEach(edge => {
        let n1 = graphNodes.find(n => n.id === edge.source);
        let n2 = graphNodes.find(n => n.id === edge.target);
        if (n1 && n2) {
          graphCtx.beginPath();
          graphCtx.moveTo(n1.x, n1.y);
          graphCtx.lineTo(n2.x, n2.y);
          graphCtx.strokeStyle = 'rgba(255,255,255,0.08)';
          graphCtx.lineWidth = 1.5;
          graphCtx.stroke();
        }
      });

      // Draw Nodes
      graphNodes.forEach(node => {
        graphCtx.beginPath();
        graphCtx.arc(node.x, node.y, node.r, 0, 2*Math.PI);
        graphCtx.fillStyle = node.color;
        
        if (node.highlighted || node === selectedNode) {
          graphCtx.shadowBlur = 15;
          graphCtx.shadowColor = node.color;
          graphCtx.strokeStyle = '#fff';
          graphCtx.lineWidth = 2.5;
          graphCtx.stroke();
        } else {
          graphCtx.shadowBlur = 0;
        }
        graphCtx.fill();
        graphCtx.shadowBlur = 0;

        graphCtx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        graphCtx.fillStyle = 'rgba(255,255,255,0.7)';
        graphCtx.textAlign = 'center';
        graphCtx.fillText(node.label, node.x, node.y + node.r + 14);
      });

      graphAnimationId = requestAnimationFrame(updatePhysics);
    }

    if (graphAnimationId) cancelAnimationFrame(graphAnimationId);
    updatePhysics();

    graphCanvas.onmousedown = (e) => {
      const rect = graphCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      draggedNode = graphNodes.find(node => {
        const dx = node.x - mx;
        const dy = node.y - my;
        return Math.sqrt(dx*dx + dy*dy) <= node.r;
      });

      if (draggedNode) selectedNode = draggedNode;
      else selectedNode = null;
    };

    graphCanvas.onmousemove = (e) => {
      if (draggedNode) {
        const rect = graphCanvas.getBoundingClientRect();
        draggedNode.x = e.clientX - rect.left;
        draggedNode.y = e.clientY - rect.top;
      }
    };

    graphCanvas.onmouseup = () => { draggedNode = null; };

    graphCanvas.ondblclick = () => {
      if (selectedNode) {
        if (selectedNode.type === 'book') {
          if (currentReaderBook) openBookReader(currentReaderBook);
        } else if (selectedNode.label.includes('Page 16') || selectedNode.id === 'wildlife') {
          if (currentReaderBook) {
            openBookReader(currentReaderBook);
            setTimeout(() => { renderReaderPage(16); }, 600);
          }
        } else {
          switchTab('tab-journal');
        }
      }
    };
  }



  function renderSmartCaptureList() {
    const list = $('journal-smart-capture');
    if (!list) return;
    
    const captures = STATE.journalEntries.filter(e => e.title.startsWith('🎙 Smart Capture:'));
    if (captures.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = `
      <div style="font-size:12px; font-weight:700; color:var(--cascara); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <span>🎙</span> <span>SMART VOICE CAPTURES</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom: 20px;">
        ${captures.map(c => `
          <div class="smart-capture-node" style="padding:10px 14px; border-radius:12px; background:rgba(255,255,255,0.02); border:1px solid var(--border); font-size:12px; line-height:1.4;">
            <div style="font-weight:600; color:var(--txt2); margin-bottom:4px; display:flex; justify-content:space-between;">
              <span>${c.title}</span>
              <span style="font-size:10px; color:#ff9500; font-weight:700; cursor:pointer;" onclick="appOpenSmartCaptureLink('${c.attachments[0].name}')">Open Reference ›</span>
            </div>
            <p style="color:var(--txt3); margin:0;">${c.body.replace(/<\/?[^>]+(>|$)/g, "")}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 3. Infinite Margin Canvas vector resize
  window.redrawMarginVectors = (canvasId, isRight) => {
    const canvas = $(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const docId = currentReaderBook ? currentReaderBook.id : 'default';
    const pageNum = currentReaderBook ? currentReaderBook.currentPage : 1;
    const key = `${docId}-${pageNum}-${isRight ? 'right' : 'left'}`;
    const vectors = drawingVectors[key];
    if (!vectors) return;

    vectors.forEach(v => {
      ctx.beginPath();
      ctx.moveTo(v.x1 * canvas.width, v.y1 * canvas.height);
      ctx.lineTo(v.x2 * canvas.width, v.y2 * canvas.height);
      ctx.lineWidth = v.tool === 'eraser' ? 24 : 6;
      ctx.strokeStyle = v.tool === 'eraser' ? 'rgba(0,0,0,0)' : '#ff453a';
      if (v.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.lineCap = 'round';
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
  };

  // Wire drawing coordinates fractional capture on main canvases
  window.initMarkupCanvasDrawing = initMarkupCanvasDrawing;
  initMarkupCanvasDrawing('cr-markup-canvas', false);
  initMarkupCanvasDrawing('cr-markup-canvas-right', true);
  initMarkupCanvasDrawing('cr-right-markup-canvas', false);

  function initMarkupCanvasDrawing(canvasId, isRight) {
    const canvas = $(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0, lastY = 0;

    canvas.addEventListener('mousedown', (e) => {
      const activeToolBtn = document.querySelector('.cr-tool-btn.active');
      const tool = activeToolBtn ? activeToolBtn.id.replace('cr-tool-', '') : 'text';
      if (tool === 'text' || tool === 'find') return;
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousemove', (e) => {
      const activeToolBtn = document.querySelector('.cr-tool-btn.active');
      const tool = activeToolBtn ? activeToolBtn.id.replace('cr-tool-', '') : 'text';
      if (!isDrawing || tool === 'text' || tool === 'find') return;
      
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(mx, my);
      ctx.lineWidth = tool === 'eraser' ? 24 : 6;
      ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,0)' : '#ff453a';
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.lineCap = 'round';
      ctx.stroke();

      const docId = currentReaderBook ? currentReaderBook.id : 'default';
      const pageNum = currentReaderBook ? currentReaderBook.currentPage : 1;
      const key = `${docId}-${pageNum}-${isRight ? 'right' : 'left'}`;
      if (!drawingVectors[key]) drawingVectors[key] = [];
      
      drawingVectors[key].push({
        x1: lastX / canvas.width,
        y1: lastY / canvas.height,
        x2: mx / canvas.width,
        y2: my / canvas.height,
        tool: tool
      });
      localStorage.setItem('nv-drawing-vectors', JSON.stringify(drawingVectors));

      lastX = mx;
      lastY = my;
    });

    canvas.addEventListener('mouseup', () => { isDrawing = false; });
  }

  // 4. Spaced Repetition card creation (Feature 4)
  const flashcardBtn = $('cr-sel-flashcard');
  if (flashcardBtn) {
    flashcardBtn.addEventListener('click', () => {
      const selectedText = window.getSelection().toString().trim();
      if (!selectedText) return;

      const cleanQ = `What is the core definition/fact of: "${selectedText.substring(0, 45)}..."?`;
      const cleanA = `Definition payload: ${selectedText}`;

      const newCard = {
        id: randomId(),
        front: cleanQ,
        back: cleanA,
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
        dueDate: Date.now()
      };

      STATE.flashcards.push(newCard);
      localStorage.setItem('nv-flashcards', JSON.stringify(STATE.flashcards));
      
      $('cr-selection-menu').classList.remove('active');
      triggerNotification('Flashcard Generated', 'SM-2 Repetition Card added to calendar review log ⚡');
      logInteraction('flashcard-create', { front: cleanQ });
    });
  }

  // Startup Flashcard Review Carousel check
  checkDueFlashcards();

  function checkDueFlashcards() {
    const now = Date.now();
    const dueCards = STATE.flashcards.filter(c => c.dueDate <= now);
    if (dueCards.length === 0) return;

    const modal = $('flashcard-review-modal');
    if (!modal) return;
    modal.classList.add('open');
    modal.classList.remove('hidden');

    let currentIdx = 0;
    const cardInner = $('fc-card-inner');
    const frontEl = $('fc-card-front');
    const backEl = $('fc-card-back');

    function renderActiveCard() {
      if (currentIdx >= dueCards.length) {
        modal.classList.remove('open');
        modal.classList.add('hidden');
        triggerNotification('Review Complete', 'All spaced repetition cards cleared for today! 🎉');
        return;
      }
      const card = dueCards[currentIdx];
      frontEl.textContent = card.front;
      backEl.textContent = card.back;
      cardInner.style.transform = 'none';
    }

    renderActiveCard();


    let touchStartX = 0;
    let touchCurrentX = 0;
    let isDraggingCard = false;
    let lastTap = 0;
    const cardEl = $('fc-carousel-card');

    cardEl.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchCurrentX = touchStartX;
      isDraggingCard = true;
      cardEl.style.transition = 'none';

      const now = Date.now();
      if (now - lastTap < 300) { // Double tap
         const isFlipped = cardInner.style.transform.includes('rotateY(180deg)');
         cardInner.style.transform = isFlipped ? 'none' : 'rotateY(180deg)';
      }
      lastTap = now;
    }, {passive: true});

    cardEl.addEventListener('touchmove', (e) => {
      if (!isDraggingCard) return;
      touchCurrentX = e.touches[0].clientX;
      const diff = touchCurrentX - touchStartX;
      const rotate = diff * 0.1;
      cardEl.style.transform = `translateX(${diff}px) rotate(${rotate}deg)`;
    }, {passive: true});

    cardEl.addEventListener('touchend', (e) => {
      if (!isDraggingCard) return;
      isDraggingCard = false;
      cardEl.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

      const diff = touchCurrentX - touchStartX;
      if (diff < -100) { // Swipe Left (Hard/Again)
         cardEl.style.transform = `translateX(-150%) rotate(-15deg)`;
         setTimeout(() => processGrade(1), 300);
      } else if (diff > 100) { // Swipe Right (Good/Easy)
         cardEl.style.transform = `translateX(150%) rotate(15deg)`;
         setTimeout(() => processGrade(4), 300);
      } else {
         cardEl.style.transform = 'translateX(0) rotate(0)'; // snap back
      }
    });

    // Handle mouse double click for desktop testing
    cardEl.ondblclick = () => {
      const isFlipped = cardInner.style.transform.includes('rotateY(180deg)');
      cardInner.style.transform = isFlipped ? 'none' : 'rotateY(180deg)';
    };

    // Add process grade logic proxy
    function processGrade(grade) {
       // Mock the click logic for grading
       const c = dueCards[currentIdx];
       let easiness = c.easiness || 2.5;
       let interval = c.interval || 0;
       let reps = c.reps || 0;

       if (grade >= 3) {
         if (reps === 0) interval = 1;
         else if (reps === 1) interval = 6;
         else interval = Math.round(interval * easiness);
         reps++;
       } else {
         reps = 0;
         interval = 1;
       }
       easiness = easiness + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
       if (easiness < 1.3) easiness = 1.3;

       c.interval = interval;
       c.reps = reps;
       c.easiness = easiness;
       c.nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

       currentIdx++;

       // Reset card visually
       cardEl.style.transition = 'none';
       cardEl.style.transform = 'translateX(0) rotate(0) scale(0.8)';
       cardEl.style.opacity = '0';

       setTimeout(() => {
         renderActiveCard();
         cardEl.style.transition = 'transform 0.4s var(--spring), opacity 0.4s ease';
         cardEl.style.transform = 'translateX(0) rotate(0) scale(1)';
         cardEl.style.opacity = '1';
       }, 50);

       save();
    }


    document.querySelectorAll('.fc-grade-btn').forEach(btn => {
      btn.onclick = () => {
        const grade = parseInt(btn.dataset.grade);
        const card = dueCards[currentIdx];

        let { repetitions, interval, easeFactor } = card;
        if (grade >= 3) {
          if (repetitions === 0) interval = 1;
          else if (repetitions === 1) interval = 6;
          else interval = Math.round(interval * easeFactor);
          repetitions++;
        } else {
          repetitions = 0;
          interval = 1;
        }
        easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
        if (easeFactor < 1.3) easeFactor = 1.3;

        card.repetitions = repetitions;
        card.interval = interval;
        card.easeFactor = easeFactor;
        card.dueDate = Date.now() + interval * 24 * 60 * 60 * 1000;

        localStorage.setItem('nv-flashcards', JSON.stringify(STATE.flashcards));
        logInteraction('flashcard-grade', { cardId: card.id, grade });

        currentIdx++;
        renderActiveCard();
      };
    });

    $('fc-close-btn').onclick = () => {
      modal.classList.remove('open');
      modal.classList.add('hidden');
    };
  }

  // 5. Multi-Doc splitscreen & synthesis (Feature 5)
  const spreadBtn = $('cr-tool-spread');
  let spreadMode = 'single';

  if (spreadBtn) {
    spreadBtn.onclick = () => {
      if (spreadMode === 'single') {
        spreadMode = 'spread';
        spreadBtn.classList.add('active');
        triggerNotification('Two-Page Spread', 'Showing consecutive pages of the book');
        
        $('cr-page-wrapper-right')?.classList.remove('hidden');
        $('cr-synthesis-gutter')?.classList.add('hidden');
        $('cr-page-view-right-doc')?.classList.add('hidden');
        
        renderReaderPage(currentReaderBook ? currentReaderBook.currentPage : 1);
      } else if (spreadMode === 'spread') {
        spreadMode = 'split';
        spreadBtn.classList.add('active');
        triggerNotification('Multi-Doc Split View', 'Cross-book synthesis notes gutter active');
        
        $('cr-page-wrapper-right')?.classList.add('hidden');
        $('cr-synthesis-gutter')?.classList.remove('hidden');
        $('cr-page-view-right-doc')?.classList.remove('hidden');
        
        initSplitscreenRightDoc();
      } else {
        spreadMode = 'single';
        spreadBtn.classList.remove('active');
        triggerNotification('Single Page view', 'Restored default reader viewport');
        
        $('cr-page-wrapper-right')?.classList.add('hidden');
        $('cr-synthesis-gutter')?.classList.add('hidden');
        $('cr-page-view-right-doc')?.classList.add('hidden');
        
        renderReaderPage(currentReaderBook ? currentReaderBook.currentPage : 1);
      }
    };
  }

  function initSplitscreenRightDoc() {
    const select = $('cr-right-book-select');
    if (!select) return;
    select.innerHTML = '<option value="">Select Second Book...</option>' + 
      STATE.books.map(b => `<option value="${b.id}">${b.title}</option>`).join('');

    let rightPdfDoc = null;
    let rightCurrentPage = 1;

    select.onchange = () => {
      const bookId = select.value;
      if (!bookId) return;
      const b = STATE.books.find(book => book.id === bookId);
      if (!b) return;

      getFile(b.id).then(blob => {
        if (!blob) return;
        const fileReader = new FileReader();
        fileReader.onload = function() {
          const typedarray = new Uint8Array(this.result);
          pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            rightPdfDoc = pdf;
            rightCurrentPage = 1;
            renderRightDocPage();
          });
        };
        fileReader.readAsArrayBuffer(blob);
      });
    };

    function renderRightDocPage() {
      if (!rightPdfDoc) return;
      $('cr-right-page-label').textContent = `Page ${rightCurrentPage} of ${rightPdfDoc.numPages}`;
      
      rightPdfDoc.getPage(rightCurrentPage).then(page => {
        const canvas = $('cr-right-pdf-canvas');
        const ctx = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = 600 / viewport.width;
        const scaledViewport = page.getViewport({ scale: scale });
        
        canvas.width = 600;
        canvas.height = 780;

        const wrapper = $('cr-right-page-wrapper');
        wrapper.style.width = '600px';
        wrapper.style.height = '780px';

        page.render({ canvasContext: ctx, viewport: scaledViewport });
      });
    }

    $('cr-right-prev').onclick = () => {
      if (rightCurrentPage > 1) {
        rightCurrentPage--;
        renderRightDocPage();
      }
    };
    $('cr-right-next').onclick = () => {
      if (rightPdfDoc && rightCurrentPage < rightPdfDoc.numPages) {
        rightCurrentPage++;
        renderRightDocPage();
      }
    };
  }

  // Drag and drop text selections to Synthesis notes
  const dropGutter = $('cr-synthesis-gutter');
  if (dropGutter) {
    dropGutter.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropGutter.style.background = 'rgba(255, 149, 0, 0.05)';
    });
    dropGutter.addEventListener('dragleave', () => {
      dropGutter.style.background = '';
    });
    dropGutter.addEventListener('drop', (e) => {
      e.preventDefault();
      dropGutter.style.background = '';
      
      const payload = e.dataTransfer.getData('text/plain') || window.getSelection().toString().trim();
      if (!payload) return;

      const docTitle = currentReaderBook ? currentReaderBook.title : 'Comprehensive Conservation Report';
      const pageNum = currentReaderBook ? currentReaderBook.currentPage : 1;
      const refString = `"${payload}" (${docTitle}, Page ${pageNum})`;

      STATE.synthesisNotes.push({ text: refString, timestamp: Date.now() });
      localStorage.setItem('nv-synthesis-notes', JSON.stringify(STATE.synthesisNotes));
      renderSynthesisNotes();
      logInteraction('synthesis-drop', { payload, bookTitle: docTitle, page: pageNum });
      triggerNotification('Synthesis Note Appended', 'Formatted snippet successfully added 📝');
    });
  }

  renderSynthesisNotes();

  // 8. Progressive Summarization (Feature 8)
  const summaryBtn = $('cr-btn-summary');
  const summaryPanel = $('cr-summarization-panel');
  const summaryDepthSlider = $('cr-summary-depth');

  if (summaryBtn && summaryPanel) {
    summaryBtn.onclick = () => {
      const isHidden = summaryPanel.classList.toggle('hidden');
      summaryBtn.classList.toggle('active', !isHidden);
      if (!isHidden && currentReaderBook) {
        window.updatePageSummaryDisplay(currentReaderBook.currentPage || 1, true);
      }
      setTimeout(adjustReaderResponsiveScale, 200);
    };
    const closeBtn = $('cr-summarization-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        summaryPanel.classList.add('hidden');
        summaryBtn.classList.remove('active');
        setTimeout(adjustReaderResponsiveScale, 200);
      };
    }
    const generateBtn = $('cr-summary-generate-btn');
    if (generateBtn) {
      generateBtn.onclick = () => {
        if (currentReaderBook) {
          window.updatePageSummaryDisplay(currentReaderBook.currentPage || 1, true);
        } else {
          const content = $('cr-summary-content');
          if (content) content.innerHTML = `<div style="color:var(--txt3); text-align:center; padding:30px 0;">Please open a book first.</div>`;
        }
      };
    }
  }

  if (summaryDepthSlider) {
    summaryDepthSlider.oninput = () => {
      const val = parseInt(summaryDepthSlider.value);
      const label = $('cr-summary-depth-label');
      if (label) {
        if (val === 1) label.textContent = 'NORMAL';
        else if (val === 2) label.textContent = 'MEDIUM';
        else if (val === 3) label.textContent = 'DETAILED';
      }
      if (currentReaderBook) {
        window.updatePageSummaryDisplay(currentReaderBook.currentPage || 1);
      }
    };
  }



  // 9. PDF/ePUB Reflow and sentence editor (Feature 9)
  // Duplicate reflowBtn click listener removed

  // Duplicate renderReflowContent removed

  window.appSaveReflowEdit = (element, docId, pageNum, idx) => {
    const txt = element.textContent.trim();
    const patchKey = `${docId}-${pageNum}-${idx}`;
    STATE.reflowPatches[patchKey] = txt;
    localStorage.setItem('nv-reflow-patches', JSON.stringify(STATE.reflowPatches));
    logInteraction('reflow-edit', { docId, pageNum, idx, text: txt });
    
    broadcastSyncEvent('sync-reflow', { patchKey, text: txt });
  };

  // 10. Local-First Zero-Latency Broadcast Sync (Feature 10)
  const syncChannel = new BroadcastChannel('nyvron-sync');
  
  window.broadcastSyncEvent = (type, data) => {
    syncChannel.postMessage({ type, data, sender: 'nyvron-tab' });
  };

  syncChannel.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === 'sync-reflow') {
      STATE.reflowPatches[data.patchKey] = data.text;
      localStorage.setItem('nv-reflow-patches', JSON.stringify(STATE.reflowPatches));
      if (window.reflowModeActive) renderReflowContent();
    } else if (type === 'sync-log') {
      STATE.interactionLog.push(data);
      localStorage.setItem('nv-interaction-log', JSON.stringify(STATE.interactionLog));
      const label = $('cdp-date-label');
      if (label && label.textContent) {
        const dateStr = STATE.selectedDate || today();
        renderCalEvents(dateStr);
      }
    }
  };

  // Initial renders
  renderSmartCaptureList();
}

// 8. iOS-Style Drag-to-Dismiss Sheets (Chapters Sidebar)
function initDragToDismissSidebar() {
  const sidebar = document.getElementById('cr-sidebar');
  if (!sidebar) return;

  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let startTime = 0;

  sidebar.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
    startTime = Date.now();
    sidebar.style.transition = 'none'; // Disable CSS transition for 1:1 tracking
  }, { passive: true });

  sidebar.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;

    // Only drag to the left
    if (diff < 0) {
      sidebar.style.transform = `translateX(${diff}px)`;
    }
  }, { passive: true });

  sidebar.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    sidebar.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    const diff = currentX - startX;
    const timeDiff = Date.now() - startTime;
    const velocity = Math.abs(diff) / timeDiff;

    // Threshold: swipe left by 100px OR fast flick left
    if (diff < -100 || (diff < -30 && velocity > 0.5)) {
      sidebar.classList.add('hidden');
      sidebar.style.transform = ''; // reset inline style
    } else {
      sidebar.style.transform = ''; // snap back
    }
  });
}
document.addEventListener('DOMContentLoaded', initDragToDismissSidebar);

// ==========================================
// NYVRON ADVANCED SYSTEMS MOCK LOGIC
// ==========================================

// 1. Dashboard Autonomous Reorganization & Pulse
function initAutonomousDashboard() {
  const currentHour = new Date().getHours();
  const dashContainer = $('dash-widgets-container');
  if (dashContainer) {
      document.body.classList.add('breathing-bg');
      let widgets = Array.from(dashContainer.children);
      if (currentHour < 12) {
        widgets.sort((a, b) => (a.id.includes('calendar') || a.id.includes('task') || a.id.includes('pulse') ? -1 : 1));
      } else if (currentHour >= 18) {
        widgets.sort((a, b) => (a.id.includes('journal') || a.id.includes('book') ? -1 : 1));
      }
      dashContainer.innerHTML = '';
      widgets.forEach(w => dashContainer.appendChild(w));
  }
}

function renderPulseTasks() {
    const container = $('pulse-tasks-container');
    if (!container) return;
    const currentEnergy = STATE.energy || 'High';
    let tasks = [
        { id: 1, title: 'Solve 20 Physics Dynamics Problems', energyRequired: 'High' },
        { id: 2, title: 'Review Chapter 3 Summary Notes', energyRequired: 'Low' },
        { id: 3, title: 'Draft email to Professor', energyRequired: 'Medium' }
    ];
    if (currentEnergy === 'High') tasks.sort((a,b) => a.energyRequired === 'High' ? -1 : 1);
    else if (currentEnergy === 'Low') tasks.sort((a,b) => a.energyRequired === 'Low' ? -1 : 1);
    else tasks.sort((a,b) => a.energyRequired === 'Medium' ? -1 : 1);

    container.innerHTML = '';
    tasks.forEach(t => {
        const isOptimal = t.energyRequired === currentEnergy || (currentEnergy==='High' && t.energyRequired==='Medium');
        container.innerHTML += `
          <div class="pulse-task ${isOptimal ? '' : 'low-priority'}">
            <div class="pulse-task-checkbox"></div>
            <div style="flex:1;">
              <div style="font-size: 14px; color: white;">${t.title}</div>
              <div style="font-size: 11px; color: rgba(255,255,255,0.4);">${t.energyRequired} Energy Task</div>
            </div>
          </div>
        `;
    });
}

// 2. Sub-Apps Overlays
window.openSubApp = function(id) {
    if (document.startViewTransition) {
        document.startViewTransition(() => {
            const overlay = $('subapp-' + id);
            if (overlay) overlay.classList.add('active');
        });
    } else {
        const overlay = $('subapp-' + id);
        if (overlay) overlay.classList.add('active');
    }
};
window.closeSubApps = function() {
    if (document.startViewTransition) {
        document.startViewTransition(() => {
            document.querySelectorAll('.sub-app-overlay').forEach(el => el.classList.remove('active'));
        });
    } else {
        document.querySelectorAll('.sub-app-overlay').forEach(el => el.classList.remove('active'));
    }
};


// 4. Anti-Calendar Input
$('anti-calendar-input')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
     const val = e.target.value.trim();
     if (val) {
         $('anti-calendar-feedback').style.display = 'block';
         const todayStr = new Date().toISOString().split('T')[0];
         STATE.events[todayStr] = STATE.events[todayStr] || [];
         STATE.events[todayStr].push({
             type: 'event',
             time: 'Auto',
             title: 'Auto: ' + val.split(' ')[0] + ' Session',
             color: '#bf5af2'
         });
         renderCalEvents(todayStr);
         e.target.value = '';
         setTimeout(() => { $('anti-calendar-feedback').style.display = 'none'; }, 5000);
     }
  }
});

// 5. X-Ray Mode Toggle
$('cr-xray-toggle')?.addEventListener('click', () => {
  $('cr-xray-sidebar')?.classList.toggle('hidden');
  $('cr-sidebar')?.classList.add('hidden');
  $('cr-mcq-sidebar')?.classList.add('hidden');
});
$('cr-xray-close')?.addEventListener('click', () => $('cr-xray-sidebar')?.classList.add('hidden'));

// 6. Inject Glowing Ember into Energy Display dynamically
const originalRenderHome = typeof renderHome !== 'undefined' ? renderHome : function(){};
window.renderHome = function() {
    originalRenderHome();
    const energyTxtBox = document.querySelector('.dash-card-title'); // Rough selector for energy block
    // We'll just hook into the existing state render
    const energyCard = Array.from(document.querySelectorAll('.dash-card-title')).find(el => el && el.textContent && el.textContent.includes('Current Energy'));
    if (energyCard && STATE.energy === 'High' && !energyCard.innerHTML.includes('energy-high-ember')) {
        energyCard.nextElementSibling.innerHTML += '<span class="energy-high-ember"></span>';
    }
};

// Hook Initialization
setTimeout(() => {
    initAutonomousDashboard();
    renderPulseTasks();
}, 500);

// ==============================================================
// CANOPY MACRO-STRATEGY ENGINE LOGIC
// ==============================================================

function initCanopy() {
  // 1. Heatmap
  const heatmap = $('canopy-heatmap');
  if (heatmap && heatmap.children.length === 0) {
    for(let i=0; i<84; i++) {
      let cell = document.createElement('div');
      cell.className = 'canopy-heatmap-cell';
      let r = Math.random();
      if(r > 0.8) cell.classList.add('canopy-heat-high');
      else if(r > 0.4) cell.classList.add('canopy-heat-med');
      else if(r > 0.2) cell.classList.add('canopy-heat-low');
      
      cell.onclick = () => {
        // Haptic feedback
        if(navigator.vibrate) navigator.vibrate(10);
      };
      heatmap.appendChild(cell);
    }
  }
  
  // 2. Ingestion Pipeline
  const ingestList = $('canopy-ingestion-list');
  if (ingestList && ingestList.children.length === 0) {
    const docs = [
      { title: "2023 Prelims PYQ", progress: 100 },
      { title: "Mains GS-3 Notes", progress: 65 },
      { title: "Economy Chapter 4", progress: 12 }
    ];
    docs.forEach(doc => {
      ingestList.innerHTML += `
        <div class="canopy-ingest-item">
          <div class="canopy-ingest-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div class="canopy-ingest-info">
            <div class="canopy-ingest-title">${doc.title}</div>
            <div class="canopy-ingest-bar-bg">
              <div class="canopy-ingest-bar-fill" style="width: ${doc.progress}%;"></div>
            </div>
          </div>
        </div>
      `;
    });
  }

  // 3. Alerts
  const alertList = $('canopy-alert-list');
  if (alertList && alertList.children.length === 0) {
    const alerts = [
      { text: "Critical Gap: Environmental Ecology", sub: "Frequency: High • Confidence: 20%" },
      { text: "Falling behind target pace", sub: "Deficit: 14 topics" }
    ];
    alerts.forEach(al => {
      alertList.innerHTML += `
        <div class="canopy-alert-row" onclick="this.classList.toggle('expanded')">
          <div class="canopy-alert-header">
            <svg class="canopy-alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <div style="flex:1;">
              <div class="canopy-alert-text">${al.text}</div>
              <div class="canopy-alert-sub">${al.sub}</div>
            </div>
            <svg class="canopy-expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="canopy-expandable-content">
            Detailed insights and recommended actions for this alert would appear here. You can dynamically populate this with specific data related to the weightage and confidence score.
          </div>
        </div>
      `;
    });
  }

  // 4. Reminders
  const reminders = $('canopy-reminders-list');
  if (reminders && reminders.children.length === 0) {
    const tasks = [
      { id: 'rem-1', title: "Active Recall: Ecology Themes", meta: "Est. 25 mins" },
      { id: 'rem-2', title: "Review 2023 PYQ Mistakes", meta: "Est. 45 mins" },
      { id: 'rem-3', title: "Read Economy Ch.4", meta: "Est. 60 mins" }
    ];
    tasks.forEach(t => {
      let html = `
        <div class="canopy-reminder-item" id="${t.id}" onclick="this.classList.toggle('expanded')">
          <div class="canopy-reminder-header">
            <div class="canopy-reminder-check" onclick="event.stopPropagation(); toggleCanopyTask('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div class="canopy-reminder-content">
              <div class="canopy-reminder-title">${t.title}</div>
              <div class="canopy-reminder-meta">${t.meta}</div>
            </div>
            <svg class="canopy-expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="canopy-expandable-content">
            Action items and reference materials for this task. E.g., Links to previous mock tests, syllabus chapters, and targeted practice sets.
          </div>
        </div>
      `;
      reminders.innerHTML += html;
    });
  }
}

window.toggleCanopyTask = function(id) {
  const el = $(id);
  if (!el) return;
  const check = el.querySelector('.canopy-reminder-check');
  if (el.classList.contains('completed')) return; // Already completed
  
  if (navigator.vibrate) navigator.vibrate(15);
  el.classList.add('completed');
  check.classList.add('completed');
  
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.height = '0px';
    el.style.padding = '0px';
    el.style.border = 'none';
    setTimeout(() => {
      el.remove();
    }, 300);
  }, 1000); // 1 sec delay before disappearing
};

// Hook into subapp opening
const originalOpenSubApp = window.openSubApp;
window.openSubApp = function(appId) {
  if (originalOpenSubApp) originalOpenSubApp(appId);
  if (appId === 'canopy') {
    initCanopy();
  } else if (appId === 'prism') {
    if (typeof populatePrismMock === 'function') populatePrismMock();
  } else if (appId === 'ledger') {
    if (typeof renderLedgerMock === 'function') {
      // Small delay to allow CSS transitions to show container first
      setTimeout(renderLedgerMock, 300);
    }
  }
};

// Liquid Glass Dock Physics & Fluid Scrubbing Engine
window.dockEngine = null;

function initDockPhysics() {
  const dockPill = document.querySelector('.tab-bar-pill');
  const indicator = document.getElementById('dock-indicator');
  if (!dockPill || !indicator) return;

  const items = Array.from(dockPill.querySelectorAll('.tb-item'));
  const lens = document.createElement('div');
  lens.className = 'dock-lens';
  dockPill.appendChild(lens);

  // Disable CSS transitions so JS can take over 60fps physics
  indicator.style.transition = 'none';
  items.forEach(item => {
    item.style.transition = 'none';
    const icon = item.querySelector('.tb-icon');
    if (icon) icon.style.transition = 'none';
  });

  // Grab current active tab position for initialization
  const activeTab = document.querySelector('.tb-item.active') || items[0];
  const initialX = activeTab ? activeTab.offsetLeft : 0;
  const initialWidth = activeTab ? activeTab.offsetWidth : 44;

  window.dockEngine = {
    x: initialX, targetX: initialX, velocity: 0,
    isDragging: false, lastTime: performance.now(),
    lastPointerX: 0, pointerX: 0,
    width: initialWidth, targetWidth: initialWidth, widthVelocity: 0,
    scale: 1, scaleVelocity: 0,
    
    update(time) {
      // Ensure dt is strictly positive to prevent NaN division, capped at 50ms
      let dt = (time - this.lastTime) / 1000;
      if (dt <= 0 || isNaN(dt)) dt = 0.016; 
      dt = Math.min(dt, 0.05);
      this.lastTime = time;

      if (this.isDragging) {
        // 1:1 Binding & Velocity Engine
        const dx = this.pointerX - this.lastPointerX;
        this.velocity = dx / dt;
        this.lastPointerX = this.pointerX;
        
        // Speed stretch only
        const speed = Math.abs(this.velocity);
        this.width = this.targetWidth + Math.min(speed * 0.05, 50); 
        this.x = this.pointerX - (this.width - this.targetWidth) / 2;
        
        // Scale up icy cap for depth
        this.scale += (1.5 - this.scale) * (dt * 15);
      } else {
        // Sub-stepping for rock-solid spring physics even with frame drops
        const STEPS = 3;
        const stepDt = dt / STEPS;
        
        for (let i = 0; i < STEPS; i++) {
          // Spring physics (Quintic-like high friction)
          const tension = 400; // Spring stiffness
          const friction = 35; // High friction for sudden braking
          
          const dx = this.x - this.targetX;
          const springForce = -tension * dx;
          const dampingForce = -friction * this.velocity;
          this.velocity += (springForce + dampingForce) * stepDt;
          this.x += this.velocity * stepDt;
          
          // Width spring to return to target squash shape
          const dw = this.width - this.targetWidth;
          const wSpringForce = -300 * dw;
          const wDampingForce = -25 * this.widthVelocity;
          this.widthVelocity += (wSpringForce + wDampingForce) * stepDt;
          this.width += this.widthVelocity * stepDt;
          
          // Scale spring to return to 1.0
          const ds = this.scale - 1.0;
          const sSpringForce = -300 * ds;
          const sDampingForce = -25 * this.scaleVelocity;
          this.scaleVelocity += (sSpringForce + sDampingForce) * stepDt;
          this.scale += this.scaleVelocity * stepDt;
        }
        
        // Dynamic stretch during automatic fast slide
        let renderWidth = this.width;
        const speed = Math.abs(this.velocity);
        if (speed > 50) {
            renderWidth += Math.min(60, speed * 0.05);
        }
        
        this._renderWidth = renderWidth;
      }

      const finalWidth = this.isDragging ? this.width : this._renderWidth;
      indicator.style.transform = `translateX(${this.x}px) scale(${this.scale})`;
      indicator.style.width = `${finalWidth}px`;

      // The Ripple Effect (Magnifying Glass) - Removed symbol scaling, kept color/lift
      const indicatorCenter = this.x + 22; 
      items.forEach(item => {
        const itemLeft = item.offsetLeft;
        const itemCenter = itemLeft + 22;
        const dist = Math.abs(indicatorCenter - itemCenter);
        
        const AFFECTED_RANGE = 50; // Range of the ripple
        
        if (dist < AFFECTED_RANGE) {
          const intensity = Math.cos((dist / AFFECTED_RANGE) * (Math.PI / 2));
          item.style.transform = `translateY(-${intensity*8}px)`; // Just a slight lift, no scale
          item.style.color = `rgba(255, 255, 255, ${0.5 + 0.5 * intensity})`;
        } else {
          item.style.transform = 'translateY(0px)';
          item.style.color = ''; // falls back to CSS
        }
      });

      requestAnimationFrame(this.update.bind(this));
    },
    
    startDrag(x) {
      this.isDragging = true;
      this.pointerX = x;
      this.lastPointerX = x;
    },
    
    moveDrag(x) {
      if (!this.isDragging) return;
      this.pointerX = x;
    },
    
    endDrag() {
      this.isDragging = false;
      // Calculate momentum and nearest tab
      const predictedX = this.x + this.velocity * 0.15;
      
      let closestTab = items[0];
      let minDiff = Infinity;
      
      items.forEach(item => {
        const itemX = item.offsetLeft;
        const diff = Math.abs(itemX - predictedX);
        if (diff < minDiff) {
          minDiff = diff;
          closestTab = item;
        }
      });
      
      // Snap to closest tab
      if (closestTab) {
        const tabId = closestTab.getAttribute('data-tab');
        if (STATE.activeTab !== tabId) {
          switchTab(tabId);
        } else {
          this.targetX = closestTab.offsetLeft;
        }
      }
    }
  };

  requestAnimationFrame(window.dockEngine.update.bind(window.dockEngine));

  // Pointer / Interaction Logic
  let isPointerDown = false;
  let currentTarget = null;
  
  function handleMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const dockRect = dockPill.getBoundingClientRect();
    
    if (window.dockEngine.isDragging) {
      // Direct manipulation 1:1 bind
      let localX = clientX - dockRect.left - 22; 
      localX = Math.max(0, Math.min(localX, dockRect.width - 44));
      window.dockEngine.moveDrag(localX);
    }
    
    // Lens Hover (Magnifying mesh)
    if (!isPointerDown) {
      if (clientY < dockRect.top - 60 || clientY > dockRect.bottom + 60) {
        lens.style.opacity = '0';
        return;
      }
      lens.style.opacity = '1';
      lens.style.left = (clientX - dockRect.left - 32) + 'px'; 
    }
  }

  function handlePointerDown(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const dockRect = dockPill.getBoundingClientRect();
    
    // Immediate 1:1 drag binding on touch/click anywhere on the dock
    let localX = clientX - dockRect.left - 22;
    localX = Math.max(0, Math.min(localX, dockRect.width - 44));
    window.dockEngine.startDrag(localX);
    
    // Sinking Pocket effect
    const item = e.target.closest('.tb-item');
    if (item) {
      isPointerDown = true;
      currentTarget = item;
      dockPill.classList.add('dock-sinking');
      item.classList.add('item-sinking');
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }

  function handlePointerUp() {
    if (window.dockEngine.isDragging) {
      window.dockEngine.endDrag();
    }
    if (!isPointerDown) return;
    isPointerDown = false;
    if (currentTarget) {
      currentTarget.classList.remove('item-sinking');
      currentTarget.classList.add('item-bounce');
      const temp = currentTarget;
      setTimeout(() => temp.classList.remove('item-bounce'), 250);
      currentTarget = null;
    }
    dockPill.classList.remove('dock-sinking');
    dockPill.classList.add('dock-bounce');
    setTimeout(() => dockPill.classList.remove('dock-bounce'), 250);
  }

  dockPill.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handlePointerUp);
  
  dockPill.addEventListener('touchstart', handlePointerDown);
  window.addEventListener('touchmove', (e) => {
    if (window.dockEngine.isDragging) {
      if (e.cancelable) e.preventDefault(); // Stop native scrolling
    }
    handleMove(e);
  }, { passive: false });
  window.addEventListener('touchend', handlePointerUp);
  window.addEventListener('touchcancel', handlePointerUp);
}

// Ensure physics run safely
function initPhysicsSafely() {
  setTimeout(initDockPhysics, 500);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPhysicsSafely);
} else {
  initPhysicsSafely();
}

// PRISM: Spatial Canvas Mock Generation
function populatePrismMock() {
  const emptyState = document.getElementById('prism-empty-state');
  const nodesLayer = document.getElementById('prism-nodes-layer');
  const edgesLayer = document.getElementById('prism-edges');
  
  if (!emptyState || !nodesLayer || !edgesLayer) return;
  
  // Transition empty state out
  emptyState.style.transition = "opacity 0.4s";
  emptyState.style.opacity = 0;
  setTimeout(() => {
    emptyState.style.display = "none";
  }, 400);

  // Clear existing (if any)
  nodesLayer.innerHTML = '';
  edgesLayer.innerHTML = '';
  
  // Mock Data
  const nodes = [
    { id: 1, type: 'text', content: 'Design System Architecture', x: window.innerWidth/2 - 150, y: window.innerHeight/2 - 200, cluster: '#A855F7' },
    { id: 2, type: 'text', content: 'Glassmorphism Variables', x: window.innerWidth/2 + 80, y: window.innerHeight/2 - 250, cluster: '#A855F7' },
    { id: 3, type: 'text', content: 'Spring Physics Tunings', x: window.innerWidth/2 + 200, y: window.innerHeight/2 - 120, cluster: '#A855F7' },
    
    { id: 4, type: 'text', content: 'Market Analysis Q3', x: window.innerWidth/2 - 280, y: window.innerHeight/2 + 80, cluster: '#30d158' },
    { id: 5, type: 'text', content: 'Competitor B', x: window.innerWidth/2 - 350, y: window.innerHeight/2 + 200, cluster: '#30d158' },
    { id: 6, type: 'text', content: 'Pricing Strategy', x: window.innerWidth/2 - 120, y: window.innerHeight/2 + 180, cluster: '#30d158' }
  ];

  const edges = [
    { source: 1, target: 2 },
    { source: 2, target: 3 },
    { source: 1, target: 3 },
    { source: 4, target: 5 },
    { source: 4, target: 6 }
  ];

  // Draw Edges
  edges.forEach(edge => {
    const s = nodes.find(n => n.id === edge.source);
    const t = nodes.find(n => n.id === edge.target);
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Bezier curve connecting centers
    const sx = s.x + 100, sy = s.y + 25;
    const tx = t.x + 100, ty = t.y + 25;
    const cx = (sx + tx) / 2;
    const cy = (sy + ty) / 2 - 50; 
    
    path.setAttribute('d', `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', s.cluster);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-opacity', '0.4');
    
    // Animate drawing
    path.style.strokeDasharray = "1000";
    path.style.strokeDashoffset = "1000";
    path.style.animation = "dash 1.5s ease-out forwards";
    
    edgesLayer.appendChild(path);
  });

  // Render Nodes
  nodes.forEach((n, i) => {
    const el = document.createElement('div');
    el.className = 'prism-node';
    el.style.left = n.x + 'px';
    el.style.top = n.y + 'px';
    el.style.borderTopColor = n.cluster; 
    el.innerText = n.content;
    
    // Stagger animation
    el.style.opacity = 0;
    el.style.transform = "scale(0.8) translateY(20px)";
    setTimeout(() => {
      el.style.transition = "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
      el.style.opacity = 1;
      el.style.transform = "scale(1) translateY(0)";
    }, 400 + i * 100);

    // Simple Drag Logic
    let isDragging = false, startX, startY;
    el.onmousedown = (e) => {
      isDragging = true;
      startX = e.clientX - n.x;
      startY = e.clientY - n.y;
      el.style.zIndex = 100;
    };
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      n.x = e.clientX - startX;
      n.y = e.clientY - startY;
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      // In a real app we would update the SVG paths here dynamically
    });
    window.addEventListener('mouseup', () => { 
      isDragging = false; 
      el.style.zIndex = 5;
    });

    nodesLayer.appendChild(el);
  });
}

// Ensure the animation exists for paths
if (!document.getElementById('prism-style')) {
  const s = document.createElement('style');
  s.id = 'prism-style';
  s.innerHTML = `@keyframes dash { to { stroke-dashoffset: 0; } }`;
  document.head.appendChild(s);
}

// LEDGER: Strategic Retrospective Mock Generation
function renderLedgerMock() {
  // Animate the alignment score counter
  const alignVal = document.getElementById('ledger-alignment-val');
  if (alignVal) {
    let current = 0;
    const target = 85;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      alignVal.innerText = current + '%';
    }, 20);
  }

  // Draw the Radar Chart using SVG
  const radarContainer = document.getElementById('ledger-radar-container');
  if (!radarContainer || radarContainer.innerHTML.includes('<svg')) return;

  const size = 260;
  const center = size / 2;
  const radius = size / 2 - 40;
  
  const axes = ['Ecology', 'Wildlife', 'Legislation', 'Geography', 'Projects'];
  const numAxes = axes.length;
  
  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  
  // Draw background web (target outline)
  let targetPath = '';
  axes.forEach((_, i) => {
    const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    
    // Draw Axis Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', center);
    line.setAttribute('y1', center);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(255,255,255,0.1)');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    // Target polygon path
    targetPath += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
    
    // Labels
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', center + (radius + 20) * Math.cos(angle));
    label.setAttribute('y', center + (radius + 20) * Math.sin(angle));
    label.setAttribute('fill', 'rgba(255,255,255,0.5)');
    label.setAttribute('font-size', '10px');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('alignment-baseline', 'middle');
    label.textContent = axes[i];
    svg.appendChild(label);
  });
  targetPath += 'Z';
  
  const targetPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  targetPolygon.setAttribute('d', targetPath);
  targetPolygon.setAttribute('fill', 'none');
  targetPolygon.setAttribute('stroke', 'rgba(255,255,255,0.3)');
  targetPolygon.setAttribute('stroke-dasharray', '4, 4');
  svg.appendChild(targetPolygon);

  // Draw Actual values (Amber Gradient)
  const actualValues = [0.8, 0.95, 0.4, 0.6, 0.85]; // Mock data
  let actualPath = '';
  
  actualValues.forEach((val, i) => {
    const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
    const x = center + (radius * val) * Math.cos(angle);
    const y = center + (radius * val) * Math.sin(angle);
    actualPath += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
  });
  actualPath += 'Z';

  // Add Defs for gradient
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  gradient.id = 'radar-grad';
  gradient.innerHTML = `
    <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.8" />
    <stop offset="100%" stop-color="#F59E0B" stop-opacity="0.2" />
  `;
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const actualPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  actualPolygon.setAttribute('d', actualPath);
  actualPolygon.setAttribute('fill', 'url(#radar-grad)');
  actualPolygon.setAttribute('stroke', '#F59E0B');
  actualPolygon.setAttribute('stroke-width', '2');
  
  // Simple grow animation
  actualPolygon.style.transformOrigin = '50% 50%';
  actualPolygon.style.animation = 'radar-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards';
  
  svg.appendChild(actualPolygon);
  radarContainer.appendChild(svg);
}

// Add radar animation styles if needed
if (!document.getElementById('ledger-style')) {
  const s = document.createElement('style');
  s.id = 'ledger-style';
  s.innerHTML = `@keyframes radar-grow { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`;
  document.head.appendChild(s);
}
