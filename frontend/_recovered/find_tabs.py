import re

html_path = '/Users/onkarbhople/nyvron/frontend/_recovered/recovered_page_1783030855.html'
with open(html_path, 'r') as f:
    content = f.read()

# find divs with class tab or containing screen- or tab-
matches = re.findall(r'<div[^>]*id="([^"]+)"[^>]*class="[^"]*tab[^"]*"', content)
print("Tab elements in recovered HTML:")
for m in matches:
    print(m)

# Find any overlays
matches2 = re.findall(r'<div[^>]*id="([^"]+)"[^>]*style="[^"]*fixed[^"]*"', content)
print("\nFixed position divs:")
for m in matches2:
    print(m)
