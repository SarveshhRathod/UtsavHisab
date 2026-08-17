'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, PhoneCall, Plus } from 'lucide-react';

export default function DoorToDoorCollectionPage() {
  const [households, setHouseholds] = useState([
    { id: '1', houseNo: '१०१', family: 'पाटील कुटुंब', phone: '9822011111', target: 501, collected: 501, status: 'COLLECTED' },
    { id: '2', houseNo: '१०२', family: 'देशमुख कुटुंब', phone: '9822022222', target: 1001, collected: 500, status: 'PARTIAL' },
    { id: '3', houseNo: '१०३', family: 'शिंदे निवास', phone: '9822033333', target: 501, collected: 0, status: 'PENDING' },
    { id: '4', houseNo: '१०४', family: 'जोशी निवास', phone: '9822044444', target: 501, collected: 0, status: 'PENDING' }
  ]);

  const markCollected = (id: string, amount: number) => {
    setHouseholds(households.map(h => h.id === id ? { ...h, collected: amount, status: 'COLLECTED' } : h));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">घरोघरी वर्गणी वाटप व नोंद</h1>
          <p className="text-xs text-slate-500">वॉर्ड क्र. ३ - शिवाजी चौक लेन</p>
        </div>
        <span className="text-xs bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full">
          ४ पैकी १ पूर्ण
        </span>
      </div>

      <div className="grid gap-3">
        {households.map((h) => (
          <div key={h.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm bg-slate-100 px-2 py-0.5 rounded text-slate-700">{h.houseNo}</span>
                <span className="font-semibold text-slate-800 text-sm">{h.family}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">अपेक्षित: ₹{h.target} | जमा: <span className="font-bold text-emerald-600">₹{h.collected}</span></p>
            </div>

            <div className="flex items-center gap-2">
              {h.status === 'COLLECTED' ? (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> पावती झाली
                </span>
              ) : (
                <button
                  onClick={() => markCollected(h.id, h.target)}
                  className="text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg shadow-2xs"
                >
                  ₹{h.target} जमा करा
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
