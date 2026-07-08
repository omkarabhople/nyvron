import re

with open('/Users/onkarbhople/nyvron/backend/server.js', 'r') as f:
    js = f.read()

# Add child_process import
if 'import { exec, spawn } from "child_process";' not in js:
    js = js.replace('import fetch from "node-fetch";', 'import fetch from "node-fetch";\nimport { exec, spawn } from "child_process";\nimport { promisify } from "util";\nconst execAsync = promisify(exec);')

endpoints = """
// --- macOS Native TTS API ---
app.get("/api/tts/voices", async (req, res) => {
  try {
    const { stdout } = await execAsync('say -v "?"');
    const lines = stdout.split('\\n');
    const voices = [];
    lines.forEach(line => {
      const match = line.match(/^([^\\s]+(?:\\s+[^\\s]+)*?)\\s+([a-z]{2}_[A-Z]{2})\\s+#\\s*(.*)$/);
      if (match) {
        voices.push({
          name: match[1].trim(),
          lang: match[2],
          demo: match[3]
        });
      }
    });
    res.json(voices);
  } catch (e) {
    console.error("Failed to get voices", e);
    res.status(500).json({ error: "Failed to load voices" });
  }
});

app.post("/api/tts/speak", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });
    
    const v = voice || "Samantha";
    const tempFile = path.join(__dirname, `tts_${Date.now()}.m4a`);
    
    const sayProcess = spawn('say', ['-v', v, text, '-o', tempFile]);
    sayProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: "TTS generation failed" });
      }
      res.sendFile(tempFile, (err) => {
        // Clean up temp file after sending
        fs.unlink(tempFile, () => {});
      });
    });
  } catch (e) {
    console.error("TTS failed", e);
    res.status(500).json({ error: "TTS generation failed" });
  }
});
"""

if "/api/tts/voices" not in js:
    js = js.replace('app.get("/", (req, res) => {', endpoints + '\napp.get("/", (req, res) => {')

with open('/Users/onkarbhople/nyvron/backend/server.js', 'w') as f:
    f.write(js)
