// File: public/js/auth.js - FIXED VERSION

document.addEventListener('DOMContentLoaded', () => {
    // Check for token and user on every page load
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Display user info
    document.getElementById('username-display').textContent = user.username || '';
    document.getElementById('user-role-display').textContent = user.access_level || '';

    // Show/hide menu items based on role
    if (user.access_level === 'Super Admin') {
        document.getElementById('users-nav').style.display = 'block';
        document.getElementById('audit-nav').style.display = 'block';
    }

    // Navigation handling
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.target.closest('.nav-link').dataset.view;
            loadView(view);

            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.closest('.nav-link').classList.add('active');
        });
    });

    // Logout functionality
    document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    });

    // Inactivity timeout
    let timeoutId;
    const timeoutInMinutes = 15;
    function resetTimer() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(logout, timeoutInMinutes * 60 * 1000);
    }
    function logout() {
        alert('You have been logged out due to inactivity.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
    document.addEventListener('mousemove', resetTimer);
    document.addEventListener('keypress', resetTimer);
    document.addEventListener('scroll', resetTimer);
    resetTimer(); // Initial call to start the timer

    // Load default view
    loadView('dashboard');
});

// ========== IMPROVED API CALL FUNCTION - BETTER ERROR HANDLING ==========
async function apiCall(url, options = {}) {
    const token = localStorage.getItem('token');
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, { ...defaultOptions, ...options });

        // ========== FIXED: BETTER NETWORK ERROR HANDLING ==========
        if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));

            // Only logout for token-related issues, not network errors
            if (errorData.code === 'TOKEN_MISSING' || errorData.code === 'TOKEN_INVALID') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('Session expired. Please log in again.');
                window.location.href = '/login';
                return null;
            } else {
                // For other 401s, show error but don't logout
                console.warn('Authorization issue:', errorData.message);
                throw new Error(errorData.message || 'Authorization error');
            }
        }

        if (response.status === 403) {
            const errorData = await response.json().catch(() => ({}));

            if (errorData.code === 'INSUFFICIENT_PERMISSIONS') {
                alert('Access denied: ' + errorData.message);
                throw new Error(errorData.message);
            } else {
                // Token might be invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('Access denied. Please log in again.');
                window.location.href = '/login';
                return null;
            }
        }

        return response;
    } catch (fetchError) {
        // ========== FIXED: NETWORK ERRORS DON'T CAUSE LOGOUT ==========
        if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
            // Network error - show user-friendly message but don't logout
            console.error('Network error:', fetchError);
            alert('Network error. Please check your connection and try again.');
            throw fetchError;
        } else {
            // Re-throw other errors
            throw fetchError;
        }
    }
}

// Global functions for view management
async function loadView(view) {
    const appView = document.getElementById('app-view');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    appView.innerHTML = ''; // Clear previous view

    switch (view) {
        case 'dashboard':
            appView.innerHTML = getDashboardHTML();
            await loadDashboardData();
            break;
        case 'transactions':
            appView.innerHTML = getTransactionsHTML();
            await loadTransactions();
            setupTransactionForm();
            break;
        case 'accounts':
            appView.innerHTML = getAccountsHTML();
            await loadAccounts();
            break;
        case 'reports':
            appView.innerHTML = getReportsHTML();
            setupReportDates();
            break;
        case 'ledger':
            appView.innerHTML = getLedgerHTML();
            await loadAccountsForLedger();
            break;
        case 'users':
            if (user.access_level === 'Super Admin') {
                appView.innerHTML = getUsersHTML();
                await loadUsers();
                setupUserForm();
            } else {
                appView.innerHTML = '<p>Access Denied.</p>';
            }
            break;
        case 'audit':
            if (user.access_level === 'Super Admin') {
                appView.innerHTML = getAuditHTML();
                await loadAuditLogs();
            } else {
                appView.innerHTML = '<p>Access Denied.</p>';
            }
            break;
    }
}

