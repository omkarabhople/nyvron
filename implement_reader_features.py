import re

with open('/Users/onkarbhople/nyvron/frontend/app.js', 'r') as f:
    js = f.read()

# 1. Update font handlers
# I will replace the font size and font family click handlers.
font_handler_regex = re.compile(r'  const fontSizeSlider = \$\(\'cr-font-size-slider\'\);.*?    \}\);\n  \}\n', re.DOTALL)

new_font_handler = """  const fontSizeSlider = $('cr-font-size-slider');
  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', (e) => {
      if (book && book.fileType === 'pdf') {
        // For PDFs, use Font Size slider as Zoom
        currentZoom = e.target.value / 16.0;
        updateZoom();
      } else {
        const contentDiv = $('cr-page-content');
        const contentDivRight = $('cr-page-content-right');
        const textContainers = [...(contentDiv?.querySelectorAll('p') || []), ...(contentDivRight?.querySelectorAll('p') || [])];
        textContainers.forEach(t => t.style.fontSize = e.target.value + 'px');
      }
    });
  }

  const spacingSlider = $('cr-line-spacing-slider');
  if (spacingSlider) {
    spacingSlider.addEventListener('input', (e) => {
      const contentDiv = $('cr-page-content');
      const contentDivRight = $('cr-page-content-right');
      const textContainers = [...(contentDiv?.querySelectorAll('p') || []), ...(contentDivRight?.querySelectorAll('p') || [])];
      textContainers.forEach(t => t.style.lineHeight = e.target.value);
    });
  }

  document.querySelectorAll('.cr-font-family-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.cr-font-family-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const font = btn.dataset.family;
      const contentDiv = $('cr-page-content');
      const contentDivRight = $('cr-page-content-right');
      const textContainers = [...(contentDiv?.querySelectorAll('p') || []), ...(contentDivRight?.querySelectorAll('p') || [])];
      textContainers.forEach(t => t.style.fontFamily = font);
    });
  });
"""

if fontSizeSlider_match := font_handler_regex.search(js):
    js = js[:fontSizeSlider_match.start()] + new_font_handler + js[fontSizeSlider_match.end():]


# 2. Dual page mode flip logic
# Replace `book.currentPage++` and `book.currentPage--` with logic that checks `isTwoPage`
js = re.sub(r"if \(book\.currentPage < book\.totalPages\) \{\s*book\.currentPage\+\+;\s*renderBookPage\(\);\s*\}", 
            "if (book.currentPage < book.totalPages) { book.currentPage += isTwoPage ? 2 : 1; if (book.currentPage > book.totalPages) book.currentPage = book.totalPages; renderBookPage(); }", js)

js = re.sub(r"if \(book\.currentPage > 1\) \{\s*book\.currentPage--;\s*renderBookPage\(\);\s*\}",
            "if (book.currentPage > 1) { book.currentPage -= isTwoPage ? 2 : 1; if (book.currentPage < 1) book.currentPage = 1; renderBookPage(); }", js)

# 3. Update Two-page spread toggle button
spread_toggle_regex = re.compile(r"  let isTwoPage = false;\n  \$\('cr-tool-spread'\)\?\.addEventListener\('click', \(\) => \{\n.*?    updateZoom\(\);\n  \}\);", re.DOTALL)
new_spread_toggle = """  let isTwoPage = false;
  $('cr-tool-spread')?.addEventListener('click', () => {
    isTwoPage = !isTwoPage;
    $('cr-tool-spread').classList.toggle('active', isTwoPage);
    const wrapperRight = $('cr-page-wrapper-right');
    if (wrapperRight) {
      if (isTwoPage) wrapperRight.classList.remove('hidden');
      else wrapperRight.classList.add('hidden');
    }
    
    // Ensure we start on an odd page when entering dual page (e.g. 1-2, 3-4)
    if (isTwoPage && book.currentPage % 2 === 0) {
      book.currentPage = Math.max(1, book.currentPage - 1);
    }
    
    renderBookPage();
    setTimeout(updateZoom, 50);
  });"""
if spread_toggle_match := spread_toggle_regex.search(js):
    js = js[:spread_toggle_match.start()] + new_spread_toggle + js[spread_toggle_match.end():]


