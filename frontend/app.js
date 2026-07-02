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
    const li=document.createElement('li'); li.className='day-block'; li.style.animationDelay=`${i*.05}s`;
    li.innerHTML=`<span class="day-block-time">${s.time}</span><span class="day-block-title">${s.title}</span>`;
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
      <button class="rem-del-swipe" data-id="${p.id}" aria-label="Delete">Delete</button>
    `;
    // Swipe logic
    let startX = 0, currentX = 0;
    const content = li.querySelector('.swipe-content');
    content.addEventListener('touchstart', e => { startX = e.touches[0].clientX; content.style.transition = 'none'; });
    content.addEventListener('touchmove', e => {
      const delta = e.touches[0].clientX - startX;
      if(delta < 0 && delta > -80) { currentX = delta; content.style.transform = `translateX(${delta}px)`; }
    });
    content.addEventListener('touchend', e => {
      content.style.transition = 'transform 0.3s var(--spring)';
      if(currentX < -40) { content.style.transform = 'translateX(-80px)'; }
      else { content.style.transform = 'translateX(0)'; }
      currentX = 0;
    });
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

// --- openModal ---
function openModal(title,bodyHTML){
  const m=$('generic-modal'); if(!m)return;
  $('modal-title').textContent=title;
  $('modal-body').innerHTML=bodyHTML;
  m.classList.add('open');
}

// --- switchTab ---
function switchTab(tabId){
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
    div.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:700; color:var(--cascara); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">${day}</div>
        <div style="color:var(--txt1); font-size:15px; margin-top:4px;">${plan}</div>
      </div>
      <button class="planner-edit-btn" data-day="${day}" style="background:var(--surface2); border:none; border-radius:8px; color:var(--txt2); font-size:12px; padding:6px 12px; cursor:pointer;">Edit</button>
    `;
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
  const rows=Object.entries(subjMs).map(([name,ms])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--separator)"><span style="color:var(--txt2);font-size:15px">${name}</span><span style="color:var(--cascara);font-weight:600">${ms2hms(ms)}</span></div>`).join('');
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
  const title=$('jw-title').value.trim(),body=$('jw-body').value.trim();if(!title&&!body)return;
  const grad=GRADIENTS[STATE.journalEntries.length%GRADIENTS.length];
  if(STATE.journalEditId){const e=STATE.journalEntries.find(x=>x.id===STATE.journalEditId);if(e){e.title=title;e.body=body;e.mood=STATE.selectedMood;}}
  else {
    STATE.journalEditId = randomId();
    STATE.journalEntries.push({id:STATE.journalEditId,title,body,mood:STATE.selectedMood,date:new Date().toISOString(),gradient:grad});
  }
  save();renderJournal();
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
  }

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
      return book.pdfTextCache[book.currentPage] || "";
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

  const speechPlayBtn = $('cr-speech-play-btn');
  const speechPlayText = $('cr-speech-play-text');

  const toggleSpeech = () => {
    if (isSpeaking) {
      synthesis.cancel();
      isSpeaking = false;
      if (speechPlayText) speechPlayText.textContent = "Start Reading";
      if (speechPlayBtn) speechPlayBtn.querySelector('svg').innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    } else {
      const text = getCurrentPageText();
      if (!text || text.trim().length === 0) return;

      ttsUtterance = new SpeechSynthesisUtterance(text);
      const voiceVal = $('cr-speech-voice-select').value;
      if (voiceVal) {
        ttsUtterance.voice = synthesis.getVoices().find(v => v.name === voiceVal);
      }

      ttsUtterance.onend = () => {
        isSpeaking = false;
        if (speechPlayText) speechPlayText.textContent = "Start Reading";
        if (speechPlayBtn) speechPlayBtn.querySelector('svg').innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      };

      synthesis.speak(ttsUtterance);
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
      content.innerHTML = '<div style="color:var(--txt3); font-size:12px; padding:20px;">Not enough text on this page to generate questions.</div>';
      return;
    }

    content.innerHTML = '<div style="color:var(--txt2); font-size:12px; padding:20px; text-align:center;">Generating 10 questions using NYVRON Intelligence...</div>';

    setTimeout(() => {
      let sentences = pageText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 25);
      if (sentences.length === 0) {
        content.innerHTML = '<div style="color:var(--txt3); font-size:12px; padding:20px;">Could not identify clear sentences to generate quiz questions.</div>';
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
        card.style.cssText = 'background:rgba(255,255,255,0.03); border:1px solid var(--border); padding:14px; border-radius:10px; display:flex; flex-direction:column; gap:10px; margin-bottom:12px;';
        card.innerHTML = `
          <div style="font-size:11px; color:var(--cascara); font-weight:700;">QUESTION ${idx + 1} OF 10</div>
          <div style="font-size:12px; line-height:1.4; color:#fff;">"${question}"</div>
          <div class="mcq-opts-list" style="display:flex; flex-direction:column; gap:6px;">
            ${options.map((opt, i) => `
              <button class="mcq-opt" data-opt="${opt}" style="padding:10px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.02); color:var(--txt2); text-align:left; cursor:pointer; font-size:12px; transition:0.2s;">
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

      if (!res.ok) {
        appendChatMessage('buddy', "Sorry, I encountered an error connecting to NYVRON Intelligence.");
        return;
      }

      const data = await res.json();
      const reply = data.reply || "No response received.";
      
      typeMessageOut(reply, () => {
        chatHistory.push({ who: 'user', text: msg });
        chatHistory.push({ who: 'buddy', text: reply });
      });

    } catch (err) {
      document.getElementById('buddy-typing-indicator')?.remove();
      appendChatMessage('buddy', "Connection error. Make sure backend is running.");
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
    renderBooks();
  };

  $('cr-delete-book-btn').onclick = () => {
    if (confirm('Delete this book from library?')) {
      window.removeEventListener('keydown', handleKeyboardNav);
      window.removeEventListener('resize', adjustReaderResponsiveScale);
      const bookId = book.id;
      STATE.books = STATE.books.filter(b => b.id !== bookId);
      save();
      deleteFile(bookId).then(() => {
        overlay.classList.add('hidden');
        renderBooks();
      });
    }
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
    outline.innerHTML = `<li class="cr-outline-item" style="color:var(--txt3); pointer-events:none; padding:12px;">Searching...</li>`;
    
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
        outline.innerHTML = `<li class="cr-outline-item" style="color:var(--txt3); pointer-events:none; padding:12px;">No matches found</li>`;
        return;
      }
      
      matches.sort((a, b) => a.page - b.page || a.charOffset - b.charOffset);
      matches.forEach(m => {
        const li = document.createElement('li');
        li.className = 'cr-outline-item';
        const matchIdx = m.charOffset;
        const snippet = m.snippet.slice(Math.max(0, matchIdx - 15), matchIdx + query.length + 20);
        li.innerHTML = `<div style="font-weight:bold; color:var(--cascara);">Page ${m.page}</div><div style="font-size:11px; color:var(--txt3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">...${snippet}...</div>`;
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
        outline.innerHTML = `<li class="cr-outline-item" style="color:var(--txt3); pointer-events:none; padding:12px;">No matches found</li>`;
        return;
      }
      matches.sort((a, b) => a.page - b.page || a.charOffset - b.charOffset);
      matches.forEach(m => {
        const li = document.createElement('li');
        li.className = 'cr-outline-item';
        const matchIdx = m.charOffset;
        const snippet = m.snippet.slice(Math.max(0, matchIdx - 15), matchIdx + query.length + 20);
        li.innerHTML = `<div style="font-weight:bold; color:var(--cascara);">Page ${m.page}</div><div style="font-size:11px; color:var(--txt3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">...${snippet}...</div>`;
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
        alert("PDF file not found in local storage.");
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

// --- openJournalWrite ---
function openJournalWrite(entryId){
  const overlay=$('journal-write-overlay');if(!overlay)return;
  const ex=entryId?STATE.journalEntries.find(e=>e.id===entryId):null;
  STATE.journalEditId=entryId||null;
  $('jw-date-display').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  $('jw-title').value=ex?.title||'';$('jw-body').value=ex?.body||'';STATE.selectedMood=ex?.mood||'🙂';
  document.querySelectorAll('.mood-chip').forEach(c=>c.classList.toggle('active',c.dataset.mood===STATE.selectedMood));
  $('jw-prompt').textContent=PROMPTS[Math.floor(Math.random()*PROMPTS.length)];
  overlay.classList.remove('hidden');
  setTimeout(()=>$('jw-title').focus(),350);
}

// --- startCascaraSession ---
function startCascaraSession(sid){
  if(STATE.cascara.activeSubjectId)stopCascaraSession();
  STATE.cascara.activeSubjectId=sid; STATE.cascara.activeStart=Date.now();
  const sub=STATE.cascara.subjects.find(s=>s.id===sid);
  if(sub){sub._baseMs=sub.todayMs;}
  const overlay=$('cascara-focus-overlay');
  if(overlay){$('cfo-subject-name').textContent=sub?.name||'Subject';$('cfo-start').textContent=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});overlay.classList.remove('hidden');}
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
          <button id="del-countdown-btn" class="btn-ghost" style="padding:4px;font-size:14px;background:none;border:none;cursor:pointer;color:var(--danger);">🗑</button>
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
    if (confirm('Delete this countdown?')) {
      STATE.countdown = { title: "", target: "" };
      save();
      renderCountdown();
    }
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
        <span class="rem-text${r.done?' done':''}" style="flex:1">${r.text}${r.time ? ` <span style="font-size:12px;color:var(--txt3);">(${r.time})</span>` : ''}</span>
      </div>
      <button class="rem-del-swipe" data-id="${r.id}" aria-label="Delete">Delete</button>
    `;
    // Swipe logic
    let startX = 0, currentX = 0;
    const content = li.querySelector('.swipe-content');
    content.addEventListener('touchstart', e => { startX = e.touches[0].clientX; content.style.transition = 'none'; });
    content.addEventListener('touchmove', e => {
      const delta = e.touches[0].clientX - startX;
      if(delta < 0 && delta > -80) { currentX = delta; content.style.transform = `translateX(${delta}px)`; }
    });
    content.addEventListener('touchend', e => {
      content.style.transition = 'transform 0.3s var(--spring)';
      if(currentX < -40) { content.style.transform = 'translateX(-80px)'; }
      else { content.style.transform = 'translateX(0)'; }
      currentX = 0;
    });
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
  events.forEach((ev,i)=>{const li=document.createElement('li');li.className='cal-event-item';li.style.animationDelay=`${i*.06}s`;li.innerHTML=`<div class="cal-event-dot"></div><span class="cal-event-time">${ev.time||'All day'}</span><span class="cal-event-title">${ev.title}</span><button class="cal-event-del" data-id="${ev.id}">✕</button>`;list.appendChild(li);});
}

// --- updateClock ---
function updateClock(){
  const now=new Date(),hm=now.toTimeString().slice(0,5);
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const el=$('home-time'),de=$('home-date');
  if(el)el.textContent=hm;
  if(de)de.textContent=`${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;
  const h=now.getHours(),greet=h<5?'Good night':h<12?'Good morning':h<17?'Good afternoon':h<21?'Good evening':'Good night';
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
    
    wrapper.innerHTML=`
      <div class="journal-card swipe-content" style="background:${e.gradient||GRADIENTS[i%GRADIENTS.length]};transition:transform 0.3s var(--spring);padding:20px;cursor:pointer;position:relative;z-index:2;margin-bottom:0 !important;">
        <div class="jc-top"><span class="jc-date">${new Date(e.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span><span class="jc-mood">${e.mood||'🙂'}</span></div>
        <div class="jc-title">${e.title||'Untitled'}</div>
        <div class="jc-preview">${e.body||''}</div>
      </div>
      <div class="journal-swipe-actions" style="position:absolute; right:0; top:0; bottom:0; display:flex; z-index:1; border-radius:20px; overflow:hidden;">
        <button class="journal-swipe-share" data-id="${e.id}" style="width:60px; background:#007AFF; color:#fff; border:none; display:flex; align-items:center; justify-content:center; font-size:18px; cursor:pointer;" title="Share">⎋</button>
        <button class="journal-swipe-del" data-id="${e.id}" style="width:60px; background:#FF3B30; color:#fff; border:none; display:flex; align-items:center; justify-content:center; font-size:18px; cursor:pointer;" title="Delete">🗑</button>
      </div>
    `;

    const content = wrapper.querySelector('.journal-card');
    const shareBtn = wrapper.querySelector('.journal-swipe-share');
    const delBtn = wrapper.querySelector('.journal-swipe-del');

    // Swipe logic (Touch + Leak-free Desktop Mouse Dragging)
    let startX = 0, currentX = 0;
    
    content.addEventListener('touchstart', ev => { startX = ev.touches[0].clientX; content.style.transition = 'none'; });
    content.addEventListener('touchmove', ev => {
      const delta = ev.touches[0].clientX - startX;
      if(delta < 0 && delta > -130) { currentX = delta; content.style.transform = `translateX(${delta}px)`; }
    });
    content.addEventListener('touchend', () => {
      content.style.transition = 'transform 0.3s var(--spring)';
      if(currentX < -60) content.style.transform = 'translateX(-120px)';
      else content.style.transform = 'translateX(0)';
      currentX = 0;
    });

    content.addEventListener('mousedown', ev => {
      startX = ev.clientX;
      let isDragging = true;
      content.style.transition = 'none';
      
      const handleMove = ev => {
        if (!isDragging) return;
        const delta = ev.clientX - startX;
        if (delta < 0 && delta > -130) {
          currentX = delta;
          content.style.transform = `translateX(${delta}px)`;
        }
      };
      
      const handleUp = () => {
        isDragging = false;
        content.style.transition = 'transform 0.3s var(--spring)';
        if (currentX < -60) content.style.transform = 'translateX(-120px)';
        else content.style.transform = 'translateX(0)';
        currentX = 0;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
      
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
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
      const idx = STATE.journalEntries.findIndex(x => x.id === e.id);
      if(idx>-1) {
        STATE.journalEntries.splice(idx, 1);
        save(); renderJournal();
      }
    });

    grid.appendChild(wrapper);
  });
  const se = $('stat-entries'); if (se) se.textContent=STATE.journalEntries.length;
}

// --- fetchNorthStar ---
async function fetchNorthStar(){
  const qt=$('ns-quote-text'),qa=$('ns-quote-author'); if(!qt)return;
  const cached=JSON.parse(localStorage.getItem('nv-ns-cache')||'null');
  if(cached&&Date.now()-cached.ts<86400000){
    qt.classList.remove('skeleton'); qt.textContent=`"${cached.q}"`; qa.textContent=`— ${cached.a}`; return;
  }
  qt.classList.add('skeleton'); qt.textContent='⠀'; qa.textContent='';
  try{
    // Fetch from ZenQuotes as requested
    const r=await fetch('https://zenquotes.io/api/random',{signal:AbortSignal.timeout(5000)});
    if(!r.ok)throw new Error();
    const d=await r.json();
    const data={q:d[0].q,a:d[0].a,ts:Date.now()};
    localStorage.setItem('nv-ns-cache',JSON.stringify(data));
    qt.classList.remove('skeleton'); qt.textContent=`"${data.q}"`; qa.textContent=`— ${data.a}`;
  }catch{
    const fb=FALLBACKS[Math.floor(Math.random()*FALLBACKS.length)];
    qt.classList.remove('skeleton'); qt.textContent=`"${fb.q}"`; qa.textContent=`— ${fb.a}`;
  }
}

// --- renderBooks ---
// --- renderBooks ---
function renderBooks() {
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
    
    // Swipe Touch Gesture Handlers (Leak-free temporary binding pattern)
    card.addEventListener('touchstart', (e) => {
      const startY = e.touches[0].clientY;
      let currentY = startY;
      let hasDragged = false;
      
      card.style.transition = 'none';
      deleteLayer.style.transition = 'none';
      
      const onTouchMove = (moveEvent) => {
        currentY = moveEvent.touches[0].clientY;
        let deltaY = currentY - startY;
        if (Math.abs(deltaY) > 5) {
          hasDragged = true;
        }
        if (hasDragged && deltaY < 0) {
          let translateVal = Math.max(-60, deltaY);
          card.style.transform = `translateY(${translateVal}px)`;
          deleteLayer.style.opacity = Math.min(1, Math.abs(translateVal) / 60);
        }
      };
      
      const onTouchEnd = () => {
        card.removeEventListener('touchmove', onTouchMove);
        card.removeEventListener('touchend', onTouchEnd);
        
        if (!hasDragged) return;
        
        card.style.transition = 'transform 0.2s ease';
        deleteLayer.style.transition = 'opacity 0.2s ease';
        let deltaY = currentY - startY;
        if (deltaY < -25) {
          card.style.transform = 'translateY(-60px)';
          deleteLayer.style.opacity = '1';
        } else {
          card.style.transform = 'translateY(0px)';
          deleteLayer.style.opacity = '0';
        }
      };
      
      card.addEventListener('touchmove', onTouchMove, {passive: true});
      card.addEventListener('touchend', onTouchEnd);
    }, {passive: true});
    
    // Swipe Mouse Fallback Gestures (Desktop Support - Leak-free temporary binding pattern)
    card.addEventListener('mousedown', (e) => {
      const startY = e.clientY;
      let currentY = startY;
      let hasDragged = false;
      
      card.style.transition = 'none';
      deleteLayer.style.transition = 'none';
      
      const onMouseMove = (moveEvent) => {
        currentY = moveEvent.clientY;
        let deltaY = currentY - startY;
        if (Math.abs(deltaY) > 5) {
          hasDragged = true;
        }
        if (hasDragged && deltaY < 0) {
          let translateVal = Math.max(-60, deltaY);
          card.style.transform = `translateY(${translateVal}px)`;
          deleteLayer.style.opacity = Math.min(1, Math.abs(translateVal) / 60);
        }
      };
      
      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        
        if (!hasDragged) return;
        
        card.style.transition = 'transform 0.2s ease';
        deleteLayer.style.transition = 'opacity 0.2s ease';
        let deltaY = currentY - startY;
        if (deltaY < -25) {
          card.style.transform = 'translateY(-60px)';
          deleteLayer.style.opacity = '1';
        } else {
          card.style.transform = 'translateY(0px)';
          deleteLayer.style.opacity = '0';
        }
      };
      
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
    
    // Wire Delete action
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this book?')) {
        const bookId = b.id;
        STATE.books = STATE.books.filter(x => x.id !== bookId);
        save();
        deleteFile(bookId).then(() => {
          renderBooks();
        });
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
// INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  BLOOM = $('nyvron-bloom-svg');
  // Theme selector
  const themeSel = $('settings-theme');
  const savedTheme = localStorage.getItem('nv-theme') || 'light';
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
      navigator.clipboard.writeText(`${title}\n\n${body}`).then(() => alert('Copied to clipboard!'));
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
      const title = file.name.replace(/\.[^/.]+$/, "");
      
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
            totalPages: Math.ceil(this.result.split(/\s+/).length / 200) || 1
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
      try {
        const card = e.target.closest('.book-cover-card');
        // If the card is swiped, clicking resets it
        if (card.style.transform === 'translateY(-60px)') {
          card.style.transform = 'translateY(0px)';
          const deleteLayer = card.previousElementSibling;
          if (deleteLayer) deleteLayer.style.opacity = '0';
          return;
        }
        const bid = card.dataset.id;
        const book = STATE.books.find(b => b.id === bid);
        if(book) {
          openBookReader(book);
        } else {
          console.warn("Book not found in STATE.books:", bid);
        }
      } catch (err) {
        alert("Error opening book reader: " + err.message + "\n" + err.stack);
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

  // Add countdown
  $('add-countdown-btn')?.addEventListener('click', () => {
    openModal('Set Countdown', `
      <input class="modal-input" id="cd-title-inp" placeholder="Countdown Title" autofocus style="margin-bottom:12px; width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:#fff;" />
      <input class="modal-input" id="cd-datetime-inp" type="datetime-local" style="margin-bottom:12px; width:100%; padding:10px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); color:#fff;" />
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
