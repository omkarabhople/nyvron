import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

# Remove the red color set to allow the CSS to shine through
js = js.replace("micBtn.style.color = '#ff3b30';", "micBtn.style.color = '#ffffff';")
js = js.replace("micBtn.style.color = '';", "micBtn.style.color = '';")

with open('frontend/app.js', 'w') as f:
    f.write(js)
