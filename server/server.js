import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import { testConnection } from "./db/connection.js";
import invoiceRoutes from "./routes/invoices.js";
import paymentRoutes from "./routes/payments.js";
import { router as authRoutes, authenticateToken } from "./routes/auth.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Test database connection on startup
testConnection().catch(console.error);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Auth routes (public)
console.log('Mounting auth routes...');
app.use('/api/auth', authRoutes);
console.log('Auth routes mounted');

// Protected AI route
app.post("/ai/inventory", authenticateToken, async (req, res) => {
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

// Protected delivery stats route
app.get('/api/delivery-stats', authenticateToken, (req, res) => {
  // Mock delivery statistics for admin dashboard
  const stats = {
    totalDeliveries: 156,
    todayDeliveries: 12,
    weekDeliveries: 89,
    monthDeliveries: 156,
    totalRevenue: 12450.75,
    avgOrderValue: 79.81
  };
  res.json(stats);
});

// Protected invoice routes
app.use('/api', authenticateToken, invoiceRoutes);

// Protected payment routes
app.use('/api/payments', authenticateToken, paymentRoutes);

console.log('Starting server on port 3001...');
app.listen(3001, () => console.log("Backend running on http://localhost:3001"));


