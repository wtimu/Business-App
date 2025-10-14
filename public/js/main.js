// Main application JavaScript
window.formatDate = formatDate;

document.addEventListener('DOMContentLoaded', () => {
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
            const view = e.target.dataset.view;
            loadView(view);

            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Logout functionality
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    });

    // Load default view
    loadView('dashboard');
});

// Session timeout functionality
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

// Initial call to start the timer
resetTimer();

async function loadView(view) {
    const appView = document.getElementById('app-view');
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { 'Authorization': `Bearer ${token}` };

    switch (view) {
        case 'dashboard':
            appView.innerHTML = getDashboardHTML();
            await loadDashboardData();
            break;

        case 'transactions':
            appView.innerHTML = getTransactionsHTML();
            await loadTransactions();
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
                setupUserEvents();
            }
            break;

        case 'audit':
            if (user.access_level === 'Super Admin') {
                appView.innerHTML = getAuditHTML();
                await loadAuditLogs();
            }
            break;
    }
}

function getDashboardHTML() {
    return `
        <div class="dashboard">
            <h1>Dashboard - Adtim Technologies (U) Limited</h1>
            <div class="dashboard-stats">
                <div class="stat-card">
                    <h3>Total Income</h3>
                    <p id="total-income">UGX 0</p>
                </div>
                <div class="stat-card">
                    <h3>Total Expenses</h3>
                    <p id="total-expenses">UGX 0</p>
                </div>
                <div class="stat-card">
                    <h3>Net Profit</h3>
                    <p id="net-profit">UGX 0</p>
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
                            <th>Date</th>
                            <th>Description</th>
                            <th>Amount (UGX)</th>
                            <th>Type</th>
                            <th>Account</th>
                            <th>Created By</th>
                            <th>Document</th>
                            ${canEdit ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
        
        <!-- Transaction Modal -->
        <div id="transaction-modal" class="modal" style="display:none">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Add Transaction</h2>
                <form id="transaction-form">
                    <input type="text" id="description" placeholder="Description" required>
                    <input type="date" id="date" required>
                    <input type="number" id="amount" placeholder="Amount (UGX)" step="0.01" required>
                    <select id="transaction-type" required>
                        <option value="">Select Transaction Type</option>
                        <option value="money_in">Money In (Income/Receipt)</option>
                        <option value="money_out">Money Out (Expense/Payment)</option>
                    </select>
                    <select id="account-select" required>
                        <option value="">Select Account</option>
                    </select>
                    <input type="file" id="document" accept=".pdf,.jpg,.jpeg,.png">
                    <button type="submit">Save Transaction</button>
                </form>
            </div>
        </div>
        
        <!-- Admin Validation Modal -->
        <div id="admin-modal" class="modal" style="display:none">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Admin Authorization Required</h2>
                <form id="admin-form">
                    <input type="text" id="admin-username" placeholder="Admin Username" required>
                    <input type="password" id="admin-password" placeholder="Admin Password" required>
                    <button type="submit">Authorize</button>
                </form>
            </div>
        </div>
    `;
}

function getAccountsHTML() {
    return `
        <div class="accounts">
            <h1>Chart of Accounts</h1>
            <div class="accounts-grid">
                <div class="account-category">
                    <h3>Assets</h3>
                    <div id="assets-list"></div>
                </div>
                <div class="account-category">
                    <h3>Liabilities</h3>
                    <div id="liabilities-list"></div>
                </div>
                <div class="account-category">
                    <h3>Equity</h3>
                    <div id="equity-list"></div>
                </div>
                <div class="account-category">
                    <h3>Income</h3>
                    <div id="income-list"></div>
                </div>
                <div class="account-category">
                    <h3>Expenses</h3>
                    <div id="expenses-list"></div>
                </div>
            </div>
        </div>
    `;
}

function getReportsHTML() {
    return `
        <div class="reports">
            <h1>Financial Reports</h1>
            <div class="report-controls">
                <div class="date-inputs">
                    <label>Start Date: <input type="date" id="report-start-date"></label>
                    <label>End Date: <input type="date" id="report-end-date"></label>
                    <label>As of Date: <input type="date" id="report-as-of-date"></label>
                </div>
            </div>
            <div class="reports-grid">
                <div class="report-card" onclick="generatePLReport()">
                    <h3>Profit & Loss</h3>
                    <p>Detailed income statement with sources and uses</p>
                </div>
                <div class="report-card" onclick="generateBalanceSheet()">
                    <h3>Balance Sheet</h3>
                    <p>Financial position with account details</p>
                </div>
                <div class="report-card" onclick="generateCashFlow()">
                    <h3>Cash Flow Statement</h3>
                    <p>Detailed cash movements by category</p>
                </div>
            </div>
            <div id="report-content"></div>
        </div>
    `;
}

