// File: server.js

// 1. Imports and Initial Setup
require('dotenv').config();
const express = require('express');
const https = require('https');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const morgan = require('morgan');
const { Pool } = require('pg');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const compression = require('compression');
const NodeCache = require('node-cache');
const nodemailer = require('nodemailer');
const winston = require('winston');

// Cache for reports (5 minute TTL)
const reportCache = new NodeCache({ stdTTL: 300 });

// Email configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465,
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 second timeout
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const app = express();
const PORT = process.env.PORT || 1030;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Logger configuration
const logger = winston.createLogger({
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// 2. Optimized Database Connection Pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: 20, // Maximum connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Connection timeout
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});

// Create Super Admin if not exists
// THIS IS THE CORRECTED FUNCTION
const createSuperAdmin = async () => {
    try {
        const checkUser = await pool.query("SELECT * FROM users WHERE username = 'superadmin'");
        if (checkUser.rows.length === 0) {
            logger.info('Super Admin not found, creating...');
            const hashedPassword = await bcrypt.hash('superpassword123', 10);

            // The fix is to add the 'email' column and its value to the INSERT query
            await pool.query(
                "INSERT INTO users (username, email, password_hash, access_level, must_change_password) VALUES ($1, $2, $3, 'Super Admin', $4)",
                ['superadmin', 'superadmin@adtim.com', hashedPassword, true]
            );
            console.log('✅ Super Admin created successfully.');
        } else {
            console.log('Super Admin already exists.');
        }
    } catch (err) {
        console.error('Error during Super Admin creation:', err);
    }
};
createSuperAdmin();

// 3. Middleware
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // For parsing application/json
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For parsing application/x-www-form-urlencoded
app.use(morgan('dev')); // Logger for requests

// Security middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Rate limiting for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', apiLimiter);

// Serve static files from 'public' and 'views' directories
app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// 4. File Upload (Multer) Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// 5. Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        next();
    });
};

// Middleware to check access level
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.access_level)) {
            return res.status(403).json({ message: 'Access denied for your role.' });
        }
        next();
    };
};

// Audit Log Helper Function
const logAction = async (userId, action, details = {}, req) => {
    try {
        let username = null;
        let validUserId = null;
        
        if (req && req.user) {
            username = req.user.username;
            // Verify user still exists
            const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [req.user.id]);
            if (userCheck.rows.length > 0) {
                validUserId = req.user.id;
            }
        } else if (typeof details === 'object' && details.username) {
            username = details.username;
        }
        
        await pool.query(
            'INSERT INTO audit_logs (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
            [validUserId, username, action, typeof details === 'string' ? details : JSON.stringify(details)]
        );
    } catch (err) {
        console.error('Failed to write to audit log:', err);
    }
};