// ========== ENHANCED DASHBOARD HTML WITH NEW CARDS ==========
function getDashboardHTML() {
    return `
        <div class="dashboard">
            <h1>Dashboard</h1>
            <div class="dashboard-stats">
                <div class="stat-card income-card">
                    <h3>Total Income</h3>
                    <p id="total-income">UGX 0</p>
                </div>
                <div class="stat-card expense-card">
                    <h3>Total Expenses</h3>
                    <p id="total-expenses">UGX 0</p>
                </div>
                <div class="stat-card profit-card">
                    <h3>Net Profit</h3>
                    <p id="net-profit">UGX 0</p>
                </div>
                <!-- ========== NEW CARDS: TITHE AND INCOME TAX ========== -->
                <div class="stat-card tithe-card">
                    <h3>Tithe (10%)</h3>
                    <p id="tithe-amount">UGX 0</p>
                    <small>10% of Net Profit</small>
                </div>
                <div class="stat-card tax-card">
                    <h3>Income Tax (30%)</h3>
                    <p id="income-tax-amount">UGX 0</p>
                    <small>30% of Net Profit</small>
                </div>
            </div>
            <div class="charts-container">
                <div class="chart-box">
                    <h3>Monthly Profits</h3>
                    <canvas id="profitChart"></canvas>
                </div>
                <div class="chart-box">
                    <h3>Expense Breakdown</h3>
                    <canvas id="expensePieChart"></canvas>
                </div>
                <div class="chart-box">
                    <h3>Income vs Expenses</h3>
                    <canvas id="incomeExpenseBar"></canvas>
                </div>
            </div>
        </div>
    `;
}

function getTransactionsHTML() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const canAdd = ['Super Admin', 'Admin', 'User'].includes(user.access_level);
    const canEdit = ['Super Admin', 'Admin'].includes(user.access_level);

    return `
        <div class="transactions">
            <div class="section-header">
                <h1>Transactions</h1>
                ${canAdd ? '<button id="add-transaction-btn" class="btn-primary">Add Transaction</button>' : ''}
            </div>
            <div class="transactions-table">
                <table id="transactions-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Amount (UGX)</th>
                            <th>Debit Account</th>
                            <th>Credit Account</th>
                            <th>Document</th>
                            <th>Created By</th>
                            ${canEdit ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
        
        <div id="transaction-modal" class="modal" style="display:none">
            <div class="modal-content">
                <span class="close" onclick="closeModal('transaction-modal')">&times;</span>
                <h2 id="transaction-modal-title">Add Transaction</h2>
                <form id="transaction-form" enctype="multipart/form-data">
                    <input type="hidden" id="transaction-id">
                    <input type="text" id="description" placeholder="Description" required>
                    <input type="date" id="date" required>
                    <input type="number" id="amount" placeholder="Amount (UGX)" step="0.01" required>
                    <select id="debit-account" required>
                        <option value="">Select Debit Account</option>
                    </select>
                    <select id="credit-account" required>
                        <option value="">Select Credit Account</option>
                    </select>
                    <input type="file" id="document" name="document" accept=".pdf,.jpg,.jpeg,.png">
                    <button type="submit" id="save-transaction-btn">Save Transaction</button>
                </form>
            </div>
        </div>
        
        <div id="docPreviewModal" class="modal" style="display:none;">
            <div class="modal-content">
                <span class="close" onclick="closeModal('docPreviewModal')">&times;</span>
                <iframe id="docFrame" width="100%" height="500px"></iframe>
            </div>
        </div>
    `;
}

function getAccountsHTML() {
    return `
        <div class="accounts">
            <div class="section-header">
                <h1>Chart of Accounts</h1>
                <button id="add-account-btn" class="btn-primary" style="display: none;">Add Account</button>
            </div>
            <div class="accounts-table">
                <table id="accounts-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Balance</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
        <div id="account-modal" class="modal" style="display:none">
            <div class="modal-content">
                <span class="close" onclick="closeModal('account-modal')">&times;</span>
                <h2>Add Account</h2>
                <form id="account-form">
                    <input type="text" id="account-name" placeholder="Account Name" required>
                    <select id="account-type" required>
                        <option value="">Select Account Type</option>
                        <option value="Asset">Asset</option>
                        <option value="Liability">Liability</option>
                        <option value="Equity">Equity</option>
                        <option value="Income">Income</option>
                        <option value="Expense">Expense</option>
                    </select>
                    <input type="number" id="initial-balance" placeholder="Initial Balance" step="0.01">
                    <button type="submit">Save Account</button>
                </form>
            </div>
        </div>
    `;
}

