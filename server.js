const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
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
  ssl: { rejectUnauthorized: true },
  enableKeepAlive: true
});

/* ===================== ROUTES ===================== */

/* GET all items */
app.get("/items", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM items ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* POST new item */
app.post("/items", async (req, res) => {
  const { item_name, category, location, status } = req.body;

  try {
    const [result] = await pool.execute(
      `INSERT INTO items (item_name, category, location, status)
       VALUES (?, ?, ?, ?)`,
      [item_name, category, location, status || "Lost"]
    );

    res.status(201).json({ message: "Item added", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* PUT update item */
app.put("/items/:id", async (req, res) => {
  const { id } = req.params;
  const { item_name, category, location, status } = req.body;

  try {
    await pool.execute(
      `UPDATE items
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

/* DELETE item */
app.delete("/items/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.execute("DELETE FROM items WHERE id = ?", [id]);
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
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Required for Vercel