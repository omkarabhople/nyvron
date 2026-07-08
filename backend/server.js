import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { exec, spawn } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(express.json({ limit: "5mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Serve static frontend files on '/' with no-cache headers to prevent stale loads
const frontendPath = path.join(__dirname, "..", "frontend");
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  
  // Disable caching for all responses so Electron always loads fresh files
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.static(frontendPath, { etag: false, lastModified: false }));


// --- macOS Native TTS API ---
app.get("/api/tts/voices", async (req, res) => {
  try {
    const { stdout } = await execAsync('say -v "?"');
    const lines = stdout.split('\n');
    const voices = [];
    lines.forEach(line => {
      const match = line.match(/^([^\s]+(?:\s+[^\s]+)*?)\s+([a-z]{2}_[A-Z]{2})\s+#\s*(.*)$/);
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

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});


// Helper to find and read the API key from 'insert api key here'
// Helper to find and read the API key from 'insert api key here'
function getApiKey() {
  // Try environment variables first
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY.trim();
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  if (process.env.HF_TOKEN) return process.env.HF_TOKEN.trim();

  const possiblePaths = [
    path.join(__dirname, "..", "insert api key here"),
    path.join(process.cwd(), "insert api key here"),
    path.join(process.cwd(), "backend", "insert api key here"),
  ];

  if (process.resourcesPath) {
    possiblePaths.push(path.join(process.resourcesPath, "insert api key here"));
  }

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, "utf8");
        const lines = content.split(/\r?\n/);
        // Expecting the API key on Line 3 (index 2)
        if (lines.length >= 3) {
          let key = lines[2].trim();
          
          // Clean brackets, quotes, or placeholders if pasted inside them
          if (key.startsWith("[") && key.endsWith("]")) {
            key = key.slice(1, -1).trim();
          }
          if (key.startsWith('"') && key.endsWith('"')) {
            key = key.slice(1, -1).trim();
          }
          if (key.startsWith("'") && key.endsWith("'")) {
            key = key.slice(1, -1).trim();
          }

          if (key && !key.startsWith("#") && key !== "PASTE_YOUR_API_KEY_HERE") {
            return key;
          }
        }
      } catch (err) {
        console.error(`Error reading key from ${p}:`, err);
      }
    }
  }
  return null;
}

async function generateChatTitle(firstMessage, apiKey) {
  const prompt = `Based on this first message of a chat session, write a very short, clean title (3-4 words max, no quotes, no period, e.g. "Weekly Gym Plan" or "Project Setup"): "${firstMessage}"`;
  
  const isGemini = apiKey.startsWith("AIzaSy") || apiKey.startsWith("AQ.");
  if (isGemini) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 250, temperature: 0.5 }
    };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
      }
    } catch (err) {
      console.error("Gemini title generate error:", err);
    }
  } else {
    const isOpenAI = apiKey.startsWith("sk-");
    const isGroq = apiKey.startsWith("gsk_");
    const isGitHub = apiKey.startsWith("ghp_") || apiKey.startsWith("github_pat_");
    
    let url = "";
    let modelName = "";
    if (isOpenAI) {
      url = "https://api.openai.com/v1/chat/completions";
      modelName = "gpt-4o-mini";
    } else if (isGroq) {
      url = "https://api.groq.com/openai/v1/chat/completions";
      modelName = "llama-3.1-8b-instant";
    } else if (isGitHub) {
      url = "https://models.inference.ai.azure.com/chat/completions";
      modelName = "gpt-4o-mini";
    } else {
      url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1/chat/completions";
      modelName = "meta-llama/Meta-Llama-3-8B-Instruct";
    }

    const payload = {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.5
    };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch (err) {
      console.error("LLM title generate error:", err);
    }
  }
  return null;
}

