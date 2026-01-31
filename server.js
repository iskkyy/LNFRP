const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require("jsonwebtoken");
require('dotenv').config();

// Use 5000 to avoid conflict with React (which uses 3000)
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "my_secret_key";

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }, // Friend's SSL setting
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
};

const app = express();
app.use(express.json());

// Friend's CORS setup (Permissive)
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            return callback(null, true); 
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false,
    })
);

// Friend's Auth Middleware
function requireAuth(req, res, next) {
    const header = req.headers.authorization; 
    
    if (!header) return res.status(401).json({ error: "Missing Authorization header" });

    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "Invalid Authorization format" });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or Expired token" });
    }
}

/* ===================== ROUTES ===================== */

// 1. ADMIN LOGIN (Updated to use 'users' table)
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);
        // FIX: Changed 'admins' to 'users' here
        const [rows] = await connection.execute(
            'SELECT * FROM users WHERE username = ? AND password = ?', 
            [username, password]
        );
        await connection.end();

        if (rows.length > 0) {
            const user = rows[0];
            // Generate Token
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: "24h" }
            );
            res.json({ token, message: "Login successful" });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error during login" });
    }
});

// 2. GET ITEMS (Public - Your 'item' table)
app.get('/items', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM item ORDER BY id DESC'); 
        await connection.end();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching items' });
    }
});

// 3. CREATE ITEM (Public - anyone can report)
app.post('/items', async (req, res) => {
    const { item_name, category, location, description, date_found, status } = req.body; 
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            `INSERT INTO item (item_name, category, location, description, date_found, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                item_name, 
                category, 
                location, 
                description || "", 
                date_found || new Date(),
                status || "Lost"
            ]
        );
        await connection.end();
        res.status(201).json({ message: 'Item created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating item' });
    }
});

// 4. UPDATE ITEM (Protected - Admin Only)
app.put('/items/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { item_name, category, location, description, status } = req.body; 

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            `UPDATE item 
             SET item_name = ?, category = ?, location = ?, description = ?, status = ? 
             WHERE id = ?`,
            [item_name, category, location, description, status, id]
        );
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json({ message: 'Item updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating item' });
    }
});

// 5. DELETE ITEM (Protected - Admin Only)
app.delete('/items/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM item WHERE id = ?', [id]);
        await connection.end();
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting item' });
    }
});

app.listen(port, () => {
    console.log(`Lost & Found Server started on port`, port);
});