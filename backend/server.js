import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

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

// Serve static frontend files on '/'
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Helper to find and read the API key from 'insert api key here'
// Helper to find and read the API key from 'insert api key here'
function getApiKey() {
  // Try environment variables first
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
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
    
    let url = "";
    let modelName = "";
    if (isOpenAI) {
      url = "https://api.openai.com/v1/chat/completions";
      modelName = "gpt-4o-mini";
    } else if (isGroq) {
      url = "https://api.groq.com/openai/v1/chat/completions";
      modelName = "llama-3.1-8b-instant";
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

  const { message, history, context, model } = req.body || {};
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
  const systemPrompt = `You are NYVRON, a calm, precise, Apple-inspired personal command center assistant.
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
    }
  } else {
    // Auto-detect based on key prefix
    if (isKeyGemini) targetProvider = "gemini";
    else if (isKeyOpenAI) targetProvider = "openai";
    else if (isKeyGroq) targetProvider = "groq";
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

  let generatedTitle = null;
  if (!history || history.length === 0) {
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
          ...history.map((h) => ({
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
          ...history.map((h) => ({
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
          ...history.map((h) => ({
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

  const prompt = `You are NYVRON, a personal productivity AI.
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

const server = app.listen(PORT, () => {
  console.log(`NYVRON backend running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Express server failed to start:', err);
});
