// Localization Dictionary
const translations = {
    en: {
        app_name: "UtsavHisab",
        tagline: "Digital Mandal Accounts & Vargani Management",
        income: "Total Income",
        expense: "Total Expense",
        balance: "Net Balance",
        cash: "Cash in Hand",
        bank: "Bank Balance",
        upi: "UPI / Digital",
        record_income: "Record Income",
        record_expense: "Record Expense",
        no_income: "No income recorded yet.",
        no_expense: "No expense recorded yet.",
        no_donors: "No donors registered.",
        save: "Save",
        cancel: "Cancel",
        search: "Search...",
        currency_symbol: "₹",
        select_mandal: "Select Mandal",
        select_festival: "Select Festival",
        offline_mode: "You are currently working offline. Entries will sync when connected."
    },
    mr: {
        app_name: "उत्सव हिशोब",
        tagline: "मंडळाचा हिशोब, आता डिजिटल.",
        income: "एकूण जमा (उत्पन्न)",
        expense: "एकूण खर्च",
        balance: "शिल्लक रक्कम",
        cash: "रोख शिल्लक",
        bank: "बँक शिल्लक",
        upi: "UPI / डिजिटल",
        record_income: "वर्गणी / देणगी नोंदवा",
        record_expense: "खर्च नोंदवा",
        no_income: "अजून कोणतेही उत्पन्न नोंदवलेले नाही.",
        no_expense: "अजून कोणताही खर्च नोंदवलेला नाही.",
        no_donors: "अजून कोणतेही देणगीदार नाहीत.",
        save: "जतन करा",
        cancel: "रद्द करा",
        search: "शोधा...",
        currency_symbol: "₹",
        select_mandal: "मंडळ निवडा",
        select_festival: "उत्सव निवडा",
        offline_mode: "आपण ऑफलाइन आहात. इंटरनेट सुरू झाल्यावर नोंदी आपोआप सिंक होतील."
    },
    hi: {
        app_name: "उत्सव हिसाब",
        tagline: "मंडल का हिसाब, अब पूरी तरह डिजिटल.",
        income: "कुल आय (जमा)",
        expense: "कुल खर्च",
        balance: "शेष राशि",
        cash: "नकद शेष",
        bank: "बैंक शेष",
        upi: "UPI / डिजिटल",
        record_income: "चंदा / दान दर्ज करें",
        record_expense: "खर्च दर्ज करें",
        no_income: "अभी तक कोई आय दर्ज नहीं की गई है।",
        no_expense: "अभी तक कोई खर्च दर्ज नहीं किया गया है।",
        no_donors: "कोई दानदाता नहीं मिले।",
        save: "सुरक्षित करें",
        cancel: "रद्द करें",
        search: "खोजें...",
        currency_symbol: "₹",
        select_mandal: "मंडल चुनें",
        select_festival: "त्योहार चुनें",
        offline_mode: "आप ऑफ़लाइन हैं। इंटरनेट जुड़ने पर प्रविष्टियां सिंक हो जाएंगी।"
    }
};

let currentLang = localStorage.getItem('uh_language') || 'mr';

function t(key) {
    return translations[currentLang]?.[key] || translations['en'][key] || key;
}

function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('uh_language', lang);
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const k = el.getAttribute('data-i18n');
            el.textContent = t(k);
        });
    }
}

// Indian Currency Formatter (e.g. ₹1,51,116.00)
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Toast Notifications
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Convert numbers to Marathi / English words
function numberToWordsINR(amount) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(num) {
        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str.trim();
    }
    return inWords(Math.floor(amount)) + ' Rupees Only';
}

// Global Nav HTML Injector
function renderNavigation(activePage = 'dashboard') {
    const navContainer = document.getElementById('app-shell');
    if (!navContainer) return;

    const navHTML = `
    <aside class="sidebar">
        <div class="sidebar-header">
            <div style="background:var(--primary);color:#fff;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:bold;">UH</div>
            <div>
                <h3 style="font-size:1.1rem;">UtsavHisab</h3>
                <span id="nav-mandal-name" style="font-size:0.75rem;color:var(--text-muted);">Loading...</span>
            </div>
        </div>
        <nav class="sidebar-nav">
            <a href="dashboard.html" class="nav-item ${activePage==='dashboard'?'active':''}"><i data-lucide="layout-dashboard"></i> Dashboard</a>
            <a href="income.html" class="nav-item ${activePage==='income'?'active':''}"><i data-lucide="arrow-down-left"></i> Income (वर्गणी)</a>
            <a href="expense.html" class="nav-item ${activePage==='expense'?'active':''}"><i data-lucide="arrow-up-right"></i> Expense (खर्च)</a>
            <a href="receipts.html" class="nav-item ${activePage==='receipts'?'active':''}"><i data-lucide="receipt"></i> Receipts (पावत्या)</a>
            <a href="donors.html" class="nav-item ${activePage==='donors'?'active':''}"><i data-lucide="heart-handshake"></i> Donors</a>
            <a href="members.html" class="nav-item ${activePage==='members'?'active':''}"><i data-lucide="users"></i> Committee</a>
            <a href="reports.html" class="nav-item ${activePage==='reports'?'active':''}"><i data-lucide="file-text"></i> Reports</a>
            <a href="settings.html" class="nav-item ${activePage==='settings'?'active':''}"><i data-lucide="settings"></i> Settings</a>
            <div style="margin-top:auto;">
                <button onclick="signOut()" class="btn btn-outline btn-block" style="border:none;justify-content:flex-start;color:var(--danger);"><i data-lucide="log-out"></i> Logout</button>
            </div>
        </nav>
    </aside>

    <div class="mobile-nav">
        <a href="dashboard.html" class="mobile-nav-item ${activePage==='dashboard'?'active':''}"><i data-lucide="home"></i> Home</a>
        <a href="income.html" class="mobile-nav-item ${activePage==='income'?'active':''}"><i data-lucide="plus-circle"></i> + Income</a>
        <a href="expense.html" class="mobile-nav-item ${activePage==='expense'?'active':''}"><i data-lucide="minus-circle"></i> - Expense</a>
        <a href="receipts.html" class="mobile-nav-item ${activePage==='receipts'?'active':''}"><i data-lucide="receipt"></i> Receipts</a>
        <a href="reports.html" class="mobile-nav-item ${activePage==='reports'?'active':''}"><i data-lucide="bar-chart-3"></i> Reports</a>
    </div>
    `;

    navContainer.insertAdjacentHTML('afterbegin', navHTML);
    if (window.lucide) lucide.createIcons();
}
