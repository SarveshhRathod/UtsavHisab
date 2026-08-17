document.addEventListener('DOMContentLoaded', async () => {
    renderNavigation('reports');
    await checkAuth();

    document.getElementById('exportExcelBtn').onclick = exportToExcel;
    document.getElementById('exportPdfBtn').onclick = exportToPDF;
});

async function exportToExcel() {
    const { data: transactions } = await db
        .from('transactions')
        .select('transaction_date, type, amount, payment_mode, description')
        .eq('mandal_id', currentMandal.id);

    const ws = XLSX.utils.json_to_sheet(transactions || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `UtsavHisab_${currentMandal.name}_Report.xlsx`);
    showToast("Excel रिपोर्ट डाऊनलोड झाला!");
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${currentMandal.name} - Financial Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

    doc.save(`UtsavHisab_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("PDF रिपोर्ट डाऊनलोड झाला!");
}
