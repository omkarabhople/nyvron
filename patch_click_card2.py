import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

pattern = re.compile(r"document\.querySelectorAll\('\.book-cover-card'\)\.forEach\(c => c\.style\.viewTransitionName = ''\);\n\s*card\.style\.viewTransitionName = 'reader-overlay';", re.MULTILINE | re.DOTALL)

# Fix the bug by not assigning `reader-overlay` to the card if the overlay also gets it (this causes Duplicate view-transition-name error)
# We can use a different name like `active-book-card`
new_inner = """
      document.querySelectorAll('.book-cover-card').forEach(c => c.style.viewTransitionName = '');
      card.style.viewTransitionName = 'active-book-card';
"""
js = pattern.sub(new_inner, js)

with open('frontend/app.js', 'w') as f:
    f.write(js)
