/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Fuel, LayoutDashboard, CalendarRange, 
  Database, CreditCard, Truck, History as HistoryIcon, X, CheckCircle,
  LogOut, LogIn, Cloud, Wrench, ShieldCheck
} from 'lucide-react';

import { DatabaseState, FuelTank, Vehicle, Transaction, RequestDocument } from './types';
import { INITIAL_DATABASE } from './initialData';
import {
  findDriveFolder,
  createDriveFolder,
  createSpreadsheetInFolder,
  ensureSpreadsheetIntegrity,
  appendTransactionToSheet,
  batchSyncToSheet,
  syncTanksToSheet,
  syncVehiclesToSheet,
  syncProjectsToSheet,
  syncSuppliersToSheet,
  syncRequestsToSheet
} from './googleSheets';

// Component imports
import Header from './components/Header';
import DashboardTab from './components/DashboardTab';
import RequestsTab from './components/RequestsTab';
import TransactionsTab from './components/TransactionsTab';
import AnnualSummaryTab from './components/AnnualSummaryTab';
import TanksTab from './components/TanksTab';
import CardsTab from './components/CardsTab';
import VehiclesTab from './components/VehiclesTab';
import HistoryTab from './components/HistoryTab';
import CloudDBTab from './components/CloudDBTab';
import DataManagementTab from './components/DataManagementTab';
import ConfirmModal from './components/ConfirmModal';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'danger' | 'info';
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [db, setDb] = useState<DatabaseState>(INITIAL_DATABASE);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [quickDispenseActive, setQuickDispenseActive] = useState<boolean>(false);

  // Google Sheets database configurations & states
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => localStorage.getItem('smart_fuel_gs_token') || null);
  const [spreadsheetId, setSpreadsheetId] = useState(() => localStorage.getItem('smart_fuel_gs_sheet_id') || '');
  const [driveFolderId, setDriveFolderId] = useState(() => localStorage.getItem('smart_fuel_gs_folder_id') || '');
  const [isAutoSync, setIsAutoSync] = useState(() => localStorage.getItem('smart_fuel_gs_auto_sync') === 'true');
  const [syncedTxIds, setSyncedTxIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('smart_fuel_gs_synced_ids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (googleAccessToken) {
      localStorage.setItem('smart_fuel_gs_token', googleAccessToken);
    } else {
      localStorage.removeItem('smart_fuel_gs_token');
    }
  }, [googleAccessToken]);

  useEffect(() => {
    localStorage.setItem('smart_fuel_gs_sheet_id', spreadsheetId);
  }, [spreadsheetId]);

  useEffect(() => {
    localStorage.setItem('smart_fuel_gs_folder_id', driveFolderId);
  }, [driveFolderId]);

  useEffect(() => {
    localStorage.setItem('smart_fuel_gs_auto_sync', String(isAutoSync));
  }, [isAutoSync]);

  useEffect(() => {
    localStorage.setItem('smart_fuel_gs_synced_ids', JSON.stringify(syncedTxIds));
  }, [syncedTxIds]);

  // Deletion confirmation orchestration
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onExecute: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onExecute: () => {},
  });

  const fetchAndRebuildDatabase = async (token: string, sheetId: string): Promise<{ success: boolean; count: number }> => {
    if (!token || !sheetId) return { success: false, count: 0 };
    try {
      const integrity = await ensureSpreadsheetIntegrity(token, sheetId);

      const rangeIn = `'รับเข้า'!A2:Z`;
      const rangeOut = `'จ่ายออก'!A2:Z`;
      const rangeTanks = `'ถังเก็บและวงเงินสิทธิ์'!A2:Z`;
      const rangeVehicles = `'ทะเบียนรถและเครื่องจักร'!A2:Z`;
      const rangeProjects = `'รายชื่อโครงการและแคมป์งาน'!A2:Z`;
      const rangeRequests = `'ใบขอซื้อและขอเติมเงินบัตร'!A2:Z`;

      const urlIn = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(rangeIn)}`;
      const urlOut = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(rangeOut)}`;
      const urlTanks = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(rangeTanks)}`;
      const urlVehicles = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(rangeVehicles)}`;
      const urlProjects = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(rangeProjects)}`;
      const urlRequests = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(rangeRequests)}`;

      const [resIn, resOut, resTanks, resVehicles, resProjects, resRequests] = await Promise.all([
        fetch(urlIn, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
        fetch(urlOut, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
        fetch(urlTanks, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
        fetch(urlVehicles, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
        fetch(urlProjects, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
        fetch(urlRequests, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({}))
      ]);

      const newTxList: Transaction[] = [];

      if (resIn?.values) {
        resIn.values.forEach((row: any[], i: number) => {
          const dateHeadIdx = integrity.inHeaders.indexOf("วันที่รับ");
          const poHeadIdx = integrity.inHeaders.indexOf("เลขที่ใบสั่งซื้อ (PO)");
          const invHeadIdx = integrity.inHeaders.indexOf("เลขที่ใบส่งสินค้า");
          const supHeadIdx = integrity.inHeaders.indexOf("ร้านค้า");
          const prodHeadIdx = integrity.inHeaders.indexOf("ชื่อสินค้า (คลัง)");
          const catHeadIdx = integrity.inHeaders.indexOf("หมวดหมู่");
          const prcHeadIdx = integrity.inHeaders.indexOf("ราคา");
          const amountHeadIdx = integrity.inHeaders.indexOf("จำนวนที่ซื้อ");
          const totalHeadIdx = integrity.inHeaders.indexOf("มูลค่ารวม");
          const projHeadIdx = integrity.inHeaders.indexOf("โครงการ");
          const noteHeadIdx = integrity.inHeaders.indexOf("หมายเหตุ");
          const recHeadIdx = integrity.inHeaders.indexOf("ผู้บันทึก");

          const rawDate = row[dateHeadIdx !== -1 ? dateHeadIdx : 0] || '';
          if (!rawDate) return;

          const rawAmount = parseFloat(String(row[amountHeadIdx !== -1 ? amountHeadIdx : 8]).replace(/,/g, '')) || 0;
          const rawPrice = parseFloat(String(row[prcHeadIdx !== -1 ? prcHeadIdx : 6]).replace(/,/g, '')) || 0;
          const totalValue = parseFloat(String(row[totalHeadIdx !== -1 ? totalHeadIdx : 10]).replace(/,/g, '')) || (rawPrice * rawAmount) || 0;
          const tankName = row[prodHeadIdx !== -1 ? prodHeadIdx : 4] || 'ดีเซลหลัก';

          newTxList.push({
            id: `TX-IN-${String(i + 1).padStart(4, '0')}`,
            type: 'IN',
            timestamp: rawDate.includes(' ') ? rawDate.replace(' ', 'T') : rawDate,
            tankId: tankName,
            amount: rawAmount,
            costPerLiter: rawPrice || (totalValue / rawAmount) || 32,
            totalValue: totalValue,
            project: row[projHeadIdx !== -1 ? projHeadIdx : 11] || '',
            supplier: row[supHeadIdx !== -1 ? supHeadIdx : 3] || '',
            category: row[catHeadIdx !== -1 ? catHeadIdx : 5] || 'ดีเซล',
            invoice: row[invHeadIdx !== -1 ? invHeadIdx : 2] || '',
            poNo: row[poHeadIdx !== -1 ? poHeadIdx : 1] || '',
            notes: row[noteHeadIdx !== -1 ? noteHeadIdx : 15] || '',
            recorder: row[recHeadIdx !== -1 ? recHeadIdx : 16] || 'GSheet Cloud',
            auditor: '',
            isVerified: false
          });
        });
      }

      if (resOut?.values) {
        resOut.values.forEach((row: any[], i: number) => {
          const dateHeadIdx = integrity.outHeaders.indexOf("วันที่");
          const prodHeadIdx = integrity.outHeaders.indexOf("ชื่อสินค้า (คลัง)");
          const prcHeadIdx = integrity.outHeaders.indexOf("ราคา");
          const amountHeadIdx = integrity.outHeaders.indexOf("จำนวนที่จ่าย");
          const totalHeadIdx = integrity.outHeaders.indexOf("มูลค่ารวม");
          const projHeadIdx = integrity.outHeaders.indexOf("โครงการ");
          const bkrHeadIdx = integrity.outHeaders.indexOf("ผู้เบิก/คนขับ");
          const regHeadIdx = integrity.outHeaders.indexOf("ทะเบียน");
          const noteHeadIdx = integrity.outHeaders.indexOf("หมายเหตุ");
          const recHeadIdx = integrity.outHeaders.indexOf("ผู้บันทึก");

          const rawDate = row[dateHeadIdx !== -1 ? dateHeadIdx : 0] || '';
          if (!rawDate) return;

          const rawAmount = parseFloat(String(row[amountHeadIdx !== -1 ? amountHeadIdx : 4]).replace(/,/g, '')) || 0;
          const rawPrice = parseFloat(String(row[prcHeadIdx !== -1 ? prcHeadIdx : 2]).replace(/,/g, '')) || 0;
          const totalValue = parseFloat(String(row[totalHeadIdx !== -1 ? totalHeadIdx : 5]).replace(/,/g, '')) || (rawPrice * rawAmount) || 0;
          const tankName = row[prodHeadIdx !== -1 ? prodHeadIdx : 1] || 'ดีเซลหลัก';

          newTxList.push({
            id: `TX-OUT-${String(i + 1).padStart(4, '0')}`,
            type: 'OUT',
            timestamp: rawDate.includes(' ') ? rawDate.replace(' ', 'T') : rawDate,
            tankId: tankName,
            amount: rawAmount,
            costPerLiter: rawPrice || (totalValue / rawAmount) || 32,
            totalValue: totalValue,
            project: row[projHeadIdx !== -1 ? projHeadIdx : 6] || '',
            driverName: row[bkrHeadIdx !== -1 ? bkrHeadIdx : 7] || '',
            plateNo: row[regHeadIdx !== -1 ? regHeadIdx : 8] || '',
            notes: row[noteHeadIdx !== -1 ? noteHeadIdx : 9] || '',
            recorder: row[recHeadIdx !== -1 ? recHeadIdx : 10] || 'GSheet Cloud',
            auditor: '',
            isVerified: false
          });
        });
      }

      const rebuiltTanksList: FuelTank[] = [];
      const rebuiltVehiclesList: Vehicle[] = [];
      const rebuiltProjectsList: string[] = [];

      // Parse existing Tanks from GSheet if available
      if (resTanks?.values && resTanks.values.length > 0) {
        resTanks.values.forEach((row: any[]) => {
          const id = row[0];
          const name = row[1];
          if (!id || !name) return;
          rebuiltTanksList.push({
            id: String(id),
            name: String(name),
            fuelType: String(row[2] || 'น้ำมันดีเซล'),
            capacity: parseFloat(String(row[3]).replace(/,/g, '')) || 100000,
            currentLevel: parseFloat(String(row[4]).replace(/,/g, '')) || 0,
            minThreshold: parseFloat(String(row[5]).replace(/,/g, '')) || 5000,
            basePrice: parseFloat(String(row[6]).replace(/,/g, '')) || 32,
            unit: String(row[7] || 'ลิตร')
          });
        });
      }

      // Parse existing Vehicles from GSheet if available
      if (resVehicles?.values && resVehicles.values.length > 0) {
        resVehicles.values.forEach((row: any[]) => {
          const id = row[0];
          const plateNo = row[1];
          if (!id || !plateNo) return;
          rebuiltVehiclesList.push({
            id: String(id),
            plateNo: String(plateNo),
            model: String(row[2] || 'ยานพาหนะทั่วไป'),
            driver: String(row[3] || 'ทั่วไป')
          });
        });
      }

      // Parse existing Projects from GSheet if available
      if (resProjects?.values && resProjects.values.length > 0) {
        resProjects.values.forEach((row: any[]) => {
          const projName = row[0];
          if (projName && !rebuiltProjectsList.includes(String(projName).trim())) {
            rebuiltProjectsList.push(String(projName).trim());
          }
        });
      }

      // Fallback extraction & mapping
      newTxList.forEach(tx => {
        const nameText = tx.tankId.trim();
        if (!nameText) return;

        let foundTank = rebuiltTanksList.find(t => t.id === nameText || t.name.trim() === nameText);
        if (!foundTank) {
          const cleanId = `tank-${nameText.replace(/[^a-zA-Z0-9ก-๙]/g, '-') || Date.now()}`;
          const isCard = nameText.includes("บัตร") || nameText.includes("PPT");
          foundTank = {
            id: cleanId,
            name: nameText,
            fuelType: isCard ? "บัตรเงินสด" : "น้ำมันดีเซล",
            capacity: 100000,
            currentLevel: 0,
            minThreshold: 5000,
            basePrice: tx.costPerLiter || 32,
            unit: isCard ? "บาท" : "ลิตร"
          };
          rebuiltTanksList.push(foundTank);
        }
        tx.tankId = foundTank.id;
      });

      // Recalculate fuel levels based on ledger transactions
      rebuiltTanksList.forEach(tk => {
        tk.currentLevel = 0;
      });

      newTxList.forEach(tx => {
        const tk = rebuiltTanksList.find(t => t.id === tx.tankId);
        if (tk) {
          if (tx.type === 'IN') {
            tk.currentLevel += tx.amount;
          } else {
            tk.currentLevel -= tx.amount;
          }
        }

        if (tx.project && !rebuiltProjectsList.includes(tx.project.trim())) {
          rebuiltProjectsList.push(tx.project.trim());
        }

        if (tx.type === 'OUT' && tx.plateNo && tx.plateNo !== '-') {
          const plateStr = tx.plateNo.trim();
          let vObj = rebuiltVehiclesList.find(v => v.plateNo === plateStr);
          if (!vObj) {
            vObj = {
              id: `vehicle-${plateStr}`,
              plateNo: plateStr,
              driver: tx.driverName || 'ทั่วไป',
              model: plateStr.includes('รถ') ? 'เครื่องจักรกล' : 'รถยนต์'
            };
            rebuiltVehiclesList.push(vObj);
          }
        }
      });

      const rebuiltRequestsList: RequestDocument[] = [];
      if (resRequests?.values && resRequests.values.length > 0) {
        resRequests.values.forEach((row: any[]) => {
          const id = row[0];
          const typeLabel = row[1];
          if (!id || !typeLabel) return;

          const type = typeLabel === 'ขอจัดซื้อน้ำมัน' ? 'FUEL_PURCHASE' : 'CARD_REFILL';
          const statusLabel = row[10];
          let status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
          if (statusLabel === 'อนุมัติแล้ว') status = 'APPROVED';
          if (statusLabel === 'ปฏิเสธ') status = 'REJECTED';

          rebuiltRequestsList.push({
            id: String(id),
            type,
            timestamp: String(row[2] || '').includes(' ') ? String(row[2]).replace(' ', 'T') : String(row[2]),
            tankId: String(row[3] || ''),
            amount: parseFloat(String(row[4]).replace(/,/g, '')) || 0,
            costPerUnit: row[5] && row[5] !== '-' ? parseFloat(String(row[5]).replace(/,/g, '')) : undefined,
            totalValue: parseFloat(String(row[6]).replace(/,/g, '')) || 0,
            supplier: row[7] && row[7] !== '-' ? String(row[7]) : undefined,
            project: row[8] && row[8] !== '-' ? String(row[8]) : undefined,
            requester: String(row[9] || ''),
            status,
            notes: String(row[11] || ''),
            approver: row[12] && row[12] !== '-' ? String(row[12]) : undefined,
            approvalNotes: row[13] && row[13] !== '-' ? String(row[13]) : undefined,
            approvalDate: row[14] && row[14] !== '-' ? String(row[14]) : undefined,
            targetDate: row[15] && row[15] !== '-' ? String(row[15]) : undefined,
            poNo: row[16] && row[16] !== '-' ? String(row[16]) : undefined,
            isProcessed: String(row[17] || '').includes('ใช่')
          });
        });
      }

      setDb({
        tanks: rebuiltTanksList,
        vehicles: rebuiltVehiclesList,
        projects: rebuiltProjectsList,
        transactions: newTxList,
        requests: rebuiltRequestsList
      });

      return { success: true, count: newTxList.length };
    } catch (err: any) {
      console.error("fetchAndRebuildDatabase error: ", err);
      const errMsg = String(err?.message || "");
      if (
        errMsg.includes("invalid authentication credentials") || 
        errMsg.includes("Expected OAuth 2") || 
        errMsg.includes("401") || 
        errMsg.includes("Invalid Credentials")
      ) {
        setGoogleAccessToken(null);
        localStorage.removeItem('smart_fuel_gs_token');
        showToast("เซสชันคลาวด์หมดอายุ", "การเชื่อมต่อ Google Sheets หมดอายุหรือใบรับรองถูกยกเลิก กรุณาเข้าสู่ระบบใหม่อีกครั้ง", "danger");
      }
      return { success: false, count: 0 };
    }
  };

  // Sync back database edits to storage
  const saveDatabase = async (updatedDb: DatabaseState) => {
    setDb(updatedDb);
    
    if (googleAccessToken && spreadsheetId) {
      const unsyncedNewTxs = updatedDb.transactions.filter(t => !syncedTxIds.includes(t.id));

      try {
        const integrity = await ensureSpreadsheetIntegrity(googleAccessToken, spreadsheetId);

        if (unsyncedNewTxs.length > 0) {
          showToast("กำลังส่งข้อมูล...", `กำลังซิงก์ประวัติเพิ่มอีก ${unsyncedNewTxs.length} รายการขึ้น Google Sheets...`, "info");
          const result = await batchSyncToSheet(
            googleAccessToken,
            spreadsheetId,
            unsyncedNewTxs,
            updatedDb.tanks,
            integrity.inHeaders,
            integrity.outHeaders
          );

          if (result.successCount > 0) {
            const newlySyncedIds = unsyncedNewTxs.map(t => t.id);
            setSyncedTxIds(prev => [...new Set([...prev, ...newlySyncedIds])]);
            showToast("ซิงก์คลาวด์สำเร็จ", `บันทึกรายการนำเข้า ${result.successCount} รายการขึ้น Google Sheets เรียบร้อย`, "success");
          }
        }

        // Always sync the master states as well
        await syncTanksToSheet(googleAccessToken, spreadsheetId, updatedDb.tanks);
        await syncVehiclesToSheet(googleAccessToken, spreadsheetId, updatedDb.vehicles);
        await syncProjectsToSheet(googleAccessToken, spreadsheetId, updatedDb.projects);
        await syncRequestsToSheet(googleAccessToken, spreadsheetId, updatedDb.requests || []);

        const suppliers = Array.from(new Set(
          updatedDb.transactions
            .filter(t => t.type === 'IN' && t.supplier)
            .map(t => t.supplier!.trim())
        ));
        await syncSuppliersToSheet(googleAccessToken, spreadsheetId, suppliers);

        await fetchAndRebuildDatabase(googleAccessToken, spreadsheetId);
      } catch (err: any) {
        console.error("Auto sync batch and master tables failure: ", err);
        const errMsg = String(err?.message || "");
        if (
          errMsg.includes("invalid authentication credentials") || 
          errMsg.includes("Expected OAuth 2") || 
          errMsg.includes("401") || 
          errMsg.includes("Invalid Credentials")
        ) {
          setGoogleAccessToken(null);
          localStorage.removeItem('smart_fuel_gs_token');
          showToast("เซสชันคลาวด์หมดอายุ", "ไม่สามารถซิงก์ข้อมูลคลาวด์ได้ เนื่องจากใบรับรอง Google Expired กรุณาเข้าสู่ระบบเชื่อมคลาวด์ใหม่อีกครั้ง", "danger");
        } else {
          showToast("ซิงก์คลาวด์ไม่สำเร็จ", `ฐานแผ่นงานเกิดข้อผิดพลาด: ${err.message || 'เน็ตเวิร์กขัดข้อง'}`, "danger");
        }
      }
    }
  };

  // Load state from Google Sheets on startup if token & sheet ID exist
  useEffect(() => {
    if (googleAccessToken && spreadsheetId) {
      showToast("เชื่อมโยงระบบคลาวด์", "กำลังซิงก์ฐานข้อมูลจาก Google Sheets...", "info");
      fetchAndRebuildDatabase(googleAccessToken, spreadsheetId).then((res) => {
        if (res.success) {
          showToast("ซิงก์คลาวด์สำเร็จ", `โหลดแล้วเสร็จ ${res.count} ธุรกรรมเพื่อประมวลผลดัชนีคลังสินค้า`, "success");
        }
      });
    }
  }, [googleAccessToken, spreadsheetId]);

  // Toast system
  const showToast = (title: string, message: string, type: 'success' | 'danger' | 'info' = 'success') => {
    const id = "toast-" + Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);

    // Auto delete after 4.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Deletion helper dialog opening
  const requestConfirmation = (title: string, message: string, onExecute: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onExecute: () => {
        onExecute();
        closeConfirm();
      },
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  // ==========================================
  // GOOGLE SHEETS API BACKGROUND HANDLERS
  // ==========================================
  const handleTriggerAutoCreate = async () => {
    if (!googleAccessToken) throw new Error("Google access token is missing");
    
    // 1. Find or create folder "FuelFlow Pro"
    let folderId = await findDriveFolder(googleAccessToken, "FuelFlow Pro");
    if (!folderId) {
      folderId = await createDriveFolder(googleAccessToken, "FuelFlow Pro");
    }
    setDriveFolderId(folderId);

    // 2. Create spreadsheet inside
    const sheetFile = await createSpreadsheetInFolder(googleAccessToken, folderId, "FuelFlow_Pro_Database");
    setSpreadsheetId(sheetFile.id);

    // 3. Ensure structure ("รับเข้า", "จ่ายออก") and Thai column headers are perfect
    await ensureSpreadsheetIntegrity(googleAccessToken, sheetFile.id);
  };

  const handleTriggerVerifyIntegrity = async () => {
    if (!googleAccessToken) throw new Error("Google access token is missing");
    if (!spreadsheetId) throw new Error("Spreadsheet ID is missing");
    
    showToast("เริ่มสแกนตรวจสอบ...", "ระบบกำลังดำเนินคู่ขนานตรวจสอบชีตและโครงสร้างทั้ง 7 ตารางบนคลาวด์...", "info");
    
    // 1. Ensure sheets and headers exist
    const integrity = await ensureSpreadsheetIntegrity(googleAccessToken, spreadsheetId);
    
    // 2. Immediately populate local master data onto the newly verified/created sheets!
    showToast("สำเร็จขั้นที่ 1", "สร้างแผ่นงานครบถ้วนแล้ว กำลังประมวลจัดส่งบัญชีรายชื่อ...", "info");
    
    await syncTanksToSheet(googleAccessToken, spreadsheetId, db.tanks);
    await syncVehiclesToSheet(googleAccessToken, spreadsheetId, db.vehicles);
    await syncProjectsToSheet(googleAccessToken, spreadsheetId, db.projects);
    await syncRequestsToSheet(googleAccessToken, spreadsheetId, db.requests || []);
    
    const suppliers: string[] = Array.from(new Set(
      db.transactions
        .filter(t => t.type === 'IN' && t.supplier)
        .map(t => t.supplier!.trim())
    )) as string[];
    await syncSuppliersToSheet(googleAccessToken, spreadsheetId, suppliers);
    
    showToast(
      "สแกนและจัดส่งสำเร็จ! 🎉", 
      "ตรวจสอบ/ปรับพิกัดคอลัมน์ และแชร์ข้อมูลประวัติรายชื่อขึ้น Google Sheets เรียบร้อยครบทั้ง 7 แผ่นงานหลัก!", 
      "success"
    );
  };

  const handleTriggerSyncAll = async () => {
    if (!googleAccessToken) throw new Error("Google access token is missing");
    if (!spreadsheetId) throw new Error("Spreadsheet ID is missing");

    const integrity = await ensureSpreadsheetIntegrity(googleAccessToken, spreadsheetId);
    
    const unsyncedTxs = db.transactions.filter(t => !syncedTxIds.includes(t.id));
    if (unsyncedTxs.length === 0) {
      return;
    }

    const result = await batchSyncToSheet(
      googleAccessToken,
      spreadsheetId,
      unsyncedTxs,
      db.tanks,
      integrity.inHeaders,
      integrity.outHeaders
    );

    if (result.successCount > 0) {
      const syncedIds = unsyncedTxs.map(t => t.id);
      setSyncedTxIds(prev => [...new Set([...prev, ...syncedIds])]);
    }
  };

  const handleTriggerImportFromGSheet = async () => {
    if (!googleAccessToken) throw new Error("Google access token is missing");
    if (!spreadsheetId) throw new Error("Spreadsheet ID is missing");

    showToast("กำลังดึงคลาวด์...", "กู้คืนระบบและแยกโครงสร้างข้อมูลจาก Google Sheets...", "info");
    const result = await fetchAndRebuildDatabase(googleAccessToken, spreadsheetId);
    if (result.success) {
      showToast("กู้คืนข้อมูลเสร็จสิ้น", `จัดเก็บบัญชีสำเร็จ ${result.count} รายการจากสารบรรณคลาวด์ลงระบบ เรียบร้อย!`, "success");
    } else {
      showToast("ไม่พบข้อมูล", "แฟ้มข้อมูลชีตว่างเปล่าหรือเกิดข้อผิดพลาดในการโหลดคลาวด์", "danger");
    }
  };

  // State handlers to update the DB structures
  const handleAddTransaction = (newTx: Transaction, updatedTankLevel: number) => {
    const updatedTanks = db.tanks.map((tank) => {
      if (tank.id === newTx.tankId) {
        return { ...tank, currentLevel: updatedTankLevel };
      }
      return tank;
    });

    const updatedDb = {
      ...db,
      tanks: updatedTanks,
      transactions: [...db.transactions, newTx],
    };

    saveDatabase(updatedDb);
    setCurrentTab('dashboard'); // Redirect to dashboard to view updated gauge immediately
  };

  const handleAddTank = (tank: FuelTank) => {
    const updatedDb = {
      ...db,
      tanks: [...db.tanks, tank],
    };
    saveDatabase(updatedDb);
  };

  const handleDeleteTank = (id: string) => {
    const tank = db.tanks.find((t) => t.id === id);
    if (!tank) return;

    if (db.tanks.length <= 1) {
      showToast("ไม่สามารถนำออกได้", "ระบบต้องการถังเก็บดีเซลหรือบัตรอย่างน้อย 1 รายการเพื่อใช้งานโครงสร้างหลัก", "danger");
      return;
    }

    requestConfirmation(
      "ยืนยันการลบคลังสินค้ามิตินี้?",
      `คุณต้องการลบ "${tank.name}" หรือไม่? การลบจะดึงประวัติและล้างงบในถังนี้ออกอย่างถาวร`,
      () => {
        const updatedDb = {
          ...db,
          tanks: db.tanks.filter((t) => t.id !== id),
          transactions: db.transactions.filter((tx) => tx.tankId !== id),
        };
        saveDatabase(updatedDb);
        showToast("สำเร็จ", `ลบคลังสินค้า "${tank.name}" และประวัติการจัดเก็บสำเร็จ`, "info");
      }
    );
  };

  const handleAddCard = (card: FuelTank) => {
    const updatedDb = {
      ...db,
      tanks: [...db.tanks, card],
    };
    saveDatabase(updatedDb);
  };

  const handleDeleteCard = (id: string) => {
    const card = db.tanks.find((t) => t.id === id);
    if (!card) return;

    if (db.tanks.length <= 1) {
      showToast("ไม่สามารถนำออกได้", "ระบบต้องการถังหรือบัตรอย่างน้อย 1 รายการเพื่อใช้งานโครงสร้างหลัก", "danger");
      return;
    }

    requestConfirmation(
      "ยืนยันการยกเลิกผูกสิทธิ์บัตรเงินสด?",
      `คุณแน่ใจว่าต้องการเอาบัตร "${card.name}" ออกจากระบบติดตามการเบิกจ่ายงบบัญชี?`,
      () => {
        const updatedDb = {
          ...db,
          tanks: db.tanks.filter((t) => t.id !== id),
          transactions: db.transactions.filter((tx) => tx.tankId !== id),
        };
        saveDatabase(updatedDb);
        showToast("สำเร็จ", `ลบทิ้งบัตรเงินสด "${card.name}" สำเร็จ`, "info");
      }
    );
  };

  const handleAddVehicle = (newVeh: Vehicle) => {
    const updatedDb = {
      ...db,
      vehicles: [...db.vehicles, newVeh],
    };
    saveDatabase(updatedDb);
  };

  const handleDeleteVehicle = (id: string) => {
    const veh = db.vehicles.find((v) => v.id === id);
    if (!veh) return;

    requestConfirmation(
      "ต้องการลบข้อมูลยานพาหนะคันนี้?",
      `คุณต้องการเอาทะเบียนรถ "${veh.plateNo}" พนักงานขับ "${veh.driver}" ออกจากทำเนียบใช้งาน?`,
      () => {
        const updatedDb = {
          ...db,
          vehicles: db.vehicles.filter((v) => v.id !== id),
        };
        saveDatabase(updatedDb);
        showToast("สำเร็จ", `ถอนข้อมูลทะเบียนรถ "${veh.plateNo}" เรียบร้อยแล้ว`, "info");
      }
    );
  };

  const handleAddProject = (projName: string) => {
    const updatedDb = {
      ...db,
      projects: [...db.projects, projName],
    };
    saveDatabase(updatedDb);
  };

  const handleDeleteProject = (projName: string) => {
    if (db.projects.length <= 1) {
      showToast("ล้มเหลว", "ระบบต้องการมีไซต์จัดสรรปลายทางอย่างน้อย 1 แห่งประมวลเพื่อรองรับการเบิก", "danger");
      return;
    }

    requestConfirmation(
      "ยืนยันลบไซต์งานโครงการนี้หลัก?",
      `คุณแน่ใจว่าต้องการนำโครงการ "${projName}" ออกจากตัวเลือกการเบิกจ่ายน้ำมันและสิทธิสต๊อกหรือไม่?`,
      () => {
        const updatedDb = {
          ...db,
          projects: db.projects.filter((p) => p !== projName),
        };
        saveDatabase(updatedDb);
        showToast("สำเร็จ", `ถอนการผูกสิทธิ์โครงการ "${projName}" สะสางเรียบร้อย`, "info");
      }
    );
  };

  const handleDeleteTransaction = (id: string) => {
    requestConfirmation(
      "ลบประวัติธุรกรรมคลังสะสม?",
      "การลบประวัติตัวบิลนี้มีผลเพียงทางเอกสารบัญชี จะไม่มีผลต่อการเรียกคืนหรือยอดเติมของปริมาณจริงที่เบิกไปแล้ว คุณแน่ใจชัวร์นะ?",
      () => {
        const updatedDb = {
          ...db,
          transactions: db.transactions.filter((tx) => tx.id !== id),
        };
        saveDatabase(updatedDb);
        showToast("ลบสำเร็จ", "นำประวัติการทำธุรกรรมออกจากบัญชีแล้ว", "info");
      }
    );
  };

  const handleToggleVerifyTransaction = (id: string) => {
    const updatedTransactions = db.transactions.map((tx) => {
      if (tx.id === id) {
        const nextState = !tx.isVerified;
        return {
          ...tx,
          isVerified: nextState,
          auditor: nextState ? "ตรวจคู่บิลตรงแล้ว (Verified)" : ""
        };
      }
      return tx;
    });

    const updatedDb = {
      ...db,
      transactions: updatedTransactions,
    };
    saveDatabase(updatedDb);
    
    const tx = db.transactions.find(t => t.id === id);
    if (tx) {
      if (!tx.isVerified) {
        showToast("ตรวจสอบความถูกต้องผ่าน", "ทำเครื่องหมายตรวจสอบตัวบิลเรียบร้อยแล้ว", "success");
      } else {
        showToast("ยกเลิกการสอบทานบิล", "ปรับสถานะตัวบิลเป็นรอการตรวจสอบ", "info");
      }
    }
  };

  const handleImportTransactions = (importedTxs: Transaction[]) => {
    const updatedDb = {
      ...db,
      transactions: [...db.transactions, ...importedTxs],
    };
    saveDatabase(updatedDb);
  };

  // Navigations sidebar mapping
  const menuGroups = [
    {
      title: 'ธุรกรรมประจำวัน',
      items: [
        { id: 'dispense', label: 'บันทึกเบิกจ่ายออก (OUT)', icon: LogOut },
        { id: 'refill', label: 'บันทึกรับเข้า/เติมคลัง (IN)', icon: LogIn },
      ]
    },
    {
      title: 'แผนงานจัดอนุมัติ',
      items: [
        { id: 'requests', label: 'ใบขอซื้อน้ำมัน/เติมสิทธิ์บัตร', icon: ShieldCheck },
      ]
    },
    {
      title: 'รายงาน & การสรุปผล',
      items: [
        { id: 'dashboard', label: 'แดชบอร์ดสรุปผล', icon: LayoutDashboard },
        { id: 'history', label: 'ประวัติและรายงาน', icon: HistoryIcon },
        { id: 'annual-summary', label: 'รายงานจัดซื้อรายปี', icon: CalendarRange },
      ]
    },
    {
      title: 'ข้อมูลพื้นฐานระบบ',
      items: [
        { id: 'tanks', label: 'จัดการถังน้ำมัน (ลิตร)', icon: Database },
        { id: 'cards', label: 'จัดการบัตรเงินสด', icon: CreditCard },
        { id: 'vehicles', label: 'ยานพาหนะ & โครงการ', icon: Truck },
      ]
    },
    {
      title: 'เครื่องมือ & บริการคลาวด์',
      items: [
        { id: 'cloud-db', label: 'เชื่อมโยงฐานข้อมูล', icon: Cloud },
        { id: 'data-management', label: 'จัดการข้อมูล (สำรอง/นำเข้า)', icon: Wrench },
      ]
    }
  ];

  const navItems = menuGroups.flatMap(group => group.items);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      
      {/* SIDEBAR NAVIGATION CONTROL (DESKTOP) */}
      <aside className="hidden md:flex md:flex-shrink-0 flex-col w-64 bg-white border-r border-slate-200">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200 bg-white">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/15 flex-shrink-0">
            <Fuel className="w-5 h-5 animate-pulse-subtle" />
          </div>
          <div>
            <h1 className="font-black text-slate-800 text-sm tracking-tight leading-none">FuelFlow Pro</h1>
            <p className="text-[10px] text-indigo-600 font-extrabold tracking-wider mt-1">Smart Fuel System</p>
          </div>
        </div>

        {/* Main navigation links list */}
        <nav className="flex-1 px-4 py-5 space-y-5 overflow-y-auto no-scrollbar">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              <div className="px-3 text-[10px] uppercase font-black tracking-widest text-slate-400">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-xs">
              HQ
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] sm:text-[11px] font-black text-slate-800 truncate leading-tight">บจก. บุรีรัมย์ธงชัยก่อสร้าง</p>
              <p className="text-[9px] text-emerald-600 flex items-center gap-1 mt-0.5 font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ระบบอัจฉริยะ / Cloud Sync
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT RUNTIME CANVAS */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden bg-slate-50">
        
        {/* MOBILE NAVIGATION HEADER */}
        <header className="flex md:hidden items-center justify-between px-4 h-16 bg-white border-b border-slate-200 text-slate-850 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
              <Fuel className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-xs tracking-tight text-slate-900">FuelFlow Pro</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto max-w-[65%] no-scrollbar px-1 py-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label
                    .replace('ใบขอซื้อน้ำมัน/เติมสิทธิ์บัตร', 'ขอซื้อ')
                    .replace('จัดการถังน้ำมัน (ลิตร)', 'ดีเซล')
                    .replace('จัดการบัตรเงินสด', 'บัตร')
                    .replace('สรุปผล', 'แดช')
                    .replace('บันทึกเบิกจ่ายออก (OUT)', 'เบิกจ่าย')
                    .replace('บันทึกรับเข้า/เติมคลัง (IN)', 'รับเข้า')
                    .replace('เชื่อมโยงฐานข้อมูล', 'เชื่อมคลาวด์')
                    .replace('จัดการข้อมูล (สำรอง/นำเข้า)', 'จัดการ')}
                </button>
              );
            })}
          </div>
        </header>

        {/* TOP NAVBAR (DESKTOP) */}
        <Header 
          currentTab={currentTab} 
          onTabChange={setCurrentTab} 
          tanks={db.tanks}
          onQuickDispense={() => {
            setCurrentTab('dispense');
            setQuickDispenseActive(true);
          }}
        />

        {/* CONTAINER FOR TAB RENDERING */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          
          {currentTab === 'dashboard' && (
            <DashboardTab db={db} onTabChange={setCurrentTab} />
          )}

          {currentTab === 'requests' && (
            <RequestsTab 
              db={db}
              onSaveDb={saveDatabase}
              showToast={showToast}
            />
          )}

          {currentTab === 'dispense' && (
            <TransactionsTab 
              db={db} 
              onAddTransaction={handleAddTransaction}
              showToast={showToast}
              quickDispenseActive={quickDispenseActive}
              onResetQuickDispense={() => setQuickDispenseActive(false)}
              mode="dispense"
            />
          )}

          {currentTab === 'refill' && (
            <TransactionsTab 
              db={db} 
              onAddTransaction={handleAddTransaction}
              showToast={showToast}
              quickDispenseActive={quickDispenseActive}
              onResetQuickDispense={() => setQuickDispenseActive(false)}
              mode="refill"
            />
          )}

          {currentTab === 'annual-summary' && (
            <AnnualSummaryTab db={db} showToast={showToast} />
          )}

          {currentTab === 'tanks' && (
            <TanksTab 
              db={db} 
              onAddTank={handleAddTank}
              onDeleteTank={handleDeleteTank}
              showToast={showToast}
            />
          )}

          {currentTab === 'cards' && (
            <CardsTab 
              db={db} 
              onAddCard={handleAddCard}
              onDeleteCard={handleDeleteCard}
              showToast={showToast}
            />
          )}

          {currentTab === 'vehicles' && (
            <VehiclesTab 
              db={db} 
              onAddVehicle={handleAddVehicle} 
              onDeleteVehicle={handleDeleteVehicle}
              onAddProject={handleAddProject}
              onDeleteProject={handleDeleteProject}
              showToast={showToast}
            />
          )}

          {currentTab === 'history' && (
            <HistoryTab 
              db={db}
              onDeleteTransaction={handleDeleteTransaction}
              onImportTransactions={handleImportTransactions}
              onToggleVerifyTransaction={handleToggleVerifyTransaction}
              showToast={showToast}
              googleAccessToken={googleAccessToken}
              syncedTxIds={syncedTxIds}
            />
          )}

          {currentTab === 'cloud-db' && (
            <CloudDBTab 
              db={db}
              showToast={showToast}
              googleAccessToken={googleAccessToken}
              onSetGoogleAccessToken={setGoogleAccessToken}
              spreadsheetId={spreadsheetId}
              onSetSpreadsheetId={setSpreadsheetId}
              driveFolderId={driveFolderId}
              onSetDriveFolderId={setDriveFolderId}
              isAutoSync={isAutoSync}
              onSetIsAutoSync={setIsAutoSync}
              syncedTxIds={syncedTxIds}
              onTriggerAutoCreate={handleTriggerAutoCreate}
              onTriggerVerifyIntegrity={handleTriggerVerifyIntegrity}
              onTriggerSyncAll={handleTriggerSyncAll}
              onTriggerImportFromGSheet={handleTriggerImportFromGSheet}
            />
          )}

          {currentTab === 'data-management' && (
            <DataManagementTab 
              db={db}
              onImportTransactions={handleImportTransactions}
              onSetDatabase={saveDatabase}
              showToast={showToast}
            />
          )}

        </main>
      </div>

      {/* CONFIRMATION ORCHESTRATION MODAL */}
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onExecute}
        onCancel={closeConfirm}
      />

      {/* TOAST NOTIFIER FLOATING AREA */}
      <div id="toast-wrapper" className="fixed top-5 right-5 space-y-2 z-50 pointer-events-none">
        {toasts.map((toast) => {
          const isDanger = toast.type === 'danger';
          const isInfo = toast.type === 'info';
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3.5 p-4 rounded-xl border shadow-lg transition-all duration-300 transform animate-in slide-in-from-right-10 pointer-events-auto ${
                isDanger 
                  ? 'bg-rose-50 text-rose-950 border-rose-200' 
                  : isInfo 
                    ? 'bg-blue-50 text-blue-950 border-blue-200' 
                    : 'bg-emerald-50 text-emerald-955 text-emerald-900 border-emerald-200'
              }`}
            >
              <div className={`p-1 rounded-full text-white ${isDanger ? 'bg-rose-500' : isInfo ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <div>
                <h5 className="font-bold text-xs">{toast.title}</h5>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="ml-auto text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
