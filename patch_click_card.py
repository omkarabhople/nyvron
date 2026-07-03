import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

pattern = re.compile(r"card\.onclick\s*=\s*\(\)\s*=>\s*\{(.*?^\s*)\};", re.MULTILINE | re.DOTALL)
match = pattern.search(js)

if match:
    inner = match.group(1)
    if "openBookReader" in inner:
        new_inner = """
      document.querySelectorAll('.book-cover-card').forEach(c => c.style.viewTransitionName = '');
      card.style.viewTransitionName = 'reader-overlay';
""" + inner
        js = js[:match.start(1)] + new_inner + js[match.end(1):]

with open('frontend/app.js', 'w') as f:
    f.write(js)
