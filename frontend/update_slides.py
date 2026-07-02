import re

with open('index.html', 'r') as f:
    content = f.read()

# 1. Replace the outer header with Mac buttons
outer_header = """         <!-- Top Header -->
         <div style="padding:20px 30px; display:flex; align-items:center; border-bottom:1px solid rgba(255,255,255,0.03);">
            <span style="font-size:11px; color:#666; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">POWERED BY <strong style="color:var(--cascara);">NYVRON</strong></span>
         </div>"""
         
mac_buttons = """         <!-- Mac Window Buttons -->
         <div style="padding:20px 24px; display:flex; align-items:center; gap:8px; border-bottom:1px solid rgba(255,255,255,0.03);">
            <div style="width:12px; height:12px; border-radius:50%; background:#ff5f56;"></div>
            <div style="width:12px; height:12px; border-radius:50%; background:#ffbd2e;"></div>
            <div style="width:12px; height:12px; border-radius:50%; background:#27c93f;"></div>
         </div>"""

content = content.replace(outer_header, mac_buttons)

# 2. Update the inner header (Since we removed the outer header, the inner header is now the only one, which is good).

# 3. Use the wheel animation for typing effect
old_processing = """                   <div style="display:flex; align-items:center; gap:12px;">
                     <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, var(--cascara), #FF9500); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:bold;">N</div>
                     <div style="font-size:14px; color:var(--txt2);">Processing request...</div>
                   </div>"""

new_processing = """                   <div style="display:flex; align-items:center; gap:12px;">
                     <div class="bloom-mini" style="width:24px; height:24px; display:inline-block;">
                       <svg viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg">
                         <g class="bloom-inner-mini" style="animation: spin 3s linear infinite; transform-origin:center;">
                           <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71"/>
                           <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(60)"/>
                           <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71" transform="rotate(120)"/>
                           <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(180)"/>
                           <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#2ECC71" transform="rotate(240)"/>
                           <path d="M0,0 C-4,-7 4,-7 0,-16 C6,-9 6,-4 0,0" fill="#52D68A" transform="rotate(300)"/>
                         </g>
                       </svg>
                     </div>
                     <div style="font-size:14px; color:var(--txt2); display:flex; align-items:center;">
                        Processing request<span class="typing-dots"><span class="td1"></span><span class="td2"></span><span class="td3"></span></span>
                     </div>
                   </div>"""

content = content.replace(old_processing, new_processing)

# 4. Add Cascara and Journal slides
# We find the end of Slide 3 which ends with:
slide_3_end = """                </div>
            </div>"""

cascara_and_journal_slides = """
            <!-- Slide 4: Cascara Quick Answer -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; z-index:1; transition:opacity 1s, transform 1.5s; transform:scale(1.02); display:flex; align-items:center; justify-content:center; flex-direction:column;">
                <div style="text-align:center; margin-bottom:40px;">
                   <h3 style="color:#fff; font-size:28px; font-weight:600; margin-bottom:12px;"><span style="color:var(--cascara);">Cascara</span> Quick Answer</h3>
                   <div style="color:var(--txt2); font-size:16px;">Instant AI-powered insights</div>
                </div>
                <div style="background:#181818; border:1px solid #2a2a2a; border-radius:24px; padding:30px; width:80%; max-width:600px; box-shadow:0 30px 60px rgba(0,0,0,0.5);">
                   <div style="font-size:18px; font-weight:600; color:var(--txt1); margin-bottom:16px; display:flex; gap:12px; align-items:center;">
                     <div style="width:24px; height:24px; border-radius:50%; background:var(--cascara);"></div>
                     Explain Quantum Entanglement
                   </div>
                   <div style="font-size:15px; color:var(--txt2); line-height:1.6;">
                     Quantum entanglement is a physical phenomenon that occurs when a group of particles are generated, interact, or share spatial proximity in a way such that the quantum state of each particle cannot be described independently of the state of the others, including when the particles are separated by a large distance.
                   </div>
                </div>
            </div>

            <!-- Slide 5: Journal -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; z-index:1; transition:opacity 1s, transform 1.5s; transform:scale(1.02); display:flex; align-items:center; justify-content:center; flex-direction:column;">
                <div style="text-align:center; margin-bottom:40px;">
                   <div style="font-size:32px; margin-bottom:16px;">📝</div>
                   <h3 style="color:#fff; font-size:28px; font-weight:600; margin-bottom:12px;">Nyvron Journal</h3>
                   <div style="color:var(--txt2); font-size:16px;">Reflect on your daily progress</div>
                </div>
                <div style="background:#fdf6e3; border-radius:8px; padding:40px; width:80%; max-width:600px; box-shadow:0 20px 50px rgba(0,0,0,0.4); position:relative; overflow:hidden;">
                   <div style="position:absolute; top:0; left:30px; bottom:0; width:2px; background:rgba(211,84,0,0.3);"></div>
                   <div style="padding-left:24px;">
                     <div style="font-size:12px; text-transform:uppercase; font-weight:700; color:#d35400; letter-spacing:1px; margin-bottom:8px;">July 2nd, 2026</div>
                     <div style="font-family:serif; font-size:24px; font-weight:bold; color:#2c3e50; margin-bottom:16px;">A productive day</div>
                     <div style="font-family:serif; font-size:16px; color:#34495e; line-height:1.7;">
                       Today I finally managed to complete the core modules for the AI agent. The deep work session from 9:30 AM really helped me maintain focus. I need to make sure I schedule another one for tomorrow.
                     </div>
                   </div>
                </div>
            </div>
"""

# Insert right after the third slide
# We know the third slide is the Smart Reader.
# The third slide ends at the third occurrence of `            </div>\n\n         </div>` roughly.
# Let's find: `<!-- Slide 3: Smart Reader -->`
slide_3_index = content.find('<!-- Slide 3: Smart Reader -->')
slide_3_end_index = content.find('</div>\n            </div>\n\n         </div>', slide_3_index)

if slide_3_index != -1 and slide_3_end_index != -1:
    content = content[:slide_3_end_index + 27] + cascara_and_journal_slides + content[slide_3_end_index + 27:]

with open('index.html', 'w') as f:
    f.write(content)

print("Updated slides and header!")