function getReportsHTML() {
    return `
        <div class="reports">
            <h1>Financial Reports</h1>
            <div class="report-filters">
                <input type="date" id="report-start-date">
                <input type="date" id="report-end-date">
                <button onclick="generateReport('profit-loss')">P&L</button>
                <button onclick="generateReport('balance-sheet')">Balance Sheet</button>
                <button onclick="generateReport('cash-flow')">Cash Flow</button>
            </div>
            <div class="report-actions">
                <button id="export-pdf-btn">Export to PDF</button>
                <button id="export-excel-btn">Export to Excel</button>
            </div>
            <div id="report-content" class="report-content-view">
                <p>Select a report and a date range to view it here.</p>
            </div>
        </div>
    `;
}

function getLedgerHTML() {
    return `
        <div class="ledger">
            <h1>General Ledger</h1>
            <div class="ledger-filters">
                <select id="ledger-account">
                    <option value="">Select Account</option>
                </select>
                <input type="date" id="ledger-start-date">
                <input type="date" id="ledger-end-date">
                <button onclick="loadLedgerEntries()">Load Ledger</button>
            </div>
            <div class="ledger-actions">
                <button onclick="exportTableToPDF('ledger-table', 'general-ledger')">Export PDF</button>
                <button onclick="exportTableToExcel('ledger-table', 'general-ledger')">Export Excel</button>
            </div>
            <div class="ledger-table-container">
                <table id="ledger-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th>Amount (UGX)</th>
                            <th>Other Account</th>
                            <th>Running Balance (UGX)</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;
}

function getUsersHTML() {
    return `
        <div class="users">
            <div class="section-header">
                <h1>Users</h1>
                <button id="add-user-btn" class="btn-primary">Add User</button>
            </div>
            <div class="users-table">
                <table id="users-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Access Level</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
        <div id="user-modal" class="modal" style="display:none">
            <div class="modal-content">
                <span class="close" onclick="closeModal('user-modal')">&times;</span>
                <h2 id="user-modal-title">Add User</h2>
                <form id="user-form">
                    <input type="hidden" id="user-id">
                    <input type="text" id="user-username" placeholder="Username" required>
                    <input type="email" id="user-email" placeholder="Email" required>
                    <input type="password" id="user-password" placeholder="Password" required>
                    <select id="user-access-level" required>
                        <option value="">Select Access Level</option>
                        <option value="Viewer">Viewer</option>
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                        <option value="Super Admin">Super Admin</option>
                    </select>
                    <button type="submit" id="user-form-btn">Create User</button>
                </form>
            </div>
        </div>
    `;
}

// ========== IMPROVED AUDIT HTML ==========
function getAuditHTML() {
    return `
        <div class="audit-logs">
            <h1>Audit Logs</h1>
            <div class="audit-filters">
                <input type="date" id="audit-start-date" placeholder="Start Date">
                <input type="date" id="audit-end-date" placeholder="End Date">
                <select id="audit-action-filter">
                    <option value="">All Actions</option>
                    <option value="LOGIN_SUCCESS">Login Success</option>
                    <option value="LOGIN_FAILED">Login Failed</option>
                    <option value="USER_CREATED">User Created</option>
                    <option value="USER_UPDATED">User Updated</option>
                    <option value="USER_DELETED">User Deleted</option>
                    <option value="TRANSACTION_CREATED">Transaction Created</option>
                    <option value="TRANSACTION_UPDATED">Transaction Updated</option>
                    <option value="TRANSACTION_DELETED">Transaction Deleted</option>
                    <option value="PASSWORD_RESET_REQUESTED">Password Reset Requested</option>
                    <option value="PASSWORD_CHANGED">Password Changed</option>
                </select>
                <button onclick="loadAuditLogs()">Filter</button>
            </div>
            <div class="audit-table">
                <table id="audit-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Details</th>
                            <th>IP Address</th>
                            <th>User Agent</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;
}

