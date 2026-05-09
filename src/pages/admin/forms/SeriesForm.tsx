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
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-5xl shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Serie</h2>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Numeración y Correlativos</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm transition-all border border-slate-100"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={onSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Documento</label>
                  <select 
                    required
                    value={formData.documentType || ''}
                    onChange={e => setFormData({...formData, documentType: e.target.value})}
                    className="w-full px-5 py-4 rounded-3xl border-2 border-slate-100 font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="COT">COTIZACIÓN</option>
                    <option value="PED">PEDIDO</option>
                    <option value="FACT">FACTURA</option>
                    <option value="BOOL">BOLETA</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Serie (ej: 001)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="001"
                    value={formData.series || ''}
                    onChange={e => setFormData({...formData, series: e.target.value.toUpperCase()})}
                    className="w-full px-5 py-4 rounded-3xl border-2 border-slate-100 font-black text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Almacén / Sucursal</label>
                <div className="relative">
                  <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <select 
                    required
                    value={formData.warehouseId || ''}
                    onChange={e => setFormData({...formData, warehouseId: e.target.value})}
                    className="w-full pl-14 pr-5 py-4 rounded-3xl border-2 border-slate-100 font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50"
                  >
                    <option value="">Seleccionar Almacén...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correlativo Inicial (Último número usado)</label>
                <div className="relative">
                  <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="0"
                    value={formData.currentNumber || 0}
                    onChange={e => setFormData({...formData, currentNumber: e.target.value})}
                    className="w-full pl-14 pr-5 py-4 rounded-3xl border-2 border-slate-100 font-black text-blue-700 focus:border-blue-500 outline-none transition-all bg-slate-50"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium ml-1">Ej: Si pones 0, el primer documento será 00000001.</p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive !== false}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500 transition-all"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-600 cursor-pointer">Serie Activa</label>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-4xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 disabled:bg-blue-300"
                >
                  <Save className="w-5 h-5" />
                  Guardar Serie
                </button>
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-4xl transition-all"
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
