'use strict';

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
  journalEntries: [],
  ephemeralEntries: JSON.parse(localStorage.getItem('nv-ephemeral')||'[]'),
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
  let res = '';
  for (let i = 0; i < text.length; i++) {
    res += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(encodeURIComponent(res));
}

function decryptData(encoded, key) {
  if (!encoded) return '';
  try {
    const text = decodeURIComponent(atob(encoded));
    let res = '';
    for (let i = 0; i < text.length; i++) {
      res += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return res;
  } catch (e) {
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
  
  // Encrypt journal entries with key '1234'
  const isDecoy = STATE.priorities.some(p => p.id === 'dp1');
  if (!isDecoy) {
    const serialized = JSON.stringify(STATE.journalEntries);
    localStorage.setItem('nv-journal-enc', encryptData(serialized, '1234'));
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
  const ind = document.getElementById('dock-indicator');
  if(btn && ind) {
    const left = btn.offsetLeft;
    const width = btn.offsetWidth;
    ind.style.transform = `translateX(${left - 6}px)`;
    ind.style.width = `${width}px`;
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

  // Start Time tracker
  if (window.crTimeTracker) clearInterval(window.crTimeTracker);
  window.crTimeTracker = setInterval(() => {
    if (!$('cascara-reader-overlay').classList.contains('hidden')) {
      book.timeRead = (book.timeRead || 0) + 1;
      save();
      if ($('cascara-books-grid')) renderBooks(); // update stats live!
    }
  }, 60000);
  const overlay = $('cascara-reader-overlay'); if(!overlay) return;
  overlay.classList.remove('hidden');
  const selectedTheme = $('cr-theme-select')?.value || 'dark';
  overlay.className = `cascara-reader-overlay theme-${selectedTheme}`;
  
  $('cr-doc-title').textContent = book.title;
  $('cr-doc-author').textContent = 'by ' + (book.author || 'Unknown');
  
  let canvas = $('cr-markup-canvas');
  let ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0, lastY = 0;
  let activeTool = 'text';

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
    const wrapper = $('cr-page-wrapper');
    if (!container || !wrapper) return;
    
    const containerWidth = container.clientWidth - 20;
    const containerHeight = container.clientHeight - 20;
    
    const scaleX = containerWidth / 600;
    const scaleY = containerHeight / 780;
    const scaleFactor = Math.min(scaleX, scaleY, 1.0);
    
    const finalScale = scaleFactor * currentZoom;
    wrapper.style.transform = `scale(${finalScale})`;
  }

  function updateZoom() {
    adjustReaderResponsiveScale();
  }

  function highlightSelection(color) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    
    const contentDiv = $('cr-page-content');
    if (!contentDiv.contains(range.commonAncestorContainer)) return;
    
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
    book.highlights[book.currentPage] = contentDiv.innerHTML;
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
    selMenu.style.transform = `translateX(-50%)`;
    selMenu.classList.add('active');
  };

  document.addEventListener('selectionchange', () => {
    // Debounce slightly to wait for mouseup, handled below
  });

  const contentDivEl = $('cr-page-content');
  if (contentDivEl) {
    contentDivEl.addEventListener('mouseup', () => setTimeout(handleSelection, 50));
    contentDivEl.addEventListener('touchend', () => setTimeout(handleSelection, 50));
  }

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
  
  $('cr-sel-lookup')?.addEventListener('click', async () => {
    selMenu?.classList.remove('active');
    if (!currentSelectionText) return;
    
    const popover = $('cr-lookup-popover');
    $('cr-lookup-term').textContent = currentSelectionText;
    $('cr-lookup-body').innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';
    
    // Position popover roughly in center
    popover.style.top = '20%';
    popover.style.left = '50%';
    popover.style.transform = 'translateX(-50%)';
    popover.classList.add('active');
    
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(currentSelectionText)}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      $('cr-lookup-body').innerHTML = `<p><strong>${data.title}</strong></p><p>${data.extract || 'No summary available.'}</p>`;
      $('cr-lookup-link').href = data.content_urls?.desktop?.page || '#';
    } catch (err) {
      $('cr-lookup-body').innerHTML = '<p>No dictionary or Wikipedia entry found for this selection.</p>';
      $('cr-lookup-link').href = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(currentSelectionText)}`;
    }
  });

  $('cr-lookup-close')?.addEventListener('click', () => {
    $('cr-lookup-popover')?.classList.remove('active');
  });

  let pdfDoc = null;
  const outline = $('cr-sidebar-outline');

  function renderReaderPage(pageNum) {
    if (pageNum < 1) pageNum = 1;
    if (pageNum > book.totalPages) pageNum = book.totalPages;
    
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
    if (label) label.textContent = `Page ${pageNum} of ${book.totalPages} (${book.progress}%)`;

    const contentDiv = $('cr-page-content');
    const canvasPdf = $('cr-pdf-canvas');
    const ctxPdf = canvasPdf?.getContext('2d');

    if (book.fileType === 'pdf') {
      if (pdfDoc) {
        pdfDoc.getPage(pageNum).then(page => {
          const viewport = page.getViewport({ scale: 1 });
          const scaleX = 600 / viewport.width;
          const scaleY = 780 / viewport.height;
          const scale = Math.min(scaleX, scaleY);
          const scaledViewport = page.getViewport({ scale: scale });
          
          canvasPdf.width = 600;
          canvasPdf.height = 780;
          
          ctxPdf.clearRect(0, 0, 600, 780);
          page.render({
            canvasContext: ctxPdf,
            viewport: scaledViewport
          }).promise.then(() => {
            book.highlights = book.highlights || {};
            if (book.highlights[pageNum]) {
              contentDiv.innerHTML = book.highlights[pageNum];
            } else {
              page.getTextContent().then(textContent => {
                const nativeText = textContent.items.map(item => item.str).join(' ').trim();
                book.pdfTextCache = book.pdfTextCache || {};
                book.pdfTextCache[pageNum] = nativeText;
                
                if (nativeText.length > 10) {
                  contentDiv.innerHTML = '';
                  let charCounter = 0;
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
                  });
                } else {
                  book.ocrData = book.ocrData || {};
                  if (book.ocrData[pageNum]) {
                    renderOcrTextOverlay(book.ocrData[pageNum], book.selectedSearchMatch);
                  } else {
                    runOcrOnCanvas(pageNum);
                  }
                }
              });
            }
          });
        });
      } else {
        if (contentDiv) contentDiv.innerHTML = `<p class="empty-hint" style="padding: 40px; font-size: 16px;">Loading PDF contents...</p>`;
      }
    } else {
      if (canvasPdf && ctxPdf) {
        ctxPdf.clearRect(0, 0, canvasPdf.width, canvasPdf.height);
      }
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

    // Load drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    book.drawings = book.drawings || {};
    if (book.drawings[pageNum]) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = book.drawings[pageNum];
    }
    
    renderPageAnnotations();
    setTimeout(adjustReaderResponsiveScale, 100);
  }

  function runOcrOnCanvas(pageNum) {
    const canvasPdf = $('cr-pdf-canvas');
    if (!canvasPdf || typeof Tesseract === 'undefined') return;
    
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
      book.ocrData[pageNum] = words.map(w => ({
        text: w.text,
        left: w.bbox.x0,
        top: w.bbox.y0,
        width: w.bbox.x1 - w.bbox.x0,
        height: w.bbox.y1 - w.bbox.y0
      }));
      save();
      ocrIndicator.remove();
      renderOcrTextOverlay(book.ocrData[pageNum], book.selectedSearchMatch);
    }).catch(err => {
      console.error("OCR failed", err);
      ocrIndicator.innerHTML = "⚠️ Extraction failed";
      setTimeout(() => ocrIndicator.remove(), 2000);
    });
  }

  function renderOcrTextOverlay(words, selectedMatch) {
    contentDiv.innerHTML = '';
    let charCounter = 0;
    words.forEach(w => {
      const len = w.text.length;
      const spanStart = charCounter;
      const spanEnd = charCounter + len;
      
      let isMatch = false;
      if (selectedMatch && selectedMatch.page === book.currentPage) {
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
      
      contentDiv.appendChild(span);
      charCounter += len + 1;
    });
  }

  function renderPageAnnotations() {
    contentDiv.querySelectorAll('.cr-text-note').forEach(n => n.remove());
    book.annotations = book.annotations || {};
    const notes = book.annotations[book.currentPage] || [];
    notes.forEach(n => {
      const note = document.createElement('div');
      note.className = 'cr-text-note';
      note.style.position = 'absolute';
      note.style.left = n.left + 'px';
      note.style.top = n.top + 'px';
      note.style.background = 'rgba(255, 235, 59, 0.95)';
      note.style.color = '#000000';
      note.style.padding = '6px 10px';
      note.style.borderRadius = '6px';
      note.style.fontSize = '12px';
      note.style.border = '1px solid rgba(0,0,0,0.15)';
      note.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
      note.style.zIndex = '30';
      note.style.userSelect = 'none';
      note.textContent = n.text;
      note.dataset.id = n.id;
      
      note.addEventListener('dblclick', ev => {
        ev.stopPropagation();
        if (activeTool !== 'text') return;
        note.contentEditable = 'true';
        note.style.userSelect = 'text';
        note.focus();
        
        const updateNote = () => {
          const txt = note.textContent.trim();
          if (!txt) {
            book.annotations[book.currentPage] = book.annotations[book.currentPage].filter(x => x.id !== n.id);
            note.remove();
          } else {
            note.contentEditable = 'false';
            note.style.userSelect = 'none';
            n.text = txt;
            const idx = book.annotations[book.currentPage].findIndex(x => x.id === n.id);
            if (idx > -1) book.annotations[book.currentPage][idx].text = txt;
          }
          save();
        };
        note.addEventListener('blur', updateNote, {once: true});
        note.addEventListener('keydown', ev => {
          if (ev.key === 'Enter' && !ev.shiftKey) {
            ev.preventDefault();
            note.blur();
          }
        });
      });
      contentDiv.appendChild(note);
    });
  }

  contentDiv.addEventListener('dblclick', e => {
    if (activeTool !== 'text') return;
    if (e.target.classList.contains('cr-text-note') || e.target.closest('.cr-text-note')) return;
    
    const rect = contentDiv.getBoundingClientRect();
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
    
    contentDiv.appendChild(note);
    note.focus();
    
    const saveNote = () => {
      const txt = note.textContent.trim();
      if (!txt) {
        note.remove();
      } else {
        note.contentEditable = 'false';
        note.style.userSelect = 'none';
        
        const noteId = Math.random().toString(36).substring(2, 9);
        note.dataset.id = noteId;
        
        book.annotations = book.annotations || {};
        book.annotations[book.currentPage] = book.annotations[book.currentPage] || [];
        book.annotations[book.currentPage].push({
          id: noteId,
          left,
          top,
          text: txt
        });
        save();
        
        note.addEventListener('dblclick', ev => {
          ev.stopPropagation();
          if (activeTool !== 'text') return;
          note.contentEditable = 'true';
          note.focus();
          
          const updateNote = () => {
            const txt2 = note.textContent.trim();
            if (!txt2) {
              book.annotations[book.currentPage] = book.annotations[book.currentPage].filter(x => x.id !== noteId);
              note.remove();
            } else {
              note.contentEditable = 'false';
              const idx = book.annotations[book.currentPage].findIndex(x => x.id === noteId);
              if (idx > -1) book.annotations[book.currentPage][idx].text = txt2;
            }
            save();
          };
          note.addEventListener('blur', updateNote, {once: true});
        });
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

  contentDiv.addEventListener('click', e => {
    if (activeTool === 'eraser') {
      const note = e.target.closest('.cr-text-note');
      if (note) {
        const noteId = note.dataset.id;
        book.annotations = book.annotations || {};
        book.annotations[book.currentPage] = (book.annotations[book.currentPage] || []).filter(x => x.id !== noteId);
        save();
        note.remove();
      }
    }
  });

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

  const newCanvas = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(newCanvas, canvas);
  canvas = newCanvas;
  ctx = canvas.getContext('2d');

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) startDraw(e.touches[0]);
    e.preventDefault();
  }, {passive: false});
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) draw(e.touches[0]);
    e.preventDefault();
  }, {passive: false});
  canvas.addEventListener('touchend', endDraw);

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
      
      activeTool = toolId.replace('cr-tool-', '');
      
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

  // Keyboard navigation
  const handleKeyboardNav = e => {
    if (overlay.classList.contains('hidden')) return;
    if (document.activeElement && (document.activeElement.id === 'cr-search-input' || document.activeElement.id === 'cr-chat-input')) return;
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      if (book.currentPage < book.totalPages) {
        renderReaderPage(book.currentPage + 1);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (book.currentPage > 1) {
        renderReaderPage(book.currentPage - 1);
        e.preventDefault();
      }
    }
  };
  window.addEventListener('keydown', handleKeyboardNav);
  window.addEventListener('resize', adjustReaderResponsiveScale);

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
        const targetPopoverId = toolId.replace('cr-tool-', 'cr-');
        const popover = $(targetPopoverId);
        const wasHidden = popover?.classList.contains('hidden');
        hideAllPopovers();
        if (wasHidden && popover) popover.classList.remove('hidden');
      } else {
        hideAllPopovers();
      }
    });
  });

  // Two-page Spread layout mode
  let isTwoPage = false;
  $('cr-tool-spread')?.addEventListener('click', () => {
    isTwoPage = !isTwoPage;
    $('cr-tool-spread').classList.toggle('active', isTwoPage);
    const viewport = $('cr-page-view');
    if (viewport) {
      viewport.classList.toggle('cr-spread-view', isTwoPage);
    }
    adjustReaderResponsiveScale();
  });

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
    if (!select) return;
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

  if (synthesis.onvoiceschanged !== undefined) {
    synthesis.onvoiceschanged = populateVoiceList;
  }
  populateVoiceList();
  let voiceCheckInterval = setInterval(() => {
    if(synthesis.getVoices().length > 0) {
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

  $('cr-mcq-refresh-btn')&&( $('cr-mcq-refresh-btn').onclick = generateMCQs );

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
      bubble.innerHTML = '<div class="chat-typing-dots"><span></span><span></span><span></span></div>';
    } else {
      bubble.textContent = text;
    }
    
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: chatHistory,
          context: pageText,
          model: 'github',
          systemPromptOverride: "You are the user's friendly AI Study Buddy. Help them study the current book page. Keep your responses concise, sharp, and structured. Always answer page-specific questions using the context provided below:\n\n" + pageText
        })
      });

      document.getElementById('buddy-typing-indicator')?.remove();

      const data = await res.json();
      
      if (!res.ok) {
        if (data.error && data.error.includes("API key")) {
          appendChatMessage('buddy', "Missing GitHub PAT! Please paste it into `insert api key here.txt` in the root folder.");
        } else {
          appendChatMessage('buddy', `Error: ${data.error || 'Failed to connect to NYVRON Intelligence.'}`);
        }
        return;
      }

      const reply = data.reply || "No response received.";
      
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
        renderBooks();
      });
    });
  };

  $('cr-sidebar-toggle').onclick = () => {
    $('cr-sidebar')?.classList.toggle('hidden');
  };

  $('cr-theme-select').onchange = function() {
    overlay.className = `cascara-reader-overlay theme-${this.value}`;
  };

  $('cr-prev-page').onclick = () => {
    if (book.currentPage > 1) renderReaderPage(book.currentPage - 1);
  };

  $('cr-next-page').onclick = () => {
    if (book.currentPage < book.totalPages) renderReaderPage(book.currentPage + 1);
  };

  $('cr-page-slider').oninput = function() {
    renderReaderPage(parseInt(this.value));
  };

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
  if (book.fileType === 'pdf') {
    getFile(book.id).then(blob => {
      if (!blob) {
        showAlert("Missing File", "PDF file not found in local storage.");
        overlay.classList.add('hidden');
        return;
      }
      const fileReader = new FileReader();
      fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
          pdfDoc = pdf;
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

          renderReaderPage(book.currentPage || 1);
        });
      };
      fileReader.readAsArrayBuffer(blob);
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
    renderReaderPage(book.currentPage || 1);
  }
}

// --- renderSpotlightResults ---
function renderSpotlightResults(q){
  const list=$('spotlight-results');list.innerHTML='';
  const filtered=q?SEARCH_ITEMS.filter(x=>x.label.toLowerCase().includes(q.toLowerCase())):SEARCH_ITEMS;
  filtered.forEach((item,i)=>{const li=document.createElement('li');li.className='sresult';li.dataset.tab=item.tab;li.innerHTML=`<span class="sresult-icon">${item.icon}</span><span>${item.label}</span>`;li.addEventListener('click',()=>{switchTab(item.tab);closeSpotlight();});list.appendChild(li);});
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
  if(!events.length){empty?.classList.remove('hidden');return;}
  empty?.classList.add('hidden');
  events.forEach((ev,i)=>{
    const li=document.createElement('li');
    li.className='cal-event-item swipe-wrap';
    li.style.animationDelay=`${i*.06}s`;
    li.style.padding = '0';
    
    let extraHTML = '';
    if (ev.url) {
      extraHTML += `<div style="font-size: 11px; color: var(--cascara); margin-top: 2px;"><a href="${ev.url}" target="_blank" style="color:var(--cascara); text-decoration:underline;">${ev.url}</a></div>`;
    }
    if (ev.notes) {
      extraHTML += `<div style="font-size: 11px; color: var(--txt3); margin-top: 2px;">${ev.notes}</div>`;
    }
    
    li.innerHTML=`
      <div class="swipe-content" style="display:flex;align-items:center;width:100%;transition:transform 0.3s var(--spring);padding:14px;">
        <div class="cal-event-dot"></div>
        <div style="flex:1;">
          <div><span class="cal-event-time">${ev.time||'All day'}</span><span class="cal-event-title" style="margin-left: 6px; font-weight: 500;">${ev.title}</span></div>
          ${extraHTML}
        </div>
      </div>
      <button class="rem-del-swipe" data-id="${ev.id}" data-type="calevent" aria-label="Delete"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    `;
    setupSwipeGesture(li, { direction: 'x', maxDistance: -80 });
    list.appendChild(li);
  });
}

function applyManualTheme(theme) {
  document.body.classList.remove('theme-paper', 'theme-dark-vault', 'theme-crimson');
  if (theme === 'light') {
    document.body.classList.add('theme-paper');
  } else if (theme === 'dark') {
    document.body.classList.add('theme-dark-vault');
  }
}

function applyAutoTheme() {
  const h = new Date().getHours();
  document.body.classList.remove('theme-paper', 'theme-dark-vault', 'theme-crimson');
  if (h >= 6 && h < 18) {
    document.body.classList.add('theme-paper');
  } else {
    document.body.classList.add('theme-dark-vault');
  }
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
        <button class="jc-hover-del" style="display:none; position:absolute; right:16px; top:16px; width:32px; height:32px; border-radius:50%; background:rgba(255, 69, 58, 0.14); color:#ff453a; border:1px solid rgba(255,69,58,0.3); align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s ease; z-index:15;" title="Delete Entry"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        <div class="jc-top"><span class="jc-date" style="color:rgba(18,18,20,0.55);">${dateText}</span><span class="jc-mood">${e.mood||'🙂'}</span></div>
        <div class="jc-title" style="color:#121214; font-weight:700;">${e.title||'Untitled'}</div>
        <div class="jc-preview" style="color:rgba(18,18,20,0.7);">${e.body||''}</div>
        ${attachHtml}
      </div>
      <div class="journal-swipe-actions" style="position:absolute; right:0; top:0; bottom:0; display:flex; z-index:1; border-radius:20px; overflow:hidden;">
        <button class="journal-swipe-share" data-id="${e.id}" style="width:60px; background:#007AFF; color:#fff; border:none; display:flex; align-items:center; justify-content:center; font-size:18px; cursor:pointer;" title="Share">⎋</button>
        <button class="journal-swipe-del" data-id="${e.id}" style="width:60px; background:#FF3B30; color:#fff; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Delete"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
      </div>
    `;

    const content = wrapper.querySelector('.journal-card');
    const shareBtn = wrapper.querySelector('.journal-swipe-share');
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
      maxDistance: -120,
      containerSelector: '.journal-card',
      deleteLayerSelector: '.journal-swipe-actions',
      isJournalCard: true,
      onDeleteTrigger: () => {
        STATE.journalEntries = STATE.journalEntries.filter(x => x.id !== e.id);
        save(); renderJournal();
      }
    });

    content.addEventListener('click', (ev) => {
      if (content.style.transform === 'translateX(-120px)') {
        content.style.transform = 'translateX(0)';
        ev.stopPropagation();
        return;
      }
      openJournalWrite(e.id);
    });

    shareBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const title = e.title || 'Untitled';
      const body = e.body || '';
      const fullText = `${title}\n\n${body}`;
      navigator.clipboard.writeText(fullText).then(() => {
        triggerNotification('Note Shared', 'Note text copied to clipboard!');
      });
      content.style.transform = 'translateX(0)';
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
    card.innerHTML = `
      <div class="book-cover-art" style="background: linear-gradient(135deg, ${b.fileType === 'pdf' ? '#7f1d1d, #b91c1c' : '#1e3c72, #2a5298'})">
        <span class="book-type-badge">${b.fileType.toUpperCase()}</span>
        <button class="book-dots-btn" data-id="${b.id}" style="position:absolute; top:8px; right:8px; width:26px; height:26px; border-radius:50%; background:rgba(0,0,0,0.5); border:none; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer; font-size:14px; font-weight:bold; z-index:10; outline:none; transition: background 0.2s;">⋮</button>
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

  // DIRECT click handler on card to open book reader (not body delegation)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.book-dots-btn')) return;

      
      // If card is swiped open (delete layer visible), reset instead of opening
      const transform = card.style.transform;
      if (transform && transform.includes('translateY') && transform !== 'translateY(0px)') {
        const val = parseFloat(transform.replace(/[^0-9\-]/g, ''));
        if (val < -20) {
          card.style.transition = 'transform 0.2s ease';
          card.style.transform = 'translateY(0px)';
          deleteLayer.style.transition = 'opacity 0.2s ease';
          deleteLayer.style.opacity = '0';
          deleteLayer.style.pointerEvents = 'none';
          return;
        }
      }
      try {
        openBookReader(b);
      } catch (err) {
        console.error('Error opening book:', err);
        showAlert('Error', 'Could not open book: ' + err.message);
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
  if (activeVents.length > 0) {
    storiesBar?.classList.remove('hidden');
    
    // Wire active story click trigger
    const storyItem = $('active-story-item');
    if (storyItem) {
      storyItem.onclick = () => {
        openStoryViewer(0);
      };
    }

    // We removed the global burnTimerInterval update here.
    // The countdown in the vent creation modal will now tick fresh for 24h.
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
  document.body.classList.add('theme-dark-vault');
  const feed = $('jai-feed');
  if (feed && feed.children.length === 0) {
    addJAIMessage('ai', "Hi! I can search through your journal history. Ask me anything — like \"When was the last time I felt burned out?\" or \"Summarize my entries about growth.\"");
  }
}

function addJAIMessage(role, text, sourceEntry) {
  const feed = $('jai-feed'); if (!feed) return;
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
      addJAIMessage('ai', "My powers are strictly limited to your journal, as intended by my developer. For general questions, please consult the main NYVRON AI.");
      const btnContainer = document.createElement('div');
      btnContainer.style.cssText = 'display:flex; justify-content:center; margin-top:24px; margin-bottom:24px; width: 100%;';
      btnContainer.innerHTML = `
        <button id="switch-main-ai-btn" style="position:relative; overflow:hidden; background:linear-gradient(180deg, #0a0a0c, #050505); border:1px solid rgba(255,255,255,0.08); color:#fff; width: 100%; max-width: 340px; padding:32px 24px; border-radius:24px; cursor:pointer; box-shadow:0 16px 40px rgba(0,0,0,0.4); transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); text-align: left;">
          <canvas class="main-ai-btn-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1; mix-blend-mode:screen;"></canvas>
          
          <div style="position:relative; z-index:2; display:flex; flex-direction: column; gap:16px;">
            <svg style="width:48px;height:48px;animation:spin-fast 6s linear infinite;" viewBox="-20 -20 40 40"><g><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71"></path><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(60)"></path><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71" transform="rotate(120)"></path><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(180)"></path><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71" transform="rotate(240)"></path><path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(300)"></path></g></svg>
            
            <div>
                <h3 style="margin:0 0 6px 0; font-size:22px; font-weight:600; letter-spacing:-0.5px;">Consult Main AI</h3>
                <p style="margin:0; font-size:14px; opacity:0.6; font-weight:400; line-height:1.4;">Switch to the main assistant for general knowledge and deep reasoning.</p>
            </div>
          </div>
        </button>
      `;
      const feed = $('jai-feed');
      if (feed) {
        feed.appendChild(btnContainer);
        feed.scrollTop = feed.scrollHeight;
      }
      
      const btn = btnContainer.querySelector('#switch-main-ai-btn');
      const canvas = btnContainer.querySelector('.main-ai-btn-canvas');
      
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.02) translateY(-2px)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1) translateY(0)');
      btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.97)');
      
      btn.addEventListener('click', () => {
        $('journal-ai-overlay').classList.add('hidden');
        switchTab('tab-ai');
      });
      
      const ctx = canvas.getContext('2d');
      // High-res canvas for crisp rendering, scaled down via CSS
      canvas.width = 680;
      canvas.height = 360;
      let w = canvas.width;
      let h = canvas.height;
      let particles = [];
      let mouseX = w/2, mouseY = h/2;
      
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        // Map mouse position correctly to canvas internal resolution
        mouseX = ((e.clientX - rect.left) / rect.width) * w;
        mouseY = ((e.clientY - rect.top) / rect.height) * h;
        
        for(let k=0; k<4; k++) {
          particles.push({
            x: mouseX + (Math.random()-0.5)*30, 
            y: mouseY + (Math.random()-0.5)*30, 
            vx: (Math.random()-0.5)*6, 
            vy: (Math.random()-0.5)*6, 
            life: 1,
            color: Math.random() > 0.5 ? '#2ECC71' : '#30B0C7'
          });
        }
      });
      
      function animateBtn() {
        if (!document.body.contains(canvas)) return;
        ctx.clearRect(0, 0, w, h);
        
        // Render subtle static starfield
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for(let i=0; i<40; i++) {
           ctx.beginPath();
           ctx.arc((i*113)%w, (i*197)%h, 1.5, 0, Math.PI*2);
           ctx.fill();
        }

        for(let i=particles.length-1; i>=0; i--) {
          let p = particles[i];
          p.x += p.vx; p.y += p.vy;
          p.life -= 0.025;
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
        STATE.activeTab = 'tab-home';
      } else {
        const encJournal = localStorage.getItem('nv-journal-enc');
        if (encJournal) {
          try {
            const raw = decryptData(encJournal, passcode);
            STATE.journalEntries = JSON.parse(raw || '[]');
          } catch(e) {
            STATE.journalEntries = [];
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
  checkEphemeralExpiry();



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
});
