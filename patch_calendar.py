import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

new_render_cal_events = """function renderCalEvents(dateStr){
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
           id: entry.id
       });
    }
  });

  if(!allEvents.length){empty?.classList.remove('hidden');return;}
  empty?.classList.add('hidden');

  // Sort by time conceptually (if time exists, else just append)
  // For simplicity, just render them in order

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
"""

js = re.sub(r'function renderCalEvents\(dateStr\)\{.*?^\}', new_render_cal_events, js, flags=re.MULTILINE | re.DOTALL)

with open('frontend/app.js', 'w') as f:
    f.write(js)
