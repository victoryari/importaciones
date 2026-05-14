import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, MapPin, X, Save, Search, 
  Building2, UserCheck, Globe, CreditCard, RefreshCw 
} from 'lucide-react';
import { DEPARTMENTS, PROVINCES, DISTRICTS } from '../../../lib/ubigeoData';

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  documentTypes: any[];
  handleConsultDocument: (type: string, number: string) => Promise<any>;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, editingItem,
  loading, documentTypes, handleConsultDocument
}) => {
  const [isConsulting, setIsConsulting] = useState(false);

  const onConsult = async () => {
    if (!formData.docNumber) return;
    setIsConsulting(true);
    try {
      const data = await handleConsultDocument(formData.docType, formData.docNumber);
      if (data) {
        if (formData.docType === 'RUC') {
          setFormData({
            ...formData,
            name: data.razonSocial || data.nombre_o_razon_social || '',
            address: data.direccion || data.direccion_completa || '',
            department: data.departamento || '',
            province: data.provincia || '',
            district: data.distrito || ''
          });
        } else {
          setFormData({
            ...formData,
            firstName: data.nombres || '',
            lastName: `${data.apellidoPaterno || data.apellido_paterno || ''} ${data.apellidoMaterno || data.apellido_materno || ''}`.trim(),
            name: `${data.nombres || ''} ${data.apellidoPaterno || data.apellido_paterno || ''} ${data.apellidoMaterno || data.apellido_materno || ''}`.trim()
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsConsulting(false);
    }
  };

  // Lógica de Auto-detección inteligente
  useEffect(() => {
    const num = formData.docNumber || '';
    if (num.length === 11) {
      if (num.startsWith('20')) {
        setFormData((prev: any) => ({ ...prev, personType: 'JURIDICA', docType: 'RUC' }));
      } else if (num.startsWith('10')) {
        setFormData((prev: any) => ({ ...prev, personType: 'NATURAL', docType: 'RUC' }));
      }
    } else if (num.length === 8) {
      setFormData((prev: any) => ({ ...prev, personType: 'NATURAL', docType: 'DNI' }));
    }
  }, [formData.docNumber]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 10 }} 
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        >
          {/* Header - Premium Style */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <UserCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {editingItem ? 'Editar Cliente' : 'Registro de Nuevo Cliente'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Módulo de Administración de Terceros</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form 
            onSubmit={onSubmit} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                e.preventDefault();
              }
            }}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50"
          >
            
            {/* Section 1: Identidad */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">Información de Identidad</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo de Persona</label>
                  <select 
                    value={formData.personType} 
                    onChange={e => setFormData({...formData, personType: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  >
                    <option value="NATURAL">PERSONA NATURAL</option>
                    <option value="JURIDICA">PERSONA JURÍDICA</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo de Documento</label>
                  <select 
                    value={formData.docType} 
                    onChange={e => setFormData({...formData, docType: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  >
                    <option value="DNI">DNI (DOCUMENTO NACIONAL DE IDENTIDAD)</option>
                    <option value="RUC">RUC (REGISTRO ÚNICO DE CONTRIBUYENTES)</option>
                    <option value="CE">C.E. (CARNET DE EXTRANJERÍA)</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Número de Documento</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={formData.docNumber} 
                      onChange={e => setFormData({...formData, docNumber: e.target.value})}
                      className="w-full h-10 pl-10 pr-24 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                      placeholder="Ingrese el número de documento..."
                    />
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <button 
                      type="button" 
                      onClick={onConsult}
                      disabled={isConsulting}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 bg-blue-600 text-white rounded-md text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-sm"
                    >
                      {isConsulting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      {isConsulting ? 'Consultando...' : 'Consultar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Datos Personales / Empresa */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">Información General</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                    {formData.docType === 'RUC' ? 'Razón Social' : 'Nombre Completo / Razón Social'}
                  </label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase"
                    placeholder="Ingrese el nombre completo o razón social..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Teléfono / Celular</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                        placeholder="999 999 999"
                      />
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Correo Electrónico</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                        placeholder="ejemplo@correo.com"
                      />
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Ubicación */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">Información de Ubicación</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Dirección Fiscal / Domicilio</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none uppercase"
                      placeholder="Calle, Avenida, Jirón..."
                    />
                    <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Departamento</label>
                    <select 
                      value={DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id || ''} 
                      onChange={e => {
                        const dept = DEPARTMENTS.find(d => d.id === e.target.value);
                        setFormData({...formData, department: dept?.name || '', province: '', district: ''});
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold outline-none uppercase transition-all focus:border-blue-400"
                    >
                      <option value="">-- SELECCIONE --</option>
                      {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Provincia</label>
                    <select 
                      value={(() => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        return deptId ? (PROVINCES[deptId]?.find(p => p.name.toUpperCase() === (formData.province || '').toUpperCase())?.id || '') : '';
                      })()}
                      onChange={e => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        const prov = deptId ? PROVINCES[deptId]?.find(p => p.id === e.target.value) : null;
                        setFormData({...formData, province: prov?.name || '', district: ''});
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold outline-none uppercase transition-all focus:border-blue-400"
                      disabled={!formData.department}
                    >
                      <option value="">-- SELECCIONE --</option>
                      {(() => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        return deptId ? PROVINCES[deptId]?.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>) : [];
                      })()}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Distrito</label>
                    <select 
                      value={(() => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        const provId = deptId ? PROVINCES[deptId]?.find(p => p.name.toUpperCase() === (formData.province || '').toUpperCase())?.id : null;
                        return provId ? (DISTRICTS[provId]?.find(d => d.name.toUpperCase() === (formData.district || '').toUpperCase())?.id || '') : '';
                      })()}
                      onChange={e => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        const provId = deptId ? PROVINCES[deptId]?.find(p => p.name.toUpperCase() === (formData.province || '').toUpperCase())?.id : null;
                        const dist = provId ? DISTRICTS[provId]?.find(d => d.id === e.target.value) : null;
                        setFormData({...formData, district: dist?.name || ''});
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold outline-none uppercase transition-all focus:border-blue-400"
                      disabled={!formData.province}
                    >
                      <option value="">-- SELECCIONE --</option>
                      {(() => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        const provId = deptId ? PROVINCES[deptId]?.find(p => p.name.toUpperCase() === (formData.province || '').toUpperCase())?.id : null;
                        return provId ? DISTRICTS[provId]?.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>) : [];
                      })()}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-xs font-black text-slate-500 hover:text-red-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onSubmit}
                disabled={loading}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Procesando...' : (editingItem ? 'Actualizar Cliente' : 'Guardar Cliente')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