// Chat API endpoint
app.post("/api/chat", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(401).json({
      error:
        "API key is missing. Please open the 'insert api key here' file in the project root and paste your API key on Line 3.",
    });
  }

  const { message, history, context, model, systemPromptOverride } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: "Missing 'message' parameter." });
  }

  // Format active user state context
  let prioritiesText = "None";
  if (context?.priorities && context.priorities.length > 0) {
    prioritiesText = context.priorities
      .map((p, idx) => `${idx + 1}. [${p.completed ? "x" : " "}] ${p.text}`)
      .join("\n");
  }

  let scheduleText = "None";
  if (context?.schedule && context.schedule.length > 0) {
    scheduleText = context.schedule.map((s) => `- ${s.text || s}`).join("\n");
  }

  let memoriesText = "None";
  if (context?.memories && context.memories.length > 0) {
    memoriesText = context.memories
      .map((m) => `- ${m.title || "Fact"}: ${m.body}`)
      .join("\n");
  }

  const knowledgeBaseText = context?.knowledgeBase
    ? context.knowledgeBase.trim()
    : "No custom knowledge base file uploaded.";

  // Dynamic system prompt incorporating the workspace context
  const systemPrompt = systemPromptOverride || `You are NYVRON, an AI of Cascara, a calm, precise, Apple-inspired personal command center assistant.
You help the user plan their day, organize task priorities, review schedules, log reflection journals, and answer queries.

Here is the user's active context from their local dashboard:
---
[PRIORITIES]
${prioritiesText}

[TODAY'S SCHEDULE]
${scheduleText}

[SAVED MEMORIES / FACTS]
${memoriesText}

[ATTACHED KNOWLEDGE BASE (.txt)]
${knowledgeBaseText}
---

INSTRUCTIONS:
1. Maintain an elegant, helpful, and highly clear, minimalist Apple-like tone.
2. If the user asks about their schedule, priorities, or memories, refer to the context provided above.
3. If the user asks questions related to the Attached Knowledge Base, prioritize answering based on that content.
4. Keep answers concise, direct, and well-structured. Use markdown formatting where helpful.`;

  // Determine provider routing
  const isKeyOpenAI = apiKey.startsWith("sk-");
  const isKeyGemini = apiKey.startsWith("AIzaSy") || apiKey.startsWith("AQ.");
  const isKeyGroq = apiKey.startsWith("gsk_");
  const isKeyGitHub = apiKey.startsWith("ghp_") || apiKey.startsWith("github_pat_");
  
  let targetProvider = "huggingface"; // default fallback
  if (model && model !== "auto") {
    if (model.startsWith("gemini")) {
      targetProvider = "gemini";
    } else if (model.startsWith("gpt")) {
      targetProvider = "openai";
    } else if (model === "groq-llama-3") {
      targetProvider = "groq";
    } else if (model === "llama-3") {
      targetProvider = "huggingface";
    } else if (model === "github" || model.startsWith("github-")) {
      targetProvider = "github";
    }
  } else {
    // Auto-detect based on key prefix
    if (isKeyGemini) targetProvider = "gemini";
    else if (isKeyOpenAI) targetProvider = "openai";
    else if (isKeyGroq) targetProvider = "groq";
    else if (isKeyGitHub) targetProvider = "github";
  }

  // Key validation
  if (targetProvider === "gemini" && !isKeyGemini) {
    return res.status(400).json({
      error: "You selected a Google Gemini model, but your saved API key is not a Google Gemini key. Please save a Gemini key (starts with AIzaSy) or change the model dropdown to Auto-Detect / OpenAI."
    });
  }
  if (targetProvider === "openai" && !isKeyOpenAI) {
    return res.status(400).json({
      error: "You selected an OpenAI model, but your saved API key is not an OpenAI key (starts with sk-). Please save an OpenAI key or change the model dropdown."
    });
  }
  if (targetProvider === "groq" && !isKeyGroq) {
    return res.status(400).json({
      error: "You selected a Groq model, but your saved API key is not a Groq key (starts with gsk_). Please save a Groq key (starts with gsk_) or change the model dropdown."
    });
  }
  if (targetProvider === "github" && !isKeyGitHub) {
    return res.status(400).json({
      error: "You selected a GitHub model, but your saved API key is not a GitHub key (starts with ghp_ or github_pat_). Please save a GitHub key or change the model dropdown."
    });
  }

  let generatedTitle = null;
  if ((!history || history.length === 0) && !systemPromptOverride) {
    generatedTitle = await generateChatTitle(message, apiKey);
  }

  let response;
  let reply = "";

  if (targetProvider === "gemini") {
    const targetModel = (model && model.startsWith("gemini")) ? model : "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
    
    // Map history to Gemini format (user -> user, ai -> model)
    const contents = [];
    if (history && history.length > 0) {
      history.forEach((h) => {
        contents.push({
          role: h.who === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7
      }
    };

    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        return res.status(response.status).json({
          error: `Gemini API error: ${response.statusText}. Details: ${errorText}`,
        });
      }

      const data = await response.json();
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "(No response from Gemini)";
      return res.status(200).json({ reply, title: generatedTitle });
    } catch (err) {
      console.error("Gemini connection error:", err);
      return res.status(500).json({ error: "Failed to connect to Gemini API." });
    }

  } else {
    // OpenAI or HuggingFace
    let apiUrl = "";
    let payload = {};

    if (targetProvider === "openai") {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history || []).map((h) => ({
            role: h.who === "user" ? "user" : "assistant",
            content: h.text,
          })),
          { role: "user", content: message },
        ],
        temperature: 0.7,
      };
    } else if (targetProvider === "groq") {
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      payload = {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history || []).map((h) => ({
            role: h.who === "user" ? "user" : "assistant",
            content: h.text,
          })),
          { role: "user", content: message },
        ],
        temperature: 0.7,
      };
    } else if (targetProvider === "github") {
      apiUrl = "https://models.inference.ai.azure.com/chat/completions";
      payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history || []).map((h) => ({
            role: h.who === "user" ? "user" : "assistant",
            content: h.text,
          })),
          { role: "user", content: message },
        ],
        temperature: 0.7,
      };
    } else {
      apiUrl = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1/chat/completions";
      payload = {
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history || []).map((h) => ({
            role: h.who === "user" ? "user" : "assistant",
            content: h.text,
          })),
          { role: "user", content: message },
        ],
        temperature: 0.7,
      };
    }

    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        return res.status(response.status).json({
          error: `LLM provider API error: ${response.statusText} (${response.status}). Details: ${errorText}`,
        });
      }

      const data = await response.json();
      reply = data.choices?.[0]?.message?.content || "(No response)";
      return res.status(200).json({ reply, title: generatedTitle });
    } catch (err) {
      console.error("Server API handler error:", err);
      return res.status(500).json({
        error: "Internal server error connecting to the AI backend provider.",
      });
    }
  }
});

