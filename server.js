// const express = require('express');
// const mysql = require('mysql2/promise');
// const cors = require('cors');
// const jwt = require("jsonwebtoken");
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// /* ===================== MIDDLEWARE ===================== */
// app.use(cors({
//   origin: [
//     'http://localhost:3000', // local frontend
//     'https://lostandfoundappwebapp.vercel.app' // deployed frontend
//   ]
// }));
// app.use(express.json());

// /* ===================== DATABASE POOL ===================== */
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: parseInt(process.env.DB_PORT, 10),
//   waitForConnections: true,
//   connectionLimit: 5,
//   queueLimit: 0,
//   ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
// });

// /* ===================== ROUTES ===================== */

// // GET all items
// app.get("/items", async (req, res) => {
//   try {
//     const [rows] = await pool.execute("SELECT * FROM item ORDER BY id DESC");
//     res.json(rows);
//   } catch (err) {
//     console.error("DB Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // POST new item
// app.post("/items", async (req, res) => {
//   const { item_name, category, location, status } = req.body;
//   try {
//     const [result] = await pool.execute(
//       `INSERT INTO item (item_name, category, location, status)
//        VALUES (?, ?, ?, ?)`,
//       [item_name, category, location, status || "Lost"]
//     );
//     res.status(201).json({ message: "Item added", id: result.insertId });
//   } catch (err) {
//     console.error("DB Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // PUT update item
// app.put("/items/:id", async (req, res) => {
//   const { id } = req.params;
//   const { item_name, category, location, status } = req.body;
//   try {
//     await pool.execute(
//       `UPDATE item
//        SET item_name = ?, category = ?, location = ?, status = ?
//        WHERE id = ?`,
//       [item_name, category, location, status, id]
//     );
//     res.json({ message: "Item updated" });
//   } catch (err) {
//     console.error("DB Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // DELETE item
// app.delete("/items/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     await pool.execute("DELETE FROM item WHERE id = ?", [id]);
//     res.json({ message: "Item deleted" });
//   } catch (err) {
//     console.error("DB Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Health check
// app.get("/", (req, res) => res.send("Lost & Found API running..."));

// /* ===================== SERVER ===================== */
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// module.exports = app; // For testing or deployment

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ===================== MIDDLEWARE ===================== */
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://lostandfoundappwebapp.vercel.app' 
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

/* ===================== ROUTES ===================== */

// GET: Fetch all items
app.get("/items", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM item ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ GET Error:", err.message);
    res.status(500).json({ error: "Could not fetch items" });
  }
});

// POST: Add new item (ID is now handled by SQL)
app.post("/items", async (req, res) => {
  const { item_name, category, location, status } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO item (item_name, category, location, status) VALUES (?, ?, ?, ?)`,
      [item_name, category, location, status || "Lost"]
    );
    res.status(201).json({ message: "Item added", id: result.insertId });
  } catch (err) {
    console.error("❌ POST Error:", err.message);
    res.status(500).json({ error: "Database rejected the new item." });
  }
});

// PUT: Update item
app.put("/items/:id", async (req, res) => {
  const { id } = req.params;
  const { item_name, category, location, status } = req.body;

  console.log(`DEBUG: Attempting to UPDATE item #${id}`);

  try {
    const [result] = await pool.execute(
      `UPDATE item SET item_name = ?, category = ?, location = ?, status = ? WHERE id = ?`,
      [item_name, category, location, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Item #${id} not found.` });
    }
    res.json({ message: "Update successful" });
  } catch (err) {
    console.error(`❌ PUT Error on ID ${id}:`, err.message);
    res.status(500).json({ error: "Update failed on server." });
  }
});

// DELETE: Remove item
app.delete("/items/:id", async (req, res) => {
  const { id } = req.params;
  
  console.log(`DEBUG: Attempting to DELETE item #${id}`);

  try {
    const [result] = await pool.execute("DELETE FROM item WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Item #${id} does not exist.` });
    }
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error(`❌ DELETE Error on ID ${id}:`, err.message);
    res.status(500).json({ error: "Delete failed on server." });
  }
});

app.listen(PORT, () => console.log(`🚀 API is live on port ${PORT}`));