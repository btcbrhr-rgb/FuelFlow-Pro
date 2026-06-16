/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Layout, BarChart3, PieChart as PieIcon, Gauge, AlertTriangle, 
  Droplet, CreditCard, ShoppingBag, Send 
} from 'lucide-react';
import { DatabaseState, FuelTank, Transaction } from '../types';

interface DashboardTabProps {
  db: DatabaseState;
  onTabChange: (tab: string) => void;
}

const COLORS = ['#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#64748b'];

export default function DashboardTab({ db, onTabChange }: DashboardTabProps) {
  const [yearFilter, setYearFilter] = useState('2026');
  const [monthFilter, setMonthFilter] = useState('ALL');

  // Filtered transactions for calculation
  const filteredTransactions = useMemo(() => {
    return db.transactions.filter(tx => {
      const date = new Date(tx.timestamp);
      const matchYear = date.getFullYear().toString() === yearFilter;
      const matchMonth = monthFilter === 'ALL' ? true : date.getMonth().toString() === monthFilter;
      return matchYear && matchMonth;
    });
  }, [db.transactions, yearFilter, monthFilter]);

  // Calculations for executive cards separated by Oil and Cash/Fleet Cards
  const summaryStats = useMemo(() => {
    // 1. Diesel Fuel (Oil) Stats
    let oilPurchaseVol = 0;
    let oilPurchaseCost = 0;
    let oilDispenseVol = 0;
    let oilDispenseCost = 0;
    
    // 2. Card Balance Stats
    let cardPurchaseVol = 0;
    let cardPurchaseCost = 0;
    let cardDispenseVol = 0;
    let cardDispenseCost = 0;

    // We can lookup tank fuelType to categorize transactions properly
    const tankTypeMap: Record<string, string> = {};
    db.tanks.forEach(t => {
      tankTypeMap[t.id] = t.fuelType; // e.g. "น้ำมันดีเซล" or "บัตรเงินสด"
    });

    filteredTransactions.forEach(tx => {
      const isCard = tankTypeMap[tx.tankId] === 'บัตรเงินสด' || tx.category === 'บัตรเงินสด';
      
      if (tx.type === 'IN') {
        if (isCard) {
          cardPurchaseVol += tx.amount;
          cardPurchaseCost += tx.totalValue;
        } else {
          oilPurchaseVol += tx.amount;
          oilPurchaseCost += tx.totalValue;
        }
      } else if (tx.type === 'OUT') {
        if (isCard) {
          cardDispenseVol += tx.amount;
          cardDispenseCost += tx.totalValue;
        } else {
          oilDispenseVol += tx.amount;
          oilDispenseCost += tx.totalValue;
        }
      }
    });

    // Current inventory total valuation split
    let oilValuation = 0;
    let cardValuation = 0;
    let oilTanksCount = 0;
    let cardCount = 0;
    
    db.tanks.forEach(tank => {
      const isCard = tank.fuelType === 'บัตรเงินสด';
      const valuation = tank.currentLevel * tank.basePrice;
      if (isCard) {
        cardValuation += valuation;
        cardCount++;
      } else {
        oilValuation += valuation;
        oilTanksCount++;
      }
    });

    const oilCriticalCount = db.tanks.filter(t => t.fuelType !== 'บัตรเงินสด' && t.currentLevel <= t.minThreshold).length;
    const cardCriticalCount = db.tanks.filter(t => t.fuelType === 'บัตรเงินสด' && t.currentLevel <= t.minThreshold).length;

    return {
      oil: {
        count: oilTanksCount,
        valuation: oilValuation,
        purchaseVol: oilPurchaseVol,
        purchaseCost: oilPurchaseCost,
        dispenseVol: oilDispenseVol,
        dispenseCost: oilDispenseCost,
        criticalCount: oilCriticalCount,
      },
      card: {
        count: cardCount,
        valuation: cardValuation,
        purchaseVol: cardPurchaseVol,
        purchaseCost: cardPurchaseCost,
        dispenseVol: cardDispenseVol,
        dispenseCost: cardDispenseCost,
        criticalCount: cardCriticalCount,
      }
    };
  }, [db.tanks, filteredTransactions]);

  // Ranking: Stocks Valuation
  const rankedTanks = useMemo(() => {
    return db.tanks
      .map(tank => ({
        ...tank,
        valuation: tank.currentLevel * tank.basePrice,
        percentage: Math.min(100, Math.round((tank.currentLevel / tank.capacity) * 100))
      }))
      .sort((a, b) => b.valuation - a.valuation);
  }, [db.tanks]);

  // Ranking: Site Consumption
  const rankedProjects = useMemo(() => {
    const projectCostMap: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      if (tx.type === 'OUT') {
        const project = tx.project || 'สำรองทั่วไป';
        projectCostMap[project] = (projectCostMap[project] || 0) + tx.totalValue;
      }
    });

    return Object.keys(projectCostMap)
      .map(name => ({
        name,
        value: projectCostMap[name]
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Recharts: 7 Days weekly flow comparison
  const weeklyChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    return last7Days.map(day => {
      const dateStringKey = day.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });
      let dayIn = 0;
      let dayOut = 0;

      db.transactions.forEach(tx => {
        const txDate = new Date(tx.timestamp);
        if (
          txDate.getDate() === day.getDate() &&
          txDate.getMonth() === day.getMonth() &&
          txDate.getFullYear() === day.getFullYear()
        ) {
          if (tx.type === 'IN') {
            dayIn += tx.totalValue;
          } else if (tx.type === 'OUT') {
            dayOut += tx.totalValue;
          }
        }
      });

      return {
        dateName: dateStringKey,
        'รับเข้า/เติมงบ (บาท)': dayIn,
        'เบิกจ่าย/รูดใช้ (บาท)': dayOut
      };
    });
  }, [db.transactions]);

  // Recharts: Pie distribution data
  const pieChartData = useMemo(() => {
    if (rankedProjects.length === 0) {
      return [{ name: 'ไม่มีประวัติการเบิกจ่าย', value: 1 }];
    }
    return rankedProjects.slice(0, 5); // top 5
  }, [rankedProjects]);

  return (
    <div className="space-y-6">
      {/* Critical Alert Banner */}
      {(summaryStats.oil.criticalCount + summaryStats.card.criticalCount) > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 shadow-sm animate-pulse-subtle">
          <div className="p-2 bg-rose-100 text-rose-600 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-800">แจ้งเตือนระบบ: สต๊อกน้ำมัน/บัตรดีเซลถึงจุดเตือนภัยวิกฤต!</h4>
            <p className="text-xs text-rose-600 mt-0.5">
              ตรวจพบมีคลังสินค้าหรือวงเงินบัตรจำนวน {summaryStats.oil.criticalCount + summaryStats.card.criticalCount} แห่ง อยู่ในระดับเท่ากับหรือต่ำกว่าเกณฑ์ความปลอดภัยวิกฤต ควรรีบทำการจัดซื้อหรือจัดงบสำรองเพิ่มเติม
            </p>
          </div>
          <button 
            onClick={() => onTabChange('tanks')}
            className="text-xs font-bold text-rose-700 underline hover:text-rose-900 transition-colors cursor-pointer self-center"
          >
            เปิดดูคลัง
          </button>
        </div>
      )}

      {/* Filter and Top stats header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="font-extrabold text-slate-950 text-base flex items-center gap-2">
              <Layout className="text-amber-500 w-5 h-5 animate-spin-slow" />
              <span>สรุปข้อมูลภาพรวมสต๊อกสินค้าและงบประมาณ (Inventory Dashboard)</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              มูลค่าคงคลัง สถิติยอดเบิกจ่ายตามโครงการสะสม อัตราการใช้สอยงบประมาณเฉลี่ยต่อล็อต
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="2025">ปี พ.ศ. 2568 / 2025</option>
              <option value="2026">ปี พ.ศ. 2569 / 2026</option>
              <option value="2027">ปี พ.ศ. 2570 / 2027</option>
            </select>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="ALL">แสดงทุกเดือนสะสม</option>
              <option value="0">มกราคม</option>
              <option value="1">กุมภาพันธ์</option>
              <option value="2">มีนาคม</option>
              <option value="3">เมษายน</option>
              <option value="4">พฤษภาคม</option>
              <option value="5">มิถุนายน</option>
              <option value="6">กรกฎาคม</option>
              <option value="7">สิงหาคม</option>
              <option value="8">กันยายน</option>
              <option value="9">ตุลาคม</option>
              <option value="10">พฤศจิกายน</option>
              <option value="11">ธันวาคม</option>
            </select>
          </div>
        </div>

        {/* Separated Overview Layout */}
        <div className="space-y-6">
          
          {/* Section A: สรุปภาพรวมน้ำมันดีเซลหมุนเร็ว (ลิตร) */}
          <div className="p-5 rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/20 to-transparent">
            <div className="flex items-center gap-2 mb-3.5">
              <span className="p-1 px-2.5 bg-amber-500 text-slate-950 font-black text-[10px] md:text-xs rounded-lg uppercase tracking-wider">FUEL</span>
              <h4 className="text-slate-950 font-extrabold text-sm md:text-base text-slate-900">1. กลุ่มคลังเก็บน้ำมันดีเซลรวม (หน่วย: ลิตร)</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Inventory Level */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">สต๊อกดีเซลคงเหลือรวม</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl md:text-2xl font-black text-slate-800">
                      {db.tanks.reduce((acc, tank) => tank.fuelType !== 'บัตรเงินสด' ? acc + tank.currentLevel : acc, 0).toLocaleString('th-TH')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">ลิตร</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                  <span>มูลค่าเงินประเมินสต๊อก:</span>
                  <span className="font-bold text-slate-900">
                    ฿{summaryStats.oil.valuation.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Card 2: Purchases IN */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ยอดซื้อน้ำมันรับเข้าสะสม (IN)</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl md:text-2xl font-black text-emerald-600">
                      {summaryStats.oil.purchaseVol.toLocaleString('th-TH')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">ลิตร</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                  <span>ราคาทุนรวมสุทธิ:</span>
                  <span className="font-bold text-slate-900">
                    ฿{summaryStats.oil.purchaseCost.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Card 3: Dispenses OUT */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ยอดเบิกใช้น้ำมันสะสม (OUT)</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl md:text-2xl font-black text-amber-600">
                      {summaryStats.oil.dispenseVol.toLocaleString('th-TH')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">ลิตร</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                  <span>มูลค่าหัวจ่ายรวม:</span>
                  <span className="font-bold text-slate-700">
                    ฿{summaryStats.oil.dispenseCost.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: สรุปวงเงินบัตรเงินสด / บัญชีควบคุมเครดิต (บาท) */}
          <div className="p-5 rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/20 to-transparent">
            <div className="flex items-center gap-2 mb-3.5">
              <span className="p-1 px-2.5 bg-indigo-600 text-white font-black text-[10px] md:text-xs rounded-lg uppercase tracking-wider">CARDS</span>
              <h4 className="text-slate-950 font-extrabold text-sm md:text-base text-slate-900">2. กลุ่มวงเงิน/งบสำรองเครดิตในบัตรจ่ายเงินสด (หน่วย: บาท)</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Fleet Cards Balance */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">วงเงินงบสะสมสำรองทั้งหมด</span>
                  <div className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-[11px] font-bold text-indigo-600 mr-1">฿</span>
                    <span className="text-xl md:text-2xl font-black text-slate-800">
                      {summaryStats.card.valuation.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                  <span>จำนวนบัตรผูกวงเงิน:</span>
                  <span className="font-bold text-slate-900">{summaryStats.card.count} ใบ</span>
                </div>
              </div>

              {/* Card 2: Card Refills IN */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ยอดเงินโอนเข้าบัตรสะสม (IN)</span>
                  <div className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-[11px] font-bold text-emerald-600 mr-1">฿</span>
                    <span className="text-xl md:text-2xl font-black text-emerald-600">
                      {summaryStats.card.purchaseCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                  <span>ครั้งเติมตามใบจ่าย:</span>
                  <span className="font-semibold text-slate-600">เติมเข้าระบบบัญชี</span>
                </div>
              </div>

              {/* Card 3: Card Spendings OUT */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ยอดรูดใช้จ่ายบัตรสะสม (OUT)</span>
                  <div className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-[11px] font-bold text-violet-600 mr-1">฿</span>
                    <span className="text-xl md:text-2xl font-black text-violet-600">
                      {summaryStats.card.dispenseCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                  <span>หักจ่ายสะสมโดยพนักงานเบิก:</span>
                  <span className="font-bold text-slate-600">รูดปั๊มภายนอก</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tops and rankings row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Highest Stock Valuation List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 flex-shrink-0">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-blue-550 text-blue-500" />
              <span>มูลค่าสต๊อกคงเหลือและวงเงินสูงสุดแยกตามคลัง</span>
            </h4>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">มูลค่าประเมินล่าสุด</span>
          </div>
          <div className="space-y-4 flex-1">
            {rankedTanks.map((tank, idx) => {
              const barColor = tank.percentage < 20 
                ? 'bg-rose-500' 
                : (tank.fuelType === 'บัตรเงินสด' ? 'bg-indigo-500' : 'bg-emerald-500');

              return (
                <div key={tank.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[200px] md:max-w-xs">{tank.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono">
                      ฿{tank.valuation.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${barColor} h-full rounded-full`} style={{ width: `${tank.percentage}%` }}></div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 w-8 text-right font-mono">{tank.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Sites Consumption List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 flex-shrink-0">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <PieIcon className="w-4.5 h-4.5 text-purple-550 text-purple-550 text-purple-550 text-purple-500" />
              <span>สัดส่วนยอดการตัดจ่ายสะสมสูงสุดแบ่งตามไซท์งาน</span>
            </h4>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">มูลค่าตัดจ่ายสะสม</span>
          </div>
          
          <div className="space-y-4 flex-1">
            {rankedProjects.length > 0 ? (
              rankedProjects.slice(0, 5).map((proj, idx) => {
                const highestVal = rankedProjects[0]?.value || 1;
                const relativePct = Math.round((proj.value / highestVal) * 105);
                const showPct = Math.min(100, relativePct);
                
                return (
                  <div key={proj.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 max-w-[70%]">
                        <span className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center font-bold text-[10px] text-purple-600">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-800 truncate" title={proj.name}>
                          {proj.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">
                        ฿{proj.value.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${showPct}%` }}></div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 w-8 text-right font-mono">{showPct}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-6">
                <p className="text-xs font-semibold">ไม่มีประวัติการตัดจ่ายตรวจพบในงวดข้อมูลสืบค้น</p>
                <p className="text-[10px] text-slate-400 mt-1">สามารถเปลี่ยนเงื่อนไขสืบค้นหรือจดบันทึกยอดขึ้นใหม่</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fluid Tank display */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 pl-1">
          <Gauge className="w-4.5 h-4.5 text-slate-500" />
          <span>ระดับน้ำมันในถังเก็บจริงและยอดงบในบัตรเงินสดแบบเรียลไทม์</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {db.tanks.map(t => {
            const isCritical = t.currentLevel <= t.minThreshold;
            const percent = Math.min(100, Math.round((t.currentLevel / t.capacity) * 100));
            const isCard = t.fuelType === 'บัตรเงินสด';

            let bgClass = "bg-amber-100 text-amber-800";
            let waveColor = "rgba(245, 158, 11, 0.65)"; // amber-500
            let bottomFillColor = "bg-amber-500/75";

            if (isCritical) {
              bgClass = "bg-rose-100 text-rose-800";
              waveColor = "rgba(239, 68, 68, 0.68)"; // rose-500
              bottomFillColor = "bg-rose-500/75";
            } else if (isCard) {
              bgClass = "bg-indigo-100 text-indigo-800";
              waveColor = "rgba(99, 102, 241, 0.68)"; // indigo-500
              bottomFillColor = "bg-indigo-505 bg-indigo-500/75";
            } else if (percent > 60) {
              bgClass = "bg-emerald-100 text-emerald-800";
              waveColor = "rgba(16, 185, 129, 0.65)"; // emerald-500
              bottomFillColor = "bg-emerald-500/75";
            }

            return (
              <div 
                key={t.id} 
                className={`bg-white p-5 rounded-2xl border ${isCritical ? 'border-rose-200 shadow-sm' : 'border-slate-200'} shadow-sm flex flex-col justify-between overflow-hidden relative`}
              >
                <div className="flex items-start justify-between z-10 relative">
                  <div>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${bgClass}`}>
                      {t.fuelType}
                    </span>
                    <h4 className="font-bold text-slate-800 text-xs mt-2 leading-snug">{t.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">คงคลังสะสม</span>
                    <p className="font-black text-slate-800 text-sm mt-0.5 whitespace-nowrap">
                      {t.currentLevel.toLocaleString('th-TH')} <span className="text-[9px] font-bold text-slate-500">{t.unit}</span>
                    </p>
                  </div>
                </div>

                {/* Animated wave simulation */}
                <div className="my-5 relative h-28 w-full bg-slate-50 border border-slate-150 rounded-xl overflow-hidden flex flex-col justify-end">
                  <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-slate-800/15 z-10 select-none font-mono">
                    {percent}%
                  </div>
                  <div className="w-full absolute bottom-0 left-0 transition-all duration-1000" style={{ height: `${percent}%` }}>
                    <svg className="absolute w-[200%] h-4 -top-3 left-0 animate-liquid-wave opacity-50" viewBox="0 0 1200 120" preserveAspectRatio="none">
                      <path 
                        d="M0,60 C150,100 350,20 500,60 C650,100 850,20 1000,60 C1150,100 1350,20 1500,60 L1500,120 L0,120 Z" 
                        fill={waveColor}
                      ></path>
                    </svg>
                    <div className={`w-full h-full ${bottomFillColor}`}></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 z-10">
                  <span>พิกัดบรรจุ: {t.capacity.toLocaleString('th-TH')} {t.unit}</span>
                  <span className={`${isCritical ? 'text-rose-500 font-black' : ''}`}>เกณฑ์แจ้งเตือน: {t.minThreshold.toLocaleString('th-TH')} {t.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Charts Comparison Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly flow bar chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[340px]">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-850 text-slate-800">เปรียบเทียบวงเงินในงวด (รับเข้า IN vs ตัดออก OUT)</h3>
              <p className="text-[11px] text-slate-400">ข้อมูลรวมสะสมตามมูลค่าเทียบระดับเงินบาทจริงย้อนหลัง 7 วันทำงานล่าสุด</p>
            </div>
            <div className="flex items-center gap-2.5 text-[10px]">
              <span className="flex items-center gap-1 font-bold text-slate-600">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>รับเข้า/ฝากเงิน
              </span>
              <span className="flex items-center gap-1 font-bold text-slate-600">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>เบิกใช้/รูดจ่าย
              </span>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                barSize={18}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="dateName" 
                  tick={{ fontSize: 9, fill: '#64748b' }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: '#64748b' }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  tickFormatter={(val) => '฿' + (val >= 1000 ? (val / 1000) + 'k' : val)}
                />
                <Tooltip 
                  formatter={(value: any) => [`฿${parseFloat(value).toLocaleString('th-TH')}`, '']}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="รับเข้า/เติมงบ (บาท)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="เบิกจ่าย/รูดใช้ (บาท)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenditure Pie Distribution by Project */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[340px]">
          <div className="mb-2 flex-shrink-0">
            <h3 className="text-sm font-bold text-slate-800">สัดส่วนการใช้น้ำมันตามโครงการ (Top 5)</h3>
            <p className="text-[11px] text-slate-400">จำแนกสัดส่วนต้นทุนตามโครงการปลายทาง</p>
          </div>
          
          <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
            {rankedProjects.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`฿${parseFloat(value).toLocaleString('th-TH')}`, '']}
                    contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconSize={8}
                    iconType="circle"
                    formatter={(value) => <span className="text-[9px] text-slate-500 font-bold truncate max-w-[100px] inline-block">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 p-8">
                <PieIcon className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold mt-2">ยังไม่มีข้อมูลการเบิกจ่าย</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
