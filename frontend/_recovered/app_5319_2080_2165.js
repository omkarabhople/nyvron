
      li.appendChild(delBtn);
      li.appendChild(content);
      memoryListEl.appendChild(li);
    });
}

if (memorySaveBtn) {
  memorySaveBtn.addEventListener("click", () => {
    if (!memoryBodyInput) return;
    const body = memoryBodyInput.value.trim();
    const title = memoryTitleInput
      ? memoryTitleInput.value.trim()
      : "";
    if (!body) {
      alert("Memory details cannot be empty.");
      return;
    }
    const id = Date.now();
    memoryState.memories.push({
      id,
      title,
      body,
      createdAt: new Date().toISOString(),
    });
    saveJSON("nyvron_memory", memoryState);
    memoryBodyInput.value = "";
    if (memoryTitleInput) memoryTitleInput.value = "";
    renderMemories();
  });
}

// Knowledge file (.txt) UI renderer
function renderKnowledgeBaseUI() {
  const statusCard = document.getElementById("knowledge-status-card");
  const fileNameEl = document.getElementById("knowledge-file-name");
  const fileSizeEl = document.getElementById("knowledge-file-size");
  const wordCountEl = document.getElementById("knowledge-word-count");
  const removeBtn = document.getElementById("memory-remove-file-btn");
  const labelText = document.getElementById("upload-label-text");

  if (!statusCard) return;

  if (memoryState.fileName && memoryState.fileContent) {
    statusCard.classList.remove("hidden");
    if (removeBtn) removeBtn.classList.remove("hidden");
    fileNameEl.textContent = memoryState.fileName;
    fileSizeEl.textContent = memoryState.fileSize || "0 KB";
    wordCountEl.textContent = `${memoryState.fileWords || 0} words`;
    if (labelText) labelText.textContent = "Change document...";
  } else {
    statusCard.classList.add("hidden");
    if (removeBtn) removeBtn.classList.add("hidden");
    if (labelText) labelText.textContent = "Choose a .txt document...";
    if (memoryFileInput) memoryFileInput.value = "";
  }
}

if (memoryFileInput) {
  memoryFileInput.addEventListener("change", () => {
    const file = memoryFileInput.files[0];
    if (!file) return;

    // Check size limit: 1MB
    if (file.size > 1024 * 1024) {
      alert("⚠️ File too large. Knowledge files must be under 1MB for local storage sync.");
      memoryFileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const sizeStr = (file.size / 1024).toFixed(1) + " KB";

      memoryState.fileName = file.name;
      memoryState.fileContent = text;
      memoryState.fileSize = sizeStr;
      memoryState.fileWords = wordCount;

      saveJSON("nyvron_memory", memoryState);
      renderKnowledgeBaseUI();
      alert(`Attached file: ${file.name} (${sizeStr})`);
    };

