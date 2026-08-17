document.addEventListener('DOMContentLoaded', async () => {
    renderNavigation('income');
    await checkAuth();
    loadAccountsAndCategories();

    document.getElementById('incomeForm').onsubmit = handleIncomeSubmit;
});

async function loadAccountsAndCategories() {
    const { data: accounts } = await db.from('accounts').select('id, name').eq('mandal_id', currentMandal.id);
    const { data: categories } = await db.from('income_categories').select('id, name').eq('mandal_id', currentMandal.id);

    const accSelect = document.getElementById('inc_account');
    const catSelect = document.getElementById('inc_category');

    accounts?.forEach(a => accSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`);
    categories?.forEach(c => catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`);
}

async function handleIncomeSubmit(e) {
    e.preventDefault();
    const amount = Number(document.getElementById('inc_amount').value);
    const donorName = document.getElementById('inc_donor_name').value.trim();
    const donorPhone = document.getElementById('inc_donor_phone').value.trim();
    const accountId = document.getElementById('inc_account').value;
    const categoryId = document.getElementById('inc_category').value;
    const paymentMode = document.getElementById('inc_mode').value;
    const description = document.getElementById('inc_notes').value.trim();

    if (amount <= 0 || !donorName) {
        showToast("कृपया योग्य माहिती भरा.", "warning");
        return;
    }

    const payload = {
        p_mandal_id: currentMandal.id,
        p_festival_id: currentFestival.id,
        p_amount: amount,
        p_payment_mode: paymentMode,
        p_account_id: accountId,
        p_category_id: categoryId,
        p_donor_name: donorName,
        p_donor_phone: donorPhone,
        p_donor_address: '',
        p_collector_id: null,
        p_description: description
    };

    if (!navigator.onLine) {
        await offlineEngine.enqueue('CREATE_INCOME', payload);
        document.getElementById('incomeForm').reset();
        return;
    }

    const { data, error } = await db.rpc('create_income_entry', payload);
    if (error) {
        showToast(error.message, 'error');
        return;
    }

    showToast(`पावती तयार झाली: ${data.receipt_number}`);
    document.getElementById('incomeForm').reset();
    
    // Open receipt modal / print preview
    window.location.href = `receipts.html?token=${data.public_token}`;
}