function getLedgerHTML() {
    return `
        <div class="ledger">
            <h1>Account Ledger</h1>
            <div class="ledger-controls">
                <select id="ledger-account">
                    <option value="">Select Account</option>
                </select>
                <input type="date" id="ledger-start-date">
                <input type="date" id="ledger-end-date">
                <button onclick="loadLedgerEntries()">Load Entries</button>
            </div>
            <div id="ledger-content">
                <table id="ledger-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th>Amount (UGX)</th>
                            <th>Other Account</th>
                            <th>Balance (UGX)</th>
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
                <h1>User Management</h1>
                <button id="add-user-btn" class="btn-primary">Add User</button>
            </div>
            <table id="users-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Access Level</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
        
        <div id="user-modal" class="modal" style="display:none">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2 id="user-modal-title">Add User</h2>
                <form id="user-form">
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
                    <button type="submit">Save User</button>
                </form>
            </div>
        </div>
    `;
}

function getAuditHTML() {
    return `
        <div class="audit">
            <h1>Audit Logs</h1>
            <table id="audit-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                        <th>IP Address</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;
}

async function loadDashboardData() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch('/api/dashboard/summary', { headers });
        const data = await response.json();

        // Update stats
        const totalIncome = data.incomeVsExpense.reduce((sum, item) => sum + parseFloat(item.total_income), 0);
        const totalExpenses = data.incomeVsExpense.reduce((sum, item) => sum + parseFloat(item.total_expense), 0);
        const netProfit = totalIncome - totalExpenses;

        document.getElementById('total-income').textContent = `UGX ${totalIncome.toLocaleString()}`;
        document.getElementById('total-expenses').textContent = `UGX ${totalExpenses.toLocaleString()}`;
        document.getElementById('net-profit').textContent = `UGX ${netProfit.toLocaleString()}`;

        // Render charts
        renderDashboardCharts(data);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function renderDashboardCharts(data) {
    // Profit Chart
    const months = data.incomeVsExpense.map(x => x.month);
    const incomes = data.incomeVsExpense.map(x => Number(x.total_income));
    const expenses = data.incomeVsExpense.map(x => Number(x.total_expense));
    const profits = incomes.map((inc, i) => inc - expenses[i]);

    const profitCtx = document.getElementById('profitChart').getContext('2d');
    new Chart(profitCtx, {
        type: 'smoothed line',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Profits (UGX)',
                data: profits,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true
            }]
        },
        options: { responsive: true }
    });

    // Expense Pie Chart
    const categories = data.expenseBreakdown.map(x => x.category);
    const totals = data.expenseBreakdown.map(x => Number(x.total));

    const pieCtx = document.getElementById('expensePieChart').getContext('2d');
    new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: totals,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ]
            }]
        },
        options: { responsive: true }
    });

    // Income vs Expense Bar Chart
    const barCtx = document.getElementById('incomeExpenseBar').getContext('2d');
    new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Income (UGX)',
                    data: incomes,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)'
                },
                {
                    label: 'Expenses (UGX)',
                    data: expenses,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)'
                }
            ]
        },
        options: { responsive: true }
    });
}

async function loadTransactions() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch('/api/transactions', { headers });
        const transactions = await response.json();

        const tbody = document.querySelector('#transactions-table tbody');
        tbody.innerHTML = transactions.map(t => {
            const isIncome = ['Income', 'Asset'].some(type => t.credit_account.includes(type) || t.debit_account.includes(type));
            const transactionType = isIncome ? 'Money In' : 'Money Out';
            const mainAccount = isIncome ? t.credit_account : t.debit_account;

            return `
                <tr>
                    <td>${new Date(t.transaction_date).toLocaleDateString()}</td>
                    <td>${t.description}</td>
                    <td>UGX ${parseFloat(t.amount).toLocaleString()}</td>
                    <td>${transactionType}</td>
                    <td>${mainAccount}</td>
                    <td>${t.created_by}</td>
                    <td>${t.document_path ? `<a href="/${t.document_path}" target="_blank">View</a>` : 'None'}</td>
                    ${JSON.parse(localStorage.getItem('user')).access_level !== 'Viewer' ?
                    `<td><button onclick="deleteTransaction(${t.id})">Delete</button></td>` : ''}
                </tr>
            `;
        }).join('');

        // Setup event listeners
        setupTransactionEvents();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function setupTransactionEvents() {
    const addBtn = document.getElementById('add-transaction-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            document.getElementById('transaction-modal').style.display = 'block';
            loadAccountsForDropdown();
        });
    }

    // Modal close events
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // Transaction form submit
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitTransaction();
        });
    }
}

async function loadAccountsForDropdown() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch('/api/accounts', { headers });
        const accounts = await response.json();

        const debitSelect = document.getElementById('debit-account');
        const creditSelect = document.getElementById('credit-account');

        const options = accounts.map(acc => `<option value="${acc.id}">${acc.name} (${acc.type})</option>`).join('');

        debitSelect.innerHTML = '<option value="">Select Debit Account</option>' + options;
        creditSelect.innerHTML = '<option value="">Select Credit Account</option>' + options;
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

async function submitTransaction() {
    const token = localStorage.getItem('token');
    const formData = new FormData();

    formData.append('description', document.getElementById('description').value);
    formData.append('date', document.getElementById('date').value);
    formData.append('amount', document.getElementById('amount').value);
    formData.append('debit_account_id', document.getElementById('debit-account').value);
    formData.append('credit_account_id', document.getElementById('credit-account').value);

    const fileInput = document.getElementById('document');
    if (fileInput.files[0]) {
        formData.append('document', fileInput.files[0]);
    }

    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (response.ok) {
            document.getElementById('transaction-modal').style.display = 'none';
            loadTransactions();
        } else {
            alert('Error adding transaction');
        }
    } catch (error) {
        console.error('Error submitting transaction:', error);
    }
}

async function deleteTransaction(id) {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user.access_level === 'User') {
        // Show admin validation modal
        document.getElementById('admin-modal').style.display = 'block';

        document.getElementById('admin-form').onsubmit = async (e) => {
            e.preventDefault();
            const isValid = await validateAdmin();
            if (isValid) {
                await performDelete(id);
                document.getElementById('admin-modal').style.display = 'none';
            }
        };
    } else {
        await performDelete(id);
    }
}

async function validateAdmin() {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    try {
        const response = await fetch('/api/auth/admin-validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        return result.ok;
    } catch (error) {
        console.error('Error validating admin:', error);
        return false;
    }
}

async function performDelete(id) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadTransactions();
        } else {
            alert('Error deleting transaction');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
    }
}

async function loadAccounts() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch('/api/accounts', { headers });
        const accounts = await response.json();

        // Group accounts by type
        const grouped = accounts.reduce((acc, account) => {
            const type = account.type.toLowerCase().replace(/[^a-z]/g, '');
            if (!acc[type]) acc[type] = [];
            acc[type].push(account);
            return acc;
        }, {});

        // Populate each category
        Object.keys(grouped).forEach(type => {
            const container = document.getElementById(`${type}-list`);
            if (container) {
                container.innerHTML = grouped[type].map(acc =>
                    `<div class="account-item">${acc.name}</div>`
                ).join('');
            }
        });
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

async function generatePLReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch(`/api/reports/pl?startDate=${startDate}&endDate=${endDate}`, { headers });
        const data = await response.json();

        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = `
            <div class="section-header">
                <h2>Profit & Loss Statement</h2>
                <div>
                    <button onclick="exportReportToPDF('pl')" class="btn-primary">Export PDF</button>
                    <button onclick="exportReportToExcel('pl')" class="btn-primary">Export Excel</button>
                    <button onclick="printReport()" class="btn-primary">Print</button>
                </div>
            </div>
            <div class="report">
                <div class="report-header">
                    <h2>Profit & Loss Statement</h2>
                    <p class="report-period">Period: ${formatDate(startDate)} to ${formatDate(endDate)}</p>
                    <p class="report-date">Generated on: ${new Date().toLocaleDateString('en-GB')}</p>
                </div>
                
                <div class="report-section">
                    <h3>Revenue Sources</h3>
                    ${data.income.map(item => `
                        <div class="report-line">
                            <span>${item.name}</span>
                            <span>UGX ${parseFloat(item.total).toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="total">Total Revenue: UGX ${parseFloat(data.totalIncome).toLocaleString()}</div>
                </div>
                
                <div class="report-section">
                    <h3>Operating Expenses</h3>
                    ${data.expenses.map(item => `
                        <div class="report-line">
                            <span>${item.name}</span>
                            <span>UGX ${parseFloat(item.total).toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="total">Total Expenses: UGX ${parseFloat(data.totalExpenses).toLocaleString()}</div>
                </div>
                
                <div class="report-section">
                    <div class="net-profit ${parseFloat(data.netProfit) >= 0 ? 'positive' : 'negative'}">
                        Net ${parseFloat(data.netProfit) >= 0 ? 'Profit' : 'Loss'}: UGX ${parseFloat(data.netProfit).toLocaleString()}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error generating P&L report:', error);
    }
}

async function generateBalanceSheet() {
    const asOfDate = document.getElementById('report-as-of-date').value;
    if (!asOfDate) {
        alert('Please select as of date');
        return;
    }

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch(`/api/reports/balance-sheet?asOfDate=${asOfDate}`, { headers });
        const data = await response.json();

        const totalAssets = data.assets.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0);
        const totalLiabilities = data.liabilities.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0);
        const totalEquity = data.equity.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0);

        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = `
            <div class="section-header">
                <h2>Balance Sheet</h2>
                <div>
                    <button onclick="exportReportToPDF('balance-sheet')" class="btn-primary">Export PDF</button>
                    <button onclick="exportReportToExcel('balance-sheet')" class="btn-primary">Export Excel</button>
                    <button onclick="printReport()" class="btn-primary">Print</button>
                </div>
            </div>
            <div class="report">
                <h2>Balance Sheet - Adtim Technologies (U) Limited</h2>
                <p>As of: ${asOfDate}</p>
                
                <div class="balance-sheet">
                    <div class="bs-section">
                        <h3>Assets</h3>
                        ${data.assets.map(item => `
                            <div class="report-line">
                                <span>${item.name}</span>
                                <span>UGX ${parseFloat(item.balance || 0).toLocaleString()}</span>
                            </div>
                        `).join('')}
                        <div class="total">Total Assets: UGX ${totalAssets.toLocaleString()}</div>
                    </div>
                    
                    <div class="bs-section">
                        <h3>Liabilities</h3>
                        ${data.liabilities.map(item => `
                            <div class="report-line">
                                <span>${item.name}</span>
                                <span>UGX ${parseFloat(item.balance || 0).toLocaleString()}</span>
                            </div>
                        `).join('')}
                        <div class="total">Total Liabilities: UGX ${totalLiabilities.toLocaleString()}</div>
                    </div>
                    
                    <div class="bs-section">
                        <h3>Equity</h3>
                        ${data.equity.map(item => `
                            <div class="report-line">
                                <span>${item.name}</span>
                                <span>UGX ${parseFloat(item.balance || 0).toLocaleString()}</span>
                            </div>
                        `).join('')}
                        <div class="total">Total Equity: UGX ${totalEquity.toLocaleString()}</div>
                    </div>
                </div>
                
                <div class="balance-check">
                    <strong>Assets = Liabilities + Equity</strong><br>
                    UGX ${totalAssets.toLocaleString()} = UGX ${(totalLiabilities + totalEquity).toLocaleString()}
                    ${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 ?
                '<span class="balanced">✓ Balanced</span>' :
                '<span class="unbalanced">⚠ Not Balanced</span>'}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error generating balance sheet:', error);
    }
}

async function generateCashFlow() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch(`/api/reports/cashflow?startDate=${startDate}&endDate=${endDate}`, { headers });
        const data = await response.json();

        const netCashFlow = data.operating + data.investing + data.financing;

        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = `
            <div class="section-header">
                <h2>Cash Flow Statement</h2>
                <div>
                    <button onclick="exportReportToPDF('cash-flow')" class="btn-primary">Export PDF</button>
                    <button onclick="exportReportToExcel('cash-flow')" class="btn-primary">Export Excel</button>
                    <button onclick="printReport()" class="btn-primary">Print</button>
                </div>
            </div>
            <div class="report">
                <h2>Cash Flow Statement - Adtim Technologies (U) Limited</h2>
                <p>Period: ${startDate} to ${endDate}</p>
                
                <div class="report-section">
                    <h3>Cash Flows from Operating Activities</h3>
                    <div class="report-line">
                        <span>Net cash from business operations</span>
                        <span>UGX ${data.operating.toLocaleString()}</span>
                    </div>
                    <div class="cash-flow-note">Includes revenue collection and expense payments</div>
                </div>
                
                <div class="report-section">
                    <h3>Cash Flows from Investing Activities</h3>
                    <div class="report-line">
                        <span>Net cash from investments</span>
                        <span>UGX ${data.investing.toLocaleString()}</span>
                    </div>
                    <div class="cash-flow-note">Includes asset purchases and investment activities</div>
                </div>
                
                <div class="report-section">
                    <h3>Cash Flows from Financing Activities</h3>
                    <div class="report-line">
                        <span>Net cash from financing</span>
                        <span>UGX ${data.financing.toLocaleString()}</span>
                    </div>
                    <div class="cash-flow-note">Includes loans, equity, and debt payments</div>
                </div>
                
                <div class="report-section">
                    <div class="net-cash-flow ${netCashFlow >= 0 ? 'positive' : 'negative'}">
                        Net Change in Cash: UGX ${netCashFlow.toLocaleString()}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error generating cash flow statement:', error);
    }
}

