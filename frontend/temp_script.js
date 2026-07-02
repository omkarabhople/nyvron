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
