// File: public/js/dashboard.js
async function renderDashboardCharts(headers) {
    try {
        const response = await fetch('/api/dashboard/summary', { headers });
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();

        // 1. Profit Line Chart (Income vs Expense)
        const profitCtx = document.getElementById('profitChart').getContext('2d');
        const months = data.incomeVsExpense.map(d => d.month);
        const incomes = data.incomeVsExpense.map(d => parseFloat(d.total_income));
        const expenses = data.incomeVsExpense.map(d => parseFloat(d.total_expense));
        const profits = incomes.map((income, i) => income - expenses[i]);

        new Chart(profitCtx, {
            type: 'smoothed line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Profit',
                        data: profits,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'Total Income',
                        data: incomes,
                        borderColor: 'rgba(76, 175, 80, 0.5)',
                        hidden: true,
                    },
                    {
                        label: 'Total Expense',
                        data: expenses,
                        borderColor: 'rgba(211, 47, 47, 0.5)',
                        hidden: true,
                    }
                    {
                        label: 'Tithes',
                        data: tithes,
                        borderColor: 'rgba(174, 61, 130, 0.5)',
                        hidden: true,
                    }
                    {
                        label: 'Income Tax',
                        data: incomeTax,
                        borderColor: 'rgba(221, 169, 170, 0.5)',
                        hidden: true,
                    }
                ]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value, index, values) {
                                return 'UGX ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        // 2. Expense Breakdown Pie Chart
        const expenseCtx = document.getElementById('expensePieChart').getContext('2d');
        const expenseLabels = data.expenseBreakdown.map(d => d.category);
        const expenseTotals = data.expenseBreakdown.map(d => parseFloat(d.total));

        new Chart(expenseCtx, {
            type: 'pie',
            data: {
                labels: expenseLabels,
                datasets: [{
                    label: 'Expense Breakdown',
                    data: expenseTotals,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)'
                    ],
                }]
            },
        });

        // 3. Income vs Expenses Bar Chart
        const incomeExpenseCtx = document.getElementById('incomeExpenseBar').getContext('2d');
        const incomeExpenseLabels = data.incomeVsExpense.map(d => d.month);
        const incomeData = data.incomeVsExpense.map(d => parseFloat(d.total_income));
        const expenseData = data.incomeVsExpense.map(d => parseFloat(d.total_expense));

        new Chart(incomeExpenseCtx, {
            type: 'bar',
            data: {
                labels: incomeExpenseLabels,
                datasets: [
                    {
                        label: 'Total Income',
                        data: incomeData,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    },
                    {
                        label: 'Total Expense',
                        data: expenseData,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return 'UGX ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error rendering dashboard:', error);
        document.getElementById('app-view').innerHTML = '<p>Could not load dashboard data.</p>';
    }
}