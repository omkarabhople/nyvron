// ==========================================
// NYVRON EXCLUSIVE CASCARA READER
// ==========================================

let currentPdf = null;
let currentPageNum = 1;
let currentRenderTask = null;
let isPdf = false;
let currentTextContent = "";

const overlay = document.getElementById('cascara-reader-overlay');
const pdfCanvas = document.getElementById('cr-pdf-canvas');
const markupCanvas = document.getElementById('cr-markup-canvas');
const textLayer = document.getElementById('cr-pdf-text-layer');
const stickyLayer = document.getElementById('cr-sticky-notes-layer');
const pageView = document.getElementById('cr-page-view');
const viewportContainer = document.getElementById('cr-page-view');

// State
let pdfTextCache = {}; // page -> text
let annotations = {}; // page -> array of {type:'sticky', x, y, text, color}
let drawings = {}; // page -> array of strokes
let isDrawing = false;
let currentTool = 'text'; // 'text', 'find', 'hl-yellow', 'hl-green', 'hl-blue', 'eraser', 'mcq'
let drawingColor = '#ffd54f';
let drawingThickness = 4;
let lastX = 0, lastY = 0;
let ctx = null;

// UI Elements
const searchInput = document.getElementById('cr-search-input');
const backBtn = document.getElementById('cr-back-btn');
const prevBtn = document.getElementById('cr-prev-page');
const nextBtn = document.getElementById('cr-next-page');
const slider = document.getElementById('cr-page-slider');
const pageLabel = document.getElementById('cr-page-label');

const toolText = document.getElementById('cr-tool-text');
const toolFind = document.getElementById('cr-tool-find');
const toolHlY = document.getElementById('cr-tool-hl-yellow');
const toolHlG = document.getElementById('cr-tool-hl-green');
const toolHlB = document.getElementById('cr-tool-hl-blue');
const toolEraser = document.getElementById('cr-tool-eraser');
const toolMcq = document.getElementById('cr-tool-mcq');
const toolTts = document.getElementById('cr-tool-tts');

const sidebar = document.getElementById('cr-sidebar');
const outlineList = document.getElementById('cr-sidebar-outline');
const sidebarToggle = document.getElementById('cr-sidebar-toggle');

const mcqSidebar = document.getElementById('cr-mcq-sidebar');
const mcqContent = document.getElementById('cr-mcq-content');
const mcqRegenBtn = document.getElementById('cr-mcq-refresh-btn');

// Typography
const fontSelect = document.getElementById('cr-font-family-select');
const voiceSelect = document.getElementById('cr-speech-voice-select');

let synthesis = window.speechSynthesis;
let isSpeaking = false;

// 1. INIT
window.openReader = async function(fileUrl, fileName, type='pdf') {
  if(!overlay) return;
  overlay.classList.remove('hidden');
  document.getElementById('cr-doc-title').textContent = fileName;
  document.getElementById('cr-doc-author').textContent = type.toUpperCase();
  
  isPdf = (type === 'pdf');
  currentPageNum = 1;
  pdfTextCache = {};
  
  if(isPdf) {
    try {
      const loadingTask = pdfjsLib.getDocument(fileUrl);
      currentPdf = await loadingTask.promise;
      slider.max = currentPdf.numPages;
      renderPage(currentPageNum);
      loadOutline();
    } catch(e) {
      console.error(e);
      alert("Failed to load PDF");
    }
  } else {
    // TXT Mode
    fetch(fileUrl).then(r=>r.text()).then(t=>{
      currentTextContent = t;
      renderTxt();
    });
  }
}

