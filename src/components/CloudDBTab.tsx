/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileSpreadsheet, Folder, LogIn, Link2, RefreshCw, LogOut, CloudOff, Info, Settings, HelpCircle
} from 'lucide-react';
import { DatabaseState } from '../types';

interface CloudDBTabProps {
  db: DatabaseState;
  showToast: (title: string, message: string, type?: 'success' | 'danger' | 'info') => void;
  
  // Google Sheets integration props
  syncedTxIds: string[];
  googleAccessToken: string | null;
  spreadsheetId: string;
  driveFolderId: string;
  isAutoSync: boolean;
  onSetGoogleAccessToken: (token: string | null) => void;
  onSetSpreadsheetId: (id: string) => void;
  onSetDriveFolderId: (id: string) => void;
  onSetIsAutoSync: (active: boolean) => void;
  onTriggerSyncAll: () => Promise<void>;
  onTriggerVerifyIntegrity: () => Promise<void>;
  onTriggerAutoCreate: () => Promise<void>;
  onTriggerImportFromGSheet: () => Promise<void>;
}

export default function CloudDBTab({
  db,
  showToast,
  syncedTxIds,
  googleAccessToken,
  spreadsheetId,
  driveFolderId,
  isAutoSync,
  onSetGoogleAccessToken,
  onSetSpreadsheetId,
  onSetDriveFolderId,
  onSetIsAutoSync,
  onTriggerSyncAll,
  onTriggerVerifyIntegrity,
  onTriggerAutoCreate,
  onTriggerImportFromGSheet,
}: CloudDBTabProps) {
  // Loaders
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Connection settings states
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('smart_fuel_client_id') || '');
  const [manualToken, setManualToken] = useState('');
  const [showIdSettings, setShowIdSettings] = useState(false);

  const handleSpreadsheetIdChange = (val: string) => {
    let finalId = val.trim();
    const googleSheetUrlRegex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = finalId.match(googleSheetUrlRegex);
    if (match && match[1]) {
      finalId = match[1];
      showToast("ถอดรหัสเชื่อมต่อสำเร็จ", "วิเคราะห์และดึง Spreadsheet ID จากลิงก์ที่คุณวางโดยอัตโนมัติแล้ว!", "success");
    }
    onSetSpreadsheetId(finalId);
  };

  const requestGoogleToken = () => {
    const cid = googleClientId.trim() || '835740439600-dbj8g5v22f87nvsdfglv2mklq2pqb8d2.apps.googleusercontent.com';
    try {
      if (!(window as any).google?.accounts?.oauth2) {
        showToast("สคริปต์ Google ไม่พร้อมใช้งาน", "กรุณารีเฟรชหน้าเว็บและลองตั้งค่าเชื่อมต่อใหม่อีกครั้ง", "danger");
        return;
      }
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: cid,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            showToast("สิทธิ์การเข้าถึงถูกปฏิเสธ", "Google OAuth: " + response.error, "danger");
            return;
          }
          if (response.access_token) {
            onSetGoogleAccessToken(response.access_token);
            if (googleClientId) {
              localStorage.setItem('smart_fuel_client_id', googleClientId);
            }
            showToast("ลงชื่อเข้าใช้สำเร็จ", "เชื่อมโยงกับบัญชีคลาวด์ Google เรียบร้อยแล้ว", "success");
          }
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      console.error(err);
      showToast("ไม่สามารถเรียกใช้ Google Auth ได้", err.message || "กำลังตรวจพบข้อผิดพลาดปุ่มเชื่อมโยง", "danger");
    }
  };

  const executeActionWithLoading = async (
    action: () => Promise<void>,
    setLoader: (val: boolean) => void,
    successMsg: string
  ) => {
    setLoader(true);
    try {
      await action();
      showToast("ดำเนินการสำเร็จ", successMsg, "success");
    } catch (err: any) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดคลาวด์", err.message || "ไม่สามารถติดต่อ Google Sheets ได้ กรุณาตรวจสอบสิทธิ์เชื่อมโยง", "danger");
    } finally {
      setLoader(false);
    }
  };

  const pendingSyncsCount = db.transactions.filter(t => !syncedTxIds.includes(t.id)).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Banner Section */}
        <div className="bg-slate-900 px-6 py-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/15 text-amber-400 font-extrabold text-[10px] uppercase tracking-wider rounded-full border border-amber-500/20">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
                Cloud Database Integration
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">ระบบเชื่อมโยงฐานข้อมูล Google Sheets</h1>
              <p className="text-xs text-slate-300 md:max-w-xl leading-relaxed">
                เชื่อมต่อระบบเข้ากับสารบรรณ Google Sheets ของคุณ เพื่อใช้เป็นฐานข้อมูลคลาวด์จัดเก็บรายการซื้อเข้า-จ่ายออกแบบเรียลไทม์ 
                รองรับการทำงานหลายอุปกรณ์ผ่านคลาวด์และการเพิ่มคอลัมน์อัตโนมัติ
              </p>
            </div>

            {googleAccessToken && (
              <div className="flex gap-2">
                <div className="bg-emerald-500/10 border border-emerald-500/25 px-4 py-3 rounded-2xl flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div className="text-xs font-bold">
                    <p className="text-emerald-400">สถานะคลาวด์: เชื่อมต่อแล้ว</p>
                    <p className="text-slate-400 text-[10px] font-medium">Google Drive & Sheets API Active</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="absolute right-0 bottom-0 opacity-10 translate-y-6 translate-x-6 z-0">
            <FileSpreadsheet className="w-64 h-64" />
          </div>
        </div>

        {/* Tab Sub Header & Configuration Trigger */}
        <div className="border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 gap-4 text-xs font-bold">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>ซิงค์ประวัติจัดเก็บดีเซล ไซต์งาน บุรีรัมย์ธงชัยก่อสร้าง ลงสมุดงานของคุณแบบปลอดภัย</span>
          </div>
        </div>

        {/* Integration Panel Core */}
        <div className="p-6">
          {!googleAccessToken ? (
            <div className="max-w-2xl mx-auto space-y-6 py-2">
              
              {/* Header explaining status */}
              <div className="text-center space-y-2">
                <div className="p-4 bg-emerald-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-emerald-600">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-base">คู่มือเชื่อมต่อ Google Sheets ประจำไซต์งานแบบง่าย ⚡</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto font-medium">
                  เน้นใช้งานง่าย หลีกเลี่ยงข้อผิดพลาดระบบเครือข่ายด้วยวิธีดึงรหัสความปลอดภัยโดยตรง ดังนี้ค่ะ
                </p>
              </div>

              {/* Step-by-Step Box */}
              <div className="bg-white border border-emerald-100 rounded-2xl p-6 space-y-5 shadow-xs">
                
                {/* Title */}
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs pb-3 border-b border-slate-150">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span>ทำตาม 3 ขั้นตอนด้านล่างนี้ใช้เวลาไม่เกิน 1 นาทีค่ะ</span>
                </div>

                {/* Steps List */}
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 text-xs leading-relaxed">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] shrink-0 mt-0.5">1</span>
                    <div className="space-y-2">
                      <p className="font-extrabold text-slate-800">กดเปิดหน้าขอรหัสอำนวยความสะดวกสะบาย</p>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        คลิกเปิดหน้าของกูเกิลที่ลิงก์ด้านล่างนี้ ระบบจะนำทางขอสิทธิ์เขียนกระดาษตารางและเข้าถึงข้อมูลไฟล์เพื่อตรวจสอบโฟลเดอร์สำหรับสำรองข้อมูล:
                      </p>
                      <a 
                        href="https://developers.google.com/oauthplayground/#step1&scopes=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg transition-all shadow-xs cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>เปิดหน้าจอรับสิทธิ์จาก Google (Pre-filled OAuth) ↗</span>
                      </a>
                    </div>
                  </div>

                  {/* Anti-scope warning notice */}
                  <div className="ml-8 p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-950 space-y-1.5">
                    <p className="font-black text-rose-900 flex items-center gap-1">
                      ⚠️ แก้ไขปัญหา "Request had insufficient authentication scopes"
                    </p>
                    <p className="leading-relaxed">
                      หากกูเกิลส่งข้อความแจ้งเตือนข้อผิดพลาดเรื่องสิทธิ์ ให้มองหาช่องพิมพ์ด้านซ้ายล่างสุดของตัวค้นหาใน Step 1 ที่เขียนว่า <strong className="font-extrabold text-rose-900">"Input your own scopes"</strong> แล้วคัดลอกข้อความสิทธิ์ขอด้านล่างนี้ไปวางในช่องนั้นทั้งหมด:
                    </p>
                    <div className="bg-white p-2 border border-rose-200 rounded font-mono text-[10px] select-all break-all font-bold text-slate-800 text-center">
                      https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive
                    </div>
                    <p className="text-[10px] text-rose-800">
                      เมื่อวางสิทธิ์ (คั่นด้วยวรรคเดียว) ลงในช่องนั้นแล้ว ให้กดปุ่มสีน้ำเงิน <strong className="font-bold">Authorize APIs</strong> ด้านขวาของช่องดังกล่าวเพื่อเข้าสู่ขั้นตอนรับรองผลค่ะ
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 text-xs leading-relaxed">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="font-extrabold text-slate-800">กดยื่นรับสิทธิ์ฝั่งซ้ายของหน้าจอ</p>
                      <p className="text-slate-500 text-[11px]">
                        เมื่อหน้าเว็บของกูเกิลเปิดขึ้นมา และคุณคัดลอกสิทธิ์ใส่เรียบร้อยแล้ว ให้กดปุ่มสีน้ำเงินบนเมนูด้านซ้าย <strong className="text-blue-750 font-black bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Authorize APIs</strong> 
                        กูเกิลจะขึ้นหน้าต่างให้เลือกบัญชีอีเมล Google ของท่าน ให้กดเลือกและกดตกลงอนุญาตขอยินยอมให้สิทธิ์เข้าถึงค่ะ
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 text-xs leading-relaxed">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] shrink-0 mt-0.5">3</span>
                    <div>
                      <p className="font-extrabold text-slate-800">กดปุ่มสีฟ้าเพื่อรับรหัสคีย์ และคัดลอกมาวางด้านล่าง</p>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        เมื่อระบบกูเกิลส่งกลับมาหน้าจอเดิม ให้กดปุ่มสีฟ้าตรงกลางที่เขียนว่า <strong className="text-emerald-800 font-bold bg-emerald-50 px-1 rounded border border-emerald-200">Exchange authorization code for tokens</strong> 
                        จากนั้นสังเกตแถบข้อมูลฝั่งขวาล่าง หาหัวข้อที่ระบุว่า <strong className="text-emerald-950 font-extrabold bg-emerald-100 px-1 py-0.5 rounded">Access Token:</strong> 
                        (จะเป็นข้อความยาวๆ ที่ขึ้นต้นด้วย <strong className="text-emerald-950 font-mono">ya29...</strong>) ให้คัดลอกรหัสในช่องนี้ทั้งหมดมาวางลงในกล่องด้านล่างเลยค่ะ
                      </p>
                    </div>
                  </div>
                </div>

                {/* Paste Input Container - Only ONE central clearly defined input field */}
                <div className="mt-4 pt-4 border-t border-slate-150 space-y-2.5">
                  <label className="block text-[11px] font-black text-emerald-950 uppercase tracking-wider">
                    ▼ วางรหัสความยินยอม Access Token ที่คัดลอกมาในช่องข้างล่างนี้ค่ะ
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      placeholder="วางรหัสด่วนยาวๆ ที่ขึ้นต้นด้วย ya29... วางตรงนี้ได้เลยค่ะ"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="w-full px-4 py-3 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const tokenStr = manualToken.trim();
                        if (tokenStr) {
                          onSetGoogleAccessToken(tokenStr);
                          showToast("เชื่อมโยง Google Sheets สำเร็จ!", "พร้อมซิงก์ประวัติการรับ-จ่ายคลังน้ำมันดีเซลไซต์งานแล้วค่ะ", "success");
                          setManualToken('');
                        } else {
                          showToast("กรุณากรอกรหัส", "กรุณาวางรหัส Access Token ที่ขึ้นต้นด้วย ya29... ก่อนกดเชื่อมต่อข้อมูลนะคะ", "danger");
                        }
                      }}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-xl transition text-[11px] whitespace-nowrap shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>เชื่อมต่อฐานข้อมูลชีต ⚡</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Simplified Dev footer */}
              <div className="text-center font-medium">
                <p className="text-[10px] text-slate-400">
                  ℹ️ วิธีนี้ช่วยเลี่ยงปัญหา "invalid_client 401" ได้แบบสมบูรณ์และปลอดภัย 100% (สิทธิ์ใช้บริการจะมีอายุประมาณ 60 นาทีต่อครั้ง)
                </p>
              </div>

            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Connected Settings block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-semibold">
                
                {/* Drive Folder details */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-750/90 rounded-xl shrink-0">
                      <Folder className="w-4 h-4 text-indigo-650" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">โฟลเดอร์โครงการบน Drive</p>
                      <p className="font-extrabold text-slate-700 truncate max-w-[150px] leading-snug">
                        {driveFolderId ? `ID: ${driveFolderId}` : "สแกนหาโฟลเดอร์หลัก..."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Spreadsheet ID & Cloud Link */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 md:col-span-2 flex flex-col justify-center space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">ไอดีสมุดระเบียนบัญชี (Spreadsheet ID)</p>
                    {spreadsheetId && (
                      <a 
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-emerald-600 hover:underline font-extrabold flex items-center gap-1 leading-none"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>เปิดแผ่นงานบัญชีใน Google Sheets ↗</span>
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={spreadsheetId}
                      onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
                      placeholder="วางลิงก์ Google Sheets ทั้งหมด หรือกรอกไอดี Spreadsheet ID ของคุณที่นี่..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    {!spreadsheetId && (
                      <button
                        onClick={() => executeActionWithLoading(onTriggerAutoCreate, setIsCreating, "สร้างแฟ้มข้อมูล Google Sheets นำเข้า 'สมาร์ทฟิว-คาร์แลนด์' และสร้างถังพร้อมคอลัมน์แล้ว")}
                        disabled={isCreating}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:bg-slate-300 transition shrink-0 whitespace-nowrap text-xs shadow-sm cursor-pointer"
                      >
                        {isCreating ? "กำลังตั้งค่าตั้งต้น..." : "สร้างสารบรรณใหม่ทันที"}
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Action Toolbar buttons */}
              <div className="p-5 bg-emerald-50/20 rounded-2xl border border-emerald-150 flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div className="flex gap-3.5 items-start">
                  <div className="p-3 bg-emerald-100 rounded-xl h-fit shrink-0 mt-1">
                    <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin-slow" />
                  </div>
                  <div className="text-xs space-y-3">
                    <p className="font-extrabold text-emerald-950 text-sm">การจัดรูปแบบโมเดลโครงสร้างตาราง (ครบถ้วนทั้ง 6 แผ่นงานหลักในไฟล์เดียว)</p>
                    
                    {/* Visual Grid representing all 6 sheets */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-xl">
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 shadow-3xs">
                        <span className="text-sm">📥</span>
                        <div>
                          <p className="font-extrabold text-slate-800 text-[10px]">1. ประวัติรับเข้า</p>
                          <p className="text-[9px] text-slate-400 font-medium">เก็บใบเสร็จ/POซื้อน้ำมัน</p>
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 shadow-3xs">
                        <span className="text-sm">📤</span>
                        <div>
                          <p className="font-extrabold text-slate-800 text-[10px]">2. ประวัติจ่ายออก</p>
                          <p className="text-[9px] text-slate-400 font-medium">เก็บยอดเบิกจ่ายหัวจ่าย/รถ</p>
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 shadow-3xs">
                        <span className="text-sm">⛽</span>
                        <div>
                          <p className="font-extrabold text-slate-800 text-[10px]">3. ถังน้ำมัน/บัตรน้ำมัน</p>
                          <p className="text-[9px] text-slate-400 font-medium">ถังพัสดุและบัตรวงเงิน</p>
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 shadow-3xs">
                        <span className="text-sm">🚜</span>
                        <div>
                          <p className="font-extrabold text-slate-800 text-[10px]">4. เลขทะเบียนรถ/เครื่องจักร</p>
                          <p className="text-[9px] text-slate-400 font-medium">ยานพาหนะเบิกจ่าย</p>
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 shadow-3xs">
                        <span className="text-sm">🏗️</span>
                        <div>
                          <p className="font-extrabold text-slate-800 text-[10px]">5. โครงการ/ไซต์งาน</p>
                          <p className="text-[9px] text-slate-400 font-medium">แคมป์ก่อสร้างและหน้างาน</p>
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 shadow-3xs">
                        <span className="text-sm">🏢</span>
                        <div>
                          <p className="font-extrabold text-slate-800 text-[10px]">6. ร้านค้า/คู่ค้าน้ำมัน</p>
                          <p className="text-[9px] text-slate-400 font-medium">ทะเบียนพันธมิตรซัพพลาย</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-800 leading-relaxed max-w-2xl font-medium">
                      เมื่อท่านกดปุ่ม <b>"สแกนตรวจสอบ & เตรียมคอลัมน์"</b> ด้านล่างนี้ ระบบจะตรวจสอบว่าแผ่นงาน (Tabs) ทั้ง 6 ตัวมีอยู่ครบหรือไม่ หากมีตัวใดขาดหายไป ระบบจะสร้างขึ้นมาให้ใหม่ทันที พร้อมจัดสรรคอลัมน์ภาษาไทยที่สมบูรณ์ และป้อนข้อมูลรายชื่อถังน้ำมัน ทะเบียนรถ ไซต์งาน และคู่ค้าที่อยู่ในเครื่องของท่านขึ้น Google Sheets ให้พร้อมใช้งานทันทีโดยไม่ทำลายข้อมูลดิบเดิมค่ะ
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap lg:flex-nowrap gap-2.5 shrink-0 xl:self-center">
                  <button
                    onClick={() => executeActionWithLoading(onTriggerVerifyIntegrity, setIsVerifying, "ตรวจสอบและสร้างชีตทั้ง 6 บัญชีเสร็จสิ้น พร้อมส่งออกข้อมูลถังน้ำมัน, ยานพาหนะ, ไซต์งาน และคู่ค้าเรียบร้อยแล้วค่ะ")}
                    disabled={isVerifying || !spreadsheetId}
                    className="px-4 py-3 bg-white hover:bg-slate-50 border border-slate-250 text-slate-800 text-xs font-extrabold rounded-xl shadow-xs transition disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer flex items-center gap-1.5"
                  >
                    {isVerifying ? "🕵️ กำลังสแกนตรวจสอบ..." : "⚡ สแกนตรวจสอบ & เตรียมคอลัมน์"}
                  </button>

                  <button
                    onClick={() => executeActionWithLoading(onTriggerSyncAll, setIsSyncing, `ซิงค์ธุรกรรมรวมที่ทำรายการแล้วขึ้นชีตสำเร็จ`)}
                    disabled={isSyncing || !spreadsheetId || pendingSyncsCount === 0}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition disabled:bg-slate-350 cursor-pointer"
                  >
                    {isSyncing ? "กำลังส่งข้อมูล..." : pendingSyncsCount === 0 ? "ประวัติซิงก์ตรงกันครบแล้ว (0)" : `ส่งประวัติใหม่ขึ้น Google Sheets (${pendingSyncsCount} รายการ)`}
                  </button>

                  <button
                    onClick={() => executeActionWithLoading(onTriggerImportFromGSheet, setIsImporting, "ดึงข้อมูลแถวประวัติจัดซื้อ/จ่ายจาก Google Sheets กลับมาประกอบบัญชีในเครื่องสำเร็จ")}
                    disabled={isImporting || !spreadsheetId}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md transition disabled:bg-slate-300 cursor-pointer"
                  >
                    {isImporting ? "กำลังดึงชีต..." : "ดาวน์โหลดชีตลงเครื่องกู้คืน"}
                  </button>
                </div>
              </div>

              {/* Bottom Switch / Sync Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-150 gap-4">
                <label className="flex items-start sm:items-center gap-3.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAutoSync}
                    onChange={(e) => onSetIsAutoSync(e.target.checked)}
                    className="w-4.5 h-4.5 accent-emerald-600 rounded transition outline-none"
                  />
                  <div className="text-xs">
                    <p className="font-extrabold text-slate-800">ส่งข้อมูลอัตโนมัติเบื้องหลัง (Background Real-time Auto-Sync)</p>
                    <p className="text-[10px] text-slate-400 font-medium">เมื่อคนคุมบันทึกหรือจ่ายเบิกน้ำมันสำเร็จ จะส่งแถวไปเก็บบน Google Sheets ให้ทันทีโดยไม่ต้องกดอัปโหลดเอง manual</p>
                  </div>
                </label>

                <button
                  onClick={() => {
                    onSetGoogleAccessToken(null);
                    showToast("ออกจากระบบแล้ว", "ตัดการเชื่อมโยงกับชีตภายนอกเสร็จเรียบร้อย", "info");
                  }}
                  className="font-bold text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1.5 hover:bg-rose-50 px-3 py-2 rounded-xl transition md:self-auto"
                >
                  <LogOut className="w-4 h-4 animate-pulse-slow" />
                  <span>ยกเลิกผูกบัญชี (Logout Account)</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
