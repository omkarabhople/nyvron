import re

with open('index.html', 'r') as f:
    content = f.read()

# We want to inject the login page right after <body>
login_html = """
<!-- ============================================== -->
<!-- NEW FULL-SCREEN LOGIN PAGE (AS REQUESTED)      -->
<!-- ============================================== -->
<div id="login-page" style="position:fixed; inset:0; z-index:100000; background:#050505; display:flex; align-items:center; justify-content:center; overflow:hidden;">

  <!-- Main Container -->
  <div style="width:100%; max-width:1400px; height:100vh; max-height:900px; display:flex; align-items:center; justify-content:center; gap:40px; padding:40px;">
    
    <!-- Left Area (Features Showcase) -->
    <div style="flex:1.8; display:flex; align-items:center; justify-content:center; position:relative; height:100%;">
      
      <!-- Subtle Background Glow -->
      <div style="position:absolute; inset:0; z-index:1; pointer-events:none; overflow:hidden; display:flex; align-items:center; justify-content:center;">
        <div style="width:80%; height:80%; background:radial-gradient(circle, var(--cascara) 0%, transparent 60%); filter:blur(120px); opacity:0.04; animation: orbFloat1 20s infinite alternate ease-in-out;"></div>
      </div>

      <!-- The Mac style Card -->
      <div style="z-index:2; width:100%; max-width:850px; height:85%; background:#111111; border-radius:24px; border:1px solid #222; display:flex; flex-direction:column; position:relative; box-shadow:0 30px 80px rgba(0,0,0,0.8); overflow:hidden;">
         
         <!-- Mac Window Buttons -->
         <div style="padding:16px 20px; display:flex; align-items:center; gap:8px; border-bottom:1px solid rgba(255,255,255,0.03);">
            <div style="width:12px; height:12px; border-radius:50%; background:#ff5f56;"></div>
            <div style="width:12px; height:12px; border-radius:50%; background:#ffbd2e;"></div>
            <div style="width:12px; height:12px; border-radius:50%; background:#27c93f;"></div>
         </div>

         <!-- Slideshow Container -->
         <div id="feature-slideshow" style="flex:1; position:relative; overflow:hidden; background:#111;">
            
            <!-- Slide 1: AI Prompt Processing -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; z-index:1; transition:opacity 1s, transform 1.5s; transform:scale(1.02);">
               <div id="agent-sim-container" style="flex:1; width:100%; height:100%; background:var(--bg2); display:flex; flex-direction:column; position:relative; overflow:hidden;">
             
                 <!-- State 1: Idle / Typing -->
                 <div id="sim-state-1" style="flex:1; display:flex; flex-direction:column; position:relative; transition:opacity 0.5s;">
                    <div style="padding:24px; display:flex; align-items:center; gap:12px;">
                       <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, var(--cascara), #FF9500); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:bold;">N</div>
                       <div style="font-size:14px; color:var(--txt2);">I am ready to assist you.</div>
                    </div>

                    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);">
                       <div style="width:100px; height:100px; border-radius:50%; background:radial-gradient(circle, var(--cascara) 0%, transparent 70%); filter:blur(10px); animation: pulseOrb 3s infinite alternate;"></div>
                       <div style="width:60px; height:60px; border-radius:50%; background:linear-gradient(135deg, var(--cascara), #FF9500); position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); box-shadow:0 0 30px rgba(255, 193, 7, 0.4);"></div>
                    </div>

                    <div style="margin-top:auto; padding:24px;">
                       <div style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; align-items:center; justify-content:space-between;">
                          <div id="sim-typing-text" style="color:var(--txt1); font-size:14px;"></div>
                          <div id="sim-send-btn" style="width:28px; height:28px; border-radius:50%; background:var(--txt3); color:var(--bg); display:flex; align-items:center; justify-content:center; font-weight:bold; cursor:default; transition:background 0.3s;">↑</div>
                       </div>
                    </div>
                 </div>

                 <!-- State 2: Result Split Pane -->
                 <div id="sim-state-2" style="position:absolute; inset:0; display:flex; opacity:0; pointer-events:none; transition:opacity 0.5s;">
                    
                    <!-- Left Pane: Chat & Progress -->
                    <div style="flex:0.8; border-right:1px solid rgba(255,255,255,0.05); padding:24px; display:flex; flex-direction:column; gap:20px;">
                       <div style="display:flex; align-items:center; gap:12px;">
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
                       </div>

                       <!-- User Prompt Bubble -->
                       <div style="background:linear-gradient(135deg, #FF9500, var(--cascara)); color:#111; padding:16px 20px; border-radius:16px; border-top-left-radius:4px; font-size:14px; font-weight:500; align-self:flex-start; max-width:90%; box-shadow:0 8px 24px rgba(255,193,7,0.2);">
                         Schedule a deep work session for tomorrow based on my study patterns.
                       </div>

                       <!-- Progress Steps -->
                       <div id="sim-progress-steps" style="display:flex; flex-direction:column; gap:16px; margin-top:12px; padding-left:12px;">
                          <!-- Steps injected via JS -->
                       </div>

                       <div style="margin-top:auto;">
                          <div style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; opacity:0.5;">
                             <div style="color:var(--txt3); font-size:13px;">Describe your task...</div>
                             <div style="width:24px; height:24px; border-radius:50%; background:var(--bg3); color:var(--txt2); display:flex; align-items:center; justify-content:center; font-weight:bold;">↑</div>
                          </div>
                       </div>
                    </div>

                    <!-- Right Pane: Detailed UI -->
                    <div style="flex:1.2; padding:32px; display:flex; flex-direction:column; gap:32px; overflow-y:auto;">
                       <!-- Section 1: Data Integration -->
                       <div>
                         <div style="font-size:11px; color:var(--cascara); font-weight:700; letter-spacing:1px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                           <div style="width:6px; height:6px; border-radius:50%; background:var(--cascara);"></div> DATA INTEGRATION
                         </div>
                         
                         <div class="sim-ui-block" style="opacity:0; transform:translateY(10px); display:flex; align-items:center; gap:16px; background:var(--bg); border:1px solid var(--border); padding:16px; border-radius:12px; margin-bottom:12px;">
                           <div style="width:40px; height:40px; border-radius:10px; background:#1A1A1A; display:flex; align-items:center; justify-content:center; font-size:18px;">📊</div>
                           <div>
                             <div style="color:var(--txt1); font-size:14px; font-weight:600;">Study Tracker</div>
                             <div style="color:var(--txt3); font-size:12px;">Peak focus identified at 09:30 AM</div>
                           </div>
                           <div style="margin-left:auto; color:var(--cascara); font-weight:bold;">✓</div>
                         </div>
                         
                         <div class="sim-ui-block" style="opacity:0; transform:translateY(10px); display:flex; align-items:center; gap:16px; background:var(--bg); border:1px solid var(--border); padding:16px; border-radius:12px;">
                           <div style="width:40px; height:40px; border-radius:10px; background:#1A1A1A; display:flex; align-items:center; justify-content:center; font-size:18px;">🗓️</div>
                           <div>
                             <div style="color:var(--txt1); font-size:14px; font-weight:600;">Calendar</div>
                             <div style="color:var(--txt3); font-size:12px;">Slot available: 09:30 AM - 11:30 AM</div>
                           </div>
                           <div style="margin-left:auto; color:var(--cascara); font-weight:bold;">✓</div>
                         </div>
                       </div>

                       <!-- Section 2: Action Scheduled -->
                       <div>
                         <div style="font-size:11px; color:var(--cascara); font-weight:700; letter-spacing:1px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                           <div style="width:6px; height:6px; border-radius:50%; background:var(--cascara);"></div> ACTION SCHEDULED
                         </div>
                         
                         <div class="sim-ui-block" style="opacity:0; transform:translateY(10px); background:linear-gradient(135deg, rgba(255,193,7,0.1), rgba(211,84,0,0.1)); border:1px solid rgba(255,193,7,0.2); padding:20px; border-radius:12px;">
                           <div style="color:var(--txt1); font-size:16px; font-weight:600; margin-bottom:8px;">Deep Work: Quantum Physics</div>
                           <div style="display:flex; gap:16px; color:var(--txt2); font-size:13px; margin-bottom:16px;">
                              <span style="display:flex; align-items:center; gap:4px;">⏱️ Tomorrow, 09:30 AM</span>
                              <span style="display:flex; align-items:center; gap:4px;">⏳ 2 Hours</span>
                           </div>
                           <div style="display:flex; gap:8px;">
                              <button style="padding:8px 16px; background:var(--cascara); color:#000; font-weight:600; font-size:13px; border-radius:8px; border:none;">Confirm</button>
                              <button style="padding:8px 16px; background:transparent; border:1px solid var(--border); color:var(--txt2); font-weight:600; font-size:13px; border-radius:8px;">Edit</button>
                           </div>
                         </div>
                       </div>
                    </div>
                 </div>
               </div>
            </div>

            <!-- Slide 2: Study Tracker Transition -->
            <div class="sim-slide" style="position:absolute; inset:0; opacity:0; z-index:1; transition:opacity 1s, transform 1.5s; transform:scale(1.02); display:flex; align-items:center; justify-content:center; flex-direction:column;">
                <div style="text-align:center; margin-bottom:30px;">
                   <h3 style="color:#fff; font-size:28px; font-weight:600; margin-bottom:8px;">Intelligent <span style="color:var(--cascara);">Study Tracker</span></h3>
                   <div style="color:var(--txt2); font-size:16px;">Monitor your focus seamlessly</div>
                </div>
                <div style="background:#111; border:1px solid #222; border-radius:24px; padding:30px; width:70%; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
                   <div style="width:120px; height:120px; border-radius:50%; border:4px solid var(--cascara); margin:0 auto 20px; display:flex; align-items:center; justify-content:center; position:relative;">
                      <div style="font-size:32px; font-weight:bold; color:#fff;">2:15</div>
                      <div style="position:absolute; bottom:-10px; background:#111; padding:0 10px; color:var(--txt3); font-size:12px;">HRS</div>
                   </div>
                   <div style="font-size:18px; font-weight:500; color:var(--txt1);">Quantum Physics</div>
                   <div style="font-size:14px; color:var(--cascara); margin-top:8px;">150% Focus Score</div>
                </div>
            </div>

            <!-- Slide 3: Cascara Reader -->
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

         </div>
      </div>
    </div>

    <!-- Right Area: The Login Panel -->
    <div style="flex:1; max-width:420px; display:flex; flex-direction:column; justify-content:center;">
       
       <div style="display:flex; align-items:center; gap:16px; margin-bottom:40px;">
         <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg, var(--cascara), #FF9500); display:flex; align-items:center; justify-content:center; color:#fff; font-size:20px; font-weight:bold; box-shadow:0 10px 20px rgba(255,193,7,0.3);">N</div>
         <div style="font-size:24px; font-weight:700; color:#fff; letter-spacing:1px;">NYVRON</div>
       </div>

       <h1 style="font-size:32px; font-weight:700; color:#fff; margin-bottom:12px;">Welcome back</h1>
       <p style="color:var(--txt2); font-size:15px; line-height:1.5; margin-bottom:40px;">
         Access your intelligent workspace and resume where you left off.
       </p>

       <!-- Login Form Options -->
       <div style="display:flex; flex-direction:column; gap:20px;">
         <button style="width:100%; padding:16px; background:#fff; color:#000; font-size:15px; font-weight:600; border-radius:12px; border:none; display:flex; align-items:center; justify-content:center; gap:12px; cursor:pointer; box-shadow:0 4px 12px rgba(255,255,255,0.1);">
           <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
           Continue with Google
         </button>

         <div style="display:flex; align-items:center; gap:16px; margin:10px 0;">
            <div style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></div>
            <div style="color:var(--txt3); font-size:12px; font-weight:600;">OR</div>
            <div style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></div>
         </div>

         <input type="email" placeholder="Email address" style="width:100%; padding:16px; background:#111; border:1px solid #333; color:#fff; border-radius:12px; font-size:15px; outline:none;" />
         <button style="width:100%; padding:16px; background:#222; color:#fff; font-size:15px; font-weight:600; border-radius:12px; border:1px solid #333; cursor:pointer;">
           Continue with Email
         </button>
       </div>

       <div style="margin-top:40px; text-align:center; font-size:12px; color:var(--txt3);">
         By continuing, you agree to NYVRON's <br><span style="color:var(--txt2);">Terms of Service</span> · <span style="color:var(--txt2);">Privacy Policy</span>
       </div>
    </div>
  </div>
</div>
<!-- ============================================== -->
"""

