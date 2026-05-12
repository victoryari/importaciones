import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Search, Phone, Mail, MapPin } from 'lucide-react';
import axios from 'axios';

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  token: string | null;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingItem,
  loading,
  token
}) => {
  const [consultLoading, setConsultLoading] = useState(false);

  const handleConsultDocument = async () => {
    if (!formData.docNumber) return;
    setConsultLoading(true);
    try {
      const res = await axios.get(`/api/consult/${formData.docType.toLowerCase()}/${formData.docNumber.trim()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const d = res.data;
      if (d.ruc || d.dni || d.razonSocial || d.nombres || d.nombre_o_razon_social || d.success) {
        const data = d.data || d;
        if (formData.docType === 'RUC') {
          setFormData({ 
            ...formData, 
            name: data.razonSocial || data.nombre_o_razon_social || '', 
            address: data.direccion || data.direccion_completa || ''
          });
        } else {
          const rawNames = data.nombres || '';
          const apePat = data.apellidoPaterno || data.apellido_paterno || '';
          const apeMat = data.apellidoMaterno || data.apellido_materno || '';
          setFormData({ 
            ...formData, 
            name: `${rawNames} ${apePat} ${apeMat}`.trim(),
            address: data.direccion || data.direccion_completa || ''
          });
        }
      } else {
        alert('No se encontró información');
      }
    } catch (err) { 
      console.error(err);
      alert('Error en el servicio de consulta');
    } finally { setConsultLoading(false); }
  };

  const internalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-110 flex items-center justify-center p-0 overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.98, y: 20 }} 
            className="relative w-full h-full max-w-[98%] max-h-[98vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
          >
            {/* --- BARRA DE TITULO ESTILO ERP --- */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-800" />
                <h2 className="text-sm font-bold text-slate-700 tracking-tight">{editingItem ? 'Editar' : 'Nuevo'} Proveedor</h2>
              </div>
              <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={internalSubmit} className="flex-1 overflow-hidden flex flex-col bg-[#F0F4F8]">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                
                {/* --- SECCIÓN 1: IDENTIFICACIÓN --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-16">Tipo Doc.</span>
                    <select 
                      value={formData.docType}
                      onChange={e => setFormData({...formData, docType: e.target.value})}
                      className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white flex-1 outline-none"
                    >
                      <option value="RUC">RUC</option>
                      <option value="DNI">DNI</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-16">Número</span>
                    <div className="flex-1 flex gap-1">
                      <input 
                        type="text" required
                        value={formData.docNumber}
                        onChange={e => setFormData({...formData, docNumber: e.target.value})}
                        className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none focus:border-blue-500"
                        placeholder="00000000000"
                      />
                      <button 
                        type="button"
                        onClick={handleConsultDocument}
                        disabled={consultLoading}
                        className="h-8 px-2 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        {consultLoading ? <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-24 text-right">Razón Social</span>
                    <input 
                      type="text" required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none focus:border-blue-500 bg-blue-50/50"
                    />
                  </div>
                </div>

                {/* --- SECCIÓN 2: CONTACTO Y DIRECCIÓN --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0">Teléfono</span>
                    <div className="relative flex-1">
                      <Phone className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0 text-right">Email</span>
                    <div className="relative flex-1">
                      <Mail className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-24 shrink-0 text-right">Contacto</span>
                    <input 
                      type="text"
                      value={formData.contact}
                      onChange={e => setFormData({...formData, contact: e.target.value})}
                      className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-12 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0">Dirección</span>
                    <div className="relative flex-1">
                      <MapPin className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded text-xs transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-8 h-10 bg-blue-600 hover:bg-blue-700 text-white font-black rounded shadow-lg shadow-blue-100 transition-all flex items-center gap-2 disabled:bg-blue-300 uppercase text-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  {loading ? 'Procesando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>  );
};
