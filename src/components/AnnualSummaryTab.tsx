/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { CalendarDays, Wallet, Tag, Table as TableIcon, Download, Droplet, CreditCard } from 'lucide-react';
import { DatabaseState, FuelTank, Transaction } from '../types';

interface AnnualSummaryTabProps {
  db: DatabaseState;
  showToast: (title: string, message: string, type?: 'success' | 'danger' | 'info') => void;
}

export default function AnnualSummaryTab({ db, showToast }: AnnualSummaryTabProps) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedTankType, setSelectedTankType] = useState<'DIESEL' | 'CARD'>('DIESEL');
  const [selectedProject, setSelectedProject] = useState('ALL');

  // Generate 12 months placeholder array
  const monthsList = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2026, i, 1);
      return {
        monthIndex: i,
        monthName: date.toLocaleString('th-TH', { month: 'long' }),
      };
    });
  }, []);

  // Filter & calculate matching purchase transactions
  const aggregatedMonthlyData = useMemo(() => {
    const monthlyAggregated = monthsList.map(m => ({
      ...m,
      totalQty: 0,
      totalCost: 0,
    }));

    db.transactions.forEach((tx) => {
      if (tx.type !== 'IN') return;

      const txDate = new Date(tx.timestamp);
      if (txDate.getFullYear() !== selectedYear) return;

      if (selectedProject !== 'ALL' && tx.project !== selectedProject) return;

      // Classify tank type
      const tank = db.tanks.find((t) => t.id === tx.tankId);
      if (!tank) return;

      const isCard = tank.fuelType === 'บัตรเงินสด';
      if (selectedTankType === 'DIESEL' && isCard) return;
      if (selectedTankType === 'CARD' && !isCard) return;

      const month = txDate.getMonth();
      monthlyAggregated[month].totalQty += tx.amount;
      monthlyAggregated[month].totalCost += tx.totalValue;
    });

    return monthlyAggregated.map(month => {
      const avgPrice = month.totalQty > 0 ? month.totalCost / month.totalQty : 0;
      return {
        ...month,
        avgPrice: selectedTankType === 'DIESEL' ? avgPrice : 1.0,
      };
    });
  }, [db.transactions, db.tanks, selectedYear, selectedTankType, selectedProject, monthsList]);

  // Year performance totals
  const totals = useMemo(() => {
    let yearTotalQty = 0;
    let yearTotalCost = 0;

    aggregatedMonthlyData.forEach((m) => {
      yearTotalQty += m.totalQty;
      yearTotalCost += m.totalCost;
    });

    const yearAveragePrice = yearTotalQty > 0 ? yearTotalCost / yearTotalQty : 0;

    return {
      totalQty: yearTotalQty,
      totalCost: yearTotalCost,
      averagePrice: selectedTankType === 'DIESEL' ? yearAveragePrice : 1.0,
    };
  }, [aggregatedMonthlyData, selectedTankType]);

  const exportAnnualToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += `รายงานสรุปผลการจัดซื้อรายปีประจำปีงบประมาณ,${selectedYear}\n`;
    csvContent += `ตัวกรองประเภทคลัง,${selectedTankType === 'DIESEL' ? 'เฉพาะคลังน้ำมันดีเซล (ลิตร)' : 'เฉพาะวงเงินเติมเข้าบัตรเครดิตองค์กร (บาท)'}\n`;
    csvContent += `ตัวกรองโครงการก่อสร้าง,${selectedProject === 'ALL' ? 'รวมทุกโครงการ' : selectedProject}\n\n`;

    const qtyHeader = selectedTankType === 'DIESEL' ? 'จำนวนที่จัดซื้อ (ลิตร)' : 'จำนวนที่เติมเข้าบัตร (บาท)';
    const avgHeader = selectedTankType === 'DIESEL' ? 'ราคาเฉลี่ยต่อลิตร (บาท)' : 'ราคาอ้างอิงเฉลี่ย (บาท)';
    csvContent += `เดือน,${qtyHeader},รวมเป็นเงินจัดซื้อ (บาท),${avgHeader}\n`;

    aggregatedMonthlyData.forEach((row) => {
      csvContent += `"${row.monthName}","${row.totalQty}","${row.totalCost}","${row.avgPrice}"\n`;
    });

    csvContent += `\n"รวมเป็นทั้งปี","${totals.totalQty}","${totals.totalCost}","${totals.averagePrice}"\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `รายงานสรุปจัดซื้อรายปี_${selectedYear}_${selectedTankType}_โครงการ_${selectedProject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("ดาวน์โหลดสำเร็จ", "ระบบได้ส่งออกข้อมูลจัดซื้อรายปีประกอบงบประมาณเรียบร้อยแล้ว", "success");
  };

  // Setup visual charts datasets
  const chartRepresentation = useMemo(() => {
    return aggregatedMonthlyData.map((m) => ({
      name: m.monthName.slice(0, 5), // short month names
      'ปริมาณที่เติม': m.totalQty,
      'ยอดเงินรวม (บาท)': m.totalCost,
    }));
  }, [aggregatedMonthlyData]);

  const unitLabel = selectedTankType === 'DIESEL' ? 'ลิตร' : 'บาท';

  return (
    <div className="space-y-6">
      {/* Filter panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex-shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-950 text-base">รายงานวิเคราะห์สรุปยอดการจัดซื้อน้ำมันรายเดือนสะสมปี</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามปริมาณการสั่งจัดหาดีเซลหมุนเร็วและวงเงินสำรองบัตรเงินสด พร้อมสถิติคำนวณราคาเฉลี่ยต่อล็อตและงบประมาณสะสมรายโครงการ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-555 text-slate-500 uppercase tracking-wide mb-1.5">
              เลือกปีงบประมาณทำงาน
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white text-slate-800"
            >
              <option value="2025">ปี พ.ศ. 2568 / 2025</option>
              <option value="2026">ปี พ.ศ. 2569 / 2026</option>
              <option value="2027">ปี พ.ศ. 2570 / 2027</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-555 text-slate-500 uppercase tracking-wide mb-1.5">
              ประเภทคุมสอบคลัง (แยกส่วน)
            </label>
            <select
              value={selectedTankType}
              onChange={(e) => setSelectedTankType(e.target.value as 'DIESEL' | 'CARD')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-555 focus:ring-indigo-550 focus:ring-indigo-600 font-bold bg-indigo-50/50 text-indigo-700"
            >
              <option value="DIESEL">⛽ เฉพาะคลังเติมน้ำมันดีเซลหมุนเร็ว (ลิตร)</option>
              <option value="CARD">💳 เฉพาะการเติมเงินเข้าบัตรเครดิต/เงินสด (บาท)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-555 text-slate-500 uppercase tracking-wide mb-1.5">
              คัดเลือกเป้าหมายโครงการไซต์งาน
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold bg-white text-slate-850"
            >
              <option value="ALL">รวมประวัติคลังทุกโครงการก่อสร้าง</option>
              {db.projects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3 Executive widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            {selectedTankType === 'DIESEL' ? <Droplet className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
              {selectedTankType === 'DIESEL' ? 'ปริมาณดีเซลเติมสต๊อกรวมทั้งปี' : 'ยอดเติมเงินสำรองบัตรจริงสะสม'}
            </span>
            <h4 className="text-xl font-black text-slate-900 mt-1 font-mono">
              {totals.totalQty.toLocaleString('th-TH')} <span className="text-xs font-bold text-slate-500">{unitLabel}</span>
            </h4>
            <p className="text-[9px] text-slate-400 mt-0.5">ยอดรวมอินพุตนำทางกายภาพ</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
              ยอดมูลค่างบจัดหาเฉลี่ยทั้งปี
            </span>
            <h4 className="text-xl font-black text-slate-900 mt-1 font-mono">
              ฿{totals.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[9px] text-slate-400 mt-0.5">รวมบิลค่าใช้จ่ายและงบฝากจริง</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
              {selectedTankType === 'DIESEL' ? 'ราคาจัดซื้อเฉลี่ยตลอดปี' : 'ราคาอ้างอิงงบประมาณเฉลี่ย'}
            </span>
            <h4 className="text-xl font-black text-slate-900 mt-1 font-mono">
              ฿{totals.averagePrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-500">/ {unitLabel}</span>
            </h4>
            <p className="text-[9px] text-slate-400 mt-0.5">งบทั้งหมดหารด้วยปริมาณที่รับได้</p>
          </div>
        </div>
      </div>

      {/* Grid of monthly table breakdown & visual charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table representation */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-extrabold text-slate-800 text-xs md:text-sm flex items-center gap-2">
              <TableIcon className="w-4.5 h-4.5 text-slate-500" />
              <span>
                {selectedTankType === 'DIESEL' 
                  ? 'สรุปบัญชีการจัดซื้อน้ำมันดีเซลหมุนเร็วป้อนคลังรายเดือน' 
                  : 'สรุปบัญชีนำเติมงบประมาณฝากสำรองเข้าบัตรเงินสด'}
              </span>
            </h4>
            <button
              onClick={exportAnnualToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] md:text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกไฟล์ (.CSV)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/80 text-slate-450 text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">ประจำเดือน</th>
                  <th className="py-3 px-4 text-right">จำนวนจัดซื้อ ({selectedTankType === 'DIESEL' ? 'ลิตร' : 'บาท'})</th>
                  <th className="py-3 px-4 text-right">รวมงบใช้จ่ายซื้อ (บาท)</th>
                  <th className="py-3 px-4 text-right">เฉลี่ยต่อหน่วย ({selectedTankType === 'DIESEL' ? 'บาท/ลิตร' : 'บาท/บาท'})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650 text-slate-600 font-medium">
                {aggregatedMonthlyData.map((m) => (
                  <tr key={m.monthIndex} className="hover:bg-slate-555 hover:bg-slate-500/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 text-[11px] md:text-xs">{m.monthName}</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-bold font-mono">
                      {m.totalQty > 0 ? `${m.totalQty.toLocaleString('th-TH')} ${unitLabel}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-650 text-indigo-600 font-black font-mono">
                      {m.totalCost > 0 ? `฿${m.totalCost.toLocaleString('th-TH', { maximumFractionDigits: 1 })}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono">
                      {m.totalQty > 0 ? `฿${m.avgPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold text-[10px] md:text-xs">
                  <td className="py-3.5 px-4 rounded-l-xl">สรุปสะสมรอบปี</td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    {totals.totalQty.toLocaleString('th-TH')} {unitLabel}
                  </td>
                  <td className="py-3.5 px-4 text-right text-amber-400 font-mono">
                    ฿{totals.totalCost.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-450 text-emerald-400 rounded-r-xl font-mono">
                    ฿{totals.averagePrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Visual Recharts Bar Trend Graph */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="mb-4">
            <h4 className="font-extrabold text-slate-800 text-xs md:text-sm">
              {selectedTankType === 'DIESEL' 
                ? 'กราฟแผงปริมาณซื้อและต้นทุนดีเซลรับเข้ารวมปี' 
                : 'กราฟสรุปเติมและเบิกสัดส่วนบัญชีบัตรปี'}
            </h4>
            <p className="text-[11px] text-slate-400">ภาพรวมสถิติรายเดือนย้อนหลังเทียบปริมาตรร่วมกับงบระบบ (IN)</p>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRepresentation}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                barSize={16}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} 
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
                  formatter={(value: any, name: any) => [
                    `${parseFloat(value).toLocaleString('th-TH')} ${name.includes('ปริมาณ') ? unitLabel : 'บาท'}`, 
                    name
                  ]}
                  contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} 
                  verticalAlign="bottom" 
                  height={32}
                />
                {selectedTankType === 'DIESEL' && (
                  <Bar dataKey="ปริมาณที่เติม" fill="#3b82f6" name="ปริมาณซื้อดีเซล (ลิตร)" radius={[4, 4, 0, 0]} />
                )}
                <Bar dataKey="ยอดเงินรวม (บาท)" fill="#10b981" name="งบสั่งซื้อรวม (บาท)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
