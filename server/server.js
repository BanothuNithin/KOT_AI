import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post("/ai/inventory", async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    res.json({ text: response.choices[0].message.content });
  } catch (err) {
    console.error("Groq Backend Error:", err);
    res.status(500).json({ error: "AI error" });
  }
});

app.listen(3001, () => console.log("Backend running on http://localhost:3001"));