// ========== ENHANCED DASHBOARD DATA LOADING ==========
async function loadDashboardData() {
    try {
        const response = await apiCall('/api/dashboard/summary');
        if (!response) return;
        const data = await response.json();

        // Update existing cards
        document.getElementById('total-income').textContent = `UGX ${data.totalIncome.toLocaleString()}`;
        document.getElementById('total-expenses').textContent = `UGX ${data.totalExpenses.toLocaleString()}`;
        document.getElementById('net-profit').textContent = `UGX ${data.netProfit.toLocaleString()}`;

        // ========== NEW: UPDATE TITHE AND TAX CARDS ==========
        document.getElementById('tithe-amount').textContent = `UGX ${data.tithe.toLocaleString()}`;
        document.getElementById('income-tax-amount').textContent = `UGX ${data.incomeTax.toLocaleString()}`;

        // Color coding for profit/loss
        const netProfitElement = document.getElementById('net-profit');
        const titheElement = document.getElementById('tithe-amount');
        const taxElement = document.getElementById('income-tax-amount');

        if (data.netProfit >= 0) {
            netProfitElement.style.color = 'green';
            titheElement.style.color = 'blue';
            taxElement.style.color = 'orange';
        } else {
            netProfitElement.style.color = 'red';
            titheElement.style.color = 'gray';
            taxElement.style.color = 'gray';
        }

        renderDashboardCharts(data.incomeVsExpense);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load dashboard data. Please refresh the page.');
    }
}

async function loadTransactions() {
    try {
        const response = await apiCall('/api/transactions');
        if (!response) return;
        const transactions = await response.json();
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const canEdit = ['Super Admin', 'Admin'].includes(user.access_level);
        const tbody = document.querySelector('#transactions-table tbody');
        tbody.innerHTML = transactions.map(t => `
            <tr>
                <td>${t.id}</td>
                <td>${new Date(t.transaction_date).toLocaleDateString()}</td>
                <td>${t.description}</td>
                <td>UGX ${parseFloat(t.amount).toLocaleString()}</td>
                <td>${t.debit_account}</td>
                <td>${t.credit_account}</td>
                <td>${t.document_path ? `<a href="#" onclick="previewDocument('${t.document_path}')">View Doc</a>` : 'N/A'}</td>
                <td>${t.created_by}</td>
                ${canEdit ? `
                <td>
                    <button onclick="editTransaction(${t.id})" class="btn-edit">Edit</button>
                    <button onclick="deleteTransaction(${t.id})" class="btn-delete">Delete</button>
                </td>
                ` : ''}
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading transactions:', error);
        alert('Failed to load transactions. Please refresh the page.');
    }
}

async function loadAccounts() {
    try {
        const response = await apiCall('/api/accounts');
        if (!response) return;
        const accounts = await response.json();
        const tbody = document.querySelector('#accounts-table tbody');
        tbody.innerHTML = accounts.map(a => `
            <tr>
                <td>${a.name}</td>
                <td>${a.type}</td>
                <td>UGX ${parseFloat(a.balance).toLocaleString()}</td>
                <td>
                    <button onclick="editAccount(${a.id})" class="btn-edit">Edit</button>
                    <button onclick="deleteAccount(${a.id})" class="btn-delete">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading accounts:', error);
        alert('Failed to load accounts. Please refresh the page.');
    }
}

async function loadAccountsForLedger() {
    try {
        const response = await apiCall('/api/accounts');
        if (!response) return;
        const accounts = await response.json();
        const select = document.getElementById('ledger-account');
        select.innerHTML = '<option value="">Select Account</option>' +
            accounts.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('');
    } catch (error) {
        console.error('Error loading accounts for ledger:', error);
    }
}

async function loadUsers() {
    try {
        const response = await apiCall('/api/users');
        if (!response) return;
        const users = await response.json();
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.access_level}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button onclick="editUser(${user.id})" class="btn-edit">Edit</button>
                    <button onclick="deleteUser(${user.id})" class="btn-delete">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Failed to load users. Please refresh the page.');
    }
}

