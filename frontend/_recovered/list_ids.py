import re

html_path = '/Users/onkarbhople/nyvron/frontend/index.html'
with open(html_path, 'r') as f:
    content = f.read()

# Find all id="..."
ids = set(re.findall(r'id="([^"]+)"', content))
print("Found IDs:")
for i in sorted(ids):
    print(i)
