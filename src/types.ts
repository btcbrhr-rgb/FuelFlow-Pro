/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FuelTank {
  id: string;
  name: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  minThreshold: number;
  basePrice: number;
  unit: string;
}

export interface Vehicle {
  id: string;
  plateNo: string;
  model: string;
  driver: string;
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  timestamp: string; // YYYY-MM-DDTHH:mm:ss
  tankId: string;
  category?: string;
  unit?: string;
  amount: number;
  costPerLiter: number;
  totalValue: number;
  supplier?: string;
  project?: string;
  invoice?: string;
  poNo?: string;
  deliveryPlace?: string;
  driverName?: string;
  plateNo?: string;
  recorder: string;
  auditor: string;
  notes: string;
  isVerified?: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface RequestDocument {
  id: string;
  type: 'FUEL_PURCHASE' | 'CARD_REFILL';
  timestamp: string; // YYYY-MM-DDTHH:mm:ss
  tankId: string; // Target Tank or Target Card FuelTank id
  amount: number; // liters for FUEL_PURCHASE, Baht for CARD_REFILL
  costPerUnit?: number; // expected price per liter for FUEL_PURCHASE
  totalValue: number; // amount * costPerUnit for FUEL_PURCHASE, or amount for CARD_REFILL
  supplier?: string; // only for FUEL_PURCHASE
  project?: string; // which project is it requested for
  requester: string; // guy requesting
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string; // request reason or description
  approver?: string; // person approving/rejecting
  approvalNotes?: string; // approval comment
  approvalDate?: string; // date of approval/rejection
  targetDate?: string; // target delivery/transfer date
  poNo?: string; // PO Number on approval
  isProcessed?: boolean; // converted to transaction
}

export interface DatabaseState {
  tanks: FuelTank[];
  vehicles: Vehicle[];
  projects: string[];
  transactions: Transaction[];
  requests?: RequestDocument[];
}
