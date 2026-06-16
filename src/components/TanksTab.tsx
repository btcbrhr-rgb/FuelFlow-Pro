/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, X, PlusCircle } from 'lucide-react';
import { DatabaseState, FuelTank } from '../types';
import { generateNextId } from '../utils/id';

interface TanksTabProps {
  db: DatabaseState;
  onAddTank: (tank: FuelTank) => void;
  onDeleteTank: (id: string) => void;
  showToast: (title: string, message: string, type?: 'success' | 'danger' | 'info') => void;
}

export default function TanksTab({ db, onAddTank, onDeleteTank, showToast }: TanksTabProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newFuelType, setNewFuelType] = useState('');
  const [newCapacity, setNewCapacity] = useState<number>(40000);
  const [newInitial, setNewInitial] = useState<number>(15000);
  const [newThreshold, setNewThreshold] = useState<number>(5000);

  // Filter fuel tanks (exclude cash cards)
  const fuelTanks = db.tanks.filter(
    (t) => 
      !t.fuelType.includes('บัตร') && 
      !t.fuelType.includes('วงเงิน') && 
      !t.fuelType.includes('บัตรเงินสด')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim()) {
      showToast("ข้อผิดพลาด", "กรุณาระบุชื่อถังจัดเก็บน้ำมันดีเซล", "danger");
      return;
    }

    if (!newFuelType) {
      showToast("ข้อผิดพลาด", "กรุณาเลือกประเภทเชื้อเพลิงจัดเก็บ", "danger");
      return;
    }

    if (newInitial > newCapacity) {
      showToast("ความจุไม่ถูกต้อง", "ปริมาณน้ำมันเริ่มต้นห้ามมากกว่าพิกัดบรรจุสูงสุดของถัง", "danger");
      return;
    }

    const existingIds = db.tanks.map(t => t.id);
    const newId = generateNextId("TANK-", existingIds, 2);

    const newTank: FuelTank = {
      id: newId,
      name: newName,
      fuelType: newFuelType,
      capacity: newCapacity,
      currentLevel: newInitial,
      minThreshold: newThreshold,
      basePrice: newFuelType === 'แก๊สโซฮอล์ 95' ? 36.80 : 32.50,
      unit: "ลิตร"
    };

    onAddTank(newTank);
    setModalOpen(false);
    showToast("สร้างถังพักสัญญาสัญญาดีเซลสำเร็จ", `เพิ่มสถานีถังและเริ่มระบุประวัติติดตามคลัง "${newName}"`, "success");

    // Clear settings
    setNewName('');
    setNewFuelType('');
    setNewCapacity(40000);
    setNewInitial(15050);
    setNewThreshold(5000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm md:text-base">
            การตั้งค่าถังพักสถานีสำรองน้ำมันดีเซล (หน่วย: ลิตร)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            สืบค้นข้อมูล กำหนดพิกัดปริมาณความจุจำกัดสูงสุด และระดับแจ้งเตือนภัยเพื่อควบคุมสต๊อกคงคลังดีเซลในงานก่อสร้างหลัก
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มถังพักดีเซลใหม่</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fuelTanks.map((tank) => {
          const isCritical = tank.currentLevel <= tank.minThreshold;
          const percentage = Math.round((tank.currentLevel / tank.capacity) * 100);

          return (
            <div
              key={tank.id}
              className={`bg-white p-6 rounded-2xl border ${
                isCritical ? 'border-rose-300 shadow-md shadow-rose-50/50' : 'border-slate-200'
              } space-y-4 shadow-sm flex flex-col justify-between`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    tank.fuelType === 'แก๊สโซฮอล์ 95' ? 'bg-orange-100 text-orange-850 text-orange-750' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {tank.fuelType}
                  </span>
                  <h4 className="font-bold text-slate-800 text-xs mt-2 leading-snug">{tank.name}</h4>
                </div>
                <button
                  onClick={() => onDeleteTank(tank.id)}
                  className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-all cursor-pointer"
                  title="ลบถังเก็บดีเซลนี้"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-650 text-slate-600">
                  <span>พิกัดสูงสุด: {tank.capacity.toLocaleString('th-TH')} ลิตร</span>
                  <span>ยอดคลังคงเหลือ: {percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${isCritical ? 'bg-rose-500' : 'bg-emerald-500'} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50 text-[10px] sm:text-[11px] font-semibold text-slate-500">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">ยอดคงเหลือสุทธิ</span>
                  <span className="font-extrabold text-slate-855 text-slate-800 text-xs mt-0.5 block">
                    {tank.currentLevel.toLocaleString('th-TH')} ลิตร
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">ระดับจุดแจ้งเตือนภัย</span>
                  <span className="font-extrabold text-rose-555 text-rose-500 text-xs mt-0.5 block">
                    ต่ำกว่า {tank.minThreshold.toLocaleString('th-TH')} ลิตร
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                <span>ลงทะเบียนถังพักน้ำมันดีเซลใหม่</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อถังพักคลังน้ำมันดีเซล *</label>
                <input
                  type="text"
                  placeholder="เช่น ถังดีเซล แคมป์วิศวกรรมปราสาท"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทเชื้อเพลิงจัดเก็บ *</label>
                <select
                  value={newFuelType}
                  onChange={(e) => setNewFuelType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-semibold"
                  required
                >
                  <option value="">กรุณาเลือกประเภทเชื้อเพลิง</option>
                  <option value="น้ำมันดีเซล">น้ำมันดีเซล (Diesel B7/B10/B20)</option>
                  <option value="แก๊สโซฮอล์ 95">แก๊สโซฮอล์ 95 (Gasohol 95)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">พิกัดบรรจุสูงสุด (ลิตร) *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">ปริมาตรดีเซลตั้งต้น (ลิตร)</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">เกณฑ์ระดับกังวลเตือนภัยขั้นต่ำ (ลิตร) *</label>
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
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  บันทึกสร้างคลังดีเซล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
