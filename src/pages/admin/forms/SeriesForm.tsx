import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, FileText, Hash, Building2, RefreshCw } from 'lucide-react';

interface DocumentTypeOption {
  id: number;
  code: string;
  name: string;
}

interface SeriesFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  loading: boolean;
  warehouses: any[];
  documentTypes: DocumentTypeOption[];
}

export const SeriesForm: React.FC<SeriesFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, loading, warehouses, documentTypes
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center p-3 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.97, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.97, y: 10 }} 
            className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
          >
            {/* Header Compacto ERP */}
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded">
                  <FileText className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                    {formData.id ? 'Editar Serie' : 'Registro de Nueva Serie'}
                  </h2>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">Control de Correlativos SUNAT</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={onSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70"
            >
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo Documento</label>
                    <select 
                      required
                      value={formData.documentType || ''}
                      onChange={e => setFormData({...formData, documentType: e.target.value})}
                      className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none"
                    >
                      <option value="">-- SELECCIONE --</option>
                      {documentTypes.map(dt => (
                        <option key={dt.code} value={dt.code}>{dt.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Serie (Ej: F001)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="F001"
                      value={formData.series || ''}
                      onChange={e => setFormData({...formData, series: e.target.value.toUpperCase()})}
                      className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-mono font-bold uppercase bg-blue-50/70 text-blue-900 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Almacén / Sucursal</label>
                  <div className="relative">
                    <select 
                      required
                      value={formData.warehouseId || ''}
                      onChange={e => setFormData({...formData, warehouseId: e.target.value})}
                      className="h-8 w-full pl-7 pr-2 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none uppercase"
                    >
                      <option value="">-- SELECCIONAR ALMACÉN --</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Último Número Usado</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      required
                      min="0"
                      placeholder="0"
                      value={formData.currentNumber ?? 0}
                      onChange={e => setFormData({...formData, currentNumber: e.target.value})}
                      className="h-8 w-full pl-7 pr-2 border border-slate-300 rounded text-xs font-mono font-bold text-blue-800 bg-white focus:border-blue-500 outline-none"
                    />
                    <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium">El siguiente documento emitido será: Correlativo + 1.</p>
                </div>

                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                  <input 
                    type="checkbox" 
                    id="isActiveSeries"
                    checked={formData.isActive !== false}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isActiveSeries" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Serie Activa en el Sistema
                  </label>
                </div>
              </div>

              {/* Footer Compacto */}
              <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0 rounded-b-lg">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
                </button>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="h-8 px-4 bg-[#004A99] hover:bg-blue-800 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {loading ? 'Guardando...' : (formData.id ? 'Actualizar Serie' : 'Guardar Serie')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
