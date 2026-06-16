/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { DatabaseState, Vehicle } from '../types';
import { generateNextId } from '../utils/id';

interface VehiclesTabProps {
  db: DatabaseState;
  onAddVehicle: (newVeh: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onAddProject: (projName: string) => void;
  onDeleteProject: (projName: string) => void;
  showToast: (title: string, message: string, type?: 'success' | 'danger' | 'info') => void;
}

export default function VehiclesTab({
  db,
  onAddVehicle,
  onDeleteVehicle,
  onAddProject,
  onDeleteProject,
  showToast,
}: VehiclesTabProps) {
  // Vehicle state
  const [plateNo, setPlateNo] = useState('');
  const [driver, setDriver] = useState('');

  // Project state
  const [projectName, setProjectName] = useState('');

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!plateNo.trim()) {
      showToast("ข้อผิดพลาด", "กรุณากรอกรหัสเครื่องจักรหรือเลขทะเบียนรถ บัญชี", "danger");
      return;
    }

    const existingIds = db.vehicles.map(v => v.id);
    const newId = generateNextId("V-", existingIds, 3);

    const newVeh: Vehicle = {
      id: newId,
      plateNo: plateNo,
      model: '',
      driver: driver
    };

    onAddVehicle(newVeh);
    showToast("สำเร็จ", `ลงทะเบียนผู้ใช้งาน/ยานพาหนะ "${plateNo}" สำเร็จ`, "success");

    setPlateNo('');
    setDriver('');
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = projectName.trim();
    if (!name) return;

    if (db.projects.includes(name)) {
      showToast("ล้มเหลว", "มีชื่อโครงการนี้เปิดการใช้งานอยู่ออฟไลน์ครอบคลุมแล้ว", "danger");
      return;
    }

    onAddProject(name);
    showToast("สำเร็จ", `เพิ่มโครงการไซต์งานก่อสร้าง "${name}" สำเร็จเรียบร้อย`, "success");
    setProjectName('');
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: VEHICLE FLEET MANAGEMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add vehicle form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 h-fit space-y-4 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm md:text-base">ลงทะเบียนเครื่องจักร / ยานพาหนะ</h3>
            <p className="text-xs text-slate-450 text-slate-400 mt-0.5">
              ผูกทะเบียนพนักงานขับรถหลักเพื่อรวบรวมสัญจรเช็กบิตในการเบิกจ่ายน้ำมันรายวัน
            </p>
          </div>

          <form onSubmit={handleVehicleSubmit} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">ทะเบียนรถ / รหัสเครื่องจักรคุมงาน *</label>
              <input
                type="text"
                placeholder="เช่น 83-7829 หรือ CAT-02"
                value={plateNo}
                onChange={(e) => setPlateNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-medium text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">พนักงานขับรถประจำคู่สิทธิ์ *</label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล คนขับหลัก"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-medium text-slate-800"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ลงทะเบียนขึ้นระบบแวกัส</span>
            </button>
          </form>
        </div>

        {/* Right column: Fleet vehicle listing */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[380px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm md:text-base">ทำเนียบเครื่องจักร & กองยานพาหนะ</h3>
              <p className="text-xs text-slate-450 text-slate-400 mt-0.5">รายชื่อฐานผู้ตรวจสอบสัญจรป้อนงบออฟไลน์ที่บันทึกแล้ว</p>
            </div>
            <span className="text-xs bg-slate-100 font-extrabold text-slate-700 px-3 py-1 rounded-full">
              {db.vehicles.length} คันในระบบ
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] md:text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">ทะเบียน / รหัสรถ</th>
                  <th className="py-2.5 px-3">พนักงานขับรถ</th>
                  <th className="py-2.5 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-650 font-medium">
                {db.vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{v.plateNo}</td>
                    <td className="py-2.5 px-3 text-slate-700">{v.driver}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onDeleteVehicle(v.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 cursor-pointer"
                        title="ลบออก"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: PHYSICAL CONSTRUCTION PROJECTS MANAGEMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-205 border-slate-200">
        
        {/* Left column: Add projects form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 h-fit space-y-4 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm md:text-base font-semibold">ลงทะเบียนโครงการ / ไซต์งานเพิ่ม</h3>
            <p className="text-xs text-slate-450 text-slate-400 mt-0.5">
              ระบุแหล่งปลายทาง ไซต์ก่อสร้าง หรือแคมป์ซัพพอร์ตเพื่อใช้แบ่งสถิติคลังเบิกจ่าย
            </p>
          </div>

          <form onSubmit={handleProjectSubmit} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">ชื่อเต็มของโครงการ / ไซต์งาน *</label>
              <textarea
                rows={2}
                placeholder="เช่น (40)ทล.226 ตอนสุรินทร์-ศีขรภูมิ (ปี2570)"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ลงทะเบียนไซต์งานคลัง</span>
            </button>
          </form>
        </div>

        {/* Right column: Projects table listing */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[380px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm md:text-base">รายชื่อสิทธิ์โครงการก่อสร้างทั้งหมด</h3>
              <p className="text-xs text-slate-450 text-slate-400 mt-0.5">เป้าหมายไซต์การตัดจ่ายที่ระบุบัญชีออฟไลน์</p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1 rounded-full">
              {db.projects.length} ไซต์งานที่ลงทะเบียน
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] md:text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-16">โครงการที่</th>
                  <th className="py-2.5 px-3">ชื่อสัญญารับรองโครงการก่อสร้าง</th>
                  <th className="py-2.5 px-3 text-right">การจัดการคลัง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-650 font-medium">
                {db.projects.map((proj, idx) => (
                  <tr key={proj} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-850 truncate max-w-xs md:max-w-md" title={proj}>{proj}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onDeleteProject(proj)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 cursor-pointer"
                        title="ถอนโครงการ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
