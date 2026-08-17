export type SupportedLang = 'mr' | 'hi' | 'en';

export const dictionaries = {
  mr: {
    appName: 'मंडळसेतू',
    tagline: 'मंडळाचा हिशोब, आता पूर्ण डिजिटल',
    subTagline: 'वर्गणी, देणगी, खर्च, पावत्या आणि संपूर्ण हिशोब एका सोप्या ॲपमध्ये.',
    dashboard: 'डॅशबोर्ड',
    totalBalance: 'एकूण शिल्लक',
    totalIncome: 'एकूण जमा (उत्पन्न)',
    totalExpense: 'एकूण खर्च',
    cash: 'रोख (Cash)',
    bank: 'बँक (Bank)',
    upi: 'युपीआय (UPI)',
    quickActions: 'जलद कृती',
    addIncome: 'जमा नोंदवा (+)',
    addExpense: 'खर्च नोंदवा (-)',
    receipts: 'पावती पुस्तक',
    members: 'कार्यकर्ते / सदस्य',
    reports: 'अहवाल',
    donorName: 'देणगीदाराचे नाव',
    amount: 'रक्कम (₹)',
    category: 'वर्गवारी / Head',
    collector: 'जमाकर्ता',
    paymentMethod: 'पेमेंट प्रकार',
    saveAndGenerateReceipt: 'जतन करा व पावती द्या',
    shareWhatsApp: 'व्हॉट्सअ‍ॅपवर पाठवा',
    downloadPdf: 'PDF डाउनलोड करा',
    recentTransactions: 'अलीकडील नोंदी',
    doorToDoor: 'घरोघरी वर्गणी नोंदणी',
    offlineBadge: 'इंटरनेट उपलब्ध नाही (ऑफलाइन मोड - डेटा सुरक्षित आहे)',
    syncReady: 'ऑनलाइन आले. डेटा सर्व्हरवर सिंक केला जात आहे...',
    receiptNo: 'पावती क्र.',
    date: 'दिनांक',
    amountInWords: 'अक्षरी रक्कम',
    rupeesOnly: 'रुपये फक्त.',
    approvalRequired: 'मान्यता प्रलंबित',
  },
  hi: {
    appName: 'मंडलसेतु',
    tagline: 'मंडल का हिसाब, अब पूरी तरह डिजिटल',
    subTagline: 'चंदा, दान, खर्च, रसीदें और पूरा ब्योरा एक आसान ऐप में।',
    dashboard: 'डैशबोर्ड',
    totalBalance: 'कुल शेष (बैलेंस)',
    totalIncome: 'कुल आमदनी (जमा)',
    totalExpense: 'कुल खर्च',
    cash: 'नकद (Cash)',
    bank: 'बैंक (Bank)',
    upi: 'यूपीआई (UPI)',
    quickActions: 'त्वरित कार्य',
    addIncome: 'जमा जोड़ें (+)',
    addExpense: 'खर्च जोड़ें (-)',
    receipts: 'रसीद बुक',
    members: 'कार्यकर्ता / सदस्य',
    reports: 'रिपोर्ट्स',
    donorName: 'दानदाता का नाम',
    amount: 'राशि (₹)',
    category: 'मद / श्रेणी',
    collector: 'संग्रहकर्ता',
    paymentMethod: 'भुगतान माध्यम',
    saveAndGenerateReceipt: 'सुरक्षित करें और रसीद बनाएं',
    shareWhatsApp: 'व्हाट्सएप पर भेजें',
    downloadPdf: 'PDF डाउनलोड करें',
    recentTransactions: 'हाल के लेनदेन',
    doorToDoor: 'घर-घर चंदा संग्रह',
    offlineBadge: 'इंटरनेट नहीं है (ऑफलाइन मोड - डेटा सुरक्षित है)',
    syncReady: 'ऑनलाइन। डेटा सिंक हो रहा है...',
    receiptNo: 'रसीद सं.',
    date: 'दिनांक',
    amountInWords: 'शब्दों में राशि',
    rupeesOnly: 'रुपये मात्र।',
    approvalRequired: 'स्वीकृति प्रतीक्षित',
  },
  en: {
    appName: 'MandalSetu',
    tagline: 'Mandal Accounting, Fully Digitalized',
    subTagline: 'Vargani, donations, expenses, receipts, and ledgers in one simple app.',
    dashboard: 'Dashboard',
    totalBalance: 'Net Balance',
    totalIncome: 'Total Income',
    totalExpense: 'Total Expenses',
    cash: 'Cash Ledger',
    bank: 'Bank Account',
    upi: 'UPI Account',
    quickActions: 'Quick Actions',
    addIncome: '+ Add Income',
    addExpense: '- Add Expense',
    receipts: 'Receipt Book',
    members: 'Members & Crew',
    reports: 'Financial Reports',
    donorName: 'Donor Name',
    amount: 'Amount (₹)',
    category: 'Account Head',
    collector: 'Collector',
    paymentMethod: 'Payment Mode',
    saveAndGenerateReceipt: 'Save & Issue Receipt',
    shareWhatsApp: 'Share on WhatsApp',
    downloadPdf: 'Download PDF',
    recentTransactions: 'Recent Transactions',
    doorToDoor: 'Door-to-Door Collection',
    offlineBadge: 'Offline Mode Active (Data will sync when online)',
    syncReady: 'Online. Syncing mutations...',
    receiptNo: 'Receipt No.',
    date: 'Date',
    amountInWords: 'Amount in Words',
    rupeesOnly: 'Rupees Only.',
    approvalRequired: 'Pending Approval',
  }
};

/**
 * Converts Indian Rupee number to Words in English, Marathi, or Hindi
 */
export function numberToWords(num: number, lang: SupportedLang = 'en'): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
             'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const marathiUnits = ['', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ', 'दहा', 
                        'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस'];
  const hindiUnits = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
                      'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'];

  if (num === 0) return 'Zero';

  const formatEng = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + formatEng(n % 100) : '');
    if (n < 100000) return formatEng(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + formatEng(n % 1000) : '');
    if (n < 10000000) return formatEng(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + formatEng(n % 100000) : '');
    return formatEng(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + formatEng(n % 10000000) : '');
  };

  const words = formatEng(Math.floor(num));
  if (lang === 'mr') {
    return `${words} रुपये फक्त`;
  }
  if (lang === 'hi') {
    return `${words} रुपये मात्र`;
  }
  return `${words} Rupees Only`;
}
