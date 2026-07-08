import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

pattern = re.compile(r"function openBookReader\(book\) \{(.*?^\})", re.MULTILINE | re.DOTALL)
match = pattern.search(js)

if match:
    body = match.group(1)

    # We'll inject startViewTransition inside the logic that removes 'hidden' from overlay
    # Find `overlay.classList.remove('hidden');`

    replacement = """
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
"""

    body = body.replace("  overlay.classList.remove('hidden');\n  document.querySelector('.tab-bar')?.classList.add('hidden');", replacement)

    js = js[:match.start(1)] + body + js[match.end(1):]

with open('frontend/app.js', 'w') as f:
    f.write(js)
