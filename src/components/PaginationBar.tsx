import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * Standard ERP table pagination bar matching PurchaseModule / OrderModule.
 */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs">
      <div className="flex items-center gap-3 text-slate-600 font-medium tabular-nums">
        <span>
          Mostrando <strong className="text-slate-900">{(safePage - 1) * pageSize + 1}</strong>–<strong className="text-slate-900">{Math.min(safePage * pageSize, totalItems)}</strong> de <strong className="text-slate-900">{totalItems}</strong> registros
        </span>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          aria-label="Registros por página"
          className="h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#004A99]"
        >
          <option value={10}>10 / pág.</option>
          <option value={20}>20 / pág.</option>
          <option value={50}>50 / pág.</option>
        </select>
      </div>
      <div className="flex items-center gap-1.5 tabular-nums">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          aria-label="Página anterior"
          className="h-8 px-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Anterior
        </button>
        <span className="px-2.5 text-slate-700 font-semibold">
          Página {safePage} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          aria-label="Página siguiente"
          className="h-8 px-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
        >
          Siguiente <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