# 4. Update renderBookPage to render dual pages
# I will use a helper to render a single side
render_page_regex = re.compile(r'  function renderBookPage\(\) \{.*?setTimeout\(adjustReaderResponsiveScale, 100\);\n  \}', re.DOTALL)

new_render_page = """
  function renderSinglePageSide(pageNum, isRightSide) {
    if (pageNum > book.totalPages) {
      if (isRightSide) {
        $('cr-page-content-right').innerHTML = '';
        const c = $('cr-pdf-canvas-right');
        if (c) {
          const ctx = c.getContext('2d');
          ctx.clearRect(0,0,c.width,c.height);
        }
      }
      return;
    }
    
    const contentDiv = isRightSide ? $('cr-page-content-right') : $('cr-page-content');
    const canvasPdf = isRightSide ? $('cr-pdf-canvas-right') : $('cr-pdf-canvas');
    const ctxPdf = canvasPdf?.getContext('2d');
    const markupCanvas = isRightSide ? $('cr-markup-canvas-right') : $('cr-markup-canvas');
    const ctxMarkup = markupCanvas?.getContext('2d');

    if (book.fileType === 'pdf') {
      if (pdfDoc) {
        pdfDoc.getPage(pageNum).then(page => {
          const viewport = page.getViewport({ scale: 1 });
          const scaleX = 600 / viewport.width;
          const scaleY = 780 / viewport.height;
          const scale = Math.min(scaleX, scaleY);
          const scaledViewport = page.getViewport({ scale: scale });
          
          canvasPdf.width = 600;
          canvasPdf.height = 780;
          
          ctxPdf.clearRect(0, 0, 600, 780);
          page.render({
            canvasContext: ctxPdf,
            viewport: scaledViewport
          }).promise.then(() => {
            book.highlights = book.highlights || {};
            if (book.highlights[pageNum]) {
              contentDiv.innerHTML = book.highlights[pageNum];
            } else {
              page.getTextContent().then(textContent => {
                const nativeText = textContent.items.map(item => item.str).join(' ').trim();
                book.pdfTextCache = book.pdfTextCache || {};
                book.pdfTextCache[pageNum] = nativeText;
                
                if (nativeText.length > 10) {
                  contentDiv.innerHTML = '';
                  let charCounter = 0;
                  textContent.items.forEach(item => {
                    const len = item.str.length;
                    const spanStart = charCounter;
                    const spanEnd = charCounter + len;
                    
                    let isMatch = false;
                    if (book.selectedSearchMatch && book.selectedSearchMatch.page === pageNum) {
                      const mStart = book.selectedSearchMatch.charOffset;
                      const mEnd = mStart + book.selectedSearchMatch.query.length;
                      if (spanStart < mEnd && spanEnd > mStart) {
                        isMatch = true;
                      }
                    }

                    const [left, top] = scaledViewport.convertToViewportPoint(item.transform[4], item.transform[5]);
                    const fontHeight = Math.abs(item.transform[3] * scale);
                    
                    const span = document.createElement('span');
                    span.textContent = item.str;
                    span.style.position = 'absolute';
                    span.style.fontFamily = 'sans-serif';
                    span.style.fontSize = fontHeight + 'px';
                    span.style.left = left + 'px';
                    span.style.top = (top - fontHeight) + 'px';
                    span.style.color = 'transparent';
                    span.style.whiteSpace = 'pre';
                    span.style.cursor = 'text';
                    if (item.width) {
                      span.style.width = (item.width * scale) + 'px';
                    }
                    if (isMatch) {
                      span.style.backgroundColor = 'rgba(0, 122, 255, 0.38)';
                    }
                    
                    contentDiv.appendChild(span);
                    charCounter += len + 1;
                  });
                } else {
                  book.ocrData = book.ocrData || {};
                  if (book.ocrData[pageNum]) {
                    renderOcrTextOverlay(book.ocrData[pageNum], book.selectedSearchMatch);
                  } else {
                    if (!isRightSide) runOcrOnCanvas(pageNum); // avoid running 2 ocrs concurrently to save perf
                  }
                }
              });
            }
          });
        });
      } else {
        if (contentDiv) contentDiv.innerHTML = `<p class="empty-hint" style="padding: 40px; font-size: 16px;">Loading PDF...</p>`;
      }
    } else {
      if (canvasPdf && ctxPdf) {
        ctxPdf.clearRect(0, 0, canvasPdf.width, canvasPdf.height);
      }
      if (contentDiv) {
        book.highlights = book.highlights || {};
        if (book.highlights[pageNum]) {
          contentDiv.innerHTML = book.highlights[pageNum];
        } else if (book.fileContent) {
          const words = book.fileContent.split(/\s+/);
          const startIdx = (pageNum - 1) * 200;
          const pageWords = words.slice(startIdx, startIdx + 200);
          
          let htmlContent = pageWords.join(' ');
          if (book.selectedSearchMatch && book.selectedSearchMatch.page === pageNum) {
            const query = book.selectedSearchMatch.query;
            const matchIndex = book.selectedSearchMatch.matchIndex;
            let occ = 0;
            htmlContent = htmlContent.replace(new RegExp(escapeRegExp(query), 'gi'), match => {
              if (occ === matchIndex) {
                occ++;
                return `<span class="cr-highlight" style="background-color:rgba(0, 122, 255, 0.38);">${match}</span>`;
              }
              occ++;
              return match;
            });
          }
          
          const fs = $('cr-font-size-slider') ? $('cr-font-size-slider').value + 'px' : '16px';
          const ls = $('cr-line-spacing-slider') ? $('cr-line-spacing-slider').value : '1.5';
          const activeFontBtn = document.querySelector('.cr-font-family-btn.active');
          const ff = activeFontBtn ? activeFontBtn.dataset.family : 'Georgia, serif';
          
          contentDiv.innerHTML = `<h3 style="margin-top:0; color:var(--cascara); font-family:var(--font);">${isRightSide ? '' : book.title}</h3><p style="white-space: pre-wrap; font-family:${ff}; font-size:${fs}; line-height:${ls};">${htmlContent}</p>`;
        }
      }
    }

    if (ctxMarkup) {
      ctxMarkup.clearRect(0, 0, markupCanvas.width, markupCanvas.height);
      book.drawings = book.drawings || {};
      if (book.drawings[pageNum]) {
        const img = new Image();
        img.onload = () => {
          ctxMarkup.drawImage(img, 0, 0);
        };
        img.src = book.drawings[pageNum];
      }
    }
  }

  function renderBookPage() {
    if (!book) return;
    
    // Safety check
    if (book.currentPage < 1) book.currentPage = 1;
    if (book.currentPage > book.totalPages) book.currentPage = book.totalPages;
    
    // Enforce odd page start in dual-page mode if requested
    if (isTwoPage && book.currentPage % 2 === 0) {
      book.currentPage = Math.max(1, book.currentPage - 1);
    }

    const pageNum = book.currentPage;
    
    // Update progress
    book.progress = Math.round((pageNum / book.totalPages) * 100) || 0;
    save();

    // Setup nav
    const ul = $('cr-page-nav');
    ul.innerHTML = '';
    const start = Math.max(1, pageNum - 2);
    const end = Math.min(book.totalPages, start + 4);
    for (let p = start; p <= end; p++) {
      const li = document.createElement('li');
      li.textContent = p;
      li.onclick = () => { book.currentPage = p; renderBookPage(); };
      if (isTwoPage && p === pageNum + 1) {
         li.classList.add('active'); // highlight both pages
      } else if (p === pageNum) {
         li.classList.add('active');
      }
      ul.appendChild(li);
    }

    const slider = $('cr-page-slider');
    if (slider) {
      slider.max = book.totalPages;
      slider.value = pageNum;
    }
    const label = $('cr-page-label');
    if (label) label.textContent = `Page ${pageNum} ${isTwoPage && pageNum < book.totalPages ? ' - ' + (pageNum+1) : ''} of ${book.totalPages} (${book.progress}%)`;

    renderSinglePageSide(pageNum, false);
    
    if (isTwoPage) {
      renderSinglePageSide(pageNum + 1, true);
    }

    renderPageAnnotations();
    setTimeout(adjustReaderResponsiveScale, 100);
  }
"""

if render_page_match := render_page_regex.search(js):
    js = js[:render_page_match.start()] + new_render_page + js[render_page_match.end():]


with open('/Users/onkarbhople/nyvron/frontend/app.js', 'w') as f:
    f.write(js)