// Insights / daily briefing endpoint
app.post("/api/insights", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(401).json({
      error: "API key missing.",
    });
  }

  const { context } = req.body || {};

  let prioritiesText = "None";
  if (context?.priorities && context.priorities.length > 0) {
    prioritiesText = context.priorities
      .map((p, idx) => `${idx + 1}. [${p.completed ? "x" : " "}] ${p.text}`)
      .join("\n");
  }

  let scheduleText = "None";
  if (context?.schedule && context.schedule.length > 0) {
    scheduleText = context.schedule.map((s) => `- ${s.text || s}`).join("\n");
  }

  const prompt = `You are NYVRON, an AI of Cascara, a personal productivity AI.
Based on the user's dashboard context below, write a short, sharp daily briefing (3-4 sentences max).
Focus on what matters most right now. Be encouraging but precise.

Context:
Priorities:
${prioritiesText}

Schedule:
${scheduleText}

Write the briefing now:`;

  if (apiKey.startsWith("AIzaSy") || apiKey.startsWith("AQ.")) {
    // Gemini Insights
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 200
      }
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      const insight = data.candidates?.[0]?.content?.parts?.[0]?.text || "No insights generated.";
      return res.status(200).json({ insight });
    } catch (err) {
      return res.status(500).json({ error: "Gemini connection error." });
    }
  } else {
    // OpenAI, Groq, or HuggingFace Insights
    const isOpenAI = apiKey.startsWith("sk-");
    const isGroq = apiKey.startsWith("gsk_");

    let apiUrl = "";
    let modelName = "";

    if (isOpenAI) {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      modelName = "gpt-4o-mini";
    } else if (isGroq) {
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      modelName = "llama-3.1-8b-instant";
    } else {
      apiUrl = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1/chat/completions";
      modelName = "meta-llama/Meta-Llama-3-8B-Instruct";
    }

    const payload = {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.65,
      max_tokens: 200,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      const insight =
        data.choices?.[0]?.message?.content ||
        "No insight generated.";
      return res.status(200).json({ insight });
    } catch (err) {
      console.error("Insights endpoint error:", err);
      return res.status(500).json({ error: "Failed to generate insights." });
    }
  }
});