// ========== IMPROVED AUDIT LOGS LOADING ==========
async function loadAuditLogs() {
    try {
        const response = await apiCall('/api/audit');
        if (!response) return;
        const logs = await response.json();
        const tbody = document.querySelector('#audit-table tbody');
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${log.username || 'System'}</td>
                <td><span class="audit-action ${log.action.toLowerCase()}">${log.action}</span></td>
                <td><pre>${JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}</pre></td>
                <td>${log.ip_address || 'N/A'}</td>
                <td title="${log.user_agent}">${log.user_agent ? log.user_agent.substring(0, 50) + '...' : 'N/A'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading audit logs:', error);
        alert('Failed to load audit logs. Please refresh the page.');
    }
}

// --- Form & Modal Handling ---
function setupTransactionForm() {
    const transactionModal = document.getElementById('transaction-modal');
    const transactionForm = document.getElementById('transaction-form');
    const saveBtn = document.getElementById('save-transaction-btn');
    const addBtn = document.getElementById('add-transaction-btn');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            transactionForm.reset();
            transactionForm.dataset.transactionId = '';
            document.getElementById('transaction-modal-title').textContent = 'Add Transaction';
            document.getElementById('save-transaction-btn').textContent = 'Save Transaction';
            transactionModal.style.display = 'block';
            loadAccountsForTransactionForm();
        });
    }

    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const transactionId = transactionForm.dataset.transactionId;
        const method = transactionId ? 'PUT' : 'POST';
        const url = transactionId ? `/api/transactions/${transactionId}` : '/api/transactions';

        const formData = new FormData(transactionForm);

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to save transaction');

            alert(result.message);
            closeModal('transaction-modal');
            loadTransactions();
        } catch (error) {
            console.error('Transaction save error:', error);
            alert('Error saving transaction: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = transactionId ? 'Update Transaction' : 'Save Transaction';
        }
    });
}

function setupUserForm() {
    const userModal = document.getElementById('user-modal');
    const userForm = document.getElementById('user-form');
    const addBtn = document.getElementById('add-user-btn');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            userForm.reset();
            document.getElementById('user-id').value = '';
            document.getElementById('user-modal-title').textContent = 'Add User';
            document.getElementById('user-form-btn').textContent = 'Create User';
            document.getElementById('user-password').required = true;
            userModal.style.display = 'block';
        });
    }

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('user-id').value;
        const url = userId ? `/api/users/${userId}` : '/api/users';
        const method = userId ? 'PUT' : 'POST';
        const data = {
            username: document.getElementById('user-username').value,
            email: document.getElementById('user-email').value,
            password: document.getElementById('user-password').value,
            access_level: document.getElementById('user-access-level').value,
        };

        const saveBtn = document.getElementById('user-form-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const response = await apiCall(url, { method, body: JSON.stringify(data) });
            if (!response) return;
            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                closeModal('user-modal');
                loadUsers();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = userId ? 'Update User' : 'Create User';
        }
    });
}

// ========== IMPROVED TRANSACTION EDITING ==========
async function editTransaction(id) {
    try {
        const response = await apiCall(`/api/transactions/${id}`);
        if (!response) return;
        const transaction = await response.json();

        const form = document.getElementById('transaction-form');
        form.dataset.transactionId = transaction.id;
        document.getElementById('description').value = transaction.description;
        document.getElementById('date').value = transaction.transaction_date.split('T')[0];
        document.getElementById('amount').value = transaction.amount;

        // Update modal title
        document.getElementById('transaction-modal-title').textContent = 'Edit Transaction';
        document.getElementById('save-transaction-btn').textContent = 'Update Transaction';

        document.getElementById('transaction-modal').style.display = 'block';

        await loadAccountsForTransactionForm();
        document.getElementById('debit-account').value = transaction.debit_account_id;
        document.getElementById('credit-account').value = transaction.credit_account_id;
    } catch (error) {
        alert('Could not load transaction data for editing.');
        console.error('Edit transaction error:', error);
    }
}

