const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/claude", authMiddleware, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    return res.json({ success: true, text });
  } catch (err) {
    console.error("Claude API error:", err);
    return res.status(500).json({ success: false, message: "AI request failed" });
  }
});

module.exports = router;