async function loadUsers() {
    const token = localStorage.getItem('token');
    console.log('Token being sent:', token);
    try {
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const users = await response.json();

        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.access_level}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button onclick="editUser(${user.id}, '${user.username}', '${user.email}', '${user.access_level}')">Edit</button>
                    <button onclick="deleteUser(${user.id})" ${user.access_level === 'Super Admin' ? 'disabled' : ''}>Delete</button>
                </td>
            </tr>
        `).join('');

        setupUserEvents();
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Error loading users. Please try again.');
    }
}

function setupUserEvents() {
    const addBtn = document.getElementById('add-user-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            resetUserForm();
            document.getElementById('user-modal-title').textContent = 'Add User';
            document.getElementById('user-modal').style.display = 'block';
        });
    }

    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitUser();
        });
    }

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });
}

async function submitUser() {
    const token = localStorage.getItem('token');
    const form = document.getElementById('user-form');
    const userId = form.dataset.userId;

    const userData = {
        username: document.getElementById('user-username').value,
        email: document.getElementById('user-email').value,
        access_level: document.getElementById('user-access-level').value
    };

    if (!userId) {
        userData.password = document.getElementById('user-password').value;
    }

    try {
        const url = userId ? `/api/users/${userId}` : '/api/users';
        const method = userId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
        }

        if (response.ok) {
            document.getElementById('user-modal').style.display = 'none';
            loadUsers();
        } else {
            const error = await response.json();
            alert(error.error || 'Error saving user');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Error saving user');
    }
}

function editUser(id, username, email, accessLevel) {
    const form = document.getElementById('user-form');
    form.dataset.userId = id;

    document.getElementById('user-username').value = username;
    document.getElementById('user-email').value = email;
    document.getElementById('user-access-level').value = accessLevel;
    document.getElementById('user-password').style.display = 'none';

    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('user-modal').style.display = 'block';
}

function resetUserForm() {
    const form = document.getElementById('user-form');
    form.reset();
    delete form.dataset.userId;
    document.getElementById('user-password').style.display = 'block';
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
        }

        if (response.ok) {
            loadUsers();
        } else {
            const error = await response.json();
            alert(error.error || 'Error deleting user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
    }
}

async function loadAuditLogs() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch('/api/audit?limit=50', { headers });
        const logs = await response.json();

        const tbody = document.querySelector('#audit-table tbody');
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${log.username || 'System'}</td>
                <td>${log.action}</td>
                <td>${log.details || 'N/A'}</td>
                <td>${log.ip_address || 'N/A'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading audit logs:', error);
    }
}

function setupReportDates() {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    document.getElementById('report-start-date').value = firstDay;
    document.getElementById('report-end-date').value = today;
    document.getElementById('report-as-of-date').value = today;
}

async function loadAccountsForLedger() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch('/api/accounts', { headers });
        const accounts = await response.json();

        const select = document.getElementById('ledger-account');
        select.innerHTML = '<option value="">Select Account</option>' +
            accounts.map(acc => `<option value="${acc.id}">${acc.name} (${acc.type})</option>`).join('');
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

async function loadLedgerEntries() {
    const accountId = document.getElementById('ledger-account').value;
    const startDate = document.getElementById('ledger-start-date').value;
    const endDate = document.getElementById('ledger-end-date').value;

    if (!accountId || !startDate || !endDate) {
        alert('Please select account and date range');
        return;
    }

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const response = await fetch(`/api/ledger/${accountId}?startDate=${startDate}&endDate=${endDate}`, { headers });
        const entries = await response.json();

        let runningBalance = 0;
        const tbody = document.querySelector('#ledger-table tbody');
        tbody.innerHTML = entries.map(entry => {
            runningBalance += entry.type === 'Debit' ? parseFloat(entry.amount) : -parseFloat(entry.amount);
            return `
                <tr>
                    <td>${new Date(entry.transaction_date).toLocaleDateString()}</td>
                    <td>${entry.description}</td>
                    <td>${entry.type}</td>
                    <td>UGX ${parseFloat(entry.amount).toLocaleString()}</td>
                    <td>${entry.other_account}</td>
                    <td>UGX ${runningBalance.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading ledger entries:', error);
    }
}

