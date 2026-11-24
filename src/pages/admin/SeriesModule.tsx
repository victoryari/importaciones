import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, Plus, Search, Trash2, Edit2, 
  Hash, Building2, CheckCircle, XCircle
} from 'lucide-react';

interface Series {
  id: number;
  documentType: string;
  series: string;
  currentNumber: number;
  warehouseId: number;
  isActive: boolean;
  warehouse: { name: string };
}

interface DocumentTypeOption {
  id: number;
  code: string;
  name: string;
}

interface SeriesModuleProps {
  series: Series[];
  onEdit: (series: Series) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  warehouses: any[];
  documentTypes: DocumentTypeOption[];
}

export const SeriesModule: React.FC<SeriesModuleProps> = ({
  series, onEdit, onNew, onDelete, warehouses, documentTypes
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');

  const getDocTypeName = (code: string) => {
    return documentTypes.find(dt => dt.code === code)?.name || code;
  };

  const uniqueDocTypes = Array.from(new Set(series.map(s => s.documentType).filter(Boolean)));

  const filteredSeries = series.filter(s => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.series.toLowerCase().includes(q) ||
      (s.warehouse?.name || '').toLowerCase().includes(q) ||
      getDocTypeName(s.documentType).toLowerCase().includes(q);
    const matchesWarehouse = warehouseFilter === 'ALL' || String(s.warehouseId) === warehouseFilter;
    const matchesDocType = docTypeFilter === 'ALL' || s.documentType === docTypeFilter;
    return matchesSearch && matchesWarehouse && matchesDocType;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="space-y-4"
    >
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por serie, documento o almacén..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full pl-10 pr-3 text-sm rounded-lg border border-slate-300 bg-white focus:border-[#004A99] transition-colors duration-150 outline-none"
            />
          </div>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="h-9 px-3 text-xs font-bold text-slate-700 rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none uppercase"
          >
            <option value="ALL">Todos los Almacenes</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>

          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="h-9 px-3 text-xs font-bold text-slate-700 rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
          >
            <option value="ALL">Todos los Documentos</option>
            {uniqueDocTypes.map((code) => (
              <option key={code} value={code}>{getDocTypeName(code)}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={onNew}
          className="h-9 flex items-center justify-center gap-2 px-4 bg-[#004A99] text-white rounded-lg text-sm font-semibold hover:bg-[#003B7A] transition-colors duration-150 shadow-2xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Serie
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200">
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Tipo Documento</th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Serie</th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Correlativo Actual</th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Almacén / Sucursal</th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Estado</th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSeries.map((s) => (
              <tr key={s.id} className="hover:bg-blue-50/40 transition-colors duration-150 group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-[#004A99] rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900">{getDocTypeName(s.documentType)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-sm text-slate-800 uppercase tracking-wider">{s.series}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 font-mono tabular-nums">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-sm text-slate-900">{s.currentNumber.toString().padStart(8, '0')}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{s.warehouse?.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {s.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3 h-3" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                      <XCircle className="w-3 h-3" /> Inactivo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => onEdit(s)}
                      className="p-2 bg-blue-50 text-[#004A99] hover:bg-[#004A99] hover:text-white rounded-lg transition-colors duration-150"
                      title="Editar Serie"
                      aria-label="Editar Serie"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(s.id)}
                      className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors duration-150"
                      title="Eliminar Serie"
                      aria-label="Eliminar Serie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
