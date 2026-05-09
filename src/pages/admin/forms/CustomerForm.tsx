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
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                  {editingItem ? <Edit2 className="w-6 h-6 text-white" /> : <PlusCircle className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {editingItem ? 'Actualizar Información de Cliente' : 'Registro de Cliente Nuevo'}
                  </h2>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Información Maestra de Identidad</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm transition-all border border-slate-100"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={onSubmit} className="p-8 overflow-y-auto max-h-[70vh] space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Persona</label>
                  <select 
                    value={formData.personType} 
                    onChange={e => setFormData({...formData, personType: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all bg-slate-50"
                  >
                    <option value="NATURAL">PERSONA NATURAL</option>
                    <option value="JURIDICA">PERSONA JURÍDICA</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Documento</label>
                  <select 
                    value={formData.docType} 
                    onChange={e => setFormData({...formData, docType: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all bg-slate-50"
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
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nro. Documento / Código</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.docNumber} 
                      onChange={e => setFormData({...formData, docNumber: e.target.value})}
                      className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all"
                      placeholder="Ingresar número..."
                    />
                    <button 
                      type="button"
                      onClick={handleConsultDocument}
                      disabled={loading}
                      className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-200 disabled:opacity-50"
                      title="Consultar con SUNAT/RENIEC"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {formData.personType === 'NATURAL' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primer Nombre</label>
                    <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Segundo Nombre</label>
                    <input type="text" value={formData.secondName} onChange={e => setFormData({...formData, secondName: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido Paterno</label>
                    <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido Materno</label>
                    <input type="text" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número Celular</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Fiscal / Domicilio</label>
                <input 
                  type="text" 
                  readOnly={formData.personType === 'JURIDICA'} 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className={`w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none transition-all ${
                    formData.personType === 'JURIDICA' 
                      ? 'bg-slate-100 cursor-not-allowed text-slate-500' 
                      : 'bg-white focus:border-emerald-500 text-slate-800'
                  }`} 
                  placeholder={formData.personType === 'JURIDICA' ? "Dirección obtenida de SUNAT..." : "Ingresar dirección manualmente..."} 
                />
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País</label>
                  <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                </div>
                <UbigeoSelector 
                  department={formData.department}
                  province={formData.province}
                  district={formData.district}
                  onChange={(data) => setFormData({...formData, ...data})}
                />
              </div>
              <div className="pt-4 border-t border-slate-100 flex gap-4">
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-3xl shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 disabled:bg-emerald-300">
                  <Save className="w-5 h-5" />
                  {editingItem ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
                <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-3xl transition-all">Cancelar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
