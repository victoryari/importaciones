import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, FileText, Hash, Building2, CheckCircle } from 'lucide-react';

interface SeriesFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  loading: boolean;
  warehouses: any[];
}

export const SeriesForm: React.FC<SeriesFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, loading, warehouses
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-110 flex items-center justify-center p-0 overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.98, y: 10 }} 
            className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
          >
            {/* Header ERP Style */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-800" />
                <h2 className="text-sm font-bold text-slate-700 tracking-tight">Gestión de Serie</h2>
              </div>
              <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-4 space-y-4 bg-[#F8FAFC]">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo Documento</label>
                  <select 
                    required
                    value={formData.documentType || ''}
                    onChange={e => setFormData({...formData, documentType: e.target.value})}
                    className="h-8 w-full border border-slate-300 rounded px-1 text-xs font-bold bg-white"
                  >
                    <option value="">--Seleccionar--</option>
                    <option value="COT">COTIZACIÓN</option>
                    <option value="PED">PEDIDO</option>
                    <option value="FACT">FACTURA</option>
                    <option value="BOOL">BOLETA</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Serie (ej: F001)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="F001"
                    value={formData.series || ''}
                    onChange={e => setFormData({...formData, series: e.target.value.toUpperCase()})}
                    className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-black uppercase bg-blue-50 text-blue-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Almacén / Sucursal</label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <select 
                    required
                    value={formData.warehouseId || ''}
                    onChange={e => setFormData({...formData, warehouseId: e.target.value})}
                    className="h-8 w-full pl-8 pr-2 border border-slate-300 rounded text-xs font-bold bg-white"
                  >
                    <option value="">--Seleccionar Almacén--</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Último Número Usado</label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="0"
                    value={formData.currentNumber || 0}
                    onChange={e => setFormData({...formData, currentNumber: e.target.value})}
                    className="h-8 w-full pl-8 pr-2 border border-slate-300 rounded text-xs font-black text-blue-700 bg-white"
                  />
                </div>
                <p className="text-[9px] text-slate-400 font-medium ml-1">El siguiente documento será Correlativo + 1.</p>
              </div>

              <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive !== false}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-[11px] font-bold text-slate-600 cursor-pointer">Estado Activo</label>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 h-10 bg-blue-800 hover:bg-blue-900 text-white font-black rounded shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:bg-blue-300 uppercase text-xs"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Guardando...' : 'Guardar Serie'}
                </button>
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded transition-all uppercase text-[10px] tracking-widest"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
