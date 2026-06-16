/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LogOut, LogIn, Info, CheckCircle2, PlusCircle, ChevronDown, Search } from 'lucide-react';
import { DatabaseState, FuelTank, Transaction } from '../types';
import { generateNextId } from '../utils/id';

interface SearchOption {
  value: string;
  label: string;
  sublabel?: string;
  onSelectExtra?: () => void;
}

interface SearchableInputProps {
  value: string;
  onChange: (val: string) => void;
  options: (string | SearchOption)[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

function SearchableInput({
  value,
  onChange,
  options,
  placeholder = '',
  required = false,
  className = '',
}: SearchableInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const normalizedOptions: SearchOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const filtered = normalizedOptions.filter((opt) => {
    const searchStr = value.toLowerCase();
    return (
      opt.value.toLowerCase().includes(searchStr) ||
      opt.label.toLowerCase().includes(searchStr) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchStr))
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectOption = (opt: SearchOption) => {
    onChange(opt.value);
    if (opt.onSelectExtra) {
      opt.onSelectExtra();
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`${className} pr-10`}
          required={required}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-50">
          {filtered.map((opt, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectOption(opt);
              }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`px-4 py-2.5 text-xs text-left cursor-pointer transition-colors flex flex-col gap-0.5 ${
                idx === highlightedIndex
                  ? 'bg-slate-50 text-slate-900'
                  : 'text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between font-extrabold">
                <span className="text-slate-800">{opt.label}</span>
                {opt.sublabel && (
                  <span className="text-[10px] text-indigo-500 font-semibold">{opt.sublabel}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TransactionsTabProps {
  db: DatabaseState;
  onAddTransaction: (newTx: Transaction, updatedTankLevel: number) => void;
  showToast: (title: string, message: string, type?: 'success' | 'danger' | 'info') => void;
  quickDispenseActive: boolean;
  onResetQuickDispense: () => void;
  mode: 'dispense' | 'refill';
}

export default function TransactionsTab({
  db,
  onAddTransaction,
  showToast,
  quickDispenseActive,
  onResetQuickDispense,
  mode,
}: TransactionsTabProps) {
  const formType = mode;

  // React on quick-dispense trigger
  useEffect(() => {
    if (quickDispenseActive) {
      onResetQuickDispense();
    }
  }, [quickDispenseActive]);

  // FORM STATS - DISPENSE
  const [dispenseDate, setDispenseDate] = useState('');
  const [dispenseTime, setDispenseTime] = useState('');
  const [dispenseTankId, setDispenseTankId] = useState('');
  const [dispensePrice, setDispensePrice] = useState(0);
  const [dispenseAmount, setDispenseAmount] = useState(0);
  const [dispenseProject, setDispenseProject] = useState('');
  const [dispenseDriver, setDispenseDriver] = useState('');
  const [dispensePlate, setDispensePlate] = useState('');
  const [dispenseRecorder, setDispenseRecorder] = useState('');
  const [dispenseAuditor, setDispenseAuditor] = useState('');
  const [dispenseNotes, setDispenseNotes] = useState('');

  // FORM STATS - REFILL
  const [refillDate, setRefillDate] = useState('');
  const [refillMerchant, setRefillMerchant] = useState('');
  const [refillProject, setRefillProject] = useState('');
  const [refillTankId, setRefillTankId] = useState('');
  const [refillPrice, setRefillPrice] = useState(0);
  const [refillAmount, setRefillAmount] = useState(0);
  const [refillInvoice, setRefillInvoice] = useState('');
  const [refillRecorder, setRefillRecorder] = useState('');
  const [refillAuditor, setRefillAuditor] = useState('');
  const [refillNotes, setRefillNotes] = useState('');

  // ATTACHMENTS STATE
  const [dispenseFileUrl, setDispenseFileUrl] = useState('');
  const [dispenseFileName, setDispenseFileName] = useState('');
  const [refillFileUrl, setRefillFileUrl] = useState('');
  const [refillFileName, setRefillFileName] = useState('');

  const handleDispenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("ไฟล์มีขนาดเกินกำหนด", "กรุณาเลือกไฟล์แนบที่มีขนาดไม่เกิน 2MB เพื่อป้องกันบราวเซอร์รับส่งข้อมูลล่าช้า", "danger");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDispenseFileUrl(reader.result as string);
        setDispenseFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefillFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("ไฟล์มีขนาดเกินกำหนด", "กรุณาเลือกไฟล์แนบที่มีขนาดไม่เกิน 2MB เพื่อป้องกันบราวเซอร์รับส่งข้อมูลล่าช้า", "danger");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefillFileUrl(reader.result as string);
        setRefillFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  // Initial Form setters
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);
    setDispenseDate(today);
    setDispenseTime(nowTime);
    setRefillDate(today);

    // Default to empty for select items so user needs to select
    setDispenseTankId('');
    setDispensePrice(0);
    setRefillTankId('');
    setRefillPrice(0);
    setDispenseProject('');
    setRefillProject('');
  }, [db.tanks, db.projects]);

  // Handle selected tank changes in dispense form
  const selectedDispenseTank = db.tanks.find(t => t.id === dispenseTankId);
  const selectedRefillTank = db.tanks.find(t => t.id === refillTankId);

  // Autocomplete dropdown option builders
  const vehicleOptions = db.vehicles.map(v => ({
    value: v.plateNo,
    label: v.plateNo,
    sublabel: `${v.model ? `${v.model} ` : ''}${v.driver ? `(พนักงาน: ${v.driver})` : ''}`,
    onSelectExtra: () => {
      if (v.driver) {
        setDispenseDriver(v.driver);
      }
    }
  }));

  const existingTxPlates = Array.from(new Set(db.transactions.map(t => t.plateNo).filter(Boolean)));
  const extraPlates = existingTxPlates.filter(plate => !db.vehicles.some(v => v.plateNo === plate));
  const plateOptions = [
    ...vehicleOptions,
    ...extraPlates.map(p => ({
      value: p,
      label: p,
      sublabel: 'จากประวัติการทำงาน'
    }))
  ];

  const uniqueDriversList = Array.from(
    new Set([
      ...db.vehicles.map(v => v.driver).filter(Boolean),
      ...db.transactions.map(t => t.driverName).filter(Boolean),
      ...(db.requests || []).map(r => r.requester).filter(Boolean)
    ])
  );
  const driverOptions = uniqueDriversList.map(d => {
    const regularVehicle = db.vehicles.find(v => v.driver === d);
    return {
      value: d,
      label: d,
      sublabel: regularVehicle ? `รถหลัก: ${regularVehicle.plateNo}` : 'พนักงานขับรถ'
    };
  });

  const uniqueSuppliersList = Array.from(
    new Set([
      ...db.transactions.map(t => t.supplier).filter(Boolean),
      ...(db.requests || []).map(r => r.supplier).filter(Boolean)
    ])
  );
  const supplierOptions = uniqueSuppliersList.map(s => ({
    value: s,
    label: s,
    sublabel: 'ผู้จัดจำหน่าย/คู่สัญญาเดิม'
  }));

  const handleDispenseTankChange = (tankId: string) => {
    setDispenseTankId(tankId);
    const tank = db.tanks.find(t => t.id === tankId);
    if (tank) {
      setDispensePrice(tank.basePrice);
    }
  };

  const handleRefillTankChange = (tankId: string) => {
    setRefillTankId(tankId);
    const tank = db.tanks.find(t => t.id === tankId);
    if (tank) {
      setRefillPrice(tank.basePrice);
    }
  };

  const dispenseTotal = dispenseAmount * dispensePrice;
  const refillTotal = refillAmount * refillPrice;

  const handleDispenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDispenseTank) {
      showToast("ข้อผิดพลาด", "กรุณาเลือกคลังเก็บน้ำมัน/บัตร", "danger");
      return;
    }

    if (!dispenseProject) {
      showToast("ข้อผิดพลาด", "กรุณาเลือกโครงการปลายทาง", "danger");
      return;
    }

    if (dispenseAmount <= 0) {
      showToast("ข้อผิดพลาด", "กรุณากรอกจำนวนเบิกใช้งานให้ถูกต้อง", "danger");
      return;
    }

    if (dispenseAmount > selectedDispenseTank.currentLevel) {
      showToast(
        "ไม่สามารถจ่ายได้", 
        `จำนวนเบิก (${dispenseAmount.toLocaleString('th-TH')} ${selectedDispenseTank.unit}) เกินวงเงิน/ปริมาณคงคลังที่มี (${selectedDispenseTank.currentLevel.toLocaleString('th-TH')} ${selectedDispenseTank.unit})`, 
        "danger"
      );
      return;
    }

    // Prepare subtraction
    const updatedLevel = parseFloat((selectedDispenseTank.currentLevel - dispenseAmount).toFixed(2));

    const existingIds = db.transactions.map(t => t.id);
    const newId = generateNextId("TX-OUT-", existingIds, 4);

    const newTx: Transaction = {
      id: newId,
      type: "OUT",
      timestamp: `${dispenseDate}T${dispenseTime}:00`,
      tankId: dispenseTankId,
      category: selectedDispenseTank.fuelType,
      unit: selectedDispenseTank.unit,
      amount: dispenseAmount,
      costPerLiter: dispensePrice,
      totalValue: dispenseTotal,
      project: dispenseProject,
      driverName: dispenseDriver,
      plateNo: dispensePlate,
      recorder: dispenseRecorder,
      auditor: dispenseAuditor,
      notes: dispenseNotes,
      attachmentUrl: dispenseFileUrl || undefined,
      attachmentName: dispenseFileName || undefined
    };

    onAddTransaction(newTx, updatedLevel);
    showToast("สำเร็จ", `เบิกจ่ายสต๊อก ${dispenseAmount.toLocaleString('th-TH')} ${selectedDispenseTank.unit} ปลายทางไซต์งานสำเร็จ`, "success");

    // Clear form states
    setDispenseAmount(0);
    setDispenseDriver('');
    setDispensePlate('');
    setDispenseNotes('');
    setDispenseRecorder('');
    setDispenseAuditor('');
    setDispenseFileUrl('');
    setDispenseFileName('');
  };

  const handleRefillSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRefillTank) {
      showToast("ข้อผิดพลาด", "กรุณาเลือกคลังสินค้าจัดเก็บปลายทาง", "danger");
      return;
    }

    if (!refillProject) {
      showToast("ข้อผิดพลาด", "กรุณาเลือกโครงการจัดหาแหล่งทุน", "danger");
      return;
    }

    if (refillAmount <= 0) {
      showToast("ข้อผิดพลาด", "กรุณากรอกปริมาณ/ยอดเงินนำเข้าให้ถูกต้อง", "danger");
      return;
    }

    if (selectedRefillTank.currentLevel + refillAmount > selectedRefillTank.capacity) {
      showToast(
        "ไม่สามารถนำเข้าได้", 
        `การเติมงบ/ปริมาณนี้จะส่งผลให้เกินความจุพิกัดสูงสุดของคลัง (${selectedRefillTank.capacity.toLocaleString('th-TH')} ${selectedRefillTank.unit})`, 
        "danger"
      );
      return;
    }

    // Prepare addition
    const updatedLevel = parseFloat((selectedRefillTank.currentLevel + refillAmount).toFixed(2));

    const existingIds = db.transactions.map(t => t.id);
    const newId = generateNextId("TX-IN-", existingIds, 4);

    const newTx: Transaction = {
      id: newId,
      type: "IN",
      timestamp: `${refillDate}T10:00:00`,
      tankId: refillTankId,
      category: selectedRefillTank.fuelType,
      unit: selectedRefillTank.unit,
      amount: refillAmount,
      costPerLiter: refillPrice,
      totalValue: refillTotal,
      supplier: refillMerchant,
      project: refillProject,
      invoice: refillInvoice,
      poNo: refillInvoice, // align po with invoice
      deliveryPlace: "สำนักงานหลัก / ไซต์ระบุ",
      recorder: refillRecorder,
      auditor: refillAuditor,
      notes: refillNotes,
      attachmentUrl: refillFileUrl || undefined,
      attachmentName: refillFileName || undefined
    };

    onAddTransaction(newTx, updatedLevel);
    showToast("สำเร็จ", `บันทึกนำเข้าสะสมสต๊อกจำนวน ${refillAmount.toLocaleString('th-TH')} ${selectedRefillTank.unit} สำเร็จ`, "success");

    // Reset refill states
    setRefillAmount(0);
    setRefillMerchant('');
    setRefillInvoice('');
    setRefillNotes('');
    setRefillRecorder('');
    setRefillAuditor('');
    setRefillFileUrl('');
    setRefillFileName('');
    setRefillNotes('');
    setRefillRecorder('');
    setRefillAuditor('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Visual distinctive title header */}
      {formType === 'dispense' ? (
        <div className="flex items-center gap-3.5 px-6 py-5 bg-slate-50 border-b border-slate-100">
          <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shadow-rose-500/10 flex-shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-none">บันทึกเบิกจ่ายออก (OUT)</h3>
            <p className="text-[10px] md:text-xs font-semibold tracking-wide text-rose-600 mt-1.5">
              ตัดปริมาณสต๊อกน้ำมันดีเซลในถังพัก หรือ หักวงเงินเบิกบัตรเครดิตดีเซลรายวัน
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 px-6 py-5 bg-slate-50 border-b border-slate-100">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/10 flex-shrink-0">
            <LogIn className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-none">บันทึกรับเข้าน้ำมัน / เติมเงินคลัง (IN)</h3>
            <p className="text-[10px] md:text-xs font-semibold tracking-wide text-emerald-600 mt-1.5">
              บันทึกโหลดน้ำมันรับเข้าถังเก็บ หรือ เติมเงินเครดิตสำรองเข้าบัญชีบัตรเงินสดองค์กร
            </p>
          </div>
        </div>
      )}

      {/* RENDER FORM: DISPENSE OIL */}
      {formType === 'dispense' && (
        <div id="form-section-dispense" className="p-5 md:p-8 space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-650 text-slate-600 leading-relaxed">
              <strong>ระเบียบการเบิกจ่าย:</strong> โปรดตรวจสอบ ยอดคงเหลือพร้อมใช้ ของแต่ละสถานีถังและวงเงินบัตรดีเซล PPT บัญชีก่อนกดยื่นบันทึก ระบบจะหักลบและตัดยอดสะสมคงคลังโดยอัตโนมัติ ติดตามทะเบียนและคนขับทุกครั้ง
            </p>
          </div>

          <form onSubmit={handleDispenseSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Core Logistics specifications */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-rose-700 border-l-2 border-rose-500 pl-2 uppercase tracking-wide">
                  ข้อมูลการตัดจ่ายหลัก (Core Outbound)
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">วันที่ทำรายการเบิกจ่าย *</label>
                  <input
                    type="date"
                    value={dispenseDate}
                    onChange={(e) => setDispenseDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">เวลาที่เบิกจ่ายสะสม *</label>
                  <input
                    type="time"
                    value={dispenseTime}
                    onChange={(e) => setDispenseTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">คลังสินค้าที่จะตัดจ่าย (ถังดีเซล / บัตร) *</label>
                  <select
                    value={dispenseTankId}
                    onChange={(e) => handleDispenseTankChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-bold"
                    required
                  >
                    <option value="">กรุณาเลือกคลังสินค้าตัดจ่าย</option>
                    {db.tanks.map((tank) => (
                      <option key={tank.id} value={tank.id}>
                        {tank.name} (คงคลัง: {tank.currentLevel.toLocaleString('th-TH')} {tank.unit})
                      </option>
                    ))}
                  </select>
                  {selectedDispenseTank && (
                    <p className="text-[10px] mt-1.5 text-slate-500">
                      ยอดคงเหลือปัจจุบัน: <span className="font-extrabold text-slate-800">{selectedDispenseTank.currentLevel.toLocaleString('th-TH')} {selectedDispenseTank.unit}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Units and calculations */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-rose-700 border-l-2 border-rose-500 pl-2 uppercase tracking-wide">
                  การคำนวณราคาและหน่วยนับ (Calculations)
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {selectedDispenseTank && selectedDispenseTank.fuelType === 'บัตรเงินสด' 
                      ? 'มูลค่าเทียบเงินบาท (อ้างอิง) *' 
                      : 'ราคาน้ำมันดีเซลต่อหน่วย (บาท) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={dispensePrice}
                    onChange={(e) => setDispensePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">หน่วยวัดปริมาณ</label>
                  <input
                    type="text"
                    value={selectedDispenseTank?.unit || "หน่วย"}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 text-xs font-bold"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {selectedDispenseTank && selectedDispenseTank.fuelType === 'บัตรเงินสด' 
                      ? 'จำนวนยอดเงินที่ต้องการรูดเบิกจ่าย (บาท) *' 
                      : 'จำนวนปริมาตรดีเซลที่เติมเบิกจ่าย (ลิตร) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={dispenseAmount || ''}
                    placeholder="ระบุจำนวนตัวเลข"
                    onChange={(e) => setDispenseAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-mono"
                    required
                  />
                </div>

                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex justify-between items-center transition-all">
                  <span className="text-[10px] font-bold text-rose-800 uppercase">ประมาณการคำนวณรวมสุทธิ:</span>
                  <span className="text-base font-black text-rose-700 font-mono">
                    {dispenseTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>
              </div>

              {/* Drivers, audits, destinations */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-rose-700 border-l-2 border-rose-500 pl-2 uppercase tracking-wide">
                  ไซต์ปลายทางและพยานหลักฐาน (Audit Specs)
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">โครงการ / แท่นไซต์งานก่อสร้างปลายทาง *</label>
                  <select
                    value={dispenseProject}
                    onChange={(e) => setDispenseProject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-bold"
                    required
                  >
                    <option value="">กรุณาเลือกโครงการปลายทาง</option>
                    {db.projects.map((proj) => (
                      <option key={proj} value={proj}>{proj}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">พนักงานขับรถ / ผู้เบิกสิทธิ์ *</label>
                    <SearchableInput
                      value={dispenseDriver}
                      onChange={setDispenseDriver}
                      options={driverOptions}
                      placeholder="ระบุชื่อคนเบิก"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ทะเบียนรถ / รหัสเครื่องจักร *</label>
                    <SearchableInput
                      value={dispensePlate}
                      onChange={setDispensePlate}
                      options={plateOptions}
                      placeholder="เช่น ขก-9821 หรือ CAT3"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-semibold"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">พนักงานผู้ลงบันทึก *</label>
                    <input
                      type="text"
                      placeholder="ลงชื่อผู้บันทึก"
                      value={dispenseRecorder}
                      onChange={(e) => setDispenseRecorder(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ผู้ตรวจสอบบิล / นายพลาธิการ *</label>
                    <input
                      type="text"
                      placeholder="คนรับผิดชอบตรวจ"
                      value={dispenseAuditor}
                      onChange={(e) => setDispenseAuditor(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">หมายเหตุสำคัญประกอบการเบิกคลังเพิ่มเติม</label>
                <textarea
                  rows={4}
                  placeholder="เช่น เลขมาตรวัดระยะทางของหัวฉีด, เลขไมล์รถคันที่เบิกจ่าย หรือข้อมูลหน้างานที่จำเป็น..."
                  value={dispenseNotes}
                  onChange={(e) => setDispenseNotes(e.target.value)}
                  className="w-full h-[104px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                ></textarea>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">แนบเอกสารใบเสร็จ / ภาพถ่ายประกอบการเบิกจ่าย</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50/80 rounded-2xl p-4 transition-all relative flex flex-col justify-center items-center group min-h-[104px]">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleDispenseFileChange}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    id="dispense-attachment-input"
                  />
                  {dispenseFileUrl ? (
                    <div className="w-full flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-rose-100 z-20">
                      <div className="flex items-center gap-2 min-w-0">
                        {dispenseFileUrl.startsWith('data:image/') ? (
                          <img
                            src={dispenseFileUrl}
                            alt="Preview"
                            className="w-8 h-8 rounded object-cover border border-slate-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-extrabold text-[9px] flex-shrink-0">
                            PDF
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]" title={dispenseFileName}>
                            {dispenseFileName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">อัปโหลดเรียบร้อย</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setDispenseFileUrl('');
                          setDispenseFileName('');
                        }}
                        className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold border border-rose-100 transition-colors z-30"
                      >
                        ลบออก
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-1">
                      <div className="mx-auto w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 group-hover:scale-105 transition-transform mb-1">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">คลิกหรือวาง ภาพบิล / ใบสลิปหน้างาน</p>
                      <p className="text-[9px] text-slate-400 font-semibold">รูปภาพ (JPG, PNG) หรือเอกสาร PDF ไม่เกิน 2MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live Draft Preview Slip */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 space-y-3.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  📁 พรีวิวใบสำคัญบันทึกเบิกจ่ายคลัง (Live Transaction Voucher Preview)
                </span>
                <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-250 text-rose-700 text-[8px] font-black rounded uppercase">
                  มติเบิกจ่ายถอน (OUT)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">สถานีดึงยอดคลัง</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedDispenseTank ? selectedDispenseTank.name : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">โครงการแท่นขุด/สายหน้างาน</span>
                  <span className="font-bold text-slate-850 text-indigo-700">
                    {dispenseProject || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">ปริมาตรดีเซล/มูลค่าเบิก</span>
                  <span className="font-black text-rose-600">
                    {dispenseAmount.toLocaleString('th-TH')} {selectedDispenseTank?.unit || "หน่วย"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">ขีดอัตราราคากลางต่อหน่วย</span>
                  <span className="font-mono font-bold text-slate-600">
                    ฿{dispensePrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">พนักงานผู้ควบคุมขับ/ผู้เบิกใช้</span>
                  <span className="font-extrabold text-slate-800">{dispenseDriver || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">ทะเบียน/ระบบงานพลาธิการ</span>
                  <span className="font-mono font-black text-slate-800">{dispensePlate || '-'}</span>
                </div>
                <div className="col-span-2 border-t border-slate-100 pt-2 grid grid-cols-2">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">พนักงานผู้คีย์ดราฟต์</span>
                    <span className="text-[11px] font-bold text-slate-700">{dispenseRecorder || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">ผู้สอบทานบิลหลัก</span>
                    <span className="text-[11px] font-bold text-slate-700">{dispenseAuditor || '-'}</span>
                  </div>
                </div>

                {dispenseFileUrl && (
                  <div className="col-span-2 border-t border-slate-100 pt-2 flex items-center gap-2 bg-rose-50/50 p-2 rounded-xl border border-rose-100/50">
                    <span className="text-[9px] text-rose-800 font-extrabold uppercase shrink-0">หลักฐานแนบ:</span>
                    {dispenseFileUrl.startsWith('data:image/') ? (
                      <img src={dispenseFileUrl} alt="Attached Preview" className="w-8 h-8 rounded border border-slate-200 object-cover shrink-0" />
                    ) : (
                      <span className="p-1 px-1.5 bg-rose-100 border border-rose-200 text-rose-700 text-[8px] font-black rounded shrink-0">PDF</span>
                    )}
                    <span className="text-[10px] text-slate-600 font-bold truncate flex-1">{dispenseFileName}</span>
                  </div>
                )}

                <div className="col-span-2 border-t border-slate-100 pt-2.5 flex justify-between items-center text-xs font-black bg-white p-2.5 rounded-xl border border-rose-100 shadow-sm">
                  <span className="text-rose-800">คำนวณมูลค่ารวมทั้งสิ้นทางบัญชี:</span>
                  <span className="text-rose-750 font-mono text-sm font-black text-rose-700">
                    ฿{dispenseTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-850 transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ยืนยันบันทึกหักสต๊อก/ตัดยอดบัญชีด่วน</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RENDER FORM: REFILL OIL */}
      {formType === 'refill' && (
        <div id="form-section-refill" className="p-5 md:p-8 space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-550 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-650 text-slate-600 leading-relaxed">
              <strong>การบันทึกฝากเงิน / รับเข้าดีเวลคลังหลัก:</strong> ใช้กรณีปั๊มซัพพลายเออร์ขนถ่ายน้ำมันดีเซลมาเติมสำรองถังพัก หรือแผนกพลาธิการรับมอบทำจ่ายสำรองฝากเครดิตงบประมาณเข้าบัตรเติมน้ำมันองค์กร
            </p>
          </div>

          <form onSubmit={handleRefillSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Refill Suppliers */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-700 border-l-2 border-emerald-500 pl-2 uppercase tracking-wide">
                  ข้อมูลการรับเข้าหลัก (Purchases)
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">วันที่ได้รับ/เติมสำรองคลัง *</label>
                  <input
                    type="date"
                    value={refillDate}
                    onChange={(e) => setRefillDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ร้านค้า / ซัพพลายเออร์ปั๊มคู่สัญญา *</label>
                  <SearchableInput
                    value={refillMerchant}
                    onChange={setRefillMerchant}
                    options={supplierOptions}
                    placeholder="เช่น หจก. ปราสาท พลังงาน"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">โครงการจัดหา/แหล่งงบประมาณจัดซื้อ *</label>
                  <select
                    value={refillProject}
                    onChange={(e) => setRefillProject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold"
                    required
                  >
                    <option value="">กรุณาเลือกโครงการจัดซื้อจัดหา</option>
                    {db.projects.map((proj) => (
                      <option key={proj} value={proj}>{proj}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* refill numbers & scales */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-700 border-l-2 border-emerald-500 pl-2 uppercase tracking-wide">
                  ปริมาณรับเข้าและมูลค่างวด (Quantities & Values)
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">คลังปลายทางที่น้ำมัน/งบประมาณเข้า *</label>
                  <select
                    value={refillTankId}
                    onChange={(e) => handleRefillTankChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold"
                    required
                  >
                    <option value="">กรุณาเลือกคลังสินค้าจัดเก็บปลายทาง</option>
                    {db.tanks.map((tank) => (
                      <option key={tank.id} value={tank.id}>
                        {tank.name} (คงคลัง: {tank.currentLevel.toLocaleString('th-TH')} / {tank.capacity.toLocaleString('th-TH')} {tank.unit})
                      </option>
                    ))}
                  </select>
                  {selectedRefillTank && (
                    <p className="text-[10px] mt-1.5 text-slate-500">
                      พิกัดบรรจุเพิ่มเติมได้สูงสุด: <span className="font-extrabold text-slate-800">{(selectedRefillTank.capacity - selectedRefillTank.currentLevel).toLocaleString('th-TH')} {selectedRefillTank.unit}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">หมวดสินค้าหลัก</label>
                    <input
                      type="text"
                      value={selectedRefillTank?.fuelType || 'ดีเซล'}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 text-xs font-bold"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">หน่วยวัด</label>
                    <input
                      type="text"
                      value={selectedRefillTank?.unit || 'ลิตร'}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 text-xs font-bold"
                      readOnly
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ราคาประเมิน/หน่วย *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={refillPrice}
                      onChange={(e) => setRefillPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {selectedRefillTank && selectedRefillTank.fuelType === 'บัตรเงินสด' 
                        ? 'ยอดเงินสำรองเติมเข้า (บาท) *' 
                        : 'จำนวนดีเซลอดเติมกลับ (ลิตร) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={refillAmount || ''}
                      placeholder="ระบุปริมาตรสินค้าที่เติม"
                      onChange={(e) => setRefillAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase text-slate-750">ยอดงบประมาณจัดซื้อรวม:</span>
                  <span className="text-base font-black text-emerald-700 font-mono">
                    {refillTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>
              </div>

              {/* Auditors and delivery references */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-700 border-l-2 border-emerald-500 pl-2 uppercase tracking-wide">
                  เอกสารอ้างอิงและผู้คีย์ (References)
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">เลขใบชำระเงินโอน / เลขใบสั่งซื้อ PO *</label>
                  <input
                    type="text"
                    placeholder="เช่น PO-68001 หรือ SL-9811"
                    value={refillInvoice}
                    onChange={(e) => setRefillInvoice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">พนักงานผู้บันทึกระบบ *</label>
                    <input
                      type="text"
                      placeholder="ลงชื่อผู้แจ้ง"
                      value={refillRecorder}
                      onChange={(e) => setRefillRecorder(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">พนักงานผู้ลงนามตรวจคลัง *</label>
                    <input
                      type="text"
                      placeholder="คนเช็กปริมาตรสต๊อก"
                      value={refillAuditor}
                      onChange={(e) => setRefillAuditor(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">คำอธิบาย/หมายเหตุกิจกรรมนำส่งล็อตสำรองเพิ่มเติม</label>
                <textarea
                  rows={4}
                  placeholder="ระบุข้อมูลที่จำเป็น เช่น บัตรหักลบ, ขนส่งจากคลังที่สาขา เป็นต้น..."
                  value={refillNotes}
                  onChange={(e) => setRefillNotes(e.target.value)}
                  className="w-full h-[104px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                ></textarea>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">แนบเอกสารใบนำส่ง / สลิปโอนเงิน / ภาพถ่ายการเติมน้ำมัน</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50/80 rounded-2xl p-4 transition-all relative flex flex-col justify-center items-center group min-h-[104px]">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleRefillFileChange}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    id="refill-attachment-input"
                  />
                  {refillFileUrl ? (
                    <div className="w-full flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-emerald-100 z-20">
                      <div className="flex items-center gap-2 min-w-0">
                        {refillFileUrl.startsWith('data:image/') ? (
                          <img
                            src={refillFileUrl}
                            alt="Preview"
                            className="w-8 h-8 rounded object-cover border border-slate-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-extrabold text-[9px] flex-shrink-0">
                            PDF
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]" title={refillFileName}>
                            {refillFileName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">อัปโหลดเรียบร้อย</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setRefillFileUrl('');
                          setRefillFileName('');
                        }}
                        className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-105 transition-colors z-30 border-emerald-100"
                      >
                        ลบออก
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-1">
                      <div className="mx-auto w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 group-hover:scale-105 transition-transform mb-1">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">คลิกหรือวาง ภาพใบนำส่ง / สลิปโอน / บิลซื้อ</p>
                      <p className="text-[9px] text-slate-400 font-semibold">รูปภาพ (JPG, PNG) หรือเอกสาร PDF ไม่เกิน 2MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live Draft Preview Refill Slip */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 space-y-3.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  📄 พรีวิวใบสำคัญบันทึกรับเข้าคลังค้าง (Live Deposit Slip Preview)
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[8px] font-black rounded uppercase">
                  มติรับคลังเติมเดโป (IN)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">คลังเข้าหลัก/ถังเก็บพัก</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedRefillTank ? selectedRefillTank.name : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">งบจัดซื้อผ่านส่วนกลาง/โครงการ</span>
                  <span className="font-bold text-slate-850 text-indigo-700">
                    {refillProject || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">ปริมาณนำจ่ายสินค้าเข้า</span>
                  <span className="font-black text-emerald-600">
                    {refillAmount.toLocaleString('th-TH')} {selectedRefillTank?.unit || "หน่วย"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">ขีดอัตราราคากลางจัดหา</span>
                  <span className="font-bold text-slate-700">
                    ฿{refillPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">ใบส่งของ / Invoice / คู่สัญญา</span>
                  <span className="font-mono text-indigo-650 text-indigo-600 font-black">{refillInvoice || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">ร้านค้าซัพพลายเออร์ประมูล</span>
                  <span className="font-bold text-slate-800">{refillMerchant || '-'}</span>
                </div>
                <div className="col-span-2 border-t border-slate-100 pt-2 grid grid-cols-2">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">พนักงานผู้คีย์ดราฟต์</span>
                    <span className="text-[11px] font-bold text-slate-700">{refillRecorder || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">ผู้ควบคุมปั๊มเช็กสต๊อก</span>
                    <span className="text-[11px] font-bold text-slate-705 text-slate-700">{refillAuditor || '-'}</span>
                  </div>
                </div>

                {refillFileUrl && (
                  <div className="col-span-2 border-t border-slate-100 pt-2 flex items-center gap-2 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
                    <span className="text-[9px] text-emerald-800 font-extrabold uppercase shrink-0">หลักฐานแนบ:</span>
                    {refillFileUrl.startsWith('data:image/') ? (
                      <img src={refillFileUrl} alt="Attached Preview" className="w-8 h-8 rounded border border-slate-200 object-cover shrink-0" />
                    ) : (
                      <span className="p-1 px-1.5 bg-emerald-100 border border-emerald-200 text-emerald-700 text-[8px] font-black rounded shrink-0">PDF</span>
                    )}
                    <span className="text-[10px] text-slate-600 font-bold truncate flex-1">{refillFileName}</span>
                  </div>
                )}

                <div className="col-span-2 border-t border-slate-100 pt-2.5 flex justify-between items-center text-xs font-black bg-white p-2.5 rounded-xl border border-emerald-100 shadow-sm">
                  <span className="text-emerald-800">คำนวณมูลค่ารวมทั้งสิ้นทางบัญชี:</span>
                  <span className="text-emerald-700 font-mono text-sm font-black text-emerald-700">
                    ฿{refillTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>บันทึกนำคลังรับเข้าและเพิ่มปริมาณสต๊อกทันที</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
