/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Database, Upload, Download, Trash2, Copy, Check, FileText, RefreshCw, Layers
} from 'lucide-react';
import { DatabaseState, FuelTank, Vehicle, Transaction } from '../types';
import { generateNextId } from '../utils/id';

interface DataManagementTabProps {
  db: DatabaseState;
  onImportTransactions: (importedTxs: Transaction[]) => void;
  onSetDatabase: (nextDb: DatabaseState) => void;
  showToast: (title: string, message: string, type?: 'success' | 'danger' | 'info') => void;
}

export default function DataManagementTab({
  db,
  onImportTransactions,
  onSetDatabase,
  showToast
}: DataManagementTabProps) {
  const [copiedType, setCopiedType] = useState<'in' | 'out' | null>(null);
  const inFileInputRef = useRef<HTMLInputElement>(null);
  const outFileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom states for manual file pasting
  const [pastedInCSV, setPastedInCSV] = useState('');
  const [pastedOutCSV, setPastedOutCSV] = useState('');

  // Settle progress animation for recording items sequentially
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [totalImportCount, setTotalImportCount] = useState(0);
  const [savingType, setSavingType] = useState<'IN' | 'OUT' | null>(null);

  // Staged pending import state
  const [pendingImport, setPendingImport] = useState<{
    transactions: Transaction[];
    tanks: FuelTank[];
    vehicles: Vehicle[];
    projects: string[];
    type: 'IN' | 'OUT';
    createdTanksCount: number;
    createdVehiclesCount: number;
    createdProjectsCount: number;
    successRows: number;
  } | null>(null);

  // SAMPLES SUPPLIED BY USER IN PROMPT
  const OUT_SAMPLE_DATA = `วันที่,ชื่อสินค้า (คลัง),ราคา,หน่วยนับ,จำนวนที่จ่าย,มูลค่ารวม,หมายเหตุ,โครงการ,ผู้เบิก/คนขับ,ทะเบียน,ผู้บันทึก,ผู้ตรวจสอบ
01/09/2568,น้ำมันดีเซล (ออยเลอร์ ทบ.83-7829),29.85,ลิตร,50.21,"1,498.77",,(38)ทล.24 อ.ปราสาท-อ.สังขะ ตอน2 จ.สุรินทร์ (ปี2568),,รถเฮี๊ยบ 83-8192,พิมพ์ผกา เปลื้องหน่าย,FALSE
01/09/2568,น้ำมันดีเซล (ออยเลอร์ ทบ.83-7829),29.85,ลิตร,100.41,"2,997.24",,(38)ทล.24 อ.ปราสาท-อ.สังขะ ตอน2 จ.สุรินทร์ (ปี2568),,รถแบคโฮ ตง-5521,พิมพ์ผกา เปลื้องหน่าย,FALSE
31/08/2568,บัตร PPT 2221126208 (BTC 00),1.00,บาท,"34,280.40","34,280.40",,(38)ทล.24 อ.ปราสาท-อ.สังขะ ตอน2 จ.สุรินทร์ (ปี2568),รถบริษัท,,,FALSE
05/08/2568,บัตร PPT 2221126208 (BTC 00),1.00,บาท,"2,950.00","2,950.00",,(38)ทล.24 อ.ปราสาท-อ.สังขะ ตอน2 จ.สุรินทร์ (ปี2568),ธณัฐ์ชัย อินทร์ตา,,,FALSE
31/08/2568,บัตร PPT 2221126208 (BTC 00),1.00,บาท,"3,234.00","3,234.00",,(38)ทล.24 อ.ปราสาท-อ.สังขะ ตอน2 จ.สุรินทร์ (ปี2568),วุฒิ อินปันบุตร,,,FALSE`;

  const IN_SAMPLE_DATA = `วันที่,ร้านค้า,ชื่อสินค้า (คลัง),หมวดหมู่,ตรวจสอบ,ราคา,หน่วยนับ,จำนวนที่ซื้อ,ต้นทุนอื่นๆ,มูลค่ารวม,หมายเหตุ,โครงการ,เลขที่ใบสั่งชื้อ (PO),เลขที่ใบส่งสินค้า,สถานที่ส่ง,วันที่ครบกำหนดจ่าย,วันที่จ่าย,ผู้บันทึก,ผู้ตรวจสอบ
30/8/2568,บริษัท จักราชการปิโตรเลียม จำกัด,น้ำมันดีเซล (ออยเลอร์ ทบ.83-7829),น้ำมันดีเซล,TRUE,29.85,ลิตร,"5,000.00",,"149,250.00",,(38)ทล.24 อ.ปราสาท-อ.สังขะ ตอน2 จ.สุรินทร์ (ปี2568),PO6800077,0681/30,แพล้นปราสาท,,,แพรวพรรณ,TRUE
15/9/2568,บริษัท จักราชการปิโตรเลียม จำกัด,น้ำมันดีเซล (ออยเลอร์ ทบ.83-7829),น้ำมันดีเซล,,29.85,ลิตร,"5,000.00",,"149,250.00",,(38)ทล.24 อ.ปราสาท-อ.สังขะ ตอน2 จ.สุรินทร์ (ปี2568),PO6800101,,,,,,FALSE
5/8/2568,บริษัท พีพีที 2024 จำกัด,บัตร PPT 2221126208 (BTC 00),บัตรเติมน้ำมัน PPT,,1.00,บาท,"10,000.00",,"10,000.00",,(38)ทล.24 อ.ปราสาท-อ.สังขะ ตอน2 จ.สุรินทร์ (ปี2568),,,เติมเงินเข้า บัตร PPT,,,,FALSE`;

  const handleCopyText = (text: string, type: 'in' | 'out') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    showToast("คัดลอกรหัสแล้ว", "คุณสามารถนำโครงร่าง CSV นี้ไปใช้อ้างอิงหรือแก้ไขในโปรแกรมคู่มือสำเร็จ", "success");
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Convert Thai dates BE to CE
  const parseThaiBEAndCEToISO = (rawDate: string): string => {
    if (!rawDate) return new Date().toISOString().split('T')[0];
    const parts = rawDate.trim().split(/[\/\-]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      
      if (isNaN(day) || !day) day = 1;
      if (isNaN(month) || !month) month = 1;
      if (isNaN(year) || !year) year = new Date().getFullYear();

      if (year > 2400) {
        year = year - 543; // BE year to CE year
      }
      
      const mm = month < 10 ? `0${month}` : `${month}`;
      const dd = day < 10 ? `0${day}` : `${day}`;
      return `${year}-${mm}-${dd}`;
    }
    return rawDate;
  };

  // Parse CSV Line securely retaining outer quotes
  const parseCSVRowValues = (rowText: string): string[] => {
    const values: string[] = [];
    let insideQuotes = false;
    let currentVal = '';
    
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentVal.replace(/^[ "]+|[ "]+$/g, '').trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.replace(/^[ "]+|[ "]+$/g, '').trim());
    return values;
  };

  // Core Import Processing Algorithm
  const processImportText = (csvContent: string, isOutbound: boolean) => {
    const lines = csvContent.split(/\r?\n/);
    if (lines.length < 2) {
      showToast("ไฟล์ข้อมูลไม่สมบูรณ์", "ไม่พบโครงร่างคอลัมน์และข้อมูลในไฟล์ประมวล", "danger");
      return;
    }

    const headerRow = parseCSVRowValues(lines[0]).map(h => h.trim());
    const newTransactions: Transaction[] = [];
    const localTanks = [...db.tanks];
    const localVehicles = [...db.vehicles];
    const localProjects = [...db.projects];
    
    let createdTanksCount = 0;
    let createdVehiclesCount = 0;
    let createdProjectsCount = 0;
    let successRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const lineText = lines[i].trim();
      if (!lineText) continue;

      const cols = parseCSVRowValues(lineText);
      if (cols.length < 5) continue;

      if (isOutbound) {
        // DISPENSE OUTBOUND format columns:
        // วันที่,ชื่อสินค้า (คลัง),ราคา,หน่วยนับ,จำนวนที่จ่าย,มูลค่ารวม,หมายเหตุ,โครงการ,ผู้เบิก/คนขับ,ทะเบียน,ผู้บันทึก,ผู้ตรวจสอบ
        const dateIdx = headerRow.findIndex(h => h.includes("วันที่"));
        const tankIdx = headerRow.findIndex(h => h.includes("ชื่อสินค้า (คลัง)"));
        const priceIdx = headerRow.findIndex(h => h.includes("ราคา"));
        const unitIdx = headerRow.findIndex(h => h.includes("หน่วยนับ"));
        const amountIdx = headerRow.findIndex(h => h.includes("จำนวนที่จ่าย"));
        const totalIdx = headerRow.findIndex(h => h.includes("มูลค่ารวม"));
        const noteIdx = headerRow.findIndex(h => h.includes("หมายเหตุ"));
        const projIdx = headerRow.findIndex(h => h.includes("โครงการ"));
        const driverIdx = headerRow.findIndex(h => h.includes("ผู้เบิก/คนขับ"));
        const plateIdx = headerRow.findIndex(h => h.includes("ทะเบียน"));
        const recorderIdx = headerRow.findIndex(h => h.includes("ผู้บันทึก"));
        const auditorIdx = headerRow.findIndex(h => h.includes("ผู้ตรวจสอบ"));

        const rawDate = cols[dateIdx !== -1 ? dateIdx : 0] || '1/9/2568';
        const formattedDate = parseThaiBEAndCEToISO(rawDate);
        const tankName = cols[tankIdx !== -1 ? tankIdx : 1] || 'น้ำมันดีเซล (ออยเลอร์ ทบ.83-7829)';
        const unit = cols[unitIdx !== -1 ? unitIdx : 3] || 'ลิตร';
        const rawPrice = parseFloat((cols[priceIdx !== -1 ? priceIdx : 2] || '0').replace(/,/g, '')) || 29.85;
        const amount = parseFloat((cols[amountIdx !== -1 ? amountIdx : 4] || '0').replace(/,/g, '')) || 0;
        const totalValue = parseFloat((cols[totalIdx !== -1 ? totalIdx : 5] || '0').replace(/,/g, '')) || (rawPrice * amount);
        const note = cols[noteIdx !== -1 ? noteIdx : 6] || '';
        const project = cols[projIdx !== -1 ? projIdx : 7] || 'ทั่วไป/สำรองส่วนกลาง';
        const driverName = cols[driverIdx !== -1 ? driverIdx : 8] || 'ส่วนกลาง';
        const plateNo = cols[plateIdx !== -1 ? plateIdx : 9] || '-';
        const recorder = cols[recorderIdx !== -1 ? recorderIdx : 10] || 'ผู้นำเข้าบัญชี';
        const auditor = cols[auditorIdx !== -1 ? auditorIdx : 11] || '';

        if (amount <= 0) continue;

        // Dynamic checking and creation of FuelTank if not active
        let matchedTank = localTanks.find(t => t.name.trim() === tankName.trim());
        if (!matchedTank) {
          const nextFuelTankId = generateNextId("TANK-", localTanks.map(t => t.id), 2);
          matchedTank = {
            id: nextFuelTankId,
            name: tankName.trim(),
            fuelType: tankName.includes("บัตร") || unit.includes("บาท") ? "บัตรเงินสด" : "น้ำมันดีเซล",
            capacity: 50000,
            currentLevel: 0,
            minThreshold: 5000,
            basePrice: rawPrice || 32,
            unit: unit
          };
          localTanks.push(matchedTank);
          createdTanksCount++;
        }

        // Dynamic checking and creation of Vehicle
        if (plateNo && plateNo !== '-') {
          const matchedVeh = localVehicles.find(v => v.plateNo.trim() === plateNo.trim());
          if (!matchedVeh) {
            const nextVehicleId = generateNextId("V-", localVehicles.map(v => v.id), 3);
            localVehicles.push({
              id: nextVehicleId,
              plateNo: plateNo.trim(),
              model: "ยานพาหนะนำเข้า",
              driver: driverName || "พนักงานสำรอง"
            });
            createdVehiclesCount++;
          }
        }

        // Dynamic checking of Projects
        if (project && !localProjects.includes(project.trim())) {
          localProjects.push(project.trim());
          createdProjectsCount++;
        }

        // Adjust tank dynamic currentLevel (Deduct OUT transactions)
        matchedTank.currentLevel = Math.max(0, matchedTank.currentLevel - amount);

        // Calculate next OUT transaction id sequentially
        const collectedTxIds = [...db.transactions, ...newTransactions].map(t => t.id);
        const nextTxId = generateNextId("TX-OUT-", collectedTxIds, 4);

        newTransactions.push({
          id: nextTxId,
          type: "OUT",
          timestamp: `${formattedDate}T12:00:00`,
          tankId: matchedTank.id,
          category: matchedTank.fuelType,
          unit: matchedTank.unit,
          amount,
          costPerLiter: rawPrice,
          totalValue,
          project,
          driverName,
          plateNo,
          recorder,
          auditor,
          isVerified: auditor.toUpperCase() === 'TRUE' || auditor !== '',
          notes: note
        });
        successRows++;

      } else {
        // INBOUND Refill format columns:
        // วันที่ (or Date in column 0),ร้านค้า,ชื่อสินค้า (คลัง),หมวดหมู่,ตรวจสอบ,ราคา,หน่วยนับ,จำนวนที่ซื้อ,ต้นทุนอื่นๆ,มูลค่ารวม,หมายเหตุ,โครงการ,เลขที่ใบสั่งชื้อ (PO),เลขที่ใบส่งสินค้า,สถานที่ส่ง,วันที่ครบกำหนดจ่าย,วันที่จ่าย,ผู้บันทึก,ผู้ตรวจสอบ
        const dateIdx = headerRow.findIndex(h => h.includes("วันที่") || h.includes("วันที่รับ"));
        const supIdx = headerRow.findIndex(h => h.includes("ร้านค้า"));
        const tankIdx = headerRow.findIndex(h => h.includes("ชื่อสินค้า (คลัง)"));
        const catIdx = headerRow.findIndex(h => h.includes("หมวดหมู่"));
        const priceIdx = headerRow.findIndex(h => h.includes("ราคา"));
        const unitIdx = headerRow.findIndex(h => h.includes("หน่วยนับ"));
        const amountIdx = headerRow.findIndex(h => h.includes("จำนวนที่ซื้อ"));
        const totalIdx = headerRow.findIndex(h => h.includes("มูลค่ารวม"));
        const noteIdx = headerRow.findIndex(h => h.includes("หมายเหตุ"));
        const projIdx = headerRow.findIndex(h => h.includes("โครงการ"));
        const poIdx = headerRow.findIndex(h => h.includes("เลขที่ใบสั่งชื้อ") || h.includes("PO"));
        const invIdx = headerRow.findIndex(h => h.includes("เลขที่ใบส่งสินค้า"));
        const placeIdx = headerRow.findIndex(h => h.includes("สถานที่ส่ง"));
        const recIdx = headerRow.findIndex(h => h.includes("ผู้บันทึก"));
        const audIdx = headerRow.findIndex(h => h.includes("ผู้ตรวจสอบ"));

        const rawDate = cols[dateIdx !== -1 ? dateIdx : 0] || '30/8/2568';
        const formattedDate = parseThaiBEAndCEToISO(rawDate);
        const supplier = cols[supIdx !== -1 ? supIdx : 1] || 'ซัพพลายเออร์ทั่วไป';
        const tankName = cols[tankIdx !== -1 ? tankIdx : 2] || 'น้ำมันดีเซล (ออยเลอร์ ทบ.83-7829)';
        const category = cols[catIdx !== -1 ? catIdx : 3] || 'น้ำมันดีเซล';
        const unit = cols[unitIdx !== -1 ? unitIdx : 6] || 'ลิตร';
        const rawPrice = parseFloat((cols[priceIdx !== -1 ? priceIdx : 5] || '0').replace(/,/g, '')) || 29.85;
        const amount = parseFloat((cols[amountIdx !== -1 ? amountIdx : 7] || '0').replace(/,/g, '')) || 0;
        const totalValue = parseFloat((cols[totalIdx !== -1 ? totalIdx : 9] || '0').replace(/,/g, '')) || (rawPrice * amount);
        const notes = cols[noteIdx !== -1 ? noteIdx : 10] || '';
        const project = cols[projIdx !== -1 ? projIdx : 11] || 'ทั่วไป/สำรองส่วนกลาง';
        const poNo = cols[poIdx !== -1 ? poIdx : 12] || '';
        const invoice = cols[invIdx !== -1 ? invIdx : 13] || '';
        const deliveryPlace = cols[placeIdx !== -1 ? placeIdx : 14] || '';
        const recorder = cols[recIdx !== -1 ? recIdx : 17] || 'ผู้นำเข้าประวัติ';
        const auditor = cols[audIdx !== -1 ? audIdx : 18] || '';

        if (amount <= 0) continue;

        // Dynamic checking and creation of FuelTank if not active
        let matchedTank = localTanks.find(t => t.name.trim() === tankName.trim());
        if (!matchedTank) {
          const nextFuelTankId = generateNextId("TANK-", localTanks.map(t => t.id), 2);
          matchedTank = {
            id: nextFuelTankId,
            name: tankName.trim(),
            fuelType: tankName.includes("บัตร") || unit.includes("บาท") ? "บัตรเงินสด" : "น้ำมันดีเซล",
            capacity: 50000,
            currentLevel: 0,
            minThreshold: 5000,
            basePrice: rawPrice || 32,
            unit: unit
          };
          localTanks.push(matchedTank);
          createdTanksCount++;
        }

        // Dynamic checking of Projects
        if (project && !localProjects.includes(project.trim())) {
          localProjects.push(project.trim());
          createdProjectsCount++;
        }

        // Adjust tank level (Add IN refill transaction)
        matchedTank.currentLevel = matchedTank.currentLevel + amount;

        // Calculate next IN transaction id sequentially
        const collectedTxIds = [...db.transactions, ...newTransactions].map(t => t.id);
        const nextTxId = generateNextId("TX-IN-", collectedTxIds, 4);

        newTransactions.push({
          id: nextTxId,
          type: "IN",
          timestamp: `${formattedDate}T09:00:00`,
          tankId: matchedTank.id,
          category,
          unit: matchedTank.unit,
          amount,
          costPerLiter: rawPrice,
          totalValue,
          supplier,
          project,
          invoice,
          poNo,
          deliveryPlace,
          recorder,
          auditor,
          isVerified: auditor.toUpperCase() === 'TRUE' || auditor !== '',
          notes
        });
        successRows++;
      }
    }

    if (newTransactions.length > 0) {
      setPendingImport({
        transactions: newTransactions,
        tanks: localTanks,
        vehicles: localVehicles,
        projects: localProjects,
        type: isOutbound ? 'OUT' : 'IN',
        createdTanksCount,
        createdVehiclesCount,
        createdProjectsCount,
        successRows
      });
      showToast("ประมวลผลตารางรอนำเข้าสำเร็จ", `พบชุดข้อมูลรอนำเข้าจำนวนทั้งหมด ${successRows} รายการ กรุณาตรวจสอบและกดยืนยันบันทึกเข้าระบบจริงเพื่อจัดเก็บลงฐานข้อมูล`, "info");
    } else {
      showToast("ข้ามการทำงาน", "ไม่พบแถวปริมาณที่จะนำเข้าได้ กรุณาตรวจสอบหัวตารางและราคาฟิลด์", "info");
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImport || isSavingImport) return;

    setIsSavingImport(true);
    setSavedCount(0);
    setTotalImportCount(pendingImport.successRows);
    setSavingType(pendingImport.type);

    const totalRows = pendingImport.successRows;
    // Calculate adaptive speed to complete in a reasonable timeframe (~1.5s total)
    const intervalTime = Math.max(15, Math.min(100, 1500 / totalRows));

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setSavedCount(current);
      if (current >= totalRows) {
        clearInterval(interval);

        const finalDbState: DatabaseState = {
          tanks: pendingImport.tanks,
          vehicles: pendingImport.vehicles,
          projects: pendingImport.projects,
          transactions: [...db.transactions, ...pendingImport.transactions]
        };
        
        onSetDatabase(finalDbState);
        
        let additionText = "นำเข้าเสร็จสิ้น!";
        if (pendingImport.createdTanksCount > 0 || pendingImport.createdVehiclesCount > 0 || pendingImport.createdProjectsCount > 0) {
          additionText += ` สร้างคลังใหม่ ${pendingImport.createdTanksCount} แห่ง, เพิ่มทะเบียนรถ ${pendingImport.createdVehiclesCount} คัน และบันทึกโครงการเพิ่ม ${pendingImport.createdProjectsCount} ไซต์อัตโนมัติ`;
        }
        showToast("นำเข้างวดบัญชีสำเร็จ", `บันทึกรายการสำเร็จ ${pendingImport.successRows} แถวประวัติเรียบร้อยแล้ว. ${additionText}`, "success");
        
        if (pendingImport.type === 'OUT') {
          setPastedOutCSV('');
        } else {
          setPastedInCSV('');
        }
        
        // Reset states
        setPendingImport(null);
        setIsSavingImport(false);
        setSavingType(null);
      }
    }, intervalTime);
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    showToast("ยกเลิกการนำเข้า", "คุณได้ยกเลิกรายการนำเข้าแล้ว ข้อมูลฐานข้อมูลเดิมยังคงอยู่ครบถ้วน", "info");
  };

  const handleInFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      processImportText(content, false);
    };
    reader.readAsText(file, "UTF-8");
    if (inFileInputRef.current) inFileInputRef.current.value = '';
  };

  const handleOutFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      processImportText(content, true);
    };
    reader.readAsText(file, "UTF-8");
    if (outFileInputRef.current) outFileInputRef.current.value = '';
  };

  // Full System backup export
  const exportSystemJSONBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `fuelflow_pro_system_snapshot_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    showToast("สำรองระบบสำเร็จ", "ดาวน์โหลดแผ่นภาพข้อมูลโครงสร้าง JSON ในเครื่องเสร็จสมบูรณ์", "success");
  };

  const handleJSONBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          // Validate structure
          const valid = parsed.tanks && parsed.vehicles && parsed.projects && parsed.transactions;
          if (valid) {
            onSetDatabase(parsed);
            showToast("กู้คืนสถานะสำเร็จ", "แทนที่ข้อมูลสต๊อก คนขับ ยานพาหนะ และประวัติทั้งหมดด้วยข้อมูลสำรองเรียบร้อย", "success");
          } else {
            showToast("โครงสร้างไฟล์ไม่ถูกต้อง", "ไฟล์ JSON ไม่ใช่รูปแบบ Snapshot ระบบ FuelFlow", "danger");
          }
        }
      } catch (err: any) {
        showToast("กู้คืนล้มเหลว", "การถอดรหัสล้มเหลว: " + err.message, "danger");
      }
    };
    reader.readAsText(file, "UTF-8");
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  // Clear all database records to start fresh
  const handleWipeAndResetSlate = () => {
    const freshDb: DatabaseState = {
      tanks: [],
      vehicles: [],
      projects: [],
      transactions: []
    };
    onSetDatabase(freshDb);
    showToast("ล้างประวัติเครื่องสำเร็จ", "ฐานข้อมูลถังน้ำมัน ยานพาหนะ ไซต์งาน และประวัติถูกขจัดออกทั้งหมดเริ่มนับหนึ่งใหม่", "info");
  };

  return (
    <div className="space-y-6">
      
      {/* PENDING IMPORT PREVIEW STAGE AREA */}
      {pendingImport && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                  pendingImport.type === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {pendingImport.type === 'IN' ? 'รอนำเข้า: รับเข้า (IN)' : 'รอนำเข้า: จ่ายออก (OUT)'}
                </span>
                <span className="text-xs text-slate-400 font-bold font-mono">
                  พบข้อมูลทั้งหมด {pendingImport.successRows} รายการ
                </span>
              </div>
              <h2 className="text-base md:text-lg font-extrabold text-white mt-1">
                ตรวจพบและประมวลผลตารางสำเร็จ — กรุณาตรวจสอบและกดยืนยันเพื่อบันทึกลงฐานข้อมูลจริง
              </h2>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <button
                disabled={isSavingImport}
                onClick={handleCancelImport}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-extrabold rounded-lg text-xs cursor-pointer transition border border-slate-700 disabled:opacity-50"
              >
                ยกเลิกรายการ
              </button>
              <button
                disabled={isSavingImport}
                onClick={handleConfirmImport}
                className={`px-5 py-2 font-black rounded-lg text-xs cursor-pointer shadow-lg transition flex items-center gap-1.5 ${
                  isSavingImport ? 'bg-slate-700 text-slate-400 cursor-not-allowed' :
                  pendingImport.type === 'IN' 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950' 
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {isSavingImport ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                    <span>กำลังบันทึก... ({savedCount}/{totalImportCount})</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                    <span>ยืนยันบันทึกเข้าระบบจริง</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metrics/KPI grid of changes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-400 text-[11px]">
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
              <span className="block text-slate-500 mb-0.5">จำนวนแถวทั้งหมด</span>
              <strong className="text-white text-sm font-black">{pendingImport.successRows} รายการ</strong>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
              <span className="block text-slate-500 mb-0.5">ถัง/บัตรเก็บเงินใหม่</span>
              <strong className="text-white text-sm font-black">{pendingImport.createdTanksCount} รายการ</strong>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
              <span className="block text-slate-500 mb-0.5">พนักงานและทะเบียนใหม่</span>
              <strong className="text-white text-sm font-black">{pendingImport.createdVehiclesCount} รายการ</strong>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
              <span className="block text-slate-500 mb-0.5">โครงการเพิ่มใหม่</span>
              <strong className="text-white text-sm font-black">{pendingImport.createdProjectsCount} รายการ</strong>
            </div>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[220px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-extrabold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">วันที่</th>
                  <th className="py-2.5 px-3">ชื่อสินค้า (คลัง)/ชื่อบัตร</th>
                  {pendingImport.type === 'IN' ? (
                    <>
                      <th className="py-2.5 px-3">ร้านค้า</th>
                      <th className="py-2.5 px-3">ราคา</th>
                      <th className="py-2.5 px-3">จำนวนที่ซื้อ</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2.5 px-3">ผู้เบิก/คนขับ</th>
                      <th className="py-2.5 px-3">เลขทะเบียน/ตักจ่าย</th>
                      <th className="py-2.5 px-3">จำนวนที่จ่าย</th>
                    </>
                  )}
                  <th className="py-2.5 px-3">มูลค่ารวม</th>
                  <th className="py-2.5 px-3">โครงการและแคมป์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/35 font-medium text-slate-300">
                {pendingImport.transactions.map((tx, idx) => {
                  const matchedTank = pendingImport.tanks.find(t => t.id === tx.tankId);
                  return (
                    <tr key={tx.id || idx} className="hover:bg-slate-850/50">
                      <td className="py-2 px-3 shrink-0 font-mono text-[11px] whitespace-nowrap">
                        {tx.timestamp.split('T')[0]}
                      </td>
                      <td className="py-2 px-3 max-w-[220px] truncate text-white font-semibold">
                        {matchedTank?.name || tx.tankId}
                      </td>
                      {pendingImport.type === 'IN' ? (
                        <>
                          <td className="py-2 px-3 truncate max-w-[150px]">{tx.supplier || '-'}</td>
                          <td className="py-2 px-3 text-slate-400 font-mono">{tx.costPerLiter?.toLocaleString()} {tx.unit}</td>
                          <td className="py-2 px-3 font-semibold font-mono text-emerald-400">+{tx.amount?.toLocaleString()} {tx.unit}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 truncate max-w-[150px]">{tx.driverName || '-'}</td>
                          <td className="py-2 px-3 font-semibold text-amber-300">{tx.plateNo || '-'}</td>
                          <td className="py-2 px-3 font-semibold font-mono text-rose-400">-{tx.amount?.toLocaleString()} {tx.unit}</td>
                        </>
                      )}
                      <td className="py-2 px-3 font-semibold font-mono text-white">
                        {tx.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </td>
                      <td className="py-2 px-3 truncate max-w-[180px] text-slate-400">{tx.project || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-500 italic text-center font-bold">
            💡 กรุณาเข้าตรวจสอบรายการข้อมูลทั้งหมดด้านบนนี้ หากข้อมูลถูกต้องตรงตามบันทึก ให้กด "ยืนยันบันทึกเข้าระบบจริง" เพื่อบันทึกเข้าสู่ตัวเครื่อง/ตาราง Google Sheets โดยทันที
          </p>
        </div>
      )}

      {/* 3-Column layout: Two dedicated uploader panels and one database system panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-slate-600 font-semibold font-sans">
        
        {/* Bulk CSV File/Paste Area split into explicit panels */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* INCOMING REFILLS (IN) CARD */}
          <div className="bg-white rounded-2xl border-t-4 border-t-emerald-500 border border-slate-200 shadow-sm p-5 space-y-6 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-black text-[9px] uppercase tracking-wider self-start inline-block">
                รายการซื้อเข้า / รับน้ำมันดีเซล / สั่งซื้อ PO (IN)
              </span>
              <h3 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>นำเข้าข้อมูล "รับเข้าคลัง" (IN)</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                อัปโหลดเอกสารซื้อรับน้ำมัน ค่ายจ่ายบริษัทจักราช หรือตั๋วสลิปรายสัปดาห์เพิ่มเข้ามูลค่าถังสำรอง
              </p>
            </div>

            <div className="space-y-4">
              {/* File upload */}
              <div className="p-4 border border-dashed border-emerald-200 rounded-xl flex flex-col items-center justify-center text-center space-y-2.5 bg-emerald-50/20 hover:bg-emerald-50/40 transition">
                <Upload className="w-6 h-6 text-emerald-500" />
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-700 text-[11px]">เลือกไฟล์เอกสารบันทึกรับเข้า</p>
                  <p className="text-[9px] text-slate-400">รองรับนามสกุลไฟล์ .csv เฉพาะฟอร์แมต IN</p>
                </div>
                <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg cursor-pointer shadow-xs text-[10px] transition">
                  <span>นำเข้าไฟล์ (.csv)</span>
                  <input 
                    type="file" 
                    ref={inFileInputRef}
                    accept=".csv" 
                    onChange={handleInFileUpload} 
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Textpaste */}
              <div className="space-y-1.5 flex flex-col">
                <textarea
                  value={pastedInCSV}
                  onChange={(e) => setPastedInCSV(e.target.value)}
                  placeholder={`วันที่,ร้านค้า,ชื่อสินค้า (คลัง),หมวดหมู่,ตรวจสอบ,ราคา,หน่วยนับ,จำนวนที่ซื้อ,ต้นทุนอื่นๆ...\n30/8/2568,บริษัท จักราชการปิโตรเลียม จำกัด,น้ำมันดีเซล...,TRUE,29.85...`}
                  className="w-full h-[95px] p-2 rounded-lg border border-slate-200 text-[9px] text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
                <button
                  disabled={isSavingImport}
                  onClick={() => {
                    if (pastedInCSV.trim()) {
                      processImportText(pastedInCSV, false);
                    } else {
                      showToast("กรุณาป้อนข้อมูล", "วางแถวข้อมูล CSV ตัวอย่างที่มีคำนำหน้า (IN) ก่อนประมวลผล", "danger");
                    }
                  }}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-center text-xs shadow-xs cursor-pointer transition disabled:opacity-50"
                >
                  {isSavingImport && savingType === 'IN' ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก ({savedCount}/{totalImportCount})</span>
                    </span>
                  ) : (
                    <span>นำเข้าข้อมูลสำรองรับเข้า (รับเข้า.csv)</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* OUTGOING DISPENSES (OUT) CARD */}
          <div className="bg-white rounded-2xl border-t-4 border-t-slate-800 border border-slate-200 shadow-sm p-5 space-y-6 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-black text-[9px] uppercase tracking-wider self-start inline-block">
                รายการตักจ่าย / จ่ายน้ำมันคนขับ / ทะเบียนรถ (OUT)
              </span>
              <h3 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-850 shrink-0"></span>
                <span>นำเข้าข้อมูล "จ่ายออกคลัง" (OUT)</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                อัปโหลดเอกสารการตักจ่ายหน้างาน ประวัติการเติมของเครื่องจักรและรถบรรทุก เพื่อตัดยอดสต๊อกหน้าปัดคลังเก็บ
              </p>
            </div>

            <div className="space-y-4">
              {/* File upload */}
              <div className="p-4 border border-dashed border-slate-250 rounded-xl flex flex-col items-center justify-center text-center space-y-2.5 bg-slate-50/50 hover:bg-slate-50/100 transition">
                <Upload className="w-6 h-6 text-slate-500" />
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-700 text-[11px]">เลือกไฟล์เอกสารบันทึกจ่ายออก</p>
                  <p className="text-[9px] text-slate-400">รองรับนามสกุลไฟล์ .csv เฉพาะฟอร์แมต OUT</p>
                </div>
                <label className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-lg cursor-pointer shadow-xs text-[10px] transition">
                  <span>นำเข้าไฟล์ (.csv)</span>
                  <input 
                    type="file" 
                    ref={outFileInputRef}
                    accept=".csv" 
                    onChange={handleOutFileUpload} 
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Textpaste */}
              <div className="space-y-1.5 flex flex-col">
                <textarea
                  value={pastedOutCSV}
                  onChange={(e) => setPastedOutCSV(e.target.value)}
                  placeholder={`วันที่,ชื่อสินค้า (คลัง),ราคา,หน่วยนับ,จำนวนที่จ่าย,มูลค่ารวม...\n01/09/2568,น้ำมันดีเซล...,29.85,ลิตร,50.21...`}
                  className="w-full h-[95px] p-2 rounded-lg border border-slate-200 text-[9px] text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white"
                />
                <button
                  disabled={isSavingImport}
                  onClick={() => {
                    if (pastedOutCSV.trim()) {
                      processImportText(pastedOutCSV, true);
                    } else {
                      showToast("กรุณาป้อนข้อมูล", "วางแถวข้อมูล CSV ตัวอย่างที่มีตารางตักจ่าย (OUT) ขับรถก่อนประมวลผล", "danger");
                    }
                  }}
                  className="w-full py-1.5 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-lg text-center text-xs shadow-xs cursor-pointer transition disabled:opacity-50"
                >
                  {isSavingImport && savingType === 'OUT' ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก ({savedCount}/{totalImportCount})</span>
                    </span>
                  ) : (
                    <span>นำเข้าข้อมูลสำรองจ่ายออก (จ่ายออก.csv)</span>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* SYSTEM BACKUP/SNAPSHOT CARD (1/3 COL) */}
        <div className="bg-white rounded-2xl border-t-4 border-t-indigo-500 border border-slate-200 shadow-sm p-5 space-y-6 flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-black text-[9px] uppercase tracking-wider self-start inline-block">
              ฟังก์ชั่นระบบและพิกัดสำรองเครื่อง
            </span>
            <h3 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
              <span>สำรองข้อมูล & เคลียร์สถานะระบบ</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              เครื่องมือดาวน์โหลดแผ่นภาพฐานข้อมูลระบบ (Local Storage DB Snapshot) เพื่อใช้ถ่ายเทหรือสำรองสำเนากันข้อมูลหาย
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Backup Export */}
            <button
              onClick={exportSystemJSONBackup}
              className="w-full flex items-center justify-between p-3 border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-750/90 rounded-lg">
                  <Download className="w-4 h-4 text-indigo-650" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-700">สร้างไฟล์สำรองระบบ (JSON)</h4>
                  <p className="text-[10px] text-slate-400 font-medium">คัดลอกถัง บัตร ยานพาหนะ และงบทั้งหมด</p>
                </div>
              </div>
            </button>

            {/* Backup Import */}
            <label className="w-full flex items-center justify-between p-3 border border-slate-200 hover:border-slate-350 rounded-xl hover:bg-slate-50 transition cursor-pointer text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-750 rounded-lg">
                  <Upload className="w-4 h-4 text-emerald-650" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-700">ติดตั้งไฟล์ระบบสำรองคลาวด์</h4>
                  <p className="text-[10px] text-slate-400 font-medium">กู้คืนระบบจากประวัติ Snapshot ที่สำรองไว้</p>
                </div>
              </div>
              <input 
                type="file" 
                ref={jsonFileInputRef}
                accept=".json" 
                onChange={handleJSONBackupImport} 
                className="hidden" 
              />
            </label>

            {/* Clear Database resets */}
            <button
              onClick={handleWipeAndResetSlate}
              className="w-full flex items-center justify-between p-3 border border-rose-100 hover:border-rose-250 bg-rose-50/20 hover:bg-rose-50/50 rounded-xl transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-750 rounded-lg">
                  <Trash2 className="w-4 h-4 text-rose-650 text-rose-600" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-900">ล้างประวัติเริ่มใช้งานใหม่ทั้งหมด</h4>
                  <p className="text-[10px] text-rose-500 font-medium text-rose-700">ล้างค่าคลังและสถิติค้างเครื่องเพื่อใช้ข้อมูลจริง</p>
                </div>
              </div>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