// 6. API Routes
// --- Authentication ---
// UPDATED LOGIN ROUTE
app.post('/api/login', loginLimiter, [
    body('loginIdentifier').trim().isLength({ min: 1 }).escape(),
    body('password').isLength({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Invalid input data' });
    }
    // 1. Changed 'username' to 'loginIdentifier' to accept either
    const { loginIdentifier, password } = req.body;
    try {
        // 2. Updated SQL query to check both username and email columns
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [loginIdentifier]
        );

        if (result.rows.length === 0) {
            await logAction(null, 'LOGIN_FAILED', { loginIdentifier }, req);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            await logAction(user.id, 'LOGIN_FAILED', { username: user.username }, req);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        await logAction(user.id, 'LOGIN_SUCCESS', { username: user.username }, req);
        const tokenPayload = { id: user.id, username: user.username, access_level: user.access_level };
        const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '2h' }); // Reduced from 8h to 2h

        res.json({ 
            accessToken, 
            user: { id: user.id, username: user.username, access_level: user.access_level, must_change_password: user.must_change_password }
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// --- Transactions ---
app.get('/api/transactions', authenticateToken, async (req, res) => {
    await logAction(req.user.id, 'VIEW_TRANSACTIONS', 'endpoint: transactions', req);
    // Viewer, User, Admin, Super Admin can view
    try {
        const result = await pool.query(`
            SELECT t.id, t.description, t.transaction_date, t.amount,
                   COALESCE(debit_acc.account_code || ' - ' || debit_acc.name, debit_acc.name) as debit_account,
                   COALESCE(credit_acc.account_code || ' - ' || credit_acc.name, credit_acc.name) as credit_account,
                   t.created_by,
                   t.document_path
            FROM transactions t
            JOIN accounts debit_acc ON t.debit_account_id = debit_acc.id
            JOIN accounts credit_acc ON t.credit_account_id = credit_acc.id
            ORDER BY t.transaction_date DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/transactions', authenticateToken, checkRole(['Super Admin', 'Admin', 'User']), upload.single('document'), [
    body('description').trim().isLength({ min: 1, max: 255 }).escape(),
    body('amount').isFloat({ min: 0.01 }),
    body('date').isISO8601()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input data', details: errors.array() });
    }
    const { description, date, amount, debit_account_id, credit_account_id } = req.body;
    const document_path = req.file ? req.file.path : null;
    try {
        await pool.query(
            'INSERT INTO transactions (description, transaction_date, amount, debit_account_id, credit_account_id, created_by, document_path) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [description, date, amount, debit_account_id, credit_account_id, req.user.username, document_path]
        );
        await logAction(req.user.id, 'TRANSACTION_CREATED', { description, amount }, req);
        
        // Clear cache when data changes
        reportCache.flushAll();
        
        res.status(201).json({ message: 'Transaction added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', authenticateToken, checkRole(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
        await logAction(req.user.id, 'TRANSACTION_DELETED', { transactionId: id }, req);
        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- Accounts (For dropdowns etc) ---
app.get('/api/accounts', authenticateToken, async (req, res) => {
    await logAction(req.user.id, 'VIEW_ACCOUNTS', { endpoint: 'accounts' }, req);
    const { asOfDate, startDate, endDate } = req.query;
    
    try {
        let dateCondition = '';
        let params = [];
        
        if (asOfDate) {
            dateCondition = 'AND t.transaction_date <= $1';
            params = [asOfDate];
        } else if (endDate) {
            dateCondition = 'AND t.transaction_date <= $1';
            params = [endDate];
        }
        
        const result = await pool.query(`
            SELECT a.id, a.account_code, a.name, a.type,
                CASE 
                    WHEN a.account_code = '3400' THEN (
                        -- Calculate net profit automatically with date filter
                        COALESCE((
                            SELECT SUM(t2.amount) 
                            FROM transactions t2 
                            JOIN accounts a2 ON t2.credit_account_id = a2.id 
                            WHERE a2.type = 'Income' ${asOfDate ? 'AND t2.transaction_date <= $1' : endDate ? 'AND t2.transaction_date <= $1' : ''}
                        ), 0) - COALESCE((
                            SELECT SUM(t3.amount) 
                            FROM transactions t3 
                            JOIN accounts a3 ON t3.debit_account_id = a3.id 
                            WHERE a3.type = 'Expense' ${asOfDate ? 'AND t3.transaction_date <= $1' : endDate ? 'AND t3.transaction_date <= $1' : ''}
                        ), 0)
                    )
                    ELSE COALESCE(SUM(
                        CASE 
                            WHEN t.debit_account_id = a.id THEN t.amount 
                            WHEN t.credit_account_id = a.id THEN -t.amount 
                            ELSE 0 
                        END
                    ),0)
                END as balance
            FROM accounts a
            LEFT JOIN transactions t 
                ON (t.debit_account_id = a.id OR t.credit_account_id = a.id) ${dateCondition}
            GROUP BY a.id, a.account_code, a.name, a.type
            ORDER BY a.account_code
        `, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- Dashboard Data ---
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
    await logAction(req.user.id, 'VIEW_DASHBOARD', { endpoint: 'dashboard' }, req);
    
    // Check cache first
    const cacheKey = 'dashboard_summary';
    const cached = reportCache.get(cacheKey);
    if (cached) {
        return res.json(cached);
    }
    
    try {
        const incomeVsExpense = await pool.query(`
            SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                SUM(CASE WHEN acc.type = 'Income' THEN t.amount ELSE 0 END) as total_income,
                SUM(CASE WHEN acc.type = 'Expense' THEN t.amount ELSE 0 END) as total_expense
            FROM transactions t
            JOIN accounts acc ON t.debit_account_id = acc.id OR t.credit_account_id = acc.id
            WHERE acc.type IN ('Income', 'Expense')
            GROUP BY month
            ORDER BY month;
        `);

        const expenseBreakdown = await pool.query(`
            SELECT acc.name as category, SUM(t.amount) as total
            FROM transactions t
            JOIN accounts acc ON t.debit_account_id = acc.id
            WHERE acc.type = 'Expense'
            GROUP BY acc.name
            ORDER BY total DESC;
        `);

        const totals = await pool.query(`
            SELECT 
                SUM(CASE WHEN acc.type = 'Income' THEN t.amount ELSE 0 END) as total_income,
                SUM(CASE WHEN acc.type = 'Expense' THEN t.amount ELSE 0 END) as total_expense
            FROM transactions t
            JOIN accounts acc ON t.credit_account_id = acc.id OR t.debit_account_id = acc.id
            WHERE acc.type IN ('Income', 'Expense');
        `);

        const totalIncome = parseFloat(totals.rows[0].total_income || 0);
        const totalExpenses = parseFloat(totals.rows[0].total_expense || 0);
        const netProfit = totalIncome - totalExpenses;
        
        // Calculate current month tithe and income tax
        const currentMonth = await pool.query(`
            SELECT 
                SUM(CASE WHEN acc.type = 'Income' THEN t.amount ELSE 0 END) as monthly_income,
                SUM(CASE WHEN acc.type = 'Expense' THEN t.amount ELSE 0 END) as monthly_expense
            FROM transactions t
            JOIN accounts acc ON t.credit_account_id = acc.id OR t.debit_account_id = acc.id
            WHERE acc.type IN ('Income', 'Expense')
            AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE);
        `);
        
        const monthlyIncome = parseFloat(currentMonth.rows[0].monthly_income || 0);
        const monthlyExpenses = parseFloat(currentMonth.rows[0].monthly_expense || 0);
        const monthlyProfit = monthlyIncome - monthlyExpenses;
        const tithe = monthlyProfit > 0 ? monthlyProfit * 0.10 : 0;
        const incomeTax = monthlyProfit > 0 ? monthlyProfit * 0.30 : 0;
        
        console.log('Monthly Income:', monthlyIncome);
        console.log('Monthly Expenses:', monthlyExpenses);
        console.log('Monthly Profit:', monthlyProfit);
        console.log('Tithe:', tithe);
        console.log('Income Tax:', incomeTax);

        const dashboardData = {
            totalIncome,
            totalExpenses,
            netProfit,
            tithe,
            incomeTax,
            incomeVsExpense: incomeVsExpense.rows,
            expenseBreakdown: expenseBreakdown.rows,
        };
        
        // Cache the result
        reportCache.set(cacheKey, dashboardData);
        res.json(dashboardData);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Financial Reports ---
app.get('/api/reports/pl', authenticateToken, async (req, res) => {
    await logAction(req.user.id, 'GENERATE_PL_REPORT', { report: 'profit_loss', startDate: req.query.startDate, endDate: req.query.endDate }, req);
    const { startDate, endDate } = req.query; // e.g., ?startDate=2025-01-01&endDate=2025-12-31
    try {
        // Fetch Income
        const incomeRes = await pool.query(`
            SELECT a.name, SUM(t.amount) as total
            FROM transactions t JOIN accounts a ON t.credit_account_id = a.id
            WHERE a.type = 'Income' AND t.transaction_date BETWEEN $1 AND $2
            GROUP BY a.name`, [startDate, endDate]);

        // Fetch Expenses
        const expenseRes = await pool.query(`
            SELECT a.name, SUM(t.amount) as total
            FROM transactions t JOIN accounts a ON t.debit_account_id = a.id
            WHERE a.type = 'Expense' AND t.transaction_date BETWEEN $1 AND $2
            GROUP BY a.name`, [startDate, endDate]);

        const totalIncome = incomeRes.rows.reduce((sum, row) => sum + parseFloat(row.total), 0);
        const totalExpenses = expenseRes.rows.reduce((sum, row) => sum + parseFloat(row.total), 0);
        const netProfit = totalIncome - totalExpenses;

        res.json({
            income: incomeRes.rows,
            expenses: expenseRes.rows,
            totalIncome,
            totalExpenses,
            netProfit,
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/balance-sheet', authenticateToken, async (req, res) => {
    await logAction(req.user.id, 'GENERATE_BALANCE_SHEET', { report: 'balance_sheet', asOfDate: req.query.asOfDate }, req);
    const { asOfDate, startDate } = req.query;
    
    // Use period filtering if startDate provided, otherwise cumulative
    const dateCondition = startDate ? 
        'AND t.transaction_date BETWEEN $2 AND $1' : 
        'AND t.transaction_date <= $1';
    const params = startDate ? [asOfDate, startDate] : [asOfDate];
    
    try {
        const assets = await pool.query(`
            SELECT a.name, 
                   SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE -t.amount END) as balance
            FROM accounts a
            LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
                ${dateCondition}
            WHERE a.type = 'Asset'
            GROUP BY a.id, a.name`, params);

        const liabilities = await pool.query(`
            SELECT a.name,
                   SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE -t.amount END) as balance
            FROM accounts a
            LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
                ${dateCondition}
            WHERE a.type = 'Liability'
            GROUP BY a.id, a.name`, params);

        const equity = await pool.query(`
            SELECT a.name,
                CASE 
                    WHEN a.account_code = '3400' THEN (
                        -- Calculate net profit for the specified period
                        COALESCE((
                            SELECT SUM(t2.amount) 
                            FROM transactions t2 
                            JOIN accounts a2 ON t2.credit_account_id = a2.id 
                            WHERE a2.type = 'Income' ${startDate ? 'AND t2.transaction_date BETWEEN $2 AND $1' : 'AND t2.transaction_date <= $1'}
                        ), 0) - COALESCE((
                            SELECT SUM(t3.amount) 
                            FROM transactions t3 
                            JOIN accounts a3 ON t3.debit_account_id = a3.id 
                            WHERE a3.type = 'Expense' ${startDate ? 'AND t3.transaction_date BETWEEN $2 AND $1' : 'AND t3.transaction_date <= $1'}
                        ), 0)
                    )
                    ELSE SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE -t.amount END)
                END as balance
            FROM accounts a
            LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
                ${dateCondition}
            WHERE a.type = 'Equity'
            GROUP BY a.id, a.name, a.account_code`, params);
            
        // Calculate net profit and add to equity
        const netProfitQuery = await pool.query(`
            SELECT 
                SUM(CASE WHEN a.type = 'Income' THEN t.amount ELSE 0 END) -
                SUM(CASE WHEN a.type = 'Expense' THEN t.amount ELSE 0 END) as net_profit
            FROM transactions t
            JOIN accounts a ON (t.credit_account_id = a.id OR t.debit_account_id = a.id)
            WHERE a.type IN ('Income', 'Expense') AND t.transaction_date <= $1
        `, [asOfDate]);
        
        const netProfit = parseFloat(netProfitQuery.rows[0]?.net_profit || 0);
        
        // Net profit will be added on frontend to avoid duplication

        res.json({ 
            assets: assets.rows, 
            liabilities: liabilities.rows, 
            equity: equity.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/cashflow', authenticateToken, async (req, res) => {
    await logAction(req.user.id, 'GENERATE_CASHFLOW_REPORT', { report: 'cashflow', startDate: req.query.startDate, endDate: req.query.endDate }, req);
    const { startDate, endDate } = req.query;
    try {
        const operating = await pool.query(`
            SELECT SUM(CASE WHEN a.type = 'Income' THEN t.amount ELSE -t.amount END) as total
            FROM transactions t
            JOIN accounts a ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
            WHERE a.type IN ('Income', 'Expense') AND t.transaction_date BETWEEN $1 AND $2`, [startDate, endDate]);

        const investing = await pool.query(`
            SELECT SUM(t.amount) as total
            FROM transactions t
            JOIN accounts a ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
            WHERE a.name LIKE '%Investment%' AND t.transaction_date BETWEEN $1 AND $2`, [startDate, endDate]);

        const financing = await pool.query(`
            SELECT SUM(t.amount) as total
            FROM transactions t
            JOIN accounts a ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
            WHERE a.type = 'Liability' AND t.transaction_date BETWEEN $1 AND $2`, [startDate, endDate]);

        res.json({
            operating: parseFloat(operating.rows[0]?.total || 0),
            investing: parseFloat(investing.rows[0]?.total || 0),
            financing: parseFloat(financing.rows[0]?.total || 0)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- User Management ---
app.post('/api/users', authenticateToken, checkRole(['Super Admin', 'Admin']), async (req, res) => {
    const { username, email, password, access_level } = req.body;
    try {
        // Check for existing username or email
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (username, email, password_hash, access_level, must_change_password) VALUES ($1, $2, $3, $4, $5)',
            [username, email, hashedPassword, access_level, true]
        );
        await logAction(req.user.id, 'USER_CREATED', { createdUser: username, role: access_level }, req);
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', authenticateToken, checkRole(['Super Admin', 'Admin']), async (req, res) => {
    await logAction(req.user.id, 'VIEW_USERS', { endpoint: 'users' }, req);
    try {
        const result = await pool.query('SELECT id, username, email, access_level, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', authenticateToken, checkRole(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    const { username, email, password, access_level } = req.body;
    try {
        let query, params;
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query = 'UPDATE users SET username = $1, email = $2, password_hash = $3, access_level = $4 WHERE id = $5';
            params = [username, email, hashedPassword, access_level, id];
        } else {
            query = 'UPDATE users SET username = $1, email = $2, access_level = $3 WHERE id = $4';
            params = [username, email, access_level, id];
        }
        await pool.query(query, params);
        await logAction(req.user.id, 'USER_UPDATED', { updatedUser: username, userId: id }, req);
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', authenticateToken, checkRole(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const userToDelete = await pool.query('SELECT access_level FROM users WHERE id=$1', [id]);
        if (userToDelete.rows.length && userToDelete.rows[0].access_level === 'Super Admin') {
            return res.status(403).json({ message: 'Cannot delete Super Admin user' });
        }

        // Delete related audit logs first
        await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [id]);
        
        // Then delete the user
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        await logAction(req.user.id, 'USER_DELETED', { deletedUserId: id }, req);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Password Reset Request ---
app.post('/api/password-resets', async (req, res) => {
    const { identifier } = req.body;
    try {
        const userRes = await pool.query('SELECT id, email, username FROM users WHERE email=$1 OR username=$1', [identifier]);
        
        if (userRes.rows.length === 0) {
            return res.json({ ok: true });
        }
        
        const user = userRes.rows[0];
        const token = require('crypto').randomBytes(24).toString('hex');
        
        await pool.query('INSERT INTO password_resets (user_id, token, requested_by) VALUES ($1, $2, $3)', [user.id, token, identifier]);
        
        // Send email notification
        if (process.env.SMTP_USER) {
            const domain = process.env.APP_DOMAIN || `${req.protocol}://${req.get('host')}`;
            const resetUrl = `${domain}/reset-password?token=${token}`;
            
            transporter.sendMail({
                from: process.env.SMTP_USER,
                to: user.email,
                subject: 'Password Reset Request - Adtim Finance',
                html: `
                    <h3>Password Reset Request</h3>
                    <p>Click the link below to reset your password:</p>
                    <a href="${resetUrl}">${resetUrl}</a>
                    <p>This link expires in 24 hours.</p>
                `
            }).catch(emailErr => {
                console.log('Email send failed:', emailErr.message);
            });
        }
        
        console.log('=== PASSWORD RESET REQUEST ===');
        console.log('User:', user.username);
        console.log('Email:', user.email);
        console.log('Reset Token:', token);
        console.log('Reset URL: /reset-password?token=' + token);
        console.log('==============================');
        
        await logAction(user.id, 'PASSWORD_RESET_REQUESTED', { username: user.username, email: user.email, requestedBy: identifier }, req);
        res.json({ ok: true });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Password Reset Completion ---
app.post('/api/password-resets/complete', [
    body('token').isLength({ min: 1 }),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input data' });
    }
    
    const { token, newPassword } = req.body;
    try {
        // Find valid reset request (within 24 hours)
        const resetRequest = await pool.query(
            `SELECT pr.user_id, u.username, u.email 
             FROM password_resets pr 
             JOIN users u ON pr.user_id = u.id 
             WHERE pr.token = $1 AND pr.created_at > NOW() - INTERVAL '24 hours' 
             AND pr.used = false`,
            [token]
        );
        
        if (resetRequest.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        
        const user = resetRequest.rows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password and mark token as used
        await pool.query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [hashedPassword, user.user_id]);
        await pool.query('UPDATE password_resets SET used = true WHERE token = $1', [token]);
        
        await logAction(user.user_id, 'PASSWORD_RESET_COMPLETED', { username: user.username }, req);
        res.json({ message: 'Password reset successfully' });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Password Change ---
app.put('/api/users/:id/change-password', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (req.user.id !== userId && req.user.access_level !== 'Super Admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { newPassword } = req.body;
    try {
        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash=$1, must_change_password=false WHERE id=$2', [hashed, userId]);
        await logAction(req.user.id, 'PASSWORD_CHANGED', { userId }, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Admin Validation ---
app.post('/api/auth/admin-validate', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username=$1 AND access_level IN ($2,$3)', [username, 'Admin', 'Super Admin']);
        if (result.rows.length === 0) return res.status(401).json({ ok: false });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ ok: false });

        res.json({ ok: true, user: { id: user.id, username: user.username } });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
});

// --- Audit Logs ---
app.get('/api/audit', authenticateToken, checkRole(['Super Admin']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM audit_logs 
            ORDER BY created_at DESC
        `);
        
        const logs = result.rows.map(row => ({
            ...row,
            details: typeof row.details === 'string' ? 
                (() => {
                    try {
                        return JSON.parse(row.details);
                    } catch {
                        return row.details;
                    }
                })() : row.details
        }));
        
        res.json(logs);
    } catch (err) {
        console.error('Audit logs error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Ledger ---
app.get('/api/ledger/:accountId', authenticateToken, async (req, res) => {
    await logAction(req.user.id, 'VIEW_LEDGER', { accountId: req.params.accountId, startDate: req.query.startDate, endDate: req.query.endDate }, req);
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const result = await pool.query(`
            SELECT t.id, t.description, t.transaction_date, t.amount,
                   CASE WHEN t.debit_account_id = $1 THEN 'Debit' ELSE 'Credit' END as type,
                   CASE WHEN t.debit_account_id = $1 THEN ca.name ELSE da.name END as other_account
            FROM transactions t
            LEFT JOIN accounts da ON t.debit_account_id = da.id
            LEFT JOIN accounts ca ON t.credit_account_id = ca.id
            WHERE (t.debit_account_id = $1 OR t.credit_account_id = $1)
            AND t.transaction_date BETWEEN $2 AND $3
            ORDER BY t.transaction_date DESC
        `, [accountId, startDate, endDate]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Health Check ---
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV,
        version: '1.0.0'
    });
});

// --- Data Backup ---
app.get('/api/backup', authenticateToken, checkRole(['Super Admin']), async (req, res) => {
    await logAction(req.user.id, 'DATA_BACKUP', { endpoint: 'backup' }, req);
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            accounts: (await pool.query('SELECT * FROM accounts ORDER BY id')).rows,
            transactions: (await pool.query('SELECT * FROM transactions ORDER BY id')).rows,
            users: (await pool.query('SELECT id, username, email, access_level, created_at FROM users ORDER BY id')).rows
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="adtim-backup-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(backup);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 7. Route for serving the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reset-password.html'));
});

// 8. Start the Server with HTTPS/HTTP
try {
    const keyPath = path.join(__dirname, 'key.pem');
    const certPath = path.join(__dirname, 'cert.pem');
    
    const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    
    // HTTPS server on port 1030
    https.createServer(options, app).listen(1030, () => {
        console.log('Adtim Finance HTTPS server running on https://localhost:1030');
    });
    
    // HTTP redirect server on port 80
    const httpApp = express();
    httpApp.get('*', (req, res) => {
        const host = req.get('host');
        console.log('HTTP request received:', req.url, 'from host:', host);
        res.redirect(301, `https://${host}${req.url}`);
    });
    
    httpApp.listen(80, () => {
        console.log('HTTP redirect server running on port 80');
    });
    
} catch (error) {
    console.log('HTTPS certificate error:', error.message);
    console.log('Starting HTTP server on port 80...');
    
    // HTTP only server on port 80 when no SSL
    app.listen(80, () => {
        console.log('Adtim Finance server running on http://localhost:80');
        console.log('For PWA installation on mobile, generate SSL certificates by running: node create-cert.js');
    });
}
