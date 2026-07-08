import re

with open('index.html', 'r') as f:
    content = f.read()

# Extract agent-sim-container HTML
start = content.find('<div id="agent-sim-container"')
end = content.find('</script>', start) + 9

if start == -1 or end == 8:
    print("Could not find agent-sim-container")
    exit(1)

sim_html = content[start:end]

# Extract login form HTML
login_start = content.find('<!-- Right Card: The Login Panel -->')
login_end = content.find('</body>')

if login_start == -1 or login_end == -1:
    print("Could not find login panel")
    exit(1)

login_html = content[login_start:login_end]
# Keep only up to the last few closing divs


# Strip the background and padding from the login panel's first div, to match Arahi's sleek look
login_html = re.sub(r'<div style="flex:1\.0; display:flex; flex-direction:column; justify-content:center; background:#1c1c1c; border-radius:16px; border:1px solid #2a2a2a; padding:60px 80px;">', 
                    '<div style="width:100%;">', login_html, count=1)

# Build the new layout
new_layout = f"""  <div id="login-overlay" style="position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999; display:flex; background-color:#050505; overflow:hidden; font-family:var(--font);">
    
    <!-- Left Area (Features Showcase) -->
    <div style="flex:1.8; display:flex; align-items:center; justify-content:center; position:relative;">
      
      <!-- Subtle Background Glow -->
      <div style="position:absolute; inset:0; z-index:1; pointer-events:none; overflow:hidden;">
        <div style="position:absolute; top:-20%; left:-10%; width:80vw; height:80vw; background:radial-gradient(circle, var(--cascara) 0%, transparent 60%); filter:blur(120px); opacity:0.04; animation: orbFloat1 20s infinite alternate ease-in-out;"></div>
      </div>

      <!-- The AgentNEO style Card -->
      <div style="z-index:2; width:90%; max-width:850px; height:80vh; max-height:650px; background:#111111; border-radius:24px; border:1px solid #222; display:flex; flex-direction:column; position:relative; box-shadow:0 30px 80px rgba(0,0,0,0.8); overflow:hidden;">
         
         <!-- Top Header -->
         <div style="padding:20px 30px; display:flex; align-items:center; border-bottom:1px solid rgba(255,255,255,0.03);">
            <span style="font-size:11px; color:#666; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">POWERED BY <strong style="color:var(--cascara);">NYVRON</strong></span>
         </div>

         <!-- Slideshow Container -->
         <div id="feature-slideshow" style="flex:1; position:relative; overflow:hidden; background:#111;">
            
            <!-- Slide 1: AI Prompt Processing (The Sim we built) -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; z-index:1; transition:opacity 1s, transform 1.5s; transform:scale(1.02);">
               {sim_html}
            </div>

            <!-- Slide 2: Study Tracker Summary -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; z-index:1; transition:opacity 1s, transform 1.5s; transform:scale(1.02); display:flex; align-items:center; justify-content:center; flex-direction:column; padding:40px;">
                <div style="text-align:center; margin-bottom:40px;">
                   <div style="font-size:32px; margin-bottom:16px;">📈</div>
                   <h3 style="color:#fff; font-size:28px; font-weight:600; margin-bottom:12px;">Study Tracker</h3>
                   <div style="color:var(--txt2); font-size:16px;">Visualizing your learning progress</div>
                </div>
                <div style="display:flex; gap:20px; justify-content:center; width:100%;">
                  <div style="flex:1; background:#181818; padding:30px; border-radius:20px; border:1px solid #222; text-align:center;">
                    <div style="color:var(--txt3); font-size:12px; text-transform:uppercase; font-weight:700; margin-bottom:16px; letter-spacing:1px;">Physics</div>
                    <div style="color:#4a90e2; font-size:32px; font-weight:800;">6h 30m</div>
                  </div>
                  <div style="flex:1; background:#181818; padding:30px; border-radius:20px; border:1px solid #222; text-align:center; position:relative; overflow:hidden; box-shadow: 0 10px 30px rgba(255,193,7,0.05);">
                    <div style="position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,193,7,0.05), transparent); pointer-events:none;"></div>
                    <div style="color:var(--txt3); font-size:12px; text-transform:uppercase; font-weight:700; margin-bottom:16px; letter-spacing:1px;">Math</div>
                    <div style="color:var(--cascara); font-size:32px; font-weight:800;">4h 15m</div>
                  </div>
                  <div style="flex:1; background:#181818; padding:30px; border-radius:20px; border:1px solid #222; text-align:center;">
                    <div style="color:var(--txt3); font-size:12px; text-transform:uppercase; font-weight:700; margin-bottom:16px; letter-spacing:1px;">CS</div>
                    <div style="color:#27c93f; font-size:32px; font-weight:800;">4h 15m</div>
                  </div>
                </div>
            </div>
            
            <!-- Slide 3: Smart Reader -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; z-index:1; transition:opacity 1s, transform 1.5s; transform:scale(1.02); display:flex; align-items:center; justify-content:center;">
                <div style="display:flex; background:#181818; border:1px solid #222; border-radius:24px; padding:40px; box-shadow:0 30px 60px rgba(0,0,0,0.4); align-items:center; gap:40px; width:80%;">
                  <div style="width:140px; height:200px; background:linear-gradient(135deg, #2c3e50, #3498db); border-radius:8px; box-shadow:8px 16px 30px rgba(0,0,0,0.3); flex-shrink:0;"></div>
                  <div style="flex:1;">
                    <div style="color:var(--cascara); font-size:12px; text-transform:uppercase; font-weight:800; letter-spacing:2px; margin-bottom:12px;">Smart Reader</div>
                    <strong style="color:var(--txt1); font-size:32px; font-family:serif; display:block; margin-bottom:16px;">Deep Work</strong>
                    <div style="font-size:15px; color:var(--txt2); line-height:1.7; font-family:serif; margin-bottom:24px;">Professional activities performed in a state of distraction-free concentration that push your cognitive capabilities to their limit.</div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px;">
                      <div style="width:65%; height:100%; background:var(--cascara); border-radius:3px; box-shadow:0 0 10px rgba(255,193,7,0.5);"></div>
                    </div>
                    <div style="font-size:13px; font-weight:600; color:var(--txt3); margin-top:12px; text-align:right;">65% Completed</div>
                  </div>
                </div>
            </div>

         </div>
      </div>
    </div>

    <!-- Right Area (Login Form) -->
    <div style="flex:1; max-width:450px; display:flex; flex-direction:column; justify-content:center; padding:60px; background:#050505; border-left:1px solid rgba(255,255,255,0.03); z-index:10;">
"""

slideshow_script = """
  </div>
  <script>
    // Handle the loop for our slides
    (function() {
      const slides = document.querySelectorAll('.sim-slide');
      if(!slides || slides.length === 0) return;
      
      let currentIdx = 0;
      
      function showSlide(idx) {
        slides.forEach((s, i) => {
           if(i === idx) {
              s.style.opacity = "1";
              s.style.zIndex = "2";
              s.style.transform = "scale(1)";
           } else {
              s.style.opacity = "0";
              s.style.zIndex = "1";
              s.style.transform = "scale(1.02)";
           }
        });
      }
      
      // Initialize first slide
      showSlide(0);
      
      // The first slide is the interactive simulation. It takes about 11 seconds to run through.
      // We will loop every 12 seconds.
      setInterval(() => {
         currentIdx = (currentIdx + 1) % slides.length;
         showSlide(currentIdx);
      }, 12000);
      
    })();
  </script>
</div>
</body>
</html>
"""

new_content = content[:content.find('<div id="app">')+14] + '\n' + new_layout + '\n' + login_html + '\n' + slideshow_script

with open('index.html', 'w') as f:
    f.write(new_content)
    
print("Successfully replaced layout!")
