document.addEventListener('DOMContentLoaded', async () => {
    renderNavigation('dashboard');
    const user = await checkAuth();
    if (!user || !currentMandal) return;

    await loadDashboardStats();
    initRealtime();
});

async function loadDashboardStats() {
    const mandalId = currentMandal.id;
    const festivalId = currentFestival?.id;

    if (!festivalId) return;

    // Fetch Income Aggregate
    const { data: incomeData } = await db
        .from('transactions')
        .select('amount, payment_mode')
        .eq('mandal_id', mandalId)
        .eq('festival_id', festivalId)
        .eq('type', 'INCOME');

    // Fetch Expense Aggregate
    const { data: expenseData } = await db
        .from('transactions')
        .select('amount')
        .eq('mandal_id', mandalId)
        .eq('festival_id', festivalId)
        .eq('type', 'EXPENSE');

    let totalIncome = 0;
    let cashBalance = 0;
    let bankBalance = 0;
    let upiBalance = 0;

    (incomeData || []).forEach(tx => {
        totalIncome += Number(tx.amount);
        if (tx.payment_mode === 'CASH') cashBalance += Number(tx.amount);
        if (tx.payment_mode === 'BANK_TRANSFER') bankBalance += Number(tx.amount);
        if (tx.payment_mode === 'UPI') upiBalance += Number(tx.amount);
    });

    let totalExpense = (expenseData || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
    let netBalance = totalIncome - totalExpense;

    document.getElementById('stat-total-income').innerText = formatCurrency(totalIncome);
    document.getElementById('stat-total-expense').innerText = formatCurrency(totalExpense);
    document.getElementById('stat-net-balance').innerText = formatCurrency(netBalance);
    document.getElementById('stat-cash').innerText = formatCurrency(cashBalance);
    document.getElementById('stat-bank').innerText = formatCurrency(bankBalance);
    document.getElementById('stat-upi').innerText = formatCurrency(upiBalance);

    await loadRecentTransactions();
    renderCharts(mandalId, festivalId);
}

async function loadRecentTransactions() {
    const { data: transactions } = await db
        .from('transactions')
        .select('id, type, amount, payment_mode, transaction_date, description')
        .eq('mandal_id', currentMandal.id)
        .order('created_at', { ascending: false })
        .limit(6);

    const tbody = document.getElementById('recent-tx-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">कोणत्याही नोंदी उपलब्ध नाहीत.</td></tr>`;
        return;
    }

    transactions.forEach(tx => {
        const isInc = tx.type === 'INCOME';
        tbody.innerHTML += `
            <tr>
                <td>${formatDate(tx.transaction_date)}</td>
                <td>${tx.description || '-'}</td>
                <td><span class="badge ${isInc ? 'badge-success' : 'badge-danger'}">${tx.payment_mode}</span></td>
                <td style="font-weight:700; color:${isInc ? 'var(--success)' : 'var(--danger)'}">
                    ${isInc ? '+' : '-'} ${formatCurrency(tx.amount)}
                </td>
            </tr>
        `;
    });
}

function renderCharts(mandalId, festivalId) {
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Vargani (वर्गणी)', 'Donations (देणगी)', 'Sponsorships', 'Other'],
            datasets: [{
                data: [65, 20, 10, 5],
                backgroundColor: ['#7C3AED', '#16A34A', '#F59E0B', '#64748B']
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function initRealtime() {
    db.channel('public-transactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
            loadDashboardStats();
        })
        .subscribe();
}
