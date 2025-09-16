const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection using your Render database details
const pool = new Pool({
  user: 'adtim',
  host: 'dpg-d34klt3uibrs73aka7mg-a.oregon-postgres.render.com',
  database: 'adtimaccounting',
  password: 'DGO9R7E6awcZ9o9v6dG9SF0636pgTg90',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to PostgreSQL database');
  release();
});

// API Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // In a real app, you'd verify against users in the database
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
      res.json({ token, user: { username: 'admin', name: 'Admin User' } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    jwt.verify(token, 'your-secret-key');
    
    // Query database
    const result = await pool.query(
      'SELECT * FROM transactions ORDER BY date DESC LIMIT 5'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    jwt.verify(token, 'your-secret-key');
    
    const { description, amount, account, category } = req.body;
    
    const result = await pool.query(
      'INSERT INTO transactions (description, amount, account, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [description, amount, account, category, new Date().toISOString().split('T')[0]]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    jwt.verify(token, 'your-secret-key');
    
    const { id } = req.params;
    
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    jwt.verify(token, 'your-secret-key');
    
    // Get transactions
    const transactionsResult = await pool.query(
      'SELECT * FROM transactions ORDER BY date DESC'
    );
    
    const transactions = transactionsResult.rows;
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.category === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
    const totalExpenses = transactions
      .filter(t => t.category === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    res.json({
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      cashBalance: 10000 + totalIncome - totalExpenses,
      recentTransactions: transactions.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize database tables
async function initDatabase() {
  try {
    // Create transactions table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        account VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date DATE NOT NULL
      )
    `);
    
    console.log('Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initDatabase();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});