async function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        try {
            const response = await apiCall(`/api/transactions/${id}`, { method: 'DELETE' });
            if (!response) return;
            const result = await response.json();
            alert(result.message);
            loadTransactions();
        } catch (error) {
            alert('Error deleting transaction.');
            console.error('Delete transaction error:', error);
        }
    }
}

// ========== IMPROVED USER EDITING ==========
async function editUser(id) {
    try {
        const response = await apiCall(`/api/users/${id}`);
        if (!response) return;
        const user = await response.json();

        const form = document.getElementById('user-form');
        form.reset();
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-password').value = '';
        document.getElementById('user-password').required = false;
        document.getElementById('user-access-level').value = user.access_level;

        document.getElementById('user-modal-title').textContent = 'Edit User';
        document.getElementById('user-form-btn').textContent = 'Update User';
        document.getElementById('user-modal').style.display = 'block';
    } catch (error) {
        alert('Could not load user data for editing.');
        console.error('Edit user error:', error);
    }
}

async function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await apiCall(`/api/users/${id}`, { method: 'DELETE' });
            if (!response) return;
            const result = await response.json();
            alert(result.message);
            loadUsers();
        } catch (error) {
            alert('Error deleting user: ' + error.message);
            console.error('Delete user error:', error);
        }
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function previewDocument(path) {
    const modal = document.getElementById('docPreviewModal');
    const frame = document.getElementById('docFrame');
    frame.src = path;
    modal.style.display = 'block';
}

// Additional functions for accounts dropdown in transaction form
async function loadAccountsForTransactionForm() {
    try {
        const response = await apiCall('/api/accounts');
        if (!response) return;
        const accounts = await response.json();

        const debitSelect = document.getElementById('debit-account');
        const creditSelect = document.getElementById('credit-account');

        const accountOptions = accounts.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('');

        debitSelect.innerHTML = '<option value="">Select Debit Account</option>' + accountOptions;
        creditSelect.innerHTML = '<option value="">Select Credit Account</option>' + accountOptions;
    } catch (error) {
        console.error('Error loading accounts for transaction form:', error);
    }
}

// Ledger functionality
async function loadLedgerEntries() {
    const accountId = document.getElementById('ledger-account').value;
    const startDate = document.getElementById('ledger-start-date').value;
    const endDate = document.getElementById('ledger-end-date').value;

    if (!accountId || !startDate || !endDate) {
        alert('Please select an account and a date range.');
        return;
    }

    try {
        const response = await apiCall(`/api/ledger/${accountId}?startDate=${startDate}&endDate=${endDate}`);
        if (!response) return;
        const entries = await response.json();

        let runningBalance = 0;
        const tbody = document.querySelector('#ledger-table tbody');
        tbody.innerHTML = entries.map(entry => {
            const amount = parseFloat(entry.amount);
            runningBalance += entry.type === 'Debit' ? amount : -amount;
            return `
                <tr>
                    <td>${new Date(entry.transaction_date).toLocaleDateString()}</td>
                    <td>${entry.description}</td>
                    <td>${entry.type}</td>
                    <td>UGX ${amount.toLocaleString()}</td>
                    <td>${entry.other_account}</td>
                    <td>UGX ${runningBalance.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading ledger entries:', error);
        alert('Error loading ledger entries. Please try again.');
    }
}

// Report functionality placeholder
async function generateReport(reportType) {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const reportContentDiv = document.getElementById('report-content');

    if (!startDate || !endDate) {
        alert('Please select a start and end date.');
        return;
    }

    try {
        const response = await apiCall(`/api/reports/${reportType}?startDate=${startDate}&endDate=${endDate}`);
        if (!response) return;
        const data = await response.json();

        // Handle different report types...
        // Implementation depends on your specific report format needs
        reportContentDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;

    } catch (error) {
        console.error(`Error generating ${reportType} report:`, error);
        reportContentDiv.innerHTML = `<p>Error generating report. Please check the date range and try again.</p>`;
    }
}

// Setup report dates with default values
function setupReportDates() {
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    startDateInput.value = firstDay.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];
}