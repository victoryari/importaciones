import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Phone, Mail, FileText, Building2, 
  UserCheck, Save, RefreshCw, Check 
} from 'lucide-react';

interface SellerFormProps {
  isOpen: boolean;
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isEditing: boolean;
  loading?: boolean;
  warehouses?: any[];
}

export const SellerForm: React.FC<SellerFormProps> = ({ 
  isOpen, 
  formData, 
  setFormData, 
  onSubmit, 
  onClose, 
  isEditing, 
  loading,
  warehouses = [] 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
        >
          {/* Header Compacto ERP */}
          <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white/10 rounded">
                <UserCheck className="w-4 h-4 text-blue-200" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                  {isEditing ? 'Editar Vendedor' : 'Registro de Nuevo Vendedor'}
                </h2>
                <p className="text-[9px] text-blue-200 uppercase font-medium">Gestión de Personal de Ventas</p>
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
            {/* Sección 1: Información Personal */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <User className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Información del Vendedor</span>
              </div>
              
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-bold text-blue-900 uppercase focus:border-blue-500 outline-none"
                    placeholder="Ej. JUAN PÉREZ LÓPEZ"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">DNI / Documento</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.dni || ''}
                        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                        className="w-full h-8 pl-7 pr-2.5 bg-white border border-slate-300 rounded text-xs font-bold font-mono text-slate-800 focus:border-blue-500 outline-none"
                        placeholder="8 dígitos"
                      />
                      <FileText className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Teléfono / Celular</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full h-8 pl-7 pr-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                        placeholder="999 999 999"
                      />
                      <Phone className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Correo Electrónico</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-8 pl-7 pr-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                      placeholder="vendedor@empresa.com"
                    />
                    <Mail className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Asignación de Almacén y Estado */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Sede y Estado</span>
              </div>
              
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Sede / Almacén de Despacho Asignado</label>
                  <select
                    value={formData.warehouseId || ''}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none uppercase"
                  >
                    <option value="">-- SIN ALMACÉN FIJO (GENERAL) --</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        [{w.sunatCode || '0000'}] {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                  <input
                    type="checkbox"
                    id="isActive"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Vendedor Activo en el Sistema
                  </label>
                </div>
              </div>
            </div>
          </form>

          {/* Footer Compacto */}
          <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
            </button>

            <button 
              type="button" 
              onClick={onSubmit}
              disabled={loading}
              className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar Vendedor' : 'Guardar Vendedor')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
