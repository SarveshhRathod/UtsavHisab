import React from 'react';
import { notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { Share2, Download, CheckCircle2 } from 'lucide-react';

const prisma = new PrismaClient();

interface ReceiptPageProps {
  params: { token: string };
}

export default async function PublicReceiptPage({ params }: ReceiptPageProps) {
  const receipt = await prisma.receipt.findUnique({
    where: { shareToken: params.token },
    include: {
      income: {
        include: {
          category: true,
          collector: { select: { name: true } }
        }
      },
      festival: {
        include: { mandal: true }
      }
    }
  });

  if (!receipt) {
    notFound();
  }

  const mandal = receipt.festival.mandal;
  const income = receipt.income;
  const whatsappShareText = encodeURI(
    `*${mandal.name}*\n${receipt.festival.name}\n\n` +
    `पावती क्र: ${receipt.receiptNumber}\n` +
    `देणगीदार: ${receipt.donorName}\n` +
    `रक्कम: ₹${Number(receipt.amount).toLocaleString('en-IN')}\n` +
    `पेमेंट पद्धत: ${income.paymentMethod}\n\n` +
    `आपली डिजिटल पावती येथे पहा:\n` +
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://mandalsetu.com'}/r/${receipt.shareToken}\n\n` +
    `श्रींच्या चरणी सादर अर्पण. धन्यवाद!`
  );

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Receipt Header */}
        <div className="bg-orange-600 text-white p-6 text-center relative">
          <div className="inline-flex p-2 bg-white/10 rounded-full mb-2">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">{mandal.name}</h1>
          <p className="text-xs text-orange-100 mt-1">{mandal.address}, {mandal.city} - {mandal.pincode}</p>
          <div className="mt-3 inline-block bg-orange-700/80 px-3 py-1 rounded-full text-xs font-semibold">
            {receipt.festival.name}
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">पावती क्रमांक</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{receipt.receiptNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block font-medium">दिनांक</span>
              <span className="font-semibold text-slate-800">{new Date(receipt.issuedAt).toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
            <div>
              <span className="text-xs text-slate-500 font-medium">देणगीदाराचे नाव / Donor</span>
              <p className="text-base font-bold text-slate-900">{receipt.donorName}</p>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200/60">
              <div>
                <span className="text-xs text-slate-500 font-medium">वर्गवारी / Head</span>
                <p className="text-sm font-semibold text-slate-800">{income.category.name}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium">माध्यम</span>
                <p className="text-xs font-bold uppercase text-slate-800 bg-slate-200 px-2 py-0.5 rounded-md mt-0.5">
                  {income.paymentMethod}
                </p>
              </div>
            </div>
          </div>

          {/* Amount Badge */}
          <div className="text-center py-4 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">प्राप्त रक्कम</span>
            <div className="text-3xl font-extrabold text-emerald-700 mt-0.5">
              ₹{Number(receipt.amount).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-emerald-900/80 font-medium mt-1 px-4">{receipt.amountInWords}</p>
          </div>

          <div className="text-center text-[11px] text-slate-400">
            जमाकर्ता: <span className="font-semibold text-slate-600">{income.collector.name}</span>
          </div>

          {/* WhatsApp Action Button */}
          <div className="space-y-2 pt-2">
            <a
              href={`https://api.whatsapp.com/send?text=${whatsappShareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-3.5 px-4 rounded-xl shadow-sm transition"
            >
              <Share2 className="w-5 h-5" />
              <span>व्हॉट्सअ‍ॅपवर पावती शेअर करा</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
