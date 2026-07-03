import re

with open('frontend/styles.css', 'r') as f:
    css = f.read()

# 2. Update dock css
new_dock_css = """.dock-indicator { position: absolute; top: 6px; bottom: 6px; left: 6px; width: 0px; border-radius: 50%; background: rgba(255, 255, 255, 0.12); box-shadow: rgba(255, 255, 255, 0.05) 0px 0px 0px 1px inset; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none; z-index: 1; }
.tb-item { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: var(--txt3); transition: all .3s var(--spring); z-index: 1; }
.tb-item svg, .tb-item img { transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.tb-item:hover svg, .tb-item:hover img { transform: scale(1.1); color: var(--txt1); }
.tb-item:active svg, .tb-item:active img { transform: scale(0.9); }
"""

css = re.sub(r'\.dock-indicator \{.*?\}\n\.tb-item \{.*?\}', new_dock_css, css, flags=re.MULTILINE | re.DOTALL)

with open('frontend/styles.css', 'w') as f:
    f.write(css)
