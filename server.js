const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ===================== MIDDLEWARE ===================== */
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://lnfrp.onrender.com',
    'https://*.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());

/* ===================== DATABASE POOL ===================== */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false }
});

/* ===== TEST DB CONNECTION ===== */
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Database connected successfully");
    conn.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
})();

/* ===================== ROUTES ===================== */
app.get("/items", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM item ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/items", async (req, res) => {
  const { item_name, category, location, status } = req.body;

  try {
    const [result] = await pool.execute(
      `INSERT INTO item (item_name, category, location, status)
       VALUES (?, ?, ?, ?)`,
      [item_name, category, location, status || "Lost"]
    );

    res.status(201).json({ message: "Item added", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/items/:id", async (req, res) => {
  const { id } = req.params;
  const { item_name, category, location, status } = req.body;

  try {
    await pool.execute(
      `UPDATE item
       SET item_name = ?, category = ?, location = ?, status = ?
       WHERE id = ?`,
      [item_name, category, location, status, id]
    );

    res.json({ message: "Item updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/items/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.execute("DELETE FROM item WHERE id = ?", [id]);
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* HEALTH CHECK */
app.get("/", (req, res) => res.send("Lost & Found API running..."));

/* ===================== SERVER ===================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});