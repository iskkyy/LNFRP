const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ===================== MIDDLEWARE ===================== */
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://lostandfoundappwebapp.vercel.app'
  ]
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
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Immediate DB Connection Check
pool.getConnection()
  .then(conn => {
    console.log("✅ Connected to MySQL Database");
    conn.release();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err.message);
  });

/* ===================== ROUTES ===================== */

// GET all items
app.get("/items", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM item ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST new item
app.post("/items", async (req, res) => {
  const { item_name, category, location, status } = req.body;

  // Basic Validation
  if (!item_name || !category || !location) {
    return res.status(400).json({ error: "item_name, category, and location are required." });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO item (item_name, category, location, status)
       VALUES (?, ?, ?, ?)`,
      [item_name, category, location, status || "Lost"]
    );
    res.status(201).json({ message: "Item added", id: result.insertId });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// PUT update item
app.put("/items/:id", async (req, res) => {
  const { id } = req.params;
  const { item_name, category, location, status } = req.body;

  if (!item_name || !category || !location || !status) {
    return res.status(400).json({ error: "All fields are required for update." });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE item
       SET item_name = ?, category = ?, location = ?, status = ?
       WHERE id = ?`,
      [item_name, category, location, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item updated" });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE item
app.delete("/items/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute("DELETE FROM item WHERE id = ?", [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// Health check
app.get("/", (req, res) => res.send("Lost & Found API running..."));

/* ===================== SERVER ===================== */
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;