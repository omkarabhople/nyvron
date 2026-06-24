// api/chat.js - Vercel Serverless Function (Node.js Runtime)

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // stored only on Vercel
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message, mode } = req.body || {};

    if (!message) {
      res.status(400).json({ error: "Missing 'message' field" });
      return;
    }

    // Mode-aware system prompt
    let systemPrompt = "You are NYVRON, a calm, practical assistant that helps manage time, focus and tasks.";
    if (mode === "planner") {
      systemPrompt += " Focus on planning, prioritising and scheduling the user's day.";
    } else if (mode === "coder") {
      systemPrompt += " Focus on programming help, architecture and debugging.";
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // or your chosen model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "(NYVRON could not generate a reply)";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI backend error" });
  }
}