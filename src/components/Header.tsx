/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Fuel, Bell, PlusCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { FuelTank } from '../types';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  tanks: FuelTank[];
  onQuickDispense: () => void;
}

export default function Header({ currentTab, onTabChange, tanks, onQuickDispense }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter tanks that are below minimum threshold
  const criticalTanks = tanks.filter(t => t.currentLevel <= t.minThreshold);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'แดชบอร์ดสรุปผลคลังและยอดงบสะสม';
      case 'requests':
        return 'คำเสนอสั่งซื้อน้ำมันดิบ & ขอวงเงินโอนเข้าบัตรงานสนาม';
      case 'dispense':
        return 'บันทึกตัดคลัง / เบิกจ่ายออก (OUT)';
      case 'refill':
        return 'บันทึกเงินหรือรับเข้าน้ำมัน (IN)';
      case 'annual-summary':
        return 'รายงานสรุปการจัดซื้อน้ำมันรายปี (แยกโครงการ)';
      case 'tanks':
        return 'จัดการฐานข้อมูลถังเก็บน้ำมัน (ลิตร)';
      case 'cards':
        return 'จัดการวงเงินและข้อมูลบัตรเงินสด (บาท)';
      case 'vehicles':
        return 'ทะเบียนกองยานพาหนะ & ไซต์โครงการ';
      case 'history':
        return 'ประวัติทำรายการแบบละเอียดและการส่งออกบัญชี';
      case 'cloud-db':
        return 'ตั้งค่าเชื่อมโยงฐานข้อมูล Google Sheets';
      case 'data-management':
        return 'ศูนย์จัดการข้อมูล (นำเข้าข้อมูล CSV / สำรองข้อมูลระบบ)';
      default:
        return 'ระบบบริการคลังน้ำมันอัจฉริยะ';
    }
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 md:px-8 bg-white border-b border-slate-200 flex-shrink-0 z-20">
      <div className="flex items-center gap-4">
        <h2 className="text-sm md:text-lg font-bold text-slate-800 transition-all">
          {getPageTitle(currentTab)}
        </h2>
        <div className="hidden lg:block h-4 w-[1px] bg-slate-200"></div>
        <span className="hidden lg:inline text-xs text-slate-500 font-medium whitespace-nowrap">
          {currentTime}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Alerts Notification dropdown */}
        <div className="relative">
          <button
            onClick={() => setAlertsOpen(!alertsOpen)}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none transition-colors duration-150"
            title="การแจ้งเตือนระดับน้ำมัน/บัตรต่ำ"
          >
            <Bell className="w-5 h-5" />
            {criticalTanks.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white animate-pulse"></span>
            )}
          </button>

          {alertsOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setAlertsOpen(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">การแจ้งเตือนปริมาณเหลือน้อย</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${criticalTanks.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {criticalTanks.length} รายการรับการเตือน
                  </span>
                </div>
                
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {criticalTanks.length > 0 ? (
                    criticalTanks.map((t) => (
                      <div key={t.id} className="px-4 py-3 hover:bg-slate-50 flex items-start gap-3">
                        <div className="p-1 bg-rose-100 text-rose-600 rounded flex-shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 leading-tight">{t.name}</h5>
                          <p className="text-[10px] text-slate-500 mt-1">
                            เหลือเพียง <span className="text-rose-600 font-bold">{t.currentLevel.toLocaleString('th-TH')} {t.unit}</span> (เกณฑ์เตือน {t.minThreshold.toLocaleString('th-TH')} {t.unit})
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400">
                      <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">คลังน้ำมันและบัตรทั้งหมดปกติ</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">ปริมาณสต๊อกสูงกว่าเกณฑ์วิกฤตความปลอดภัย</p>
                    </div>
                  )}
                </div>
                {criticalTanks.length > 0 && (
                  <div className="px-4 py-1.5 bg-slate-50 text-center border-t border-slate-100">
                    <button
                      onClick={() => {
                        onTabChange('tanks');
                        setAlertsOpen(false);
                      }}
                      className="text-[10px] font-bold text-rose-700 hover:underline"
                    >
                      จัดการถังดีเซลคลังเตือนภัย
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Quick Action button */}
        <button
          onClick={onQuickDispense}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">เบิกจ่ายน้ำมันด่วน</span>
          <span className="inline sm:hidden">เบิกด่วน</span>
        </button>
      </div>
    </header>
  );
}
