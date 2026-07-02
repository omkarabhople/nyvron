import re

with open('index.html', 'r') as f:
    content = f.read()

# We want to replace everything inside <div id="app"> ... </div> with our new layout
# But we need to keep the Right Card login panel HTML intact so we don't lose the login button logic.
login_panel_match = re.search(r'<!-- Right Card: The Login Panel -->(.*?)</div>\s*</div>\s*</div>\s*</body>', content, re.DOTALL)
if login_panel_match:
    login_panel_html = login_panel_match.group(1)
    # But wait, login_panel_html might have extra closing divs depending on my regex.
    # Let's just find the exact login panel div.
    login_start = content.find('<div style="flex:1.0; display:flex; flex-direction:column; justify-content:center; background:#1c1c1c;')
    if login_start != -1:
        login_html = content[login_start:content.find('</body>')]
        # Remove the last few closing divs of the old layout from login_html
        login_html = login_html.rsplit('</div>', 3)[0] + '</div>'
        
        # Now let's build the new layout
        new_layout = f"""  <div id="login-overlay" style="position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999; display:flex; background-color:#050505; overflow:hidden;">
    
    <!-- Left Area (Features Showcase) -->
    <div style="flex:1.5; display:flex; align-items:center; justify-content:center; position:relative;">
      
      <!-- Claude Orbs (Cloud AI movement) Background -->
      <div style="position:absolute; inset:0; z-index:1; pointer-events:none; overflow:hidden;">
        <div style="position:absolute; top:-20%; left:-10%; width:80vw; height:80vw; background:radial-gradient(circle, var(--cascara) 0%, transparent 60%); filter:blur(120px); opacity:0.05; animation: orbFloat1 20s infinite alternate ease-in-out;"></div>
        <div style="position:absolute; bottom:-20%; right:-10%; width:80vw; height:80vw; background:radial-gradient(circle, var(--blue) 0%, transparent 60%); filter:blur(120px); opacity:0.03; animation: orbFloat2 25s infinite alternate-reverse ease-in-out;"></div>
      </div>

      <!-- The AgentNEO style Card -->
      <div style="z-index:2; width:90%; max-width:850px; height:80vh; max-height:650px; background:#141414; border-radius:24px; border:1px solid #2a2a2a; display:flex; flex-direction:column; position:relative; box-shadow:0 30px 80px rgba(0,0,0,0.6); overflow:hidden;">
         
         <!-- Top Header -->
         <div style="padding:20px 30px; display:flex; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:11px; color:#666; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">POWERED BY <strong style="color:var(--cascara);">NYVRON</strong></span>
         </div>

         <div id="feature-slideshow" style="flex:1; position:relative; overflow:hidden; background:#111;">
            
            <!-- Slide 1: AI Prompt Processing -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; transition:opacity 1s; display:flex;">
               <!-- Left Pane -->
               <div style="flex:0.8; border-right:1px solid rgba(255,255,255,0.05); padding:30px; display:flex; flex-direction:column; gap:20px;">
                   <div style="display:flex; align-items:center; gap:12px;">
                     <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, var(--cascara), #FF9500); display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px; font-weight:bold; box-shadow:0 0 15px rgba(255,193,7,0.3);">N</div>
                     <div style="font-size:15px; color:var(--txt2);">I am ready to assist you.</div>
                   </div>
                   <div style="background:linear-gradient(135deg, #FF9500, var(--cascara)); color:#111; padding:18px 24px; border-radius:20px; border-top-left-radius:6px; font-size:15px; font-weight:500; align-self:flex-start; max-width:90%; box-shadow:0 10px 30px rgba(255,193,7,0.25); line-height:1.5;">
                     Schedule a deep work session for tomorrow based on my study patterns.
                   </div>
                   <div style="display:flex; flex-direction:column; gap:16px; margin-top:20px; padding-left:12px;">
                      <div style="display:flex; align-items:center; gap:12px; color:var(--txt2); font-size:14px;"><div style="width:20px; height:20px; border-radius:50%; background:var(--cascara); color:#111; display:flex; align-items:center; justify-content:center; font-size:11px;">✔</div> Understanding your request...</div>
                      <div style="display:flex; align-items:center; gap:12px; color:var(--txt2); font-size:14px;"><div style="width:20px; height:20px; border-radius:50%; background:var(--cascara); color:#111; display:flex; align-items:center; justify-content:center; font-size:11px;">✔</div> Analyzing study tracker data...</div>
                      <div style="display:flex; align-items:center; gap:12px; color:var(--txt2); font-size:14px;"><div style="width:20px; height:20px; border-radius:50%; border:2px solid var(--cascara); border-top-color:transparent; animation:spin 1s linear infinite;"></div> Finding optimal focus blocks...</div>
                   </div>
                   <div style="margin-top:auto;">
                      <div style="background:#0a0a0a; border:1px solid #222; border-radius:12px; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; opacity:0.6;">
                         <div style="color:#555; font-size:14px;">Describe your task...</div>
                         <div style="width:28px; height:28px; border-radius:50%; background:#222; color:#666; display:flex; align-items:center; justify-content:center; font-weight:bold;">↑</div>
                      </div>
                   </div>
               </div>
               <!-- Right Pane -->
               <div style="flex:1.2; padding:40px; display:flex; flex-direction:column; gap:40px; background:#111;">
                   <div>
                     <div style="font-size:11px; color:var(--cascara); font-weight:700; letter-spacing:1px; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
                       <div style="width:6px; height:6px; border-radius:50%; background:var(--cascara);"></div> DATA INTEGRATION
                     </div>
                     <div style="display:flex; align-items:center; gap:20px; background:#1a1a1a; border:1px solid #2a2a2a; padding:20px; border-radius:16px; margin-bottom:16px;">
                       <div style="width:48px; height:48px; border-radius:12px; background:rgba(39, 201, 63, 0.1); display:flex; align-items:center; justify-content:center; font-size:22px;">📊</div>
                       <div style="flex:1;">
                         <div style="font-size:15px; font-weight:600; color:var(--txt1);">Study Tracker Data</div>
                         <div style="font-size:13px; color:var(--txt3); margin-top:4px;">Peak focus time: 9:00 AM - 11:30 AM</div>
                       </div>
                       <div style="color:var(--cascara);">✔</div>
                     </div>
                     <div style="display:flex; align-items:center; gap:20px; background:#1a1a1a; border:1px solid #2a2a2a; padding:20px; border-radius:16px;">
                       <div style="width:48px; height:48px; border-radius:12px; background:rgba(74, 144, 226, 0.1); display:flex; align-items:center; justify-content:center; font-size:22px;">📅</div>
                       <div style="flex:1;">
                         <div style="font-size:15px; font-weight:600; color:var(--txt1);">Calendar Sync</div>
                         <div style="font-size:13px; color:var(--txt3); margin-top:4px;">Checking tomorrow's schedule...</div>
                       </div>
                     </div>
                   </div>
               </div>
            </div>

            <!-- Slide 2: Study Tracker Summary -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; transition:opacity 1s; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                <div style="text-align:center; margin-bottom:40px;">
                   <div style="font-size:32px; margin-bottom:16px;">📈</div>
                   <h3 style="color:#fff; font-size:28px; font-weight:600; margin-bottom:12px;">Study Tracker</h3>
                   <div style="color:var(--txt2); font-size:16px;">Visualizing your learning progress</div>
                </div>
                <div style="display:flex; gap:20px; justify-content:center; width:80%;">
                  <div style="flex:1; background:#1a1a1a; padding:30px; border-radius:20px; border:1px solid #2a2a2a; text-align:center;">
                    <div style="color:var(--txt3); font-size:12px; text-transform:uppercase; font-weight:700; margin-bottom:16px; letter-spacing:1px;">Physics</div>
                    <div style="color:#4a90e2; font-size:32px; font-weight:800;">6h 30m</div>
                  </div>
                  <div style="flex:1; background:#1a1a1a; padding:30px; border-radius:20px; border:1px solid #2a2a2a; text-align:center; position:relative; overflow:hidden;">
                    <div style="position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,193,7,0.1), transparent); pointer-events:none;"></div>
                    <div style="color:var(--txt3); font-size:12px; text-transform:uppercase; font-weight:700; margin-bottom:16px; letter-spacing:1px;">Math</div>
                    <div style="color:var(--cascara); font-size:32px; font-weight:800;">4h 15m</div>
                  </div>
                  <div style="flex:1; background:#1a1a1a; padding:30px; border-radius:20px; border:1px solid #2a2a2a; text-align:center;">
                    <div style="color:var(--txt3); font-size:12px; text-transform:uppercase; font-weight:700; margin-bottom:16px; letter-spacing:1px;">CS</div>
                    <div style="color:#27c93f; font-size:32px; font-weight:800;">4h 15m</div>
                  </div>
                </div>
            </div>
            
            <!-- Slide 3: Smart Reader -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; transition:opacity 1s; display:flex; align-items:center; justify-content:center;">
                <div style="display:flex; background:#fdf6e3; border-radius:24px; padding:40px; box-shadow:0 30px 60px rgba(0,0,0,0.5); align-items:center; gap:40px; width:80%;">
                  <div style="width:140px; height:200px; background:linear-gradient(135deg, #2c3e50, #3498db); border-radius:8px; box-shadow:8px 16px 30px rgba(0,0,0,0.3); flex-shrink:0;"></div>
                  <div style="flex:1;">
                    <div style="color:#d35400; font-size:13px; text-transform:uppercase; font-weight:800; letter-spacing:2px; margin-bottom:12px;">Smart Reader</div>
                    <strong style="color:#222; font-size:32px; font-family:serif; display:block; margin-bottom:16px;">Deep Work</strong>
                    <div style="font-size:16px; color:#555; line-height:1.7; font-family:serif; margin-bottom:24px;">Professional activities performed in a state of distraction-free concentration that push your cognitive capabilities to their limit.</div>
                    <div style="width:100%; height:6px; background:rgba(0,0,0,0.1); border-radius:3px;">
                      <div style="width:65%; height:100%; background:#d35400; border-radius:3px; box-shadow:0 0 10px rgba(211,84,0,0.5);"></div>
                    </div>
                    <div style="font-size:13px; font-weight:600; color:#888; margin-top:12px; text-align:right;">65% Completed</div>
                  </div>
                </div>
            </div>

         </div>
      </div>
    </div>

    <!-- Right Area (Login Form) -->
    <div style="flex:1; max-width:450px; display:flex; flex-direction:column; justify-content:center; padding:60px; background:#050505; border-left:1px solid rgba(255,255,255,0.05); z-index:10;">
"""
        
        # We need to change the style of the login_html slightly to match the Arahi style (no card background, just directly on black)
        # Login html starts with `<div style="flex:1.0; ...">`
        # We will strip out the background:#1c1c1c; border:1px solid #2a2a2a; padding:60px 80px; from the first div
        login_html = re.sub(r'<div style="flex:1\.0[^>]*>', '<div style="width:100%;">', login_html, count=1)
        
        new_content = content[:content.find('<div id="app">')+14] + '\n' + new_layout + '\n' + login_html + '\n  </div>\n  <script>\n    setInterval(() => {\n      const slides = document.querySelectorAll(".sim-slide");\n      if(!slides.length) return;\n      let active = Array.from(slides).findIndex(s => s.style.opacity === "1");\n      if(active === -1) active = 0;\n      slides[active].style.opacity = "0";\n      slides[active].style.zIndex = "1";\n      let next = (active + 1) % slides.length;\n      slides[next].style.opacity = "1";\n      slides[next].style.zIndex = "2";\n    }, 4000);\n    document.querySelector(".sim-slide").style.opacity = "1";\n    document.querySelector(".sim-slide").style.zIndex = "2";\n  </script>\n</div>\n</body>\n</html>'
        
        with open('index.html', 'w') as f:
            f.write(new_content)
        print("Success")
    else:
        print("Login html not found")
else:
    print("Regex match failed")
