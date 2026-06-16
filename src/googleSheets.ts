/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, FuelTank, Vehicle, RequestDocument } from './types';

// Raw required column headers as specified by the user
export const CANONICAL_OUT_HEADERS = [
  "วันที่",
  "ชื่อสินค้า (คลัง)",
  "ราคา",
  "หน่วยนับ",
  "จำนวนที่จ่าย",
  "มูลค่ารวม",
  "โครงการ",
  "ผู้เบิก/คนขับ",
  "ทะเบียน",
  "หมายเหตุ",
  "ผู้บันทึก",
  "ผู้ตรวจสอบ",
  "ชื่อเอกสารแนบ"
];

export const CANONICAL_IN_HEADERS = [
  "วันที่รับ",
  "เลขที่ใบสั่งซื้อ (PO)",
  "เลขที่ใบส่งสินค้า",
  "ร้านค้า",
  "ชื่อสินค้า (คลัง)",
  "หมวดหมู่",
  "ราคา",
  "หน่วยนับ",
  "จำนวนที่ซื้อ",
  "ต้นทุนอื่นๆ",
  "มูลค่ารวม",
  "โครงการ",
  "สถานที่ส่ง",
  "วันที่ครบกำหนดจ่าย",
  "วันที่จ่าย",
  "หมายเหตุ",
  "ผู้บันทึก",
  "ผู้ตรวจสอบ",
  "ชื่อเอกสารแนบ"
];

export const CANONICAL_TANK_HEADERS = [
  "รหัสคลัง (ID)",
  "ชื่อถังเก็บ/ชื่อบัตร",
  "ประเภทน้ำมัน/สิทธิ์",
  "ความจุสูงสุด",
  "ปริมาณคงเหลือปัจจุบัน",
  "ระดับแจ้งเตือนขั้นต่ำ",
  "ราคาต่อหน่วยล่าสุด",
  "หน่วยนับ"
];

export const CANONICAL_VEHICLE_HEADERS = [
  "รหัสรถ (ID)",
  "เลขทะเบียน/ชื่อเครื่องหมาย",
  "ประเภท/รุ่นโมเดล",
  "ผู้เบิก/พนักงานประจำ"
];

export const CANONICAL_PROJECT_HEADERS = [
  "ชื่อโครงการและแคมป์งาน"
];

export const CANONICAL_SUPPLIER_HEADERS = [
  "ชื่อคู่ค้า/ร้านค้าน้ำมัน"
];

export const CANONICAL_REQUEST_HEADERS = [
  "รหัสคำร้อง (ID)",
  "ประเภทคำร้อง",
  "วันที่ขอ",
  "รหัสคลัง/บัตรปลายทาง",
  "ปริมาณ/จำนวนเงิน",
  "ราคาต่อหน่วยคาดการณ์",
  "มูลค่ารวม",
  "ผู้บริการจัดส่ง/ซัพพลายเออร์",
  "โครงการ",
  "ผู้ขออนุมัติ",
  "สถานะอนุมัติ",
  "หมายเหตุคำร้อง",
  "ผู้อนุมัติ/ผู้ตรวจสอบ",
  "ความคิดเห็นประกอบ",
  "วันที่ประเมินผล",
  "กำหนดการส่งมอบ",
  "เลขที่ใบสั่งซื้อ (PO)",
  "บันทึกรับเข้าแล้ว (Processed)"
];

/**
 * Perform a generic authenticated fetch to the Google API
 */
async function googleFetch(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, { ...options, headers });
  if (!response.ok) {
    let errMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error && errJson.error.message) {
        errMsg = errJson.error.message;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  // Some operations (like PUT, POST with 204 or delete) might have empty bodies
  if (response.status === 204) return {};
  try {
    return await response.json();
  } catch (_) {
    return {};
  }
}

/**
 * Searches for a folder by name in the user's Google Drive.
 * Returns the folder ID if found, otherwse null.
 */