// Enhanced Export Functions
function exportReportToPDF(reportType) {
    const reportContent = document.getElementById('report-content');
    if (!reportContent || !reportContent.innerHTML.trim()) {
        alert('Please generate a report first before exporting.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Add company header
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 30, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Adtim Technologies (U) Limited', pageWidth / 2, 15, { align: 'center' });

    // Report title
    doc.setFontSize(12);
    doc.text(getReportTitle(reportType), pageWidth / 2, 25, { align: 'center' });

    yPosition = 40;

    // Report period
    const period = getReportPeriod(reportType);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Period: ${period}`, margin, yPosition);
    yPosition += 8;

    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, margin, yPosition);
    yPosition += 15;

    // Process report content
    const reportElement = reportContent.querySelector('.report');
    if (reportElement) {
        processReportContent(doc, reportElement, margin, pageWidth, pageHeight, yPosition);
    }

    // Add footer
    const footerY = pageHeight - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Adtim Technologies (U) Limited - Financial Report', pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text(`Page 1 of 1`, pageWidth - margin, footerY + 5, { align: 'right' });

    // Save the PDF
    const filename = `${getReportTitle(reportType).replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

function getReportTitle(reportType) {
    const titles = {
        'pl': 'PROFIT & LOSS STATEMENT',
        'balance-sheet': 'BALANCE SHEET',
        'cash-flow': 'CASH FLOW STATEMENT',
        'transactions': 'TRANSACTIONS REPORT',
        'ledger': 'ACCOUNT LEDGER REPORT'
    };
    return titles[reportType] || 'FINANCIAL REPORT';
}

function getReportPeriod(reportType) {
    switch (reportType) {
        case 'pl':
        case 'cash-flow':
            const startDate = document.getElementById('report-start-date').value;
            const endDate = document.getElementById('report-end-date').value;
            return `${formatDate(startDate)} to ${formatDate(endDate)}`;
        case 'balance-sheet':
            const asOfDate = document.getElementById('report-as-of-date').value;
            return `As of ${formatDate(asOfDate)}`;
        default:
            return `As of ${new Date().toLocaleDateString('en-GB')}`;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function processReportContent(doc, element, margin, pageWidth, pageHeight, startY) {
    let yPosition = startY;
    const lineHeight = 7;
    const sectionSpacing = 10;

    // Process all sections
    const sections = element.querySelectorAll('.report-section, .bs-section, .balance-sheet, .balance-check');

    sections.forEach((section, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
            doc.addPage();
            yPosition = margin;
        }

        // Section title
        const title = section.querySelector('h3') || section.querySelector('h2');
        if (title) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text(title.textContent, margin, yPosition);
            yPosition += lineHeight + 2;

            doc.setDrawColor(102, 126, 234);
            doc.line(margin, yPosition - 2, margin + 50, yPosition - 2);
            yPosition += 4;
        }

        // Process content based on section type
        if (section.classList.contains('bs-section')) {
            yPosition = processBalanceSheetSection(doc, section, margin, yPosition, lineHeight);
        } else if (section.classList.contains('balance-check')) {
            yPosition = processBalanceCheck(doc, section, margin, yPosition, lineHeight);
        } else {
            yPosition = processRegularSection(doc, section, margin, yPosition, lineHeight);
        }

        yPosition += sectionSpacing;
    });

    // Process net profit/loss if exists
    const netProfit = element.querySelector('.net-profit');
    if (netProfit) {
        if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const isPositive = netProfit.classList.contains('positive');
        doc.setTextColor(isPositive ? 0, 128, 0 : 255, 0, 0);
        doc.text(netProfit.textContent, margin, yPosition);
        yPosition += lineHeight + 5;
    }
}

function processRegularSection(doc, section, margin, yPosition, lineHeight) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const lines = section.querySelectorAll('.report-line');
    lines.forEach(line => {
        const spans = line.querySelectorAll('span');
        if (spans.length >= 2) {
            // Left-aligned text (account name)
            doc.setFont('helvetica', 'normal');
            doc.text(spans[0].textContent, margin, yPosition);

            // Right-aligned text (amount)
            doc.setFont('helvetica', 'bold');
            const textWidth = doc.getTextWidth(spans[1].textContent);
            doc.text(spans[1].textContent, doc.internal.pageSize.getWidth() - margin - textWidth, yPosition);

            yPosition += lineHeight;
        }
    });

    // Process total if exists
    const total = section.querySelector('.total');
    if (total) {
        yPosition += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, doc.internal.pageSize.getWidth() - margin, yPosition);
        yPosition += 4;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const totalText = total.textContent;
        const textWidth = doc.getTextWidth(totalText);
        doc.text(totalText, doc.internal.pageSize.getWidth() - margin - textWidth, yPosition);
        yPosition += lineHeight + 2;
    }

    return yPosition;
}

function processBalanceSheetSection(doc, section, margin, yPosition, lineHeight) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const items = section.querySelectorAll('.report-line');
    items.forEach(item => {
        const spans = item.querySelectorAll('span');
        if (spans.length >= 2) {
            // Account name
            doc.setFont('helvetica', 'normal');
            doc.text(spans[0].textContent, margin + 5, yPosition);

            // Amount
            doc.setFont('helvetica', 'bold');
            const textWidth = doc.getTextWidth(spans[1].textContent);
            doc.text(spans[1].textContent, doc.internal.pageSize.getWidth() - margin - textWidth, yPosition);

            yPosition += lineHeight;
        }
    });

    // Section total
    const total = section.querySelector('.total');
    if (total) {
        yPosition += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, doc.internal.pageSize.getWidth() - margin, yPosition);
        yPosition += 4;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const totalText = total.textContent;
        const textWidth = doc.getTextWidth(totalText);
        doc.text(totalText, doc.internal.pageSize.getWidth() - margin - textWidth, yPosition);
        yPosition += lineHeight + 2;
    }

    return yPosition;
}

