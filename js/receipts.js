document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const publicToken = urlParams.get('token');

    if (publicToken) {
        // Public receipt view mode (no auth needed)
        loadSingleReceipt(publicToken);
    } else {
        renderNavigation('receipts');
        await checkAuth();
        loadAllReceipts();
    }
});

async function loadSingleReceipt(token) {
    const { data: receipt, error } = await db
        .from('receipts')
        .select(`
            id, receipt_number, amount, donor_name, payment_mode, receipt_date, public_token,
            mandals ( name, address, city, district, phone, logo_url ),
            festivals ( name, year )
        `)
        .eq('public_token', token)
        .single();

    if (error || !receipt) {
        document.getElementById('receipt-view-area').innerHTML = `<h3>पावती सापडली नाही (Invalid Receipt Token)</h3>`;
        return;
    }

    renderReceiptCard(receipt);
}

function renderReceiptCard(receipt) {
    const container = document.getElementById('receipt-view-area');
    const amountInWords = numberToWordsINR(receipt.amount);
    
    container.innerHTML = `
        <div class="card" id="printableReceipt" style="max-width: 600px; margin: 0 auto; border: 2px solid var(--primary); padding: 24px;">
            <div style="text-align: center; border-bottom: 2px dashed var(--border); padding-bottom: 16px;">
                <h2>${receipt.mandals.name}</h2>
                <p>${receipt.mandals.city}, ${receipt.mandals.district} | संपर्क: ${receipt.mandals.phone || '-'}</p>
                <span class="badge badge-primary" style="font-size:0.9rem; margin-top:6px;">${receipt.festivals.name}</span>
            </div>
            <div style="margin-top: 16px; display:flex; justify-content:space-between;">
                <strong>पावती क्र: ${receipt.receipt_number}</strong>
                <span>दिनांक: ${formatDate(receipt.receipt_date)}</span>
            </div>
            <div style="margin: 20px 0; font-size: 1.05rem;">
                <p>श्री / सौ: <strong>${receipt.donor_name}</strong></p>
                <p>यांजकडून <strong>${formatCurrency(receipt.amount)}</strong></p>
                <p>अक्षरी: <em>${amountInWords}</em></p>
                <p>पद्धत: <strong>${receipt.payment_mode}</strong></p>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top: 30px; border-top: 1px solid var(--border); padding-top: 12px;">
                <small>Digital Verified Receipt</small>
                <strong>खजिनदार / स्वाक्षरी</strong>
            </div>
            <div style="margin-top: 24px; display:flex; gap:12px;" class="no-print">
                <button onclick="downloadPDFReceipt('${receipt.receipt_number}')" class="btn btn-primary btn-block"><i data-lucide="download"></i> PDF Download</button>
                <button onclick="shareOnWhatsApp('${receipt.donor_name}', '${receipt.amount}', '${receipt.public_token}')" class="btn btn-success btn-block"><i data-lucide="share-2"></i> WhatsApp</button>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function shareOnWhatsApp(name, amount, token) {
    const url = `${window.location.origin}/receipts.html?token=${token}`;
    const text = `सस्नेह नमस्कार ${name} जी, आपले ${formatCurrency(amount)} चे सहकार्य लाभले. आपली अधिकृत डिजिटल पावती पाहण्यासाठी खालील लिंकवर क्लिक करा: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function downloadPDFReceipt(receiptNo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`UTSAVHISAB RECEIPT: ${receiptNo}`, 20, 20);
    doc.save(`Receipt_${receiptNo}.pdf`);
}
