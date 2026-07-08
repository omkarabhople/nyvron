import re

with open('/Users/onkarbhople/nyvron/frontend/index.html', 'r') as f:
    html = f.read()

# Add a flex container wrapper around cr-page-wrapper
original_wrapper = """        <div id="cr-page-wrapper" class="cr-page-wrapper">
          <!-- Real PDF page canvas layer -->
          <canvas id="cr-pdf-canvas" class="cr-pdf-canvas" width="600" height="780" style="position:absolute; left:0; top:0; z-index:1;"></canvas>
          <!-- Page text container -->
          <div id="cr-page-content" class="cr-page-content" style="position: absolute; inset: 0px; z-index: 2; background: none; padding: 0px; overflow: hidden;"></div>
          <!-- Drawing Canvas -->
          <canvas id="cr-markup-canvas" class="cr-markup-canvas cr-canvas" width="600" height="780" style="position:absolute; left:0; top:0; z-index:5;"></canvas>
        </div>"""

new_structure = """      <div id="cr-page-container" style="display: flex; gap: 20px; justify-content: center; align-items: center; transform-origin: center center; transition: transform 0.2s var(--spring);">
        <div id="cr-page-wrapper" class="cr-page-wrapper">
          <canvas id="cr-pdf-canvas" class="cr-pdf-canvas" width="600" height="780" style="position:absolute; left:0; top:0; z-index:1;"></canvas>
          <div id="cr-page-content" class="cr-page-content" style="position: absolute; inset: 0px; z-index: 2; background: none; padding: 0px; overflow: hidden;"></div>
          <canvas id="cr-markup-canvas" class="cr-markup-canvas cr-canvas" width="600" height="780" style="position:absolute; left:0; top:0; z-index:5;"></canvas>
        </div>
        <div id="cr-page-wrapper-right" class="cr-page-wrapper hidden">
          <canvas id="cr-pdf-canvas-right" class="cr-pdf-canvas" width="600" height="780" style="position:absolute; left:0; top:0; z-index:1;"></canvas>
          <div id="cr-page-content-right" class="cr-page-content" style="position: absolute; inset: 0px; z-index: 2; background: none; padding: 0px; overflow: hidden;"></div>
          <canvas id="cr-markup-canvas-right" class="cr-markup-canvas cr-canvas" width="600" height="780" style="position:absolute; left:0; top:0; z-index:5;"></canvas>
        </div>
      </div>"""

if 'cr-page-container' not in html:
    html = html.replace(original_wrapper, new_structure)

with open('/Users/onkarbhople/nyvron/frontend/index.html', 'w') as f:
    f.write(html)
