import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

# Replace the single click card flip with drag logic and double-tap to flip
card_logic_pattern = re.compile(r"\$\('fc-carousel-card'\)\.onclick\s*=\s*\(\)\s*=>\s*\{(.*?^\s*)\};", re.MULTILINE | re.DOTALL)

new_card_logic = """
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
"""

js = card_logic_pattern.sub(new_card_logic, js)

with open('frontend/app.js', 'w') as f:
    f.write(js)
