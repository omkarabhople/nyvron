import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

new_card_setup = """    card.className = 'book-cover-card';
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
"""

js = js.replace("    card.className = 'book-cover-card';\n    card.dataset.id = b.id;", new_card_setup)

with open('frontend/app.js', 'w') as f:
    f.write(js)
