import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

# 1. Update `updateDockIndicator`
new_dock_indicator = """function updateDockIndicator(tabId) {
  const btn = document.querySelector(`.tb-item[data-tab="${tabId}"]`);
  const ind = document.getElementById('dock-indicator');
  if(btn && ind) {
    const left = btn.offsetLeft;
    const width = btn.offsetWidth;
    const currentLeft = parseFloat(ind.style.transform.replace(/[^0-9.-]/g, '')) || 0;

    // Stretch effect
    const distance = Math.abs(left - 6 - currentLeft);
    if (distance > 10) {
        ind.style.width = `${width + distance * 0.2}px`;
        if (left - 6 > currentLeft) {
             ind.style.transformOrigin = 'left center';
        } else {
             ind.style.transformOrigin = 'right center';
        }
    }

    setTimeout(() => {
        ind.style.transform = `translateX(${left - 6}px)`;
        ind.style.width = `${width}px`;
    }, 50);
  }
}"""

js = re.sub(r'function updateDockIndicator\(tabId\) \{.*?^\}', new_dock_indicator, js, flags=re.MULTILINE | re.DOTALL)

with open('frontend/app.js', 'w') as f:
    f.write(js)
