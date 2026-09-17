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

  const getDocTypeName = (code: string) => {
    return documentTypes.find(dt => dt.code === code)?.name || code;
  };

  const filteredSeries = series.filter(s => 
    s.series.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por serie o almacén..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
          />
        </div>
        <button 
          onClick={onNew}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Nueva Serie
        </button>
      </div>

      <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Tipo Documento</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Serie</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Correlativo Actual</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Almacén / Sucursal</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Estado</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredSeries.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900">{getDocTypeName(s.documentType)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-black text-slate-700 uppercase tracking-wider">{s.series}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-900">{s.currentNumber.toString().padStart(8, '0')}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">{s.warehouse?.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {s.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">
                      <CheckCircle className="w-3 h-3" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-400">
                      <XCircle className="w-3 h-3" /> Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => onEdit(s)}
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-2xs"
                      title="Editar Serie"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(s.id)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-2xs"
                      title="Eliminar Serie"
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
