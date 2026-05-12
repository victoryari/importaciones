import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, Edit2, Save, X, Search } from 'lucide-react';
import { UbigeoSelector } from '../../../components/UbigeoSelector';

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  documentTypes: any[];
  handleConsultDocument: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingItem,
  loading,
  documentTypes,
  handleConsultDocument
}) => {
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
                <PlusCircle className="w-4 h-4 text-emerald-800" />
                <h2 className="text-sm font-bold text-slate-700 tracking-tight">{editingItem ? 'Editar' : 'Nuevo'} Cliente</h2>
              </div>
              <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={onSubmit} className="flex-1 overflow-hidden flex flex-col bg-[#F0F4F8]">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                
                {/* --- SECCIÓN 1: IDENTIFICACIÓN --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-16">Persona</span>
                    <select 
                      value={formData.personType} 
                      onChange={e => setFormData({...formData, personType: e.target.value})}
                      className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white flex-1 outline-none"
                    >
                      <option value="NATURAL">NATURAL</option>
                      <option value="JURIDICA">JURÍDICA</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-16 text-right">Doc.</span>
                    <select 
                      value={formData.docType} 
                      onChange={e => setFormData({...formData, docType: e.target.value})}
                      className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white flex-1 outline-none"
                    >
                      {documentTypes.length > 0 ? (
                        documentTypes.map(t => <option key={t.code} value={t.name}>{t.name}</option>)
                      ) : (
                        <>
                          <option value="DNI">DNI</option>
                          <option value="RUC">RUC</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="md:col-span-6 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-16 text-right">Número</span>
                    <div className="flex-1 flex gap-1">
                      <input 
                        type="text" required
                        value={formData.docNumber} 
                        onChange={e => setFormData({...formData, docNumber: e.target.value})}
                        className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none focus:border-emerald-500"
                        placeholder="00000000"
                      />
                      <button 
                        type="button"
                        onClick={handleConsultDocument}
                        disabled={loading}
                        className="h-8 px-2 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        {loading ? <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN 2: NOMBRES / RAZÓN SOCIAL --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  {formData.personType === 'NATURAL' ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primer Nombre</label>
                        <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold outline-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Segundo Nombre</label>
                        <input type="text" value={formData.secondName} onChange={e => setFormData({...formData, secondName: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold outline-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido Paterno</label>
                        <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold outline-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido Materno</label>
                        <input type="text" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold outline-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-24 shrink-0">Razón Social</span>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none bg-blue-50/50" />
                    </div>
                  )}
                </div>

                {/* --- SECCIÓN 3: CONTACTO --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0">Email</span>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0 text-right">Celular</span>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none" />
                  </div>
                </div>

                {/* --- SECCIÓN 4: UBICACIÓN --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0">Dirección</span>
                    <input 
                      type="text" 
                      readOnly={formData.personType === 'JURIDICA'} 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className={`h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none ${formData.personType === 'JURIDICA' ? 'bg-slate-50' : ''}`}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-3 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0">País</span>
                      <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none" />
                    </div>
                    <div className="md:col-span-9">
                      <UbigeoSelector 
                        department={formData.department}
                        province={formData.province}
                        district={formData.district}
                        onChange={(data) => setFormData({...formData, ...data})}
                        className="bg-transparent gap-2"
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
                  className="px-8 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded shadow-lg shadow-emerald-100 transition-all flex items-center gap-2 disabled:bg-emerald-300 uppercase text-xs"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Procesando...' : editingItem ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