// Summary API endpoint (Feature 8: Progressive Summarizer)
app.post("/api/summary", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(401).json({
      error: "API key is missing. Please open the 'insert api key here' file in the project root and paste your API key on Line 3.",
    });
  }

  const { text, depth, docTitle, pageNum } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: "Missing 'text' parameter." });
  }

  let prompt = "";
  if (depth === "normal") {
    prompt = `Generate a concise bullet point summary of this page from "${docTitle}" (Page ${pageNum}).
Generate around 3 bullet points. Use clean HTML list format (use <ul> and <li> tags, no other tags):
Text:
${text}`;
  } else if (depth === "medium") {
    prompt = `Generate a medium summary outlining key insights of this page from "${docTitle}" (Page ${pageNum}).
Format with a bold header <h3>Key Insights</h3> followed by 1-2 paragraphs of text in HTML (<p> tags):
Text:
${text}`;
  } else {
    prompt = `Generate a detailed, complete analysis of this page from "${docTitle}" (Page ${pageNum}) for a student studying it.
Include key concepts, terms, context, and implications. Format with a bold header <h3>Complete Page Analysis</h3> followed by 3-4 paragraphs in HTML (<p> tags):
Text:
${text}`;
  }

  const isKeyGemini = apiKey.startsWith("AIzaSy") || apiKey.startsWith("AQ.");
  if (isKeyGemini) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 600 }
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }
      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated.";
      return res.status(200).json({ summary });
    } catch (err) {
      console.error("Gemini summary endpoint error:", err);
      return res.status(500).json({ error: "Gemini summary generation failed." });
    }
  } else {
    const isOpenAI = apiKey.startsWith("sk-");
    const isGroq = apiKey.startsWith("gsk_");
    
    let apiUrl = "";
    let modelName = "";
    if (isOpenAI) {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      modelName = "gpt-4o-mini";
    } else if (isGroq) {
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      modelName = "llama-3.1-8b-instant";
    } else {
      apiUrl = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1/chat/completions";
      modelName = "meta-llama/Meta-Llama-3-8B-Instruct";
    }

    const payload = {
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 600,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content || "No summary generated.";
      return res.status(200).json({ summary });
    } catch (err) {
      console.error("Summary endpoint error:", err);
      return res.status(500).json({ error: "Failed to generate summary." });
    }
  }
});

const server = app.listen(PORT, () => {
  console.log(`NYVRON backend running on http://localhost:${PORT}`);
  try {
    exec(`open http://localhost:${PORT}`);
  } catch(e) {
    console.error('Failed to open browser:', e);
  }
});

server.on('error', (err) => {
  console.error('Express server failed to start:', err);
});
