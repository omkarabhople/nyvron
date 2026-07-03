import re

with open('/Users/onkarbhople/nyvron/frontend/app.js', 'r') as f:
    js = f.read()

# Add setupSwipeGesture function at the top of app.js (after variables)
swipe_fn = """
// --- Swipe Gesture Utility ---
function setupSwipeGesture(element, options = {}) {
  const {
    direction = 'x', // 'x' or 'y'
    maxDistance = -80,
    containerSelector = '.swipe-content',
    deleteLayerSelector = '.book-delete-layer' // for y direction
  } = options;
  
  const content = element.querySelector(containerSelector);
  const deleteLayer = element.querySelector(deleteLayerSelector);
  if (!content) return;
  
  let startVal = 0;
  let currentVal = 0;
  let isDragging = false;
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
  
  const handleStart = (val) => {
    startVal = val;
    currentVal = 0;
    isDragging = false;
    setTransform(0, true);
  };
  
  const handleMove = (val) => {
    const delta = val - startVal;
    if (Math.abs(delta) > 10) isDragging = true;
    if (isDragging && delta < 0 && delta > maxDistance - 20) {
      currentVal = delta;
      setTransform(delta, true);
    }
  };
  
  const handleEnd = () => {
    if (!isDragging) return;
    if (currentVal < maxDistance / 2) {
      currentVal = maxDistance;
    } else {
      currentVal = 0;
    }
    setTransform(currentVal, false);
  };

  // Touch
  element.addEventListener('touchstart', e => {
    if (e.target.closest('button, .rem-check, .book-dots-btn')) return;
    handleStart(direction === 'x' ? e.touches[0].clientX : e.touches[0].clientY);
  }, {passive: true});
  element.addEventListener('touchmove', e => {
    if (e.target.closest('button, .rem-check, .book-dots-btn')) return;
    handleMove(direction === 'x' ? e.touches[0].clientX : e.touches[0].clientY);
  }, {passive: true});
  element.addEventListener('touchend', e => {
    if (e.target.closest('button, .rem-check, .book-dots-btn')) return;
    handleEnd();
  });

  // Mouse
  element.addEventListener('mousedown', e => {
    if (e.target.closest('button, .rem-check, .book-dots-btn')) return;
    handleStart(direction === 'x' ? e.clientX : e.clientY);
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
    if (e.target.closest('.jw-body, .scroll-area')) return; // prevent interference with normal scrolling elements
    const delta = direction === 'x' ? e.deltaX : e.deltaY;
    const crossDelta = direction === 'x' ? e.deltaY : e.deltaX;
    
    // Only intercept if we're swiping mostly in the target direction
    if (Math.abs(delta) > Math.abs(crossDelta) && Math.abs(delta) > 5) {
      e.preventDefault();
      currentVal -= delta;
      if (currentVal > 0) currentVal = 0;
      if (currentVal < maxDistance - 20) currentVal = maxDistance - 20;
      
      setTransform(currentVal, true);
      
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        isDragging = true; // fake drag so handleEnd works
        handleEnd();
      }, 50);
    }
  }, {passive: false}); // passive false needed for preventDefault
}
"""

js = js.replace('// --- Utils ---', '// --- Utils ---\n' + swipe_fn)

# Now remove the duplicate swipe logic from app.js and replace Delete buttons with SVG
svg_trash = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'

# Schedule
js = re.sub(
    r'<button class="rem-del-swipe" data-id="\$\{s\.id\}" data-type="schedule" aria-label="Delete">Delete</button>.*?window\.addEventListener\(\'mouseup\', onMouseUp\);\n    }\);\n',
    f'<button class="rem-del-swipe" data-id="${{s.id}}" data-type="schedule" aria-label="Delete">{svg_trash}</button>\n    `;\n    setupSwipeGesture(li, {{ direction: \'x\', maxDistance: -80 }});\n',
    js, flags=re.DOTALL
)

# Priorities
js = re.sub(
    r'<button class="rem-del-swipe" data-id="\$\{p\.id\}" aria-label="Delete">Delete</button>.*?window\.addEventListener\(\'mouseup\', onMouseUp\);\n    }\);\n',
    f'<button class="rem-del-swipe" data-id="${{p.id}}" aria-label="Delete">{svg_trash}</button>\n    `;\n    setupSwipeGesture(li, {{ direction: \'x\', maxDistance: -80 }});\n',
    js, flags=re.DOTALL
)

# Reminders
js = re.sub(
    r'<button class="rem-del-swipe" data-id="\$\{r\.id\}" aria-label="Delete">Delete</button>.*?window\.addEventListener\(\'mouseup\', onMouseUp\);\n    }\);\n',
    f'<button class="rem-del-swipe" data-id="${{r.id}}" aria-label="Delete">{svg_trash}</button>\n    `;\n    setupSwipeGesture(li, {{ direction: \'x\', maxDistance: -80 }});\n',
    js, flags=re.DOTALL
)

# Calendar
js = re.sub(
    r'<button class="rem-del-swipe" data-id="\$\{ev\.id\}" data-type="calevent" aria-label="Delete">Delete</button>.*?window\.addEventListener\(\'mouseup\', onMouseUp\);\n    }\);\n',
    f'<button class="rem-del-swipe" data-id="${{ev.id}}" data-type="calevent" aria-label="Delete">{svg_trash}</button>\n    `;\n    setupSwipeGesture(li, {{ direction: \'x\', maxDistance: -80 }});\n',
    js, flags=re.DOTALL
)

# Journal Entry - this will be fully rewritten later, so I might skip it or just do the simple fix for now. I'll leave journal alone for now since I'm rewriting it in the next step anyway.

with open('/Users/onkarbhople/nyvron/frontend/app.js', 'w') as f:
    f.write(js)
