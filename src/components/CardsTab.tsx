/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, X, PlusCircle, CreditCard as CardIcon } from 'lucide-react';
import { DatabaseState, FuelTank } from '../types';
import { generateNextId } from '../utils/id';

interface CardsTabProps {
  db: DatabaseState;
  onAddCard: (card: FuelTank) => void;
  onDeleteCard: (id: string) => void;
  showToast: (title: string, message: string, type?: 'success' | 'danger' | 'info') => void;
}

export default function CardsTab({ db, onAddCard, onDeleteCard, showToast }: CardsTabProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState<number>(100000);
  const [newInitial, setNewInitial] = useState<number>(45000);
  const [newThreshold, setNewThreshold] = useState<number>(10000);

  // Filter credit/cash cards
  const cashCards = db.tanks.filter(
    (t) => 
      t.fuelType.includes('บัตร') || 
      t.fuelType.includes('วงเงิน') || 
      t.fuelType.includes('บัตรเงินสด')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim()) {
      showToast("ข้อผิดพลาด", "กรุณาระบุเลขทะเบียนหรือชื่อบัญชีบัตรเงินสด", "danger");
      return;
    }

    if (newInitial > newCapacity) {
      showToast("วงเงินขัดแย้ง", "จำนวนงบประมาณเริ่มต้นห้ามเกินวงเงินสูงสุดของบัตรเครดิต", "danger");
      return;
    }

    const existingIds = db.tanks.map(t => t.id);
    const newId = generateNextId("CARD-", existingIds, 2);

    const newCard: FuelTank = {
      id: newId,
      name: newName,
      fuelType: "บัตรเงินสด",
      capacity: newCapacity,
      currentLevel: newInitial,
      minThreshold: newThreshold,
      basePrice: 1.00,
      unit: "บาท"
    };

    onAddCard(newCard);
    setModalOpen(false);
    showToast("เปิดใช้งานบัตรสำเร็จแล้ว", `ผูกบัญชีอ้างอิงและเปิดสิทธิ์ระบบบัตร "${newName}"`, "success");

    // Clear setters
    setNewName('');
    setNewCapacity(100000);
    setNewInitial(45050);
    setNewThreshold(10000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm md:text-base">
            การตั้งค่าบัญชีบัตรเงินสดสำรองจัดซื้อน้ำมัน (หน่วย: บาท)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            สืบค้นข้อมูล กำหนดพิกัดระดับวงเงินรวม และเกณฑ์การเตือนกระชับความปลอดภัยทางการเงินในระบบเครดิต/บัตรเงินสดองค์กร
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มทะเบียนบัตรเงินสดใหม่</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cashCards.map((card) => {
          const isCritical = card.currentLevel <= card.minThreshold;
          const percentage = Math.round((card.currentLevel / card.capacity) * 100);

          return (
            <div
              key={card.id}
              className={`bg-white p-6 rounded-2xl border ${
                isCritical ? 'border-rose-300 shadow-md shadow-rose-50/50' : 'border-slate-200'
              } space-y-4 shadow-sm flex flex-col justify-between`}
            >
              {/* Premium Card Display mockup */}
              <div className="bg-gradient-to-br from-indigo-900 to-indigo-750 from-indigo-900 to-indigo-700 p-4.5 p-4 rounded-xl text-white relative overflow-hidden flex flex-col justify-between h-36 border border-white/10 shadow-md">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full transform translate-x-1/3 -translate-y-1/3"></div>
                
                <div className="flex items-start justify-between z-10">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">FuelFlow PPT Card</span>
                    <h5 className="font-bold text-slate-50 text-[11px] leading-tight mt-1 truncate max-w-[155px]" title={card.name}>
                      {card.name}
                    </h5>
                  </div>
                  <CardIcon className="w-6 h-6 text-white/45 flex-shrink-0" />
                </div>

                <div className="z-10">
                  <div className="text-[8px] font-bold text-indigo-350 text-indigo-200 uppercase tracking-wider">คงเหลือปัจจุบัน</div>
                  <div className="font-extrabold text-white text-lg font-mono">
                    ฿{card.currentLevel.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[8px] text-white/60 font-medium z-10 pt-2 border-t border-white/10">
                  <span>วงเงินสูงสุด: ฿{card.capacity.toLocaleString('th-TH')}</span>
                  <span className={`${isCritical ? 'text-red-300 font-bold' : ''}`}>เตือนภัยต่ำกว่า: ฿{card.minThreshold.toLocaleString('th-TH')}</span>
                </div>
              </div>

              {/* Progress and Deletion capabilities */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-650 text-slate-605">
                  <span className="text-slate-500">อัตราการใช้วงเงิน:</span>
                  <span className="font-mono text-slate-705 text-slate-700">{percentage}% คงเหลือ</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${isCritical ? 'bg-rose-500' : 'bg-indigo-650 bg-indigo-600'} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold">การควบคุมวงเงินออฟไลน์</span>
                <button
                  onClick={() => onDeleteCard(card.id)}
                  className="p-1 text-slate-405 text-slate-400 hover:text-rose-505 hover:text-rose-500 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบบัตร</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-indigo-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                <span>ลงทะเบียนเชื่อมต่อบัตรเครดิต/เงินสดใหม่</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อบัญชีบัตร / เลขบัตรเครดิตองค์กร *</label>
                <input
                  type="text"
                  placeholder="เช่น บัตร PPT 0011-3321-789 (กองปราสาท)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ปริมาตรรันสูงสุดวงเงิน (บาท) *</label>
                  <input
                    type="number"
                    min="1"
                    value={newCapacity || ''}
                    onChange={(e) => setNewCapacity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-855 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ยอดเงินงบประมาณเริ่มต้น (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={newInitial || ''}
                    onChange={(e) => setNewInitial(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-855 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ขีดเกณฑ์เกณฑ์เตือนงบยอดต่ำเตือนภัย (บาท) *</label>
                <input
                  type="number"
                  min="1"
                  value={newThreshold || ''}
                  onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-855 font-mono"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  เปิดสิทธิ์ระบบบัตร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