script_html = """
<script>
  (function() {
    // Hide the main app so only the login page shows
    document.getElementById('app').style.display = 'none';

    // Slide Logic
    const slides = document.querySelectorAll('.sim-slide');
    if(!slides || slides.length === 0) return;
    
    let currentIdx = 0;
    
    // Slide durations: Slide 1 (AI Sim) needs 12s. The rest are very fast 2s as requested.
    const durations = [12000, 2000, 2000, 2000, 2000];
    
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
    
    showSlide(0);
    
    function loopSlides() {
       let duration = durations[currentIdx] || 2000;
       setTimeout(() => {
          currentIdx = (currentIdx + 1) % slides.length;
          showSlide(currentIdx);
          loopSlides();
       }, duration);
    }
    
    loopSlides();

    // Typewriter Simulation for Slide 1
    function runSim() {
      const typeText = document.getElementById('sim-typing-text');
      const sendBtn = document.getElementById('sim-send-btn');
      const state1 = document.getElementById('sim-state-1');
      const state2 = document.getElementById('sim-state-2');
      const progressSteps = document.getElementById('sim-progress-steps');
      
      if(!typeText) return;

      const fullText = "Schedule a deep work session for tomorrow based on my study patterns.";
      
      // Reset
      typeText.innerHTML = "";
      sendBtn.style.background = "var(--txt3)";
      sendBtn.style.color = "var(--bg)";
      state1.style.opacity = "1";
      state2.style.opacity = "0";
      state2.style.pointerEvents = "none";
      progressSteps.innerHTML = "";
      
      let i = 0;
      let typingInterval = setInterval(() => {
         typeText.innerHTML += fullText.charAt(i);
         i++;
         if (i >= fullText.length) {
            clearInterval(typingInterval);
            sendBtn.style.background = "var(--cascara)";
            sendBtn.style.color = "#000";
            
            setTimeout(() => {
               state1.style.opacity = "0";
               setTimeout(() => {
                  state2.style.opacity = "1";
                  state2.style.pointerEvents = "auto";
                  
                  setTimeout(() => addProgressStep("Analyzing historical study data...", true), 500);
                  setTimeout(() => addProgressStep("Identifying peak cognitive windows...", true), 2000);
                  setTimeout(() => addProgressStep("Cross-referencing Calendar availability...", true), 3500);
                  setTimeout(() => addProgressStep("Drafting optimal schedule block...", true), 5000);
                  
                  setTimeout(() => {
                     const blocks = document.querySelectorAll('.sim-ui-block');
                     blocks.forEach((b, idx) => {
                        setTimeout(() => {
                           b.style.opacity = "1";
                           b.style.transform = "translateY(0)";
                           b.style.transition = "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
                        }, idx * 400);
                     });
                  }, 6000);
               }, 500);
            }, 1000);
         }
      }, 30);
      
      function addProgressStep(text, check=false) {
        let el = document.createElement('div');
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.gap = "10px";
        el.style.color = "var(--txt2)";
        el.style.fontSize = "13px";
        el.style.opacity = "0";
        el.style.transform = "translateX(-10px)";
        el.style.transition = "all 0.4s";
        
        let icon = check ? `<div style="width:16px; height:16px; border-radius:50%; background:var(--cascara); color:#000; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold;">✓</div>` : `<div style="width:16px; height:16px; border:radius:50%; border:2px solid var(--txt3);"></div>`;
        
        el.innerHTML = `${icon} <span>${text}</span>`;
        progressSteps.appendChild(el);
        
        setTimeout(() => {
           el.style.opacity = "1";
           el.style.transform = "translateX(0)";
        }, 50);
      }
    }

    // Run sim once per full loop
    runSim();
    setInterval(runSim, 22000); // The total duration of all slides is 12000 + 4*2000 = 20000ms. We leave 2s buffer.

  })();
</script>
<style>
  @keyframes wave {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.4); }
  }
</style>
"""

content = content.replace('<body>', '<body>\n' + login_html)
content = content.replace('</body>', script_html + '\n</body>')

with open('index.html', 'w') as f:
    f.write(content)

print("Injected perfect layout cleanly!")