function processBalanceCheck(doc, section, margin, yPosition, lineHeight) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    const lines = section.innerHTML.split('<br>');
    lines.forEach(line => {
        const text = line.replace(/<[^>]*>/g, '').trim();
        if (text) {
            // Center align balance check
            const textWidth = doc.getTextWidth(text);
            const xPosition = (doc.internal.pageSize.getWidth() - textWidth) / 2;
            doc.text(text, xPosition, yPosition);
            yPosition += lineHeight;
        }
    });

    return yPosition;
}

function printReport() {
    const reportContent = document.getElementById('report-content');
    if (!reportContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Adtim Technologies - Financial Report</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    color: #333;
                    font-size: 12pt;
                }
                .report-header { 
                    text-align: center; 
                    margin-bottom: 30px;
                    border-bottom: 2px solid #667eea;
                    padding-bottom: 20px;
                }
                .report-header h2 { 
                    color: #2c3e50; 
                    margin: 0 0 10px 0;
                }
                .report-period, .report-date {
                    margin: 5px 0;
                    color: #666;
                    font-size: 11pt;
                }
                .report-section { 
                    margin: 25px 0; 
                    page-break-inside: avoid;
                }
                .report-section h3 { 
                    color: #667eea; 
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                    margin-bottom: 15px;
                }
                .report-line { 
                    display: flex; 
                    justify-content: space-between;
                    margin: 8px 0;
                    padding: 4px 0;
                }
                .total { 
                    font-weight: bold; 
                    border-top: 2px solid #2c3e50;
                    margin-top: 10px;
                    padding-top: 10px;
                }
                .net-profit { 
                    text-align: center; 
                    font-weight: bold;
                    font-size: 14pt;
                    padding: 15px;
                    margin: 20px 0;
                }
                .positive { background-color: #d4edda; color: #155724; }
                .negative { background-color: #f8d7da; color: #721c24; }
                @media print {
                    body { margin: 0; padding: 15mm; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            ${reportContent.innerHTML}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 100);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

async function exportReportToPDF(view) {
    const reportContent = document.getElementById('report-content');

    if (!reportContent || !reportContent.innerHTML.trim()) {
        alert('Please generate a report first before exporting.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Add header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ADTIM TECHNOLOGIES (U) LIMITED', 105, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const reportTitle = document.querySelector('.reports h1')?.textContent || 'Financial Report';
    doc.text(reportTitle, 105, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });

    // Add line
    doc.line(20, 45, 190, 45);

    let yPosition = 55;

    // Process report sections
    const sections = reportContent.querySelectorAll('.report-section');
    sections.forEach(section => {
        const heading = section.querySelector('h3');
        if (heading) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(heading.textContent, 20, yPosition);
            yPosition += 10;
        }

        const lines = section.querySelectorAll('.report-line');
        lines.forEach(line => {
            const spans = line.querySelectorAll('span');
            if (spans.length >= 2) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(spans[0].textContent, 25, yPosition);
                doc.text(spans[1].textContent, 150, yPosition);
                yPosition += 6;
            }
        });

        const total = section.querySelector('.total');
        if (total) {
            doc.setFont('helvetica', 'bold');
            doc.text(total.textContent, 25, yPosition);
            yPosition += 8;
        }

        yPosition += 5;

        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }
    });

    // Handle net profit/loss
    const netProfit = reportContent.querySelector('.net-profit');
    if (netProfit) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(netProfit.textContent, 105, yPosition, { align: 'center' });
    }

    doc.save(`${reportTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

// Enhanced Export Functions
function exportReportToPDF(reportType) {
    const reportContent = document.getElementById('report-content');
    if (!reportContent || !reportContent.innerHTML.trim()) {
        alert('Please generate a report first before exporting.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Add company header
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 30, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Adtim Technologies (U) Limited', pageWidth / 2, 15, { align: 'center' });

    // Report title
    doc.setFontSize(12);
    doc.text(getReportTitle(reportType), pageWidth / 2, 25, { align: 'center' });

    yPosition = 40;

    // Report period
    const period = getReportPeriod(reportType);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Period: ${period}`, margin, yPosition);
    yPosition += 8;

    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, margin, yPosition);
    yPosition += 15;

    // Process report content
    const reportElement = reportContent.querySelector('.report');
    if (reportElement) {
        processReportContent(doc, reportElement, margin, pageWidth, pageHeight, yPosition);
    }

    // Add footer
    const footerY = pageHeight - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Adtim Technologies (U) Limited - Financial Report', pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text(`Page 1 of 1`, pageWidth - margin, footerY + 5, { align: 'right' });

    // Save the PDF
    const filename = `${getReportTitle(reportType).replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

function getReportTitle(reportType) {
    const titles = {
        'pl': 'PROFIT & LOSS STATEMENT',
        'balance-sheet': 'BALANCE SHEET',
        'cash-flow': 'CASH FLOW STATEMENT',
        'transactions': 'TRANSACTIONS REPORT',
        'ledger': 'ACCOUNT LEDGER REPORT'
    };
    return titles[reportType] || 'FINANCIAL REPORT';
}

function getReportPeriod(reportType) {
    switch (reportType) {
        case 'pl':
        case 'cash-flow':
            const startDate = document.getElementById('report-start-date').value;
            const endDate = document.getElementById('report-end-date').value;
            return `${formatDate(startDate)} to ${formatDate(endDate)}`;
        case 'balance-sheet':
            const asOfDate = document.getElementById('report-as-of-date').value;
            return `As of ${formatDate(asOfDate)}`;
        default:
            return `As of ${new Date().toLocaleDateString('en-GB')}`;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function processReportContent(doc, element, margin, pageWidth, pageHeight, startY) {
    let yPosition = startY;
    const lineHeight = 7;
    const sectionSpacing = 10;

    // Process all sections
    const sections = element.querySelectorAll('.report-section, .bs-section, .balance-sheet, .balance-check');

    sections.forEach((section, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
            doc.addPage();
            yPosition = margin;
        }

        // Section title
        const title = section.querySelector('h3') || section.querySelector('h2');
        if (title) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text(title.textContent, margin, yPosition);
            yPosition += lineHeight + 2;

            doc.setDrawColor(102, 126, 234);
            doc.line(margin, yPosition - 2, margin + 50, yPosition - 2);
            yPosition += 4;
        }

        // Process content based on section type
        if (section.classList.contains('bs-section')) {
            yPosition = processBalanceSheetSection(doc, section, margin, yPosition, lineHeight);
        } else if (section.classList.contains('balance-check')) {
            yPosition = processBalanceCheck(doc, section, margin, yPosition, lineHeight);
        } else {
            yPosition = processRegularSection(doc, section, margin, yPosition, lineHeight);
        }

        yPosition += sectionSpacing;
    });

    // Process net profit/loss if exists
    const netProfit = element.querySelector('.net-profit');
    if (netProfit) {
        if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const isPositive = netProfit.classList.contains('positive');
        doc.setTextColor(isPositive ? 0, 128, 0 : 255, 0, 0);
        doc.text(netProfit.textContent, margin, yPosition);
        yPosition += lineHeight + 5;
    }
}

function processRegularSection(doc, section, margin, yPosition, lineHeight) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const lines = section.querySelectorAll('.report-line');
    lines.forEach(line => {
        const spans = line.querySelectorAll('span');
        if (spans.length >= 2) {
            // Left-aligned text (account name)
            doc.setFont('helvetica', 'normal');
            doc.text(spans[0].textContent, margin, yPosition);

            // Right-aligned text (amount)
            doc.setFont('helvetica', 'bold');
            const textWidth = doc.getTextWidth(spans[1].textContent);
            doc.text(spans[1].textContent, doc.internal.pageSize.getWidth() - margin - textWidth, yPosition);

            yPosition += lineHeight;
        }
    });

    // Process total if exists
    const total = section.querySelector('.total');
    if (total) {
        yPosition += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, doc.internal.pageSize.getWidth() - margin, yPosition);
        yPosition += 4;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const totalText = total.textContent;
        const textWidth = doc.getTextWidth(totalText);
        doc.text(totalText, doc.internal.pageSize.getWidth() - margin - textWidth, yPosition);
        yPosition += lineHeight + 2;
    }

    return yPosition;
}

function processBalanceSheetSection(doc, section, margin, yPosition, lineHeight) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const items = section.querySelectorAll('.report-line');
    items.forEach(item => {
        const spans = item.querySelectorAll('span');
        if (spans.length >= 2) {
            // Account name
            doc.setFont('helvetica', 'normal');
            doc.text(spans[0].textContent, margin + 5, yPosition);

            // Amount
            doc.setFont('helvetica', 'bold');
            const textWidth = doc.getTextWidth(spans[1].textContent);
            doc.text(spans[1].textContent, doc.internal.pageSize.getWidth() - margin - textWidth, yPosition);

            yPosition += lineHeight;
        }
    });

    // Section total
    const total = section.querySelector('.total');
    if (total) {
        yPosition += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, doc.internal.pageSize.getWidth() - margin, yPosition);
        yPosition += 4;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const totalText = total.textContent;
        const textWidth = doc.getTextWidth(totalText);
        doc.text(totalText, doc.internal.pageSize.getWidth() - margin - textWidth, yPosition);
        yPosition += lineHeight + 2;
    }

    return yPosition;
}

function processBalanceCheck(doc, section, margin, yPosition, lineHeight) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    const lines = section.innerHTML.split('<br>');
    lines.forEach(line => {
        const text = line.replace(/<[^>]*>/g, '').trim();
        if (text) {
            // Center align balance check
            const textWidth = doc.getTextWidth(text);
            const xPosition = (doc.internal.pageSize.getWidth() - textWidth) / 2;
            doc.text(text, xPosition, yPosition);
            yPosition += lineHeight;
        }
    });

    return yPosition;
}

// Enhanced Excel Export Function
function exportReportToExcel(reportType) {
    const reportContent = document.getElementById('report-content');
    if (!reportContent || !reportContent.innerHTML.trim()) {
        alert('Please generate a report first before exporting.');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();
        const wsData = [];

        // Add header
        wsData.push(['Adtim Technologies (U) Limited']);
        wsData.push([getReportTitle(reportType)]);
        wsData.push([`Report Period: ${getReportPeriod(reportType)}`]);
        wsData.push([`Generated: ${new Date().toLocaleDateString()}`]);
        wsData.push([]); // Empty row

        // Process report content
        const reportElement = reportContent.querySelector('.report');
        if (reportElement) {
            processExcelContent(wsData, reportElement);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Report');

        const filename = `${getReportTitle(reportType).replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
    } catch (error) {
        console.error('Excel Export Error:', error);
        alert('Error exporting Excel file. Please try again.');
    }
}