export async function findDriveFolder(accessToken: string, folderName: string): Promise<string | null> {
  const q = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const res = await googleFetch(url, accessToken, { method: 'GET' });
  if (res.files && res.files.length > 0) {
    return res.files[0].id;
  }
  return null;
}

/**
 * Creates a folder in the user's Google Drive.
 */
export async function createDriveFolder(accessToken: string, folderName: string): Promise<string> {
  const url = 'https://www.googleapis.com/drive/v3/files';
  const body = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  const res = await googleFetch(url, accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.id;
}

/**
 * Searches for a file (like a Spreadsheet) within a specific folder.
 */
export async function findFileInFolder(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string = 'application/vnd.google-apps.spreadsheet'
): Promise<string | null> {
  const q = `name = '${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and mimeType = '${mimeType}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const res = await googleFetch(url, accessToken, { method: 'GET' });
  if (res.files && res.files.length > 0) {
    return res.files[0].id;
  }
  return null;
}

/**
 * Creates a spreadsheet inside a specific Google Drive folder.
 */
export async function createSpreadsheetInFolder(
  accessToken: string,
  folderId: string,
  fileName: string
): Promise<{ id: string; name: string }> {
  const url = 'https://www.googleapis.com/drive/v3/files';
  const body = {
    name: fileName,
    mimeType: 'application/vnd.google-apps.spreadsheet',
    parents: [folderId],
  };
  const res = await googleFetch(url, accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { id: res.id, name: res.name || fileName };
}

/**
 * Fetches the raw sheets elements present in a spreadsheet.
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<{ id: string; name: string; sheets: string[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const res = await googleFetch(url, accessToken, { method: 'GET' });
  const sheets = (res.sheets || []).map((s: any) => s.properties.title as string);
  return {
    id: res.spreadsheetId,
    name: res.properties?.title || 'Untitled Sheet',
    sheets,
  };
}

/**
 * Adds worksheets to the spreadsheet.
 */
export async function addWorksheets(
  accessToken: string,
  spreadsheetId: string,
  sheetNames: string[]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const requests = sheetNames.map((name) => ({
    addSheet: {
      properties: {
        title: name,
      },
    },
  }));
  await googleFetch(url, accessToken, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
}

/**
 * Verifies headers in a sheet and automatically appends missing canonical headers if any are absent.
 * Returns the final array of keys (headers) present in the first row.
 */
export async function syncSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  canonicalHeaders: string[]
): Promise<string[]> {
  try {
    // Read the first row (headers)
    const range = `${sheetName}!1:1`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const res = await googleFetch(url, accessToken, { method: 'GET' });

    let existingHeaders: string[] = [];
    if (res.values && res.values.length > 0) {
      existingHeaders = res.values[0].map((h: any) => String(h).trim());
    }

    if (existingHeaders.length === 0) {
      // First row is empty, write full headers
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
      await googleFetch(updateUrl, accessToken, {
        method: 'PUT',
        body: JSON.stringify({
          values: [canonicalHeaders],
        }),
      });
      return canonicalHeaders;
    } else {
      // Find which canonical columns are missing in row 1
      const missingHeaders = canonicalHeaders.filter((title) => !existingHeaders.includes(title));

      if (missingHeaders.length > 0) {
        // Automatically insert/append the missing columns to the right of existing ones
        const combinedHeaders = [...existingHeaders, ...missingHeaders];
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
        await googleFetch(updateUrl, accessToken, {
          method: 'PUT',
          body: JSON.stringify({
            values: [combinedHeaders],
          }),
        });
        return combinedHeaders;
      }

      return existingHeaders;
    }
  } catch (err) {
    console.error(`Error syncing headers for sheet ${sheetName}:`, err);
    throw err;
  }
}

/**
 * Ensures the sheet structure is correct, creating sheets and verifying headers dynamically.
 */
export async function ensureSpreadsheetIntegrity(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  name: string;
  sheets: string[];
  inHeaders: string[];
  outHeaders: string[];
  tankHeaders: string[];
  vehicleHeaders: string[];
  projectHeaders: string[];
  supplierHeaders: string[];
  requestHeaders: string[];
}> {
  // 1. Fetch spreadsheet details
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);

  // 2. Add missing worksheets if needed
  const requiredSheets = [
    'รับเข้า',
    'จ่ายออก',
    'ถังเก็บและวงเงินสิทธิ์',
    'ทะเบียนรถและเครื่องจักร',
    'รายชื่อโครงการและแคมป์งาน',
    'รายชื่อคู่ค้าน้ำมัน',
    'ใบขอซื้อและขอเติมเงินบัตร'
  ];
  const missingSheets = requiredSheets.filter((s) => !details.sheets.includes(s));

  if (missingSheets.length > 0) {
    await addWorksheets(accessToken, spreadsheetId, missingSheets);
    // Refresh details
    const updatedDetails = await getSpreadsheetDetails(accessToken, spreadsheetId);
    details.sheets = updatedDetails.sheets;
  }

  // 3. Sync headers and automatically insert missing headers if they are missing
  const inHeaders = await syncSheetHeaders(accessToken, spreadsheetId, 'รับเข้า', CANONICAL_IN_HEADERS);
  const outHeaders = await syncSheetHeaders(accessToken, spreadsheetId, 'จ่ายออก', CANONICAL_OUT_HEADERS);
  const tankHeaders = await syncSheetHeaders(accessToken, spreadsheetId, 'ถังเก็บและวงเงินสิทธิ์', CANONICAL_TANK_HEADERS);
  const vehicleHeaders = await syncSheetHeaders(accessToken, spreadsheetId, 'ทะเบียนรถและเครื่องจักร', CANONICAL_VEHICLE_HEADERS);
  const projectHeaders = await syncSheetHeaders(accessToken, spreadsheetId, 'รายชื่อโครงการและแคมป์งาน', CANONICAL_PROJECT_HEADERS);
  const supplierHeaders = await syncSheetHeaders(accessToken, spreadsheetId, 'รายชื่อคู่ค้าน้ำมัน', CANONICAL_SUPPLIER_HEADERS);
  const requestHeaders = await syncSheetHeaders(accessToken, spreadsheetId, 'ใบขอซื้อและขอเติมเงินบัตร', CANONICAL_REQUEST_HEADERS);

  return {
    name: details.name,
    sheets: details.sheets,
    inHeaders,
    outHeaders,
    tankHeaders,
    vehicleHeaders,
    projectHeaders,
    supplierHeaders,
    requestHeaders
  };
}

/**
 * Converts a transaction into a structured row array matching the exact sheet columns
 */
export function buildTransactionRow(
  tx: Transaction,
  sheetHeaders: string[],
  tanks: FuelTank[]
): any[] {
  const row = Array(sheetHeaders.length).fill("");
  const tankName = tanks.find((t) => t.id === tx.tankId)?.name || tx.tankId;

  // Formatting date for Thai user (YYYY-MM-DD HH:mm:ss)
  const formattedDate = tx.timestamp.replace('T', ' ');

  if (tx.type === 'OUT') {
    // Map output columns based on headers array
    const mappings: { [key: string]: any } = {
      "วันที่": formattedDate,
      "ชื่อสินค้า (คลัง)": tankName,
      "ราคา": tx.costPerLiter,
      "หน่วยนับ": tx.unit || 'ลิตร',
      "จำนวนที่จ่าย": tx.amount,
      "มูลค่ารวม": tx.totalValue,
      "โครงการ": tx.project || 'ส่วนกลางสำรองทั่วไป',
      "ผู้เบิก/คนขับ": tx.driverName || '-',
      "ทะเบียน": tx.plateNo || '-',
      "หมายเหตุ": tx.notes || '',
      "ผู้บันทึก": tx.recorder || '',
      "ผู้ตรวจสอบ": tx.auditor || (tx.isVerified ? 'ตรวจทานเรียบร้อย' : 'รอตรวจสอบ'),
      "ชื่อเอกสารแนบ": tx.attachmentName || ''
    };

    sheetHeaders.forEach((header, idx) => {
      if (mappings[header] !== undefined) {
        row[idx] = mappings[header];
      }
    });

  } else {
    // Map input columns based on headers array
    const mappings: { [key: string]: any } = {
      "วันที่รับ": formattedDate,
      "เลขที่ใบสั่งซื้อ (PO)": tx.poNo || tx.invoice || '-',
      "เลขที่ใบส่งสินค้า": tx.invoice || '-',
      "ร้านค้า": tx.supplier || '-',
      "ชื่อสินค้า (คลัง)": tankName,
      "หมวดหมู่": tx.category || 'น้ำมันพัสดุดีเซล',
      "ราคา": tx.costPerLiter,
      "หน่วยนับ": tx.unit || 'ลิตร',
      "จำนวนที่ซื้อ": tx.amount,
      "ต้นทุนอื่นๆ": 0,
      "มูลค่ารวม": tx.totalValue,
      "โครงการ": tx.project || 'คลังน้ำมันสำรองส่วนกลาง',
      "สถานที่ส่ง": tx.deliveryPlace || 'ไซต์สำนักงานใหญ่',
      "วันที่ครบกำหนดจ่าย": "",
      "วันที่จ่าย": "",
      "หมายเหตุ": tx.notes || '',
      "ผู้บันทึก": tx.recorder || '',
      "ผู้ตรวจสอบ": tx.auditor || (tx.isVerified ? 'ตรวจทานเรียบร้อย' : 'รอตรวจสอบ'),
      "ชื่อเอกสารแนบ": tx.attachmentName || ''
    };

    sheetHeaders.forEach((header, idx) => {
      if (mappings[header] !== undefined) {
        row[idx] = mappings[header];
      }
    });
  }

  // To prevent duplicates and keep tracking, we can write a hidden column if "ID (ระบบ)" exists,
  // or we can allow custom layouts since mapping is based directly on sheet headers index.
  const sysIdColIdx = sheetHeaders.indexOf("ID (ระบบ)");
  if (sysIdColIdx !== -1) {
    row[sysIdColIdx] = tx.id;
  }

  return row;
}

/**
 * Appends a transaction into its designated spreadsheet tab
 */
export async function appendTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  tx: Transaction,
  sheetHeaders: string[],
  tanks: FuelTank[]
): Promise<void> {
  const sheetName = tx.type === 'IN' ? 'รับเข้า' : 'จ่ายออก';
  const row = buildTransactionRow(tx, sheetHeaders, tanks);

  const range = `${sheetName}!A:A`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  
  await googleFetch(url, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      values: [row],
    }),
  });
}

/**
 * Bulk writes/syncs a batch of transactions into Google Sheets.
 * Reads headers, checks for column consistency, and writes rows.
 */
export async function batchSyncToSheet(
  accessToken: string,
  spreadsheetId: string,
  transactions: Transaction[],
  tanks: FuelTank[],
  inHeaders: string[],
  outHeaders: string[]
): Promise<{ successCount: number; failedCount: number }> {
  let successCount = 0;
  let failedCount = 0;

  // Separate in and out
  const inTxs = transactions.filter((t) => t.type === 'IN');
  const outTxs = transactions.filter((t) => t.type === 'OUT');

  // Push IN rows
  if (inTxs.length > 0) {
    try {
      const rows = inTxs.map((tx) => buildTransactionRow(tx, inHeaders, tanks));
      const range = `'รับเข้า'!A:A`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
      await googleFetch(url, accessToken, {
        method: 'POST',
        body: JSON.stringify({ values: rows }),
      });
      successCount += inTxs.length;
    } catch (err) {
      console.error("Batch write to 'รับเข้า' failed, attempting individually", err);
      for (const tx of inTxs) {
        try {
          await appendTransactionToSheet(accessToken, spreadsheetId, tx, inHeaders, tanks);
          successCount++;
        } catch (_) {
          failedCount++;
        }
      }
    }
  }

  // Push OUT rows
  if (outTxs.length > 0) {
    try {
      const rows = outTxs.map((tx) => buildTransactionRow(tx, outHeaders, tanks));
      const range = `'จ่ายออก'!A:A`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
      await googleFetch(url, accessToken, {
        method: 'POST',
        body: JSON.stringify({ values: rows }),
      });
      successCount += outTxs.length;
    } catch (err) {
      console.error("Batch write to 'จ่ายออก' failed, attempting individually", err);
      for (const tx of outTxs) {
        try {
          await appendTransactionToSheet(accessToken, spreadsheetId, tx, outHeaders, tanks);
          successCount++;
        } catch (_) {
          failedCount++;
        }
      }
    }
  }

  return { successCount, failedCount };
}

/**
 * Overwrites the entire contents of a master list sheet (Tanks, Vehicles, Projects, Suppliers)
 */
export async function writeMasterListToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: any[][]
): Promise<void> {
  // Range includes the header + all rows up to rows.length + 10
  const range = `'${sheetName}'!A1:Z${rows.length + 10}`;
  const values = [headers, ...rows];

  // Try to clear the existing contents of the sheet first to prevent trailing old data
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${sheetName}'!A1:Z1000`)}:clear`;
  await googleFetch(clearUrl, accessToken, { method: 'POST' }).catch(() => {});

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  await googleFetch(updateUrl, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  });
}

export async function syncTanksToSheet(accessToken: string, spreadsheetId: string, tanks: FuelTank[]): Promise<void> {
  const rows = tanks.map(t => [
    t.id,
    t.name,
    t.fuelType,
    t.capacity,
    t.currentLevel,
    t.minThreshold,
    t.basePrice,
    t.unit
  ]);
  await writeMasterListToSheet(accessToken, spreadsheetId, 'ถังเก็บและวงเงินสิทธิ์', CANONICAL_TANK_HEADERS, rows);
}

export async function syncVehiclesToSheet(accessToken: string, spreadsheetId: string, vehicles: Vehicle[]): Promise<void> {
  const rows = vehicles.map(v => [
    v.id,
    v.plateNo,
    v.model,
    v.driver
  ]);
  await writeMasterListToSheet(accessToken, spreadsheetId, 'ทะเบียนรถและเครื่องจักร', CANONICAL_VEHICLE_HEADERS, rows);
}

export async function syncProjectsToSheet(accessToken: string, spreadsheetId: string, projects: string[]): Promise<void> {
  const rows = projects.map(p => [p]);
  await writeMasterListToSheet(accessToken, spreadsheetId, 'รายชื่อโครงการและแคมป์งาน', CANONICAL_PROJECT_HEADERS, rows);
}

export async function syncSuppliersToSheet(accessToken: string, spreadsheetId: string, suppliers: string[]): Promise<void> {
  const rows = suppliers.map(s => [s]);
  await writeMasterListToSheet(accessToken, spreadsheetId, 'รายชื่อคู่ค้าน้ำมัน', CANONICAL_SUPPLIER_HEADERS, rows);
}

export async function syncRequestsToSheet(accessToken: string, spreadsheetId: string, requests: RequestDocument[]): Promise<void> {
  const rows = requests.map(r => [
    r.id,
    r.type === 'FUEL_PURCHASE' ? 'ขอจัดซื้อน้ำมัน' : 'ขอเติมเงินเข้าบัตร',
    r.timestamp ? r.timestamp.replace('T', ' ') : '',
    r.tankId,
    r.amount,
    r.costPerUnit || '-',
    r.totalValue,
    r.supplier || '-',
    r.project || '-',
    r.requester,
    r.status === 'PENDING' ? 'รอดำเนินการ' : (r.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'),
    r.notes || '',
    r.approver || '-',
    r.approvalNotes || '',
    r.approvalDate || '-',
    r.targetDate || '-',
    r.poNo || '-',
    r.isProcessed ? 'ใช่ (เข้าระบบแล้ว)' : 'ยังไม่ใช่'
  ]);
  await writeMasterListToSheet(accessToken, spreadsheetId, 'ใบขอซื้อและขอเติมเงินบัตร', CANONICAL_REQUEST_HEADERS, rows);
}
