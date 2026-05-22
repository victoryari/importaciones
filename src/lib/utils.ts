import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (value: number | string | null | undefined, decimals: number = 2) => {
  const fallback = (0).toFixed(decimals);
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return fallback;
  
  // Perú usa punto para decimales y coma para miles (Oficial desde 2010)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatCurrency = (value: number | string | null | undefined, currency: string = 'S/') => {
  return `${currency} ${formatNumber(value)}`;
};

export interface PackagingConfig {
  packageId?: number | null;
  packageName?: string;
  packageSymbol?: string;
  quantityPerPackage?: number;
  subPackageId?: number | null;
  subPackageName?: string;
  subPackageSymbol?: string;
  quantityPerSubPackage?: number;
  unitId?: number | null;
  unitName?: string;
  unitSymbol?: string;
}

export function calculateTotalUnitsPerPackage(config: PackagingConfig): number {
  const perSub = config.quantityPerSubPackage && config.quantityPerSubPackage > 0 ? config.quantityPerSubPackage : 1;
  const perPkg = config.quantityPerPackage && config.quantityPerPackage > 0 ? config.quantityPerPackage : 1;
  return perPkg * perSub;
}

export function convertToBaseUnits(quantity: number, config: PackagingConfig): number {
  const totalPerPackage = calculateTotalUnitsPerPackage(config);
  return quantity * totalPerPackage;
}

export function convertFromBaseUnits(baseUnits: number, config: PackagingConfig): {
  packages: number;
  subPackages: number;
  units: number;
} {
  const perSub = config.quantityPerSubPackage && config.quantityPerSubPackage > 0 ? config.quantityPerSubPackage : 1;
  const perPkg = config.quantityPerPackage && config.quantityPerPackage > 0 ? config.quantityPerPackage : 1;
  const totalPerPackage = perPkg * perSub;

  const packages = Math.floor(baseUnits / totalPerPackage);
  const remainderAfterPackages = baseUnits % totalPerPackage;
  const subPackages = Math.floor(remainderAfterPackages / perSub);
  const units = remainderAfterPackages % perSub;

  return { packages, subPackages, units };
}

export function formatPackagingHierarchy(config: PackagingConfig): string {
  const parts: string[] = [];
  const perSub = config.quantityPerSubPackage && config.quantityPerSubPackage > 0 ? config.quantityPerSubPackage : 1;
  const perPkg = config.quantityPerPackage && config.quantityPerPackage > 0 ? config.quantityPerPackage : 1;

  if (config.packageName) {
    parts.push(`1 ${config.packageName} = ${perPkg} ${config.subPackageName || config.unitName || 'un.'}`);
  }
  if (config.subPackageName) {
    parts.push(`1 ${config.subPackageName} = ${perSub} ${config.unitName || 'un.'}`);
  }
  if (parts.length > 0) {
    const total = perPkg * perSub;
    parts.push(`Total: 1 ${config.packageName || 'empaque'} = ${total} ${config.unitName || 'un.'}`);
  }
  return parts.join(' | ');
}

export function validatePackagingConfig(config: PackagingConfig): string[] {
  const errors: string[] = [];
  const perPkg = config.quantityPerPackage;
  const perSub = config.quantityPerSubPackage;

  if (config.packageId && (!perPkg || perPkg < 1 || !Number.isInteger(Number(perPkg)))) {
    errors.push('La cantidad por empaque mayor debe ser un número entero positivo');
  }
  if (config.subPackageId && (!perSub || perSub < 1 || !Number.isInteger(Number(perSub)))) {
    errors.push('La cantidad por sub empaque debe ser un número entero positivo');
  }
  if (config.packageId && !config.subPackageId && !config.unitId) {
    errors.push('Debe seleccionar al menos una unidad base');
  }
  if (config.packageId && config.subPackageId && config.packageId === config.subPackageId) {
    errors.push('El empaque mayor y sub empaque no pueden ser iguales');
  }
  return errors;
}

export interface EntryNoteItemData {
  id?: number;
  productId: number;
  productName?: string;
  productCode?: string;
  productData?: any;
  guideRemission?: string;
  documentType?: string;
  documentNumber?: string;
  quantity: number;
  unitId: number;
  unitSymbol?: string;
  unitCost: number;
  total?: number;
  orderNumber?: string;
  lotNumber?: string;
  entryDate?: string;
  weight?: number;
  totalWeight?: number;
}

export interface EntryNoteHeaderData {
  id?: number;
  warehouseId?: number | string;
  warehouseName?: string;
  zoneId?: number | string;
  floorId?: number | string;
  currency: string;
  exchangeRate: number | string;
  supplierId?: number | string;
  supplierName?: string;
  date: string;
  description?: string;
  reasonCode: string;
  reasonName?: string;
  guideRemission?: string;
  status: string;
  documentType?: string;
  series?: string;
  number?: string;
  totalAmount?: number;
}

export const ENTRY_NOTE_STATUSES = {
  DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Aprobado', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Completado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ANNULLED: { label: 'Anulado', color: 'bg-red-100 text-red-700 border-red-200' },
};

export const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING', 'APPROVED', 'COMPLETED', 'ANNULLED'],
  PENDING: ['APPROVED', 'DRAFT', 'ANNULLED'],
  APPROVED: ['COMPLETED', 'ANNULLED'],
  COMPLETED: ['ANNULLED'],
  ANNULLED: [],
};

export function validateEntryNoteHeader(header: Partial<EntryNoteHeaderData>): string[] {
  const errors: string[] = [];
  if (!header.warehouseId && header.warehouseId !== 0) errors.push('Debe seleccionar un almacén');
  if (!header.reasonCode) errors.push('Debe seleccionar un motivo');
  if (!header.date) errors.push('La fecha es obligatoria');
  if (header.exchangeRate && parseFloat(String(header.exchangeRate)) <= 0) {
    errors.push('El tipo de cambio debe ser mayor a cero');
  }
  return errors;
}

export function validateEntryNoteItem(item: Partial<EntryNoteItemData>): string[] {
  const errors: string[] = [];
  if (!item.productId) errors.push('Debe seleccionar un producto');
  if (!item.quantity || item.quantity <= 0) errors.push('La cantidad debe ser mayor a cero');
  if (!item.unitId) errors.push('Debe seleccionar una unidad de medida');
  if (item.unitCost === undefined || item.unitCost === null || item.unitCost < 0) {
    errors.push('El costo unitario es obligatorio y no puede ser negativo');
  }
  return errors;
}

export function validateEntryNoteTransition(currentStatus: string, newStatus: string): string | null {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    return `No se puede cambiar de "${ENTRY_NOTE_STATUSES[currentStatus as keyof typeof ENTRY_NOTE_STATUSES]?.label || currentStatus}" a "${ENTRY_NOTE_STATUSES[newStatus as keyof typeof ENTRY_NOTE_STATUSES]?.label || newStatus}"`;
  }
  return null;
}

export function calculateEntryNoteTotal(items: EntryNoteItemData[]): number {
  return items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
}

export function calculateItemTotal(quantity: number, unitCost: number): number {
  return quantity * unitCost;
}

export function calculateTotalWeight(quantity: number, weight: number | null): number | null {
  if (!weight) return null;
  return quantity * weight;
}