function processExcelContent(wsData, element) {
    const sections = element.querySelectorAll('.report-section, .bs-section, .balance-sheet, .balance-check');

    sections.forEach(section => {
        const title = section.querySelector('h3') || section.querySelector('h2');
        if (title) {
            wsData.push([title.textContent]);
            wsData.push([]); // Empty row
        }

        if (section.classList.contains('bs-section')) {
            processBalanceSheetExcel(wsData, section);
        } else {
            processRegularExcel(wsData, section);
        }

        wsData.push([]); // Empty row between sections
    });

    // Process net profit/loss if exists
    const netProfit = element.querySelector('.net-profit');
    if (netProfit) {
        wsData.push([netProfit.textContent]);
    }
}

function processRegularExcel(wsData, section) {
    const lines = section.querySelectorAll('.report-line');
    lines.forEach(line => {
        const spans = line.querySelectorAll('span');
        if (spans.length >= 2) {
            wsData.push([spans[0].textContent, spans[1].textContent]);
        }
    });

    const total = section.querySelector('.total');
    if (total) {
        wsData.push([total.textContent]);
    }
}

function processBalanceSheetExcel(wsData, section) {
    const items = section.querySelectorAll('.report-line');
    items.forEach(item => {
        const spans = item.querySelectorAll('span');
        if (spans.length >= 2) {
            wsData.push([spans[0].textContent, spans[1].textContent]);
        }
    });

    const total = section.querySelector('.total');
    if (total) {
        wsData.push([total.textContent]);
    }
}

// Simple table export functions
function exportTableToPDF(tableId, filename) {
    const doc = new jspdf.jsPDF();
    doc.text('Adtim Technologies (U) Limited', 20, 20);
    doc.text('Generated: ' + new Date().toLocaleDateString(), 20, 30);
    doc.autoTable({ html: '#' + tableId, startY: 40 });
    doc.save(filename + '.pdf');
}

function exportTableToExcel(tableId, filename) {
    try {
        const table = document.getElementById(tableId);
        if (!table) {
            alert('Table not found for export.');
            return;
        }
        const wb = XLSX.utils.table_to_book(table);
        XLSX.writeFile(wb, filename + ".xlsx");
    } catch (error) {
        console.error('Excel Export Error:', error);
        alert('Error exporting Excel file. Please try again.');
    }
}