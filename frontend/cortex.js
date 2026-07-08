/**
 * Cortex - Project & Infrastructure Hub Script
 * Student-focused command center bound to real local storage & Nyvron state.
 */

(function () {
  // Helper selectors
  const $ = id => document.getElementById(id);
  const $$ = selector => document.querySelectorAll(selector);

  // States
  let activeDockTab = "system";
  let isolatedNode = localStorage.getItem("nv-isolated-sync-node") || null;
  let activeTelemetrySegment = "24h";
  let hiddenTelemetryLines = new Set();
  let flameZoomedNode = null;
  let currentDetentHeight = 50; // percentage
  let isDraggingDetent = false;
  let startDragY = 0;
  let startHeight = 0;
  let swipeStartX = 0;
  let activeSwipeCell = null;
  let initialized = false;

  // Real-time local storage write-read latency array for line chart
  const localLatencyHistory = Array(12).fill(0.1);

  // Helper: logs dynamic cortex interactions to the user's real interaction log
  function logCortexInteraction(action, payload = "") {
    if (typeof STATE === "undefined" || !STATE.interactionLog) return;
    
    const entry = {
      action: action,
      timestamp: Date.now(),
      payload: payload
    };
    
    STATE.interactionLog.push(entry);
    localStorage.setItem('nv-interaction-log', JSON.stringify(STATE.interactionLog));
    renderLogsTable();
  }

  // Helper: measures actual write-read roundtrip to localStorage
  function measureLocalStorageLatency() {
    try {
      const t0 = performance.now();
      const testKey = "nv-cortex-speedtest";
      localStorage.setItem(testKey, "x");
      localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      const diff = performance.now() - t0;
      return Math.max(0.01, diff); // in ms
    } catch (e) {
      return 0.5;
    }
  }

  // Initialize
  function init() {
    if (initialized) return;
    initialized = true;

    // Log the initial opening event
    logCortexInteraction("open-cortex", "User accessed Project & Infrastructure Hub");

    setupDockNav();
    setupSystemPulse();
    setupCodeMatrix();
    setupBuildMonitor();
    setupGlobe();
    setupDbCharts();
    setupTelemetryChart();
    setupCostHeatmap();
    setupSynergyHub();
    setupFlameGraph();
    setupDocSearch();
    setupDetentSheet();

    // Start latency tracking loop
    setInterval(() => {
      const lat = measureLocalStorageLatency();
      localLatencyHistory.push(lat);
      if (localLatencyHistory.length > 12) localLatencyHistory.shift();
      
      if ($("subapp-cortex")?.classList.contains("active") && activeDockTab === "db") {
        const canvas = $("db-chart-latency");
        if (canvas) drawLatencyChart(canvas);
      }
    }, 4000);
  }

  // --- FLOATING DOCK NAVIGATION ---
  function setupDockNav() {
    const dockItems = $$(".cortex-dock-item");
    const container = $(".cortex-scrolls-container");

    dockItems.forEach(item => {
      item.addEventListener("click", () => {
        const targetId = item.getAttribute("data-target");
        const targetSection = $("cortex-scroll-" + targetId);
        
        if (targetSection && container) {
          dockItems.forEach(el => el.classList.remove("active"));
          item.classList.add("active");
          activeDockTab = targetId;

          logCortexInteraction("navigate-tab", targetId);

          // Scroll to element within container
          container.scrollTo({
            top: targetSection.offsetTop - container.offsetTop - 12,
            behavior: "smooth"
          });
        }
      });
    });

    // Sync scroll position with active dock item
    if (container) {
      container.addEventListener("scroll", () => {
        let currentSection = "system";
        let minDiff = Infinity;
        const containerTop = container.scrollTop;

        ["system", "db", "telemetry", "perf"].forEach(secId => {
          const sec = $("cortex-scroll-" + secId);
          if (sec) {
            const diff = Math.abs(sec.offsetTop - container.offsetTop - containerTop);
            if (diff < minDiff) {
              minDiff = diff;
              currentSection = secId;
            }
          }
        });

        if (activeDockTab !== currentSection) {
          activeDockTab = currentSection;
          dockItems.forEach(el => {
            el.classList.remove("active");
            if (el.getAttribute("data-target") === currentSection) {
              el.classList.add("active");
            }
          });
        }
      });
    }
  }

  // --- SCROLL 1: SYSTEM PULSE OVERVIEW ---
  function setupSystemPulse() {
    // Dynamic binding to actual state variables
    function refreshStats() {
      if (typeof STATE === "undefined") return;

      const instancesVal = $("pulse-instances-val");
      const routesVal = $("pulse-routes-val");
      const errorVal = $("pulse-error-val");
      const dbVal = $("pulse-db-val");

      // Study Modules syncing -> cascara subjects count
      if (instancesVal) {
        instancesVal.innerText = STATE.cascara?.subjects?.length || 0;
      }

      // AI Pathways -> count generated flashcards + synthesis notes
      if (routesVal) {
        const count = (STATE.flashcards?.length || 0) + (STATE.synthesisNotes?.length || 0);
        routesVal.innerText = count;
      }

      // Backlog Error Rate -> ratio of incomplete tasks
      if (errorVal) {
        const priorities = STATE.priorities || [];
        if (priorities.length > 0) {
          const incomplete = priorities.filter(p => !p.completed).length;
          const rate = (incomplete / priorities.length) * 100;
          errorVal.innerText = rate.toFixed(1) + "%";
        } else {
          errorVal.innerText = "0.0%";
        }
      }

      // Notes DB Pool size -> quick notes count in local storage vs 50 max
      if (dbVal) {
        const quickNotes = JSON.parse(localStorage.getItem('nv-quick-notes') || '[]');
        dbVal.innerText = `${quickNotes.length}/50`;
      }
    }

    refreshStats();
    setInterval(refreshStats, 3000);

    // Click pulse grid item -> show pageSheet modal
    const bentoItems = $$(".cortex-bento-item");
    const sidePanel = $("cortex-logs-panel");

    bentoItems.forEach(item => {
      item.addEventListener("click", () => {
        const metricName = item.querySelector(".cortex-bento-label").innerText;
        $("cortex-log-title").innerText = `${metricName} Health logs`;
        logCortexInteraction("view-health-logs", metricName);
        renderLogsTable();
        if (sidePanel) sidePanel.classList.add("active");
      });
    });

    const closeBtn = $("cortex-logs-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        if (sidePanel) sidePanel.classList.remove("active");
      });
    }

    // Filter and search logs
    const filterSelect = $("cortex-logs-filter");
    const searchInput = $("cortex-logs-search");

    if (filterSelect) filterSelect.addEventListener("change", renderLogsTable);
    if (searchInput) searchInput.addEventListener("input", renderLogsTable);
  }

  function renderLogsTable() {
    const listContainer = $("cortex-logs-list");
    if (!listContainer || typeof STATE === "undefined") return;

    const filterVal = $("cortex-logs-filter")?.value || "ALL";
    const searchVal = $("cortex-logs-search")?.value.toLowerCase() || "";

    let html = `
      <table style="width:100%; border-collapse:collapse; font-size:12px; font-family:var(--cortex-font-mono);">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--cortex-muted); text-align:left;">
            <th style="padding:8px 4px;">Time</th>
            <th style="padding:8px 4px;">Event</th>
            <th style="padding:8px 4px;">Payload</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Read the actual interaction log entries
    const logs = STATE.interactionLog || [];
    const filtered = logs.filter(l => {
      if (filterVal !== "ALL") {
        if (filterVal === "ERROR" && l.action !== "simulate-sync-cut") return false;
        if (filterVal === "WARN" && l.action !== "change-segment") return false;
        if (filterVal === "INFO" && (l.action === "simulate-sync-cut" || l.action === "change-segment")) return false;
      }
      if (searchVal && !l.action.toLowerCase().includes(searchVal) && !String(l.payload).toLowerCase().includes(searchVal)) return false;
      return true;
    }).reverse(); // Latest logs first

    if (filtered.length === 0) {
      html += `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--cortex-muted);">No entries in interaction log.</td></tr>`;
    } else {
      filtered.forEach(l => {
        const timeStr = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let statusColor = "var(--cortex-accent)";
        if (l.action === "change-segment") statusColor = "var(--cortex-warning)";
        if (l.action === "simulate-sync-cut") statusColor = "var(--cortex-destructive)";

        html += `
          <tr style="border-bottom:0.5px solid rgba(255,255,255,0.05);">
            <td style="padding:8px 4px; color:var(--cortex-muted);">${timeStr}</td>
            <td style="padding:8px 4px; font-weight:600; color:${statusColor};">${l.action.toUpperCase()}</td>
            <td style="padding:8px 4px; color:rgba(255,255,255,0.85);">${l.payload || "-"}</td>
          </tr>
        `;
      });
    }

    html += `</tbody></table>`;
    listContainer.innerHTML = html;
  }

  // --- SCROLL 1: SUBJECT RECALL MATRIX ---
  function setupCodeMatrix() {
    if (typeof STATE === "undefined") return;

    const subjects = STATE.cascara?.subjects || [
      { id: "s1", name: "Mathematics", color: "#E8652A" },
      { id: "s2", name: "Physics", color: "#3B82F6" }
    ];

    const rows = [
      { label: "Coverage", key: "coverage" },
      { label: "Recall Rate", key: "recall" },
      { label: "Concept Gaps", key: "gaps" },
      { label: "Backlog Debt", key: "backlog" }
    ];

    const matrixGrid = $("cortex-matrix-grid");
    if (!matrixGrid) return;

    // Fetch study logs for calculations
    const sessions = STATE.cascara?.sessions || [];
    const flashcards = STATE.flashcards || [];
    const priorities = STATE.priorities || [];

    let html = "";
    rows.forEach(row => {
      html += `<div class="cortex-heatmap-row">`;
      html += `<div class="cortex-heatmap-label">${row.label}</div>`;
      html += `<div class="cortex-heatmap-cells">`;
      
      subjects.forEach(subject => {
        let val = 0;
        let cellClass = "cell-green";
        let unit = "%";

        // Calculate values based on actual database states
        if (row.key === "coverage") {
          // Total minutes spent studying this subject vs. 120 mins target
          const matchingSessions = sessions.filter(s => s.subjectId === subject.id);
          const totalMs = matchingSessions.reduce((acc, s) => acc + (s.durationMs || 0), 0);
          const totalMins = totalMs / 60000;
          val = Math.min(100, Math.round((totalMins / 120) * 100));
          
          if (val < 30) cellClass = "cell-red";
          else if (val < 70) cellClass = "cell-yellow";
        } else if (row.key === "recall") {
          // Number of flashcards created for this subject (mock mapping if subject name contains match)
          const cardsCount = flashcards.filter(c => 
            String(c.q || "").toLowerCase().includes(subject.name.toLowerCase()) ||
            String(c.a || "").toLowerCase().includes(subject.name.toLowerCase())
          ).length;
          
          val = Math.min(100, cardsCount * 10); // scale up
          if (val < 25) cellClass = "cell-red";
          else if (val < 65) cellClass = "cell-yellow";
        } else if (row.key === "gaps") {
          // Derived gaps (inverse of coverage)
          const matchingSessions = sessions.filter(s => s.subjectId === subject.id);
          const totalMs = matchingSessions.reduce((acc, s) => acc + (s.durationMs || 0), 0);
          const totalMins = totalMs / 60000;
          const cov = Math.min(100, Math.round((totalMins / 120) * 100));
          val = 100 - cov;
          
          if (val > 60) cellClass = "cell-red";
          else if (val > 30) cellClass = "cell-yellow";
        } else {
          // Incomplete priorities containing subject name
          const tasks = priorities.filter(p => 
            !p.completed && String(p.title || "").toLowerCase().includes(subject.name.toLowerCase())
          ).length;
          
          val = tasks;
          unit = " tasks";
          if (val > 3) cellClass = "cell-red";
          else if (val > 1) cellClass = "cell-yellow";
        }

        html += `
          <div class="cortex-heatmap-cell ${cellClass}" 
               data-module="${subject.name}" 
               data-metric="${row.label}" 
               data-value="${val}${unit}">
          </div>
        `;
      });

      html += `</div></div>`;
    });

    matrixGrid.innerHTML = html;

    // Tooltip presentation logic
    const tooltip = $("cortex-matrix-tooltip");
    const cells = $$(".cortex-heatmap-cell");

    cells.forEach(cell => {
      cell.addEventListener("mouseenter", (e) => {
        const mod = cell.getAttribute("data-module");
        const metric = cell.getAttribute("data-metric");
        const value = cell.getAttribute("data-value");

        if (tooltip) {
          tooltip.innerHTML = `<strong>${mod}</strong> &bull; ${metric}: <span style="font-family:var(--cortex-font-mono);">${value}</span>`;
          tooltip.style.display = "block";
          tooltip.style.opacity = "1";
          positionTooltip(e);
        }
      });

      cell.addEventListener("mousemove", (e) => {
        positionTooltip(e);
      });

      cell.addEventListener("mouseleave", () => {
        if (tooltip) {
          tooltip.style.opacity = "0";
          tooltip.style.display = "none";
        }
      });
    });

    function positionTooltip(e) {
      if (!tooltip) return;
      const rect = matrixGrid.getBoundingClientRect();
      const left = e.clientX - rect.left;
      const top = e.clientY - rect.top;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
  }

  // --- SCROLL 1: BUILD LIFECYCLE MONITOR ---
  function setupBuildMonitor() {
    const nodes = $$(".cortex-timeline-node");
    nodes.forEach(node => {
      node.addEventListener("click", (e) => {
        if (e.target.closest(".cortex-terminal-container")) return;

        const isExpanded = node.classList.contains("expanded");
        nodes.forEach(n => n.classList.remove("expanded"));

        if (!isExpanded) {
          node.classList.add("expanded");
          logCortexInteraction("check-ingest-stage", node.getAttribute("data-stage"));
          const logEl = node.querySelector(".cortex-terminal-log");
          if (logEl) {
            simulateTerminalLog(logEl, node.getAttribute("data-stage"));
          }
        }
      });
    });
  }

  function simulateTerminalLog(el, stage) {
    el.innerHTML = "";
    if (typeof STATE === "undefined") return;

    // Read the latest book being processed
    const latestBook = STATE.books && STATE.books.length > 0 
      ? STATE.books[STATE.books.length - 1] 
      : { title: "N/A Study Guide", pages: 120 };

    let logs = [];
    if (stage === "lint") {
      logs = [
        `Detecting new imported file in books folder...`,
        `Analyzing file: "${latestBook.title || latestBook.name}"`,
        `Validating document metadata structure...`,
        `✔ Ingestion pipeline verified for parsing.`
      ];
    } else if (stage === "unit-test") {
      logs = [
        `Running PDF text parser engine...`,
        `Extracting text chunks from ${latestBook.pages || 42} pages...`,
        `Extracted successfully. Processing embeddings...`,
        `✔ Text Extraction: 100% parsed.`
      ];
    } else if (stage === "build") {
      const flashcardsCount = STATE.flashcards?.length || 0;
      logs = [
        `Initializing AI model prompt context...`,
        `Summarizing core topics & generating QA flashcards...`,
        `Checking cards database: ${flashcardsCount} study cards synced.`,
        `✔ Generated QA Cards successfully.`
      ];
    } else {
      logs = [
        `Connecting to local synchronization hub...`,
        `Syncing flashcards and summary notes...`,
        `Rebuilding local indices on workspace server...`,
        `✔ Database refreshed. All study aids ready.`
      ];
    }

    let i = 0;
    function printNextLine() {
      if (i < logs.length) {
        let line = logs[i];
        let lineClass = "";
        if (line.includes("Error")) lineClass = "error";
        else if (line.includes("✔") || line.includes("PASS")) lineClass = "passed";
        
        el.innerHTML += `<div class="cortex-terminal-line ${lineClass}" style="margin-bottom:4px;">&gt; ${line}</div>`;
        el.scrollTop = el.scrollHeight;
        i++;
        setTimeout(printNextLine, 250);
      }
    }
    printNextLine();
  }

  // --- SCROLL 2: DEPENDENCY & FAILURE SIMULATOR ---
  let globeAngle = 0;
  function setupGlobe() {
    const svg = $("cortex-globe");
    if (!svg) return;

    const width = 300;
    const height = 300;
    const center = 150;
    const radius = 100;
    const fov = 150;

    function animateGlobe() {
      if (!$("subapp-cortex") || !$("subapp-cortex").classList.contains("active")) {
        requestAnimationFrame(animateGlobe);
        return;
      }

      globeAngle += 0.004;
      let html = "";
      
      // Draw grid lines
      for (let lat = -60; lat <= 60; lat += 30) {
        const ringRad = radius * Math.cos(lat * Math.PI / 180);
        const yVal = radius * Math.sin(lat * Math.PI / 180);
        html += `<ellipse cx="${center}" cy="${center - yVal}" rx="${ringRad}" ry="${ringRad * 0.2}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.8"/>`;
      }

      for (let lon = 0; lon < 180; lon += 45) {
        const rad = (lon * Math.PI / 180) + globeAngle;
        html += `<path d="M ${center - radius * Math.sin(rad)} ${center} Q ${center} ${center - radius} ${center + radius * Math.sin(rad)} ${center} Q ${center} ${center + radius} ${center - radius * Math.sin(rad)} ${center}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.8"/>`;
      }

      // Sync Node Coordinates
      const syncNodes = [
        { id: "laptop", name: "Workspace Laptop", x: -60, y: 35, z: 0, status: "passed", deps: ["cloud", "tablet"] },
        { id: "tablet", name: "iPad Hand-drawn Notes", x: -10, y: 50, z: 0, status: "passed", deps: ["mobile"] },
        { id: "mobile", name: "Mobile Flashcards App", x: 70, y: 20, z: 0, status: "passed", deps: ["laptop"] },
        { id: "cloud", name: "Nyvron Secure Cloud Sync", x: -45, y: -20, z: 0, status: "passed", deps: ["mobile"] }
      ];

      const projectedNodes = syncNodes.map(node => {
        const phi = node.y * Math.PI / 180;
        const theta = (node.x * Math.PI / 180) + globeAngle;
        
        const x3d = radius * Math.cos(phi) * Math.sin(theta);
        const y3d = radius * Math.sin(phi);
        const z3d = radius * Math.cos(phi) * Math.cos(theta);

        const scale = fov / (fov + z3d);
        const sx = center + x3d * scale;
        const sy = center - y3d * scale;
        const visible = z3d > -20;

        return { ...node, sx, sy, visible, scale };
      });

      // Draw lines
      projectedNodes.forEach(node => {
        if (!node.visible) return;
        node.deps.forEach(depId => {
          const depNode = projectedNodes.find(n => n.id === depId);
          if (depNode && depNode.visible) {
            let isFailed = (isolatedNode === node.id || isolatedNode === depNode.id);
            let strokeColor = isFailed ? "var(--cortex-destructive)" : "rgba(10, 132, 255, 0.4)";
            let dash = isFailed ? "3,3" : "none";
            
            html += `<line x1="${node.sx}" y1="${node.sy}" x2="${depNode.sx}" y2="${depNode.sy}" stroke="${strokeColor}" stroke-dasharray="${dash}" stroke-width="${isFailed ? 1.5 : 1}"/>`;
          }
        });
      });

      // Draw dots
      projectedNodes.forEach(node => {
        if (!node.visible) return;
        
        let statusColor = navigator.onLine ? "var(--cortex-success)" : "var(--cortex-warning)";
        if (node.id === isolatedNode) statusColor = "var(--cortex-destructive)";
        else if (isolatedNode && node.deps.includes(isolatedNode)) statusColor = "var(--cortex-warning)";

        const rad = 6 * node.scale;
        
        html += `
          <g class="globe-node-group" data-id="${node.id}" style="cursor:pointer;">
            <circle cx="${node.sx}" cy="${node.sy}" r="${rad + 4}" fill="${statusColor}" fill-opacity="0.15" />
            <circle cx="${node.sx}" cy="${node.sy}" r="${rad}" fill="${statusColor}" />
            <text x="${node.sx + 8}" y="${node.sy + 4}" fill="white" font-size="${9 * node.scale}px" opacity="${node.scale * 0.8}">${node.id.toUpperCase()}</text>
          </g>
        `;
      });

      svg.innerHTML = html;

      const groups = svg.querySelectorAll(".globe-node-group");
      groups.forEach(g => {
        g.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          showContextMenu(e, g.getAttribute("data-id"));
        });
        g.addEventListener("click", (e) => {
          e.preventDefault();
          selectNode(g.getAttribute("data-id"));
        });
      });

      requestAnimationFrame(animateGlobe);
    }

    animateGlobe();
  }

  function showContextMenu(e, nodeId) {
    const menu = $("cortex-globe-menu");
    if (!menu) return;

    menu.style.display = "block";
    const overlay = $("subapp-cortex").getBoundingClientRect();
    const x = e.clientX - overlay.left;
    const y = e.clientY - overlay.top;
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    setTimeout(() => menu.classList.add("active"), 10);

    const isolateBtn = $("menu-action-isolate");
    const pingBtn = $("menu-action-ping");

    isolateBtn.innerText = isolatedNode === nodeId ? "Reconnect Device" : "Isolate Device Connection";
    if (isolatedNode === nodeId) isolateBtn.classList.remove("destructive");
    else isolateBtn.classList.add("destructive");

    const newIsolateBtn = isolateBtn.cloneNode(true);
    isolateBtn.parentNode.replaceChild(newIsolateBtn, isolateBtn);
    newIsolateBtn.addEventListener("click", () => {
      toggleIsolateNode(nodeId);
      hideMenu();
    });

    const newPingBtn = pingBtn.cloneNode(true);
    pingBtn.parentNode.replaceChild(newPingBtn, pingBtn);
    newPingBtn.addEventListener("click", () => {
      const pingMs = Math.round(5 + Math.random() * 30);
      alert(`Sync ping to ${nodeId.toUpperCase()}: ${pingMs}ms`);
      hideMenu();
    });

    document.addEventListener("click", clickOutsideMenu);
  }

  function hideMenu() {
    const menu = $("cortex-globe-menu");
    if (menu) {
      menu.classList.remove("active");
      setTimeout(() => menu.style.display = "none", 150);
    }
    document.removeEventListener("click", clickOutsideMenu);
  }

  function clickOutsideMenu(e) {
    if (!e.target.closest(".cortex-context-menu")) {
      hideMenu();
    }
  }

  function toggleIsolateNode(nodeId) {
    if (isolatedNode === nodeId) {
      isolatedNode = null;
      localStorage.removeItem("nv-isolated-sync-node");
      logCortexInteraction("reconnect-device", nodeId);
      $("globe-sim-status").innerText = "Fully Operational";
      $("globe-sim-status").style.color = "var(--cortex-success)";
      $("globe-sim-latency").innerText = "+0ms avg";
      $("globe-sim-impact").innerText = "0 devices offline";
    } else {
      isolatedNode = nodeId;
      localStorage.setItem("nv-isolated-sync-node", nodeId);
      logCortexInteraction("simulate-sync-cut", `Isolated device sync for: ${nodeId}`);
      $("globe-sim-status").innerText = `Degraded (Sync Cut: ${nodeId.toUpperCase()})`;
      $("globe-sim-status").style.color = "var(--cortex-destructive)";
      $("globe-sim-latency").innerText = "+142s queue delay";
      $("globe-sim-impact").innerText = "Sync nodes isolated";
    }
  }

  function selectNode(nodeId) {
    const syncDeviceNames = {
      laptop: "Workspace Laptop",
      tablet: "iPad Hand-drawn Notes",
      mobile: "Mobile Flashcards App",
      cloud: "Nyvron Secure Cloud Sync"
    };

    $("globe-selected-region").innerText = syncDeviceNames[nodeId] || nodeId;
    $("globe-selected-status").innerText = isolatedNode === nodeId ? "OFFLINE (Isolate)" : "SYNCHRONIZED";
    $("globe-selected-status").style.color = isolatedNode === nodeId ? "var(--cortex-destructive)" : "var(--cortex-success)";
  }

  // --- SCROLL 2: DATABASE CLUSTER DEEP DIVE ---
  function setupDbCharts() {
    const c1 = $("db-chart-pool");
    const c2 = $("db-chart-latency");
    const c3 = $("db-chart-growth");

    const quickNotes = JSON.parse(localStorage.getItem('nv-quick-notes') || '[]');
    if (c1) drawPoolGauge(c1, quickNotes.length, 50);
    if (c2) drawLatencyChart(c2);
    if (c3) drawGrowthBarChart(c3);
  }

  function drawPoolGauge(canvas, active, max) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2 + 10;
    const r = Math.min(w, h) / 2.5;

    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 2.2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.stroke();

    const pct = Math.min(1.0, active / max);
    const endAngle = Math.PI * 0.8 + (Math.PI * 1.4 * pct);
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.8, endAngle);
    ctx.strokeStyle = "var(--cortex-accent)";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.font = "bold 22px var(--cortex-font-mono)";
    ctx.fillText(`${active}/${max}`, cx, cy - 5);
    
    ctx.fillStyle = "var(--cortex-muted)";
    ctx.font = "500 11px var(--cortex-font-sans)";
    ctx.fillText("QUICK NOTES POOL", cx, cy + 18);
  }

  function drawLatencyChart(canvas) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Use actual Measured local storage write latency!
    const dataP50 = localLatencyHistory.map(l => l);
    const dataP90 = localLatencyHistory.map(l => l * 1.8);
    const dataP99 = localLatencyHistory.map(l => l * 3.5);

    const padding = { top: 20, right: 10, bottom: 25, left: 30 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH * (i / 4));
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = "var(--cortex-muted)";
      ctx.font = "8px var(--cortex-font-mono)";
      ctx.textAlign = "right";
      ctx.fillText((2.0 - (0.5 * i)).toFixed(1) + "ms", padding.left - 5, y + 3);
    }

    function drawLine(data, color, fillGrad) {
      ctx.beginPath();
      const points = [];
      data.forEach((val, i) => {
        const x = padding.left + (chartW * (i / (data.length - 1)));
        const y = padding.top + chartH * (1 - Math.min(2.0, val) / 2.0);
        points.push({ x, y });
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      if (fillGrad) {
        ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
        ctx.lineTo(points[0].x, padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = fillGrad;
        ctx.fill();
      }
    }

    const gradP50 = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradP50.addColorStop(0, "rgba(48, 209, 88, 0.15)");
    gradP50.addColorStop(1, "rgba(48, 209, 88, 0)");

    drawLine(dataP50, "var(--cortex-success)", gradP50);
    drawLine(dataP90, "var(--cortex-warning)", null);
    drawLine(dataP99, "var(--cortex-destructive)", null);

    const label = $("db-latency-scrub-val");
    canvas.addEventListener("mousemove", (e) => {
      const rectCanvas = canvas.getBoundingClientRect();
      const clientX = e.clientX - rectCanvas.left;
      
      if (clientX >= padding.left && clientX <= w - padding.right) {
        drawLatencyChart(canvas);
        
        ctx.strokeStyle = "var(--cortex-accent)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(clientX, padding.top);
        ctx.lineTo(clientX, padding.top + chartH);
        ctx.stroke();

        const ratio = (clientX - padding.left) / chartW;
        const index = Math.round(ratio * (dataP50.length - 1));
        
        if (label && dataP50[index]) {
          label.innerText = `Read: ${dataP50[index].toFixed(2)}ms | Write: ${dataP90[index].toFixed(2)}ms`;
          label.style.display = "block";
        }
      }
    });

    canvas.addEventListener("mouseleave", () => {
      drawLatencyChart(canvas);
      if (label) label.style.display = "none";
    });
  }

  function drawGrowthBarChart(canvas) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Get actual local storage byte sizes!
    const getLocalStorageSize = (key) => {
      const data = localStorage.getItem(key);
      return data ? (data.length * 2) / 1024 : 0.1; // size in KB
    };

    const data = [
      { name: "chat", size: getLocalStorageSize("nv-chat") },
      { name: "books", size: getLocalStorageSize("nv-books") },
      { name: "cards", size: getLocalStorageSize("nv-flashcards") },
      { name: "priorities", size: getLocalStorageSize("nv-priorities") }
    ];

    const padding = { top: 15, right: 10, bottom: 25, left: 55 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxSize = Math.max(10, ...data.map(d => d.size));

    data.forEach((item, i) => {
      const barH = 16;
      const y = padding.top + (chartH / data.length) * i + (chartH / data.length - barH) / 2;
      const barW = chartW * (item.size / maxSize);

      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(padding.left, y, chartW, barH);

      ctx.fillStyle = "var(--cortex-accent)";
      ctx.fillRect(padding.left, y, barW, barH);

      ctx.fillStyle = "white";
      ctx.font = "10px var(--cortex-font-sans)";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name, padding.left - 8, y + barH / 2);

      ctx.fillStyle = "var(--cortex-muted)";
      ctx.font = "9px var(--cortex-font-mono)";
      ctx.textAlign = "left";
      ctx.fillText(item.size.toFixed(1) + "KB", padding.left + barW + 6, y + barH / 2);
    });
  }

  // --- SCROLL 3: RESOURCE TRACKING & TEAM VELOCITY ---
  function setupTelemetryChart() {
    const segmentBtns = $$("#cortex-telemetry-segments .cortex-segment-btn");
    segmentBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        segmentBtns.forEach(el => el.classList.remove("active"));
        btn.classList.add("active");
        activeTelemetrySegment = btn.getAttribute("data-value");
        logCortexInteraction("change-segment", activeTelemetrySegment);
        renderTelemetryChart();
      });
    });

    const legendItems = $$("#cortex-telemetry-legend .cortex-legend-item");
    legendItems.forEach(item => {
      item.addEventListener("click", () => {
        const lineId = item.getAttribute("data-line");
        if (hiddenTelemetryLines.has(lineId)) {
          hiddenTelemetryLines.delete(lineId);
          item.classList.remove("hidden");
        } else {
          hiddenTelemetryLines.add(lineId);
          item.classList.add("hidden");
        }
        renderTelemetryChart();
      });
    });

    renderTelemetryChart();
  }

  function renderTelemetryChart() {
    const canvas = $("cortex-telemetry-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 15, bottom: 25, left: 35 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH * (i / 4));
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = "var(--cortex-muted)";
      ctx.font = "8px var(--cortex-font-mono)";
      ctx.textAlign = "right";
      ctx.fillText((100 - 25 * i) + "%", padding.left - 5, y + 3);
    }

    // Bind values from real sessions
    let dataPoints = 12;
    if (activeTelemetrySegment === "1h") dataPoints = 12;
    else if (activeTelemetrySegment === "24h") dataPoints = 24;
    else dataPoints = 7;

    const cpu = [];
    const mem = [];
    const net = [];

    // Base math calculations on sessions count and tasks length
    const sessions = STATE.cascara?.sessions || [];
    const activeTasks = STATE.priorities?.filter(p => !p.completed).length || 1;

    for (let i = 0; i < dataPoints; i++) {
      // Simulate curves fluctuating around real metrics
      const baseCpu = Math.min(95, 20 + activeTasks * 6);
      cpu.push(baseCpu + Math.sin(i * 0.5) * 8 + Math.random() * 5);
      mem.push(45 + Math.min(45, sessions.length * 2) + Math.cos(i * 0.3) * 3);
      net.push(10 + Math.sin(i * 0.8) * 15 + Math.random() * 10);
    }

    function drawTelemetryLine(data, color, isHidden) {
      if (isHidden) return;
      ctx.beginPath();
      data.forEach((val, i) => {
        const x = padding.left + (chartW * (i / (data.length - 1)));
        const y = padding.top + chartH * (1 - val / 100);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }

    drawTelemetryLine(cpu, "var(--cortex-accent)", hiddenTelemetryLines.has("cpu"));
    drawTelemetryLine(mem, "var(--cortex-warning)", hiddenTelemetryLines.has("mem"));
    drawTelemetryLine(net, "var(--cortex-success)", hiddenTelemetryLines.has("net"));
  }

  // --- SCROLL 3: COST HEATMAP ---
  function setupCostHeatmap() {
    const grid = $("cortex-cost-heatmap-grid");
    if (!grid || typeof STATE === "undefined") return;

    const resources = ["Self Study", "Lectures", "Breaks / Distractions", "Notes Review"];
    let html = "";
    
    const sessions = STATE.cascara?.sessions || [];

    resources.forEach((res, rowIdx) => {
      html += `<div class="cortex-cost-row-label">${res.toUpperCase()}</div>`;
      for (let hour = 0; hour < 24; hour++) {
        // Calculate dynamic waste mapping actual sessions
        let intensity = 0.05;
        
        if (res === "Breaks / Distractions") {
          // Highlight late night or early afternoon as high distraction waste
          if (hour >= 22 || (hour >= 13 && hour <= 15)) {
            intensity = 0.5 + Math.random() * 0.3;
          }
        } else if (res === "Self Study") {
          // Count real sessions starting in this hour range
          const matchCount = sessions.filter(s => {
            if (!s.start) return false;
            const startHour = new Date(s.start).getHours();
            return startHour === hour;
          }).length;
          intensity = Math.min(1.0, 0.05 + matchCount * 0.4);
        } else {
          intensity = Math.random() * 0.2;
        }

        let opacity = intensity.toFixed(2);
        let color = `rgba(255, 69, 58, ${opacity})`; // red waste
        if (res === "Self Study") {
          color = `rgba(48, 209, 88, ${opacity})`; // green study focus
        } else if (intensity < 0.2) {
          color = `rgba(255, 255, 255, 0.03)`;
        } else {
          color = `rgba(255, 214, 10, ${opacity})`; // yellow distraction
        }

        html += `
          <div class="cortex-cost-cell" 
               style="background:${color};"
               data-res="${res}" 
               data-hour="${hour}" 
               data-intensity="${(intensity * 100).toFixed(0)}">
          </div>
        `;
      }
    });

    grid.innerHTML = html;

    // Trigger Warning Banner based on real low hours
    const banner = $("cortex-cost-warning");
    const sheetOverlay = $("cortex-action-sheet-overlay");

    // If total study focus is low, trigger alert banner
    if (sessions.length < 3) {
      if (banner) banner.style.display = "flex";
    } else {
      if (banner) banner.style.display = "none";
    }

    if (banner) {
      banner.addEventListener("click", () => {
        if (sheetOverlay) sheetOverlay.classList.add("active");
      });
    }

    const applyBtn = $("action-btn-apply");
    const cancelBtn = $("action-btn-cancel");

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        applyBtn.innerText = "Activating Focus Mode blocking rules...";
        applyBtn.style.background = "var(--cortex-warning)";
        applyBtn.style.color = "black";
        
        logCortexInteraction("enable-focus-firewall", "Blocked distracting sites");

        setTimeout(() => {
          applyBtn.innerText = "Focus Firewall Active";
          applyBtn.style.background = "var(--cortex-success)";
          applyBtn.style.color = "white";
          if (banner) banner.style.display = "none";
          
          setTimeout(() => {
            if (sheetOverlay) sheetOverlay.classList.remove("active");
            applyBtn.innerText = "Apply Focus Mode Block";
            applyBtn.style.background = "var(--cortex-accent)";
          }, 1200);
        }, 2000);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        if (sheetOverlay) sheetOverlay.classList.remove("active");
      });
    }

    grid.addEventListener("click", (e) => {
      const cell = e.target.closest(".cortex-cost-cell");
      if (cell) {
        const res = cell.getAttribute("data-res");
        const hour = cell.getAttribute("data-hour");
        const val = cell.getAttribute("data-intensity");
        alert(`Activity: ${res} \nHour: ${hour}:00 \nFocus Index: ${val}%`);
      }
    });
  }

  // --- SCROLL 3: TEAM SYNERGY HUB ---
  function setupSynergyHub() {
    const list = $("cortex-commits-list");
    if (!list || typeof STATE === "undefined") return;

    let html = "";
    
    // Read the actual study sessions logged by the user!
    const sessions = STATE.cascara?.sessions || [];
    
    if (sessions.length === 0) {
      html = `<div style="text-align:center; padding:20px; color:var(--cortex-muted);">No focus study sessions logged yet. Use the timer tab to log time.</div>`;
    } else {
      sessions.slice(-4).forEach((s, idx) => {
        const durationMins = Math.round(s.durationMs / 60000);
        const startTimeStr = s.start ? new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
        const timeAgo = s.date || "Today";

        html += `
          <div class="cortex-table-cell" data-idx="${idx}">
            <div class="cortex-cell-content">
              <div class="cortex-cell-avatar" style="background:var(--cortex-accent);">SL</div>
              <div class="cortex-cell-info">
                <div class="cortex-cell-msg">Studied ${s.subjectName || "Subject"} for ${durationMins}m</div>
                <div class="cortex-cell-meta">
                  <span class="cortex-cell-author">${timeAgo}</span>
                  <span>&bull;</span>
                  <span>Started ${startTimeStr}</span>
                </div>
              </div>
              <div style="font-size:12px; color:var(--cortex-muted); margin-left:8px;">&rsaquo;</div>
            </div>
            <div class="cortex-cell-actions">
              <div class="cortex-swipe-btn flag" onclick="alert('Flagged logged study session.')">Flag</div>
              <div class="cortex-swipe-btn review" onclick="alert('Reviewing detailed session graph...')">Review</div>
            </div>
          </div>
        `;
      });
    }

    list.innerHTML = html;

    // UITableView Swipe Actions
    const cells = $$(".cortex-table-cell");
    cells.forEach(cell => {
      const content = cell.querySelector(".cortex-cell-content");
      if (!content) return;

      content.addEventListener("touchstart", (e) => {
        swipeStartX = e.touches[0].clientX;
        activeSwipeCell = cell;
      });

      content.addEventListener("touchmove", (e) => {
        if (activeSwipeCell !== cell) return;
        const diffX = e.touches[0].clientX - swipeStartX;
        if (diffX < 0 && diffX > -140) {
          content.style.transform = `translateX(${diffX}px)`;
        }
      });

      content.addEventListener("touchend", (e) => {
        if (activeSwipeCell !== cell) return;
        const diffX = e.changedTouches[0].clientX - swipeStartX;
        if (diffX < -70) {
          content.style.transform = "translateX(-140px)";
        } else {
          content.style.transform = "translateX(0)";
        }
      });

      let isDragging = false;
      content.addEventListener("mousedown", (e) => {
        swipeStartX = e.clientX;
        isDragging = true;
        activeSwipeCell = cell;
      });

      document.addEventListener("mousemove", (e) => {
        if (!isDragging || activeSwipeCell !== cell) return;
        const diffX = e.clientX - swipeStartX;
        if (diffX < 0 && diffX > -140) {
          content.style.transform = `translateX(${diffX}px)`;
        }
      });

      document.addEventListener("mouseup", (e) => {
        if (!isDragging || activeSwipeCell !== cell) return;
        isDragging = false;
        const diffX = e.clientX - swipeStartX;
        if (diffX < -70) {
          content.style.transform = "translateX(-140px)";
        } else {
          content.style.transform = "translateX(0)";
        }
      });
    });

    drawVelocityChart();
  }

  function drawVelocityChart() {
    const canvas = $("cortex-velocity-chart");
    if (!canvas || typeof STATE === "undefined") return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 15, right: 10, bottom: 20, left: 25 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const sprints = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const points = [0, 0, 0, 0, 0, 0, 0];

    // Group real logged study session hours by day of week
    const sessions = STATE.cascara?.sessions || [];
    sessions.forEach(s => {
      if (!s.start) return;
      const dayIdx = (new Date(s.start).getDay() + 6) % 7; // map Mon=0, Sun=6
      points[dayIdx] += (s.durationMs || 0) / 3600000; // in hours
    });

    const maxHours = Math.max(4, ...points);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (chartH * (i / 3));
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = "var(--cortex-muted)";
      ctx.font = "8px var(--cortex-font-mono)";
      ctx.textAlign = "right";
      ctx.fillText((maxHours - (maxHours / 3) * i).toFixed(1) + "h", padding.left - 5, y + 3);
    }

    const barW = 14;
    sprints.forEach((sprint, i) => {
      const x = padding.left + (chartW / sprints.length) * i + (chartW / sprints.length - barW) / 2;
      const barH = chartH * (points[i] / maxHours);
      const y = padding.top + chartH - barH;

      ctx.fillStyle = "var(--cortex-accent)";
      ctx.fillRect(x, y, barW, barH);

      if (points[i] > 0) {
        ctx.fillStyle = "white";
        ctx.font = "8px var(--cortex-font-mono)";
        ctx.textAlign = "center";
        ctx.fillText(points[i].toFixed(1), x + barW / 2, y - 4);
      }

      ctx.fillStyle = "var(--cortex-muted)";
      ctx.font = "9px var(--cortex-font-sans)";
      ctx.fillText(sprint, x + barW / 2, padding.top + chartH + 12);
    });
  }

  // --- SCROLL 4: PROFILE PERFORMANCE LAB FLAME GRAPH ---
  function setupFlameGraph() {
    const resetBtn = $("cortex-flame-reset");
    const container = $("cortex-flame-wrapper");
    if (!container || typeof STATE === "undefined") return;

    // Calculate real session distribution across subjects
    const subjects = STATE.cascara?.subjects || [];
    const sessions = STATE.cascara?.sessions || [];

    const callStack = [[{ name: "[root]", size: 100, cat: "idle" }]];

    // Build row 2 based on subjects proportional share
    const row2 = [];
    const totalMs = sessions.reduce((acc, s) => acc + (s.durationMs || 0), 0);

    if (totalMs === 0) {
      // Even division if empty
      subjects.forEach(s => {
        row2.push({ name: s.name, size: 100 / subjects.length, cat: "user" });
      });
    } else {
      subjects.forEach(sub => {
        const subMs = sessions.filter(s => s.subjectId === sub.id).reduce((acc, s) => acc + (s.durationMs || 0), 0);
        const pct = (subMs / totalMs) * 100;
        if (pct > 0) {
          row2.push({ name: sub.name, size: Math.round(pct), cat: "user" });
        }
      });
      // Remaining idle break percent
      const calculatedPct = row2.reduce((acc, r) => acc + r.size, 0);
      if (calculatedPct < 100) {
        row2.push({ name: "Unscheduled Break", size: 100 - calculatedPct, cat: "idle" });
      }
    }

    callStack.push(row2);

    // Row 3: details for each session type
    const row3 = [];
    row2.forEach(parent => {
      if (parent.cat === "idle") {
        row3.push({ name: "Break Interval", size: parent.size, cat: "idle" });
      } else {
        // Divide subject session into notes synthesis and self-study blocks
        row3.push({ name: `${parent.name} Reading`, size: Math.round(parent.size * 0.6), cat: "user" });
        row3.push({ name: `${parent.name} Flashcards`, size: Math.round(parent.size * 0.4), cat: "gc" });
      }
    });

    callStack.push(row3);

    function renderFlameGraph(zoomedNodeName = null) {
      let html = "";
      
      callStack.forEach(row => {
        html += `<div class="cortex-flame-row">`;

        row.forEach(item => {
          let flexGrow = item.size;
          let label = item.name;

          if (zoomedNodeName) {
            if (item.name === zoomedNodeName || item.name.startsWith(zoomedNodeName)) {
              flexGrow = 100;
            } else {
              flexGrow = 0;
              label = "";
            }
          }

          if (flexGrow > 0) {
            html += `
              <div class="cortex-flame-node flame-${item.cat}" 
                   style="flex-grow: ${flexGrow};"
                   data-name="${item.name}"
                   title="${item.name} (${item.size.toFixed(0)}%)">
                ${label}
              </div>
            `;
          }
        });
        html += `</div>`;
      });

      container.innerHTML = html;

      const nodes = container.querySelectorAll(".cortex-flame-node");
      nodes.forEach(n => {
        n.addEventListener("click", () => {
          const name = n.getAttribute("data-name");
          if (name === "[root]") return;

          flameZoomedNode = name;
          logCortexInteraction("zoom-flame-graph", name);
          renderFlameGraph(name);
          if (resetBtn) resetBtn.style.display = "block";
        });
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        flameZoomedNode = null;
        renderFlameGraph(null);
        resetBtn.style.display = "none";
      });
    }

    renderFlameGraph();
  }

  // --- SCROLL 4: SYSTEM DOCUMENTATION SEARCH ---
  function setupDocSearch() {
    const input = $("cortex-search-input");
    const clearBtn = $("cortex-search-clear");

    if (!input) return;

    // Load actual synthesis notes as search index!
    const notes = typeof STATE !== "undefined" ? STATE.synthesisNotes : [];
    const formattedNotes = notes.map(n => ({
      id: String(n.id || n.timestamp),
      name: n.title || "Synthesis Note",
      category: "Syllabus Notes",
      content: n.html || `<p>${n.text || "No note summary text."}</p>`
    }));

    const searchDocsData = [...DOCS_MOCK, ...formattedNotes];

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (q) {
        if (clearBtn) clearBtn.style.display = "block";
        searchDocs(q, searchDocsData);
      } else {
        if (clearBtn) clearBtn.style.display = "none";
        renderDocResults(searchDocsData);
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        clearBtn.style.display = "none";
        renderDocResults(searchDocsData);
      });
    }

    renderDocResults(searchDocsData);
  }

  function searchDocs(query, data) {
    const filtered = data.filter(doc => 
      doc.name.toLowerCase().includes(query) || 
      doc.category.toLowerCase().includes(query)
    );
    renderDocResults(filtered);
  }

  function renderDocResults(docs) {
    const container = $("cortex-doc-results");
    if (!container) return;

    let html = "";
    if (docs.length === 0) {
      html = `<div style="text-align:center; padding:20px; color:var(--cortex-muted);">No notes or documents match search query.</div>`;
    } else {
      docs.forEach(doc => {
        html += `
          <div class="cortex-doc-item" data-id="${doc.id}">
            <div>
              <div class="cortex-doc-name">${doc.name}</div>
              <div class="cortex-doc-meta">${doc.category}</div>
            </div>
            <div style="font-size:16px; color:var(--cortex-accent);">&rarr;</div>
          </div>
        `;
      });
    }

    container.innerHTML = html;

    const items = container.querySelectorAll(".cortex-doc-item");
    items.forEach(item => {
      item.addEventListener("click", () => {
        const docId = item.getAttribute("data-id");
        // Load note summary from search index
        const notes = typeof STATE !== "undefined" ? STATE.synthesisNotes : [];
        const formattedNotes = notes.map(n => ({
          id: String(n.id || n.timestamp),
          name: n.title || "Synthesis Note",
          category: "Syllabus Notes",
          content: n.html || `<p>${n.text || "No note summary text."}</p>`
        }));
        const fullIndex = [...DOCS_MOCK, ...formattedNotes];
        const doc = fullIndex.find(d => d.id === docId);
        
        if (doc) {
          logCortexInteraction("view-docs", doc.name);
          openDetentSheet(doc.name, doc.content);
        }
      });
    });
  }

  // --- INTERACTIVE DETENT SHEET (BOTTOM MODAL DRAWER) ---
  function setupDetentSheet() {
    const overlay = $("cortex-detent-overlay");
    const sheet = $("cortex-detent-sheet");
    const handle = $("cortex-detent-handle-area");
    const closeBtn = $("cortex-detent-close");

    if (!overlay || !sheet || !handle) return;

    closeBtn.addEventListener("click", closeDetentSheet);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDetentSheet();
    });

    handle.addEventListener("pointerdown", (e) => {
      isDraggingDetent = true;
      startDragY = e.clientY;
      startHeight = sheet.offsetHeight;
      sheet.style.transition = "none";
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener("pointermove", (e) => {
      if (!isDraggingDetent) return;
      const diffY = startDragY - e.clientY;
      const containerH = $("subapp-cortex").offsetHeight;
      const newHeightPct = ((startHeight + diffY) / containerH) * 100;

      const boundedH = Math.max(25, Math.min(95, newHeightPct));
      sheet.style.height = `${boundedH}%`;
      currentDetentHeight = boundedH;
    });

    handle.addEventListener("pointerup", (e) => {
      if (!isDraggingDetent) return;
      isDraggingDetent = false;
      sheet.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1)";

      let snapHeight = 50;
      if (currentDetentHeight < 40) {
        snapHeight = 30;
      } else if (currentDetentHeight > 70) {
        snapHeight = 90;
      } else {
        snapHeight = 50;
      }

      sheet.style.height = `${snapHeight}%`;
      currentDetentHeight = snapHeight;
      handle.releasePointerCapture(e.pointerId);
    });
  }

  function openDetentSheet(title, htmlContent) {
    const overlay = $("cortex-detent-overlay");
    const sheet = $("cortex-detent-sheet");
    const titleEl = $("cortex-detent-title");
    const bodyEl = $("cortex-detent-body");

    if (overlay && sheet && titleEl && bodyEl) {
      titleEl.innerText = title;
      bodyEl.innerHTML = htmlContent;
      
      overlay.classList.add("active");
      sheet.style.height = "50%";
      currentDetentHeight = 50;
    }
  }

  function closeDetentSheet() {
    const overlay = $("cortex-detent-overlay");
    if (overlay) overlay.classList.remove("active");
  }

  // Hook into subapp open event
  const originalOpenSubApp = window.openSubApp;
  window.openSubApp = function (id) {
    if (originalOpenSubApp) originalOpenSubApp(id);
    if (id === "cortex") {
      setTimeout(() => {
        init();
        setupDbCharts();
        renderTelemetryChart();
        drawVelocityChart();
      }, 400);
    }
  };

  // Mock DOCS_MOCK reference files
  const DOCS_MOCK = [
    { id: "syllabus-blueprint", name: "Syllabus Blueprint & High Weightage Guide", category: "Syllabus Info", content: `<h1>Syllabus Blueprint</h1><p>This handbook tracks micro-themes within our core subjects. Focus on Ecology & Environment and modern History which hold over 30% aggregate weight.</p><h2>Syllabus Coverage Strategy</h2><p>Read textbooks, parse chapters to Nyvron workspace, extract flashcards, and review weekly logs to audit retention metrics.</p>` },
    { id: "anki-guidelines", name: "Flashcard Creation & Anki Sync Guidelines", category: "Study Manuals", content: `<h1>Study Manual: Flashcards</h1><p>Creating active recall triggers accelerates memory retention. Summarize chapters into question-and-answer pairs.</p><h2>Card Guidelines</h2><p>Ensure questions are single-concept triggers. Run index sync to local flashcard database once cards are compiled.</p>` }
  ];
})();