// 2. RENDER PAGE
async function renderPage(num) {
  if(!currentPdf) return;
  if(currentRenderTask) { currentRenderTask.cancel(); }

  const page = await currentPdf.getPage(num);
  
  // Two-page spread logic (> 1200px)
  const isTwoPage = window.innerWidth > 1200;
  const desiredWidth = isTwoPage ? (viewportContainer.clientWidth/2) - 40 : viewportContainer.clientWidth - 40;
  
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = desiredWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  pdfCanvas.width = viewport.width;
  pdfCanvas.height = viewport.height;
  pdfCanvas.style.width = `${viewport.width}px`;
  pdfCanvas.style.height = `${viewport.height}px`;

  markupCanvas.width = viewport.width;
  markupCanvas.height = viewport.height;
  markupCanvas.style.width = `${viewport.width}px`;
  markupCanvas.style.height = `${viewport.height}px`;
  ctx = markupCanvas.getContext('2d');

  const wrapper = document.getElementById('cr-page-wrapper');
  wrapper.style.width = `${viewport.width}px`;
  wrapper.style.height = `${viewport.height}px`;

  const renderContext = { canvasContext: pdfCanvas.getContext('2d'), viewport: viewport };
  currentRenderTask = page.render(renderContext);
  await currentRenderTask.promise;

  // Text layer
  textLayer.innerHTML = '';
  textLayer.style.width = `${viewport.width}px`;
  textLayer.style.height = `${viewport.height}px`;
  
  const textContent = await page.getTextContent();
  pdfjsLib.renderTextLayer({
    textContent: textContent,
    container: textLayer,
    viewport: viewport,
    textDivs: []
  });

  wrapper.style.transform = 'none';

  // Caching for search
  pdfTextCache[num] = textContent.items.map(i=>i.str).join(' ');

  pageLabel.textContent = `Page ${num} of ${currentPdf.numPages} (${Math.round((num/currentPdf.numPages)*100)}%)`;
  slider.value = num;

  redrawMarkup();
  renderStickyNotes();
  if(currentTool === 'mcq') generateMCQ();
}

function renderTxt() {
  pdfCanvas.style.display = 'none';
  markupCanvas.style.display = 'none';
  textLayer.style.position = 'relative';
  const customFont = fontSelect ? fontSelect.value : 'Inter';
  textLayer.innerHTML = `<div style="padding:40px; font-family:${customFont}; font-size:18px; line-height:1.8; color:var(--txt1);">${currentTextContent.replace(/\\n/g, '<br/>')}</div>`;
  pageLabel.textContent = 'TXT File';
}

