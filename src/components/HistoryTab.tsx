/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, Download, Upload, Trash2, HelpCircle, CheckSquare, 
  Square, Eye, CheckCircle2, AlertCircle, Cloud, Check, CloudOff, Database, Paperclip
} from 'lucide-react';
import { DatabaseState, Transaction } from '../types';
import { generateNextId } from '../utils/id';

interface HistoryTabProps {
  db: DatabaseState;
  onDeleteTransaction: (id: string) => void;
  onImportTransactions: (importedTxs: Transaction[]) => void;
  onToggleVerifyTransaction: (id: string) => void;
  showToast: (title: string, message: string, type?: 'success' | 'danger' | 'info') => void;
  syncedTxIds: string[];
  googleAccessToken: string | null;
}

export default function HistoryTab({
  db,
  onDeleteTransaction,
  onImportTransactions,
  onToggleVerifyTransaction,
  showToast,
  syncedTxIds,
  googleAccessToken,
}: HistoryTabProps) {
  const [searchVal, setSearchVal] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [tankFilter, setTankFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterVerified, setFilterVerified] = useState<string>('ALL'); // 'ALL' | 'VERIFIED' | 'PENDING'
  const [selectedTxForAudit, setSelectedTxForAudit] = useState<any | null>(null);

  // Multi-attribute filter mechanism
  const processedTransactions = useMemo(() => {
    let list = db.transactions.map((tx) => {
      const tank = db.tanks.find((t) => t.id === tx.tankId);
      return {
        ...tx,
        tankName: tank ? tank.name : 'ไม่พบอ้างอิงคลัง',
        tankUnit: tank ? tank.unit : 'ลิตร',
      };
    });

    // Apply filters
    list = list.filter((tx) => {
      const criteria = [
        tx.driverName,
        tx.supplier,
        tx.plateNo,
        tx.project,
        tx.notes,
        tx.invoice,
        tx.poNo,
        tx.recorder,
        tx.auditor,
        tx.tankName,
      ].map((val) => (val || '').toLowerCase());

      const query = searchVal.toLowerCase();
      const matchesSearch = searchVal === '' || criteria.some((field) => field.includes(query));
      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
      const matchesTank = tankFilter === 'ALL' || tx.tankId === tankFilter;
      const matchesVerified = filterVerified === 'ALL' || 
                            (filterVerified === 'VERIFIED' && tx.isVerified) || 
                            (filterVerified === 'PENDING' && !tx.isVerified);

      return matchesSearch && matchesType && matchesTank && matchesVerified;
    });

    // Sort order
    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [db.transactions, db.tanks, searchVal, typeFilter, tankFilter, sortOrder, filterVerified]);

  // Master CSV Exporter with BOM
  const exportMasterCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";

    const headers = [
      "วัน-เวลาทำรายการ", "ประเภท", "ชื่อคลังสินค้า", "หมวดหมู่", "โครงการที่รับผิดชอบ",
      "ราคาต่อหน่วย(บาท)", "หน่วยนับ", "ปริมาณนำเข้า/รับ", "ปริมาณจ่ายออก/เบิก", "มูลค่าเงินรวมสุทธิ(บาท)",
      "ซัพพลายเออร์/ร้านค้า", "ผู้ใช้งาน/คนขับ", "ยานพาหนะ/เครื่องจักร", "ผู้ลงบันทึกระบบ", "ผู้ตรวจเอกสาร", "หมายเหตุสรุป"
    ];

    csvContent += headers.join(",") + "\n";

    db.transactions.forEach((tx) => {
      const dateStringVal = new Date(tx.timestamp).toLocaleString('th-TH');
      const tank = db.tanks.find((t) => t.id === tx.tankId) || { name: 'ไม่พบข้อมูลคลัง', unit: 'ลิตร', fuelType: 'ดีเซล' };

      const rowValues = [
        `"${dateStringVal}"`,
        `"${tx.type === 'IN' ? 'รับเข้า (IN)' : 'จ่ายออก (OUT)'}"`,
        `"${tank.name}"`,
        `"${tx.category || tank.fuelType}"`,
        `"${tx.project || '-'}"`,
        `"${tx.costPerLiter}"`,
        `"${tx.unit || tank.unit}"`,
        `"${tx.type === 'IN' ? tx.amount : '0'}"`,
        `"${tx.type === 'OUT' ? tx.amount : '0'}"`,
        `"${tx.totalValue}"`,
        `"${tx.supplier || '-'}"`,
        `"${tx.driverName || '-'}"`,
        `"${tx.plateNo || '-'}"`,
        `"${tx.recorder || '-'}"`,
        `"${tx.auditor || '-'}"`,
        `"${(tx.notes || '').replace(/[\r\n]+/g, ' ')}"`
      ];
      csvContent += rowValues.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `รายงานบัญชีรวมสต๊อกดีเซล_ส่งออก_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("ส่งออกบัญชีแล้ว", "ดาวน์โหลดตารางสรุปรายงานการบัญชีและธุรกรรมเสร็จเรียบร้อย", "success");
  };

  // Local CSV Importer Parser
  const convertBuddhYearToCE = (rawDate: string): string => {
    if (!rawDate) return new Date().toISOString().split('T')[0];
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      let year = parseInt(parts[0]);
      if (year > 2400) year -= 543; // Buddhist to CE converter
      return `${year}-${parts[1]}-${parts[2]}`;
    }
    return rawDate;
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/);
      if (lines.length < 2) {
        showToast("ไฟล์เปล่า", "ไม่พบแถวปริมาณแถวในไฟล์ CSV ประมวล", "danger");
        return;
      }

      // Safe splitter supporting quoted strings
      const splitLine = (row: string) => {
        const result: string[] = [];
        let curr = "";
        let quotes = false;
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
            quotes = !quotes;
          } else if (char === ',' && !quotes) {
            result.push(curr.trim());
            curr = "";
          } else {
            curr += char;
          }
        }
        result.push(curr.trim());
        return result;
      };

      const headerLine = splitLine(lines[0]);
      const newImportedTxs: Transaction[] = [];
      let successCount = 0;

      // Detect: REFILL INBOUND TEMPLATE
      if (headerLine.includes("วันที่รับ") || headerLine.includes("ร้านค้า") || headerLine.includes("จำนวนที่ซื้อ")) {
        for (let i = 1; i < lines.length; i++) {
          const rowText = lines[i];
          if (!rowText) continue;

          const cols = splitLine(rowText);
          if (cols.length < 5) continue;

          const dateStr = convertBuddhYearToCE(cols[headerLine.indexOf("วันที่รับ")]);
          const supplier = cols[headerLine.indexOf("ร้านค้า")];
          const tankName = cols[headerLine.indexOf("ชื่อสินค้า (คลัง)")] || cols[headerLine.indexOf("ชื่อสินค้า")] || 'น้ำมันดีเซล';
          const category = cols[headerLine.indexOf("หมวดหมู่")] || "น้ำมันดีเซล";
          const price = parseFloat(cols[headerLine.indexOf("ราคา")]) || 32.50;
          const amount = parseFloat(cols[headerLine.indexOf("จำนวนที่ซื้อ")]) || parseFloat(cols[headerLine.indexOf("จำนวนที่รับ")]) || 0;
          const totalValue = parseFloat(cols[headerLine.indexOf("มูลค่ารวม")]) || (price * amount);
          const project = cols[headerLine.indexOf("โครงการ")] || "ทั่วไป/สำรองส่วนกลาง";
          const poNo = cols[headerLine.indexOf("เลขที่ใบสั่งชื้อ (PO)")] || cols[headerLine.indexOf("PO")] || "";
          const invoiceStr = cols[headerLine.indexOf("เลขที่ใบส่งสินค้า")] || cols[headerLine.indexOf("สลิป")] || "PO-" + i;
          const notes = cols[headerLine.indexOf("หมายเหตุ")];

          if (isNaN(amount) || amount === 0) continue;

          // Find or assign tank targets dynamically
          let matchedTank = db.tanks.find(t => t.name === tankName);
          const tId = matchedTank ? matchedTank.id : 'tank-1'; // default helper fallback

          const collectedTxIds = [...db.transactions, ...newImportedTxs].map(t => t.id);
          const nextTxId = generateNextId("TX-IN-", collectedTxIds, 4);

          newImportedTxs.push({
            id: nextTxId,
            type: "IN",
            timestamp: `${dateStr}T08:00:00`,
            tankId: tId,
            category: category,
            unit: category.includes("บัตร") ? "บาท" : "ลิตร",
            amount: amount,
            costPerLiter: price,
            totalValue: totalValue,
            supplier: supplier,
            project: project,
            invoice: invoiceStr,
            poNo: poNo,
            recorder: "ไฟล์นำเข้าข้อมูลอัตโนมัติ",
            auditor: "ตรวจสอบบิลส่งแล้ว",
            notes: notes || "นำเข้าร่วมงวดสะสม",
          });
          successCount++;
        }
        showToast("นำเข้าข้อมูลสำเร็จ", `อัปเดตฐานบัญชีรับงวดสะสม ${successCount} รายการเรียบร้อย`, "success");
      }
      // Detect: DISPENSE OUTBOUND TEMPLATE
      else if (headerLine.includes("จำนวนที่จ่าย") || headerLine.includes("ผู้เบิก/คนขับ") || headerLine.includes("ทะเบียน")) {
        for (let i = 1; i < lines.length; i++) {
          const rowText = lines[i];
          if (!rowText) continue;

          const cols = splitLine(rowText);
          if (cols.length < 5) continue;

          const dateStr = convertBuddhYearToCE(cols[headerLine.indexOf("วันที่")]);
          const tankName = cols[headerLine.indexOf("ชื่อสินค้า (คลัง)")] || cols[headerLine.indexOf("ชื่อสินค้า")] || 'น้ำมันดีเซล';
          const price = parseFloat(cols[headerLine.indexOf("ราคา")]) || 32.50;
          const amount = parseFloat(cols[headerLine.indexOf("จำนวนที่จ่าย")]) || 0;
          const totalValue = parseFloat(cols[headerLine.indexOf("มูลค่ารวม")]) || (price * amount);
          const project = cols[headerLine.indexOf("โครงการ")] || "ทั่วไป/สำรองส่วนกลาง";
          const driver = cols[headerLine.indexOf("ผู้เบิก/คนขับ")] || "ไม่ระบุ";
          const plate = cols[headerLine.indexOf("ทะเบียน")] || "-";
          const notes = cols[headerLine.indexOf("หมายเหตุ")];

          if (isNaN(amount) || amount === 0) continue;

          let matchedTank = db.tanks.find(t => t.name === tankName);
          const tId = matchedTank ? matchedTank.id : 'tank-1';

          const collectedTxIds = [...db.transactions, ...newImportedTxs].map(t => t.id);
          const nextTxId = generateNextId("TX-OUT-", collectedTxIds, 4);

          newImportedTxs.push({
            id: nextTxId,
            type: "OUT",
            timestamp: `${dateStr}T14:30:00`,
            tankId: tId,
            category: tankName.includes("บัตร") ? "บัตรเงินสด" : "น้ำมันดีเซล",
            unit: tankName.includes("บัตร") ? "บาท" : "ลิตร",
            amount: amount,
            costPerLiter: price,
            totalValue: totalValue,
            project: project,
            driverName: driver,
            plateNo: plate,
            recorder: "ไฟล์นำเข้าข้อมูลอัตโนมัติ",
            auditor: "ตรวจสอบแล้ว",
            notes: notes || "การนำเข้าบัญชีหักลบ",
          });
          successCount++;
        }
        showToast("นำเข้าข้อมูลสำเร็จ", `หักลบบัญชีและติดตามรายการรวม ${successCount} รายการแล้ว`, "success");
      } else {
        showToast("รูปแบบโครงสร้างผิดพลาด", "กรุณาใช้รูปแบบคอลัมน์มาตรฐานสำหรับรับเข้าคลังหรือหักจ่าย", "danger");
        return;
      }

      if (newImportedTxs.length > 0) {
        onImportTransactions(newImportedTxs);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="space-y-6">

      {/* Control console wrapper */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-855 text-slate-800 text-sm md:text-base">ประวัติธุรกรรมคลังสินค้าและการจัดซื้อ</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              คีย์คำสืบค้น กรองสถิติแยกตามคลัง ตรวจสอบคนขับบิล และส่งออกหรือถ่ายสำเนาบัญชีรวม
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            
            {/* CSV Importer */}
            <label className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100/80 text-amber-800 text-xs font-bold rounded-xl cursor-pointer transition-colors duration-150 border border-amber-200">
              <Upload className="w-4 h-4 text-amber-700" />
              <span>นำเข้าประวัติจากไฟล์ (.CSV)</span>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleCSVImport} 
                className="hidden" 
              />
            </label>

            {/* CSV Exporter */}
            <button
              onClick={exportMasterCSV}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 text-xs font-bold rounded-xl transition-colors duration-150 cursor-pointer border border-emerald-250 border-emerald-200"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออกบัญชีแผงรวม (.CSV)</span>
            </button>
          </div>
        </div>

        {/* 5-Column quick logical filters */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              คำค้นหา (คนขับ/ทะเบียน/PO/สลิป/คีย์)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ป้อนคำสืบค้น..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              หมวดหมู่งวดรายการ
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-bold text-slate-800"
            >
              <option value="ALL">แสดงทั้งหมด (IN & OUT)</option>
              <option value="IN">เฉพาะรับเข้าคลัง / เติมเงิน (IN)</option>
              <option value="OUT">เฉพาะตัดจ่ายคลัง / เบิกใช้ (OUT)</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              จำแนกแยกสถานีคลัง
            </label>
            <select
              value={tankFilter}
              onChange={(e) => setTankFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-bold text-slate-800"
            >
              <option value="ALL">แสดงคลังน้ำมันทั้งหมด</option>
              {db.tanks.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              สถานะตรวจสอบเอกสาร
            </label>
            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-bold text-slate-800"
            >
              <option value="ALL">ทั้งหมด (ตรวจแล้ว & รอตรวจ)</option>
              <option value="VERIFIED">เฉพาะที่ตรวจผ่านแล้ว (✅)</option>
              <option value="PENDING">เฉพาะรอตรวจประสาน (⏳)</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              ลำดับเรียงตามงวดวัน
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-bold text-slate-800"
            >
              <option value="desc">ลงวันที่ล่าสุด ไปหาอดีต</option>
              <option value="asc">ลงอดีตก่อน ไปหาวันนี้</option>
            </select>
          </div>
        </div>
      </div>

      {/* Database logs table ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1250px] text-xs font-semibold">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] md:text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">วัน-เวลาทำรายการ</th>
                <th className="py-3 px-4">ประเภท</th>
                <th className="py-3 px-4">สถานีคลังสินค้า (ถัง/บัตร)</th>
                <th className="py-3 px-4">เป้าหมายโครงการไซต์งาน</th>
                <th className="py-3 px-4">ราคาต่อหน่วย</th>
                <th className="py-3 px-4">ปริมาณข้อมูล</th>
                <th className="py-3 px-4">ยอดเงินสุทธิ</th>
                <th className="py-3 px-4">ผู้รับเบิก/คนขับ/ซัพพลาย</th>
                <th className="py-3 px-4">ผู้คีย์บันทึกระบบ</th>
                <th className="py-3 px-4">ตรวจสอบเอกสาร</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650 text-slate-600 font-medium">
              {processedTransactions.map((tx) => {
                const dateText = new Date(tx.timestamp).toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const isIN = tx.type === 'IN';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-all">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{dateText}</span>
                        {tx.attachmentUrl && (
                          <Paperclip className="w-3 h-3 text-indigo-500 shrink-0" title={`มีเอกสารแนบ: ${tx.attachmentName || 'หลักฐาน'}`} />
                        )}
                        {googleAccessToken && (
                          syncedTxIds.includes(tx.id) ? (
                            <Cloud className="w-3.5 h-3.5 text-emerald-650 text-emerald-500 shrink-0" title="ซิงก์ขึ้น Google Sheets แล้ว" />
                          ) : (
                            <CloudOff className="w-3.5 h-3.5 text-slate-300 hover:text-amber-500 shrink-0 cursor-help" title="รอเซฟซิงก์ประมวลคลาวด์" />
                          )
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isIN ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-850 text-emerald-800 text-[10px] font-extrabold rounded-full">
                          รับเข้า (IN)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-850 text-amber-800 text-[10px] font-extrabold rounded-full">
                          เบิกออก (OUT)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700 truncate max-w-[200px]" title={tx.tankName}>
                      {tx.tankName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-semibold truncate max-w-[160px]" title={tx.project || 'สำรองส่วนกลาง'}>
                      {tx.project || 'สำรองทั่วไป'}
                    </td>
                    <td className="py-3 px-4 font-mono">฿{tx.costPerLiter.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 font-bold">
                      {isIN ? (
                        <span className="text-emerald-600">+{tx.amount.toLocaleString('th-TH')} {tx.unit || tx.tankUnit}</span>
                      ) : (
                        <span className="text-rose-600">-{tx.amount.toLocaleString('th-TH')} {tx.unit || tx.tankUnit}</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 font-black ${isIN ? 'text-emerald-700 font-mono' : 'text-rose-700 font-mono'}`}>
                      ฿{tx.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 leading-tight">
                      {isIN ? (
                        <div>
                          <p className="font-bold text-slate-800">{tx.supplier || '-'}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">ผู้ส่งมอบน้ำมัน</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-slate-800">{tx.driverName || '-'}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">ทะเบียน: {tx.plateNo || '-'}</p>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[10px] leading-tight font-medium text-slate-500">
                      <div>คีย์: {tx.recorder || '-'}</div>
                      <div className="text-slate-400 mt-0.5">ผู้ตรวจ: {tx.auditor || '-'}</div>
                    </td>
                    <td className="py-3 px-4 select-none">
                      {tx.isVerified ? (
                        <button
                          onClick={() => onToggleVerifyTransaction(tx.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-lg border border-emerald-200 transition-all cursor-pointer"
                          title="จัดเก็บถูกต้องแล้ว / คลิกเพื่อยกเลิกมาร์ค"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-650 text-emerald-600" />
                          <span>ตรวจผ่านแล้ว</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleVerifyTransaction(tx.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-500 text-[10px] font-extrabold rounded-lg border border-slate-200 transition-all cursor-pointer"
                          title="รอตรวจประสานบิลคู่จ่าย / คลิกเพื่อทำเครื่องหมายผ่าน"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>รอตรวจทาน</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTxForAudit(tx)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                          title="ใบข้อมูลคุมตรวจบิลอย่างละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="ลบธุรกรรมประวัติ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {processedTransactions.length === 0 && (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Database className="w-12 h-12 text-slate-300 mb-2" />
            <p className="font-bold text-sm">ไม่พบประวัติการทำรายการตามเงื่อนไขปัจจุบัน</p>
            <p className="text-xs text-slate-400 mt-1">ลองลบล้างค้นหา หรือเพิ่มรายการบันทึกสต๊อกใหม่ประกอบคลัง</p>
          </div>
        )}
      </div>

      {/* TRANSACTION VERIFICATION & AUDIT SLIP MODAL */}
      {selectedTxForAudit && (() => {
        const tx = selectedTxForAudit;
        const isIN = tx.type === 'IN';
        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:bg-white print:p-0">
            <div className="printable-voucher bg-white rounded-2xl border border-slate-250 shadow-2xl overflow-hidden w-full max-w-xl animate-fade-in text-slate-900 print:border-none print:shadow-none">
              
              {/* Header Bar */}
              <div className={`px-6 py-4 flex flex-shrink-0 items-center justify-between border-b border-slate-100 ${
                isIN ? 'bg-emerald-50/50' : 'bg-rose-50/50'
              } print:hidden`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    isIN ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {isIN ? <Download className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      ใบแสดงรายละเอียดเพื่อตรวจสอบอนุมัติ - {isIN ? 'รายการรับเข้า (IN)' : 'รายการเบิกจ่าย (OUT)'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Voucher ID: {tx.id}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTxForAudit(null)}
                  className="p-1.5 text-slate-400 hover:bg-slate-150 p-2 text-xs font-bold hover:bg-slate-100 rounded-lg transition-colors cursor-pointer print:hidden"
                >
                  ✕
                </button>
              </div>

              {/* Bill Details Content */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] print:max-h-none print:overflow-visible print:p-6">
                
                {/* Corporate Header Letterhead (Visible in screen & clean print) */}
                <div className="border-b-2 border-slate-900 pb-4 mb-2 flex items-start gap-4">
                  <div className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                    <img 
                      src="https://img2.pic.in.th/pic/Screenshot-2025-03-03-132721e6cc77cbcea28f01.png" 
                      alt="บจก. บุรีรัมย์ธงชัยก่อสร้าง" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-black text-slate-900 leading-tight">บริษัท บุรีรัมย์ธงชัยก่อสร้าง จำกัด</h2>
                    <p className="text-[10px] text-slate-600 font-medium leading-tight mt-1">
                      ที่อยู่: 31/2 ถนนอินจันทร์ณรงค์ ต.ในเมือง อ.เมือง จ.บุรีรัมย์ 31000
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] text-slate-500 mt-1.5 font-bold">
                      <div>เลขประจำตัวผู้เสียภาษี: <span className="font-mono text-slate-800 font-extrabold">0315559001144</span></div>
                      <div>โทรสำนักงาน: <span className="text-slate-800">044-611134, 611835</span></div>
                      <div className="sm:col-span-2">E-Mail: <span className="text-slate-800">brtc2024@gmail.com</span></div>
                    </div>
                  </div>
                </div>

                {/* Print Title Heading */}
                <div className="hidden print:block text-center py-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">
                    {isIN ? 'ใบสำคัญการรับเข้าและเติมสต๊อกคลังน้ำมันดีเซล (INFLOW VOUCHER)' : 'ใบสำคัญการเบิกจ่ายตัดน้ำมันดีเซล (OUTFLOW VOUCHER)'}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">VOUCHER ID: {tx.id}</p>
                </div>

                {/* Visual Status Indicator */}
                <div className={`p-4 rounded-xl flex items-center justify-between border ${
                  tx.isVerified 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                } print:hidden`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.isVerified ? 'bg-emerald-500 text-white animate-pulse-subtle' : 'bg-amber-500 text-white'
                    }`}>
                      {tx.isVerified 
                        ? <CheckCircle2 className="w-5 h-5" /> 
                        : <AlertCircle className="w-5 h-5" />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-black">
                        {tx.isVerified ? 'สถานะเอกสาร: ตรวจสอบและประสานบิลเรียบร้อย' : 'สถานะเอกสาร: รอเทียบสอบหลักฐาน'}
                      </p>
                      <p className="text-[10px] opacity-90 font-medium mt-0.5">
                        {tx.isVerified ? `ตรวจโดย: ${tx.auditor || 'ฝ่ายสอบบัญชีหลัก'}` : 'กรุณากดเพื่อยืนยันว่าบิลคู่จัดซื้อ/เบิกใช้ตรงกับข้อมูลในระบบจริง'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onToggleVerifyTransaction(tx.id);
                      setSelectedTxForAudit((prev: any) => prev ? { 
                        ...prev, 
                        isVerified: !prev.isVerified,
                        auditor: !prev.isVerified ? "ตรวจคู่บิลตรงแล้ว (Verified)" : "" 
                      } : null);
                    }}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-colors cursor-pointer border ${
                      tx.isVerified 
                        ? 'bg-white hover:bg-amber-50 border-emerald-300 text-emerald-700' 
                        : 'bg-amber-600 hover:bg-amber-700 border-transparent text-white'
                    }`}
                  >
                    {tx.isVerified ? 'ยกเลิกมาร์ค' : 'อนุมัติบิล'}
                  </button>
                </div>

                {/* Audit Grid (Slip specs) */}
                <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs border border-slate-100 p-4 rounded-xl bg-slate-50/50 print:bg-white print:border-slate-200">
                  
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">วันทำรายการ</span>
                    <span className="font-extrabold text-slate-800">
                      {new Date(tx.timestamp).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">คลังสินค้าควบคุม</span>
                    <span className="font-extrabold text-slate-900">{tx.tankName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">ปริมาณน้ำมัน / วงเงินบัตร</span>
                    <span className="font-black text-slate-900 text-sm">
                      {isIN ? '+' : '-'}{tx.amount.toLocaleString('th-TH')} {tx.unit || tx.tankUnit}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">ราคาประเมินต่อลิตร / หน่วย</span>
                    <span className="font-mono text-slate-800 font-bold">
                      ฿{tx.costPerLiter.toLocaleString('th-TH', { minimumFractionDigits: 2 })} / {tx.unit || tx.tankUnit}
                    </span>
                  </div>

                  <div className="col-span-2 border-t border-slate-100 pt-3 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block">มูลค่าการประเมินบัญชีรวม</span>
                    <span className={`text-base font-black ${isIN ? 'text-emerald-700 font-mono' : 'text-rose-700 font-mono'}`}>
                      ฿{tx.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="col-span-2 border-t border-slate-100 pt-3 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block">ไซต์งาน / โครงการที่ตัดงบ</span>
                    <span className="font-bold text-indigo-700">{tx.project || 'ส่วนกลางสำรองทั่วไป'}</span>
                  </div>

                  {isIN ? (
                    <div className="col-span-2 border-t border-slate-100 pt-3 print:border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block">ซัพพลายเออร์ส่งน้ำมัน / ร้านค้า (IN)</span>
                      <span className="font-extrabold text-slate-800">{tx.supplier || 'ไม่ระบุชื่อร้านค้า'}</span>
                    </div>
                  ) : (
                    <>
                      <div className="border-t border-slate-100 pt-3 print:border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block">พนักงานเบิกใช้งาน / คนขับ (OUT)</span>
                        <span className="font-extrabold text-slate-800">{tx.driverName || '-'}</span>
                      </div>
                      <div className="border-t border-slate-100 pt-3 print:border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block">ป้ายทะเบียนยานพาหนะควบคุม</span>
                        <span className="font-mono font-black text-slate-800">{tx.plateNo || 'เครื่องจักรกลไซต์หน้างาน'}</span>
                      </div>
                    </>
                  )}

                  <div className="col-span-2 border-t border-slate-100 pt-3 grid grid-cols-2 gap-2 print:border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">ผู้ลงบันทึกคีย์ระบบ</span>
                      <span className="font-medium text-slate-600">{tx.recorder || '-'}</span>
                    </div>
                    {tx.invoice && (
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">เลขที่คู่บิล / ใบจ่ายบิล (Invoice / PO)</span>
                        <span className="font-mono font-bold text-indigo-650 text-indigo-600">{tx.invoice}</span>
                      </div>
                    )}
                  </div>

                  {tx.notes && (
                    <div className="col-span-2 border-t border-slate-100 pt-3 print:border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block">หมายเหตุและคำชี้แจงเพิ่มเติม</span>
                      <p className="text-slate-650 bg-slate-100/50 p-2.5 rounded-lg mt-1 whitespace-pre-line text-[11px] font-medium leading-relaxed print:bg-white print:border print:border-slate-200">
                        {tx.notes}
                      </p>
                    </div>
                  )}

                  {tx.attachmentUrl && (
                    <div className="col-span-2 border-t border-slate-100 pt-3 print:border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1.5">เอกสารแนบ / หลักฐานของกิจกรรม</span>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center gap-4">
                        {tx.attachmentUrl.startsWith('data:image/') ? (
                          <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                            <img
                              src={tx.attachmentUrl}
                              alt="Voucher Document"
                              className="w-full h-full object-cover shrink-0"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-black text-xs shrink-0">
                            PDF
                          </div>
                        )}
                        <div className="min-w-0 text-center sm:text-left flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate" title={tx.attachmentName}>
                            {tx.attachmentName || 'หลักฐานเอกสารแนบ'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">จัดเก็บสมบูรณ์ในบัญชีประวัติ</p>
                          {tx.attachmentUrl.startsWith('data:image/') && (
                            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                              <button
                                type="button"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = tx.attachmentUrl!;
                                  link.download = tx.attachmentName || 'attachment.png';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded transition-all cursor-pointer"
                              >
                                ดาวน์โหลดภาพ
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Print-Only Signature & Authentication Stamps slot */}
                  <div className="col-span-2 border-t border-slate-200 pt-8 mt-4 hidden print:grid grid-cols-2 gap-8 text-center text-[10px] font-bold">
                    <div className="space-y-10">
                      <p className="text-slate-500">ลงชื่อ ............................................................ ผู้ขอเบิก / ผู้รับน้ำมัน</p>
                      <p className="text-slate-850 text-slate-800">วันที่ .......... / .......... / .............. เวลา .................</p>
                    </div>
                    <div className="space-y-10">
                      <p className="text-slate-500">ลงชื่อ ............................................................ พนักงานบันทึก / อนุมัติ</p>
                      <p className="text-slate-850 text-slate-800">ตำแหน่ง ....................................................................................</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Buttons in footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between print:hidden">
                <button
                  onClick={() => {
                    onDeleteTransaction(tx.id);
                    setSelectedTxForAudit(null);
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ลบประวัติตัวบิล
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    พิมพ์ใบตรวจ
                  </button>
                  <button
                    onClick={() => setSelectedTxForAudit(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
