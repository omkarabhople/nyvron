import re

with open('index.html', 'r') as f:
    content = f.read()

# 1. Update the Smart Reader slide (Slide 3)
old_slide_3_start = content.find('<!-- Slide 3: Smart Reader -->')
old_slide_3_end = content.find('<!-- Slide 4: Cascara Quick Answer -->')

if old_slide_3_start != -1 and old_slide_3_end != -1:
    new_slide_3 = """            <!-- Slide 3: Cascara Reader -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; z-index:1; transition:opacity 1s, transform 1.5s; transform:scale(1.02); display:flex; align-items:center; justify-content:center; flex-direction:column;">
                <div style="text-align:center; margin-bottom:30px;">
                   <h3 style="color:#fff; font-size:28px; font-weight:600; margin-bottom:8px;"><span style="color:var(--cascara);">Cascara</span> Reader</h3>
                   <div style="color:var(--txt2); font-size:16px;">Advanced iPad-style document interaction</div>
                </div>
                
                <div style="background:#0a0a0a; border:1px solid #2a2a2a; border-radius:20px; width:85%; height:320px; box-shadow:0 30px 60px rgba(0,0,0,0.6); display:flex; flex-direction:column; overflow:hidden;">
                  
                  <!-- Toolbar -->
                  <div style="background:#141414; border-bottom:1px solid #2a2a2a; padding:12px 20px; display:flex; justify-content:space-between; align-items:center;">
                     <div style="display:flex; gap:12px; align-items:center;">
                       <span style="color:var(--txt1); font-weight:600; font-size:13px;">Deep_Work.pdf</span>
                     </div>
                     
                     <div style="display:flex; gap:16px; align-items:center;">
                       <div style="width:16px; height:16px; border-radius:4px; border:2px solid #555; display:flex; align-items:center; justify-content:center; color:#555; font-size:10px; font-weight:bold;">T</div>
                       <div style="width:14px; height:14px; border-radius:50%; background:#ffd54f; box-shadow:0 0 8px rgba(255,213,79,0.5);"></div>
                       <div style="width:14px; height:14px; border-radius:50%; background:#81c784;"></div>
                       <div style="width:14px; height:14px; border-radius:50%; background:#64b5f6;"></div>
                       <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--txt2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                       <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--cascara)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                     </div>
                  </div>
                  
                  <!-- Document Content Mock -->
                  <div style="flex:1; background:#fdf6e3; padding:30px 40px; position:relative; overflow:hidden;">
                    <div style="width:70%; font-family:serif; font-size:16px; color:#2c3e50; line-height:1.8;">
                      To produce at your peak level you need to work for extended periods with full concentration on a single task free from distraction. Put another way, the type of work that optimizes your performance is <span style="background:rgba(255,213,79,0.4); padding:2px 4px; border-radius:4px;">deep work</span>. 
                      <br><br>
                      If you're not comfortable going deep for extended periods of time, it'll be difficult to get your performance to the maximum levels of quality and quantity...
                    </div>
                    
                    <!-- Floating Speech Widget Mock -->
                    <div style="position:absolute; bottom:20px; right:20px; background:#fff; border-radius:12px; padding:12px 16px; box-shadow:0 10px 30px rgba(0,0,0,0.15); display:flex; align-items:center; gap:16px; border:1px solid #eaeaea;">
                      <div style="width:36px; height:36px; border-radius:50%; background:var(--cascara); display:flex; align-items:center; justify-content:center; color:#fff;">
                         <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                      <div>
                        <div style="font-size:12px; font-weight:700; color:#555;">SPEECH READER</div>
                        <div style="font-size:10px; color:#888;">Playing page 14...</div>
                      </div>
                      <div style="display:flex; gap:3px; align-items:flex-end; height:16px; margin-left:8px;">
                         <div style="width:3px; height:60%; background:var(--cascara); animation: wave 1s infinite ease-in-out;"></div>
                         <div style="width:3px; height:100%; background:var(--cascara); animation: wave 1s infinite ease-in-out 0.2s;"></div>
                         <div style="width:3px; height:40%; background:var(--cascara); animation: wave 1s infinite ease-in-out 0.4s;"></div>
                         <div style="width:3px; height:80%; background:var(--cascara); animation: wave 1s infinite ease-in-out 0.1s;"></div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            """
    content = content[:old_slide_3_start] + new_slide_3 + content[old_slide_3_end:]
else:
    print("Could not find Slide 3")


# 2. Update the javascript loop at the bottom
old_script_start = content.find('<script>\n    // Handle the loop for our slides')
if old_script_start != -1:
    old_script_end = content.find('</script>', old_script_start) + 9
    new_script = """<script>
    // Handle the loop for our slides with variable durations
    (function() {
      const slides = document.querySelectorAll('.sim-slide');
      if(!slides || slides.length === 0) return;
      
      let currentIdx = 0;
      
      // Slide durations in ms. Slide 1 (AI Sim) needs 12s. The rest are quick 4s features.
      const durations = [12000, 4500, 4500, 4500, 4500];
      
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
      
      function loopSlides() {
         let duration = durations[currentIdx] || 4500;
         setTimeout(() => {
            currentIdx = (currentIdx + 1) % slides.length;
            showSlide(currentIdx);
            loopSlides();
         }, duration);
      }
      
      loopSlides();
      
    })();
  </script>
  <style>
    @keyframes wave {
      0%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(0.4); }
    }
  </style>"""
    
    content = content[:old_script_start] + new_script + content[old_script_end:]
else:
    print("Could not find script block")


with open('index.html', 'w') as f:
    f.write(content)

print("Updated book reader and durations!")