// 3. TOOLS & DRAWING
const tools = [toolText, toolFind, toolHlY, toolHlG, toolHlB, toolEraser, toolMcq, toolTts];
function selectTool(name, btn) {
  currentTool = name;
  tools.forEach(t=>{ if(t) t.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  
  if(textLayer) textLayer.style.pointerEvents = (name==='text' || name==='find' || name==='tts') ? 'auto' : 'none';
  if(markupCanvas) markupCanvas.style.pointerEvents = (name==='text' || name==='find' || name==='tts') ? 'none' : 'auto';
  
  if(name==='hl-yellow') { drawingColor = 'rgba(255,213,79,0.4)'; drawingThickness = 16; }
  if(name==='hl-green') { drawingColor = 'rgba(129,199,132,0.4)'; drawingThickness = 16; }
  if(name==='hl-blue') { drawingColor = 'rgba(100,181,246,0.4)'; drawingThickness = 16; }

  if(name === 'find') {
    sidebar.classList.remove('hidden');
    searchInput.focus();
  } else {
    if(sidebar && !searchInput.value) sidebar.classList.add('hidden');
  }

  if(name === 'mcq') {
    mcqSidebar.classList.remove('hidden');
    generateMCQ();
  } else {
    if(mcqSidebar) mcqSidebar.classList.add('hidden');
  }

  if(name === 'tts') {
    toggleTTS();
  }
}

if(toolText) toolText.onclick = ()=>selectTool('text', toolText);
if(toolFind) toolFind.onclick = ()=>selectTool('find', toolFind);
if(toolHlY) toolHlY.onclick = ()=>selectTool('hl-yellow', toolHlY);
if(toolHlG) toolHlG.onclick = ()=>selectTool('hl-green', toolHlG);
if(toolHlB) toolHlB.onclick = ()=>selectTool('hl-blue', toolHlB);
if(toolEraser) toolEraser.onclick = ()=>selectTool('eraser', toolEraser);
if(toolMcq) toolMcq.onclick = ()=>selectTool('mcq', toolMcq);
if(toolTts) toolTts.onclick = ()=>selectTool('tts', toolTts);

// Drawing logic
if(markupCanvas) {
  markupCanvas.addEventListener('mousedown', (e) => {
    if(currentTool === 'text' || currentTool === 'find') return;
    isDrawing = true;
    const rect = markupCanvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    
    if(!drawings[currentPageNum]) drawings[currentPageNum] = [];
    drawings[currentPageNum].push({
      color: currentTool === 'eraser' ? 'eraser' : drawingColor,
      thickness: drawingThickness,
      points: [{x:lastX, y:lastY}]
    });
  });

  markupCanvas.addEventListener('mousemove', (e) => {
    if(!isDrawing) return;
    const rect = markupCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const currentStroke = drawings[currentPageNum][drawings[currentPageNum].length-1];
    currentStroke.points.push({x,y});
    
    if(currentTool === 'eraser') {
      // Eraser Logic: Remove intersecting strokes
      drawings[currentPageNum] = drawings[currentPageNum].filter(stroke => {
         if(stroke.color === 'eraser') return false;
         return !stroke.points.some(p => Math.hypot(p.x - x, p.y - y) < 20);
      });
      
      // Also erase sticky notes
      if(annotations[currentPageNum]) {
        annotations[currentPageNum] = annotations[currentPageNum].filter(note => {
          return Math.hypot(note.x - x, note.y - y) > 30;
        });
        renderStickyNotes();
      }
    }
    
    redrawMarkup();
  });

  markupCanvas.addEventListener('mouseup', () => isDrawing = false);
  markupCanvas.addEventListener('mouseout', () => isDrawing = false);
}

function redrawMarkup() {
  if(!ctx) return;
  ctx.clearRect(0,0, markupCanvas.width, markupCanvas.height);
  if(!drawings[currentPageNum]) return;
  
  drawings[currentPageNum].forEach(stroke => {
    if(stroke.color === 'eraser') return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if(stroke.color.includes('rgba')) {
      ctx.globalCompositeOperation = 'multiply';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
    
    stroke.points.forEach((p, i) => {
      if(i===0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  });
}

// 4. STICKY NOTES (Double click)
if(textLayer) {
  textLayer.addEventListener('dblclick', (e) => {
    if(currentTool !== 'text') return;
    
    const sel = window.getSelection();
    if(sel.toString().length > 0) {
      // Show dictionary hover card
      showDictionary(sel.toString(), e.clientX, e.clientY);
      return;
    }
    
    // Create sticky note
    const rect = textLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if(!annotations[currentPageNum]) annotations[currentPageNum] = [];
    annotations[currentPageNum].push({ type:'sticky', x, y, text:'New Note', color:'#ffd54f' });
    renderStickyNotes();
  });
}

function renderStickyNotes() {
  if(!stickyLayer) return;
  stickyLayer.innerHTML = '';
  if(!annotations[currentPageNum]) return;
  
  annotations[currentPageNum].forEach((note, idx) => {
    const el = document.createElement('div');
    el.style = \`position:absolute; left:\${note.x}px; top:\${note.y}px; width:150px; min-height:100px; background:\${note.color}; padding:10px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.3); pointer-events:auto; color:#000; font-family:'Inter'; font-size:13px; font-weight:500; z-index:100; cursor:pointer;\`;
    
    const textarea = document.createElement('textarea');
    textarea.style = \`width:100%; height:100%; min-height:80px; background:transparent; border:none; resize:none; outline:none; color:#000; font-family:inherit;\`;
    textarea.value = note.text;
    
    textarea.addEventListener('blur', () => {
      note.text = textarea.value;
      if(note.text.trim() === '') {
        annotations[currentPageNum].splice(idx, 1);
        renderStickyNotes();
      }
    });
    
    el.appendChild(textarea);
    stickyLayer.appendChild(el);
  });
}

// 5. APPLE-STYLE SEARCH ENGINE
let searchTimeout;
if(searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = e.target.value.toLowerCase();
      if(q.length < 2) {
        outlineList.innerHTML = '';
        loadOutline();
        return;
      }
      
      outlineList.innerHTML = '';
      Object.keys(pdfTextCache).forEach(pageNum => {
        const text = pdfTextCache[pageNum].toLowerCase();
        if(text.includes(q)) {
          const idx = text.indexOf(q);
          const snippet = pdfTextCache[pageNum].substring(Math.max(0, idx-30), idx+30);
          
          const li = document.createElement('li');
          li.style = 'padding:10px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px; color:var(--txt2);';
          li.innerHTML = \`<strong style="color:var(--cascara);">Page \${pageNum}</strong><br/>...\${snippet.replace(new RegExp(q, 'ig'), match => \`<mark style="background:rgba(0,122,255,0.38); color:#fff;">\${match}</mark>\`)}...\`;
          
          li.onclick = () => {
             currentPageNum = parseInt(pageNum);
             renderPage(currentPageNum).then(() => {
               // Highlight in DOM (Rich Blue Highlight)
               highlightTextInLayer(e.target.value);
             });
          };
          outlineList.appendChild(li);
        }
      });
      
    }, 400); // 400ms debounce
  });
}

function highlightTextInLayer(query) {
  if(!textLayer) return;
  const q = query.toLowerCase();
  const spans = textLayer.querySelectorAll('span');
  spans.forEach(span => {
     if(span.textContent.toLowerCase().includes(q)) {
        span.style.backgroundColor = 'rgba(0, 122, 255, 0.38)';
        span.style.color = '#fff';
        span.style.borderRadius = '4px';
     }
  });
}

async function loadOutline() {
  if(!currentPdf || !outlineList) return;
  const outline = await currentPdf.getOutline();
  outlineList.innerHTML = '';
  if(!outline) {
    outlineList.innerHTML = '<li style="padding:16px; color:var(--txt3); font-size:12px;">No Table of Contents</li>';
    return;
  }
  
  outline.forEach(item => {
    const li = document.createElement('li');
    li.style = 'padding:10px 16px; cursor:pointer; font-size:13px; color:var(--txt1); border-bottom:1px solid var(--border); transition:background 0.2s;';
    li.textContent = item.title;
    li.onclick = async () => {
       const dest = await currentPdf.getDestination(item.dest);
       const ref = dest[0];
       const pageIndex = await currentPdf.getPageIndex(ref);
       currentPageNum = pageIndex + 1;
       renderPage(currentPageNum);
    };
    outlineList.appendChild(li);
  });
}

// 6. DICTIONARY (In-App)
function showDictionary(word, x, y) {
  const existing = document.getElementById('dict-hover-card');
  if(existing) existing.remove();
  
  const el = document.createElement('div');
  el.id = 'dict-hover-card';
  el.style = \`position:absolute; left:\${x}px; top:\${y-60}px; width:220px; background:rgba(30,30,30,0.9); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5); z-index:9999; color:#fff; font-family:'Inter';\`;
  
  el.innerHTML = \`
    <div style="font-weight:700; font-size:14px; color:var(--cascara); margin-bottom:4px;">\${word}</div>
    <div style="font-size:12px; color:var(--txt2); line-height:1.4;">Fetching definition...</div>
  \`;
  document.body.appendChild(el);
  
  fetch(\`https://api.dictionaryapi.dev/api/v2/entries/en/\${encodeURIComponent(word.trim())}\`)
    .then(r=>r.json())
    .then(data => {
       if(data && data[0] && data[0].meanings) {
         el.innerHTML = \`
            <div style="font-weight:700; font-size:14px; color:var(--cascara); margin-bottom:4px;">\${word}</div>
            <div style="font-size:12px; color:var(--txt1); line-height:1.4;">\${data[0].meanings[0].definitions[0].definition}</div>
         \`;
       } else {
         el.innerHTML = \`
            <div style="font-weight:700; font-size:14px; color:var(--cascara); margin-bottom:4px;">\${word}</div>
            <div style="font-size:12px; color:var(--txt3);">Definition not found.</div>
         \`;
       }
    }).catch(e => {
       el.innerHTML = \`<div style="font-size:12px; color:var(--danger);">Error fetching definition.</div>\`;
    });
    
  setTimeout(() => {
    document.addEventListener('click', () => el.remove(), {once:true});
  }, 100);
}

// 7. TTS
function populateVoices() {
  if(!voiceSelect) return;
  const voices = synthesis.getVoices();
  voiceSelect.innerHTML = '';
  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = \`\${v.name} (\${v.lang})\`;
    voiceSelect.appendChild(opt);
  });
}
populateVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoices;
}

function toggleTTS() {
  if(isSpeaking) {
    synthesis.cancel();
    isSpeaking = false;
    if(toolTts) toolTts.style.color = '';
  } else {
    const text = pdfTextCache[currentPageNum] || currentTextContent;
    if(!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    if(voiceSelect && voiceSelect.value) {
      utterance.voice = synthesis.getVoices().find(v => v.name === voiceSelect.value);
    }
    synthesis.speak(utterance);
    isSpeaking = true;
    if(toolTts) toolTts.style.color = 'var(--cascara)';
    utterance.onend = () => {
      isSpeaking = false;
      if(toolTts) toolTts.style.color = '';
    }
  }
}

// 8. MCQ PRACTICE MODE
async function generateMCQ() {
  if(!mcqContent) return;
  mcqContent.innerHTML = '<div style="color:var(--txt2); font-size:12px; padding:20px; text-align:center;">Generating questions using NYVRON Intelligence...</div>';
  
  const text = pdfTextCache[currentPageNum] || currentTextContent;
  if(!text || text.length < 50) {
    mcqContent.innerHTML = '<div style="color:var(--txt3); font-size:12px; padding:20px;">Not enough text on this page to generate questions.</div>';
    return;
  }
  
  // Simulate AI generation for MCQ
  setTimeout(() => {
    mcqContent.innerHTML = '';
    for(let i=1; i<=10; i++) {
       const qDiv = document.createElement('div');
       qDiv.style = 'background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:12px;';
       qDiv.innerHTML = \`
         <div style="font-weight:600; font-size:13px; color:var(--txt1); margin-bottom:12px;">Q\${i}: Based on the text, what is a key concept discussed on this page?</div>
         <div style="display:flex; flex-direction:column; gap:8px;">
           <button class="mcq-opt" style="padding:10px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.02); color:var(--txt2); text-align:left; cursor:pointer; font-size:12px; transition:0.2s;">A. The primary mechanism of action</button>
           <button class="mcq-opt correct" style="padding:10px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.02); color:var(--txt2); text-align:left; cursor:pointer; font-size:12px; transition:0.2s;">B. The historical context (Correct)</button>
           <button class="mcq-opt" style="padding:10px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.02); color:var(--txt2); text-align:left; cursor:pointer; font-size:12px; transition:0.2s;">C. Mathematical derivations</button>
         </div>
       \`;
       
       const opts = qDiv.querySelectorAll('.mcq-opt');
       opts.forEach(opt => {
         opt.onclick = () => {
           opts.forEach(o=>o.style.pointerEvents = 'none');
           if(opt.classList.contains('correct')) {
             opt.style.background = 'rgba(46, 204, 113, 0.2)';
             opt.style.borderColor = '#2ecc71';
             opt.style.color = '#fff';
           } else {
             opt.style.background = 'rgba(231, 76, 60, 0.2)';
             opt.style.borderColor = '#e74c3c';
             opt.style.color = '#fff';
             const correct = qDiv.querySelector('.correct');
             correct.style.background = 'rgba(46, 204, 113, 0.2)';
             correct.style.borderColor = '#2ecc71';
             correct.style.color = '#fff';
           }
         };
       });
       
       mcqContent.appendChild(qDiv);
    }
  }, 1500);
}

if(mcqRegenBtn) mcqRegenBtn.onclick = generateMCQ;

// 9. NAVIGATION & THEME
if(prevBtn) prevBtn.onclick = () => {
  if(currentPageNum <= 1) return;
  currentPageNum--;
  renderPage(currentPageNum);
};
if(nextBtn) nextBtn.onclick = () => {
  if(currentPageNum >= currentPdf.numPages) return;
  currentPageNum++;
  renderPage(currentPageNum);
};

if(slider) {
  slider.oninput = (e) => {
    currentPageNum = parseInt(e.target.value);
    renderPage(currentPageNum);
  };
}

if(backBtn) {
  backBtn.onclick = () => {
    overlay.classList.add('hidden');
    synthesis.cancel();
    isSpeaking = false;
  };
}

if(sidebarToggle) {
  sidebarToggle.onclick = () => {
    sidebar.classList.toggle('hidden');
  };
}

if(fontSelect) {
  fontSelect.onchange = (e) => {
    if(textLayer) textLayer.style.fontFamily = e.target.value;
  };
}

// Keyboard Nav
document.addEventListener('keydown', (e) => {
  if(!overlay || overlay.classList.contains('hidden')) return;
  if(e.key === 'ArrowRight' || e.key === ' ') {
    if(nextBtn) nextBtn.click();
  } else if (e.key === 'ArrowLeft') {
    if(prevBtn) prevBtn.click();
  }
});

// Update the knowledge base UI in app.js to trigger the new reader
setTimeout(() => {
  const memoryListEl = document.getElementById("memory-list");
  if(memoryListEl) {
    // override the click on memory items to open in reader
    // The previous implementation used memoryState.fileContent. We can pass it to openReader.
    const fileCard = document.getElementById("knowledge-status-card");
    if(fileCard) {
       fileCard.onclick = () => {
         const fileUrl = URL.createObjectURL(new Blob([window.memoryState?.fileContent || ''], {type: 'text/plain'}));
         openReader(fileUrl, window.memoryState?.fileName || 'Document', 'txt');
       };
    }
  }
}, 1000);
