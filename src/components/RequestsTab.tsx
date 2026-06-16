/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Trash2, CheckCircle2, XCircle, Clock, 
  PlusCircle, Filter, Calendar, User, DollarSign, 
  Building2, CreditCard, Database, FileText, Check, AlertTriangle, Eye, ShieldCheck, ArrowRight, Inbox
} from 'lucide-react';
import { DatabaseState, FuelTank, RequestDocument, Transaction } from '../types';
import { generateNextId } from '../utils/id';

interface RequestsTabProps {
  db: DatabaseState;
  onSaveDb: (updatedDb: DatabaseState) => void;
  showToast: (title: string, message: string, type?: 'success' | 'danger' | 'info') => void;
}

export default function RequestsTab({ db, onSaveDb, showToast }: RequestsTabProps) {
  // Mode selection & list states
  const [activeFormType, setActiveFormType] = useState<'FUEL_PURCHASE' | 'CARD_REFILL' | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FUEL_PURCHASE' | 'CARD_REFILL'>('ALL');

  // Approval/Rejection interactive local modal/panel states
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [processingActionType, setProcessingActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [approverName, setApproverName] = useState('');
  const [poNoValue, setPoNoValue] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  // Transaction Ledger formulation state
  const [realizingRequestId, setRealizingRequestId] = useState<string | null>(null);
  const [invoiceNoInput, setInvoiceNoInput] = useState('');
  const [deliveryPlaceInput, setDeliveryPlaceInput] = useState('');

  // Core Request Form state
  const [targetTankId, setTargetTankId] = useState('');
  const [targetCardId, setTargetCardId] = useState('');
  const [requestedAmount, setRequestedAmount] = useState<number | ''>('');
  const [estimatedUnitCost, setEstimatedUnitCost] = useState<number | ''>('');
  const [targetDateInput, setTargetDateInput] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplierInput, setSupplierInput] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [newProjectText, setNewProjectText] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requestNotes, setRequestNotes] = useState('');

  // Retrieve current active requests
  const requestsList = db.requests || [];

  // Filter lists
  const fuelTanks = db.tanks.filter(
    t => !t.fuelType.includes('บัตร') && !t.fuelType.includes('วงเงิน')
  );
  
  const cashCards = db.tanks.filter(
    t => t.fuelType.includes('บัตร') || t.fuelType.includes('วงเงิน')
  );

  // Filter requests according to filters
  const filteredRequests = requestsList.filter(req => {
    const matchStatus = statusFilter === 'ALL' ? true : req.status === statusFilter;
    const matchType = typeFilter === 'ALL' ? true : req.type === typeFilter;
    return matchStatus && matchType;
  });

  // Calculate automatic default price for selected tank
  const handleTankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTargetTankId(val);
    const tank = fuelTanks.find(t => t.id === val);
    if (tank) {
      setEstimatedUnitCost(tank.basePrice || 32);
    }
  };

  // Create Request form submit selector
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();

    if (!requesterName.trim()) {
      showToast("กรอกข้อมูลคลาดเคลื่อน", "กรุณาระบุชื่อผู้ยื่นเอกสาร/ขออนุมัติทำรายการ", "danger");
      return;
    }

    if (!requestedAmount || requestedAmount <= 0) {
      showToast("กรอกข้อมูลคลาดเคลื่อน", "ปริมาณ/จำนวนเงินที่ขอ จะต้องเป็นจำนวนมากกว่า 0", "danger");
      return;
    }

    // Determine final target project
    let finalProject = selectedProject;
    if (selectedProject === 'ADD_NEW' && newProjectText.trim()) {
      finalProject = newProjectText.trim();
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timestamp = `${todayStr}T12:00:00`;

    if (activeFormType === 'FUEL_PURCHASE') {
      if (!targetTankId) {
        showToast("กรอกข้อมูลคลาดเคลื่อน", "กรุณาระบุถังจัดเก็บปลายทางที่ต้องการสั่งน้ำมันมาเติม", "danger");
        return;
      }
      
      const pricePerL = estimatedUnitCost || 32;
      const totalCost = Number(requestedAmount) * Number(pricePerL);

      const existingIds = requestsList.map(r => r.id);
      const newId = generateNextId("RQ-PUR-", existingIds, 4);

      const newRequest: RequestDocument = {
        id: newId,
        type: 'FUEL_PURCHASE',
        timestamp,
        tankId: targetTankId,
        amount: Number(requestedAmount),
        costPerUnit: Number(pricePerL),
        totalValue: Number(totalCost.toFixed(2)),
        supplier: supplierInput.trim() || 'ผู้ค้าบริการทั่วไป',
        project: finalProject || 'ไม่ระบุโครงการ',
        requester: requesterName.trim(),
        status: 'PENDING',
        notes: requestNotes.trim() || 'ใบเสนอสั่งซื้อน้ำมันดีเซลประจำรอบการทำงาน',
        targetDate: targetDateInput
      };

      const updatedRequests = [newRequest, ...requestsList];
      const updatedProjects = [...db.projects];
      if (selectedProject === 'ADD_NEW' && newProjectText.trim() && !updatedProjects.includes(newProjectText.trim())) {
        updatedProjects.push(newProjectText.trim());
      }

      onSaveDb({
        ...db,
        projects: updatedProjects,
        requests: updatedRequests
      });

      showToast("ส่งคำขออนุมัติสำเร็จ", `สร้างคำขอจัดซื้อน้ำมันดิบใบที่ ${newId} ปริมาณ ${requestedAmount.toLocaleString()} ลิตร เข้าสู่ระเบียบรอดำเนินการ`, "success");
      resetForm();

    } else if (activeFormType === 'CARD_REFILL') {
      if (!targetCardId) {
        showToast("กรอกข้อมูลคลาดเคลื่อน", "กรุณาระบุบัตรเติมเงินสดข้าคลังที่ต้องการเติมเงินสิทธิ์", "danger");
        return;
      }

      const existingIds = requestsList.map(r => r.id);
      const newId = generateNextId("RQ-CRD-", existingIds, 4);

      const newRequest: RequestDocument = {
        id: newId,
        type: 'CARD_REFILL',
        timestamp,
        tankId: targetCardId,
        amount: Number(requestedAmount),
        totalValue: Number(requestedAmount),
        project: finalProject || 'ไม่ระบุโครงการ',
        requester: requesterName.trim(),
        status: 'PENDING',
        notes: requestNotes.trim() || 'คำขอโอนเงินสมทบ/เติมเงินเข้าบัตรเงินสดปลายทางเพื่อเดินระบบภาคสนาม',
        targetDate: targetDateInput
      };

      const updatedRequests = [newRequest, ...requestsList];
      const updatedProjects = [...db.projects];
      if (selectedProject === 'ADD_NEW' && newProjectText.trim() && !updatedProjects.includes(newProjectText.trim())) {
        updatedProjects.push(newProjectText.trim());
      }

      onSaveDb({
        ...db,
        projects: updatedProjects,
        requests: updatedRequests
      });

      showToast("ส่งคำขออนุมัติสำเร็จ", `ส่งแบบฟอร์มขอเบิกเติมเงินเข้าบัตร เลขใบขออนุมัติ ${newId} ยอดเงิน ฿${requestedAmount.toLocaleString()} บาท เรียบร้อย`, "success");
      resetForm();
    }
  };

  const resetForm = () => {
    setActiveFormType(null);
    setTargetTankId('');
    setTargetCardId('');
    setRequestedAmount('');
    setEstimatedUnitCost('');
    setTargetDateInput(new Date().toISOString().split('T')[0]);
    setSupplierInput('');
    setSelectedProject('');
    setNewProjectText('');
    setRequesterName('');
    setRequestNotes('');
  };

  // Open general action panel (Approve/Reject dialog)
  const openActionPanel = (reqId: string, action: 'APPROVE' | 'REJECT') => {
    setProcessingRequestId(reqId);
    setProcessingActionType(action);
    setApproverName('');
    setPoNoValue(`PO-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
    setActionNotes('');
  };

  const handleExecuteAction = () => {
    if (!processingRequestId || !processingActionType) return;

    if (!approverName.trim()) {
      showToast("ข้อมูลไม่ครบถ้วน", "กรุณาระบุชื่อผู้อนุมัติ/ผู้ตรวจสอบ เพื่อบันทึกเข้าประวัติ", "danger");
      return;
    }

    const updatedRequests = requestsList.map(req => {
      if (req.id === processingRequestId) {
        return {
          ...req,
          status: processingActionType === 'APPROVE' ? 'APPROVED' as const : 'REJECTED' as const,
          approver: approverName.trim(),
          poNo: processingActionType === 'APPROVE' ? poNoValue.trim() : undefined,
          approvalNotes: actionNotes.trim() || (processingActionType === 'APPROVE' ? 'อนุมัติวงเงินจัดหาแล้วประมวลผลด่วน' : 'ปฏิเสธคำร้อง เนื่องจากข้อมูลผิดพลาดหรือวงเงินสะสมเต็ม'),
          approvalDate: new Date().toISOString().split('T')[0]
        };
      }
      return req;
    });

    onSaveDb({
      ...db,
      requests: updatedRequests
    });

    showToast(
      processingActionType === 'APPROVE' ? "อนุมัติสำเร็จ" : "ปฏิเสธสำเร็จ", 
      `แบบคำร้องเลขที่ ${processingRequestId} ได้รับการตรวจสอบประสานงาน เรียบร้อย`, 
      processingActionType === 'APPROVE' ? "success" : "info"
    );

    setProcessingRequestId(null);
    setProcessingActionType(null);
  };

  // Realize an approved request into a real inventory transaction
  const handleRealizeToLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!realizingRequestId) return;

    const request = requestsList.find(r => r.id === realizingRequestId);
    if (!request || request.status !== 'APPROVED') return;

    const targetTank = db.tanks.find(t => t.id === request.tankId);
    if (!targetTank) {
      showToast("ระบบขัดข้อง", "ไม่พบข้อมูลถังเก็บน้ำมันหรือบัตรเงินสดที่จับคู่ไว้ในระบบระบบหลัก", "danger");
      return;
    }

    // Process update on the Tank Capacity currentLevel
    const updatedLevel = parseFloat((targetTank.currentLevel + request.amount).toFixed(2));
    const updatedTanks = db.tanks.map(t => {
      if (t.id === targetTank.id) {
        return { ...t, currentLevel: updatedLevel };
      }
      return t;
    });

    // Formulate a transaction entry
    const newTxId = generateNextId(request.type === 'FUEL_PURCHASE' ? "TX-IN-" : "TX-IN-", db.transactions.map(t => t.id), 4);
    const todayTimestamp = `${new Date().toISOString().split('T')[0]}T${new Date().toLocaleTimeString('th-TH').substr(0, 5)}:00`;

    const newTransaction: Transaction = {
      id: newTxId,
      type: "IN",
      timestamp: todayTimestamp,
      tankId: targetTank.id,
      category: request.type === 'FUEL_PURCHASE' ? "ดีเซล" : "บัตรเงินสด",
      unit: targetTank.unit || (request.type === 'FUEL_PURCHASE' ? "ลิตร" : "บาท"),
      amount: request.amount,
      costPerLiter: request.costPerUnit || 1,
      totalValue: request.totalValue,
      supplier: request.supplier || "รายการกึ่งอัตโนมัติคลาวด์",
      project: request.project,
      poNo: request.poNo || '',
      invoice: invoiceNoInput.trim() || 'IV-AUTO-FILL',
      deliveryPlace: deliveryPlaceInput.trim() || 'ณ คลังหลักหน้างาน',
      recorder: `ระบบจัดซื้อ : ${request.requester}`,
      auditor: request.approver || 'ระบบอัตโนมัติ',
      notes: `รายการรับเข้าคลังค้างจ่ายอ้างอิงใบคำขอส่งสินค้าอนุมัติ #${request.id}. ${request.notes}`,
      isVerified: true
    };

    // Set request as processed to lock duplicate actions
    const updatedRequests = requestsList.map(r => {
      if (r.id === realizingRequestId) {
        return { ...r, isProcessed: true };
      }
      return r;
    });

    onSaveDb({
      ...db,
      tanks: updatedTanks,
      transactions: [newTransaction, ...db.transactions],
      requests: updatedRequests
    });

    showToast(
      "บันทึกรับเข้าคลังสำเร็จ ⚡️", 
      `สร้างธุรกรรมรหัส ${newTxId} ยอดเติม ${request.amount.toLocaleString()} ${targetTank.unit} เพื่อปรับปรุงยอดสะสมในระบบและปฏิทินบัญชีแล้วค่ะ`, 
      "success"
    );

    setRealizingRequestId(null);
    setInvoiceNoInput('');
    setDeliveryPlaceInput('');
  };

  // Delete Request History
  const handleDeleteRequest = (id: string) => {
    const updatedRequests = requestsList.filter(r => r.id !== id);
    onSaveDb({
      ...db,
      requests: updatedRequests
    });
    showToast("สำเร็จ", `ลบข้อมูลใบอนุมัติ/คำสั่งหักบัญชีเลขที่ ${id} ออกจากประวัติระบบเรียบร้อย`, "success");
  };

  return (
    <div className="space-y-6">
      
      {/* Header card with Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 animate-pulse-subtle" />
            <span>ระบบคำร้องสั่งซื้อน้ำมันและขอเติมเงินบัตร</span>
          </h2>
          <p className="text-slate-500 text-xs leading-relaxed max-w-2xl">
            ระบบงานยื่นเรื่องจัดหาพลังงานและวงเงินภาคสนาม สำหรับคลังน้ำมันดีเซลโครงการหลักและบัตรเงินสดหน้างาน พร้อมตรวจสอบและอนุมัติใบสั่งซื้อเพื่อเข้ารายบัญชี
          </p>
        </div>

        {/* Action button creators */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => { resetForm(); setActiveFormType('FUEL_PURCHASE'); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white stroke-[3]" />
            <span>เขียนใบเสนอซื้อน้ำมัน (L)</span>
          </button>
          
          <button
            onClick={() => { resetForm(); setActiveFormType('CARD_REFILL'); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white stroke-[3]" />
            <span>ขออนุมัติเติมเงินเข้าบัตร (฿)</span>
          </button>
        </div>
      </div>

      {/* Grid Layout containing Form (if open) or overall info panels */}
      {activeFormType && (
        <form onSubmit={handleCreateRequest} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs md:text-sm font-extrabold text-indigo-650 flex items-center gap-1.5 text-indigo-600">
              {activeFormType === 'FUEL_PURCHASE' ? (
                <>
                  <Database className="w-4 h-4 text-indigo-500" />
                  <span>เขียนเอกสารยื่นเสนอสั่งน้ำมัน (Fuel Purchase Procurement)</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>แบบฟอร์มบันทึกเสนอโอนเติมวงเงินเข้าบัตรเงินสด</span>
                </>
              )}
            </h3>
            <button
              type="button"
              onClick={() => setActiveFormType(null)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Target Selectors */}
            {activeFormType === 'FUEL_PURCHASE' ? (
              <div className="space-y-1.5">
                <label className="text-slate-700 text-xs font-extrabold block">1. เลือกถังจัดเก็บปลายทาง</label>
                <select
                  required
                  value={targetTankId}
                  onChange={handleTankChange}
                  className="w-full bg-white text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">กรุณาเลือกถังคลังน้ำมันปลายทาง</option>
                  {fuelTanks.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (คงเหลือ: {t.currentLevel.toLocaleString()} /{t.capacity.toLocaleString()} ลิตร)</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-slate-700 text-xs font-extrabold block">1. เลือกบัตรเงินสดปลายทาง</label>
                <select
                  required
                  value={targetCardId}
                  onChange={(e) => setTargetCardId(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">กรุณาเลือกบัญชีบัตรเงินสดเป้าหมาย</option>
                  {cashCards.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (คงเหลือสิทธิ์: ฿{c.currentLevel.toLocaleString()})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount / Quantities */}
            <div className="space-y-1.5">
              <label className="text-slate-700 text-xs font-extrabold block">
                {activeFormType === 'FUEL_PURCHASE' ? '2. ปริมาณที่จัดสั่งจัดซื้อ (ลิตร)' : '2. จำนวนเงินขอขอสิทธิ์เติมทุน (บาท)'}
              </label>
              <div className="relative">
                <input
                  required
                  type="number"
                  placeholder={activeFormType === 'FUEL_PURCHASE' ? 'เช่น 15000' : 'เช่น 30000'}
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white text-slate-800 border border-slate-200 pl-8 pr-12 py-2.5 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150"
                />
                <span className="absolute left-2.5 top-3 text-slate-400">
                  {activeFormType === 'FUEL_PURCHASE' ? <Database className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                </span>
                <span className="absolute right-3 top-3 text-slate-500 font-extrabold text-[10px]">
                  {activeFormType === 'FUEL_PURCHASE' ? 'ลิตร' : 'บาท'}
                </span>
              </div>
            </div>

            {/* Price inputs (Only for fuel purchases) */}
            <div className="space-y-1.5">
              <label className="text-slate-700 text-xs font-extrabold block">
                {activeFormType === 'FUEL_PURCHASE' ? '3. ประมาณราคานำเสนอ (บาท/ลิตร)' : '3. กำหนดวันดำเนินการโอนเงิน'}
              </label>
              {activeFormType === 'FUEL_PURCHASE' ? (
                <div className="relative">
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="เช่น 32.50"
                    value={estimatedUnitCost}
                    onChange={(e) => setEstimatedUnitCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white text-slate-800 border border-slate-200 pl-8 pr-16 py-2.5 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150"
                  />
                  <span className="absolute left-2.5 top-3 text-slate-400">฿</span>
                  <span className="absolute right-3 top-3 text-slate-500 text-[10px] font-black">/ ลิตร</span>
                </div>
              ) : (
                <input
                  required
                  type="date"
                  value={targetDateInput}
                  onChange={(e) => setTargetDateInput(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-none"
                />
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-700 text-xs font-extrabold block">ชื่อผู้จัดเสนอ / ผู้ดําเนินการส่งคำอนุมัติ *</label>
              <input
                required
                type="text"
                placeholder="เช่น กิมจิ - ฝ่ายประสานคลัง หรือ วิศวกรคุมโครงการ"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 text-xs font-extrabold block">หมายเหตุเพิ่มเติม/จุดประสงค์ขออนุมัติจัดซื้อ</label>
              <input
                type="text"
                placeholder="ระบุวัตถุประสงค์เพื่อใช้อุปโภคโครงการหรือแจ้งแผนงานเพื่อประกอบการพิจารณา..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Realtime calculations banner */}
          {activeFormType === 'FUEL_PURCHASE' && requestedAmount !== '' && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-slate-750 rounded-xl text-xs flex justify-between items-center">
              <div>
                <span className="font-extrabold text-amber-800 mr-2">คำนวณราคาประมาณการ:</span>
                <span className="font-semibold text-slate-600">{requestedAmount.toLocaleString()} ลิตร x ฿{Number(estimatedUnitCost || 32).toFixed(2)} บาท/ลิตร</span>
              </div>
              <div className="font-extrabold text-amber-700 text-sm md:text-base font-mono">
                มูลค่ารวม: ฿{(Number(requestedAmount) * Number(estimatedUnitCost || 32)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {activeFormType === 'CARD_REFILL' && requestedAmount !== '' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-slate-750 rounded-xl text-xs flex justify-between items-center animate-pulse-subtle">
              <div>
                <span className="font-extrabold text-emerald-800 mr-2">ยอดเงินโอนสิทธิ์เติมบัตร:</span>
                <span className="font-semibold text-slate-600 font-sans font-medium">จำนวนสิทธิ์ที่ขอร่วมอนุมัติเข้าบัตร</span>
              </div>
              <div className="font-extrabold text-emerald-700 text-sm md:text-base font-mono">
                ฿{Number(requestedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </div>
            </div>
          )}

          {/* Form Action triggers */}
          <div className="flex justify-end gap-3.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer ${
                activeFormType === 'FUEL_PURCHASE' ? 'bg-indigo-600 text-white hover:bg-indigo-755' : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              ส่งคำขอด่วนเข้าสายอนุมัติ
            </button>
          </div>
        </form>
      )}

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        
        {/* Left selector info */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-slate-800 text-xs font-extrabold">ค้นหาและตัวกรองใบเอกสาร:</span>
        </div>

        {/* Filters and Search select tabs */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Status filters */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                statusFilter === 'PENDING' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-500 hover:text-indigo-600 font-semibold'
              }`}
            >
              รอดำเนินการ ({requestsList.filter(r => r.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                statusFilter === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-500 hover:text-indigo-600 font-semibold'
              }`}
            >
              อนุมัติแล้ว ({requestsList.filter(r => r.status === 'APPROVED').length})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                statusFilter === 'REJECTED' ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-500 hover:text-indigo-600 font-semibold'
              }`}
            >
              ปฏิเสธ ({requestsList.filter(r => r.status === 'REJECTED').length})
            </button>
          </div>

          {/* Type filters */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-indigo-600'
              }`}
            >
              ทุกหมวด
            </button>
            <button
              onClick={() => setTypeFilter('FUEL_PURCHASE')}
              className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                typeFilter === 'FUEL_PURCHASE' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-500 hover:text-indigo-600 font-semibold'
              }`}
            >
              จัดซื้อน้ำมัน
            </button>
            <button
              onClick={() => setTypeFilter('CARD_REFILL')}
              className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                typeFilter === 'CARD_REFILL' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-500 hover:text-indigo-600 font-semibold'
              }`}
            >
              เติมเงินบัตร
            </button>
          </div>

        </div>
      </div>

      {/* 1. APPROVE / REJECT MODALS */}
      {processingRequestId && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <AlertTriangle className={`w-5 h-5 ${processingActionType === 'APPROVE' ? 'text-emerald-500' : 'text-rose-500'}`} />
              <h3 className="text-sm font-extrabold text-slate-800">
                {processingActionType === 'APPROVE' ? 'อนุมัติคำร้องสั่งการวงเงินใบจัดซื้อ' : 'ปฏิเสธเอกสารคำขอด่วนปลายทาง'}
              </h3>
            </div>
            
            <p className="text-xs text-slate-550 leading-relaxed font-medium">
              กรุณากรอกผลข้อมูลของคณะกรรมการการตรวจสอบ เพื่อบันทึกจดบันทึกไว้ประกอบการสำรองและประมวลภาษีปลายทาง (อ้างอิงใบขอความเห็นชอบ #{processingRequestId})
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-700 text-xs font-extrabold block">ชื่อผู้ทำรายการอนุมัติ/ปฏิเสธ *</label>
                <input
                  required
                  type="text"
                  placeholder="เช่น ผจก. สมชัย สัมฤทธิ์เดช"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:border-indigo-505 focus:outline-none"
                />
              </div>

              {processingActionType === 'APPROVE' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-slate-700 text-xs font-extrabold block">ออกเลขที่ใบสั่งซื้อ (Purchase Order No.) *</label>
                  <input
                    required
                    type="text"
                    value={poNoValue}
                    onChange={(e) => setPoNoValue(e.target.value)}
                    className="w-full bg-white text-indigo-650 font-mono border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold block">ระบบสร้างเลขที่ใบสั่งซื้อเป็นรหัสชั่วคราวและแก้ปรับได้</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-700 text-xs font-extrabold block">ความคิดเห็น / หมายเหตุคำชี้แจงประกอบด่วน</label>
                <textarea
                  rows={2}
                  placeholder="ระบุความคิดเห็นประกอบการอนุมัติหรือเหตุผลที่ไม่ผ่านเกณฑ์..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 p-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setProcessingRequestId(null); setProcessingActionType(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className={`px-5 py-2 text-xs font-black rounded-xl cursor-pointer ${
                  processingActionType === 'APPROVE' 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xs' 
                    : 'bg-rose-600 hover:bg-rose-700 text-white hover:shadow-xs'
                }`}
              >
                {processingActionType === 'APPROVE' ? 'ประทับตราอนุมัติเรียบร้อย' : 'ยืนยันปฏิเสธคำขอนี้'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REALIZE TO TRANSACTIONS LEDGER MODAL */}
      {realizingRequestId && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleRealizeToLedger} className="bg-white p-6 rounded-2xl border border-slate-200 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
              <Database className="text-indigo-600 w-5 h-5" />
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1">
                <span>บันทึกน้ำมัน/เติมเงินสดจริงเข้าสายบัญชี Ledger (IN)</span>
              </h3>
            </div>

            {(() => {
              const req = requestsList.find(r => r.id === realizingRequestId);
              if (!req) return null;
              const tank = db.tanks.find(t => t.id === req.tankId);
              return (
                <div className="space-y-4 text-xs">
                  
                  {/* Detailed specs overview */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-slate-700">
                    <p className="font-bold flex justify-between">
                      <span className="text-slate-500 font-semibold">รหัสคำร้องอ้างอิง:</span>
                      <span className="text-slate-800 font-mono font-black">{req.id}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-semibold">ปลายทางคลัง:</span>
                      <span className="font-bold text-slate-800">{tank?.name} ({tank?.fuelType})</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-semibold">ปริมาณจัดสรร:</span>
                      <span className="font-black text-slate-800">{req.amount.toLocaleString()} {tank?.unit}</span>
                    </p>
                    {req.type === 'FUEL_PURCHASE' && (
                      <p className="flex justify-between">
                        <span className="text-slate-500 font-semibold">ราคาซื้อสำเร็จ:</span>
                        <span className="font-mono text-slate-800 font-bold">฿{req.costPerUnit?.toFixed(2)} บาท/ลิตร</span>
                      </p>
                    )}
                    <p className="flex justify-between border-t border-slate-200 pt-2 font-black text-emerald-700 text-sm">
                      <span className="text-xs text-slate-500 font-semibold">มูลค่ารวมจดบัญชี:</span>
                      <span>฿{req.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </p>
                  </div>

                  <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold">
                    ระบบจะทำการแทรกรายการบัญชี (IN) ลงในระบบ ledger ให้อัตโนมัติ พร้อมผูกมัด PO No <strong className="font-mono text-indigo-600 font-black">{req.poNo || 'ไม่มี'}</strong> และคำนวณปรับยอดปริมาณคงคลังให้อัตโนมัติในทันที กรุณากรอกรหัสเอกสารการส่งของเพื่อตรวจสอบ:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
                    <div className="space-y-1.5">
                      <label className="text-slate-700 text-[10px] font-extrabold block">เลขที่ใบส่งของ/ใบกำกับภาษี (Invoice) *</label>
                      <input
                        required
                        type="text"
                        placeholder="เช่น IV-96711/2026"
                        value={invoiceNoInput}
                        onChange={(e) => setInvoiceNoInput(e.target.value)}
                        className="w-full bg-white text-slate-850 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-slate-700 text-[10px] font-extrabold block">สถานที่จัดส่งสินค้า/ปั๊มต้นทาง *</label>
                      <input
                        required
                        type="text"
                        placeholder="เช่น แคมป์บ่อดินหลัก หรือ ณ แม่ข่ายคลัง"
                        value={deliveryPlaceInput}
                        onChange={(e) => setDeliveryPlaceInput(e.target.value)}
                        className="w-full bg-white text-slate-850 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2.5 border-t border-slate-100 font-semibold">
                    <button
                      type="button"
                      onClick={() => { setRealizingRequestId(null); }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>ยืนยันบันทึกเข้าระบบ Ledger</span>
                    </button>
                  </div>
                </div>
              );
            })()}

          </form>
        </div>
      )}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-4 shadow-xs">
            <Inbox className="w-12 h-12 mx-auto text-slate-300 animate-bounce" />
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-slate-700 text-sm">ไม่พบเอกสารใบคำร้องที่ค้นหาในขณะนี้</h4>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                ยังไม่มีข้อมูลเขียนเสนอจัดหาหรือขอวงเงินใดๆ ตรงกับเงื่อนไขของตัวกรองในปัจจุบัน คุณสามารถคลิกสร้างใบคำร้องด้านบนได้ในทันทีค่ะ
              </p>
            </div>
            <div className="flex justify-center gap-2.5 pt-2">
              <button
                onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); }}
                className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                ล้างตัวค้นหาทั้งหมด
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRequests.map((req) => {
              const targetEntity = db.tanks.find(t => t.id === req.tankId);
              const isPurchase = req.type === 'FUEL_PURCHASE';
              const isProcessed = req.isProcessed === true;

              return (
                <div 
                  key={req.id} 
                  className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:shadow-md duration-200 ${
                    req.status === 'PENDING' ? 'border-amber-300/65 shadow-amber-100/10' :
                    req.status === 'APPROVED' ? (isProcessed ? 'border-slate-150 opacity-90' : 'border-emerald-300/60 shadow-emerald-100/5') : 'border-rose-150'
                  }`}
                >
                  {/* Top line ID and Stamp */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-mono text-sm tracking-tight text-slate-800">{req.id}</span>
                        <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-lg ${
                          isPurchase ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/50' : 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                        }`}>
                          {isPurchase ? 'ขอสั่งซื้อน้ำมันดีเซล' : 'ขอเงินสิทธิ์เติมบัตร'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-450 flex items-center gap-1 font-semibold text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>สร้างคำร้องเมื่อ: {req.timestamp.replace('T', ' ')}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="text-right">
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-850 border border-amber-200 font-black text-[10px] rounded-lg">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin mr-1" />
                          <span>รอพิจารณา</span>
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[10px] rounded-lg">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 animate-none" />
                          <span>อนุมัติสั่งการแล้ว</span>
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 font-black text-[10px] rounded-lg">
                          <XCircle className="w-3 h-3 text-rose-550" />
                          <span>ปฏิเสธคำขอ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Core details body layout */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
                    
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">ถังจัดเก็บหรือบัตรเป้าหมาย:</span>
                        <span className="font-extrabold text-slate-700 flex items-center gap-1.5 mt-0.5">
                          {isPurchase ? <Database className="w-3.5 h-3.5 text-indigo-505" /> : <CreditCard className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{targetEntity?.name || 'ไม่พบเป้าหมาย'}</span>
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">ปริมาณ / วงเงินยื่นจัดหา:</span>
                        <span className="font-black text-slate-800 mt-0.5 block text-sm">
                          {isPurchase ? (
                            <span className="text-indigo-650 font-mono font-black">{req.amount.toLocaleString()} ลิตร</span>
                          ) : (
                            <span className="text-emerald-700 font-mono font-black">฿{req.amount.toLocaleString()} บาท</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">ผู้ขอคำสั่งซื้อ:</span>
                        <span className="font-bold text-slate-700 block">{req.requester}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">มูลค่าประมาณการ:</span>
                        <span className="font-extrabold text-slate-800 block">฿{req.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {isPurchase && req.supplier && (
                      <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-450 flex items-center gap-1 font-semibold text-slate-600">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>เสนอจัดหาจาก:</span>
                        <span className="font-extrabold text-slate-800">{req.supplier}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-450 font-semibold text-slate-600">
                      <div>
                        <span className="block text-slate-400 text-[9px] uppercase">ผูกบัญชีแคมป์งาน:</span>
                        <span className="font-bold text-slate-800 block">{req.project || 'ส่วนกลาง'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[9px] uppercase">กำหนดการจัดใช้จริง:</span>
                        <span className="font-bold text-slate-800 block font-mono">{req.targetDate || 'ไม่มีกำหนด'}</span>
                      </div>
                    </div>

                    {req.notes && (
                      <div className="border-t border-slate-200/50 pt-2 text-[11px] text-slate-500 italic font-medium leading-relaxed">
                        " {req.notes} "
                      </div>
                    )}
                  </div>

                  {/* Operational approval stamp historical details (if exists) */}
                  {req.status !== 'PENDING' && (
                    <div className={`p-4 rounded-xl text-xs space-y-1.5 border leading-relaxed ${
                      req.status === 'APPROVED' ? 'bg-emerald-50/40 border-emerald-100 text-slate-700' : 'bg-rose-50/40 border-rose-100 text-slate-700'
                    }`}>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <span>ข้อมูลผลเอกสารพิจารณา</span>
                        <span>{req.approvalDate}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-slate-600 font-bold">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500">พิจารณาโดย:</span>
                        <strong className="text-slate-850">{req.approver}</strong>
                        {req.status === 'APPROVED' && req.poNo && (
                          <span className="ml-auto bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg font-mono text-[9px] font-extrabold text-amber-800 animate-fade-in">
                            PO Code: {req.poNo}
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed font-semibold">
                        <span className="font-bold text-slate-500">หมายเหตุอนุมัติ:</span> "{req.approvalNotes || 'พิจารณาอนุมัติสั่งการสิทธิ์เรียบร้อย'}"
                      </p>
                    </div>
                  )}

                  {/* Flow Action Footers based on Status */}
                  <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between gap-2.5 font-semibold">
                    
                    {/* Delete button (only if PENDING to prevent historical logs distortion) */}
                    {req.status === 'PENDING' ? (
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl transition-all cursor-pointer"
                        title="ลบคำร้อง"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-550 flex items-center gap-1.5 italic font-bold">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3.5]" />
                        <span>เก็บประวัติถาวร (Ledgered)</span>
                      </span>
                    )}

                    <div className="flex items-center gap-3">
                      {req.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => openActionPanel(req.id, 'REJECT')}
                            className="px-3.5 py-1.5 hover:bg-slate-100 text-rose-700 hover:text-rose-800 border border-slate-200 text-xs font-black rounded-lg transition-colors cursor-pointer"
                          >
                            ปฏิเสธ
                          </button>
                          
                          <button
                            onClick={() => openActionPanel(req.id, 'APPROVE')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>อนุมัติสั่งการ</span>
                          </button>
                        </>
                      )}

                      {req.status === 'APPROVED' && !isProcessed && (
                        <button
                          onClick={() => {
                            setRealizingRequestId(req.id);
                            setInvoiceNoInput('');
                            setDeliveryPlaceInput('');
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shadow-amber-500/10 animate-pulse"
                        >
                          <PlusCircle className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                          <span>นำน้ำมัน/เงิน เข้าคลัง (IN) ↗</span>
                        </button>
                      )}

                      {isProcessed && (
                        <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-500 font-extrabold text-[10px] rounded-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>บันทึกจดลงสาย Ledger แล้ว</span>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
