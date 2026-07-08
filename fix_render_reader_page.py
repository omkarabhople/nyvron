import re

with open('/Users/onkarbhople/nyvron/frontend/app.js', 'r') as f:
    js = f.read()

# I will replace the function renderReaderPage(pageNum)
# and also replace the earlier mock renderSinglePageSide and renderBookPage if they exist
# wait, my previous script injected renderSinglePageSide and renderBookPage but they might have been placed correctly, or they might just be unused now.
# Let's clean up my previous failed injection just in case, but it's safer to just replace `function renderReaderPage(pageNum)` entirely.

render_page_regex = re.compile(r'  function renderReaderPage\(pageNum\) \{.*?setTimeout\(adjustReaderResponsiveScale, 100\);\n  \}', re.DOTALL)

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

  function renderReaderPage(pageNum) {
    if (!book) return;
    
    // Safety check
    if (pageNum < 1) pageNum = 1;
    if (pageNum > book.totalPages) pageNum = book.totalPages;
    
    // Enforce odd page start in dual-page mode if requested
    if (isTwoPage && pageNum % 2 === 0) {
      pageNum = Math.max(1, pageNum - 1);
    }
    
    book.currentPage = pageNum;
    
    // Update progress
    book.progress = Math.round((pageNum / book.totalPages) * 100) || 0;
    save();

    // Setup nav
    const ul = $('cr-page-nav');
    if (ul) {
      ul.innerHTML = '';
      const start = Math.max(1, pageNum - 2);
      const end = Math.min(book.totalPages, start + 4);
      for (let p = start; p <= end; p++) {
        const li = document.createElement('li');
        li.textContent = p;
        li.onclick = () => { renderReaderPage(p); };
        if (isTwoPage && p === pageNum + 1) {
           li.classList.add('active'); // highlight both pages
        } else if (p === pageNum) {
           li.classList.add('active');
        }
        ul.appendChild(li);
      }
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
else:
    print("Could not find renderReaderPage block!")

# Remove any accidental 'renderBookPage();' calls from the previous script and replace with 'renderReaderPage(book.currentPage);'
js = js.replace('renderBookPage();', 'renderReaderPage(book.currentPage);')

with open('/Users/onkarbhople/nyvron/frontend/app.js', 'w') as f:
    f.write(js)
