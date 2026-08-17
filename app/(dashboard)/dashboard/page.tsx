'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, QrCode, FileSpreadsheet, Share2, WifiOff, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { dictionaries, SupportedLang } from '@/lib/i18n';
import { queueOfflineMutation, processSyncQueue } from '@/lib/offline/sync-engine';

export default function MandalDashboard() {
  const [lang, setLang] = useState<SupportedLang>('mr');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'reports'>('overview');

  const t = dictionaries[lang];

  // Demo active metrics state
  const [summary, setSummary] = useState({
    festivalName: 'गणेशोत्सव २०२६',
    totalIncome: 151116,
    totalExpense: 72450,
    netBalance: 78666,
    cash: 25000,
    bank: 45000,
    upi: 8666,
  });

  const [transactions, setTransactions] = useState([
    { id: '1', name: 'राहुल शिंदे', type: 'INCOME', amount: 501, category: 'वर्गणी', method: 'CASH', time: '१० मिनिटांपूर्वी' },
    { id: '2', name: 'प्रिया देशमुख', type: 'INCOME', amount: 1101, category: 'देणगी', method: 'UPI', time: '२५ मिनिटांपूर्वी' },
    { id: '3', name: 'श्री डेकोरेशन', type: 'EXPENSE', amount: 1200, category: 'मंडप सजावट', method: 'CASH', time: '१ तासापूर्वी' },
    { id: '4', name: 'अमित पाटील', type: 'INCOME', amount: 2500, category: 'विशेष देणगी', method: 'BANK', time: '२ तासांपूर्वी' },
  ]);

  // Fast Form State for 15-second mobile collection
  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('वर्गणी (Vargani)');
  const [payMethod, setPayMethod] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); processSyncQueue(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleQuickIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !donorName) return;

    const numAmount = parseFloat(amount);
    const newTx = {
      id: crypto.randomUUID(),
      name: donorName,
      type: 'INCOME' as const,
      amount: numAmount,
      category,
      method: payMethod,
      time: 'आत्ताच'
    };

    // Optimistic UI update
    setTransactions([newTx, ...transactions]);
    setSummary(prev => ({
      ...prev,
      totalIncome: prev.totalIncome + numAmount,
      netBalance: prev.netBalance + numAmount,
      cash: payMethod === 'CASH' ? prev.cash + numAmount : prev.cash,
      upi: payMethod === 'UPI' ? prev.upi + numAmount : prev.upi,
      bank: payMethod === 'BANK' ? prev.bank + numAmount : prev.bank,
    }));

    // Queue mutation offline/online
    await queueOfflineMutation('INCOME', {
      mandalId: 'mandal-1',
      festivalId: 'fest-2026',
      categoryId: 'cat-vargani',
      amount: numAmount,
      donorName,
      paymentMethod: payMethod,
      collectorId: 'user-admin'
    });

    setDonorName('');
    setAmount('');
    setShowIncomeModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-8 font-sans antialiased">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              म
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                शिवशक्ती गणेश मंडळ
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                {summary.festivalName}
              </span>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            {(['mr', 'hi', 'en'] as SupportedLang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md transition-all ${lang === l ? 'bg-white shadow-xs text-orange-600' : 'text-slate-600'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Offline Status Warning Bar */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>{t.offlineBadge}</span>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Main Net Balance Hero Card */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm font-medium text-slate-500">{t.totalBalance}</span>
              <div className="text-4xl font-extrabold tracking-tight text-slate-900 mt-1">
                ₹{summary.netBalance.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
              हिशोब सुरक्षित
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.totalIncome}</p>
                <p className="text-lg font-bold text-emerald-600">₹{summary.totalIncome.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.totalExpense}</p>
                <p className="text-lg font-bold text-rose-600">₹{summary.totalExpense.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Account Split Breakdown (Cash / Bank / UPI) */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">{t.cash}</span>
            <p className="text-base font-bold text-slate-800 mt-0.5">₹{summary.cash.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">{t.bank}</span>
            <p className="text-base font-bold text-slate-800 mt-0.5">₹{summary.bank.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">{t.upi}</span>
            <p className="text-base font-bold text-slate-800 mt-0.5">₹{summary.upi.toLocaleString('en-IN')}</p>
          </div>
        </section>

        {/* Primary Action Buttons */}
        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowIncomeModal(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm transition active:scale-98"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{t.addIncome}</span>
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm transition active:scale-98"
          >
            <MinusCircle className="w-5 h-5" />
            <span>{t.addExpense}</span>
          </button>
        </section>

        {/* Recent Transactions List */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-800 text-base">{t.recentTransactions}</h2>
            <button className="text-xs font-semibold text-orange-600 hover:underline">सर्व पहा</button>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{tx.name}</p>
                  <p className="text-xs text-slate-500">{tx.category} • <span className="uppercase font-mono">{tx.method}</span></p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400">{tx.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 15-Second Fast Vargani Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">{t.addIncome}</h3>
              <button onClick={() => setShowIncomeModal(false)} className="text-slate-400 font-bold text-xl px-2">✕</button>
            </div>

            <form onSubmit={handleQuickIncomeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.amount} *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-lg">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    autoFocus
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="501"
                    className="w-full pl-8 pr-4 py-2.5 text-xl font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.donorName} *</label>
                <input
                  type="text"
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="उदा. राहुल शांताराम पाटील"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.paymentMethod}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'UPI', 'BANK'] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPayMethod(method)}
                      className={`py-2 rounded-lg text-xs font-bold border transition ${
                        payMethod === method
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition active:scale-98 mt-2"
              >
                {t.saveAndGenerateReceipt}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Floating Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 py-2 px-6 flex justify-around items-center md:hidden shadow-lg">
        <button className="flex flex-col items-center gap-1 text-orange-600">
          <div className="w-5 h-5 font-bold">🏠</div>
          <span className="text-[10px] font-bold">{t.dashboard}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <QrCode className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t.receipts}</span>
        </button>
        <button onClick={() => setShowIncomeModal(true)} className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center -mt-5 shadow-lg border-4 border-white">
          <PlusCircle className="w-6 h-6" />
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t.doorToDoor}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t.reports}</span>
        </button>
      </nav>
    </div>
  );
}
